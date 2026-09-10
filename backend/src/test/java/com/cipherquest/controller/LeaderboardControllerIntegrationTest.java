package com.cipherquest.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class LeaderboardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testLeaderboardUnauthenticatedReturns401or403() throws Exception {
        mockMvc.perform(get("/api/leaderboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "lenonlee123")
    public void testLeaderboardAuthenticatedOverall() throws Exception {
        mockMvc.perform(get("/api/leaderboard?scope=overall"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topUsers").isArray());
    }

    @Test
    @WithMockUser(username = "lenonlee123")
    public void testLeaderboardAuthenticatedCaesar() throws Exception {
        mockMvc.perform(get("/api/leaderboard?scope=caesar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topUsers").isArray());
    }

    @Test
    @WithMockUser(username = "lenonlee123")
    public void testLeaderboardAuthenticatedVigenere() throws Exception {
        mockMvc.perform(get("/api/leaderboard?scope=vigenere"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topUsers").isArray());
    }

    @Test
    @WithMockUser(username = "lenonlee123")
    public void testLeaderboardAuthenticatedPlayfair() throws Exception {
        mockMvc.perform(get("/api/leaderboard?scope=playfair"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topUsers").isArray());
    }

    @Test
    public void testFishingLeaderboardStillWorks() throws Exception {
        mockMvc.perform(get("/api/fishing/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
