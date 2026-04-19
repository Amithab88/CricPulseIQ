import { defineFlow } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT } from '../prompts/systemPrompt';

const PhaseStatsSchema = z.object({
  runs: z.number(),
  wickets: z.number(),
  overs: z.number(),
  boundaries: z.number().optional(),
  dotBalls: z.number().optional(),
});

export const momentumAnalysisFlow = defineFlow(
  {
    name: 'momentumAnalysisFlow',
    inputSchema: z.object({
      matchId: z.string(),
      battingTeam: z.string(),
      bowlingTeam: z.string(),
      format: z.enum(['T20', 'ODI', 'Test']),
      innings: z.number().int(),
      // Aggregated over-by-over run data for charting
      overByOverRuns: z.array(z.object({
        over: z.number().int(),
        runs: z.number().int(),
        wickets: z.number().int(),
      })),
      // Phase breakdown
      powerplay: PhaseStatsSchema.optional(),
      middleOvers: PhaseStatsSchema.optional(),
      death: PhaseStatsSchema.optional(),
      currentMomentum: z.number().min(-100).max(100),
    }),
    outputSchema: z.object({
      momentumScore: z.number().min(-100).max(100),
      momentumNarrative: z.string(),
      turningPoints: z.array(z.object({
        over: z.number(),
        description: z.string(),
      })),
      phaseVerdict: z.string(),
    }),
  },
  async (input) => {
    const overSummary = input.overByOverRuns
      .map(o => `Over ${o.over}: ${o.runs}R ${o.wickets}W`)
      .join(' | ');

    const phaseSummary = [
      input.powerplay ? `Powerplay: ${input.powerplay.runs}/${input.powerplay.wickets} (${input.powerplay.overs} ov)` : null,
      input.middleOvers ? `Middle: ${input.middleOvers.runs}/${input.middleOvers.wickets} (${input.middleOvers.overs} ov)` : null,
      input.death ? `Death: ${input.death.runs}/${input.death.wickets} (${input.death.overs} ov)` : null,
    ].filter(Boolean).join(' | ');

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: Analyse the batting innings momentum and identify turning points.

Match: ${input.battingTeam} (batting) vs ${input.bowlingTeam} | Innings ${input.innings} | ${input.format}
Over-by-over: ${overSummary}
${phaseSummary ? `Phase breakdown: ${phaseSummary}` : ''}
Current momentum score: ${input.currentMomentum}

Return JSON:
- "momentumScore": Recalculated momentum -100 to +100 (positive = batting team ahead).
- "momentumNarrative": 2-3 sentence analysis of how the innings has flowed so far.
- "turningPoints": Array of {over, description} objects for the 2-3 biggest momentum shifts.
- "phaseVerdict": One sentence verdict on which phase won/lost the game for the batting team.`;

    const response = await generate({
      model: gemini15Flash,
      prompt,
      config: { temperature: 0.6 },
      output: {
        format: 'json',
        schema: z.object({
          momentumScore: z.number(),
          momentumNarrative: z.string(),
          turningPoints: z.array(z.object({ over: z.number(), description: z.string() })),
          phaseVerdict: z.string(),
        }),
      },
    });

    return response.output() ?? {
      momentumScore: input.currentMomentum,
      momentumNarrative: 'Insufficient over data for momentum analysis.',
      turningPoints: [],
      phaseVerdict: 'N/A',
    };
  }
);
