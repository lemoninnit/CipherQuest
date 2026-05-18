package com.cipherquest.service;

import com.cipherquest.config.JwtUtil;
import com.cipherquest.dto.*;
import com.cipherquest.model.User;
import com.cipherquest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

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

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, toProfileDto(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.username(), req.password())
        );

        User user = userRepository.findByUsername(req.username())
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, toProfileDto(user));
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
        return toProfileDto(findByUsername(username));
    }

    // ── Internal Helpers ──────────────────────────────────────────────

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    public static UserProfileDto toProfileDto(User u) {
        return new UserProfileDto(
            u.getId(), u.getUsername(), u.getEmail(),
            u.getXp(), u.getLevel(), u.getStreak(),
            u.getTotalCiphersSolved(), u.getFishingGamesPlayed(),
            u.getFishingBestScore(), u.getCreatedAt(), u.getLastLoginAt()
        );
    }

    // Needed for import resolution
    static class UsernameNotFoundException extends RuntimeException {
        UsernameNotFoundException(String msg) { super(msg); }
    }
}
