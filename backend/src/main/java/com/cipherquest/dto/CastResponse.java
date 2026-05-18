package com.cipherquest.dto;

public record CastResponse(
    Long sessionId,
    int attemptNumber,
    int maxAttempts,
    String encryptedWord,
    int shiftKey,
    String hint,
    boolean sessionActive
) {}