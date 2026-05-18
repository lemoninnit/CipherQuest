    package com.cipherquest.dto;

public record SubmitAnswerResponse(
    boolean correct,
    String correctAnswer,
    String encryptedWord,
    int shiftKey,
    int xpEarned,
    int totalScore,
    int attemptsLeft,
    boolean sessionEnded,
    String feedback
) {}