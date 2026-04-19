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
export type ChatMessage = { role: 'user' | 'coach'; content: string };

export interface PlayerProfileInput {
  playerName: string;
  role: string;
  recentForm: string;
  vsSpinRating?: number;
  vsPaceRating?: number;
  phaseRatings?: { powerplay?: number; middleOvers?: number; death?: number };
  shotZones?: Record<string, number>;
}

export function useAICoach(playerProfile: PlayerProfileInput) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [streamBuffer, setStreamBuffer] = useState('');      // partial streaming reply
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const sendMessage = useCallback(async (userMessage: string, useStreaming = true) => {
    setError(null);
    abortRef.current = false;
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(updatedHistory);

    if (useStreaming) {
      setIsStreaming(true);
      setStreamBuffer('');
      try {
        const fullReply = await streamFlow(
          'aiCoachChatFlow',
          { ...playerProfile, chatHistory: updatedHistory, userMessage },
          (chunk) => {
            if (!abortRef.current) setStreamBuffer(prev => prev + chunk);
          },
        );
        if (!abortRef.current) {
          setChatHistory(prev => [...prev, { role: 'coach', content: fullReply }]);
          setStreamBuffer('');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsStreaming(false);
      }
    } else {
      // Non-streaming: structured output with follow-ups
      try {
        const result = await callFlow<object, { coachReply: string; suggestedFollowUps: string[] }>(
          'aiCoachChatFlow',
          { ...playerProfile, chatHistory: updatedHistory, userMessage, streaming: false },
        );
        setChatHistory(prev => [...prev, { role: 'coach', content: result.coachReply }]);
        setSuggestedFollowUps(result.suggestedFollowUps);
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, [chatHistory, playerProfile]);

  const stopStream = useCallback(() => { abortRef.current = true; setIsStreaming(false); }, []);
  const clearHistory = useCallback(() => {
    setChatHistory([]);
    setSuggestedFollowUps([]);
    setStreamBuffer('');
  }, []);

  return {
    chatHistory,
    streamBuffer,       // partial reply to render while streaming
    isStreaming,
    suggestedFollowUps,
    sendMessage,
    stopStream,
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
// useMatchStrategy — async strategy generation
// ═══════════════════════════════════════════════════════════════════════════════
export type StrategyInput = {
  ownTeamName: string;
  ownPlayers: { name: string; role: string; recentForm: string }[];
  opponentTeamName: string;
  opponentPlayers: { name: string; role: string; vsSpinRating?: number; vsPaceRating?: number; weakZones?: string[] }[];
  venue: string;
  pitchConditions: string;
  weather: string;
  format: 'T20' | 'ODI' | 'Test';
  tossDecision?: 'bat' | 'bowl';
};

export type StrategyOutput = {
  battingPlan: string;
  bowlingPlan: string;
  keyMatchups: string[];
  fieldingNotes?: string;
};

export function useMatchStrategy() {
  const [strategy, setStrategy] = useState<StrategyOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (input: StrategyInput) => {
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
  return { strategy, generate, reset, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// usePlayerProfile — real-time stats + on-demand scouting (httpsCallable)
// ═══════════════════════════════════════════════════════════════════════════════
export function usePlayerProfile(playerId: string, seasonId?: string) {
  const [stats, setStats] = useState<PlayerSeasonStats | null>(null);
  const [scoutingReport, setScoutingReport] = useState<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    bowlingLineLength: string;
    fieldingConfiguration: string;
    riskRating: 'Low' | 'Medium' | 'High' | 'Danger';
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

  // On-demand scouting via Firebase httpsCallable (auth-aware)
  const fetchScoutingReport = useCallback(async () => {
    if (!stats) { setError('No stats available.'); return null; }
    setIsLoadingReport(true);
    setError(null);
    try {
      const fns = getFunctions();
      const callable = httpsCallable<{ playerId: string; seasonId: string }, typeof scoutingReport>(
        fns, 'generateScoutingReport'
      );
      const result = await callable({ playerId, seasonId: season });
      setScoutingReport(result.data);
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoadingReport(false);
    }
  }, [playerId, season, stats]);

  return { stats, scoutingReport, fetchScoutingReport, isLoadingStats, isLoadingReport, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useMomentumAnalysis — fires after each over completes
// ═══════════════════════════════════════════════════════════════════════════════
export function useMomentumAnalysis(matchId: string) {
  const [momentumData, setMomentumData] = useState<{
    momentumScore: number;
    momentumNarrative: string;
    turningPoints: { over: number; description: string }[];
    phaseVerdict: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async (input: {
    battingTeam: string;
    bowlingTeam: string;
    format: 'T20' | 'ODI' | 'Test';
    innings: number;
    overByOverRuns: { over: number; runs: number; wickets: number }[];
    currentMomentum: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callFlow('momentumAnalysisFlow', { matchId, ...input });
      setMomentumData(result as typeof momentumData);
      return result;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  return { momentumData, analyse, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useFieldPlacement — live field recommendation per ball
// ═══════════════════════════════════════════════════════════════════════════════
export function useFieldPlacement() {
  const [field, setField] = useState<{
    recommendedField: { position: string; reason: string }[];
    keyPosition: string;
    fieldRationale: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommend = useCallback(async (input: {
    batsmanName: string;
    batsmanShotZones: Record<string, number>;
    bowlerName: string;
    bowlerType: string;
    format: 'T20' | 'ODI' | 'Test';
    overPhase: 'powerplay' | 'middleOvers' | 'death';
    score: string;
    target?: number;
    currentOver: number;
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
