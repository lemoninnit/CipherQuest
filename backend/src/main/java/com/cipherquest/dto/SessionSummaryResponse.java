package com.cipherquest.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SessionSummaryResponse(
    Long sessionId,
    int finalScore,
    int totalXpEarned,
    int attemptsUsed,
    int maxAttempts,
    boolean newBestScore,
    LocalDateTime startedAt,
    LocalDateTime endedAt,
    List<String> castLog
) {}