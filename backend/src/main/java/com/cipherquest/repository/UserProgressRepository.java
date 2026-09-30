package com.cipherquest.repository;

import com.cipherquest.model.User;
import com.cipherquest.model.UserProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * DAY 1: Extended with queries needed by UserProgressService.
 */
@Repository
public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {

    List<UserProgress> findByUser(User user);

    List<UserProgress> findByUserId(Long userId);

    List<UserProgress> findByUserIdAndCipherType(Long userId, String cipherType);

    List<UserProgress> findByUserIdAndCipherTypeAndDifficultyTier(
            Long userId, String cipherType, String difficultyTier);

    Optional<UserProgress> findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
            Long userId, String cipherType, String difficultyTier, int levelIndex);

    // Kept for backward compatibility (used by FishingGameService)
    boolean existsByUserAndCipherTypeAndDifficultyTierAndLevelIndex(
        User user, String cipherType, String difficultyTier, int levelIndex);

    boolean existsByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
            Long userId, String cipherType, String difficultyTier, int levelIndex);

    @Query("SELECT COUNT(p) FROM UserProgress p " +
           "WHERE p.user.id = :userId AND p.cipherType = :cipherType AND p.difficultyTier = :difficultyTier")
    long countCompleted(
            @Param("userId") Long userId,
            @Param("cipherType") String cipherType,
            @Param("difficultyTier") String difficultyTier);

    @Query("SELECT p.user.id, COUNT(p) FROM UserProgress p GROUP BY p.user.id")
    List<Object[]> countTotalCompletedPerUser();

    @Query("SELECT p.user.id, COUNT(p) FROM UserProgress p WHERE UPPER(p.cipherType) = UPPER(:cipherType) GROUP BY p.user.id")
    List<Object[]> countCompletedByCipherPerUser(@Param("cipherType") String cipherType);

    // ── Leaderboard time metrics ──────────────────────────────────────
    // Derived from UserProgress.bestTimeMs — the operative's fastest time on
    // each CLEARED stage. Summing personal bests (rather than every attempt)
    // keeps replays from inflating a total, and keeps the time metric on the
    // same completion source as the mastery/stage-count figures.
    // Rows with no recorded time yet are excluded, so operators without a
    // timed completion are simply absent rather than reported as 0.

    /** best (fastest) and total time per user across ALL ciphers. */
    @Query("SELECT p.user.id, MIN(p.bestTimeMs), SUM(p.bestTimeMs) " +
           "FROM UserProgress p WHERE p.bestTimeMs IS NOT NULL GROUP BY p.user.id")
    List<Object[]> bestAndTotalTimeOverallPerUser();

    /** best (fastest) and total time per user for a single cipher. */
    @Query("SELECT p.user.id, MIN(p.bestTimeMs), SUM(p.bestTimeMs) " +
           "FROM UserProgress p " +
           "WHERE p.bestTimeMs IS NOT NULL AND UPPER(p.cipherType) = UPPER(:cipherType) " +
           "GROUP BY p.user.id")
    List<Object[]> bestAndTotalTimeByCipherPerUser(@Param("cipherType") String cipherType);

    // ── Scoring System: per-stage leaderboard lookups ─────────────────

    /** All progress rows for one stage (used by per-stage leaderboards). */
    List<UserProgress> findByCipherTypeAndDifficultyTierAndLevelIndex(
            String cipherType, String difficultyTier, int levelIndex);
}
