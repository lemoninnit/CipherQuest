package com.cipherquest.service;

import com.cipherquest.config.JwtUtil;
import com.cipherquest.dto.RegisterRequest;
import com.cipherquest.model.User;
import com.cipherquest.repository.FishingSessionRepository;
import com.cipherquest.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * REGISTRATION — Access Cipher confirmation.
 *
 * The signup form asks for the Access Cipher twice so a typo cannot lock an
 * operative out of an account they just created. That protection is worthless
 * if it only lives in the browser, so these tests pin the server-side half:
 * a mismatched confirmation must be refused before anything is persisted.
 */
public class UserServiceRegistrationTest {

    private static final String VALID_PASSWORD = "grid-master-01";

    private UserRepository         userRepository;
    private FishingSessionRepository fishingSessionRepository;
    private PasswordEncoder        passwordEncoder;
    private JwtUtil                 jwtUtil;
    private AuthenticationManager   authenticationManager;
    private EntityManager           entityManager;
    private UserProgressService     userProgressService;
    private UserService             userService;

    @BeforeEach
    public void setup() {
        userRepository           = mock(UserRepository.class);
        fishingSessionRepository = mock(FishingSessionRepository.class);
        passwordEncoder          = mock(PasswordEncoder.class);
        jwtUtil                  = mock(JwtUtil.class);
        authenticationManager    = mock(AuthenticationManager.class);
        entityManager            = mock(EntityManager.class);
        userProgressService      = mock(UserProgressService.class);

        // Defaults for an otherwise-happy signup; individual tests override.
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(jwtUtil.generateToken(anyString())).thenReturn("test-jwt");

        userService = new UserService(
                userRepository, fishingSessionRepository, passwordEncoder,
                jwtUtil, authenticationManager, entityManager, userProgressService);
    }

    private RegisterRequest request(String password, String confirmPassword) {
        return new RegisterRequest("operative", "operative@cipherquest.io", password, confirmPassword);
    }

    @Test
    public void testMatchingConfirmationCreatesTheOperative() {
        assertDoesNotThrow(() -> userService.register(request(VALID_PASSWORD, VALID_PASSWORD)));

        verify(userRepository).save(any(User.class));
        verify(jwtUtil).generateToken("operative");
    }

    @Test
    public void testMismatchedConfirmationIsRejected() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> userService.register(request(VALID_PASSWORD, "grid-master-02")));

        assertTrue(error.getMessage().toLowerCase().contains("do not match"),
                "The message must tell the operative what went wrong, was: " + error.getMessage());
    }

    @Test
    public void testMismatchedConfirmationPersistsNothing() {
        // The whole point of the confirmation: a typo must cost no account and,
        // critically, no half-created credentials the operative cannot log into.
        assertThrows(IllegalArgumentException.class,
                () -> userService.register(request(VALID_PASSWORD, "typo-in-the-second-box")));

        verify(userRepository, never()).save(any(User.class));
        verify(userRepository, never()).existsByUsername(anyString());
        verify(userRepository, never()).existsByEmail(anyString());
        verifyNoInteractions(jwtUtil);
    }

    @Test
    public void testMismatchIsCheckedBeforeUniqueness() {
        // A mismatch costs zero database round-trips. Also guards ordering: if
        // this ever regresses, the user would be told "username taken" for an
        // account that was never actually created.
        when(userRepository.existsByUsername("operative")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> userService.register(request(VALID_PASSWORD, "something-else")));

        verify(userRepository, never()).existsByUsername(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testConfirmationIsNeverStored() {
        // Only the BCrypt hash of the password may reach the database.
        userService.register(request(VALID_PASSWORD, VALID_PASSWORD));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());

        assertEquals("$2a$hashed", saved.getValue().getPassword());
        assertNotEquals(VALID_PASSWORD, saved.getValue().getPassword());
        verify(passwordEncoder).encode(VALID_PASSWORD);
    }

    @Test
    public void testCaseDifferenceStillCountsAsAMismatch() {
        // Passwords are compared verbatim — no trimming, no case folding — so
        // that what the operative sees is exactly what was hashed.
        assertThrows(IllegalArgumentException.class,
                () -> userService.register(request(VALID_PASSWORD, VALID_PASSWORD.toUpperCase())));
    }
}