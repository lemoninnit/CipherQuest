package com.cipherquest.service;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

/**
 * Playfair Cipher Service.
 *
 * Encrypts/decrypts digraphs using a 5x5 matrix.
 * Treats 'J' as 'I'. Preserves word/sentence structure by handling words separated by spaces.
 */
@Service
public class PlayfairCipherService {

    /**
     * Encrypt plaintext with the given key keyword.
     */
    public String encrypt(String plaintext, String key) {
        if (plaintext == null || plaintext.isEmpty() || key == null || key.isEmpty()) {
            return plaintext;
        }

        char[][] matrix = generateMatrix(key);
        String[] words = plaintext.split("\\s+");
        List<String> encryptedWords = new ArrayList<>();

        for (String word : words) {
            encryptedWords.add(encryptWord(word, matrix));
        }

        return String.join(" ", encryptedWords);
    }

    /**
     * Decrypt ciphertext with the given key keyword.
     */
    public String decrypt(String ciphertext, String key) {
        if (ciphertext == null || ciphertext.isEmpty() || key == null || key.isEmpty()) {
            return ciphertext;
        }

        char[][] matrix = generateMatrix(key);
        String[] words = ciphertext.split("\\s+");
        List<String> decryptedWords = new ArrayList<>();

        for (String word : words) {
            decryptedWords.add(decryptWord(word, matrix));
        }

        return String.join(" ", decryptedWords);
    }

    /**
     * Generate the 5x5 Playfair grid matrix.
     */
    public char[][] generateMatrix(String key) {
        char[][] matrix = new char[5][5];
        String cleanedKey = key.toUpperCase().replace("J", "I").replaceAll("[^A-Z]", "");
        
        List<Character> seen = new ArrayList<>();
        
        // Add key letters
        for (char c : cleanedKey.toCharArray()) {
            if (!seen.contains(c)) {
                seen.add(c);
            }
        }
        
        // Add alphabet letters
        for (char c = 'A'; c <= 'Z'; c++) {
            if (c == 'J') continue;
            if (!seen.contains(c)) {
                seen.add(c);
            }
        }

        // Fill matrix
        int idx = 0;
        for (int r = 0; r < 5; r++) {
            for (int c = 0; c < 5; c++) {
                matrix[r][c] = seen.get(idx++);
            }
        }
        
        return matrix;
    }

    // ── Private Helpers ───────────────────────────────────────────────

    private String encryptWord(String word, char[][] matrix) {
        String cleaned = word.toUpperCase().replace("J", "I").replaceAll("[^A-Z]", "");
        if (cleaned.isEmpty()) return "";

        List<String> pairs = buildDigraphs(cleaned);
        StringBuilder sb = new StringBuilder();

        for (String pair : pairs) {
            char a = pair.charAt(0);
            char b = pair.charAt(1);

            int[] posA = findPosition(a, matrix);
            int[] posB = findPosition(b, matrix);

            int r1 = posA[0], c1 = posA[1];
            int r2 = posB[0], c2 = posB[1];

            if (r1 == r2) {
                // Same row: shift columns right
                sb.append(matrix[r1][(c1 + 1) % 5]);
                sb.append(matrix[r2][(c2 + 1) % 5]);
            } else if (c1 == c2) {
                // Same column: shift rows down
                sb.append(matrix[(r1 + 1) % 5][c1]);
                sb.append(matrix[(r2 + 1) % 5][c2]);
            } else {
                // Rectangle swap
                sb.append(matrix[r1][c2]);
                sb.append(matrix[r2][c1]);
            }
        }
        return sb.toString();
    }

    private String decryptWord(String word, char[][] matrix) {
        String cleaned = word.toUpperCase().replace("J", "I").replaceAll("[^A-Z]", "");
        if (cleaned.isEmpty()) return "";

        // Ciphertext should already be in clean pairs
        List<String> pairs = new ArrayList<>();
        for (int i = 0; i < cleaned.length(); i += 2) {
            if (i + 1 < cleaned.length()) {
                pairs.add(cleaned.substring(i, i + 2));
            } else {
                pairs.add(cleaned.substring(i, i + 1) + "X");
            }
        }

        StringBuilder sb = new StringBuilder();

        for (String pair : pairs) {
            char a = pair.charAt(0);
            char b = pair.charAt(1);

            int[] posA = findPosition(a, matrix);
            int[] posB = findPosition(b, matrix);

            int r1 = posA[0], c1 = posA[1];
            int r2 = posB[0], c2 = posB[1];

            if (r1 == r2) {
                // Same row: shift columns left
                sb.append(matrix[r1][(c1 - 1 + 5) % 5]);
                sb.append(matrix[r2][(c2 - 1 + 5) % 5]);
            } else if (c1 == c2) {
                // Same column: shift rows up
                sb.append(matrix[(r1 - 1 + 5) % 5][c1]);
                sb.append(matrix[(r2 - 1 + 5) % 5][c2]);
            } else {
                // Rectangle swap (columns exchange - identical math)
                sb.append(matrix[r1][c2]);
                sb.append(matrix[r2][c1]);
            }
        }
        return sb.toString();
    }

    private List<String> buildDigraphs(String word) {
        List<String> pairs = new ArrayList<>();
        int i = 0;
        while (i < word.length()) {
            char c1 = word.charAt(i);
            char c2;
            if (i + 1 < word.length()) {
                c2 = word.charAt(i + 1);
                if (c1 == c2) {
                    pairs.add("" + c1 + 'X');
                    i++; // step by 1 due to inserted filler
                } else {
                    pairs.add("" + c1 + c2);
                    i += 2; // step by 2
                }
            } else {
                pairs.add("" + c1 + 'X');
                i++;
            }
        }
        return pairs;
    }

    private int[] findPosition(char c, char[][] matrix) {
        for (int r = 0; r < 5; r++) {
            for (int col = 0; col < 5; col++) {
                if (matrix[r][col] == c) {
                    return new int[]{r, col};
                }
            }
        }
        return new int[]{0, 0}; // fallback (should not occur)
    }
}
