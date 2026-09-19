package com.cipherquest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Server-authoritative record of a stage attempt.
 *
 * Created when the player starts a stage (POST /api/scoring/start).
 * Used for anti-cheat validation on completion:
 *   - The stage must have been started on the server.
 *   - The session belongs to exactly one player.
 *   - A session can only be completed once.
 *   - Completion time is derived from server timestamps, never trusted from the client.
 */
@Entity
@Table(name = "stage_sessions", indexes = {
        @Index(name = "idx_stage_session_user", columnList = "user_id"),
        @Index(name = "idx_stage_session_stage", columnList = "cipherType, difficultyTier, levelIndex")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StageSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String cipherType; // "CAESAR" | "VIGENERE" | "PLAYFAIR"

    @Column(nullable = false, length = 30)
    private String difficultyTier; // "EASY" | "MEDIUM" | "HARD"

    @Column(nullable = false)
    private int levelIndex; // 0-4

    /** Server timestamp captured when the stage started. */
    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    /** ACTIVE → COMPLETED | FAILED | EXPIRED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}