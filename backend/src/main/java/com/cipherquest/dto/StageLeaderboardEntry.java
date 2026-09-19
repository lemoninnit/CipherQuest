package com.cipherquest.dto;

/**
 * A single row in a per-stage leaderboard.
 *
 * For the HIGHEST SCORE category: score is populated, timeMs is null.
 * For the FASTEST TIME category: timeMs is populated, score is the
 * best score of that player for the stage (informational).
 */
public record StageLeaderboardEntry(
    int rank,
    String username,
    int score,
    Long timeMs,
    boolean isCurrentUser
) {}