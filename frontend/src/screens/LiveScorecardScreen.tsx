import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLiveScorecard } from '../hooks/useCricPulseIQ';

// Demo matchId — in production, pass via route params
const DEMO_MATCH_ID = 'match_001';

function BallDot({ delivery }: { delivery: any }) {
  const bg = delivery.isWicket
    ? '#ef4444'
    : delivery.extras > 0
    ? '#f59e0b'
    : delivery.runs === 4
    ? '#22c55e'
    : delivery.runs === 6
    ? '#a855f7'
    : '#374151';

  return (
    <View style={[styles.ballDot, { backgroundColor: bg }]}>
      <Text style={styles.ballDotText}>
        {delivery.isWicket ? 'W' : delivery.extras > 0 ? 'E' : delivery.runs}
      </Text>
    </View>
  );
}

export default function LiveScorecardScreen() {
  const { match, deliveries, currentOver, latestCommentary, isConnected, error } =
    useLiveScorecard(DEMO_MATCH_ID);

  if (!isConnected && !match) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Connecting to live feed…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠ {error}</Text>
      </View>
    );
  }

  const homeScore = match?.homeScore;
  const awayScore = match?.awayScore;
  const isBattingHome = match?.currentInnings === 1;
  const battingScore = isBattingHome ? homeScore : awayScore;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Match header */}
      <View style={styles.matchHeader}>
        <Text style={styles.teams}>{match?.homeTeam ?? '—'} vs {match?.awayTeam ?? '—'}</Text>
        <View style={[styles.statusPill, match?.status === 'live' ?? false ? styles.statusLive : styles.statusOther]}>
          <Text style={styles.statusText}>{(match?.status ?? 'unknown').toUpperCase()}</Text>
        </View>
      </View>

      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        <Text style={styles.scoreMain}>
          {battingScore?.runs ?? 0}/{battingScore?.wickets ?? 0}
        </Text>
        <Text style={styles.overText}>({battingScore?.overs?.toFixed(1) ?? '0.0'} Ov)</Text>
        <View style={styles.momentumBar}>
          <View style={[styles.momentumFill, { width: `${Math.max(2, (match?.momentumScore ?? 0) + 100) / 2}%` }]} />
        </View>
        <Text style={styles.momentumLabel}>Momentum</Text>
      </View>

      {/* Current over dots */}
      <View style={styles.overSection}>
        <Text style={styles.sectionTitle}>This Over</Text>
        <View style={styles.dotsRow}>
          {currentOver.map((d, i) => <BallDot key={i} delivery={d} />)}
          {currentOver.length === 0 && <Text style={styles.dimText}>Waiting for first ball…</Text>}
        </View>
      </View>

      {/* AI Commentary */}
      {latestCommentary ? (
        <View style={styles.commentaryBox}>
          <Text style={styles.commentaryLabel}>AI Commentary</Text>
          <Text style={styles.commentaryText}>{latestCommentary}</Text>
        </View>
      ) : null}

      {/* Last 10 deliveries */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
        {deliveries.slice(-10).reverse().map((d, i) => (
          <View key={i} style={styles.deliveryRow}>
            <Text style={styles.deliveryOver}>{d.over}.{d.ball}</Text>
            <View style={[styles.ballDot, { backgroundColor: d.isWicket ? '#ef4444' : '#374151', width: 28, height: 28, borderRadius: 14 }]}>
              <Text style={styles.ballDotText}>{d.isWicket ? 'W' : d.runs}</Text>
            </View>
            <Text style={styles.deliveryDetail}>
              {d.batsmanId} · {d.bowlerId}
              {d.wagWheelZone ? ` · ${d.wagWheelZone}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#9ca3af', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  teams: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusLive: { backgroundColor: '#dc2626' },
  statusOther: { backgroundColor: '#374151' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scoreboard: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#1a1d27', marginHorizontal: 16, borderRadius: 16, marginBottom: 16 },
  scoreMain: { color: '#fff', fontSize: 52, fontWeight: '800' },
  overText: { color: '#9ca3af', fontSize: 16 },
  momentumBar: { width: '80%', height: 6, backgroundColor: '#374151', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  momentumFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 3 },
  momentumLabel: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  overSection: { padding: 16 },
  sectionTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  dotsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ballDot: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  ballDotText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dimText: { color: '#6b7280', fontSize: 13 },
  commentaryBox: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1d27', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  commentaryLabel: { color: '#2563eb', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  commentaryText: { color: '#e5e7eb', fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  section: { paddingHorizontal: 16 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  deliveryOver: { color: '#6b7280', fontSize: 12, width: 28 },
  deliveryDetail: { color: '#9ca3af', fontSize: 13, flex: 1 },
});
