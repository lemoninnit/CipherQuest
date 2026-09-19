package com.cipherquest.dto;

import java.util.List;
import java.util.Map;

/**
 * Response for POST /api/scoring/complete/{sessionId}
 *
 * score            – final stage score = round(baseScore x multiplier)
 * baseScore        – difficulty base score (100/200/300)
 * streak           – global game streak AFTER this successful completion
 * multiplier       – streak multiplier applied (recalculated from streak)
 * completionTimeMs – server-derived completion time in milliseconds
 * totalScore       – updated player total score
 * bestScore        – personal best score for this stage (after update)
 * bestTimeMs       – personal best time for this stage (after update, may be null)
 * newBestScore     – true if this completion set a new personal best score
 * newBestTime      – true if this completion set a new personal best time
 * newBadges        – badges awarded by this completion (may be empty)
 * progressMap      – full progress map for frontend localStorage sync
 */
public record CompleteStageResponse(
    int score,
    int baseScore,
    int streak,
    double multiplier,
    long completionTimeMs,
    int totalScore,
    int bestScore,
    Long bestTimeMs,
    boolean newBestScore,
    boolean newBestTime,
    List<String> newBadges,
    Map<String, Map<String, List<Integer>>> progressMap
) {}