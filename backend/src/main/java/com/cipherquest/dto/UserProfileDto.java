package com.cipherquest.dto;

import java.time.LocalDateTime;

public record UserProfileDto(
    Long id,
    String username,
    String email,
    int xp,
    int level,
    int streak,
    int totalCiphersSolved,
    int fishingGamesPlayed,
    int fishingBestScore,
    LocalDateTime createdAt,
    LocalDateTime lastLoginAt
) {}