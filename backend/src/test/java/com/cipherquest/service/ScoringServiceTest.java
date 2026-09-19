package com.cipherquest.service;

import com.cipherquest.dto.CompleteStageResponse;
import com.cipherquest.dto.FailStageResponse;
import com.cipherquest.dto.StageLeaderboardEntry;
import com.cipherquest.dto.StageLeaderboardResponse;
import com.cipherquest.dto.StartStageRequest;
import com.cipherquest.dto.StartStageResponse;
import com.cipherquest.model.StageCompletion;
import com.cipherquest.model.StageSession;
import com.cipherquest.model.User;
import com.cipherquest.model.UserProgress;
import com.cipherquest.repository.StageCompletionRepository;
import com.cipherquest.repository.StageSessionRepository;
import com.cipherquest.repository.UserProgressRepository;
import com.cipherquest.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * SCORING SYSTEM — server-authoritative behaviour tests.
 *
 * Covers the specification phases:
 *  PHASE 1  base score by difficulty
 *  PHASE 5  streak multiplier tiers
 *  PHASE 6  multiplier applied to the stage score (one rounding rule)
 *  PHASE 2-4, 7-11  success / failure flows, completion time, personal bests, history
 *  PHASE 12-13  HIGHEST SCORE / FASTEST TIME leaderboards
 *  PHASE 14 anti-cheat validation (ownership, single completion, plausible time)
 */
public class ScoringServiceTest {

    private UserRepository            userRepository;
    private UserProgressRepository    progressRepository;
    private StageSessionRepository    sessionRepository;
    private StageCompletionRepository completionRepository;
    private UserProgressService       userProgressService;

    private ScoringService scoringService;

    @BeforeEach
    public void setup() {
        userRepository       = mock(UserRepository.class);
        progressRepository   = mock(UserProgressRepository.class);
        sessionRepository    = mock(StageSessionRepository.class);
        completionRepository = mock(StageCompletionRepository.class);
        userProgressService  = mock(UserProgressService.class);

        scoringService = new ScoringService(
                userRepository, progressRepository, sessionRepository, completionRepository, userProgressService);
    }

    // ── PHASE 1: base score ──────────────────────────────────────────

    @Test
    public void testBaseScoreMatchesDifficultyTable() {
        assertEquals(100, scoringService.getBaseScore("EASY"));
        assertEquals(200, scoringService.getBaseScore("MEDIUM"));
        assertEquals(300, scoringService.getBaseScore("HARD"));
    }

    @Test
    public void testBaseScoreIsCaseAndWhitespaceInsensitive() {
        assertEquals(100, scoringService.getBaseScore("easy"));
        assertEquals(200, scoringService.getBaseScore("  Medium "));
        assertEquals(300, scoringService.getBaseScore("hard"));
    }

    @Test
    public void testBaseScoreRejectsUnknownDifficulty() {
        assertThrows(IllegalArgumentException.class, () -> scoringService.getBaseScore("NIGHTMARE"));
        assertThrows(IllegalArgumentException.class, () -> scoringService.getBaseScore(null));
    }

    // ─ PHASE 5: streak multiplier tiers ─────────────────────────────

    @Test
    public void testStreakMultiplierTierBoundaries() {
        // Streak 0-2 -> 1.00x
        assertEquals(1.00, scoringService.getStreakMultiplier(0), 1e-9);
        assertEquals(1.00, scoringService.getStreakMultiplier(1), 1e-9);
        assertEquals(1.00, scoringService.getStreakMultiplier(2), 1e-9);
        // Streak 3-4 -> 1.10x
        assertEquals(1.10, scoringService.getStreakMultiplier(3), 1e-9);
        assertEquals(1.10, scoringService.getStreakMultiplier(4), 1e-9);
        // Streak 5 -> 1.20x
        assertEquals(1.20, scoringService.getStreakMultiplier(5), 1e-9);
        // Streak 6-9 -> 1.25x
        assertEquals(1.25, scoringService.getStreakMultiplier(6), 1e-9);
        assertEquals(1.25, scoringService.getStreakMultiplier(9), 1e-9);
        // Streak 10-14 -> 1.50x
        assertEquals(1.50, scoringService.getStreakMultiplier(10), 1e-9);
        assertEquals(1.50, scoringService.getStreakMultiplier(14), 1e-9);
        // Streak 15-19 -> 1.75x
        assertEquals(1.75, scoringService.getStreakMultiplier(15), 1e-9);
        assertEquals(1.75, scoringService.getStreakMultiplier(19), 1e-9);
        // Streak 20+ -> 2.00x
        assertEquals(2.00, scoringService.getStreakMultiplier(20), 1e-9);
        assertEquals(2.00, scoringService.getStreakMultiplier(250), 1e-9);
    }

    @Test
    public void testStreakMultiplierIsDerivedFromTheStreak() {
        // The streak is the source of truth — the multiplier is recalculated, never stored.
        assertEquals(scoringService.getStreakMultiplier(12), scoringService.getStreakMultiplier(12), 1e-9);
        assertNotEquals(scoringService.getStreakMultiplier(2), scoringService.getStreakMultiplier(3));
    }

    // ── PHASE 6 / 22: final stage score + rounding ───────────────────

    @Test
    public void testStageScoreFormulaAndRounding() {
        assertEquals(100, scoringService.calculateStageScore(100, scoringService.getStreakMultiplier(1)));
        assertEquals(220, scoringService.calculateStageScore(200, scoringService.getStreakMultiplier(3)));
        assertEquals(330, scoringService.calculateStageScore(300, scoringService.getStreakMultiplier(4)));
        assertEquals(360, scoringService.calculateStageScore(300, scoringService.getStreakMultiplier(5)));
        assertEquals(450, scoringService.calculateStageScore(300, scoringService.getStreakMultiplier(10)));
        assertEquals(375, scoringService.calculateStageScore(300, scoringService.getStreakMultiplier(6)));
        assertEquals(525, scoringService.calculateStageScore(300, scoringService.getStreakMultiplier(15)));
        assertEquals(600, scoringService.calculateStageScore(300, scoringService.getStreakMultiplier(20)));
    }

    // ── PHASE 7: stage timer / server-side session ───────────────────

    @Test
    public void testStartStageCreatesServerSessionAndExpiresStaleAttempts() {
        User user = User.builder().id(7L).username("operative").build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(sessionRepository.save(any(StageSession.class))).thenAnswer(invocation -> {
            StageSession saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        StartStageResponse response =
                scoringService.startStage(7L, new StartStageRequest("caesar", "easy", 2));

        assertEquals(99L, response.sessionId());
        assertEquals("CAESAR", response.cipherType());
        assertEquals("EASY", response.difficultyTier());
        assertEquals(2, response.levelIndex());
        assertNotNull(response.startedAt(), "The server must capture the start timestamp");

        // Any abandoned attempt for the same stage is invalidated first.
        verify(sessionRepository).expireActiveSessions(7L, "CAESAR", "EASY", 2);
    }

    @Test
    public void testStartStageValidatesStageCoordinates() {
        User user = User.builder().id(7L).username("operative").build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class,
                () -> scoringService.startStage(7L, new StartStageRequest("ENIGMA", "EASY", 0)));
        assertThrows(IllegalArgumentException.class,
                () -> scoringService.startStage(7L, new StartStageRequest("CAESAR", "LEGENDARY", 0)));
        assertThrows(IllegalArgumentException.class,
                () -> scoringService.startStage(7L, new StartStageRequest("CAESAR", "EASY", 9)));
    }

    // ── PHASE 2-11: success flow ─────────────────────────────────────

    @Test
    public void testSuccessfulCompletionIncreasesStreakBeforeApplyingMultiplier() {
        // Spec example: current streak 2, Medium difficulty -> new streak 3 -> 200 x 1.10 = 220
        User user = User.builder().id(1L).username("op").gameStreak(2).totalScore(500).build();
        StageSession session = activeSession(10L, user, "CAESAR", "MEDIUM", 1, 18);

        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        stubSuccessPath(user, "CAESAR", "MEDIUM", 1);

        CompleteStageResponse response = scoringService.completeStage(1L, 10L);

        assertEquals(3, response.streak(), "Streak increases BEFORE the score is calculated");
        assertEquals(1.10, response.multiplier(), 1e-9);
        assertEquals(200, response.baseScore());
        assertEquals(220, response.score());
        assertEquals(720, response.totalScore(), "Total Score = previous total + final stage score");

        assertEquals(3, user.getGameStreak());
        assertEquals(720, user.getTotalScore());
        assertEquals("COMPLETED", session.getStatus(), "A session can only be completed once");
        assertNotNull(session.getEndedAt());

        // PHASE 14: completion time is derived from server timestamps only.
        assertTrue(response.completionTimeMs() >= 17_000L && response.completionTimeMs() <= 30_000L,
                "Completion time should be ~18s, was " + response.completionTimeMs());

        // Personal bests initialise on the first successful attempt.
        assertTrue(response.newBestScore());
        assertTrue(response.newBestTime());
        assertEquals(220, response.bestScore());
        assertNotNull(response.bestTimeMs());
    }

    @Test
    public void testSuccessfulCompletionSavesHistoryRecord() {
        User user = User.builder().id(1L).username("op").gameStreak(4).totalScore(0).build();
        StageSession session = activeSession(11L, user, "HARD", "HARD", 0, 19);

        when(sessionRepository.findById(11L)).thenReturn(Optional.of(session));
        stubSuccessPath(user, "HARD", "HARD", 0);

        scoringService.completeStage(1L, 11L);

        ArgumentCaptor<StageCompletion> captor = ArgumentCaptor.forClass(StageCompletion.class);
        verify(completionRepository).save(captor.capture());

        StageCompletion record = captor.getValue();
        assertEquals(1L, record.getUser().getId(), "playerId");
        assertEquals("HARD", record.getCipherType());
        assertEquals("HARD", record.getDifficultyTier());
        assertEquals(0, record.getLevelIndex(), "stageId");
        assertEquals(360, record.getScore(), "300 base x 1.20 (streak 5) = 360");
        assertEquals(5, record.getStreak());
        assertEquals(1.20, record.getMultiplier(), 1e-9);
        assertTrue(record.getCompletionTimeMs() >= 18_000L);
        assertNotNull(record.getCompletedAt());
    }

    // ── PHASE 3 / 4 / 7: failure flow ────────────────────────────────

    @Test
    public void testFailureResetsStreakAndPreservesTotalScore() {
        User user = User.builder().id(1L).username("op").gameStreak(6).totalScore(1235).build();
        StageSession session = StageSession.builder()
                .id(3L)
                .user(user)
                .cipherType("CAESAR")
                .difficultyTier("HARD")
                .levelIndex(4)
                .status("ACTIVE")
                .build();

        when(sessionRepository.findById(3L)).thenReturn(Optional.of(session));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FailStageResponse response = scoringService.failStage(1L, 3L);

        assertEquals(0, response.gameStreak(), "Failure resets the global streak");
        assertEquals(1.00, response.multiplier(), 1e-9);
        assertEquals(1235, response.totalScore(), "Failures never subtract from the total score");
        assertEquals(1235, user.getTotalScore());
        assertEquals("FAILED", session.getStatus());

        // No successful completion record and no personal-best updates on failure.
        verifyNoInteractions(completionRepository);
        verifyNoInteractions(progressRepository);

        // A failed attempt cannot be completed afterwards.
        assertThrows(IllegalStateException.class, () -> scoringService.completeStage(1L, 3L));
    }

    // ── PHASE 9 / 10: personal bests ─────────────────────────────────

    @Test
    public void testPersonalBestScoreAndTimeOnlyImprove() {
        User user = User.builder().id(1L).username("op").gameStreak(0).totalScore(0).build();
        UserProgress progress = UserProgress.builder()
                .user(user)
                .cipherType("CAESAR")
                .difficultyTier("HARD")
                .levelIndex(0)
                .bestScore(0)
                .bestTimeMs(null)
                .build();

        when(sessionRepository.findById(200L))
                .thenReturn(Optional.of(activeSession(200L, user, "CAESAR", "HARD", 0, 20)));
        when(sessionRepository.findById(201L))
                .thenReturn(Optional.of(activeSession(201L, user, "CAESAR", "HARD", 0, 16)));
        when(sessionRepository.findById(202L))
                .thenReturn(Optional.of(activeSession(202L, user, "CAESAR", "HARD", 0, 21)));

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(progressRepository.findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
                1L, "CAESAR", "HARD", 0)).thenReturn(Optional.of(progress));
        when(progressRepository.save(any(UserProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(completionRepository.save(any(StageCompletion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userProgressService.awardBadgesForUser(anyLong(), any(User.class))).thenReturn(new ArrayList<>());

        // Attempt 1 (streak 0 -> 1): first success sets both personal bests.
        CompleteStageResponse first = scoringService.completeStage(1L, 200L);
        assertEquals(300, first.score());
        assertTrue(first.newBestScore());
        assertTrue(first.newBestTime());
        assertEquals(300, progress.getBestScore());
        assertEquals(first.completionTimeMs(), progress.getBestTimeMs());

        // Attempt 2 (streak 1 -> 2): equal score, faster time -> only the best time improves.
        CompleteStageResponse second = scoringService.completeStage(1L, 201L);
        assertEquals(300, second.score());
        assertFalse(second.newBestScore(), "An equal score never replaces the personal best");
        assertTrue(second.newBestTime(), "A faster time always replaces the personal best");
        assertEquals(300, second.bestScore());
        assertTrue(second.bestTimeMs() < first.completionTimeMs());

        // Attempt 3 (streak 2 -> 3 => 1.10x): higher score, slower time.
        CompleteStageResponse third = scoringService.completeStage(1L, 202L);
        assertEquals(330, third.score());
        assertTrue(third.newBestScore());
        assertFalse(third.newBestTime(), "A slower time never replaces the personal best");
        assertEquals(330, third.bestScore());
        assertEquals(second.bestTimeMs(), third.bestTimeMs());
    }

    // ── PHASE 14: anti-cheat validation ──────────────────────────────

    @Test
    public void testCompletionRejectedWhenSessionBelongsToAnotherPlayer() {
        User other = User.builder().id(2L).username("intruder").build();
        StageSession session = activeSession(5L, other, "CAESAR", "EASY", 0, 15);
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> scoringService.completeStage(1L, 5L));
        assertTrue(ex.getMessage().toLowerCase().contains("does not belong"));

        verifyNoInteractions(completionRepository);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testCompletionRejectedWhenAttemptIsNoLongerActive() {
        User user = User.builder().id(1L).username("op").build();
        StageSession session = activeSession(6L, user, "CAESAR", "EASY", 1, 12);
        session.setStatus("COMPLETED");
        when(sessionRepository.findById(6L)).thenReturn(Optional.of(session));

        assertThrows(IllegalStateException.class, () -> scoringService.completeStage(1L, 6L));

        verifyNoInteractions(completionRepository);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void testImplausibleCompletionTimeExpiresAttemptWithoutScore() {
        User user = User.builder().id(1L).username("op").gameStreak(4).totalScore(900).build();
        StageSession session = StageSession.builder()
                .id(9L)
                .user(user)
                .cipherType("CAESAR")
                .difficultyTier("EASY")
                .levelIndex(3)
                .startedAt(LocalDateTime.now().minusHours(7)) // beyond the plausible ceiling
                .status("ACTIVE")
                .build();
        when(sessionRepository.findById(9L)).thenReturn(Optional.of(session));

        assertThrows(IllegalStateException.class, () -> scoringService.completeStage(1L, 9L));

        assertEquals("EXPIRED", session.getStatus());
        assertNotNull(session.getEndedAt());
        verifyNoInteractions(completionRepository);
        verifyNoInteractions(progressRepository);
        verify(userRepository, never()).save(any(User.class));
        assertEquals(4, user.getGameStreak(), "An invalid attempt must not touch the streak");
        assertEquals(900, user.getTotalScore());
    }

    // ── Section 9: complete progression example ──────────────────────

    @Test
    public void testFullProgressionExampleMatchesSpecification() {
        // Easy, Easy, Medium, Hard, Hard, Easy -> scores 100+100+220+330+360+125 = 1,235
        User user = User.builder().id(1L).username("op").gameStreak(0).totalScore(0).build();

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(progressRepository.save(any(UserProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(completionRepository.save(any(StageCompletion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userProgressService.awardBadgesForUser(anyLong(), any(User.class))).thenReturn(new ArrayList<>());

        // Distinct stage coordinates keep the progress stubs unambiguous.
        String[] difficulties = { "EASY", "EASY", "MEDIUM", "HARD", "HARD", "EASY" };
        int[]    levelIndexes = { 0, 1, 0, 0, 1, 2 };
        int[]    expectedScores      = { 100, 100, 220, 330, 360, 125 };
        double[] expectedMultipliers = { 1.00, 1.00, 1.10, 1.10, 1.20, 1.25 };

        int runningTotal = 0;
        for (int i = 0; i < difficulties.length; i++) {
            String difficulty = difficulties[i];
            int    levelIndex = levelIndexes[i];
            long   sessionId  = 100L + i;

            when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(
                    activeSession(sessionId, user, "CAESAR", difficulty, levelIndex, 10 + i)));
            when(progressRepository.findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
                    1L, "CAESAR", difficulty, levelIndex)).thenReturn(Optional.of(
                    UserProgress.builder()
                            .user(user)
                            .cipherType("CAESAR")
                            .difficultyTier(difficulty)
                            .levelIndex(levelIndex)
                            .bestScore(0)
                            .build()));

            CompleteStageResponse response = scoringService.completeStage(1L, sessionId);
            runningTotal += expectedScores[i];

            assertEquals(i + 1, response.streak(), "Streak after stage " + (i + 1));
            assertEquals(expectedMultipliers[i], response.multiplier(), 1e-9, "Multiplier after stage " + (i + 1));
            assertEquals(expectedScores[i], response.score(), "Stage score for stage " + (i + 1));
            assertEquals(runningTotal, response.totalScore(), "Running total after stage " + (i + 1));
        }

        assertEquals(1235, user.getTotalScore());
        assertEquals(6, user.getGameStreak());
    }

    // ── PHASE 12 / 13: per-stage leaderboards ────────────────────────

    @Test
    public void testHighestScoreLeaderboardRanksDescending() {
        User alice   = User.builder().id(1L).username("Alice").build();
        User bob     = User.builder().id(2L).username("Bob").build();
        User charlie = User.builder().id(3L).username("Charlie").build();

        when(progressRepository.findByCipherTypeAndDifficultyTierAndLevelIndex("CAESAR", "EASY", 0))
                .thenReturn(List.of(
                        progressRow(charlie, 650, 16283L),
                        progressRow(alice, 600, 12452L),
                        progressRow(bob, 525, 15103L)));
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));

        StageLeaderboardResponse response =
                scoringService.getStageLeaderboard("caesar", "easy", 0, "score", 1L);

        assertEquals("score", response.category());
        assertEquals(3, response.entries().size());
        assertEquals(List.of("Charlie", "Alice", "Bob"),
                response.entries().stream().map(StageLeaderboardEntry::username).toList());
        assertEquals(1, response.entries().get(0).rank());
        assertEquals(650, response.entries().get(0).score());
        assertNull(response.entries().get(0).timeMs(), "Score ranking does not expose times");
        assertTrue(response.entries().get(1).isCurrentUser());
    }

    @Test
    public void testFastestTimeLeaderboardRanksAscending() {
        User alice   = User.builder().id(1L).username("Alice").build();
        User bob     = User.builder().id(2L).username("Bob").build();
        User charlie = User.builder().id(3L).username("Charlie").build();

        when(progressRepository.findByCipherTypeAndDifficultyTierAndLevelIndex("CAESAR", "EASY", 0))
                .thenReturn(List.of(
                        progressRow(charlie, 650, 16283L),
                        progressRow(alice, 600, 12452L),
                        progressRow(bob, 525, 15103L)));
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));

        StageLeaderboardResponse response =
                scoringService.getStageLeaderboard("caesar", "easy", 0, "time", 1L);

        assertEquals("time", response.category());
        assertEquals(List.of("Alice", "Bob", "Charlie"),
                response.entries().stream().map(StageLeaderboardEntry::username).toList());
        assertEquals(12452L, response.entries().get(0).timeMs());
        assertEquals(650, response.entries().get(2).score(), "Score stays available as information");
        assertTrue(response.entries().get(0).isCurrentUser());
    }

    @Test
    public void testFastestTimeLeaderboardSkipsPlayersWithoutAValidTime() {
        User alice = User.builder().id(1L).username("Alice").build();
        User bob   = User.builder().id(2L).username("Bob").build();

        when(progressRepository.findByCipherTypeAndDifficultyTierAndLevelIndex("CAESAR", "EASY", 0))
                .thenReturn(List.of(progressRow(alice, 300, null), progressRow(bob, 200, 15000L)));
        when(userRepository.findById(2L)).thenReturn(Optional.of(bob));

        StageLeaderboardResponse response =
                scoringService.getStageLeaderboard("caesar", "easy", 0, "time", 2L);

        assertEquals(1, response.entries().size());
        assertEquals("Bob", response.entries().get(0).username());
    }

    @Test
    public void testLeaderboardDefaultsToScoreAndRejectsInvalidInputs() {
        when(progressRepository.findByCipherTypeAndDifficultyTierAndLevelIndex("CAESAR", "EASY", 0))
                .thenReturn(new ArrayList<>());
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertEquals("score",
                scoringService.getStageLeaderboard("caesar", "easy", 0, "  ", 1L).category());

        assertThrows(IllegalArgumentException.class,
                () -> scoringService.getStageLeaderboard("caesar", "easy", 0, "combined", 1L));
        assertThrows(IllegalArgumentException.class,
                () -> scoringService.getStageLeaderboard("enigma", "easy", 0, "score", 1L));
        assertThrows(IllegalArgumentException.class,
                () -> scoringService.getStageLeaderboard("caesar", "legendary", 0, "score", 1L));
        assertThrows(IllegalArgumentException.class,
                () -> scoringService.getStageLeaderboard("caesar", "easy", 99, "score", 1L));
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /** Builds an ACTIVE server session that started {@code elapsedSeconds} ago. */
    private StageSession activeSession(
            long sessionId, User user, String cipher, String difficulty, int levelIndex, long elapsedSeconds) {
        return StageSession.builder()
                .id(sessionId)
                .user(user)
                .cipherType(cipher)
                .difficultyTier(difficulty)
                .levelIndex(levelIndex)
                .startedAt(LocalDateTime.now().minusSeconds(elapsedSeconds))
                .status("ACTIVE")
                .build();
    }

    private UserProgress progressRow(User user, int bestScore, Long bestTimeMs) {
        return UserProgress.builder()
                .user(user)
                .cipherType("CAESAR")
                .difficultyTier("EASY")
                .levelIndex(0)
                .bestScore(bestScore)
                .bestTimeMs(bestTimeMs)
                .build();
    }

    /** Registers the repository stubs used by a successful completion. */
    private void stubSuccessPath(User user, String cipher, String difficulty, int levelIndex) {
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(progressRepository.findByUserIdAndCipherTypeAndDifficultyTierAndLevelIndex(
                user.getId(), cipher, difficulty, levelIndex)).thenReturn(Optional.empty());
        when(progressRepository.save(any(UserProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(completionRepository.save(any(StageCompletion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userProgressService.awardBadgesForUser(anyLong(), any(User.class))).thenReturn(new ArrayList<>());
    }
}