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
 */
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;

    @Transactional(readOnly = true)
    public GlobalLeaderboardResponse getLeaderboard(String scope, String currentUsername) {
        String normalizedScope = (scope == null || scope.isBlank()) ? "overall" : scope.trim().toLowerCase();

        List<User> allUsers = userRepository.findAll();

        // Derive completed stage counts per user ID from UserProgress
        Map<Long, Integer> stageCounts = new HashMap<>();
        int maxStages;

        if ("overall".equals(normalizedScope)) {
            maxStages = 45;
            List<Object[]> rows = userProgressRepository.countTotalCompletedPerUser();
            for (Object[] row : rows) {
                Long userId = ((Number) row[0]).longValue();
                int count = ((Number) row[1]).intValue();
                stageCounts.put(userId, count);
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

            GlobalLeaderboardEntry entry = new GlobalLeaderboardEntry(
                rank,
                u.getUsername(),
                u.getXp(),
                mastery,
                u.getStreak(),
                isCurrent
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
