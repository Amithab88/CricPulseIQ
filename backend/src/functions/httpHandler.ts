/**
 * httpHandler.ts
 * Exposes all Genkit flows as HTTP endpoints via onRequest().
 *
 * Pattern: Use firebase-functions onRequest to wrap runFlow().
 * Includes a simple Bearer token check for security.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { runFlow } from '@genkit-ai/core';

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
// Security Middleware — Simple Bearer Token Check
// ─────────────────────────────────────────────────────────────────────────────
const validateAuth = (req: any, res: any): boolean => {
  const authHeader = req.headers.authorization;
  const internalApiKey = process.env.INTERNAL_API_KEY || 'dev-secret-key';
  
  if (!authHeader || authHeader !== `Bearer ${internalApiKey}`) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return false;
  }
  return true;
};

const FLOW_CONFIG = { region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 } as const;

// ─────────────────────────────────────────────────────────────────────────────
// HTTP endpoints using the onRequest pattern.
// ─────────────────────────────────────────────────────────────────────────────

export const httpLiveCommentary = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(liveCommentaryFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpAiCoachChat = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(aiCoachChatFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpMatchStrategy = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(matchStrategyFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpScoutingReport = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(scoutingReportFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpMomentumAnalysis = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(momentumAnalysisFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpPlayerWeakness = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(playerWeaknessFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpFieldPlacement = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(fieldPlacementFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpOnboardingWelcome = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(onboardingWelcomeFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpTeamOfTournament = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(teamOfTournamentFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const httpQualificationScenarios = onRequest(FLOW_CONFIG, async (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const result = await runFlow(qualificationScenariosFlow, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
