package com.cipherquest.dto;

/**
 * Represents a single user's entry on the global leaderboard.
 */
public record GlobalLeaderboardEntry(
    int rank,
    String username,
    int points,
    int mastery,
    int streak,
    boolean isCurrentUser
) {}
