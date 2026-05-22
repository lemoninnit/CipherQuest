package com.cipherquest.controller;

import com.cipherquest.dto.*;
import com.cipherquest.model.User;
import com.cipherquest.service.UserProgressService;
import com.cipherquest.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * DAY 2: Extended with progress, attempts, and badge endpoints.
 *
 * GET  /api/users/me                  – Full profile (attempts, cooldown, badges, progress)
 * DELETE /api/users/me               – Delete account
 * GET  /api/users/progress           – Full progress map
 * POST /api/users/progress           – Save a completed level
 * POST /api/users/attempts/deduct    – Deduct one attempt (wrong final answer)
 * GET  /api/users/badges             – List earned badges
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService         userService;
    private final UserProgressService progressService;

    // ── Profile ──────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount(
            @AuthenticationPrincipal UserDetails userDetails) {
        userService.deleteUser(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ── Progress ──────────────────────────────────────────────────────

    /**
     * Returns the full progress map for localStorage sync.
     * { "CAESAR": { "EASY": [0,1,2], "MEDIUM": [], "HARD": [] }, ... }
     */
    @GetMapping("/progress")
    public ResponseEntity<Map<String, Map<String, List<Integer>>>> getProgress(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(progressService.getProgressMap(user.getId()));
    }

    /**
     * Mark a level as completed. Awards XP and badges as appropriate.
     * Body: { "cipherType": "CAESAR", "difficultyTier": "EASY", "levelIndex": 0 }
     */
    @PostMapping("/progress")
    public ResponseEntity<ProgressResponse> saveProgress(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SaveProgressRequest req) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(progressService.saveProgress(user.getId(), req));
    }

    // ── Attempt system ────────────────────────────────────────────────

    /**
     * Deduct one site-wide attempt.
     * Call ONLY when the player submits a WRONG final answer on a level.
     * Do NOT call for in-game Pac-Man life losses or Sprint shoe token losses.
     */
    @PostMapping("/attempts/deduct")
    public ResponseEntity<UserProfileDto> deductAttempt(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(progressService.deductAttempt(user.getId()));
    }

    // ── Badges ────────────────────────────────────────────────────────

    /**
     * Returns list of earned badge type strings for the current user.
     */
    @GetMapping("/badges")
    public ResponseEntity<List<String>> getBadges(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername());
        UserProfileDto profile = progressService.getFullProfile(user.getId());
        return ResponseEntity.ok(profile.earnedBadges());
    }
}