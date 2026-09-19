package com.cipherquest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Persists the progress of users across cipher categories and difficulty levels.
 */
@Entity
@Table(name = "user_progress", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "cipherType", "difficultyTier", "levelIndex" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String cipherType; // e.g. "CAESAR", "VIGENERE", "PLAYFAIR"

    @Column(nullable = false, length = 30)
    private String difficultyTier; // e.g. "EASY", "MEDIUM", "HARD"

    @Column(nullable = false)
    private int levelIndex; // 0 to 4 (5 levels per tier)

    // ── Scoring System: personal bests ────────────────────────────────

    /**
     * Personal best score for this stage.
     * Updated only when a new score EXCEEDS the stored value.
     */
    @Column(name = "best_score", nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int bestScore = 0;

    /**
     * Personal best (fastest) successful completion time in milliseconds.
     * Updated only when a new time is LOWER than the stored value.
     * Null until the first successful completion with a valid time.
     */
    @Column(name = "best_time_ms")
    private Long bestTimeMs;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime completedAt = LocalDateTime.now();
}
