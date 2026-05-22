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
    private static final int COOLDOWN_HOURS  = 4;

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
        userRepository.save(user);
        return buildProfileDto(user);
    }

    // ── Attempt system ────────────────────────────────────────────────

    /**
     * Deduct one site-wide attempt.
     * Called ONLY when a player submits a WRONG final answer on a level.
     * NOT called for in-game Pac-Man lives or Sprint shoe tokens.
     *
     * Returns updated profile so the frontend can refresh state.
     */
    @Transactional
    public UserProfileDto deductAttempt(Long userId) {
        User user = findUser(userId);
        autoRefillIfExpired(user);

        if (user.getAttempts() > 0) {
            user.setAttempts(user.getAttempts() - 1);
            if (user.getAttempts() == 0) {
                user.setCooldownEndTime(LocalDateTime.now().plusHours(COOLDOWN_HOURS));
            }
        }
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

        boolean alreadyDone = progressRepository
                .existsByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
                        userId, cipher, difficulty, req.levelIndex());

        if (!alreadyDone) {
            UserProgress p = UserProgress.builder()
                    .user(user)
                    .cipherType(cipher)
                    .difficultyTier(difficulty)
                    .levelIndex(req.levelIndex())
                    .build();
            progressRepository.save(p);

            // Award XP for completing a level
            user.addXp(50);
            user.setTotalCiphersSolved(user.getTotalCiphersSolved() + 1);
            userRepository.save(user);
        }

        List<String> newBadges = checkAndAwardBadges(userId, user);
        Map<String, Map<String, List<Integer>>> progressMap = buildProgressMap(userId);
        return new ProgressResponse(progressMap, newBadges);
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
        if ("EASY".equals(difficulty)) return;
        String prereq = "MEDIUM".equals(difficulty) ? "EASY" : "MEDIUM";
        long done = progressRepository.countCompleted(userId, cipher, prereq);
        if (done < LEVELS_PER_TIER) {
            throw new IllegalStateException(String.format(
                "Complete all %d %s %s levels first.", LEVELS_PER_TIER, cipher, prereq));
        }
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

        if (total == 1) awardIfNew(userId, user, "FIRST_CRACK", awarded);

        for (String cipher : CIPHERS) {
            long cipherTotal = DIFFICULTIES.stream()
                .mapToLong(d -> progressRepository.countCompleted(userId, cipher, d))
                .sum();
            if (cipherTotal >= 15) {
                String badge = switch (cipher) {
                    case "CAESAR"   -> "CAESAR_MASTER";
                    case "VIGENERE" -> "VIGENERE_MASTER";
                    case "PLAYFAIR" -> "PLAYFAIR_MASTER";
                    default         -> null;
                };
                if (badge != null) awardIfNew(userId, user, badge, awarded);
            }
        }

        if (total >= 45) awardIfNew(userId, user, "CIPHER_LEGEND", awarded);
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

    private UserProfileDto buildProfileDto(User user) {
        Long userId = user.getId();
        List<String> badges = badgeRepository.findByUserId(userId)
                .stream().map(UserBadge::getBadgeType).collect(Collectors.toList());
        Map<String, Map<String, List<Integer>>> progressMap = buildProgressMap(userId);
        boolean onCooldown = user.getCooldownEndTime() != null
                && LocalDateTime.now().isBefore(user.getCooldownEndTime());

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
            progressMap
        );
    }
}