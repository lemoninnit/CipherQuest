package com.cipherquest.service;

import com.cipherquest.config.JwtUtil;
import com.cipherquest.dto.ChangePasswordRequest;
import com.cipherquest.dto.ResetPasswordRequest;
import com.cipherquest.model.User;
import com.cipherquest.repository.FishingSessionRepository;
import com.cipherquest.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * ACCESS CIPHER ROTATION — both the signed-in change and the signed-out reset.
 *
 * The security-relevant rule is that changing a cipher requires proving you
 * know the one being replaced. The caller already holds a valid JWT when
 * changing it, but a JWT alone is not enough: it can be stolen or borrowed, and
 * the forgot-password reset needs the comms channel, so rotating the credential
 * without the current cipher would be a permanent account takeover.
 */
public class UserServiceChangePasswordTest {

    private static final String USERNAME    = "operative";
    private static final String CURRENT     = "old-cipher-01";
    private static final String STORED_HASH = "$2a$storedhash";

    private UserRepository           userRepository;
    private FishingSessionRepository fishingSessionRepository;
    private PasswordEncoder          passwordEncoder;
    private JwtUtil                   jwtUtil;
    private AuthenticationManager     authenticationManager;
    private EntityManager             entityManager;
    private UserProgressService       userProgressService;
    private UserService               userService;

    @BeforeEach
    public void setup() {
        userRepository           = mock(UserRepository.class);
        fishingSessionRepository = mock(FishingSessionRepository.class);
        passwordEncoder          = mock(PasswordEncoder.class);
        jwtUtil                  = mock(JwtUtil.class);
        authenticationManager    = mock(AuthenticationManager.class);
        entityManager            = mock(EntityManager.class);
        userProgressService      = mock(UserProgressService.class);

        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(storedUser()));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$newhash");
        // Default: only the genuine current cipher validates.
        when(passwordEncoder.matches(anyString(), anyString()))
                .thenAnswer(inv -> CURRENT.equals(inv.getArgument(0)));

        userService = new UserService(
                userRepository, fishingSessionRepository, passwordEncoder,
                jwtUtil, authenticationManager, entityManager, userProgressService);
    }

    /** A fresh instance per call, because a change mutates the entity. */
    private User storedUser() {
        return User.builder()
                .id(1L)
                .username(USERNAME)
                .email("operative@cipherquest.io")
                .password(STORED_HASH)
                .build();
    }

    private ChangePasswordRequest change(String current, String next, String confirm) {
        return new ChangePasswordRequest(current, next, confirm);
    }

    // ── Happy path ───────────────────────────────────────────────────

    @Test
    public void testCorrectCurrentCipherChangesThePassword() {
        userService.changePassword(USERNAME, change(CURRENT, "brand-new-01", "brand-new-01"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals("$2a$newhash", saved.getValue().getPassword());
    }

    @Test
    public void testNewCipherIsHashedNeverStoredRaw() {
        userService.changePassword(USERNAME, change(CURRENT, "brand-new-01", "brand-new-01"));

        verify(passwordEncoder).encode("brand-new-01");
        assertNotEquals("brand-new-01", storedUser().getPassword());
    }

    // ── The rule that matters ────────────────────────────────────────

    @Test
    public void testWrongCurrentCipherIsRejected() {
        // The account-takeover guard: a valid session must NOT be enough on its
        // own to rotate the credential.
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> userService.changePassword(USERNAME, change("not-my-cipher", "brand-new-01", "brand-new-01")));

        assertTrue(error.getMessage().toLowerCase().contains("current"),
                "The message must name the field that is wrong, was: " + error.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testReusingTheSameCipherIsRejected() {
        // Otherwise the UI reports success while the account is unchanged,
        // which reads as "my cipher is strong now" when it is not.
        assertThrows(IllegalArgumentException.class,
                () -> userService.changePassword(USERNAME, change(CURRENT, CURRENT, CURRENT)));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testMismatchedConfirmationIsRejectedBeforeAnythingElse() {
        assertThrows(IllegalArgumentException.class,
                () -> userService.changePassword(USERNAME, change(CURRENT, "brand-new-01", "brand-new-02")));

        // No encoding, no save: a mismatch costs nothing.
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testMismatchIsReportedBeforeTheCurrentCipher() {
        // Two independent problems; report the one the operative can fix fastest.
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> userService.changePassword(USERNAME, change("wrong", "brand-new-01", "brand-new-02")));

        assertTrue(error.getMessage().toLowerCase().contains("do not match"),
                "Expected the mismatch first, was: " + error.getMessage());
    }

    // ── The signed-out reset shares the confirmation rule ────────────

    @Test
    public void testResetAlsoRequiresMatchingConfirmation() {
        ResetPasswordRequest request = new ResetPasswordRequest(
                USERNAME, "operative@cipherquest.io", "brand-new-01", "brand-new-02");

        assertThrows(IllegalArgumentException.class, () -> userService.resetPassword(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testResetSucceedsWithMatchingConfirmation() {
        ResetPasswordRequest request = new ResetPasswordRequest(
                USERNAME, "operative@cipherquest.io", "brand-new-01", "brand-new-01");

        userService.resetPassword(request);
        verify(userRepository).save(any(User.class));
    }
}
