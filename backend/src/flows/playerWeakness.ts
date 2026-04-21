import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';

const PlayerWeaknessInput = z.object({
  playerName: z.string(),
  seasonStats: z.object({
    vsSpinAvg: z.number(),
    vsSpinSR: z.number(),
    vsPaceAvg: z.number(),
    vsPaceSR: z.number(),
    powerplayAvg: z.number(),
    powerplaySR: z.number(),
    middleOversAvg: z.number(),
    middleOversSR: z.number(),
    deathOversAvg: z.number(),
    deathOversSR: z.number(),
    dotBallPercentage: z.number(),
    boundaryPercentage: z.number(),
  }),
  recentForm: z.array(z.object({
    runs: z.number(),
    balls: z.number(),
    dismissal: z.string(),
  })),
  shotZoneData: z.record(z.string(), z.object({
    shots: z.number(),
    runs: z.number(),
    boundaries: z.number(),
  })),
});

const PlayerWeaknessOutput = z.object({
  biggestWeakness: z.string(),
  exploitablePatterns: z.array(z.string()),
  strongestPhase: z.object({
    phase: z.string(),
    reason: z.string(),
  }),
  bowlingStrategy: z.string(),
  overallRating: z.enum(["fragile", "inconsistent", "solid", "match-winner"]),
});

const SYSTEM_PROMPT = `You are an elite cricket analyst working for a grassroots club. You think like a data scientist but communicate like a coach. Be direct. Avoid generic cricket advice — every insight must be grounded in the specific numbers provided.`;

export const playerWeaknessFlow = defineFlow(
  {
    name: 'playerWeaknessFlow',
    inputSchema: PlayerWeaknessInput,
    outputSchema: PlayerWeaknessOutput,
  },
  async (input) => {
    const { playerName, seasonStats, recentForm, shotZoneData } = input;

    const userPrompt = `Analyse ${playerName}'s batting profile from this season's data. Identify:

1. Their single biggest technical weakness (be specific — e.g. "averages 8.2 against off-spin in the powerplay" not "struggles against spin")
2. Two exploitable patterns in their shot zone data
3. Their strongest phase and why the team should protect them in that phase
4. A specific bowling strategy a captain should use against them next match

SEASON STATS:
${JSON.stringify(seasonStats, null, 2)}

RECENT FORM:
${JSON.stringify(recentForm, null, 2)}

SHOT ZONE DATA:
${JSON.stringify(shotZoneData, null, 2)}

Return exactly as JSON matching the specified schema.`;

    const llmResponse = await generate({
      model: gemini15Pro,
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.5 },
      output: {
        format: 'json',
        schema: PlayerWeaknessOutput,
      },
    });

    return llmResponse.output() ?? {
      biggestWeakness: "Unknown technical weakness due to sparse data.",
      exploitablePatterns: ["No distinct patterns identified.", "Monitor upcoming matches."],
      strongestPhase: { phase: "Unknown", reason: "Insufficient phase data." },
      bowlingStrategy: "Use standard stock deliveries until a pattern emerges.",
      overallRating: "solid",
    };
  }
);
