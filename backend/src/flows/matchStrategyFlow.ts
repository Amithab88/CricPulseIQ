/**
 * matchStrategyFlow.ts
 * Uses: defineFlow, generate, structuredOutput (output: { schema }), definePrompt
 * Model: gemini15Pro for structured tactical output
 */

import { defineFlow, generate } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { SYSTEM_INSTRUCTION } from '../prompts/prompts';

const StrategyOutputSchema = z.object({
  battingPlan: z.string(),
  bowlingPlan: z.string(),
  keyMatchups: z.array(z.string()),
  fieldingNotes: z.string().optional(),
});

export const matchStrategyFlow = defineFlow(
  {
    name: 'matchStrategyFlow',
    inputSchema: z.object({
      ownTeamName: z.string(),
      ownPlayers: z.array(z.object({
        name: z.string(),
        role: z.string(),
        recentForm: z.string(),
      })),
      opponentTeamName: z.string(),
      opponentPlayers: z.array(z.object({
        name: z.string(),
        role: z.string(),
        vsSpinRating: z.number().optional(),
        vsPaceRating: z.number().optional(),
        weakZones: z.array(z.string()).optional(),
      })),
      venue: z.string(),
      pitchConditions: z.string(),
      weather: z.string(),
      format: z.enum(['T20', 'ODI', 'Test']),
      tossDecision: z.enum(['bat', 'bowl']).optional(),
    }),
    outputSchema: StrategyOutputSchema,
  },
  async (input) => {
    const ownTeamSummary = input.ownPlayers
      .map(p => `- ${p.name} (${p.role}): Form — ${p.recentForm}`)
      .join('\n');

    const opponentSummary = input.opponentPlayers
      .map(p => {
        const ratings = [
          p.vsPaceRating !== undefined ? `vs Pace ${p.vsPaceRating}/100` : null,
          p.vsSpinRating !== undefined ? `vs Spin ${p.vsSpinRating}/100` : null,
          p.weakZones?.length ? `Weak zones: ${p.weakZones.join(', ')}` : null,
        ].filter(Boolean).join(', ');
        return `- ${p.name} (${p.role}): ${ratings || 'No data'}`;
      })
      .join('\n');

    const tossLine = input.tossDecision ? `Toss decision: ${input.tossDecision}` : '';

    const llmResponse = await generate({
      model: gemini15Pro,
      prompt: `${SYSTEM_INSTRUCTION}

TASK: Generate a targeted pre-match plan for ${input.ownTeamName} vs ${input.opponentTeamName}.

Format: ${input.format} | Venue: ${input.venue}
Pitch: ${input.pitchConditions}
Weather: ${input.weather}
${tossLine}

OUR SQUAD:
${ownTeamSummary}

OPPONENT INTEL:
${opponentSummary}

Return JSON: "battingPlan" (player-specific batting tactics referencing opponent's best bowlers), "bowlingPlan" (bowler assignments targeting opponent weaknesses by name), "keyMatchups" (array — each a direct 1v1 e.g. "Our leg-spinner Ravi vs their captain who rates 38/100 vs spin"), "fieldingNotes" (optional fielding adjustments from wagon wheel tendencies).`,
      config: { temperature: 0.6 },
      // structuredOutput: type-safe JSON output via output.schema
      output: {
        format: 'json',
        schema: StrategyOutputSchema,
      },
    });

    return llmResponse.output() ?? {
      battingPlan: 'Insufficient data for a full plan.',
      bowlingPlan: 'Insufficient data for a full plan.',
      keyMatchups: [],
    };
  }
);
