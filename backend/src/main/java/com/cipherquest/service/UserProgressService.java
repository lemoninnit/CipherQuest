package com.cipherquest.service;

import com.cipherquest.dto.ProgressResponse;
import com.cipherquest.dto.SaveProgressRequest;
import com.cipherquest.dto.UserProfileDto;
import com.cipherquest.model.User;
import com.cipherquest.model.UserBadge;
import com.cipherquest.model.UserProgress;
import com.cipherquest.repository.UserBadgeRepository;
import com.cipherquest.repository.UserProgressRepository;
import com.cipherquest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DAY 1 & 2:
 * Handles attempt deduction, cooldown management, streak updates,
 * progress persistence, badge awards, and profile construction.
 *
 * Cipher/difficulty values match the frontend localStorage schema:
 *   cipherType    → "CAESAR" | "VIGENERE" | "PLAYFAIR"
 *   difficultyTier → "EASY"  | "MEDIUM"   | "HARD"
 */
@Service
@RequiredArgsConstructor
public class UserProgressService {

    private static final int LEVELS_PER_TIER = 5;
    private static final int MAX_ATTEMPTS    = 3;

    /**
     * How long a depleted operative waits before their hearts come back.
     *
     * Kept short on purpose: the cooldown exists to stop a losing streak from
     * being farmed, not to punish the player. Three minutes is long enough to
     * step away and change tactics, short enough that "locked out" never reads
     * as a dead end. Exposed as a constant (rather than inlined) so the message
     * shown to a locked-out player and the clock actually enforcing it can
     * never drift apart.
     */
    private static final int COOLDOWN_MINUTES = 3;

    private static final List<String> CIPHERS      = List.of("CAESAR", "VIGENERE", "PLAYFAIR");
    private static final List<String> DIFFICULTIES = List.of("EASY", "MEDIUM", "HARD");

    private final UserRepository         userRepository;
    private final UserProgressRepository progressRepository;
    private final UserBadgeRepository    badgeRepository;

    // ── Profile ──────────────────────────────────────────────────────

    /**
     * Returns full profile including attempts, cooldown status, badges, and progress.
     * Auto-refills attempts if cooldown has expired.
     */
    @Transactional
    public UserProfileDto getFullProfile(Long userId) {
        User user = findUser(userId);
        autoRefillIfExpired(user);
        checkAndAwardBadges(userId, user);
        userRepository.save(user);
        return buildProfileDto(user);
    }

    // ── Attempt system ────────────────────────────────────────────────

    /**
     * A player is on cooldown while the stored cooldown end time is still in
     * the future. Shared by the profile DTO and the stage-start gate so the
     * value rendered in the HUD and the value the server enforces can never
     * disagree.
     */
    public static boolean isOnCooldown(User user) {
        return user.getCooldownEndTime() != null
                && LocalDateTime.now().isBefore(user.getCooldownEndTime());
    }

    /**
     * The single source of truth for "may this operative start a stage right
     * now?".
     *
     * Zero hearts always locks play, even if the cooldown clock is somehow
     * missing or already elapsed: the rule is "no heart, no stage from ANY
     * cipher", so the heart count is checked as well as the timer. A positive
     * count with no running cooldown is always playable.
     */
    public static boolean isLockedOut(User user) {
        return user.getAttempts() <= 0 || isOnCooldown(user);
    }

    /** Max hearts a player can hold — the denominator of the HUD "x / 3". */
    public static int maxHearts() {
        return MAX_ATTEMPTS;
    }

    /**
     * Consumes one session heart and starts the cooldown once the last heart is
     * spent. Returns true when a heart was actually consumed.
     */
    private boolean consumeHeart(User user) {
        if (user.getAttempts() <= 0) return false;
        user.setAttempts(user.getAttempts() - 1);
        if (user.getAttempts() == 0) {
            user.setCooldownEndTime(LocalDateTime.now().plusMinutes(COOLDOWN_MINUTES));
        }
        return true;
    }

    /**
     * SESSION HEART GATE — the server is the authority on whether an operative
     * may make progress on a stage.
     *
     * Auto-refills first, so an elapsed cooldown never keeps blocking play. The
     * refill is persisted before the check, otherwise a player who waited out
     * the cooldown would stay locked until some unrelated request saved them.
     */
    @Transactional
    public void assertNotOnCooldown(Long userId) {
        User user = findUser(userId);
        autoRefillIfExpired(user);
        userRepository.save(user);
        checkNotLockedOut(user);
    }

    /**
     * Throws when the operative has no session heart left. Shared by the
     * stage-start gate and the progress endpoint so a client cannot claim a
     * stage completion simply by skipping the scoring session.
     */
    private void checkNotLockedOut(User user) {
        if (isLockedOut(user)) {
            throw new IllegalStateException(
                    "All session hearts are spent. Missions resume in " + formatRemainingCooldown(user) + ".");
        }
    }

    /**
     * Human-readable time until missions resume, e.g. "2m 41s".
     *
     * Falls back to the full window when the clock is missing but the hearts
     * are still zero, so the message never reads as "under a minute" for a
     * player who is actually locked out. Renders hours only when the window is
     * genuinely longer than an hour, so the normal 3-minute cooldown stays
     * short and readable instead of being padded into "0h 3m".
     */
    private static String formatRemainingCooldown(User user) {
        if (user.getCooldownEndTime() == null) return COOLDOWN_MINUTES + "m";
        long seconds = java.time.Duration.between(LocalDateTime.now(), user.getCooldownEndTime()).getSeconds();
        if (seconds <= 0) return "under a minute";

        long minutes = seconds / 60;
        long remainder = seconds % 60;
        if (minutes < 60) {
            return remainder == 0 ? minutes + "m" : minutes + "m " + remainder + "s";
        }
        long hours = minutes / 60;
        minutes = minutes % 60;
        return minutes == 0 ? hours + "h" : hours + "h " + minutes + "m";
    }

    /**
     * SESSION HEART SPENDING — called by the scoring system when a stage is
     * lost, so losing a stage always costs exactly one server heart no matter
     * which cipher or mini-game produced the loss.
     *
     * This is deliberately the ONLY way a stage loss spends a heart. The
     * client used to call POST /users/attempts/deduct itself, which let an
     * in-game attempt counter and the server heart counter drift apart (and let
     * a modified client skip the cost entirely). Server-side session hearts and
     * in-game attempts are now separate concerns: in-game lives/tokens/casts
     * never touch this counter, only a finished stage attempt does.
     *
     * Auto-refills an expired cooldown first so a stale zero never keeps an
     * operative locked, and clamps at zero so a repeated report can never make
     * the counter negative.
     *
     * @return the heart state AFTER the deduction
     */
    @Transactional
    public HeartState consumeHeartForStageLoss(Long userId) {
        User user = findUser(userId);
        autoRefillIfExpired(user);
        consumeHeart(user);
        userRepository.save(user);
        return heartState(user);
    }

    /** Current heart state, for responses that need to report it to a client. */
    public HeartState heartState(Long userId) {
        return heartState(findUser(userId));
    }

    private static HeartState heartState(User user) {
        return new HeartState(
                user.getAttempts(),
                MAX_ATTEMPTS,
                isLockedOut(user),
                user.getCooldownEndTime()
        );
    }

    /**
     * Snapshot of the server-side session-heart counter.
     *
     * attempts       – hearts remaining
     * maxAttempts    – hearts a full player holds (3)
     * lockedOut      – true when no stage may be started at all
     * cooldownEndTime – when the hearts refill, or null if not on cooldown
     */
    public record HeartState(int attempts, int maxAttempts, boolean lockedOut, LocalDateTime cooldownEndTime) {}

    /**
     * Manually spend one session heart.
     *
     * NOT the stage-loss path any more — a lost stage spends its heart through
     * consumeHeartForStageLoss, driven by the scoring system. This endpoint
     * remains for explicitly manual spends and is kept idempotent-safe (it
     * clamps at zero and never restarts a running cooldown).
     *
     * In-game attempts (Pac-Man lives, Sprint tokens, fishing casts) must never
     * call this: they are a separate, client-side economy.
     *
     * Returns updated profile so the frontend can refresh state.
     */
    @Transactional
    public UserProfileDto deductAttempt(Long userId) {
        User user = findUser(userId);
        autoRefillIfExpired(user);
        consumeHeart(user);
        userRepository.save(user);
        return buildProfileDto(user);
    }

    private void autoRefillIfExpired(User user) {
        if (user.getCooldownEndTime() != null
                && LocalDateTime.now().isAfter(user.getCooldownEndTime())) {
            user.setAttempts(MAX_ATTEMPTS);
            user.setCooldownEndTime(null);
        }
    }

    // ── Streak ────────────────────────────────────────────────────────

    /**
     * Called from UserService on every successful login.
     * Increments streak if consecutive daily login; resets if >36h gap.
     */
    @Transactional
    public void updateStreak(User user) {
        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime last = user.getLastLoginAt();

        if (last == null) {
            user.setStreak(1);
        } else {
            long hours = java.time.Duration.between(last, now).toHours();
            if (hours < 36) {
                boolean sameDay = last.toLocalDate().equals(now.toLocalDate());
                if (!sameDay) {
                    user.setStreak(user.getStreak() + 1);
                }
                // same-day login: streak unchanged
            } else {
                user.setStreak(1);
            }
        }
        user.setLastLoginAt(now);
        userRepository.save(user);
    }

    // ── Progress persistence ──────────────────────────────────────────

    /**
     * Mark a level complete, enforce tier-unlock gate, award badges.
     * Idempotent: re-completing an already-completed level is a no-op.
     */
    @Transactional
    public ProgressResponse saveProgress(Long userId, SaveProgressRequest req) {
        User user = findUser(userId);
        String cipher     = req.cipherType().toUpperCase();
        String difficulty = req.difficultyTier().toUpperCase();

        validateCipherAndDifficulty(cipher, difficulty);
        assertTierUnlocked(userId, cipher, difficulty);

        // Session-heart gate: claiming a stage completion is the other way to
        // bank progress, so it must respect the cooldown too. The scoring path
        // bypasses this method (it calls awardForCompletion directly), so an
        // already-scored completion is never blocked by a later refill check.
        autoRefillIfExpired(user);
        userRepository.save(user);
        checkNotLockedOut(user);

        awardForCompletion(userId, cipher, difficulty, req.levelIndex());

        List<String> newBadges = checkAndAwardBadges(userId, user);
        Map<String, Map<String, List<Integer>>> progressMap = buildProgressMap(userId);
        return new ProgressResponse(progressMap, newBadges);
    }

    /**
     * Marks a level complete and awards XP (idempotent).
     * Shared by the legacy progress endpoint and the scoring system.
     */
    @Transactional
    public void awardForCompletion(Long userId, String cipherType, String difficultyTier, int levelIndex) {
        User user = findUser(userId);
        String cipher     = cipherType.toUpperCase();
        String difficulty = difficultyTier.toUpperCase();

        validateCipherAndDifficulty(cipher, difficulty);

        boolean alreadyDone = progressRepository
                .findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
                        userId, cipher, difficulty, levelIndex)
                .isPresent();

        if (!alreadyDone) {
            UserProgress p = UserProgress.builder()
                    .user(user)
                    .cipherType(cipher)
                    .difficultyTier(difficulty)
                    .levelIndex(levelIndex)
                    .build();
            progressRepository.save(p);

            // Award XP for completing a level
            user.addXp(50);
            user.setTotalCiphersSolved(user.getTotalCiphersSolved() + 1);
            userRepository.save(user);
        }
    }

    /**
     * Runs the badge checks for a user and returns newly awarded badge types.
     * Shared by the legacy progress endpoint and the scoring system.
     */
    @Transactional
    public List<String> awardBadgesForUser(Long userId, User user) {
        return checkAndAwardBadges(userId, user);
    }

    /**
     * Returns full structured progress map for frontend localStorage sync.
     */
    @Transactional(readOnly = true)
    public Map<String, Map<String, List<Integer>>> getProgressMap(Long userId) {
        return buildProgressMap(userId);
    }

    // ── Internal helpers ──────────────────────────────────────────────

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }

    private void validateCipherAndDifficulty(String cipher, String difficulty) {
        if (!CIPHERS.contains(cipher)) {
            throw new IllegalArgumentException("Invalid cipher: " + cipher);
        }
        if (!DIFFICULTIES.contains(difficulty)) {
            throw new IllegalArgumentException("Invalid difficulty: " + difficulty);
        }
    }

    /**
     * Easy is always unlocked.
     * Medium requires all 5 Easy levels complete.
     * Hard  requires all 5 Medium levels complete.
     */
    private void assertTierUnlocked(Long userId, String cipher, String difficulty) {
        // No-op to support unlocked category research progress saving
    }

    private Map<String, Map<String, List<Integer>>> buildProgressMap(Long userId) {
        List<UserProgress> all = progressRepository.findByUserId(userId);
        Map<String, Map<String, List<Integer>>> result = new LinkedHashMap<>();
        for (String c : CIPHERS) {
            Map<String, List<Integer>> byDiff = new LinkedHashMap<>();
            for (String d : DIFFICULTIES) byDiff.put(d, new ArrayList<>());
            result.put(c, byDiff);
        }
        for (UserProgress p : all) {
            String c = p.getCipherType().toUpperCase();
            String d = p.getDifficultyTier().toUpperCase();
            if (result.containsKey(c) && result.get(c).containsKey(d)) {
                result.get(c).get(d).add(p.getLevelIndex());
            }
        }
        return result;
    }

    private List<String> checkAndAwardBadges(Long userId, User user) {
        List<String> awarded = new ArrayList<>();
        long total = progressRepository.findByUserId(userId).size();

        if (total >= 1) awardIfNew(userId, user, "first_crack", awarded);

        for (String cipher : CIPHERS) {
            String cLower = cipher.toLowerCase();
            long easyCount = progressRepository.countCompleted(userId, cipher, "EASY");
            long mediumCount = progressRepository.countCompleted(userId, cipher, "MEDIUM");
            long hardCount = progressRepository.countCompleted(userId, cipher, "HARD");
            long cipherTotal = easyCount + mediumCount + hardCount;

            if (easyCount >= 5) {
                awardIfNew(userId, user, cLower + "_initiate", awarded);
            }
            if (mediumCount >= 5) {
                awardIfNew(userId, user, cLower + "_expert", awarded);
            }
            if (cipherTotal >= 15 || (easyCount >= 5 && mediumCount >= 5 && hardCount >= 5)) {
                awardIfNew(userId, user, cLower + "_grandmaster", awarded);
            }
        }

        if (user.getStreak() >= 7) {
            awardIfNew(userId, user, "streak_7_days", awarded);
        }
        if (user.getStreak() >= 30) {
            awardIfNew(userId, user, "streak_30_days", awarded);
        }

        if (total >= 45) awardIfNew(userId, user, "cipher_legend", awarded);
        return awarded;
    }

    private void awardIfNew(Long userId, User user, String badgeType, List<String> collected) {
        if (!badgeRepository.existsByUserIdAndBadgeType(userId, badgeType)) {
            UserBadge badge = UserBadge.builder()
                    .user(user)
                    .badgeType(badgeType)
                    .build();
            badgeRepository.save(badge);
            collected.add(badgeType);
        }
    }

    @Transactional
    public Map<String, Boolean> getTutorialPreferences(Long userId) {
        User user = findUser(userId);
        return Map.of(
            "caesar", user.isTutorialDismissedCaesar(),
            "vigenere", user.isTutorialDismissedVigenere(),
            "playfair", user.isTutorialDismissedPlayfair()
        );
    }

    @Transactional
    public Map<String, Boolean> saveTutorialPreference(Long userId, String cipherType, boolean dismissed) {
        User user = findUser(userId);
        if (cipherType != null) {
            switch (cipherType.toLowerCase()) {
                case "caesar" -> user.setTutorialDismissedCaesar(dismissed);
                case "vigenere" -> user.setTutorialDismissedVigenere(dismissed);
                case "playfair" -> user.setTutorialDismissedPlayfair(dismissed);
            }
            userRepository.save(user);
        }
        return Map.of(
            "caesar", user.isTutorialDismissedCaesar(),
            "vigenere", user.isTutorialDismissedVigenere(),
            "playfair", user.isTutorialDismissedPlayfair()
        );
    }

    private UserProfileDto buildProfileDto(User user) {
        Long userId = user.getId();
        List<String> badges = badgeRepository.findByUserId(userId)
                .stream().map(UserBadge::getBadgeType).collect(Collectors.toList());
        Map<String, Map<String, List<Integer>>> progressMap = buildProgressMap(userId);
        boolean onCooldown = isOnCooldown(user);
        Map<String, Boolean> tutorialDismissed = Map.of(
            "caesar", user.isTutorialDismissedCaesar(),
            "vigenere", user.isTutorialDismissedVigenere(),
            "playfair", user.isTutorialDismissedPlayfair()
        );

        return new UserProfileDto(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getXp(),
            user.getLevel(),
            user.getStreak(),
            user.getTotalCiphersSolved(),
            user.getFishingGamesPlayed(),
            user.getFishingBestScore(),
            user.getCreatedAt(),
            user.getLastLoginAt(),
            user.getAttempts(),
            onCooldown,
            user.getCooldownEndTime(),
            badges,
            progressMap,
            user.getTotalScore(),
            user.getGameStreak(),
            tutorialDismissed
        );
    }
}
