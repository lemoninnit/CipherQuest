package com.cipherquest.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight health-check endpoint used by:
 *  - Render's built-in health-check probe (prevents false "unhealthy" shutdowns)
 *  - The frontend keep-alive ping (prevents the free-tier instance from sleeping)
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "CipherQuest Backend"
        ));
    }
}
