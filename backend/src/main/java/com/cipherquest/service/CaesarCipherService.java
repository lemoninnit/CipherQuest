package com.cipherquest.service;

import org.springframework.stereotype.Service;

/**
 * Caesar Cipher utility.
 *
 * Only shifts alphabetic characters (A-Z, a-z).
 * Non-alphabetic chars (digits, spaces, punctuation) pass through unchanged.
 *
 * Example (shift = 3):
 *   encrypt("HELLO") → "KHOOR"
 *   decrypt("KHOOR") → "HELLO"
 */
@Service
public class CaesarCipherService {

    /**
     * Encrypt plaintext with the given shift (1-25).
     */
    public String encrypt(String plaintext, int shift) {
        shift = normalizeShift(shift);
        return transform(plaintext, shift);
    }

    /**
     * Decrypt ciphertext with the given shift (1-25).
     */
    public String decrypt(String ciphertext, int shift) {
        shift = normalizeShift(shift);
        return transform(ciphertext, 26 - shift); // inverse shift
    }

    /**
     * Brute-force all 25 shifts and return each possibility.
     * Useful for hints / educational display.
     */
    public String[] bruteForce(String ciphertext) {
        String[] results = new String[25];
        for (int shift = 1; shift <= 25; shift++) {
            results[shift - 1] = "Shift " + shift + ": " + decrypt(ciphertext, shift);
        }
        return results;
    }

    // ── Private Helpers ───────────────────────────────────────────────

    private String transform(String text, int shift) {
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (Character.isLetter(c)) {
                char base = Character.isUpperCase(c) ? 'A' : 'a';
                sb.append((char) (base + (c - base + shift) % 26));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private int normalizeShift(int shift) {
        return ((shift % 26) + 26) % 26;
    }
}
