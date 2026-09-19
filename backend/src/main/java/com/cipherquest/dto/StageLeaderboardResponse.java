package com.cipherquest.dto;

import java.util.List;

/**
 * Response for GET /api/scoring/leaderboard
 *
 * category – "score" (highest score, descending) or "time" (fastest time, ascending)
 */
public record StageLeaderboardResponse(
    String category,
    String cipherType,
    String difficultyTier,
    int levelIndex,
    List<StageLeaderboardEntry> entries
) {}