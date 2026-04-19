# CricPulseIQ

> AI-powered cricket intelligence platform for grassroots and club-level cricket.  
> Built with Firebase Genkit · Vertex AI · Firestore · React Native (Expo)

---

## 📁 Project Structure

```
CricPulseIQ/
├── backend/
│   └── src/
│       ├── index.ts                    ← Genkit config + all exports
│       ├── prompts/
│       │   ├── systemPrompt.ts         ← Shared AI identity + context builders
│       │   └── prompts.ts              ← definePrompt() definitions
│       ├── flows/                      ← 10 Genkit AI flows
│       │   ├── onboardingWelcome.ts
│       │   ├── liveCommentary.ts       ← streamingGenerate()
│       │   ├── momentumAnalysis.ts
│       │   ├── playerWeakness.ts
│       │   ├── fieldPlacement.ts
│       │   ├── aiCoachChat.ts          ← streamingGenerate() + two-pass
│       │   ├── matchStrategyFlow.ts    ← structuredOutput
│       │   ├── scoutingReportsFlow.ts  ← structuredOutput
│       │   ├── teamOfTournament.ts
│       │   └── qualificationScenarios.ts
│       ├── functions/
│       │   ├── matchPipeline.ts        ← Cloud Functions v2 (onDocumentCreated/Updated/onCall)
│       │   └── httpHandler.ts          ← onFlow() HTTP exposure + runFlow() chaining
│       └── types/
│           └── schemas.ts              ← Zod schemas + TypeScript types
├── frontend/
│   └── src/
│       ├── config/firebase.ts          ← Firebase client init
│       ├── hooks/useCricPulseIQ.ts     ← All React Native hooks
│       └── screens/
│           ├── HomeScreen.tsx
│           ├── LiveScorecardScreen.tsx  ← wired to useLiveScorecard
│           ├── AnalysisScreen.tsx
│           ├── AICoachScreen.tsx        ← wired to useAICoach (streaming)
│           ├── PlayerProfileScreen.tsx
│           ├── WagonWheelScreen.tsx
│           ├── MatchStrategyScreen.tsx
│           └── TournamentManagerScreen.tsx
├── docs/FIRESTORE_SCHEMA.md
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── .env.template
```

---

## 🚀 Quick Start

### 1. Firebase Setup
```bash
npm install -g firebase-tools
firebase login
firebase init    # select Firestore, Functions, Storage
```

### 2. Backend (Genkit + Cloud Functions)
```bash
cd backend
npm install
cp ../.env.template .env.local   # fill in your credentials
npm run dev    # starts Genkit Dev UI at http://localhost:4000
```

### 3. Frontend (Expo)
```bash
cd frontend
npm install
cp ../.env.template .env.local
npm start      # starts Expo dev server
```

### 4. Deploy
```bash
# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy Cloud Functions
cd backend && npm run build
firebase deploy --only functions
```

---

## 🧠 AI Flows Reference

| Flow | Model | API Pattern |
|---|---|---|
| `onboardingWelcomeFlow` | Flash | `generate()` + structured output |
| `liveCommentaryFlow` | Flash | `streamingGenerate()` + SSE |
| `momentumAnalysisFlow` | Flash | `generate()` + structured output |
| `playerWeaknessFlow` | Pro | `generate()` + structured output |
| `fieldPlacementFlow` | Flash | `generate()` + structured output |
| `aiCoachChatFlow` | Pro | `streamingGenerate()` + two-pass |
| `matchStrategyFlow` | Pro | `generate()` + structured output |
| `scoutingReportsFlow` | Pro | `generate()` + structured output |
| `teamOfTournamentFlow` | Pro | `generate()` + structured output |
| `qualificationScenariosFlow` | Pro | `generate()` + structured output |

---

## 🔁 Data Pipelines

**Pipeline 1 — Real-time (per ball)**  
`Scorer writes delivery` → `onDeliveryCreated` → score update + `runFlow(commentary)` + `runFlow(momentum)` → writes `aiCommentary` to delivery doc → `onSnapshot` pushes to fan UI

**Pipeline 2 — Async (on match end)**  
`match.status = completed` → `onMatchCompleted` → delivery aggregation → `playerStats/seasons` → `runFlow(teamOfTournament)` → tournament leaderboard refresh

---

## 🔐 Environment Variables
See `.env.template` for all required keys:
- `EXPO_PUBLIC_FIREBASE_*` — Firebase client config
- `EXPO_PUBLIC_GENKIT_URL` — Genkit backend URL
- `GCP_PROJECT_ID` + `GCP_LOCATION` — Vertex AI project
