package com.cipherquest.dto;

import java.time.LocalDateTime;

/**
 * DAY 1/2: Extended with attempts and cooldown fields.
 * The frontend uses these to render the cooldown overlay.
 *
 * BACKWARD-COMPATIBLE: all existing fields preserved in same positions.
 */
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
        LocalDateTime lastLoginAt,
        // Day 1/2 additions
        int attempts,
        boolean onCooldown,
        LocalDateTime cooldownEndTime,
        java.util.List<String> earnedBadges,
        java.util.Map<String, java.util.Map<String, java.util.List<Integer>>> progress
) {}