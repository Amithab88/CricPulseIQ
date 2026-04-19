/**
 * aiCoachChat.ts
 * Uses: defineFlow, streamingGenerate, definePrompt, structuredOutput
 * Model: gemini15Pro for nuanced multi-turn coaching conversation
 */

import { defineFlow, streamingGenerate } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { buildPlayerContext } from '../prompts/systemPrompt';
import { SYSTEM_INSTRUCTION } from '../prompts/prompts';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'coach']),
  content: z.string(),
});

const CoachOutputSchema = z.object({
  coachReply: z.string(),
  suggestedFollowUps: z.array(z.string()),
});

export const aiCoachChatFlow = defineFlow(
  {
    name: 'aiCoachChatFlow',
    inputSchema: z.object({
      playerName: z.string(),
      role: z.string(),
      recentForm: z.string(),
      vsSpinRating: z.number().optional(),
      vsPaceRating: z.number().optional(),
      phaseRatings: z.object({
        powerplay: z.number().optional(),
        middleOvers: z.number().optional(),
        death: z.number().optional(),
      }).optional(),
      shotZones: z.record(z.string(), z.number()).optional(),
      chatHistory: z.array(ChatMessageSchema),
      userMessage: z.string(),
      // Stream the coach reply token by token
      streaming: z.boolean().default(false),
    }),
    outputSchema: CoachOutputSchema,
  },
  async (input, streamingCallback) => {
    const playerCtx = buildPlayerContext({
      playerName: input.playerName,
      role: input.role,
      recentForm: input.recentForm,
      vsSpinRating: input.vsSpinRating,
      vsPaceRating: input.vsPaceRating,
      phaseRatings: input.phaseRatings,
    });

    const shotZoneStr = input.shotZones
      ? Object.entries(input.shotZones)
          .sort(([, a], [, b]) => b - a)
          .map(([zone, pct]) => `${zone}: ${pct}%`)
          .join(', ')
      : 'Not available.';

    const historyStr = input.chatHistory.length > 0
      ? input.chatHistory.map(m => `${m.role === 'user' ? input.playerName : 'Coach'}: ${m.content}`).join('\n')
      : '[Start of conversation]';

    // For streaming: push plain text reply tokens to UI, then resolve structured output
    if (input.streaming && streamingCallback) {
      const streamPrompt = `${SYSTEM_INSTRUCTION}

You are this player's personal AI coach. Answer grounded in their specific data. Reference actual numbers. Keep replies under 4 sentences.

PLAYER PROFILE:
${playerCtx}
Shot Zones: ${shotZoneStr}

CONVERSATION:
${historyStr}
${input.playerName}: ${input.userMessage}
Coach:`;

      let streamedReply = '';
      const { response } = await streamingGenerate({
        model: gemini15Pro,
        prompt: streamPrompt,
        config: { temperature: 0.72, maxOutputTokens: 300 },
      });

      for await (const chunk of response) {
        const text = chunk.text();
        streamedReply += text;
        streamingCallback(text); // stream tokens to frontend
      }

      // Second pass: get structured follow-ups from the streamed reply
      const { response: followUpResp } = await streamingGenerate({
        model: gemini15Pro,
        prompt: `Given this coaching reply: "${streamedReply.trim()}"
Generate exactly 3 natural follow-up questions the player would logically ask next.
Return as JSON array of strings only. No preamble.`,
        config: { temperature: 0.6 },
        output: { format: 'json', schema: z.array(z.string()) },
      });

      let followUpText = '';
      for await (const chunk of followUpResp) followUpText += chunk.text();

      let suggestedFollowUps: string[] = [];
      try { suggestedFollowUps = JSON.parse(followUpText); } catch { /* graceful degradation */ }

      return { coachReply: streamedReply.trim(), suggestedFollowUps };
    }

    // ── Non-streaming: single structured output call ───────────────────────────
    const fullPrompt = `${SYSTEM_INSTRUCTION}

You are this player's personal AI coach. Answer grounded in their specific data. Reference actual numbers. Keep replies under 4 sentences.

PLAYER PROFILE:
${playerCtx}
Shot Zones: ${shotZoneStr}

CONVERSATION:
${historyStr}
${input.playerName}: ${input.userMessage}

Return JSON with "coachReply" (string, max 4 sentences) and "suggestedFollowUps" (array of 2-3 follow-up questions).`;

    const { response } = await streamingGenerate({
      model: gemini15Pro,
      prompt: fullPrompt,
      config: { temperature: 0.72, maxOutputTokens: 400 },
      output: { format: 'json', schema: CoachOutputSchema },
    });

    let text = '';
    for await (const chunk of response) text += chunk.text();

    try {
      return JSON.parse(text) as z.infer<typeof CoachOutputSchema>;
    } catch {
      return { coachReply: text.trim(), suggestedFollowUps: [] };
    }
  }
);
