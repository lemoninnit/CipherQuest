package com.cipherquest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * In-app Access Cipher change for an already-signed-in operative.
 *
 * <p>{@code currentPassword} is the important part: unlike the forgot-password
 * reset, a change is made by somebody who already holds a valid session, so the
 * server re-verifies the cipher they are replacing. Without that, anyone who
 * borrows a live session could lock the real owner out of their own account.
 *
 * <p>{@code confirmPassword} is never stored — it exists so a typo cannot
 * install a cipher the operative did not intend.
 */
public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 6) String newPassword,
        @NotBlank @Size(min = 6) String confirmPassword
) {

    /** True when the two new ciphers are identical. Null-safe by design. */
    public boolean newPasswordsMatch() {
        return newPassword != null && newPassword.equals(confirmPassword);
    }
}