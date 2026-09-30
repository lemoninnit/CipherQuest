package com.cipherquest.service;

import com.cipherquest.dto.GlobalLeaderboardEntry;
import com.cipherquest.dto.GlobalLeaderboardResponse;
import com.cipherquest.model.User;
import com.cipherquest.repository.UserProgressRepository;
import com.cipherquest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for computing the global operative leaderboard.
 *
 * Mastery % derivation rule:
 * - Each cipher has 15 stages (3 tiers × 5 levels), totaling 45 stages across Caesar, Vigenère, and Playfair.
 * - Overall mastery = (completed stages ÷ 45) × 100%.
 * - Per-cipher mastery = (cipher completed stages ÷ 15) × 100%.
 * - Points correspond directly to the user's XP.
 *
 * Time metrics are scope-aware and recomputed on every request:
 * - bestTimeMs  = fastest single cleared stage within the requested scope.
 * - totalTimeMs = sum of the personal best times of every cleared stage in scope.
 * A cipher scope therefore reports only that cipher's times, while "overall"
 * aggregates all three.
 */
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;

    /** Fastest and accumulated stage time for one operative within a scope. */
    private record TimeStats(Long bestTimeMs, Long totalTimeMs) {}

    /**
     * Converts an aggregate row (userId, MIN(bestTimeMs), SUM(bestTimeMs)) into
     * TimeStats. MIN/SUM over an all-NULL group yields null, and the query
     * already filters out untimed rows — so a null here simply means the
     * operative has no timed completion in this scope and stays unranked for time.
     */
    private static TimeStats toTimeStats(Object best, Object total) {
        return new TimeStats(
                best == null ? null : ((Number) best).longValue(),
                total == null ? null : ((Number) total).longValue()
        );
    }

    @Transactional(readOnly = true)
    public GlobalLeaderboardResponse getLeaderboard(String scope, String currentUsername) {
        String normalizedScope = (scope == null || scope.isBlank()) ? "overall" : scope.trim().toLowerCase();

        List<User> allUsers = userRepository.findAll();

        // Derive completed stage counts per user ID from UserProgress
        Map<Long, Integer> stageCounts = new HashMap<>();
        // Time metrics are recomputed per scope so the same entry reflects the
        // requested filter (overall aggregates all ciphers, a cipher scope
        // aggregates only that cipher).
        Map<Long, TimeStats> timeStats = new HashMap<>();
        int maxStages;

        if ("overall".equals(normalizedScope)) {
            maxStages = 45;
            List<Object[]> rows = userProgressRepository.countTotalCompletedPerUser();
            for (Object[] row : rows) {
                Long userId = ((Number) row[0]).longValue();
                int count = ((Number) row[1]).intValue();
                stageCounts.put(userId, count);
            }
            for (Object[] row : userProgressRepository.bestAndTotalTimeOverallPerUser()) {
                timeStats.put(((Number) row[0]).longValue(), toTimeStats(row[1], row[2]));
            }
        } else {
            maxStages = 15;
            String cipherKey = normalizedScope.toUpperCase();
            List<Object[]> rows = userProgressRepository.countCompletedByCipherPerUser(cipherKey);
            for (Object[] row : rows) {
                Long userId = ((Number) row[0]).longValue();
                int count = ((Number) row[1]).intValue();
                stageCounts.put(userId, count);
            }
            for (Object[] row : userProgressRepository.bestAndTotalTimeByCipherPerUser(cipherKey)) {
                timeStats.put(((Number) row[0]).longValue(), toTimeStats(row[1], row[2]));
            }
        }

        // Comparator based on scope requirements:
        // - Overall scope: rank primarily by total XP descending, secondarily by completed stages, tertiarily by username.
        // - Per-cipher scope: rank primarily by that cipher's completed stages descending, secondarily by total XP, tertiarily by username.
        Comparator<User> comparator;
        if ("overall".equals(normalizedScope)) {
            comparator = Comparator
                .comparing(User::getXp, Comparator.reverseOrder())
                .thenComparing((User u) -> stageCounts.getOrDefault(u.getId(), 0), Comparator.reverseOrder())
                .thenComparing(User::getUsername, String.CASE_INSENSITIVE_ORDER);
        } else {
            comparator = Comparator
                .comparing((User u) -> stageCounts.getOrDefault(u.getId(), 0), Comparator.reverseOrder())
                .thenComparing(User::getXp, Comparator.reverseOrder())
                .thenComparing(User::getUsername, String.CASE_INSENSITIVE_ORDER);
        }

        List<User> sortedUsers = allUsers.stream()
            .sorted(comparator)
            .collect(Collectors.toList());

        List<GlobalLeaderboardEntry> topEntries = new ArrayList<>();
        GlobalLeaderboardEntry currentUserEntry = null;

        for (int i = 0; i < sortedUsers.size(); i++) {
            User u = sortedUsers.get(i);
            int rank = i + 1;
            boolean isCurrent = currentUsername != null && currentUsername.equalsIgnoreCase(u.getUsername());
            int completed = stageCounts.getOrDefault(u.getId(), 0);

            // Compute mastery percentage (integer 0-100)
            int mastery = Math.min(100, (int) Math.round((completed * 100.0) / maxStages));

            // Scope-specific time metrics (null when nothing timed in this scope)
            TimeStats times = timeStats.get(u.getId());

            GlobalLeaderboardEntry entry = new GlobalLeaderboardEntry(
                rank,
                u.getUsername(),
                u.getXp(),
                mastery,
                u.getStreak(),
                isCurrent,
                times == null ? null : times.bestTimeMs(),
                times == null ? null : times.totalTimeMs()
            );

            if (rank <= 10) {
                topEntries.add(entry);
            }
            if (isCurrent) {
                currentUserEntry = entry;
            }
        }

        return new GlobalLeaderboardResponse(topEntries, currentUserEntry);
    }
}
