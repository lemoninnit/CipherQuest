package com.cipherquest.service;

import com.cipherquest.dto.SaveProgressRequest;
import com.cipherquest.model.User;
import com.cipherquest.model.UserProgress;
import com.cipherquest.repository.UserBadgeRepository;
import com.cipherquest.repository.UserProgressRepository;
import com.cipherquest.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * SESSION HEARTS — the site-wide 3-heart counter and its 3-minute cooldown.
 *
 * The proposal documented on the User entity says a player is "locked out from
 * starting new levels" while the cooldown is running. These tests pin that
 * contract down, because nothing in the request path used to enforce it.
 */
public class UserProgressServiceHeartsTest {

    private static final int MAX_ATTEMPTS = 3;
    private static final int COOLDOWN_MINUTES = 3;

    private UserRepository         userRepository;
    private UserProgressRepository progressRepository;
    private UserBadgeRepository    badgeRepository;
    private UserProgressService    service;

    @BeforeEach
    public void setup() {
        userRepository   = mock(UserRepository.class);
        progressRepository = mock(UserProgressRepository.class);
        badgeRepository  = mock(UserBadgeRepository.class);

        // No badges / progress rows: keeps profile building trivial for these tests.
        when(badgeRepository.findByUserId(any())).thenReturn(java.util.Collections.emptyList());
        when(progressRepository.findByUserId(any())).thenReturn(java.util.Collections.emptyList());

        service = new UserProgressService(userRepository, progressRepository, badgeRepository);
    }

    private void given(User user) {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
    }

    private User operative(int attempts, LocalDateTime cooldownEnd) {
        return User.builder()
                .id(1L).username("operative").xp(0).streak(0)
                .attempts(attempts)
                .cooldownEndTime(cooldownEnd)
                .build();
    }

    @Test
    public void testFullHeartCountIsNotOnCooldown() {
        User user = operative(MAX_ATTEMPTS, null);
        assertFalse(UserProgressService.isOnCooldown(user));
    }

    @Test
    public void testLiveCooldownWindowIsEnforced() {
        User user = operative(0, LocalDateTime.now().plusHours(3));
        given(user);
        assertTrue(UserProgressService.isOnCooldown(user));
        assertThrows(IllegalStateException.class, () -> service.assertNotOnCooldown(1L));
    }

    @Test
    public void testGateAllowsPlayWhileHeartsRemain() {
        given(operative(2, null));
        assertDoesNotThrow(() -> service.assertNotOnCooldown(1L));
    }

    @Test
    public void testElapsedCooldownRefillsHeartsAndUnblocksPlay() {
        // Cooldown already expired: the operative must be refilled, not locked.
        User user = operative(0, LocalDateTime.now().minusMinutes(1));
        given(user);

        assertDoesNotThrow(() -> service.assertNotOnCooldown(1L));

        assertEquals(MAX_ATTEMPTS, user.getAttempts(), "An expired cooldown refills every heart");
        assertNull(user.getCooldownEndTime(), "The expired cooldown is cleared");
        verify(userRepository).save(user);
    }

    @Test
    public void testLiveCooldownPersistsTheRefillAttemptBeforeRejecting() {
        // A live cooldown must still be reported, and the user row saved so the
        // state survives the rejection.
        User user = operative(0, LocalDateTime.now().plusMinutes(30));
        given(user);

        assertThrows(IllegalStateException.class, () -> service.assertNotOnCooldown(1L));
        verify(userRepository).save(user);
    }

    @Test
    public void testSpendingTheLastHeartStartsTheCooldown() {
        User user = operative(1, null);
        given(user);

        service.deductAttempt(1L);

        assertEquals(0, user.getAttempts());
        assertNotNull(user.getCooldownEndTime(), "Spending the last heart starts the cooldown");
        assertTrue(UserProgressService.isOnCooldown(user));
    }

    @Test
    public void testSpendingAMiddleHeartDoesNotStartTheCooldown() {
        User user = operative(3, null);
        given(user);

        service.deductAttempt(1L);

        assertEquals(2, user.getAttempts());
        assertNull(user.getCooldownEndTime(), "The cooldown only starts at zero hearts");
        assertFalse(UserProgressService.isOnCooldown(user));
    }

    @Test
    public void testDeductionNeverGoesNegativeOrRestartsTheClock() {
        User user = operative(0, LocalDateTime.now().plusHours(2));
        given(user);

        service.deductAttempt(1L);

        assertEquals(0, user.getAttempts(), "A locked-out player cannot drop below zero hearts");
        assertTrue(UserProgressService.isOnCooldown(user), "The running cooldown is never restarted");
    }

    // ── Zero hearts locks play even without a running clock ───────────

    @Test
    public void testZeroHeartsLocksOutEvenWithoutACooldownClock() {
        // Defensive case: no hearts and no cooldown timestamp. The rule is
        // "no heart, no stage from any cipher", so this must still be locked.
        User user = operative(0, null);
        given(user);

        assertTrue(UserProgressService.isLockedOut(user));
        assertThrows(IllegalStateException.class, () -> service.assertNotOnCooldown(1L));
    }

    @Test
    public void testRemainingHeartsArePlayableRegardlessOfTheClock() {
        assertFalse(UserProgressService.isLockedOut(operative(1, null)));
        assertFalse(UserProgressService.isLockedOut(operative(2, LocalDateTime.now().minusHours(1))));
    }

    // ── Stage loss costs exactly one heart, on the server ─────────────

    @Test
    public void testStageLossCostsExactlyOneHeart() {
        User user = operative(3, null);
        given(user);

        UserProgressService.HeartState state = service.consumeHeartForStageLoss(1L);

        assertEquals(2, user.getAttempts(), "A lost stage spends one heart");
        assertEquals(2, state.attempts());
        assertEquals(MAX_ATTEMPTS, state.maxAttempts());
        assertFalse(state.lockedOut(), "Hearts remain, so play continues");
        assertNull(state.cooldownEndTime());
    }

    @Test
    public void testStageLossThatSpendsTheLastHeartLocksOutAndSetsTheCooldown() {
        User user = operative(1, null);
        given(user);

        UserProgressService.HeartState state = service.consumeHeartForStageLoss(1L);

        assertEquals(0, user.getAttempts());
        assertTrue(state.lockedOut(), "The last heart locks every stage out");
        assertNotNull(state.cooldownEndTime(), "A cooldown window is started");
        verify(userRepository).save(user);
    }

    @Test
    public void testCooldownWindowIsThreeMinutes() {
        // The lockout has to be a short breather, not a dead end: a player who
        // runs out of hearts must be able to get back in quickly. Pins the
        // window so a future "let's make it four hours again" change is a
        // deliberate, test-visible decision rather than a silent regression.
        User user = operative(1, null);
        given(user);

        LocalDateTime before = LocalDateTime.now();
        service.consumeHeartForStageLoss(1L);

        long minutes = java.time.Duration.between(before, user.getCooldownEndTime()).toMinutes();
        assertTrue(minutes > 0 && minutes <= COOLDOWN_MINUTES,
                "The cooldown must be " + COOLDOWN_MINUTES + " minutes, was " + minutes);
        assertTrue(UserProgressService.isOnCooldown(user), "Hearts refill only after the window closes");
    }

    @Test
    public void testStageLossRefillsFirstWhenTheCooldownAlreadyExpired() {
        // A stale zero must not lock the player out: the refill happens before
        // the deduction, so they play on with full hearts minus the new loss.
        User user = operative(0, LocalDateTime.now().minusMinutes(1));
        given(user);

        UserProgressService.HeartState state = service.consumeHeartForStageLoss(1L);

        assertEquals(MAX_ATTEMPTS - 1, user.getAttempts(),
                "The expired cooldown refills to full, then this loss costs one");
        assertFalse(state.lockedOut());
    }

    @Test
    public void testRepeatedStageLossNeverGoesNegative() {
        User user = operative(0, LocalDateTime.now().plusHours(1));
        given(user);

        UserProgressService.HeartState state = service.consumeHeartForStageLoss(1L);

        assertEquals(0, user.getAttempts(), "Hearts clamp at zero");
        assertTrue(state.lockedOut());
    }

    // ── Direct progress claims are refused while locked out ───────────

    @Test
    public void testSaveProgressIsRefusedWhileLockedOut() {
        // Otherwise a client could skip the scoring session entirely and bank a
        // stage completion for free while locked out.
        User user = operative(0, LocalDateTime.now().plusHours(1));
        given(user);

        SaveProgressRequest request = new SaveProgressRequest("CAESAR", "EASY", 0);

        assertThrows(IllegalStateException.class, () -> service.saveProgress(1L, request));
        verify(progressRepository, never()).save(any(UserProgress.class));
    }

    @Test
    public void testSaveProgressIsAllowedWhileHeartsRemain() {
        User user = operative(2, null);
        given(user);
        when(progressRepository
                .findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(1L, "CAESAR", "EASY", 0))
                .thenReturn(Optional.empty());
        when(progressRepository.save(any(UserProgress.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> service.saveProgress(
                1L, new SaveProgressRequest("CAESAR", "EASY", 0)));
    }
}