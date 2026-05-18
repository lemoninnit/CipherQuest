package com.cipherquest.service;

import com.cipherquest.dto.*;
import com.cipherquest.model.*;
import com.cipherquest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.IntStream;

/**
 * Fishing Mini-Game Service.
 *
 * Each game session works like this:
 *   1. startSession()  → assigns a random Caesar shift, returns session info
 *   2. cast()          → draws a random word, encrypts it, returns cipher text + hint
 *   3. submitAnswer()  → checks the player's decode attempt, awards XP
 *   4. endSession()    → finalises the session and returns a summary
 */
@Service
@RequiredArgsConstructor
public class FishingGameService {

    private final FishingSessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final CaesarCipherService cipherService;

    @Value("${game.fishing.max-attempts}")
    private int maxAttempts;

    @Value("${game.fishing.base-xp}")
    private int baseXp;

    // ── Word pool with categories ──────────────────────────────────────

    private static final Map<String, String> WORD_POOL = new LinkedHashMap<>() {{
        // Animal theme (fishing flavour)
        put("TROUT",   "🐟 It's a freshwater fish");
        put("SALMON",  "🐟 It swims upstream to spawn");
        put("CARP",    "🐟 A common pond fish");
        put("BASS",    "🎵 Also a musical term");
        put("PERCH",   "🐦 Where birds also sit");
        put("PIKE",    "🏹 A sharp weapon – or a fish");
        put("TUNA",    "🐟 Found in sushi rolls");
        put("SHARK",   "🦈 A fearsome ocean predator");
        put("WHALE",   "🐋 The largest sea creature");
        put("SQUID",   "🦑 Has eight arms and two tentacles");
        // General words
        put("CIPHER",  "🔐 A method of secret writing");
        put("CODE",    "💻 Instructions or a secret message");
        put("KEY",     "🔑 Used to unlock or decode");
        put("SHIFT",   "↔️ Move letters by this many positions");
        put("DECODE",  "🔓 Reveal the hidden message");
        put("ENCODE",  "🔒 Hide the message");
        put("ALPHA",   "🔤 The first letter of the Greek alphabet");
        put("BRAVO",   "👏 NATO phonetic B");
        put("ECHO",    "📢 A repeated sound");
        put("FOXTROT", "🦊 NATO phonetic F");
    }};

    private static final List<String> WORDS = new ArrayList<>(WORD_POOL.keySet());
    private static final Random RNG = new Random();

    // ── Public API ────────────────────────────────────────────────────

    @Transactional
    public StartSessionResponse startSession(String username) {
        User user = findUser(username);

        // If a previous active session exists, end it first
        sessionRepo.findByUserAndActiveTrue(user)
            .ifPresent(s -> { s.endSession(); sessionRepo.save(s); });

        int shift = 1 + RNG.nextInt(25); // random 1-25

        FishingSession session = FishingSession.builder()
            .user(user)
            .shiftKey(shift)
            .build();

        session = sessionRepo.save(session);

        return new StartSessionResponse(
            session.getId(),
            shift,
            maxAttempts,
            "🎣 Session started! Your Caesar shift is " + shift
                + ". Cast your line to receive an encrypted word!"
        );
    }

    @Transactional
    public CastResponse cast(Long sessionId, String username) {
        FishingSession session = getActiveSession(sessionId, username);

        if (session.getAttemptsUsed() >= maxAttempts) {
            throw new IllegalStateException("No attempts remaining. End the session.");
        }

        // Pick a random word
        String word  = WORDS.get(RNG.nextInt(WORDS.size()));
        String hint  = WORD_POOL.get(word);
        String cipher = cipherService.encrypt(word, session.getShiftKey());

        // Store in cast log: "attempt|PLAINTEXT|CIPHERTEXT"
        int attemptNum = session.getAttemptsUsed() + 1;
        session.getCastLog().add(attemptNum + "|" + word + "|" + cipher + "|PENDING");
        session.setAttemptsUsed(attemptNum);
        sessionRepo.save(session);

        return new CastResponse(
            sessionId,
            attemptNum,
            maxAttempts,
            cipher,
            session.getShiftKey(),
            hint,
            true
        );
    }

    @Transactional
    public SubmitAnswerResponse submitAnswer(Long sessionId, String username,
                                             SubmitAnswerRequest req) {
        FishingSession session = getActiveSession(sessionId, username);

        // Find the latest PENDING cast
        List<String> log = session.getCastLog();
        if (log.isEmpty()) {
            throw new IllegalStateException("Cast first before submitting an answer.");
        }

        String lastEntry = log.get(log.size() - 1);
        String[] parts = lastEntry.split("\\|");
        // parts: [attemptNum, plaintext, ciphertext, status]
        if (!"PENDING".equals(parts[3])) {
            throw new IllegalStateException("Already answered the last cast. Cast again.");
        }

        String correct   = parts[1];
        String encrypted = parts[2];
        boolean isCorrect = correct.equalsIgnoreCase(req.answer().trim());

        // Update cast log entry
        log.set(log.size() - 1,
            parts[0] + "|" + correct + "|" + encrypted + "|" + (isCorrect ? "CORRECT" : "WRONG"));

        int xpGained = 0;
        String feedback;

        if (isCorrect) {
            session.setScore(session.getScore() + 1);
            xpGained = baseXp + (session.getScore() * 10); // bonus per consecutive catch
            session.setXpEarned(session.getXpEarned() + xpGained);

            // Award XP to user
            User user = findUser(username);
            user.addXp(xpGained);
            userRepo.save(user);

            feedback = "🎣 Great catch! +" + xpGained + " XP";
        } else {
            feedback = "🐟 The fish got away... The word was: " + correct;
        }

        int attemptsLeft = maxAttempts - session.getAttemptsUsed();
        boolean ended = attemptsLeft <= 0;

        if (ended) {
            finaliseSession(session, username);
        } else {
            sessionRepo.save(session);
        }

        return new SubmitAnswerResponse(
            isCorrect,
            correct,
            encrypted,
            session.getShiftKey(),
            xpGained,
            session.getScore(),
            attemptsLeft,
            ended,
            feedback
        );
    }

    @Transactional
    public SessionSummaryResponse endSession(Long sessionId, String username) {
        FishingSession session = getActiveSession(sessionId, username);
        finaliseSession(session, username);
        return buildSummary(session, username);
    }

    public SessionSummaryResponse getSessionSummary(Long sessionId, String username) {
        User user = findUser(username);
        FishingSession session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new NoSuchElementException("Session not found: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorised");
        }

        return buildSummary(session, username);
    }

    public List<LeaderboardEntry> getLeaderboard() {
        List<FishingSession> top = sessionRepo.findTop10ByOrderByScoreDesc();
        return IntStream.range(0, top.size())
            .mapToObj(i -> {
                FishingSession s = top.get(i);
                return new LeaderboardEntry(
                    i + 1,
                    s.getUser().getUsername(),
                    s.getScore(),
                    s.getXpEarned(),
                    s.getStartedAt()
                );
            })
            .toList();
    }

    // ── Private Helpers ───────────────────────────────────────────────

    private FishingSession getActiveSession(Long sessionId, String username) {
        User user = findUser(username);
        FishingSession session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new NoSuchElementException("Session not found: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorised");
        }
        if (!session.isActive()) {
            throw new IllegalStateException("Session already ended.");
        }
        return session;
    }

    private void finaliseSession(FishingSession session, String username) {
        session.endSession();
        sessionRepo.save(session);

        // Update user stats
        User user = findUser(username);
        user.setFishingGamesPlayed(user.getFishingGamesPlayed() + 1);
        if (session.getScore() > user.getFishingBestScore()) {
            user.setFishingBestScore(session.getScore());
        }
        userRepo.save(user);
    }

    private SessionSummaryResponse buildSummary(FishingSession s, String username) {
        User user = findUser(username);
        boolean newBest = s.getScore() >= user.getFishingBestScore();
        return new SessionSummaryResponse(
            s.getId(),
            s.getScore(),
            s.getXpEarned(),
            s.getAttemptsUsed(),
            maxAttempts,
            newBest,
            s.getStartedAt(),
            s.getEndedAt(),
            s.getCastLog()
        );
    }

    private User findUser(String username) {
        return userRepo.findByUsername(username)
            .orElseThrow(() -> new NoSuchElementException("User not found: " + username));
    }
}
