/**
 * httpHandler.ts
 * Exposes all Genkit flows as HTTP endpoints via onRequest().
 *
 * Pattern: Use firebase-functions onRequest to wrap runFlow().
 * Includes a simple Bearer token check for security.
 */

import { onFlow, noAuth } from '@genkit-ai/firebase/functions';
import { runFlow } from '@genkit-ai/flow';

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
// HTTP endpoints using the onFlow pattern.
// ─────────────────────────────────────────────────────────────────────────────

const strictAuth = ((auth: any) => { if (!auth) throw new Error('Unauthenticated'); }) as any;

export const httpLiveCommentary = onFlow(
  { name: 'http-live-commentary', authPolicy: strictAuth },
  liveCommentaryFlow as any
);

export const httpAiCoachChat = onFlow(
  { name: 'http-ai-coach-chat', authPolicy: strictAuth },
  aiCoachChatFlow as any
);

export const httpMatchStrategy = onFlow(
  { name: 'http-match-strategy', authPolicy: strictAuth },
  matchStrategyFlow as any
);

export const httpScoutingReport = onFlow(
  { name: 'http-scouting-report', authPolicy: strictAuth },
  scoutingReportFlow as any
);

export const httpMomentumAnalysis = onFlow(
  { name: 'http-momentum-analysis', authPolicy: strictAuth },
  momentumAnalysisFlow as any
);

export const httpPlayerWeakness = onFlow(
  { name: 'http-player-weakness', authPolicy: strictAuth },
  playerWeaknessFlow as any
);

export const httpFieldPlacement = onFlow(
  { name: 'http-field-placement', authPolicy: strictAuth },
  fieldPlacementFlow as any
);

export const httpOnboardingWelcome = onFlow(
  { name: 'http-onboarding-welcome', authPolicy: strictAuth },
  onboardingWelcomeFlow as any
);

export const httpTeamOfTournament = onFlow(
  { name: 'http-team-of-tournament', authPolicy: strictAuth },
  teamOfTournamentFlow as any
);

export const httpQualificationScenarios = onFlow(
  { name: 'http-qualification-scenarios', authPolicy: strictAuth },
  qualificationScenariosFlow as any
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE FLOW — runFlow() for internal chaining
// After each ball is logged, this chains: commentary → momentum update
// Called internally by matchPipeline.ts (not exposed as HTTP)
// ─────────────────────────────────────────────────────────────────────────────

export async function runBallAnalysisPipeline(params: {
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
  matchId: string;
  bowlerTeam: string;
  format: string;
  overByOverRuns: { over: number; runs: number; wickets: number; dots: number }[];
}): Promise<{ commentary: string; newMomentumScore: number }> {

  const flowOutput = await runFlow(liveCommentaryFlow, {
    delivery: {
      over: params.over,
      ball: params.ball,
      runs: params.runs,
      extras: params.extras > 0 ? `${params.extras} extras` : null,
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
