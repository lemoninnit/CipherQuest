package com.cipherquest.service;

import org.springframework.stereotype.Service;

/**
 * Vigenère Cipher Service.
 *
 * Shifts alphabetic characters (A-Z, a-z) using a repeating keyword.
 * Non-alphabetic characters pass through unchanged and do NOT advance the key index.
 */
@Service
public class VigenereCipherService {

    /**
     * Encrypt plaintext with the given keyword.
     */
    public String encrypt(String plaintext, String key) {
        if (key == null || key.isEmpty()) {
            return plaintext;
        }
        return transform(plaintext, key, true);
    }

    /**
     * Decrypt ciphertext with the given keyword.
     */
    public String decrypt(String ciphertext, String key) {
        if (key == null || key.isEmpty()) {
            return ciphertext;
        }
        return transform(ciphertext, key, false);
    }

    // ── Private Helper ────────────────────────────────────────────────

    private String transform(String text, String key, boolean encrypt) {
        StringBuilder sb = new StringBuilder();
        String upperKey = key.toUpperCase();
        int keyIndex = 0;
        int keyLen = upperKey.length();

        for (char c : text.toCharArray()) {
            if (Character.isLetter(c)) {
                // Determine shift amount from the key character (0-25)
                char keyChar = upperKey.charAt(keyIndex % keyLen);
                // In case keyChar isn't a letter, treat it as 'A' (shift 0)
                int shift = Character.isLetter(keyChar) ? (keyChar - 'A') : 0;

                if (!encrypt) {
                    shift = 26 - shift;
                }

                char base = Character.isUpperCase(c) ? 'A' : 'a';
                sb.append((char) (base + (c - base + shift) % 26));

                // Advance key index only when a letter is shifted
                keyIndex++;
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
