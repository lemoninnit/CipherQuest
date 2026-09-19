package com.cipherquest.repository;

import com.cipherquest.model.StageSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for server-authoritative stage attempt sessions (anti-cheat).
 */
@Repository
public interface StageSessionRepository extends JpaRepository<StageSession, Long> {

    List<StageSession> findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndexAndStatus(
            Long userId, String cipherType, String difficultyTier, int levelIndex, String status);

    /**
     * Invalidate any stale ACTIVE sessions for a user + stage
     * (e.g. the player abandoned a previous attempt).
     */
    @Query("UPDATE StageSession s SET s.status = 'EXPIRED', s.endedAt = CURRENT_TIMESTAMP " +
           "WHERE s.user.id = :userId AND s.cipherType = :cipherType " +
           "AND s.difficultyTier = :difficultyTier AND s.levelIndex = :levelIndex " +
           "AND s.status = 'ACTIVE'")
    void expireActiveSessions(@Param("userId") Long userId,
                              @Param("cipherType") String cipherType,
                              @Param("difficultyTier") String difficultyTier,
                              @Param("levelIndex") int levelIndex);
}