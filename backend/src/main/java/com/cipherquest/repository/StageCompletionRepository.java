package com.cipherquest.repository;

import com.cipherquest.model.StageCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for the immutable stage completion history.
 */
@Repository
public interface StageCompletionRepository extends JpaRepository<StageCompletion, Long> {

    List<StageCompletion> findByUserIdOrderByCompletedAtDesc(Long userId);

    List<StageCompletion> findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndexOrderByCompletedAtDesc(
            Long userId, String cipherType, String difficultyTier, int levelIndex);
}