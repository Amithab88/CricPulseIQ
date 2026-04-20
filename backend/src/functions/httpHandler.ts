/**
 * httpHandler.ts
 * Exposes all Genkit flows as HTTP endpoints via onFlow().
 * Deploy this to Cloud Run or Firebase Functions for the frontend to call.
 *
 * Uses: onFlow(), runFlow() (internal chaining)
 */

import { onFlow, noAuth } from '@genkit-ai/firebase/functions';
import { runFlow } from '@genkit-ai/core';
import * as z from 'zod';

// ── Flow imports ──────────────────────────────────────────────────────────────
import { liveCommentaryFlow } from '../flows/liveCommentary';
import { aiCoachChatFlow } from '../flows/aiCoachChat';
import { matchStrategyFlow } from '../flows/matchStrategyFlow';
import { scoutingReportFlow } from '../flows/scoutingReportsFlow';
import { momentumAnalysisFlow } from '../flows/momentumAnalysis';
import { playerWeaknessFlow } from '../flows/playerWeakness';
import { fieldPlacementFlow } from '../flows/fieldPlacement';
import { onboardingWelcomeFlow } from '../flows/onboardingWelcome';
import { teamOfTournamentFlow } from '../flows/teamOfTournament';
import { qualificationScenariosFlow } from '../flows/qualificationScenarios';

// ─────────────────────────────────────────────────────────────────────────────
// onFlow() wraps each Genkit flow as a typed HTTP endpoint.
// noAuth() is used for development — swap with httpsCallable auth in production.
// Each export becomes a Cloud Function or Cloud Run route automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const httpLiveCommentary = onFlow(
  { name: 'liveCommentaryFlow', authPolicy: noAuth() },
  liveCommentaryFlow
);

export const httpAiCoachChat = onFlow(
  { name: 'aiCoachChatFlow', authPolicy: noAuth() },
  aiCoachChatFlow
);

export const httpMatchStrategy = onFlow(
  { name: 'matchStrategyFlow', authPolicy: noAuth() },
  matchStrategyFlow
);

export const httpScoutingReport = onFlow(
  { name: 'scoutingReportFlow', authPolicy: noAuth() },
  scoutingReportFlow
);

export const httpMomentumAnalysis = onFlow(
  { name: 'momentumAnalysisFlow', authPolicy: noAuth() },
  momentumAnalysisFlow
);

export const httpPlayerWeakness = onFlow(
  { name: 'playerWeaknessFlow', authPolicy: noAuth() },
  playerWeaknessFlow
);

export const httpFieldPlacement = onFlow(
  { name: 'fieldPlacementFlow', authPolicy: noAuth() },
  fieldPlacementFlow
);

export const httpOnboardingWelcome = onFlow(
  { name: 'onboardingWelcomeFlow', authPolicy: noAuth() },
  onboardingWelcomeFlow
);

export const httpTeamOfTournament = onFlow(
  { name: 'teamOfTournamentFlow', authPolicy: noAuth() },
  teamOfTournamentFlow
);

export const httpQualificationScenarios = onFlow(
  { name: 'qualificationScenariosFlow', authPolicy: noAuth() },
  qualificationScenariosFlow
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE FLOW — runFlow() for internal chaining
// After each ball is logged, this chains: commentary → momentum update
// Called internally by matchPipeline.ts (not exposed as HTTP)
// ─────────────────────────────────────────────────────────────────────────────

export async function runBallAnalysisPipeline(params: {
  // Commentary & Context inputs
  innings: number;
  battingTeam: string;
  over: number;
  ball: number;
  score: string;
  target?: number | null;
  currentRunRate: number;
  requiredRunRate?: number | null;
  batsmanName: string;
  bowlerName: string;
  runs: number;
  extras: number;
  isWicket: boolean;
  wicketType?: string | null;
  shotZone?: string;
  momentum: number;
  partnership: { runs: number; balls: number };
  batsmanStats: { runs: number; balls: number; sr: number };
  // Momentum inputs
  matchId: string;
  bowlerTeam: string;
  format: 'T20' | 'ODI' | 'Test';
  overByOverRuns: { over: number; runs: number; wickets: number; dots: number }[];
}): Promise<{ commentary: string; newMomentumScore: number }> {

  // Step 1: Generate live commentary for this ball
  const flowOutput = await runFlow(liveCommentaryFlow, {
    delivery: {
      over: params.over,
      ball: params.ball,
      runs: params.runs,
      extras: params.extras > 0 ? `${params.extras} extras` : null, // simplified 
      isWicket: params.isWicket,
      wicketType: params.wicketType ?? null,
      batsmanName: params.batsmanName,
      bowlerName: params.bowlerName,
      wagWheelZone: params.shotZone ?? 'unknown',
    },
    matchContext: {
      score: params.score,
      target: params.target ?? null,
      runRate: params.currentRunRate,
      requiredRate: params.requiredRunRate ?? null,
      partnership: params.partnership,
      batsmanStats: params.batsmanStats,
    }
  });

  // Step 2: Run momentum re-analysis with last 5 overs
  const momentumResult = await runFlow(momentumAnalysisFlow, {
    last5Overs: params.overByOverRuns.slice(-5),
    currentScore: params.score,
    target: params.target ?? null,
    teamBatting: params.battingTeam,
    teamBowling: params.bowlerTeam,
  });

  return {
    commentary: flowOutput.commentary,
    newMomentumScore: momentumResult.momentumScore,
  };
}
