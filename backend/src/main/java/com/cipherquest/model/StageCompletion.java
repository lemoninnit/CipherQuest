package com.cipherquest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Immutable history record of every successful stage completion.
 *
 * Records: playerId, stageId (cipher + difficulty + level), score,
 * streak, multiplier, completionTimeMs, completedAt.
 *
 * The multiplier is stored for convenience but can always be
 * recalculated from the streak via ScoringService.getStreakMultiplier.
 */
@Entity
@Table(name = "stage_completions", indexes = {
        @Index(name = "idx_stage_completion_user", columnList = "user_id"),
        @Index(name = "idx_stage_completion_stage", columnList = "cipherType, difficultyTier, levelIndex")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StageCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String cipherType;

    @Column(nullable = false, length = 30)
    private String difficultyTier;

    @Column(nullable = false)
    private int levelIndex;

    /** Final stage score = round(baseScore x multiplier). */
    @Column(nullable = false)
    private int score;

    /** Global game streak AFTER the successful completion (streak used for the multiplier). */
    @Column(nullable = false)
    private int streak;

    /** Streak multiplier applied (e.g. 1.10, 1.25). Recalculable from streak. */
    @Column(nullable = false)
    private double multiplier;

    /** Milliseconds between server-side stage start and completion. */
    @Column(name = "completion_time_ms", nullable = false)
    private long completionTimeMs;

    @Column(name = "completed_at", nullable = false)
    @Builder.Default
    private LocalDateTime completedAt = LocalDateTime.now();
}