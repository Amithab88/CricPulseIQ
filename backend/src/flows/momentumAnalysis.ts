import { defineFlow, generate } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';

const MomentumAnalysisInput = z.object({
  last5Overs: z.array(z.object({
    over: z.number(),
    runs: z.number(),
    wickets: z.number(),
    dots: z.number(),
  })),
  currentScore: z.string(),
  target: z.number().nullable(),
  teamBatting: z.string(),
  teamBowling: z.string(),
});

const MomentumAnalysisOutput = z.object({
  verdict: z.string(),
  turningPoint: z.string(),
  battingInstruction: z.string(),
  bowlingInstruction: z.string(),
  momentumScore: z.number().describe('-100 (bowling dominant) to +100 (batting dominant)'),
});

export const momentumAnalysisFlow = defineFlow(
  {
    name: 'momentumAnalysisFlow',
    inputSchema: MomentumAnalysisInput,
    outputSchema: MomentumAnalysisOutput,
  },
  async (input) => {
    const { last5Overs, currentScore, target, teamBatting, teamBowling } = input;

    const last5Summary = JSON.stringify(last5Overs, null, 2);
    const targetLine = target ? `Target: ${target}` : 'First innings.';

    const userPrompt = `Analyse the following over-by-over data from the last 5 overs of a cricket match:
${last5Summary}

Batting Team: ${teamBatting}
Bowling Team: ${teamBowling}
Current score: ${currentScore}. ${targetLine}

Give:
1. A momentum verdict: which team has the upper hand right now and why (2 sentences max)
2. The critical turning point in these 5 overs (1 sentence)
3. What the batting team must do in the next 2 overs (1 tactical instruction)
4. What the bowling team must do (1 tactical instruction)

Return exactly as JSON matching the specified schema.`;

    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: userPrompt,
      config: { temperature: 0.5 },
      output: {
        format: 'json',
        schema: MomentumAnalysisOutput,
      },
    });

    return llmResponse.output() ?? {
      verdict: "Insufficient data to determine momentum.",
      turningPoint: "No significant turning point identified.",
      battingInstruction: "Continue standard approach.",
      bowlingInstruction: "Continue standard approach.",
      momentumScore: 0,
    };
  }
);
