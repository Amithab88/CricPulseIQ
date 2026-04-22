import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';

const ScoringStats = z.object({
  matches: z.number(),
  runs: z.number(),
  avg: z.number(),
  strikeRate: z.number(),
  highScore: z.number(),
  fifties: z.number(),
  hundreds: z.number(),
  vsSpinAvg: z.number(),
  vsSpinSR: z.number(),
  vsPaceAvg: z.number(),
  vsPaceSR: z.number(),
  powerplayRating: z.number(),
  middleOversRating: z.number(),
  deathOversRating: z.number(),
  dotBallPct: z.number(),
  boundaryPct: z.number(),
});

const ScoutingReportInput = z.object({
  player: z.object({
    name: z.string(),
    age: z.number(),
    battingStyle: z.string(),
    bowlingStyle: z.string(),
    seasonStats: ScoringStats,
    shotZones: z.record(z.string(), z.object({ shots: z.number(), runs: z.number() })),
    formTrend: z.enum(["improving", "declining", "consistent"]),
    last5Scores: z.array(z.number()),
    careerHighlight: z.string(),
  }),
});

const ScoutingReportOutput = z.object({
  paragraph1_profile: z.string(),
  paragraph2_weaknesses: z.string(),
  paragraph3_strategy: z.string(),
  scoutingVerdict: z.enum(["avoid", "monitor", "recruit", "prioritise"]),
  keyBowlingTactic: z.string(),
});

const SYSTEM_PROMPT = `You are a professional cricket scout writing reports for a county cricket academy. Your reports are used by coaches to make selection and game-planning decisions. You are analytical, specific, and direct. You do not write generic observations — every sentence must reference specific statistics or observable patterns.`;

export const scoutingReportFlow = defineFlow(
  {
    name: 'scoutingReportFlow',
    inputSchema: ScoutingReportInput,
    outputSchema: ScoutingReportOutput,
  },
  async (input: any) => {
    const { player } = input;
    const s = player.seasonStats;

    const topZones = Object.entries(player.shotZones)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.runs - a.runs)
      .slice(0, 3)
      .map(([zone, data]: [string, any]) => `${zone} (${data.runs} runs)`)
      .join(', ');

    const userPrompt = `Write a professional three-paragraph scouting report on ${player.name} (${player.battingStyle} bat, ${player.bowlingStyle}).

Season stats: Avg ${s.avg}, SR ${s.strikeRate}, HS ${s.highScore}, ${s.fifties} fifties, ${s.hundreds} hundreds.
vs Spin: Avg ${s.vsSpinAvg}, SR ${s.vsSpinSR} | vs Pace: Avg ${s.vsPaceAvg}, SR ${s.vsPaceSR}
Phase ratings (0-10): Powerplay ${s.powerplayRating}, Middle overs ${s.middleOversRating}, Death ${s.deathOversRating}
Shot zone dominance: ${topZones}
Form trend: ${player.formTrend}. Last 5 scores: ${player.last5Scores.join(', ')}

Paragraph 1: Overall profile and batting identity — what kind of batter is this player?
Paragraph 2: Specific weaknesses — reference exact stats, name specific delivery types and field placements to exploit
Paragraph 3: Strategic value — when and how a captain should use this player, and one thing they could do to improve their rating by a full tier

Return exactly as JSON matching the specified schema.`;

    const llmResponse = await generate({
      model: gemini15Pro,
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.45 },
      output: {
        format: 'json',
        schema: ScoutingReportOutput,
      },
    });

    return llmResponse.output() ?? {
      paragraph1_profile: "Insufficient data.",
      paragraph2_weaknesses: "Insufficient data.",
      paragraph3_strategy: "Insufficient data.",
      scoutingVerdict: "monitor" as const,
      keyBowlingTactic: "Unknown.",
    };
  }
);
