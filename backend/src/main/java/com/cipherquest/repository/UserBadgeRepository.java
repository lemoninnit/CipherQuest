package com.cipherquest.repository;

import com.cipherquest.model.User;
import com.cipherquest.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * DAY 1: Extended with userId-based lookups needed by UserProgressService.
 */
@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {

    List<UserBadge> findByUser(User user);

    List<UserBadge> findByUserId(Long userId);

    // Kept for backward compatibility
    boolean existsByUserAndBadgeType(User user, String badgeType);

    Optional<UserBadge> findByUserIdAndBadgeType(Long userId, String badgeType);

    boolean existsByUserIdAndBadgeType(Long userId, String badgeType);
}