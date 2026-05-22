package com.cipherquest.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Core user entity for CipherQuest.
 * Stores operative credentials, XP, streak, rank, attempt system.
 *
 * DAY 1 CHANGES:
 *  - Added `attempts` (site-wide attempt counter, default 3, range 0-3)
 *  - Added `cooldownEndTime` (set to now+4h when attempts hit 0; cleared on refill)
 *  - Added relationships to UserProgress and UserBadge
 *
 * NOTE: `hearts` in Pac-Man and `shoeTokens` in Sprint are in-game lives
 * managed CLIENT-SIDE only and are NOT stored here.
 */
@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "username"),
        @UniqueConstraint(columnNames = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 30)
    @Column(nullable = false)
    private String username;

    @NotBlank
    @Email
    @Column(nullable = false)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password; // BCrypt hashed

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    // ── Game Stats ────────────────────────────────────────────────────

    @Column(nullable = false)
    @Builder.Default
    private int xp = 0;

    @Column(nullable = false)
    @Builder.Default
    private int level = 1;

    @Column(nullable = false)
    @Builder.Default
    private int streak = 0;

    @Column(nullable = false)
    @Builder.Default
    private int totalCiphersSolved = 0;

    @Column(nullable = false)
    @Builder.Default
    private int fishingGamesPlayed = 0;

    @Column(nullable = false)
    @Builder.Default
    private int fishingBestScore = 0;

    // ── Site-wide Attempt System ──────────────────────────────────────
    // This is SEPARATE from:
    //   - Pac-Man lives  (in-game, client-side only, resets per level)
    //   - Sprint shoe tokens (in-game, client-side only, resets per level)

    /**
     * Site-wide attempt counter. Default 3, range [0, 3].
     * Decremented when the user submits a WRONG final answer on any level.
     * Refills to 3 when cooldownEndTime has passed (checked on profile fetch).
     */
    @Column(nullable = false)
    @Builder.Default
    private int attempts = 3;

    /**
     * When non-null and in the future, the user is locked out from starting new levels.
     * Set to LocalDateTime.now().plusHours(4) when attempts hits 0.
     * Cleared (set to null) when the cooldown expires on next profile fetch.
     */
    @Column(name = "cooldown_end_time")
    private LocalDateTime cooldownEndTime;

    // ── Timestamps ────────────────────────────────────────────────────

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // ── Relationships ─────────────────────────────────────────────────

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserProgress> progressRecords = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserBadge> badges = new ArrayList<>();

    // ── Helpers ───────────────────────────────────────────────────────

    /**
     * Gain XP and auto-level up every 1000 XP.
     */
    public void addXp(int amount) {
        this.xp += amount;
        this.level = (this.xp / 1000) + 1;
    }

    public enum Role {
        USER, ADMIN
    }
}