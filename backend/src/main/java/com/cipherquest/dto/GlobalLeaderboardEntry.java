package com.cipherquest.dto;

/**
 * Represents a single user's entry on the global leaderboard.
 *
 * Time metrics are scope-aware: the backend recomputes them for whichever
 * scope is requested (overall = all ciphers, per-cipher = that cipher only).
 *   bestTimeMs  – fastest single cleared stage in the scope.
 *   totalTimeMs – sum of the personal bests of every cleared stage in scope.
 * Both are null when the operative has no timed completion in that scope.
 */
public record GlobalLeaderboardEntry(
    int rank,
    String username,
    int points,
    int mastery,
    int streak,
    boolean isCurrentUser,
    Long bestTimeMs,
    Long totalTimeMs
) {}
