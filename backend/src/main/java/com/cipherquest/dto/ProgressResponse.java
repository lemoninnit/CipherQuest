package com.cipherquest.dto;

import java.util.List;
import java.util.Map;

/**
 * DAY 2: Response for progress save and fetch operations.
 *
 * progressMap  – full map: { "CAESAR": { "EASY": [0,1,2], "MEDIUM": [], "HARD": [] }, ... }
 * newBadges    – badge type strings awarded during this save (may be empty)
 */
public record ProgressResponse(
    Map<String, Map<String, List<Integer>>> progressMap,
    List<String> newBadges
) {}