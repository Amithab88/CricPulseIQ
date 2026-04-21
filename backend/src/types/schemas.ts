import * as z from 'zod';

// ─── Club ────────────────────────────────────────────────────────────────────
export const ClubSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  logoUrl: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type Club = z.infer<typeof ClubSchema>;

// ─── Player ──────────────────────────────────────────────────────────────────
export const PlayerRoleSchema = z.enum(['batsman', 'bowler', 'all-rounder', 'wicket-keeper']);
export type PlayerRole = z.infer<typeof PlayerRoleSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  name: z.string(),
  role: PlayerRoleSchema,
  battingStyle: z.string(),
  bowlingStyle: z.string().optional(),
  jerseyNo: z.number().int().min(1).max(99),
  photoUrl: z.string().min(1).optional(),
});
export type Player = z.infer<typeof PlayerSchema>;

// ─── Match ───────────────────────────────────────────────────────────────────
export const MatchFormatSchema = z.enum(['T20', 'ODI', 'Test']);
export type MatchFormat = z.infer<typeof MatchFormatSchema>;

export const MatchStatusSchema = z.enum(['upcoming', 'live', 'completed', 'abandoned']);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const InningsScoreSchema = z.object({
  runs: z.number().int().min(0),
  wickets: z.number().int().min(0).max(10),
  overs: z.number().min(0),
});
export type InningsScore = z.infer<typeof InningsScoreSchema>;

export const MatchSchema = z.object({
  id: z.string(),
  tournamentId: z.string().optional(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  venue: z.string(),
  date: z.string().datetime(),
  format: MatchFormatSchema,
  currentInnings: z.number().int().min(1).max(4),
  homeScore: InningsScoreSchema,
  awayScore: InningsScoreSchema,
  status: MatchStatusSchema,
  toss: z.object({
    wonByTeamId: z.string(),
    decision: z.enum(['bat', 'bowl']),
  }).optional(),
  momentumScore: z.number().min(-100).max(100).default(0),
});
export type Match = z.infer<typeof MatchSchema>;

// ─── Delivery ────────────────────────────────────────────────────────────────
export const ExtraTypeSchema = z.enum(['wide', 'no-ball', 'leg-bye', 'bye']).optional();
export const WicketTypeSchema = z.enum(['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket']).optional();

export const WagonWheelZoneSchema = z.enum([
  'fineLeg', 'squareLeg', 'midWicket', 'midOn',
  'straight', 'midOff', 'cover', 'point', 'thirdMan',
]);
export type WagonWheelZone = z.infer<typeof WagonWheelZoneSchema>;

export const PitchLengthSchema = z.enum(['yorker', 'full', 'good', 'short']);
export const PitchLineSchema = z.enum(['outside-off', 'middle', 'leg', 'outside-leg']);

export const DeliverySchema = z.object({
  id: z.string(),
  matchId: z.string(),
  innings: z.number().int().min(1),
  over: z.number().int().min(0),
  ball: z.number().int().min(1).max(8),
  batsmanId: z.string(),
  batsmanTeamId: z.string(),
  bowlerId: z.string(),
  bowlerTeamId: z.string(),
  runs: z.number().int().min(0),
  extras: z.number().int().min(0).default(0),
  extraType: ExtraTypeSchema,
  isWicket: z.boolean().default(false),
  wicketType: WicketTypeSchema,
  wagWheelZone: WagonWheelZoneSchema.optional(),
  wagWheelRuns: z.number().int().min(0).optional(),
  pitchLength: PitchLengthSchema.optional(),
  pitchLine: PitchLineSchema.optional(),
  aiCommentary: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

// ─── PlayerStats ─────────────────────────────────────────────────────────────
export const ShotZoneDataSchema = z.object({
  shots: z.number().int().min(0),
  runs: z.number().int().min(0),
  boundaries: z.number().int().min(0),
});

export const ShotZonesSchema = z.object({
  fineLeg: ShotZoneDataSchema,
  squareLeg: ShotZoneDataSchema,
  midWicket: ShotZoneDataSchema,
  midOn: ShotZoneDataSchema,
  straight: ShotZoneDataSchema,
  midOff: ShotZoneDataSchema,
  cover: ShotZoneDataSchema,
  point: ShotZoneDataSchema,
  thirdMan: ShotZoneDataSchema,
});
export type ShotZones = z.infer<typeof ShotZonesSchema>;

export const PhaseRatingsSchema = z.object({
  powerplay: z.number().min(0).max(100),
  middleOvers: z.number().min(0).max(100),
  death: z.number().min(0).max(100),
});

export const FormEntrySchema = z.object({
  matchId: z.string(),
  runs: z.number().int(),
  balls: z.number().int(),
  result: z.string(),
  date: z.string().datetime(),
});

export const PlayerSeasonStatsSchema = z.object({
  playerId: z.string(),
  seasonId: z.string(),
  matches: z.number().int(),
  innings: z.number().int(),
  runs: z.number().int(),
  avg: z.number(),
  strikeRate: z.number(),
  highScore: z.number().int(),
  notOuts: z.number().int(),
  fifties: z.number().int(),
  hundreds: z.number().int(),
  // Bowling
  wickets: z.number().int().default(0),
  oversBowled: z.number().optional(),
  runsConceded: z.number().int().optional(),
  bowlingAvg: z.number().optional(),
  economy: z.number().optional(),
  // AI feature ratings
  phaseRatings: PhaseRatingsSchema,
  vsSpinRating: z.number().min(0).max(100),
  vsPaceRating: z.number().min(0).max(100),
  shotZones: ShotZonesSchema,
  formHistory: z.array(FormEntrySchema),
  updatedAt: z.string().datetime(),
});
export type PlayerSeasonStats = z.infer<typeof PlayerSeasonStatsSchema>;

// ─── Tournament ───────────────────────────────────────────────────────────────
export const TournamentStatusSchema = z.enum(['upcoming', 'active', 'completed']);

export const StandingSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  played: z.number().int(),
  wins: z.number().int(),
  losses: z.number().int(),
  ties: z.number().int(),
  points: z.number().int(),
  nrr: z.number(),
});
export type Standing = z.infer<typeof StandingSchema>;

export const LeaderboardEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  teamId: z.string(),
  value: z.number(),
});

export const TournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: MatchFormatSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  teamIds: z.array(z.string()),
  status: TournamentStatusSchema,
  leaderboard: z.object({
    topBatsmen: z.array(LeaderboardEntrySchema),
    topBowlers: z.array(LeaderboardEntrySchema),
    mvpIndex: z.array(LeaderboardEntrySchema),
  }),
});
export type Tournament = z.infer<typeof TournamentSchema>;

export const FixtureSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  matchId: z.string().optional(),
  date: z.string().datetime(),
  venue: z.string(),
  result: z.string().optional(),
});
export type Fixture = z.infer<typeof FixtureSchema>;
