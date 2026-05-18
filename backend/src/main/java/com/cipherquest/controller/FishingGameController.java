package com.cipherquest.controller;

import com.cipherquest.dto.*;
import com.cipherquest.service.FishingGameService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Fishing Mini-Game Endpoints
 * ─────────────────────────────────────────────────────────
 *  POST   /api/fishing/start              Start a new session
 *  POST   /api/fishing/{id}/cast          Draw an encrypted word
 *  POST   /api/fishing/{id}/submit        Submit a decryption answer
 *  POST   /api/fishing/{id}/end           Manually end the session
 *  GET    /api/fishing/{id}/summary       Get session results
 *  GET    /api/fishing/leaderboard        Top 10 scores (public)
 */
@RestController
@RequestMapping("/api/fishing")
@RequiredArgsConstructor
public class FishingGameController {

    private final FishingGameService fishingGameService;

    @PostMapping("/start")
    public ResponseEntity<StartSessionResponse> startSession(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(fishingGameService.startSession(userDetails.getUsername()));
    }

    @PostMapping("/{sessionId}/cast")
    public ResponseEntity<CastResponse> cast(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(fishingGameService.cast(sessionId, userDetails.getUsername()));
    }

    @PostMapping("/{sessionId}/submit")
    public ResponseEntity<SubmitAnswerResponse> submitAnswer(
            @PathVariable Long sessionId,
            @Valid @RequestBody SubmitAnswerRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
            fishingGameService.submitAnswer(sessionId, userDetails.getUsername(), req));
    }

    @PostMapping("/{sessionId}/end")
    public ResponseEntity<SessionSummaryResponse> endSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
            fishingGameService.endSession(sessionId, userDetails.getUsername()));
    }

    @GetMapping("/{sessionId}/summary")
    public ResponseEntity<SessionSummaryResponse> getSummary(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
            fishingGameService.getSessionSummary(sessionId, userDetails.getUsername()));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard() {
        return ResponseEntity.ok(fishingGameService.getLeaderboard());
    }
}
