/**
 * index.ts
 * Entry point for Genkit. Configures the environment and exports flows.
 * Discoverable by Genkit Dev UI.
 */

import { configureGenkit } from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';
import { firebase } from '@genkit-ai/firebase';

// ─── Configure Genkit ─────────────────────────────────────────────────────────
configureGenkit({
  plugins: [
    vertexAI({
      projectId: process.env.GCP_PROJECT_ID ?? 'cricpulseiq',
      location: process.env.GCP_LOCATION ?? 'us-central1',
    }),
    firebase(),
  ],
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableTracingAndMetrics: true,
});

// ─── Genkit Flows (discoverable by Genkit Dev UI) ──────────────────────────────
export { onboardingWelcomeFlow } from './flows/onboardingWelcome';
export { liveCommentaryFlow } from './flows/liveCommentary';
export { momentumAnalysisFlow } from './flows/momentumAnalysis';
export { playerWeaknessFlow } from './flows/playerWeakness';
export { fieldPlacementFlow } from './flows/fieldPlacement';
export { aiCoachChatFlow } from './flows/aiCoachChat';
export { matchStrategyFlow } from './flows/matchStrategyFlow';
export { scoutingReportFlow } from './flows/scoutingReportsFlow';
export { teamOfTournamentFlow } from './flows/teamOfTournament';
export { qualificationScenariosFlow } from './flows/qualificationScenarios';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
