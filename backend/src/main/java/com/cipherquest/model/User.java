package com.cipherquest.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Core user entity for CipherQuest.
 * Stores operative credentials, XP, streak, and rank.
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

    // ── Timestamps ────────────────────────────────────────────────────

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime lastLoginAt;

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
