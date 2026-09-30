package com.cipherquest.dto;

import java.time.LocalDateTime;

/**
 * Response for POST /api/scoring/fail/{sessionId}
 *
 * gameStreak - always 0 after a failure (streak reset)
 * multiplier - always 1.00 after a failure
 * totalScore - unchanged; failures never subtract from the total score
 *
 * SESSION HEARTS - losing a stage costs exactly one server session heart, so the
 * response reports the resulting state. A client never needs a second request to
 * learn how many hearts are left, and cannot skip the cost.
 *   attempts        - hearts remaining after this loss
 *   maxAttempts     - hearts a full player holds (3)
 *   lockedOut       - true when the last heart was just spent
 *   cooldownEndTime - when hearts refill, or null if not on cooldown
 */
public record FailStageResponse(
    int gameStreak,
    double multiplier,
    int totalScore,
    int attempts,
    int maxAttempts,
    boolean lockedOut,
    LocalDateTime cooldownEndTime
) {}