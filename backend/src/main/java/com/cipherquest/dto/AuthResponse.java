package com.cipherquest.dto;

public record AuthResponse(
        String token,
        String tokenType,
        UserProfileDto user
) {
    public AuthResponse(String token, UserProfileDto user) {
        this(token, "Bearer", user);
    }
}