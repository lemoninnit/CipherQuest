package com.cipherquest.service;

import com.cipherquest.dto.GlobalLeaderboardEntry;
import com.cipherquest.dto.GlobalLeaderboardResponse;
import com.cipherquest.model.User;
import com.cipherquest.repository.UserProgressRepository;
import com.cipherquest.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

public class LeaderboardServiceTest {

    private UserRepository userRepository;
    private UserProgressRepository userProgressRepository;
    private LeaderboardService leaderboardService;

    @BeforeEach
    public void setup() {
        userRepository = Mockito.mock(UserRepository.class);
        userProgressRepository = Mockito.mock(UserProgressRepository.class);
        leaderboardService = new LeaderboardService(userRepository, userProgressRepository);
    }

    @Test
    public void testOverallLeaderboardRankingAndMastery() {
        User user1 = User.builder().id(1L).username("Alice").xp(500).streak(3).build();
        User user2 = User.builder().id(2L).username("Bob").xp(1200).streak(10).build();
        User user3 = User.builder().id(3L).username("Charlie").xp(500).streak(1).build();

        when(userRepository.findAll()).thenReturn(Arrays.asList(user1, user2, user3));

        // Bob: 30 completed stages (30/45 = 66.67% -> 67%)
        // Alice: 15 completed stages (15/45 = 33.33% -> 33%)
        // Charlie: 0 completed stages (0/45 = 0%)
        List<Object[]> progressList = new ArrayList<>();
        progressList.add(new Object[]{2L, 30L});
        progressList.add(new Object[]{1L, 15L});

        when(userProgressRepository.countTotalCompletedPerUser()).thenReturn(progressList);

        GlobalLeaderboardResponse response = leaderboardService.getLeaderboard("overall", "Alice");

        assertNotNull(response);
        assertEquals(3, response.topUsers().size());

        // Bob should be rank 1 (1200 xp)
        GlobalLeaderboardEntry bob = response.topUsers().get(0);
        assertEquals(1, bob.rank());
        assertEquals("Bob", bob.username());
        assertEquals(1200, bob.points());
        assertEquals(67, bob.mastery());
        assertEquals(10, bob.streak());
        assertFalse(bob.isCurrentUser());

        // Alice should be rank 2 (500 xp, 15 stages completed, beats Charlie with 0 stages)
        GlobalLeaderboardEntry alice = response.topUsers().get(1);
        assertEquals(2, alice.rank());
        assertEquals("Alice", alice.username());
        assertEquals(500, alice.points());
        assertEquals(33, alice.mastery());
        assertTrue(alice.isCurrentUser());

        // Charlie rank 3
        GlobalLeaderboardEntry charlie = response.topUsers().get(2);
        assertEquals(3, charlie.rank());
        assertEquals("Charlie", charlie.username());
        assertEquals(500, charlie.points());
        assertEquals(0, charlie.mastery());

        // Current user entry is Alice
        assertNotNull(response.currentUserEntry());
        assertEquals("Alice", response.currentUserEntry().username());
        assertEquals(2, response.currentUserEntry().rank());
    }

    @Test
    public void testPerCipherLeaderboardRankingAndMastery() {
        User user1 = User.builder().id(1L).username("Alice").xp(2000).streak(5).build();
        User user2 = User.builder().id(2L).username("Bob").xp(500).streak(2).build();

        when(userRepository.findAll()).thenReturn(Arrays.asList(user1, user2));

        // Caesar scope: Bob has 12 stages completed in Caesar (12/15 = 80%), Alice has 5 (5/15 = 33%)
        List<Object[]> caesarProgress = new ArrayList<>();
        caesarProgress.add(new Object[]{2L, 12L});
        caesarProgress.add(new Object[]{1L, 5L});

        when(userProgressRepository.countCompletedByCipherPerUser("CAESAR")).thenReturn(caesarProgress);

        GlobalLeaderboardResponse response = leaderboardService.getLeaderboard("caesar", "Bob");

        assertEquals(2, response.topUsers().size());

        // Bob has more Caesar stages, so rank 1 despite lower total XP
        GlobalLeaderboardEntry first = response.topUsers().get(0);
        assertEquals("Bob", first.username());
        assertEquals(1, first.rank());
        assertEquals(80, first.mastery());
        assertTrue(first.isCurrentUser());

        // Alice rank 2
        GlobalLeaderboardEntry second = response.topUsers().get(1);
        assertEquals("Alice", second.username());
        assertEquals(2, second.rank());
        assertEquals(33, second.mastery());
    }

    @Test
    public void testFewerThanThreeUsers() {
        User user1 = User.builder().id(1L).username("SoloOperative").xp(100).streak(1).build();
        when(userRepository.findAll()).thenReturn(Collections.singletonList(user1));
        when(userProgressRepository.countTotalCompletedPerUser()).thenReturn(Collections.emptyList());

        GlobalLeaderboardResponse response = leaderboardService.getLeaderboard("overall", "SoloOperative");

        assertEquals(1, response.topUsers().size());
        assertEquals("SoloOperative", response.topUsers().get(0).username());
        assertEquals(1, response.topUsers().get(0).rank());
        assertEquals(0, response.topUsers().get(0).mastery());
        assertNotNull(response.currentUserEntry());
    }

    @Test
    public void testZeroXpUsers() {
        User user1 = User.builder().id(1L).username("ZeroXP").xp(0).streak(0).build();
        when(userRepository.findAll()).thenReturn(Collections.singletonList(user1));
        when(userProgressRepository.countTotalCompletedPerUser()).thenReturn(Collections.emptyList());

        GlobalLeaderboardResponse response = leaderboardService.getLeaderboard("overall", "ZeroXP");

        assertEquals(1, response.topUsers().size());
        assertEquals(0, response.topUsers().get(0).points());
        assertEquals(0, response.topUsers().get(0).mastery());
    }

    @Test
    public void testCurrentUserOutsideTop10() {
        List<User> users = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            users.add(User.builder().id((long) i).username("Player" + i).xp(1000 - i * 10).streak(1).build());
        }
        when(userRepository.findAll()).thenReturn(users);
        when(userProgressRepository.countTotalCompletedPerUser()).thenReturn(Collections.emptyList());

        GlobalLeaderboardResponse response = leaderboardService.getLeaderboard("overall", "Player14");

        assertEquals(10, response.topUsers().size());
        assertNotNull(response.currentUserEntry());
        assertEquals("Player14", response.currentUserEntry().username());
        assertEquals(14, response.currentUserEntry().rank());
        // Verify Player14 is NOT in top 10
        assertTrue(response.topUsers().stream().noneMatch(u -> u.username().equals("Player14")));
    }
}
