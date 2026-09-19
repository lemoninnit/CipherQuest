package com.cipherquest.dto;

import java.time.LocalDateTime;

/**
 * Response for POST /api/scoring/start
 *
 * sessionId – server-side attempt id; must be passed back on complete/fail.
 * startedAt – server-authoritative stage start timestamp.
 */
public record StartStageResponse(
    Long sessionId,
    String cipherType,
    String difficultyTier,
    int levelIndex,
    LocalDateTime startedAt
) {}