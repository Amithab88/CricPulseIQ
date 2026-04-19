/**
 * scoutingReportsFlow.ts
 * Uses: defineFlow, generate, structuredOutput (output: { schema }), definePrompt
 * Model: gemini15Pro — high-quality structured scouting analysis
 */

import { defineFlow, generate } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { buildPlayerContext } from '../prompts/systemPrompt';
import { SYSTEM_INSTRUCTION } from '../prompts/prompts';

const ScoutingOutputSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  bowlingLineLength: z.string(),
  fieldingConfiguration: z.string(),
  riskRating: z.enum(['Low', 'Medium', 'High', 'Danger']),
});

export const scoutingReportsFlow = defineFlow(
  {
    name: 'scoutingReportsFlow',
    inputSchema: z.object({
      playerName: z.string(),
      role: z.string(),
      recentForm: z.string(),
      careerStats: z.object({
        matches: z.number(),
        runs: z.number(),
        avg: z.number(),
        strikeRate: z.number(),
        highScore: z.number(),
        fifties: z.number(),
        hundreds: z.number(),
      }),
      phaseRatings: z.object({
        powerplay: z.number(),
        middleOvers: z.number(),
        death: z.number(),
      }),
      vsSpinRating: z.number(),
      vsPaceRating: z.number(),
      shotZones: z.record(z.string(), z.number()),
    }),
    outputSchema: ScoutingOutputSchema,
  },
  async (input) => {
    const playerCtx = buildPlayerContext({
      playerName: input.playerName,
      role: input.role,
      recentForm: input.recentForm,
      vsSpinRating: input.vsSpinRating,
      vsPaceRating: input.vsPaceRating,
      phaseRatings: input.phaseRatings,
    });

    const careerStr = `Career: ${input.careerStats.matches} matches, ${input.careerStats.runs} runs, avg ${input.careerStats.avg}, SR ${input.careerStats.strikeRate}, HS ${input.careerStats.highScore}, ${input.careerStats.fifties} fifties, ${input.careerStats.hundreds} hundreds`;

    const shotZoneStr = Object.entries(input.shotZones)
      .sort(([, a], [, b]) => b - a)
      .map(([zone, pct]) => `${zone}: ${pct}%`)
      .join(', ');

    const llmResponse = await generate({
      model: gemini15Pro,
      prompt: `${SYSTEM_INSTRUCTION}

TASK: Generate a detailed opposition scouting report. Coaches will use this in a team meeting. Be direct.

PLAYER PROFILE:
${playerCtx}
${careerStr}
Shot Zones (wagon wheel): ${shotZoneStr}

Return JSON:
- "summary": 2-3 sentences stating this player's biggest asset and primary weakness. No hedging.
- "strengths": Array of up to 3 specific strengths with stat references.
- "weaknesses": Array of up to 3 specific exploitable weaknesses with stat references.
- "bowlingLineLength": Exact recommended plan — hand, pace type, line, length.
- "fieldingConfiguration": Key fielder positions from their hot zones.
- "riskRating": "Low" | "Medium" | "High" | "Danger".`,
      config: { temperature: 0.55 },
      // structuredOutput via output.schema
      output: {
        format: 'json',
        schema: ScoutingOutputSchema,
      },
    });

    return llmResponse.output() ?? {
      summary: 'Insufficient data for a full scouting report.',
      strengths: [],
      weaknesses: [],
      bowlingLineLength: 'N/A',
      fieldingConfiguration: 'N/A',
      riskRating: 'Medium' as const,
    };
  }
);
