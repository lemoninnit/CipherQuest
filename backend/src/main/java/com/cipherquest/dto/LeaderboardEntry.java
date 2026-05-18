package com.cipherquest.dto;

import java.time.LocalDateTime;

public record LeaderboardEntry(
    int rank,
    String username,
    int score,
    int xpEarned,
    LocalDateTime playedAt
) {}