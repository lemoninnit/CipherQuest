# CipherQuest

**A gamified, web-based e-learning platform** for teaching data encryption and decryption using Caesar, Vigenère, and Playfair ciphers — delivered through interactive mini-games and a server-authoritative progression system.

> **Capstone 2 | IT411 – G18 | Cebu Institute of Technology – University, College of Computer Studies**  
> Prepared by: Poliquit, Keint Warren J. | Natividad, Lenon Lee O. | Monreal, Justin Alain B. | Juen, Caliph Gee A.

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| **Frontend (Cloudflare Workers)** | https://cipher-quest.kwpoliquit.workers.dev |
| **Backend API (Render)** | https://cipherquest-oddy.onrender.com |
| **GitHub Repository** | https://github.com/lemoninnit/CipherQuest |

> **Note:** The backend runs on Render's free tier. The first request after inactivity may take 30–60 seconds to cold-start. Subsequent requests respond normally.

---

## 🔑 Demo Access

Register a new account directly on the live site — no email verification is required. You will be redirected to the dashboard immediately after registration.

1. Navigate to https://cipher-quest.kwpoliquit.workers.dev
2. Click **"Create Account"** and enter a username, email, and password (minimum 6 characters)
3. You are immediately logged in and can start playing

---

## 🏗️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework (SPA) |
| Vite | 8.x | Build tool and dev server |
| React Router DOM | 7.x | Client-side routing |
| Vanilla CSS | — | Styling (responsive, component-scoped) |
| Cloudflare Workers | — | Static asset hosting and SPA delivery |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Spring Boot | 3.2.5 | REST API framework |
| Java | 17 | Runtime |
| Spring Security | — | JWT-based authentication |
| JJWT | 0.12.5 | JSON Web Token generation and validation |
| Spring Data JPA | — | ORM and repository layer |
| PostgreSQL (Supabase) | — | Primary relational database |
| Lombok | — | Boilerplate reduction |
| Docker | — | Containerized deployment on Render |

---

## 📁 Project Structure

```
CipherQuest/
├── Frontend/                        # React 19 + Vite SPA
│   ├── src/
│   │   ├── api/
│   │   │   └── cipherQuestApi.js    # All API calls (auth, scoring, fishing, leaderboard)
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT auth state and user profile context
│   │   ├── features/
│   │   │   ├── ciphergame/          # Core game: CipherGame, mini-games, scoring
│   │   │   │   ├── core/            # Game engine hooks and state machine
│   │   │   │   ├── features/
│   │   │   │   │   ├── caesar/      # Caesar Fishing, Pac-Man, Tutorial modal
│   │   │   │   │   ├── vigenere/    # Vigenère Fishing, Sprint, Tutorial modal
│   │   │   │   │   ├── playfair/    # Playfair Fishing, Sprint, Tutorial modal
│   │   │   │   │   ├── pacman/      # Pac-Man mini-game engine
│   │   │   │   │   ├── sprint/      # Sprint mini-game engine (Caesar)
│   │   │   │   │   └── stages/      # Stage roadmap component
│   │   │   │   └── ui/              # DifficultySelector, Modals, Leaderboard UI
│   │   │   ├── badges/              # Badges page
│   │   │   ├── leaderboard/         # Global leaderboard page
│   │   │   ├── layout/              # DashboardLayout (sidebar, chrome)
│   │   │   └── pages/home/          # DashboardHome (lobby, tutorial tab)
│   │   └── pages/                   # LoginPage, RegisterPage, ResetPasswordPage, LoadingScreen
│   ├── index.html
│   └── vite.config.js
├── backend/                         # Spring Boot 3.2.5 REST API
│   ├── src/main/java/com/cipherquest/
│   │   ├── controller/              # AuthController, UserController, ScoringController,
│   │   │                            # FishingGameController, LeaderboardController, HealthController
│   │   ├── service/                 # UserService, ScoringService, UserProgressService,
│   │   │                            # FishingGameService, LeaderboardService,
│   │   │                            # CaesarCipherService, VigenereCipherService, PlayfairCipherService
│   │   ├── model/                   # User, UserProgress, UserBadge,
│   │   │                            # StageSession, StageCompletion, FishingSession
│   │   ├── repository/              # Spring Data JPA repositories
│   │   ├── dto/                     # Request/Response DTOs
│   │   ├── config/                  # Spring Security, CORS, JWT config
│   │   └── exception/               # Global exception handler
│   ├── Dockerfile
│   └── pom.xml
├── render.yaml                      # Render deployment config (backend)
├── wrangler.jsonc                   # Cloudflare Workers config (frontend)
└── README.md
```

---

## 🎮 Features

### Cipher Categories & Mini-Games

| Category | Easy | Medium | Hard | Mini-Games |
|---|---|---|---|---|
| **Caesar Cipher** | 5 stages | 5 stages | 5 stages | Fishing 🎣 · Pac-Man 👾 · Sprint 🏃 |
| **Vigenère Cipher** | 5 stages | 5 stages | 5 stages | Fishing 🎣 · Sprint 🏃 |
| **Playfair Cipher** | 5 stages | 5 stages | 5 stages | Fishing 🎣 · Sprint 🏃 |

**Total: 45 playable cipher stages** — 3 categories × 3 difficulty tiers × 5 levels each.

### Progression System
- **Stage Unlock:** Stages unlock sequentially (Stage N+1 requires completing Stage N)
- **Difficulty Unlock:** Medium and Hard tiers are gated by completing all stages of the preceding tier
- **XP & Level:** Earn XP per stage completion; level up every 1,000 XP
- **Daily Login Streak:** Consecutive daily logins increment a login streak (resets after >36h gap)

### Server-Authoritative Scoring

All scoring is computed exclusively on the server — clients **never** submit scores, streaks, or completion times.

| Difficulty | Base Score |
|---|---|
| Easy | 100 pts |
| Medium | 200 pts |
| Hard | 300 pts |

**Final Score = round(Base Score × Streak Multiplier)**

| Streak Range | Multiplier |
|---|---|
| 0 – 2 | 1.00× |
| 3 – 4 | 1.10× |
| 5 | 1.20× |
| 6 – 9 | 1.25× |
| 10 – 14 | 1.50× |
| 15 – 19 | 1.75× |
| 20+ | 2.00× |

### Session Hearts (Anti-Cheat Lockout)
- Each operative starts with **3 session hearts**
- **Losing a stage** costs 1 heart — enforced server-side; cannot be bypassed by a modified client
- When all hearts are depleted, a **3-minute cooldown** begins before play resumes automatically
- In-game lives (Pac-Man lives, Sprint shoe tokens, fishing casts) are a separate **client-side** economy and do **not** consume server hearts

### Badges

| Badge | Condition |
|---|---|
| `first_crack` | Complete your first stage |
| `caesar_initiate` | Complete all 5 Easy Caesar stages |
| `caesar_expert` | Complete all 5 Medium Caesar stages |
| `caesar_grandmaster` | Complete all 15 Caesar stages |
| `vigenere_initiate` | Complete all 5 Easy Vigenère stages |
| `vigenere_expert` | Complete all 5 Medium Vigenère stages |
| `vigenere_grandmaster` | Complete all 15 Vigenère stages |
| `playfair_initiate` | Complete all 5 Easy Playfair stages |
| `playfair_expert` | Complete all 5 Medium Playfair stages |
| `playfair_grandmaster` | Complete all 15 Playfair stages |
| `streak_7_days` | Maintain a 7-day consecutive login streak |
| `streak_30_days` | Maintain a 30-day consecutive login streak |
| `cipher_legend` | Complete all 45 cipher stages |

### Leaderboards
- **Per-stage leaderboard** — rank by Highest Score or Fastest Time per cipher/difficulty/level (top 50)
- **Global leaderboard** — rank by total accumulated score across all stages

### Tutorial System
- Interactive tutorial modal per cipher category (Caesar, Vigenère, Playfair)
- Auto-opens on first category selection from the dashboard
- "Don't show this again" preference persisted on the server per user per cipher

### Other Features
- **Password reset** (username + email) and **change password** (requires current password)
- **Account deletion** with full cascading cleanup of all game data
- **Responsive layout:** Verified at 100%, 125%, and 150% display scaling
- **Session snapshot & recovery:** In-flight game state survives accidental browser refreshes
- **Keyboard shortcuts:** `F` = toggle fullscreen, `M` = toggle mute (available in all mini-games)

---

## 🔌 API Reference

### Authentication — `/api/auth`
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Create account; returns JWT + user profile | No |
| POST | `/api/auth/login` | Authenticate; returns JWT + user profile | No |
| POST | `/api/auth/reset-password` | Reset password by username + email | No |

### User & Profile — `/api/users`
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/users/me` | Full profile (XP, hearts, cooldown, badges, progress) | JWT |
| PUT | `/api/users/me/password` | Change password (requires current password) | JWT |
| DELETE | `/api/users/me` | Delete account and all game data | JWT |
| GET | `/api/users/progress` | Progress map `{"CAESAR":{"EASY":[0,1,2],...}}` | JWT |
| POST | `/api/users/progress` | Mark a level completed | JWT |
| POST | `/api/users/attempts/deduct` | Manually deduct one session heart | JWT |
| GET | `/api/users/badges` | List earned badge type strings | JWT |
| GET | `/api/users/preferences/tutorial` | Get tutorial dismissed preferences | JWT |
| POST | `/api/users/preferences/tutorial` | Save a tutorial dismissed preference | JWT |

### Server-Authoritative Scoring — `/api/scoring`
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/scoring/start` | Begin a stage attempt; returns `sessionId` + `startedAt` | JWT |
| POST | `/api/scoring/complete/{sessionId}` | Complete stage; server computes and returns score, streak, multiplier | JWT |
| POST | `/api/scoring/fail/{sessionId}` | Register failure; resets streak, deducts 1 heart | JWT |
| GET | `/api/scoring/leaderboard` | Per-stage leaderboard (`?cipherType=&difficultyTier=&levelIndex=&category=score\|time`) | JWT |

### Fishing Mini-Game — `/api/fishing`
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/fishing/start` | Start a fishing game session | JWT |
| POST | `/api/fishing/{sessionId}/cast` | Cast a line; receive cipher challenge | JWT |
| POST | `/api/fishing/{sessionId}/submit` | Submit answer for current challenge | JWT |
| POST | `/api/fishing/{sessionId}/end` | End the session | JWT |
| GET | `/api/fishing/{sessionId}/summary` | Retrieve session summary | JWT |
| GET | `/api/fishing/leaderboard` | Global fishing leaderboard | JWT |

### Other
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/leaderboard` | Global score leaderboard (`?scope=overall`) | JWT |
| GET | `/api/health` | Health check (used by Render keep-alive) | No |

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js** 18+ and **npm**
- **Java 17** and **Maven** (or use the included `mvnw` wrapper)
- A **PostgreSQL** database, or a free [Supabase](https://supabase.com) project

### Frontend

```bash
cd Frontend
npm install
```

Create `Frontend/.env`:
```env
VITE_API_BASE=http://localhost:8080/api
```

```bash
npm run dev
# Dev server starts at http://localhost:5173
```

### Backend

```bash
cd backend
```

Create or edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/cipherquest
spring.datasource.username=your_db_user
spring.datasource.password=your_db_password
spring.jpa.hibernate.ddl-auto=update
jwt.secret=your-256-bit-secret-key-here-minimum-32-chars
cors.allowed-origins=http://localhost:5173
```

> **Tip:** If no PostgreSQL config is provided, the backend falls back to an in-memory **H2** database automatically — useful for quick local testing without a database.

```bash
./mvnw spring-boot:run
# API runs at http://localhost:8080
```

---

## 🚀 Deployment

### Frontend — Cloudflare Workers (via Wrangler)

```bash
cd Frontend
npm run build              # Outputs production bundle to Frontend/dist/
cd ..
npx wrangler deploy        # Deploys using wrangler.jsonc at repo root
```

The `wrangler.jsonc` at the repo root serves `Frontend/dist` as a single-page application.

### Backend — Render (Docker)

The `render.yaml` at the repo root defines the Render web service:
- **Runtime:** Docker (`backend/Dockerfile`)
- **Region:** Singapore (`ap-southeast-1`)
- **Health check path:** `GET /api/health`

**Environment variables to set in the Render Dashboard:**

| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://<supabase-host>:6543/postgres?prepareThreshold=0` |
| `DB_USERNAME` | Supabase DB username |
| `DB_PASSWORD` | *(set as secret)* |
| `JWT_SECRET` | *(set as secret — minimum 256-bit / 32 characters)* |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins (e.g. your Cloudflare URL) |

Pushing to the `main` branch triggers an automatic Render redeploy.

---

## ✅ Feature Completion Matrix

| Feature | Status | Notes |
|---|---|---|
| User Registration (BCrypt + JWT) | ✅ Implemented | Immediate login; no email verification |
| User Login / JWT authentication | ✅ Implemented | Stateless JWT stored in `localStorage` |
| Password Reset (username + email) | ✅ Implemented | |
| Change Password (authenticated) | ✅ Implemented | Requires current password verification |
| Account Deletion (cascade) | ✅ Implemented | Removes all game data on delete |
| Caesar Cipher — 15 stages | ✅ Implemented | Fishing, Pac-Man, Sprint mini-games |
| Vigenère Cipher — 15 stages | ✅ Implemented | Fishing, Sprint mini-games |
| Playfair Cipher — 15 stages | ✅ Implemented | Fishing, Sprint mini-games |
| Sequential stage unlock | ✅ Implemented | Stage N+1 requires completing Stage N |
| Difficulty tier gating | ✅ Implemented | Medium/Hard gated by tier completion |
| Server-authoritative scoring | ✅ Implemented | Streak multipliers, base score by difficulty |
| Session Hearts & 3-min cooldown | ✅ Implemented | 3 hearts; server-enforced lockout |
| Per-stage leaderboard (score/time) | ✅ Implemented | Top 50 per stage |
| Global leaderboard | ✅ Implemented | By total accumulated score |
| Badges system (13 badge types) | ✅ Implemented | Server-side; awarded automatically |
| Tutorial modals per cipher | ✅ Implemented | "Don't show again" persisted server-side |
| XP & Level system | ✅ Implemented | Level up every 1,000 XP |
| Daily login streak | ✅ Implemented | Resets after >36h gap |
| Responsive layout (125% / 150%) | ✅ Implemented | Verified across display scaling |
| Session snapshot & recovery | ✅ Implemented | Game state survives browser refresh |
| Anti-cheat scoring gate | ✅ Implemented | Clients cannot submit scores directly |
| Keyboard shortcuts (F / M) | ✅ Implemented | Fullscreen and mute across all mini-games |

### Known Limitations

| Limitation | Detail |
|---|---|
| Backend cold starts | Render free tier spins down after ~15 min inactivity; first request may take 30–60 s |
| No email verification | Accounts are created instantly without email confirmation |
| No admin panel | No web UI for managing users or reviewing aggregated gameplay analytics |
| Mobile layout | Optimized for desktop; mobile experience is functional but not the primary target |
| Fishing leaderboard is separate | The fishing game leaderboard is independent from cipher stage leaderboards |

---

## 🔒 Security Notes

- Passwords hashed with **BCrypt (cost factor 10)**
- All protected endpoints validate a **HS256 JWT** bearer token — no session cookies
- Scoring sessions are **single-use**: a `sessionId` can only be completed once
- Completion time is derived from **server-side timestamps only** — clients cannot submit or manipulate timing
- A **6-hour sanity ceiling** on completion time automatically expires implausible or abandoned sessions
- A depleted heart counter blocks stage starts from **every cipher category** — the lockout cannot be bypassed by switching ciphers

---

## 📄 Documentation

All project documentation is in `temporary files/current update/`:

| Document | File |
|---|---|
| Software Requirements Specification (SRS) v2.0 | `CipherQuest_SRS (1).pdf` |
| Software Design Description (SDD) | `CipherQuest_SDD (2).pdf` |
| Software Project Management Plan (SPMP) | `CipherQuest_SPMP.pdf` |
| **Software Test Document (STD) v1.0** | `CipherQuest_Software_Test_Document.pdf` |
| Requirements Traceability Matrix (RTM) v2.0 | `CipherQuest_RTM (1).pdf` |
| Requirements Inventory | `Requirements Inventory (1).pdf` |
| Software & Deployment Evidence | `01_Software_and_Deployment.pdf` |
