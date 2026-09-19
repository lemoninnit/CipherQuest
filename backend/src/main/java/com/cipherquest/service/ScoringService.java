package com.cipherquest.service;

import com.cipherquest.dto.CompleteStageResponse;
import com.cipherquest.dto.FailStageResponse;
import com.cipherquest.dto.StageLeaderboardEntry;
import com.cipherquest.dto.StageLeaderboardResponse;
import com.cipherquest.dto.StartStageRequest;
import com.cipherquest.dto.StartStageResponse;
import com.cipherquest.model.StageCompletion;
import com.cipherquest.model.StageSession;
import com.cipherquest.model.User;
import com.cipherquest.model.UserProgress;
import com.cipherquest.repository.StageCompletionRepository;
import com.cipherquest.repository.StageSessionRepository;
import com.cipherquest.repository.UserProgressRepository;
import com.cipherquest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

/**
 * SCORING SYSTEM (server-authoritative).
 *
 * Core formula : Final Stage Score = round(Base Score x Streak Multiplier)
 * Base scores  : EASY=100, MEDIUM=200, HARD=300 (configurable constants)
 * Streak       : +1 on every successful completion, 0 on failure. Global across
 *                all categories, difficulties, and mechanics.
 * Multiplier   : ALWAYS recalculated from the current streak — never stored as
 *                the primary state (see getStreakMultiplier).
 * Streak timing: the streak is incremented BEFORE the multiplier is calculated,
 *                so reaching a new tier benefits the stage that reached it.
 * Failure      : no score, streak reset to 0, total score untouched, no history
 *                record, no personal best updates.
 *
 * Anti-cheat:
 *  - Every attempt must start via POST /api/scoring/start which creates a
 *    server-side StageSession; the returned sessionId is required to complete.
 *  - Completion time is derived from server timestamps only.
 *  - A session can be completed exactly once (status guard).
 *  - The client never sends score, streak, multiplier, or time values.
 */
@Service
@RequiredArgsConstructor
public class ScoringService {

    // ── Configurable balancing values ────────────────────────────────

    /** Base score per difficulty. Change here to rebalance. */
    private static final Map<String, Integer> BASE_SCORES = Map.of(
            "EASY", 100,
            "MEDIUM", 200,
            "HARD", 300
    );

    /**
     * Streak multiplier tiers: [minStreakInclusive, maxStreakInclusive, multiplier].
     * Configurable balancing values; maxStreakInclusive = null means 20+.
     */
    private record MultiplierTier(int minStreakInclusive, Integer maxStreakInclusive, double multiplier) {}

    private static final List<MultiplierTier> MULTIPLIER_TIERS = List.of(
            new MultiplierTier(0, 2, 1.00),
            new MultiplierTier(3, 4, 1.10),
            new MultiplierTier(5, 5, 1.20),
            new MultiplierTier(6, 9, 1.25),
            new MultiplierTier(10, 14, 1.50),
            new MultiplierTier(15, 19, 1.75),
            new MultiplierTier(20, null, 2.00)
    );

    /** Sanity ceiling for a stage completion: 6 hours (anti-cheat "reasonable time"). */
    private static final long MAX_REASONABLE_COMPLETION_MS = 6L * 60L * 60L * 1000L;

    private static final List<String> CIPHERS      = List.of("CAESAR", "VIGENERE", "PLAYFAIR");
    private static final List<String> DIFFICULTIES = List.of("EASY", "MEDIUM", "HARD");
    private static final int    LEVELS_PER_TIER    = 5;

    private final UserRepository            userRepository;
    private final UserProgressRepository    progressRepository;
    private final StageSessionRepository    sessionRepository;
    private final StageCompletionRepository completionRepository;
    private final UserProgressService       userProgressService;

    // ── Core scoring functions (pure, reusable) ──────────────────────

    /** PHASE 1: base score by difficulty. */
    public int getBaseScore(String difficulty) {
        Integer base = BASE_SCORES.get(normalizeDifficulty(difficulty));
        if (base == null) {
            throw new IllegalArgumentException("Invalid difficulty: " + difficulty);
        }
        return base;
    }

    /** PHASE 5: streak multiplier tiers. Always derived from the streak. */
    public double getStreakMultiplier(int streak) {
        for (MultiplierTier tier : MULTIPLIER_TIERS) {
            if (streak >= tier.minStreakInclusive()
                    && (tier.maxStreakInclusive() == null || streak <= tier.maxStreakInclusive())) {
                return tier.multiplier();
            }
        }
        return 1.00;
    }

    /** PHASE 6: final stage score with one consistent rounding rule. */
    public int calculateStageScore(int baseScore, double multiplier) {
        return (int) Math.round(baseScore * multiplier);
    }

    // ── Stage lifecycle (anti-cheat session tracking) ────────────────

    /**
     * PHASE 7: startStageTimer — records a server-side start timestamp.
     * Any previous ACTIVE session for the same stage is marked EXPIRED.
     */
    @Transactional
    public StartStageResponse startStage(Long userId, StartStageRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String cipher     = req.cipherType().toUpperCase();
        String difficulty = req.difficultyTier().toUpperCase();
        validateStage(cipher, difficulty, req.levelIndex());

        // Expire abandoned attempts so a stage cannot have two live sessions.
        sessionRepository.expireActiveSessions(userId, cipher, difficulty, req.levelIndex());

        StageSession session = StageSession.builder()
                .user(user)
                .cipherType(cipher)
                .difficultyTier(difficulty)
                .levelIndex(req.levelIndex())
                .status("ACTIVE")
                .build();
        sessionRepository.save(session);

        return new StartStageResponse(
                session.getId(),
                cipher,
                difficulty,
                req.levelIndex(),
                session.getStartedAt()
        );
    }

    /**
     * PHASES 2-11: complete a stage successfully.
     *
     * Success flow: validate session -> completion time (server timestamps)
     * -> streak +1 -> multiplier from NEW streak -> final score -> total score
     * -> save completion history -> update personal bests.
     */
    @Transactional
    public CompleteStageResponse completeStage(Long userId, Long sessionId) {
        StageSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Stage session not found: " + sessionId));

        // ── Anti-cheat validation ────────────────────────────────────
        if (!session.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Stage session does not belong to the current player.");
        }
        if (!"ACTIVE".equals(session.getStatus())) {
            throw new IllegalStateException("This stage attempt is no longer active. Start the stage again.");
        }

        LocalDateTime now = LocalDateTime.now();
        long completionTimeMs = Duration.between(session.getStartedAt(), now).toMillis();
        if (completionTimeMs < 0 || completionTimeMs > MAX_REASONABLE_COMPLETION_MS) {
            // Implausible time (clock manipulation or abandoned session): expire, no score.
            session.setStatus("EXPIRED");
            session.setEndedAt(now);
            sessionRepository.save(session);
            throw new IllegalStateException("Completion time is not plausible for this attempt.");
        }

        // ── Success flow ─────────────────────────────────────────────
        User user = session.getUser();

        // 1. Increase the global streak BEFORE calculating the score.
        int newStreak = user.getGameStreak() + 1;
        user.setGameStreak(newStreak);

        // 2. Multiplier is recalculated from the NEW streak.
        double multiplier = getStreakMultiplier(newStreak);

        // 3. Final score = base x multiplier, rounded once.
        int baseScore = getBaseScore(session.getDifficultyTier());
        int score     = calculateStageScore(baseScore, multiplier);

        // 4. Add to total score (failures never subtract from this).
        user.setTotalScore(user.getTotalScore() + score);
        userRepository.save(user);

        // 5. Save the immutable completion history record.
        StageCompletion completion = StageCompletion.builder()
                .user(user)
                .cipherType(session.getCipherType())
                .difficultyTier(session.getDifficultyTier())
                .levelIndex(session.getLevelIndex())
                .score(score)
                .streak(newStreak)
                .multiplier(multiplier)
                .completionTimeMs(completionTimeMs)
                .completedAt(now)
                .build();
        completionRepository.save(completion);

        // 6. Mark the session completed (a session can only be completed once).
        session.setStatus("COMPLETED");
        session.setEndedAt(now);
        sessionRepository.save(session);

        // 7. Update personal bests on the progress record.
        UserProgress progress = progressRepository
                .findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
                        userId, session.getCipherType(), session.getDifficultyTier(), session.getLevelIndex())
                .orElseGet(() -> UserProgress.builder()
                        .user(user)
                        .cipherType(session.getCipherType())
                        .difficultyTier(session.getDifficultyTier())
                        .levelIndex(session.getLevelIndex())
                        .build());

        boolean newBestScore = score > progress.getBestScore();
        if (newBestScore) {
            progress.setBestScore(score);
        }
        boolean newBestTime = progress.getBestTimeMs() == null
                || completionTimeMs < progress.getBestTimeMs();
        if (newBestTime) {
            progress.setBestTimeMs(completionTimeMs);
        }
        progress.setCompletedAt(now);
        progressRepository.save(progress);

        // 8. Award XP / badges via the existing progress pipeline.
        userProgressService.awardForCompletion(
                userId, session.getCipherType(), session.getDifficultyTier(), session.getLevelIndex());
        List<String> newBadges = userProgressService.awardBadgesForUser(userId, user);

        return new CompleteStageResponse(
                score,
                baseScore,
                newStreak,
                multiplier,
                completionTimeMs,
                user.getTotalScore(),
                progress.getBestScore(),
                progress.getBestTimeMs(),
                newBestScore,
                newBestTime,
                newBadges,
                userProgressService.getProgressMap(userId)
        );
    }

    /**
     * PHASE 4: failure flow.
     * 0 points, streak -> 0, multiplier -> 1.00, total score untouched,
     * no completion record, no personal-best updates.
     */
    @Transactional
    public FailStageResponse failStage(Long userId, Long sessionId) {
        StageSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Stage session not found: " + sessionId));

        if (!session.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Stage session does not belong to the current player.");
        }
        if ("ACTIVE".equals(session.getStatus())) {
            session.setStatus("FAILED");
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setGameStreak(0); // failure resets the streak; totalScore is preserved
        userRepository.save(user);

        return new FailStageResponse(user.getGameStreak(), getStreakMultiplier(user.getGameStreak()), user.getTotalScore());
    }

    // ── Personal bests ───────────────────────────────────────────────

    public int getBestScore(Long userId, String cipher, String difficulty, int levelIndex) {
        return progressRepository
                .findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(userId, cipher, difficulty, levelIndex)
                .map(UserProgress::getBestScore)
                .orElse(0);
    }

    public Long getBestTimeMs(Long userId, String cipher, String difficulty, int levelIndex) {
        return progressRepository
                .findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(userId, cipher, difficulty, levelIndex)
                .map(UserProgress::getBestTimeMs)
                .orElse(null);
    }

    // ── Per-stage leaderboards ───────────────────────────────────────

    /**
     * PHASE 12/13: HIGHEST SCORE (score DESC) and FASTEST TIME (time ASC) rankings
     * for a single stage. Score and time are never combined.
     */
    @Transactional(readOnly = true)
    public StageLeaderboardResponse getStageLeaderboard(
            String cipher, String difficulty, int levelIndex, String category, Long currentUserId) {

        String cipherU     = cipher.toUpperCase();
        String difficultyU = difficulty.toUpperCase();
        String cat         = (category == null || category.isBlank()) ? "score" : category.trim().toLowerCase();
        if (!"score".equals(cat) && !"time".equals(cat)) {
            throw new IllegalArgumentException("Invalid leaderboard category: " + category);
        }
        validateStage(cipherU, difficultyU, levelIndex);

        List<UserProgress> rows =
                progressRepository.findByCipherTypeAndDifficultyTierAndLevelIndex(cipherU, difficultyU, levelIndex);

        List<StageLeaderboardEntry> entries = new ArrayList<>();
        if ("score".equals(cat)) {
            // HIGHEST SCORE: rank by best_score DESC
            rows.stream()
                    .sorted(Comparator.comparingInt(UserProgress::getBestScore).reversed()
                            .thenComparing(p -> p.getUser().getUsername(), String.CASE_INSENSITIVE_ORDER))
                    .limit(50)
                    .forEach(p -> entries.add(new StageLeaderboardEntry(
                            0, p.getUser().getUsername(), p.getBestScore(), null, false)));
        } else {
            // FASTEST TIME: rank by best_time_ms ASC among players with a valid time.
            rows.stream()
                    .filter(p -> p.getBestTimeMs() != null)
                    .sorted(Comparator.comparingLong(UserProgress::getBestTimeMs)
                            .thenComparing(p -> p.getUser().getUsername(), String.CASE_INSENSITIVE_ORDER))
                    .limit(50)
                    .forEach(p -> entries.add(new StageLeaderboardEntry(
                            0, p.getUser().getUsername(), p.getBestScore(), p.getBestTimeMs(), false)));
        }

        // Assign ranks and flag the current user.
        String currentUsername = userRepository.findById(currentUserId)
                .map(User::getUsername).orElse(null);
        List<StageLeaderboardEntry> ranked = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            StageLeaderboardEntry e = entries.get(i);
            ranked.add(new StageLeaderboardEntry(
                    i + 1,
                    e.username(),
                    e.score(),
                    e.timeMs(),
                    currentUsername != null && currentUsername.equalsIgnoreCase(e.username())
            ));
        }

        return new StageLeaderboardResponse(cat, cipherU, difficultyU, levelIndex, ranked);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private String normalizeDifficulty(String difficulty) {
        return difficulty == null ? "" : difficulty.trim().toUpperCase();
    }

    private void validateStage(String cipher, String difficulty, int levelIndex) {
        if (!CIPHERS.contains(cipher)) {
            throw new IllegalArgumentException("Invalid cipher: " + cipher);
        }
        if (!DIFFICULTIES.contains(difficulty)) {
            throw new IllegalArgumentException("Invalid difficulty: " + difficulty);
        }
        if (levelIndex < 0 || levelIndex >= LEVELS_PER_TIER) {
            throw new IllegalArgumentException("Invalid level index: " + levelIndex);
        }
    }
}