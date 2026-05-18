package com.cipherquest.repository;

import com.cipherquest.model.FishingSession;
import com.cipherquest.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FishingSessionRepository extends JpaRepository<FishingSession, Long> {

    // Find the active session for a user (at most one at a time)
    Optional<FishingSession> findByUserAndActiveTrue(User user);

    // All completed sessions for a user, most recent first
    List<FishingSession> findByUserAndActiveFalseOrderByStartedAtDesc(User user);

    // Leaderboard: top 10 sessions by score
    @Query("SELECT fs FROM FishingSession fs WHERE fs.active = false ORDER BY fs.score DESC")
    List<FishingSession> findTop10ByOrderByScoreDesc();
}
