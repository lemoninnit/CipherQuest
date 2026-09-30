package com.cipherquest.service;

import com.cipherquest.config.JwtUtil;
import com.cipherquest.dto.*;
import com.cipherquest.model.FishingSession;
import com.cipherquest.model.User;
import com.cipherquest.repository.FishingSessionRepository;
import com.cipherquest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FishingSessionRepository fishingSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EntityManager entityManager;
    private final UserProgressService userProgressService;

    @Transactional
    public void deleteUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        Long userId = user.getId();

        entityManager.createNativeQuery("SET LOCAL session_replication_role = 'replica'").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM cast_results WHERE session_id IN (SELECT id FROM fishing_sessions WHERE user_id = :userId)")
                .setParameter("userId", userId)
                .executeUpdate();

        entityManager.createNativeQuery("DELETE FROM fishing_sessions WHERE user_id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();

        entityManager.createNativeQuery("DELETE FROM users WHERE id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
    }

    // ── Auth ──────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        // The client checks this too, but the client is not trusted: without a
        // server-side comparison a mistyped Access Cipher would create an
        // account the operative can never log back into. Checked first so a
        // typo costs no database round-trips.
        if (!req.password().equals(req.confirmPassword())) {
            throw new IllegalArgumentException("Access Ciphers do not match. Please try again.");
        }

        if (userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username already taken: " + req.username());
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already registered: " + req.email());
        }

        User user = User.builder()
                .username(req.username())
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .build();

        userRepository.save(user);

        // Initialise streak on first login
        userProgressService.updateStreak(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, userProgressService.getFullProfile(user.getId()));
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password())
        );

        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // DAY 2: Update streak on login
        userProgressService.updateStreak(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, userProgressService.getFullProfile(user.getId()));
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        // Checked before any lookup so a typo costs nothing.
        if (!req.newPasswordsMatch()) {
            throw new IllegalArgumentException("Access Ciphers do not match. Please try again.");
        }

        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new UsernameNotFoundException("Operative ID not found: " + req.username()));

        if (!user.getEmail().equalsIgnoreCase(req.email())) {
            throw new IllegalArgumentException("Comms Channel (Email) does not match the registered Operative ID");
        }

        applyNewPassword(user, req.newPassword());
    }

    /**
     * Changes the Access Cipher of a signed-in operative.
     *
     * <p>The current cipher is re-verified here even though the caller already
     * holds a valid JWT. That is deliberate: a stolen or borrowed session would
     * otherwise be enough to permanently lock the real owner out, because the
     * forgot-password reset needs the comms channel and the owner may not have
     * access to that mailbox. Re-verification means an attacker can read the
     * profile but cannot rotate the credential.
     */
    @Transactional
    public void changePassword(String username, ChangePasswordRequest req) {
        if (!req.newPasswordsMatch()) {
            throw new IllegalArgumentException("New Access Ciphers do not match. Please try again.");
        }

        User user = findByUsername(username);

        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current Access Cipher is incorrect.");
        }

        // Re-submitting the same cipher is almost always a mis-click, and
        // reporting success would leave the operative thinking they hardened
        // their account when nothing changed.
        if (passwordEncoder.matches(req.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New Access Cipher must be different from the current one.");
        }

        applyNewPassword(user, req.newPassword());
    }

    /**
     * Single place a password hash is ever written, so no future caller can
     * accidentally persist a cipher without encoding it.
     */
    private void applyNewPassword(User user, String rawNewPassword) {
        user.setPassword(passwordEncoder.encode(rawNewPassword));
        userRepository.save(user);
    }

    // ── Profile ───────────────────────────────────────────────────────

    public UserProfileDto getProfile(String username) {
        User user = findByUsername(username);
        return userProgressService.getFullProfile(user.getId());
    }

    // ── Internal Helpers ──────────────────────────────────────────────

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    // Needed for import resolution
    static class UsernameNotFoundException extends RuntimeException {
        UsernameNotFoundException(String msg) { super(msg); }
    }
}