# CipherQuest

## Setup Instructions

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

## Deployment Information

### Live Deployment URLs

| Service | URL |
|---|---|
| Frontend (Cloudflare Workers) | https://cipher-quest.kwpoliquit.workers.dev |
| Backend API (Render) | https://cipherquest-oddy.onrender.com |

The backend runs on Render's free tier. The first request after inactivity may take 30-60 seconds to cold-start.

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
