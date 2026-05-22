package com.cipherquest.dto;

/**
 * DAY 2: Request body for POST /api/users/progress
 *
 * cipherType    – "CAESAR" | "VIGENERE" | "PLAYFAIR"
 * difficultyTier – "EASY"   | "MEDIUM"   | "HARD"
 * levelIndex    – 0-based (0–4)
 */
public record SaveProgressRequest(
    String cipherType,
    String difficultyTier,
    int levelIndex
) {}