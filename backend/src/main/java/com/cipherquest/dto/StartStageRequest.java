package com.cipherquest.dto;

/**
 * Request body for POST /api/scoring/start
 *
 * cipherType     – "CAESAR" | "VIGENERE" | "PLAYFAIR"
 * difficultyTier – "EASY"   | "MEDIUM"   | "HARD"
 * levelIndex     – 0-based (0–4)
 */
public record StartStageRequest(
    String cipherType,
    String difficultyTier,
    int levelIndex
) {}