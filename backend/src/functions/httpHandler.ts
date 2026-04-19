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
import { scoutingReportsFlow } from '../flows/scoutingReportsFlow';
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
  { name: 'scoutingReportsFlow', authPolicy: noAuth() },
  scoutingReportsFlow
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
  // Commentary inputs
  innings: number;
  battingTeam: string;
  over: number;
  ball: number;
  score: string;
  target?: number;
  currentRunRate?: number;
  requiredRunRate?: number;
  batsmanName: string;
  bowlerName: string;
  runs: number;
  extras: number;
  isWicket: boolean;
  wicketType?: string;
  shotZone?: string;
  momentum: number;
  // Momentum inputs for rolling analysis
  matchId: string;
  bowlerTeam: string;
  format: 'T20' | 'ODI' | 'Test';
  overByOverRuns: { over: number; runs: number; wickets: number }[];
}): Promise<{ commentary: string; newMomentumScore: number }> {

  // Step 1: Generate live commentary for this ball
  const commentary = await runFlow(liveCommentaryFlow, {
    innings: params.innings,
    battingTeam: params.battingTeam,
    over: params.over,
    ball: params.ball,
    score: params.score,
    target: params.target,
    currentRunRate: params.currentRunRate,
    requiredRunRate: params.requiredRunRate,
    batsmanName: params.batsmanName,
    bowlerName: params.bowlerName,
    runs: params.runs,
    extras: params.extras,
    isWicket: params.isWicket,
    wicketType: params.wicketType,
    shotZone: params.shotZone,
    momentum: params.momentum,
    streaming: false,
  });

  // Step 2: Run momentum re-analysis with current over data
  const momentumResult = await runFlow(momentumAnalysisFlow, {
    matchId: params.matchId,
    battingTeam: params.battingTeam,
    bowlingTeam: params.bowlerTeam,
    format: params.format,
    innings: params.innings,
    overByOverRuns: params.overByOverRuns,
    currentMomentum: params.momentum,
  });

  return {
    commentary,
    newMomentumScore: momentumResult.momentumScore,
  };
}
