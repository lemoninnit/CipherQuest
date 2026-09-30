package com.cipherquest.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * New-operative signup payload.
 *
 * <p>{@code confirmPassword} is required purely as a guard against typos: without
 * it, a mistyped Access Cipher silently creates an account the operative can
 * never log back into (recovery needs the comms channel). It is never stored —
 * {@link com.cipherquest.service.UserService#register} compares it against
 * {@code password} and discards it.
 */
public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 30) String username,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6) String password,
        @NotBlank @Size(min = 6) String confirmPassword
) {}