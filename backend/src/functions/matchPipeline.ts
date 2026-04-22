/**
 * matchPipeline.ts — Cloud Functions v2
 * Uses: onDocumentCreated, onDocumentUpdated (firebase-functions/v2/firestore)
 * Integrates runFlow() to chain AI pipeline after each delivery
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { runFlow } from '@genkit-ai/flow';
import { Delivery, PlayerSeasonStats } from '../types/schemas';
import { runBallAnalysisPipeline } from './httpHandler';
import { liveCommentaryFlow } from '../flows/liveCommentary';
import { teamOfTournamentFlow } from '../flows/teamOfTournament';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE 1 — Real-time: fires on every delivery write (scorer view)
// Chains: live score update → runFlow(commentary) → runFlow(momentum) → writes aiCommentary
// ─────────────────────────────────────────────────────────────────────────────
export const onDeliveryCreated = onDocumentCreated(
  {
    document: 'matches/{matchId}/deliveries/{deliveryId}',
    region: 'us-central1',
    timeoutSeconds: 30,
  },
  async (event) => {
    const delivery = event.data?.data() as Delivery | undefined;
    if (!delivery) return;

    const { matchId, deliveryId } = event.params;
    const matchRef = db.collection('matches').doc(matchId);
    const deliveryRef = db.collection('matches').doc(matchId).collection('deliveries').doc(deliveryId);

    // ── Step A: Update live score transactionally ──────────────────────────
    let currentMomentum = 0;
    let txContext: any = null;

    await db.runTransaction(async (tx) => {
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists) return;

      const match = matchSnap.data()!;
      currentMomentum = match.momentumScore ?? 0;
      const inningsKey = delivery.innings === 1 ? 'homeScore' : 'awayScore';
      const current = match[inningsKey] ?? { runs: 0, wickets: 0, overs: 0 };

      const isLegalBall = !['wide', 'no-ball'].includes(delivery.extraType ?? '');
      const newRuns = current.runs + delivery.runs + delivery.extras;
      const newWickets = current.wickets + (delivery.isWicket ? 1 : 0);
      // Avoid floating-point drift: work in integer ball space, format as cricket overs (X.Y)
      const currentBalls = Math.round(current.overs * 6);
      const newBalls = currentBalls + (isLegalBall ? 1 : 0);
      const newOvers = parseFloat(`${Math.floor(newBalls / 6)}.${newBalls % 6}`);

      let pRuns = (match.partnershipRuns ?? 0) + delivery.runs + delivery.extras;
      let pBalls = (match.partnershipBalls ?? 0) + (isLegalBall ? 1 : 0);

      let oHistory = match.overHistory ?? [];
      let currentOver = oHistory.find((o: any) => o.over === delivery.over);
      if (!currentOver) {
        currentOver = { over: delivery.over, runs: 0, wickets: 0, dots: 0 };
        oHistory.push(currentOver);
      }
      currentOver.runs += delivery.runs + delivery.extras;
      if (delivery.isWicket) currentOver.wickets += 1;
      if (delivery.runs === 0 && delivery.extras === 0 && isLegalBall) currentOver.dots += 1;

      let bStatsMap = match.batsmanStatsMap ?? {};
      if (!bStatsMap[delivery.batsmanId]) bStatsMap[delivery.batsmanId] = { runs: 0, balls: 0 };
      bStatsMap[delivery.batsmanId].runs += delivery.runs;
      if (delivery.extraType !== 'wide') bStatsMap[delivery.batsmanId].balls += 1;

      txContext = {
        partnershipRuns: pRuns,
        partnershipBalls: pBalls,
        overHistory: oHistory,
        batsmanStatsMap: bStatsMap,
        hasExistingHistory: match.overHistory !== undefined
      };

      const nextPRuns = delivery.isWicket ? 0 : pRuns;
      const nextPBalls = delivery.isWicket ? 0 : pBalls;

      tx.update(matchRef, {
        [`${inningsKey}.runs`]: newRuns,
        [`${inningsKey}.wickets`]: newWickets,
        [`${inningsKey}.overs`]: newOvers,
        currentInnings: delivery.innings,
        partnershipRuns: nextPRuns,
        partnershipBalls: nextPBalls,
        overHistory: oHistory,
        batsmanStatsMap: bStatsMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // ── Step B: Compute Context for AI ─────────────────────────────
    let partnershipRuns = 0;
    let partnershipBalls = 0;
    let batsmanRuns = 0;
    let batsmanBalls = 0;
    let overByOverRuns: any[] = [];

    // "Only re-read full deliveries when a wicket falls to reset partnership."
    // We efficiently calculate it during the transaction now, so we only need a full
    // re-read if the match document lacks history (e.g. legacy match migration).
    if (!txContext || !txContext.hasExistingHistory) {
      const prevBalls = await db
        .collection('matches').doc(matchId).collection('deliveries')
        .where('innings', '==', delivery.innings)
        .orderBy('over').orderBy('ball')
        .get();

      const overRunMap = new Map<number, { runs: number; wickets: number; dots: number }>();
      const deliveries = prevBalls.docs.map(d => d.data() as Delivery);
      const lastWicketIndex = deliveries.map(d => d.isWicket).lastIndexOf(true);
      const partnershipDeliveries = lastWicketIndex === -1 ? deliveries : deliveries.slice(lastWicketIndex + 1);

      for (const d of partnershipDeliveries) {
        partnershipRuns += d.runs + d.extras;
        if (!['wide', 'no-ball'].includes(d.extraType ?? '')) {
          partnershipBalls++;
        }
      }

      for (const d of deliveries) {
        const existing = overRunMap.get(d.over) ?? { runs: 0, wickets: 0, dots: 0 };
        const isDot = d.runs === 0 && d.extras === 0 && !['wide', 'no-ball'].includes(d.extraType ?? '');
        
        overRunMap.set(d.over, {
          runs: existing.runs + d.runs + d.extras,
          wickets: existing.wickets + (d.isWicket ? 1 : 0),
          dots: existing.dots + (isDot ? 1 : 0)
        });

        if (d.batsmanId === delivery.batsmanId) {
          batsmanRuns += d.runs;
          if (d.extraType !== 'wide') {
            batsmanBalls++;
          }
        }
      }

      overByOverRuns = Array.from(overRunMap.entries())
        .map(([over, data]) => ({ over, ...data }))
        .sort((a, b) => a.over - b.over);
    } else {
      partnershipRuns = txContext.partnershipRuns;
      partnershipBalls = txContext.partnershipBalls;
      overByOverRuns = txContext.overHistory;
      batsmanRuns = txContext.batsmanStatsMap[delivery.batsmanId]?.runs ?? 0;
      batsmanBalls = txContext.batsmanStatsMap[delivery.batsmanId]?.balls ?? 0;
    }

    // ── Resolve player display names before AI call ─────────────────────────
    // Passing raw Firestore IDs (e.g. "uid_xk29a") would produce broken commentary.
    const [batsmanDoc, bowlerDoc] = await Promise.all([
      db.collection('players').doc(delivery.batsmanId).get(),
      db.collection('players').doc(delivery.bowlerId).get(),
    ]);
    const batsmanName = batsmanDoc.data()?.name ?? delivery.batsmanId;
    const bowlerName = bowlerDoc.data()?.name ?? delivery.bowlerId;

    // ── Step C: Chain runFlow() — commentary + momentum ────────────────────
    const matchSnap = await matchRef.get();
    const match = matchSnap.data()!;
    const inningsKey = delivery.innings === 1 ? 'homeScore' : 'awayScore';
    const scoreText = `${match[inningsKey]?.runs ?? 0}/${match[inningsKey]?.wickets ?? 0}`;
    const battingTeam = delivery.innings === 1 ? match.homeTeamId : match.awayTeamId;
    const bowlerTeam = delivery.innings === 1 ? match.awayTeamId : match.homeTeamId;

    try {
      const { commentary, newMomentumScore } = await runBallAnalysisPipeline({
        innings: delivery.innings,
        battingTeam,
        over: delivery.over,
        ball: delivery.ball,
        score: scoreText,
        currentRunRate: match[inningsKey]?.overs > 0
          ? parseFloat(((match[inningsKey]?.runs ?? 0) / match[inningsKey]?.overs).toFixed(2))
          : 0,
        batsmanName,   // resolved from /players collection
        bowlerName,
        runs: delivery.runs,
        extras: delivery.extras,
        isWicket: delivery.isWicket,
        wicketType: delivery.wicketType ?? null,
        shotZone: delivery.wagWheelZone ?? undefined,
        momentum: currentMomentum,
        partnership: { runs: partnershipRuns, balls: partnershipBalls },
        batsmanStats: { 
          runs: batsmanRuns, 
          balls: batsmanBalls, 
          sr: batsmanBalls > 0 ? parseFloat(((batsmanRuns / batsmanBalls) * 100).toFixed(2)) : 0 
        },
        matchId,
        bowlerTeam,
        format: match.format ?? 'T20',
        overByOverRuns,
      });

      // Write AI commentary back to the delivery doc + update match momentum
      await Promise.all([
        deliveryRef.update({ aiCommentary: commentary }),
        matchRef.update({ momentumScore: newMomentumScore }),
      ]);

      console.log(`[Pipeline:Ball] ${matchId} ${delivery.over}.${delivery.ball} — commentary written, momentum: ${newMomentumScore}`);
    } catch (err) {
      console.error('[Pipeline:Ball] AI pipeline failed:', err);
      // Non-fatal: score was already updated, commentary is optional
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE 2 — Async: fires on match status → "completed"
// Aggregates deliveries → playerStats/seasons for career analytics
// Then chains runFlow(teamOfTournament) to refresh tournament leaderboard
// ─────────────────────────────────────────────────────────────────────────────
export const onMatchCompleted = onDocumentUpdated(
  {
    document: 'matches/{matchId}',
    region: 'us-central1',
    timeoutSeconds: 120,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;
    if (before.status === after.status || after.status !== 'completed') return;

    const { matchId } = event.params;
    const seasonId = new Date().getFullYear().toString();

    console.log(`[Pipeline:Career] Match ${matchId} completed. Aggregating season ${seasonId}...`);

    const deliveriesSnap = await db
      .collection('matches').doc(matchId)
      .collection('deliveries').get();

    const deliveries = deliveriesSnap.docs.map(d => d.data() as Delivery);
    const batsmanMap = new Map<string, Delivery[]>();
    const bowlerMap = new Map<string, Delivery[]>();

    for (const d of deliveries) {
      if (!batsmanMap.has(d.batsmanId)) batsmanMap.set(d.batsmanId, []);
      batsmanMap.get(d.batsmanId)!.push(d);
      if (!bowlerMap.has(d.bowlerId)) bowlerMap.set(d.bowlerId, []);
      bowlerMap.get(d.bowlerId)!.push(d);
    }

    const batch = db.batch();

    // ── Batting aggregation ────────────────────────────────────────────────
    for (const [playerId, balls] of batsmanMap.entries()) {
      const legalBalls = balls.filter(b => b.extraType !== 'wide');
      const runsScored = legalBalls.reduce((s, b) => s + b.runs, 0);
      const ballsFaced = legalBalls.length;
      const isDismissed = balls.some(b => b.isWicket);

      const matchZoneData: Record<string, { shots: number, runs: number, boundaries: number }> = {};
      for (const b of legalBalls) {
        if (b.wagWheelZone) {
          const z = b.wagWheelZone;
          if (!matchZoneData[z]) matchZoneData[z] = { shots: 0, runs: 0, boundaries: 0 };
          matchZoneData[z].shots += 1;
          const r = b.wagWheelRuns ?? b.runs;
          matchZoneData[z].runs += r;
          if (r >= 4) matchZoneData[z].boundaries += 1;
        }
      }

      const statsRef = db.collection('playerStats').doc(playerId).collection('seasons').doc(seasonId);
      const snap = await statsRef.get();
      const existing = snap.exists ? (snap.data() as Partial<PlayerSeasonStats>) : {};

      const newMatches = (existing.matches ?? 0) + 1;
      const newRuns = (existing.runs ?? 0) + runsScored;
      const newInnings = (existing.innings ?? 0) + 1;
      const newNotOuts = (existing.notOuts ?? 0) + (isDismissed ? 0 : 1);
      const dismissed = newInnings - newNotOuts;

      const mergedShotZones: Record<string, any> = {};
      const allZones = ['fineLeg', 'squareLeg', 'midWicket', 'midOn', 'straight', 'midOff', 'cover', 'point', 'thirdMan'];
      const existingShotZones = existing.shotZones as any ?? {};
      for (const z of allZones) {
        const ez = existingShotZones[z];
        const prev = (ez && typeof ez === 'object' && 'shots' in ez) ? ez : { shots: 0, runs: 0, boundaries: 0 };
        const mz = matchZoneData[z] || { shots: 0, runs: 0, boundaries: 0 };
        mergedShotZones[z] = {
          shots: prev.shots + mz.shots,
          runs: prev.runs + mz.runs,
          boundaries: prev.boundaries + mz.boundaries,
        };
      }

      batch.set(statsRef, {
        playerId, seasonId,
        matches: newMatches,
        innings: newInnings,
        runs: newRuns,
        notOuts: newNotOuts,
        avg: dismissed > 0 ? parseFloat((newRuns / dismissed).toFixed(2)) : newRuns,
        strikeRate: ballsFaced > 0 ? parseFloat(((runsScored / ballsFaced) * 100).toFixed(2)) : 0,
        highScore: Math.max(existing.highScore ?? 0, runsScored),
        fifties: (existing.fifties ?? 0) + (runsScored >= 50 && runsScored < 100 ? 1 : 0),
        hundreds: (existing.hundreds ?? 0) + (runsScored >= 100 ? 1 : 0),
        shotZones: mergedShotZones as any,
        formHistory: [
          ...(existing.formHistory ?? []).slice(-9),
          { matchId, runs: runsScored, balls: ballsFaced, result: isDismissed ? 'out' : 'not out', date: new Date().toISOString() },
        ],
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // ── Bowling aggregation ────────────────────────────────────────────────
    for (const [playerId, balls] of bowlerMap.entries()) {
      const legalBalls = balls.filter(b => !['wide', 'no-ball'].includes(b.extraType ?? ''));
      const runsConceded = balls.reduce((s, b) => s + b.runs + b.extras, 0);
      const wicketsTaken = balls.filter(b => b.isWicket && b.wicketType !== 'run-out').length;
      const oversBowled = parseFloat((legalBalls.length / 6).toFixed(1));

      const statsRef = db.collection('playerStats').doc(playerId).collection('seasons').doc(seasonId);
      const snap = await statsRef.get();
      const existing = snap.exists ? (snap.data() as Partial<PlayerSeasonStats>) : {};

      const totalWickets = (existing.wickets ?? 0) + wicketsTaken;
      // Use dedicated bowling accumulators — existing.innings is batting innings count,
      // using it as the overs denominator corrupts economy for all-rounders.
      const totalOvers = (existing.oversBowled ?? 0) + oversBowled;
      const newRunsConceded = (existing.runsConceded ?? 0) + runsConceded;

      batch.set(statsRef, {
        playerId, seasonId,
        wickets: totalWickets,
        oversBowled: totalOvers,
        runsConceded: newRunsConceded,
        economy: totalOvers > 0 ? parseFloat((newRunsConceded / totalOvers).toFixed(2)) : 0,
        bowlingAvg: totalWickets > 0 ? parseFloat((newRunsConceded / totalWickets).toFixed(2)) : null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();
    console.log(`[Pipeline:Career] Stats written — batsmen: ${batsmanMap.size}, bowlers: ${bowlerMap.size}`);

    // ── Step: refresh tournament leaderboard via runFlow() ─────────────────
    if (after.tournamentId) {
      try {
        await refreshTournamentLeaderboard(after.tournamentId, seasonId);
      } catch (err) {
        console.error('[Pipeline:Career] Leaderboard refresh failed:', err);
      }
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE FUNCTION — Client-triggered scouting report generation
// Uses onCall() (v2 httpsCallable) — authenticated, rate-limited by Firebase
// ─────────────────────────────────────────────────────────────────────────────
export const generateScoutingReport = onCall(
  { region: 'us-central1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { playerId, seasonId } = request.data as { playerId: string; seasonId?: string };
    if (!playerId) throw new HttpsError('invalid-argument', 'playerId is required.');

    const season = seasonId ?? new Date().getFullYear().toString();

    // Fetch stats AND player profile in parallel
    const [statsSnap, playerSnap] = await Promise.all([
      db.collection('playerStats').doc(playerId).collection('seasons').doc(season).get(),
      db.collection('players').doc(playerId).get(),
    ]);

    if (!statsSnap.exists) {
      throw new HttpsError('not-found', `No stats found for player ${playerId} in season ${season}.`);
    }

    const stats = statsSnap.data() as PlayerSeasonStats;
    const playerProfile = playerSnap.data();

    // Reshape payload to match scoutingReportFlow's nested `player:` input schema.
    // Previously called with a flat object — caused Zod validation failure on every call.
    // Also fixed: export name is scoutingReportFlow (not scoutingReportsFlow).
    const { scoutingReportFlow } = await import('../flows/scoutingReportsFlow');
    const report = await runFlow(scoutingReportFlow, {
      player: {
        name: playerProfile?.name ?? playerId,
        age: playerProfile?.age ?? 0,
        battingStyle: playerProfile?.battingStyle ?? 'right-hand bat',
        bowlingStyle: playerProfile?.bowlingStyle ?? 'none',
        seasonStats: {
          ...stats,
          vsSpinAvg: stats.vsSpinRating,
          vsSpinSR: stats.vsSpinRating,
          vsPaceAvg: stats.vsPaceRating,
          vsPaceSR: stats.vsPaceRating,
          powerplayRating: stats.phaseRatings?.powerplay ?? 50,
          middleOversRating: stats.phaseRatings?.middleOvers ?? 50,
          deathOversRating: stats.phaseRatings?.death ?? 50,
          dotBallPct: 0,
          boundaryPct: 0,
        },
        shotZones: stats.shotZones ?? {},
        formTrend: 'consistent',
        last5Scores: stats.formHistory.slice(-5).map(f => f.runs),
        careerHighlight: `${stats.runs} runs this season`,
      },
    });

    return report;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — refreshes tournament AI leaderboard via runFlow()
// ─────────────────────────────────────────────────────────────────────────────
async function refreshTournamentLeaderboard(tournamentId: string, seasonId: string) {
  const teamSnap = await db.collection('tournaments').doc(tournamentId).get();
  if (!teamSnap.exists) return;
  const tournament = teamSnap.data()!;

  // Fetch top performers from playerStats
  const statsSnap = await db.collectionGroup('seasons')
    .where('seasonId', '==', seasonId)
    .orderBy('runs', 'desc')
    .limit(20)
    .get();

  // Batch-fetch player display names — prevents AI receiving raw IDs (e.g. "uid_abc123")
  const playerIds = statsSnap.docs.map(d => (d.data() as PlayerSeasonStats).playerId);
  const playerRefs = playerIds.map(id => db.collection('players').doc(id));
  const playerSnaps = playerRefs.length > 0 ? await db.getAll(...playerRefs) : [];
  const nameMap = new Map<string, string>(
    playerSnaps.map(snap => [snap.id, snap.data()?.name ?? snap.id])
  );

  const players = statsSnap.docs.map(d => {
    const s = d.data() as PlayerSeasonStats;
    const hasWickets = (s.wickets ?? 0) > 0;
    const hasRuns = s.runs > 0;
    return {
      playerId: s.playerId,
      name: nameMap.get(s.playerId) ?? s.playerId,
      teamName: '',
      role: hasWickets && hasRuns ? 'all-rounder' : hasWickets ? 'bowler' : 'batsman',
      matches: s.matches,
      runs: s.runs,
      avg: s.avg,
      strikeRate: s.strikeRate,
      wickets: s.wickets ?? 0,
      economy: s.economy,
      bowlingAvg: s.bowlingAvg,
      mvpScore: (s.runs / Math.max(s.matches, 1)) + ((s.wickets ?? 0) * 15),
    };
  });

  const result = await runFlow(teamOfTournamentFlow, {
    tournamentName: tournament.name,
    format: tournament.format,
    players,
  });

  await db.collection('tournaments').doc(tournamentId).update({
    'leaderboard.mvpIndex': result.teamOf11.map((p: any) => ({
      playerId: p.playerId,
      playerName: p.name,
      teamId: '',
      value: 0,
    })),
    leaderboardUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Pipeline:Leaderboard] Tournament ${tournamentId} leaderboard refreshed.`);
}
