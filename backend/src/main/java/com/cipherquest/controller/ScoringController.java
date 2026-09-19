package com.cipherquest.controller;

import com.cipherquest.dto.CompleteStageResponse;
import com.cipherquest.dto.FailStageResponse;
import com.cipherquest.dto.StageLeaderboardResponse;
import com.cipherquest.dto.StartStageRequest;
import com.cipherquest.dto.StartStageResponse;
import com.cipherquest.model.User;
import com.cipherquest.service.ScoringService;
import com.cipherquest.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * SCORING SYSTEM endpoints (server-authoritative).
 *
 * POST /api/scoring/start                – begin a stage attempt (returns sessionId)
 * POST /api/scoring/complete/{sessionId} – complete successfully (score awarded)
 * POST /api/scoring/fail/{sessionId}     – register failure (streak reset)
 * GET  /api/scoring/leaderboard          – per-stage HIGHEST SCORE / FASTEST TIME
 *
 * The client never submits score, streak, multiplier, or completion time —
 * all values are computed and validated on the server.
 */
@RestController
@RequestMapping("/api/scoring")
@RequiredArgsConstructor
public class ScoringController {

    private final ScoringService scoringService;
    private final UserService    userService;

    /**
     * Start a stage attempt. Creates a server-side session with the
     * authoritative start timestamp used for completion-time tracking.
     */
    @PostMapping("/start")
    public ResponseEntity<StartStageResponse> startStage(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StartStageRequest req) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(scoringService.startStage(user.getId(), req));
    }

    /**
     * Complete a stage successfully.
     * Streak +1 -> multiplier recalculated -> score = round(base x multiplier)
     * -> total score updated -> history saved -> personal bests updated.
     */
    @PostMapping("/complete/{sessionId}")
    public ResponseEntity<CompleteStageResponse> completeStage(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long sessionId) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(scoringService.completeStage(user.getId(), sessionId));
    }

    /**
     * Register a stage failure.
     * Streak -> 0, multiplier -> 1.00, total score preserved, no records updated.
     */
    @PostMapping("/fail/{sessionId}")
    public ResponseEntity<FailStageResponse> failStage(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long sessionId) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(scoringService.failStage(user.getId(), sessionId));
    }

    /**
     * Per-stage leaderboard.
     * category = "score" (HIGHEST SCORE, descending) or "time" (FASTEST TIME, ascending).
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<StageLeaderboardResponse> getStageLeaderboard(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String cipherType,
            @RequestParam String difficultyTier,
            @RequestParam int levelIndex,
            @RequestParam(defaultValue = "score") String category) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(scoringService.getStageLeaderboard(
                cipherType, difficultyTier, levelIndex, category, user.getId()));
    }
}