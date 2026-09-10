package com.cipherquest.dto;

import java.util.List;

/**
 * Encapsulates the top 10 ranked users and the authenticated user's individual entry.
 */
public record GlobalLeaderboardResponse(
    List<GlobalLeaderboardEntry> topUsers,
    GlobalLeaderboardEntry currentUserEntry
) {}
