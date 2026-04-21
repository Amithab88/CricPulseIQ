/**
 * functions.ts
 * Main entry point for Firebase Functions deployment.
 * Resolves naming collisions by only exporting the HTTP wrappers and triggers.
 */

import { initializeApp } from 'firebase-admin/app';
initializeApp();

// ─── Genkit Config (Required for runFlow to work in Functions) ───────────────
import './index'; 

// ─── Cloud Functions v2 (Firestore/Auth triggers) ────────────────────────────
export { onDeliveryCreated, onMatchCompleted, generateScoutingReport } from './functions/matchPipeline';

// ─── HTTP Flow Endpoints (Exposed as standard v2 HTTPS functions) ─────────────
export {
  httpLiveCommentary,
  httpAiCoachChat,
  httpMatchStrategy,
  httpScoutingReport,
  httpMomentumAnalysis,
  httpPlayerWeakness,
  httpFieldPlacement,
  httpOnboardingWelcome,
  httpTeamOfTournament,
  httpQualificationScenarios,
} from './functions/httpHandler';
