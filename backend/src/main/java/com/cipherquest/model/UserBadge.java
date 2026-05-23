package com.cipherquest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Persists earned achievements/badges for users.
 */
@Entity
@Table(name = "user_badges", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "user_id", "badgeType" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String badgeType; // e.g., "FIRST_CRACK", "SPEEDSTER", "DEFENDER", "SECRET"

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime earnedAt = LocalDateTime.now();
}
