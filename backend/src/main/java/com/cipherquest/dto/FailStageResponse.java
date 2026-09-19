package com.cipherquest.dto;

/**
 * Response for POST /api/scoring/fail/{sessionId}
 *
 * gameStreak – always 0 after a failure (streak reset)
 * multiplier – always 1.00 after a failure
 * totalScore – unchanged; failures never subtract from the total score
 */
public record FailStageResponse(
    int gameStreak,
    double multiplier,
    int totalScore
) {}