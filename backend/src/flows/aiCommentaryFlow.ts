import { defineFlow } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT, buildMatchContext } from '../prompts/systemPrompt';

const CommentaryInputSchema = z.object({
  // Match State
  innings: z.number().describe('Current innings (1 or 2)'),
  battingTeam: z.string().describe('Name of batting team'),
  over: z.number(),
  ball: z.number(),
  score: z.string().describe('e.g. "145/3"'),
  target: z.number().optional(),
  currentRunRate: z.number().optional(),
  requiredRunRate: z.number().optional(),
  // Ball Data
  batsmanName: z.string(),
  bowlerName: z.string(),
  runs: z.number(),
  extras: z.number(),
  isWicket: z.boolean(),
  wicketType: z.string().optional().describe('e.g. "bowled", "caught", "lbw"'),
  shotZone: z.string().optional().describe('e.g. "cover", "mid-wicket"'),
  // AI Momentum
  momentum: z.number().describe('-100 (away dominating) to +100 (home dominating)'),
});

export const aiCommentaryFlow = defineFlow(
  {
    name: 'aiCommentaryFlow',
    inputSchema: CommentaryInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const matchContext = buildMatchContext({
      innings: input.innings,
      battingTeam: input.battingTeam,
      over: input.over,
      ball: input.ball,
      score: input.score,
      target: input.target,
      currentRunRate: input.currentRunRate,
      requiredRunRate: input.requiredRunRate,
    });

    const ballSummary = input.isWicket
      ? `WICKET — ${input.batsmanName} dismissed ${input.wicketType ? `(${input.wicketType})` : ''} by ${input.bowlerName}.`
      : `${input.runs} run${input.runs !== 1 ? 's' : ''}${input.extras > 0 ? ` + ${input.extras} extra(s)` : ''} — ${input.batsmanName} off ${input.bowlerName}. Shot zone: ${input.shotZone ?? 'unknown'}.`;

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: Write one punchy ball-by-ball commentary line (max 2 sentences). Reference the batsman and bowler by name. Factor in the match momentum (${input.momentum > 30 ? 'home side on top' : input.momentum < -30 ? 'away side pressing' : 'tight contest'}).

MATCH CONTEXT:
${matchContext}

BALL:
${ballSummary}`;

    const response = await generate({
      model: gemini15Flash,
      prompt,
      config: { temperature: 0.85 },
    });

    return response.text() ?? '—';
  }
);
