package com.cipherquest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a single fishing mini-game session.
 *
 * Flow:
 *   1. Player casts a line → receives an encrypted word (Caesar cipher).
 *   2. Player decodes the word and submits their answer.
 *   3. If correct → fish is "caught" (score++, XP awarded).
 *   4. Session ends after MAX_ATTEMPTS or when manually finished.
 */
@Entity
@Table(name = "fishing_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FishingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Who's playing
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // How many fish were successfully decoded
    @Builder.Default
    private int score = 0;

    // Total XP earned this session
    @Builder.Default
    private int xpEarned = 0;

    // Number of attempts used
    @Builder.Default
    private int attemptsUsed = 0;

    // Is the session still ongoing?
    @Builder.Default
    private boolean active = true;

    // The Caesar shift used for this session (1-25)
    private int shiftKey;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column
    private LocalDateTime endedAt;

    // List of all cast results stored as JSON-like text for simplicity
    // In production: use a separate CastResult entity
    @ElementCollection
    @CollectionTable(name = "cast_results", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "result")
    @Builder.Default
    private List<String> castLog = new ArrayList<>();

    public void endSession() {
        this.active = false;
        this.endedAt = LocalDateTime.now();
    }
}
