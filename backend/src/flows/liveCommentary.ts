/**
 * liveCommentary.ts
 * Uses: defineFlow, streamingGenerate, definePrompt, buildMatchContext
 * Model: gemini15Flash for low-latency streaming delivery commentary
 */

import { defineFlow, streamingGenerate } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { buildMatchContext } from '../prompts/systemPrompt';
import { SYSTEM_INSTRUCTION } from '../prompts/prompts';

const LiveCommentaryInputSchema = z.object({
  innings: z.number().int(),
  battingTeam: z.string(),
  over: z.number().int(),
  ball: z.number().int(),
  score: z.string(),
  target: z.number().optional(),
  currentRunRate: z.number().optional(),
  requiredRunRate: z.number().optional(),
  batsmanName: z.string(),
  bowlerName: z.string(),
  runs: z.number().int(),
  extras: z.number().int().default(0),
  isWicket: z.boolean(),
  wicketType: z.string().optional(),
  shotZone: z.string().optional(),
  momentum: z.number().min(-100).max(100),
  batsmanRecentForm: z.string().optional(),
  bowlerRecentForm: z.string().optional(),
  // Enable streaming mode for live UI ticker
  streaming: z.boolean().default(false),
});

export const liveCommentaryFlow = defineFlow(
  {
    name: 'liveCommentaryFlow',
    inputSchema: LiveCommentaryInputSchema,
    outputSchema: z.string(),
  },
  async (input, streamingCallback) => {
    const matchCtx = buildMatchContext({
      innings: input.innings,
      battingTeam: input.battingTeam,
      over: input.over,
      ball: input.ball,
      score: input.score,
      target: input.target,
      currentRunRate: input.currentRunRate,
      requiredRunRate: input.requiredRunRate,
    });

    const momentumLabel =
      input.momentum > 50  ? 'home side firmly in control'  :
      input.momentum > 20  ? 'home side edging it'          :
      input.momentum < -50 ? 'away side firmly in control'  :
      input.momentum < -20 ? 'away side edging it'          :
                             'tight contest, could go either way';

    const ballLine = input.isWicket
      ? `WICKET — ${input.batsmanName} out ${input.wicketType ?? ''} b ${input.bowlerName}.`
      : `${input.runs} run${input.runs !== 1 ? 's' : ''} — ${input.batsmanName} off ${input.bowlerName}${input.shotZone ? `, through ${input.shotZone}` : ''}.`;

    const extraCtx = [
      input.batsmanRecentForm ? `${input.batsmanName} in form: ${input.batsmanRecentForm}` : null,
      input.bowlerRecentForm  ? `${input.bowlerName} in form: ${input.bowlerRecentForm}`   : null,
    ].filter(Boolean).join('\n');

    const prompt = `${SYSTEM_INSTRUCTION}

TASK: Write punchy live ball-by-ball commentary. Max 2 sentences. Name both players. Reflect match pressure.

MATCH STATE:
${matchCtx}
Momentum: ${momentumLabel}

BALL: ${ballLine}${extraCtx ? `\n\nADDITIONAL CONTEXT:\n${extraCtx}` : ''}`;

    // ── Streaming path: pushes chunks to the UI as they arrive ───────────────
    if (input.streaming && streamingCallback) {
      let fullText = '';
      const { response } = await streamingGenerate({
        model: gemini15Flash,
        prompt,
        config: { temperature: 0.88, maxOutputTokens: 120 },
      });

      for await (const chunk of response) {
        const text = chunk.text();
        fullText += text;
        streamingCallback(text); // pushes chunk to frontend SSE
      }

      return fullText.trim();
    }

    // ── Non-streaming path: single response ───────────────────────────────────
    const { response } = await streamingGenerate({
      model: gemini15Flash,
      prompt,
      config: { temperature: 0.88, maxOutputTokens: 120 },
    });

    let text = '';
    for await (const chunk of response) {
      text += chunk.text();
    }
    return text.trim() || '—';
  }
);
