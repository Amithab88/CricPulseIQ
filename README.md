# CricPulseI

# CricketIQ Backend

Production-grade Node.js/TypeScript API powering the CricketIQ platform.

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20 + TypeScript | Type safety, fast async I/O for WebSocket fan-out |
| Framework | Express 4 | Mature, well-understood, easy to test |
| Database | PostgreSQL 15 | ACID transactions for delivery logging, JSONB for wagon wheel |
| Cache | Redis 7 | Live score state (~1ms reads), AI report cache, session store |
| Real-time | WebSocket (ws) | Sub-10ms delivery broadcast to all match viewers |
| AI | Anthropic Claude | Scout reports, live commentary, platform insights |
| Auth | JWT + bcrypt | Stateless — scales horizontally without session store |
| Validation | zod + express-validator | Two layers: schema validation + request validation |
| Logging | Winston | Structured JSON logs — works with CloudWatch/Datadog |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Set DATABASE_URL, REDIS_URL, JWT_SECRET, ANTHROPIC_API_KEY

# 3. Start infrastructure
docker-compose up postgres redis -d

# 4. Run migrations
npm run migrate

# 5. Seed demo data
npm run seed

# 6. Start dev server
npm run dev
# → API on http://localhost:4000
# → WebSocket on ws://localhost:4000/ws
```

## Key architectural decisions

### Why every ball is immutable
The `deliveries` table is insert-only. Scorers can log a correction
delivery (e.g. `extra_type: 'correction'`) but never UPDATE a row.
This means career stats are always reproducible from source data —
no incremental corruption over time.

### Why career stats are pre-computed
`player_career_stats` is a cache of computed aggregates. It's rebuilt
from `deliveries` after every match via `statsWorker.ts`. This means:
- Talent search queries hit a small indexed table (~5k rows) not 1M+ deliveries
- Any delivery correction automatically propagates to career stats on next rebuild
- The rebuild is idempotent — safe to re-run as many times as needed

### Why materialised views for leaderboards
`mv_batting_leaderboard` and `mv_bowling_leaderboard` are refreshed
every 15 minutes with `CONCURRENTLY` — zero read blocking. The leaderboard
page always reads from these views, never from the base tables.

### WebSocket scaling
Currently single-server with in-memory room registry. When horizontal
scaling is needed (>500 concurrent matches), replace `matchRooms` Map
with Redis Pub/Sub. Each server subscribes to match channels in Redis;
`broadcastToMatch` publishes to Redis instead of direct socket send.

### AI cost management
Every AI call result is cached in Redis for 1 hour and logged in
`ai_analysis_cache`. The talent search page re-uses cached reports.
Target: < 100k tokens/day at launch (< ₹500/day in API costs).

## API reference

### Core scoring flow
```
POST /api/v1/scoring/delivery          — Log a ball (scorer app)
GET  /api/v1/scoring/match/:id/live    — Current match state (viewer app, served from Redis)
GET  /api/v1/scoring/match/:id/scorecard — Full batting + bowling tables
```

### Player / talent
```
GET  /api/v1/players/search            — Talent discovery with filters
GET  /api/v1/players/:id/career        — Full career profile
GET  /api/v1/players/:id/scout-report  — AI scouting report (selector tier)
```

### Leaderboards
```
GET  /api/v1/leaderboard/batting       — Cross-club run scorers
GET  /api/v1/leaderboard/bowling       — Cross-club wicket takers
```

### Live matches
```
GET  /api/v1/matches/live              — All currently live matches
```

### WebSocket protocol
```
Client → Server:
  { type: "JOIN_MATCH",  payload: { matchId: "uuid" } }
  { type: "LEAVE_MATCH", payload: {} }
  { type: "PING",        payload: {} }

Server → Client:
  { type: "CONNECTED",   payload: { userId, role, serverTime } }
  { type: "JOINED",      payload: { matchId, viewers: N } }
  { type: "LIVE_STATE",  payload: LiveScoreState }         — on join (from cache)
  { type: "DELIVERY",    payload: { deliveryId, runs, isWicket, liveState } }
  { type: "PONG",        payload: { ts: timestamp } }
  { type: "ERROR",       payload: { message } }
```

## Scaling to 1 million users

| Bottleneck | Solution |
|-----------|---------|
| Single DB write | PgBouncer connection pooler in front of Postgres |
| WebSocket fan-out | Replace in-memory rooms with Redis Pub/Sub |
| Live score reads | Redis already handles this — no change needed |
| Leaderboard queries | Materialised views + read replicas |
| AI cost | Batch commentary generation, aggressive caching |
| Career stats recompute | Move queue from in-memory to BullMQ + Redis |
| Static assets | CDN (CloudFront/BunnyCDN) |

At 1M users, the only component that needs fundamental re-architecture
is the WebSocket layer. Everything else scales vertically or with
read replicas until ~100k concurrent users.

## Environment variables

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/cricketiq
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-256-bit-secret-here
ANTHROPIC_API_KEY=sk-ant-...

# Optional
PORT=4000
NODE_ENV=production
ALLOWED_ORIGINS=https://cricketiq.app,https://admin.cricketiq.app
LOG_LEVEL=info
```
