import { defineFlow } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT, buildPlayerContext } from '../prompts/systemPrompt';

export const playerWeaknessFlow = defineFlow(
  {
    name: 'playerWeaknessFlow',
    inputSchema: z.object({
      playerName: z.string(),
      role: z.string(),
      recentForm: z.string(),
      vsSpinRating: z.number(),
      vsPaceRating: z.number(),
      phaseRatings: z.object({
        powerplay: z.number(),
        middleOvers: z.number(),
        death: z.number(),
      }),
      shotZones: z.record(z.string(), z.number()),
      deliveryData: z.array(z.object({
        bowlerType: z.string(),
        pitchLength: z.string(),
        pitchLine: z.string(),
        runs: z.number(),
        isDismissed: z.boolean(),
      })).optional(),
    }),
    outputSchema: z.object({
      primaryWeakness: z.string(),
      secondaryWeakness: z.string(),
      coldZones: z.array(z.string()),
      exploitPlan: z.string(),
      confidenceLevel: z.enum(['Low', 'Medium', 'High']),
    }),
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

    const coldZonesRaw = Object.entries(input.shotZones)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([zone]) => zone);

    const deliverySummary = input.deliveryData
      ? `Delivery pattern analysis: ${input.deliveryData.length} balls faced — dismissals: ${input.deliveryData.filter(d => d.isDismissed).map(d => `${d.pitchLength} ${d.pitchLine} (${d.bowlerType})`).join(', ') || 'none recorded'}`
      : 'No delivery-level data available.';

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: Identify this player's primary exploitable weaknesses for opposition planning.

PLAYER:
${playerCtx}
Cold shot zones (least runs): ${coldZonesRaw.join(', ')}
${deliverySummary}

Return JSON:
- "primaryWeakness": Most exploitable weakness — be specific (e.g. "Struggles against left-arm pace outside off stump at good length in death overs, SR drops to sub-100").
- "secondaryWeakness": Second exploitable pattern.
- "coldZones": Array of 2-3 least productive field zones percentage-wise.
- "exploitPlan": Bowling plan in 2 sentences — specific length, line, pace type.
- "confidenceLevel": "Low" | "Medium" | "High" based on data richness.`;

    const response = await generate({
      model: gemini15Pro,
      prompt,
      config: { temperature: 0.55 },
      output: {
        format: 'json',
        schema: z.object({
          primaryWeakness: z.string(),
          secondaryWeakness: z.string(),
          coldZones: z.array(z.string()),
          exploitPlan: z.string(),
          confidenceLevel: z.enum(['Low', 'Medium', 'High']),
        }),
      },
    });

    return response.output() ?? {
      primaryWeakness: 'Insufficient data.',
      secondaryWeakness: 'Insufficient data.',
      coldZones: coldZonesRaw,
      exploitPlan: 'N/A',
      confidenceLevel: 'Low' as const,
    };
  }
);
