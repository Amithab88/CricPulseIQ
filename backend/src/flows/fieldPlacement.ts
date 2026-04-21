import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';

const ShotZoneDetail = z.object({
  shots: z.number(),
  runs: z.number(),
  boundaries: z.number(),
});

const ShotZonesSchema = z.object({
  fineLeg: ShotZoneDetail,
  squareLeg: ShotZoneDetail,
  midWicket: ShotZoneDetail,
  midOn: ShotZoneDetail,
  straight: ShotZoneDetail,
  midOff: ShotZoneDetail,
  cover: ShotZoneDetail,
  point: ShotZoneDetail,
  thirdMan: ShotZoneDetail,
});

const FieldPlacementInput = z.object({
  batsmanName: z.string(),
  currentDelivery: z.object({
    totalBalls: z.number(),
    totalRuns: z.number(),
    strikeRate: z.number(),
  }),
  shotZones: ShotZonesSchema,
  careerZoneData: ShotZonesSchema.nullable(),
  bowlingType: z.enum(["pace", "spin", "medium"]),
  matchSituation: z.string(),
});

const FieldPlacementOutput = z.object({
  fieldChanges: z.array(z.object({
    moveFrom: z.string(),
    moveTo: z.string(),
    reason: z.string(),
  })).min(1).max(3),
  bowlingLineAdjustment: z.string(),
  primaryWeakness: z.string(),
  confidenceLevel: z.enum(["high", "medium", "low"]),
});

const SYSTEM_PROMPT = `You are a tactical cricket analyst. You speak like a county coach — direct, specific, zero waffle. When you say "move fine leg", you mean exactly that.`;

export const fieldPlacementFlow = defineFlow(
  {
    name: 'fieldPlacementFlow',
    inputSchema: FieldPlacementInput,
    outputSchema: FieldPlacementOutput,
  },
  async (input) => {
    const { batsmanName, currentDelivery: cur, shotZones, careerZoneData, bowlingType, matchSituation } = input;

    const userPrompt = `${batsmanName} has scored ${cur.totalRuns} off ${cur.totalBalls} balls (SR: ${cur.strikeRate}).

Shot zone breakdown (this innings): ${JSON.stringify(shotZones, null, 2)}
${careerZoneData ? 'Career zone data also available: ' + JSON.stringify(careerZoneData, null, 2) : ''}

Match situation: ${matchSituation}. Bowler type: ${bowlingType}.

Give me exactly 3 fielding changes with positions to PLACE and positions to MOVE FROM. Then give one bowling line adjustment. Be surgical — name specific fielding positions.

Return exactly as JSON matching the specified schema.`;

    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.5 },
      output: {
        format: 'json',
        schema: FieldPlacementOutput,
      },
    });

    return llmResponse.output() ?? {
      fieldChanges: [],
      bowlingLineAdjustment: "No specific adjustment.",
      primaryWeakness: "Unknown.",
      confidenceLevel: "low",
    };
  }
);
