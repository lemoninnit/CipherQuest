package com.cipherquest.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Forgot-password reset, performed while signed out.
 *
 * <p>Identity is established by Operative ID + comms channel rather than by the
 * current cipher, because by definition the operative cannot supply it. See
 * {@code ChangePasswordRequest} for the signed-in variant, which does verify the
 * cipher being replaced.
 *
 * <p>{@code confirmPassword} is never stored — it exists so a typo cannot
 * install a cipher the operative did not intend, which would otherwise lock them
 * out with no way back in.
 */
public record ResetPasswordRequest(
        @NotBlank @Size(min = 3, max = 30) String username,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6) String newPassword,
        @NotBlank @Size(min = 6) String confirmPassword
) {

    /** True when the two new ciphers are identical. Null-safe by design. */
    public boolean newPasswordsMatch() {
        return newPassword != null && newPassword.equals(confirmPassword);
    }
}
