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
}