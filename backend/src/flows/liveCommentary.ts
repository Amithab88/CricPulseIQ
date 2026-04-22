import { defineFlow } from '@genkit-ai/flow';
import { generate, generateStream } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';

const LiveCommentaryInput = z.object({
  delivery: z.object({
    over: z.number(),
    ball: z.number(),
    runs: z.number(),
    extras: z.string().nullable(),
    isWicket: z.boolean(),
    wicketType: z.string().nullable(),
    batsmanName: z.string(),
    bowlerName: z.string(),
    wagWheelZone: z.string(),
  }),
  matchContext: z.object({
    score: z.string(),
    target: z.number().nullable(),
    runRate: z.number(),
    requiredRate: z.number().nullable(),
    partnership: z.object({ runs: z.number(), balls: z.number() }),
    batsmanStats: z.object({ runs: z.number(), balls: z.number(), sr: z.number() }),
  }),
});

const LiveCommentaryOutput = z.object({
  commentary: z.string(),
  momentumTag: z.enum(["building", "pressure", "explosion", "collapse", "steady"]),
});

const SYSTEM_PROMPT = `You are a sharp, witty live cricket commentator for a club-level match. Your commentary is punchy, vivid, and grounded in the action. You are NOT formal — think Ravi Shastri energy meets Twitter cricket. Maximum 2 sentences per delivery.`;

export const liveCommentaryFlow = defineFlow(
  {
    name: 'liveCommentaryFlow',
    inputSchema: LiveCommentaryInput,
    outputSchema: LiveCommentaryOutput,
  },
  async (input, streamingCallback) => {
    const { delivery: d, matchContext: m } = input;
    
    const ballDesc = `Ball ${d.over}.${d.ball}: ${d.batsmanName} faces ${d.bowlerName}. ${d.runs} run(s)${d.isWicket ? ', WICKET — ' + d.wicketType : ''}. Shot went to ${d.wagWheelZone}.`;
    const matchSit = `Match situation: ${m.score}, run rate ${m.runRate}${m.requiredRate ? ', required rate ' + m.requiredRate : ''}.`;

    const userPrompt = `${ballDesc} ${matchSit}

Write live commentary for this delivery. If it's a wicket, make it dramatic. If it's a boundary, capture the shot. If it's a dot, build the tension.`;

    if (streamingCallback) {
      const { stream, response } = await generateStream({
        model: gemini15Flash,
        prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        config: { temperature: 0.8 },
      });

      // In Genkit 0.5.x, stream and response are functions that return the iterable and promise.
      for await (const chunk of stream()) {
        streamingCallback({ commentary: (chunk as any).text?.() || '...', momentumTag: 'steady' });
      }

      const finalOutput = (await response()).output() as any;
      return finalOutput ?? { commentary: 'No commentary.', momentumTag: 'steady' as const };
    }

    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.8 },
      output: {
        format: 'json',
        schema: LiveCommentaryOutput,
      },
    });

    return llmResponse.output() as any ?? {
      commentary: "No commentary available.",
      momentumTag: "steady" as const
    };
  }
);
