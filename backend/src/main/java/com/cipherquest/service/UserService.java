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
        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new UsernameNotFoundException("Operative ID not found: " + req.username()));

        if (!user.getEmail().equalsIgnoreCase(req.email())) {
            throw new IllegalArgumentException("Comms Channel (Email) does not match the registered Operative ID");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
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