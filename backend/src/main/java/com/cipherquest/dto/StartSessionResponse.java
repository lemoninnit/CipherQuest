package com.cipherquest.dto;

public record StartSessionResponse(
    Long sessionId,
    int shiftKey,
    int maxAttempts,
    String message
) {}