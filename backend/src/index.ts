/**
 * index.ts
 * Entry point for Genkit. Configures the environment and exports flows.
 * Discoverable by Genkit Dev UI.
 */

import { configureGenkit } from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';
import { firebase } from '@genkit-ai/firebase';

// ─── Configure Genkit ─────────────────────────────────────────────────────────
const projectId = process.env.GCP_PROJECT_ID;
if (!projectId) throw new Error('GCP_PROJECT_ID is required');

configureGenkit({
  plugins: [
    vertexAI({
      projectId,
      location: process.env.GCP_LOCATION ?? 'us-central1',
    }),
    firebase(),
  ],
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableTracingAndMetrics: true,
});

// index.ts — keep only these:
export { onDeliveryCreated, onMatchCompleted, generateScoutingReport }
  from './functions/matchPipeline';
export { httpLiveCommentary, httpAiCoachChat, httpMatchStrategy,
  httpScoutingReport, httpMomentumAnalysis, httpPlayerWeakness,
  httpFieldPlacement, httpOnboardingWelcome, httpTeamOfTournament,
  httpQualificationScenarios } from './functions/httpHandler';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
