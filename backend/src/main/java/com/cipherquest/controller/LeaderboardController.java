package com.cipherquest.controller;

import com.cipherquest.dto.GlobalLeaderboardResponse;
import com.cipherquest.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for the Global Operative Leaderboard.
 * GET /api/leaderboard?scope=overall|caesar|vigenere|playfair
 */
@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping
    public ResponseEntity<GlobalLeaderboardResponse> getLeaderboard(
            @RequestParam(value = "scope", defaultValue = "overall") String scope,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(leaderboardService.getLeaderboard(scope, username));
    }
}
