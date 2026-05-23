package com.cipherquest.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CipherServicesTest {

    private final VigenereCipherService vigenereService = new VigenereCipherService();
    private final PlayfairCipherService playfairService = new PlayfairCipherService();

    @Test
    public void testVigenereEncryptionDecryption() {
        String plaintext = "HELLO WORLD";
        String key = "KEY";
        String expectedCipher = "RIJVS UYVJN";

        // Encrypt
        String encrypted = vigenereService.encrypt(plaintext, key);
        assertEquals(expectedCipher, encrypted, "Vigenere Encryption failed");

        // Decrypt
        String decrypted = vigenereService.decrypt(encrypted, key);
        assertEquals(plaintext, decrypted, "Vigenere Decryption failed");
    }

    @Test
    public void testVigenereCasePreservationAndNonLetters() {
        String plaintext = "Hello, World! 123";
        String key = "key";
        
        String encrypted = vigenereService.encrypt(plaintext, key);
        // H(7) + K(10) = R(17)
        // e(4) + E(4) = i(8)
        // l(11) + Y(24) = j(9)
        // l(11) + K(10) = v(21)
        // o(14) + E(4) = s(18)
        // (spaces/symbols pass through)
        // W(22) + Y(24) = U(20)
        // o(14) + K(10) = y(24)
        // r(17) + E(4) = v(21)
        // l(11) + Y(24) = j(9)
        // d(3) + K(10) = n(13)
        assertTrue(encrypted.startsWith("Rijvs, Uyvjn!"), "Encrypted text should match case and symbols: " + encrypted);

        String decrypted = vigenereService.decrypt(encrypted, key);
        assertEquals(plaintext, decrypted, "Vigenere roundtrip failed to preserve case/symbols");
    }

    @Test
    public void testPlayfairMatrixGeneration() {
        String key = "PLAYFAIR";
        char[][] matrix = playfairService.generateMatrix(key);

        // Expected grid:
        // P L A Y F
        // I R B C D
        // E G H K M
        // N O Q S T
        // U V W X Z
        
        assertEquals('P', matrix[0][0]);
        assertEquals('L', matrix[0][1]);
        assertEquals('A', matrix[0][2]);
        assertEquals('Y', matrix[0][3]);
        assertEquals('F', matrix[0][4]);

        assertEquals('I', matrix[1][0]);
        assertEquals('R', matrix[1][1]);
        assertEquals('B', matrix[1][2]);
        assertEquals('C', matrix[1][3]);
        assertEquals('D', matrix[1][4]);

        assertEquals('E', matrix[2][0]);
        assertEquals('G', matrix[2][1]);
        assertEquals('H', matrix[2][2]);
        assertEquals('K', matrix[2][3]);
        assertEquals('M', matrix[2][4]);

        assertEquals('N', matrix[3][0]);
        assertEquals('O', matrix[3][1]);
        assertEquals('Q', matrix[3][2]);
        assertEquals('S', matrix[3][3]);
        assertEquals('T', matrix[3][4]);

        assertEquals('U', matrix[4][0]);
        assertEquals('V', matrix[4][1]);
        assertEquals('W', matrix[4][2]);
        assertEquals('X', matrix[4][3]);
        assertEquals('Z', matrix[4][4]);
    }

    @Test
    public void testPlayfairEncryptionDecryption() {
        String plaintext = "HELLO";
        String key = "PLAYFAIR";
        
        // "HELLO" split into HE LX LO
        // HE: Same row (2,2) and (2,0) -> shift right -> KG
        // LX: Rectangle (0,1) and (4,3) -> swap cols -> YV
        // LO: Same col (0,1) and (3,1) -> shift rows down -> RV
        // Expected cipher: "KGYVRV"
        
        String encrypted = playfairService.encrypt(plaintext, key);
        assertEquals("KGYVRV", encrypted, "Playfair Encryption failed");

        String decrypted = playfairService.decrypt(encrypted, key);
        assertEquals("HELXLO", decrypted, "Playfair Decryption failed");
    }

    @Test
    public void testPlayfairSentenceHandling() {
        String plaintext = "DEEP REEF";
        String key = "PLAYFAIR";

        // DEEP -> DE EP
        // DE: Rectangle (1,4) and (2,0) -> swap cols -> MI
        // EP: Rectangle (2,0) and (0,0) -> same col (wait! E is at (2,0), P is at (0,0) -> same col! Shift down -> UI)
        // REEF -> RE EF
        // RE: Rectangle (1,1) and (2,0) -> swap cols -> IG
        // EF: Rectangle (2,0) and (0,4) -> swap cols -> MD
        
        String encrypted = playfairService.encrypt(plaintext, key);
        // Let's verify that spaces are preserved
        String[] parts = encrypted.split(" ");
        assertEquals(2, parts.length, "Playfair should preserve sentence word count");

        String decrypted = playfairService.decrypt(encrypted, key);
        assertEquals("DEEP REEF", decrypted.replace("X", ""), "Playfair roundtrip failed (without padding)");
    }
}
