import { defineFlow } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT } from '../prompts/systemPrompt';

const FielderPositionSchema = z.object({
  position: z.string(),
  reason: z.string(),
});

export const fieldPlacementFlow = defineFlow(
  {
    name: 'fieldPlacementFlow',
    inputSchema: z.object({
      batsmanName: z.string(),
      batsmanShotZones: z.record(z.string(), z.number()),
      bowlerName: z.string(),
      bowlerType: z.string(),
      format: z.enum(['T20', 'ODI', 'Test']),
      overPhase: z.enum(['powerplay', 'middleOvers', 'death']),
      score: z.string(),
      target: z.number().optional(),
      currentOver: z.number(),
    }),
    outputSchema: z.object({
      recommendedField: z.array(FielderPositionSchema),
      keyPosition: z.string(),
      fieldRationale: z.string(),
    }),
  },
  async (input) => {
    const hotZones = Object.entries(input.batsmanShotZones)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([zone, pct]) => `${zone} (${pct}%)`)
      .join(', ');

    const coldZones = Object.entries(input.batsmanShotZones)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([zone]) => zone)
      .join(', ');

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: Recommend an optimal field placement for this exact match situation. Be specific about fielder positions.

Batsman: ${input.batsmanName}
Hot zones (most productive): ${hotZones}
Cold zones (least productive): ${coldZones}
Bowler: ${input.bowlerName} (${input.bowlerType})
Format: ${input.format} | Phase: ${input.overPhase} | Over: ${input.currentOver}
Score: ${input.score}${input.target ? ` | Target: ${input.target}` : ''}

Return JSON:
- "recommendedField": Array of up to 8 objects {position, reason} — each position named precisely (e.g. "Deep square leg", "Backward point") with a one-line tactical reason referencing the batsman or bowler.
- "keyPosition": The single most important fielder to place — and exactly why.
- "fieldRationale": 2 sentence overall field rationale for this matchup.`;

    const response = await generate({
      model: gemini15Flash,
      prompt,
      config: { temperature: 0.65 },
      output: {
        format: 'json',
        schema: z.object({
          recommendedField: z.array(FielderPositionSchema),
          keyPosition: z.string(),
          fieldRationale: z.string(),
        }),
      },
    });

    return response.output() ?? {
      recommendedField: [],
      keyPosition: 'N/A',
      fieldRationale: 'Insufficient data.',
    };
  }
);
