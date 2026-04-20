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

// ─── Genkit Flows (discoverable by Genkit Dev UI and Cloud Run) ───────────────
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

// ─── Cloud Functions v2 (deployed via firebase deploy --only functions) ───────
export { onDeliveryCreated, onMatchCompleted, generateScoutingReport } from './functions/matchPipeline';

// ─── HTTP Flow Endpoints (onFlow — Cloud Run / Functions HTTP) ────────────────
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
