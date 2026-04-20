/**
 * useCricPulseIQ.ts — React Native hooks
 * Covers: useAICoach (streaming), useLiveScorecard (onSnapshot),
 *         useMatchStrategy, usePlayerProfile, useMomentum, useFieldPlacement
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, collection, query, orderBy,
  onSnapshot, getDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import type {
  Match, Delivery, PlayerSeasonStats,
} from '../../../backend/src/types/schemas';

const GENKIT_BASE_URL = process.env.EXPO_PUBLIC_GENKIT_URL ?? 'http://localhost:4000';

// ─── Shared Genkit caller (non-streaming) ────────────────────────────────────
async function callFlow<TIn, TOut>(flowName: string, input: TIn): Promise<TOut> {
  const res = await fetch(`${GENKIT_BASE_URL}/${flowName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Flow "${flowName}" failed: ${res.statusText}`);
  const json = await res.json();
  return json.result as TOut;
}

// ─── Streaming Genkit caller — uses SSE / fetch streaming ═══════════════════
async function streamFlow(
  flowName: string,
  input: object,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const res = await fetch(`${GENKIT_BASE_URL}/${flowName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ ...input, streaming: true }),
  });

  if (!res.ok || !res.body) throw new Error(`Stream "${flowName}" failed: ${res.statusText}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // SSE format: "data: <text>\n\n"
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const text = line.replace('data: ', '');
      full += text;
      onChunk(text);
    }
  }
  return full;
}

// ═══════════════════════════════════════════════════════════════════════════════
// useAICoach — multi-turn coaching chat with streaming replies
// ═══════════════════════════════════════════════════════════════════════════════
export type ChatMessage = { role: 'user' | 'model'; content: string };

export interface TeamContextInput {
  clubName: string;
  upcomingOpponent: string | null;
  recentForm: string;
  squad: {
    name: string;
    role: string;
    battingAvg: number;
    bowlingEcon: number | null;
    weaknesses: string[];
    strengths: string[];
  }[];
  liveMatchState: {
    score: string;
    over: string;
    runRate: number;
    target: number | null;
  } | null;
}

export function useAICoach(teamContext: TeamContextInput) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedChips, setSuggestedChips] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    setError(null);
    setIsLoading(true);
    
    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: userMessage }
    ];
    setChatHistory(updatedHistory);

    try {
      const result = await callFlow<{ messages: ChatMessage[], teamContext: TeamContextInput }, { reply: string, suggestedChips: string[] }>(
        'aiCoachChatFlow',
        { messages: updatedHistory, teamContext }
      );

      setChatHistory(prev => [...prev, { role: 'model', content: result.reply }]);
      setSuggestedChips(result.suggestedChips);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [chatHistory, teamContext]);

  const clearHistory = useCallback(() => {
    setChatHistory([]);
    setSuggestedChips([]);
  }, []);

  return {
    chatHistory,
    isLoading,
    suggestedChips,
    sendMessage,
    clearHistory,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useLiveScorecard — dual onSnapshot: match + deliveries
// ═══════════════════════════════════════════════════════════════════════════════
export function useLiveScorecard(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [latestCommentary, setLatestCommentary] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;

    // Subscribe to match document — live score, momentum, status
    const matchUnsub = onSnapshot(
      doc(db, 'matches', matchId),
      (snap) => {
        if (snap.exists()) {
          setMatch({ id: snap.id, ...snap.data() } as Match);
          setIsConnected(true);
        }
      },
      (err) => { setError(err.message); setIsConnected(false); },
    );

    // Subscribe to deliveries sub-collection — ball feed
    const deliveriesUnsub = onSnapshot(
      query(
        collection(db, 'matches', matchId, 'deliveries'),
        orderBy('over', 'asc'),
        orderBy('ball', 'asc'),
      ),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Delivery);
        setDeliveries(docs);
        // Show AI commentary from the most recent delivery
        const last = docs[docs.length - 1];
        if (last?.aiCommentary) setLatestCommentary(last.aiCommentary);
      },
      (err) => setError(err.message),
    );

    return () => { matchUnsub(); deliveriesUnsub(); };
  }, [matchId]);

  // Over groups for scorecard display
  const currentOver = deliveries.filter(
    d => d.over === (deliveries[deliveries.length - 1]?.over ?? 0)
  );

  const byOver = deliveries.reduce<Record<number, Delivery[]>>((acc, d) => {
    if (!acc[d.over]) acc[d.over] = [];
    acc[d.over].push(d);
    return acc;
  }, {});

  return { match, deliveries, currentOver, byOver, latestCommentary, isConnected, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useMatchStrategy — one-shot pre-match plan generation
// ═══════════════════════════════════════════════════════════════════════════════
export interface StrategyInput {
  ourTeam: {
    name: string;
    players: { name: string; role: string; battingAvg: number; bowlingEcon: number | null; recentForm: string; weaknesses: string[] }[];
    recentResults: string[];
  };
  opponent: {
    name: string;
    knownStrengths: string[];
    knownWeaknesses: string[];
    keyPlayers: { name: string; threat: 'high' | 'medium' | 'low'; howToNeutralise: string }[];
  };
  matchFormat: 'T20' | 'ODI' | '40-over';
  venue: string;
  pitchReport: string | null;
  tossResult: { wonToss: boolean; decision: 'bat' | 'bowl' } | null;
}

export interface StrategyOutput {
  battingOrder: { position: number; name: string; reason: string }[];
  powerplayStrategy: { batting: string; bowling: string; openingBowlers: string[] };
  middleOversPlan: string;
  deathOversTactics: { batting: string; bowling: string; closingBowler: string };
  bowlingRotations: { over: string; bowler: string; plan: string }[];
  fieldPlacementPhilosophy: string;
  riskWarnings: { scenario: string; response: string }[];
  captainSummary: string;
}

export function useMatchStrategy() {
  const [strategy, setStrategy] = useState<StrategyOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (input: StrategyInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callFlow<StrategyInput, StrategyOutput>('matchStrategyFlow', input);
      setStrategy(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => setStrategy(null), []);
  return { strategy, generatePlan, reset, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// usePlayerProfile — real-time stats + on-demand scouting (httpsCallable)
// ═══════════════════════════════════════════════════════════════════════════════
export function usePlayerProfile(playerId: string, seasonId?: string) {
  const [stats, setStats] = useState<PlayerSeasonStats | null>(null);
  const [scoutingReport, setScoutingReport] = useState<{
    paragraph1_profile: string;
    paragraph2_weaknesses: string;
    paragraph3_strategy: string;
    scoutingVerdict: 'avoid' | 'monitor' | 'recruit' | 'prioritise';
    keyBowlingTactic: string;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const season = seasonId ?? new Date().getFullYear().toString();

  // Live Firestore listener for player season stats
  useEffect(() => {
    if (!playerId) return;
    setIsLoadingStats(true);

    const unsub = onSnapshot(
      doc(db, 'playerStats', playerId, 'seasons', season),
      (snap) => {
        setStats(snap.exists() ? (snap.data() as PlayerSeasonStats) : null);
        setIsLoadingStats(false);
      },
      (err) => { setError(err.message); setIsLoadingStats(false); },
    );
    return () => unsub();
  }, [playerId, season]);

  // On-demand scouting via Genkit flow
  const fetchScoutingReport = useCallback(async () => {
    if (!stats) { setError('No stats available.'); return null; }
    setIsLoadingReport(true);
    setError(null);
    try {
      // Mapping Firestore stats to the complex scouting flow input
      const input = {
        player: {
          name: stats.playerId, // ID for now
          age: 25, // Placeholder or fetch from user
          battingStyle: 'Right-hand', // Placeholder
          bowlingStyle: 'Off-break', // Placeholder
          seasonStats: {
            matches: stats.matches,
            runs: stats.runs,
            avg: stats.avg,
            strikeRate: stats.strikeRate,
            highScore: stats.highScore,
            fifties: stats.fifties,
            hundreds: stats.hundreds,
            vsSpinAvg: stats.vsSpinRating, // Simplified mapping
            vsSpinSR: stats.strikeRate,
            vsPaceAvg: stats.vsPaceRating,
            vsPaceSR: stats.strikeRate,
            powerplayRating: stats.phaseRatings.powerplay,
            middleOversRating: stats.phaseRatings.middleOvers,
            deathOversRating: stats.phaseRatings.death,
            dotBallPct: 40, // Calculated or placeholder
            boundaryPct: 15, // Calculated or placeholder
          },
          shotZones: Object.fromEntries(
            Object.entries(stats.shotZones).map(([zone, pct]) => [zone, { shots: 10, runs: pct }])
          ),
          formTrend: 'consistent' as const,
          last5Scores: stats.formHistory.slice(-5).map(f => f.runs),
          careerHighlight: 'Consistent performer across matches.',
        }
      };

      const result = await callFlow<typeof input, typeof scoutingReport>('scoutingReportFlow', input);
      setScoutingReport(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoadingReport(false);
    }
  }, [stats]);

  return { stats, scoutingReport, fetchScoutingReport, isLoadingStats, isLoadingReport, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useMomentumAnalysis — fires after each over completes
// ═══════════════════════════════════════════════════════════════════════════════
export function useMomentumAnalysis(matchId: string) {
  const [momentumData, setMomentumData] = useState<{
    verdict: string;
    turningPoint: string;
    battingInstruction: string;
    bowlingInstruction: string;
    momentumScore: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async (input: {
    last5Overs: { over: number; runs: number; wickets: number; dots: number }[];
    currentScore: string;
    target: number | null;
    teamBatting: string;
    teamBowling: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callFlow('momentumAnalysisFlow', input);
      setMomentumData(result as typeof momentumData);
      return result;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { momentumData, analyse, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useFieldPlacement — live field recommendation per ball
// ═══════════════════════════════════════════════════════════════════════════════
export function useFieldPlacement() {
  const [field, setField] = useState<{
    fieldChanges: { moveFrom: string; moveTo: string; reason: string }[];
    bowlingLineAdjustment: string;
    primaryWeakness: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommend = useCallback(async (input: {
    batsmanName: string;
    currentDelivery: { totalBalls: number; totalRuns: number; strikeRate: number };
    shotZones: any;
    careerZoneData: any | null;
    bowlingType: 'pace' | 'spin' | 'medium';
    matchSituation: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callFlow('fieldPlacementFlow', input);
      setField(result as typeof field);
      return result;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { field, recommend, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useOnboarding — personalised AI welcome briefing
// ═══════════════════════════════════════════════════════════════════════════════
export function useOnboarding() {
  const [welcome, setWelcome] = useState<{
    welcomeMessage: string;
    tacticalHint: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWelcomeMessage = useCallback(async (input: {
    userName: string;
    role: 'scorer' | 'player_coach' | 'fan' | 'organiser';
    clubName: string;
    nextMatchOpponent: string | null;
    nextMatchDate: string | null;
    teamRecentForm: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callFlow<any, typeof welcome>('onboardingWelcomeFlow', input);
      setWelcome(result);
      return result;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { welcome, getWelcomeMessage, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useWeaknessDetector — deep technical batting analysis
// ═══════════════════════════════════════════════════════════════════════════════
export function useWeaknessDetector() {
  const [analysis, setAnalysis] = useState<{
    biggestWeakness: string;
    exploitablePatterns: string[];
    strongestPhase: { phase: string; reason: string };
    bowlingStrategy: string;
    overallRating: 'fragile' | 'inconsistent' | 'solid' | 'match-winner';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyseWeakness = useCallback(async (input: {
    playerName: string;
    seasonStats: any;
    recentForm: { runs: number; balls: number; dismissal: string }[];
    shotZoneData: any;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callFlow<any, typeof analysis>('playerWeaknessFlow', input);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { analysis, analyseWeakness, isLoading, error };
}
