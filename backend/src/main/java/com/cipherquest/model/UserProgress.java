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

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime completedAt = LocalDateTime.now();
}