import { defineFlow } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT, buildPlayerContext } from '../prompts/systemPrompt';

const CoachInputSchema = z.object({
  // Player full context from Firestore /playerStats
  playerName: z.string(),
  role: z.string(),
  recentForm: z.string().describe('e.g. "22(18), 4(6), 67(45) in last 3 matches"'),
  vsSpinRating: z.number().optional(),
  vsPaceRating: z.number().optional(),
  phaseRatings: z.object({
    powerplay: z.number().optional(),
    middleOvers: z.number().optional(),
    death: z.number().optional(),
  }).optional(),
  shotZones: z.record(z.string(), z.number()).optional().describe('Zone names mapped to run %'),
  // Conversation
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'coach']),
    content: z.string(),
  })).describe('Previous turns in the conversation'),
  userQuery: z.string(),
});

export const aiCoachFlow = defineFlow(
  {
    name: 'aiCoachFlow',
    inputSchema: CoachInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const playerContext = buildPlayerContext({
      playerName: input.playerName,
      role: input.role,
      recentForm: input.recentForm,
      vsSpinRating: input.vsSpinRating,
      vsPaceRating: input.vsPaceRating,
      phaseRatings: input.phaseRatings,
    });

    // Format shot zones if available
    const shotZoneStr = input.shotZones
      ? Object.entries(input.shotZones)
          .map(([zone, pct]) => `${zone}: ${pct}%`)
          .join(', ')
      : 'No wagon wheel data available.';

    // Format chat history
    const historyStr = input.chatHistory.length > 0
      ? input.chatHistory.map(m => `${m.role === 'user' ? 'Player' : 'Coach'}: ${m.content}`).join('\n')
      : 'No prior conversation.';

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: You are this player's AI coach. Answer their question with direct, data-backed advice using their profile below. If they ask about technique, reference their weak zones or ratings. If they ask about match situations, use their phase ratings.

PLAYER PROFILE:
${playerContext}
Shot Zones: ${shotZoneStr}

CONVERSATION HISTORY:
${historyStr}

Player: ${input.userQuery}
Coach:`;

    const response = await generate({
      model: gemini15Pro,
      prompt,
      config: { temperature: 0.7 },
    });

    return response.text() ?? 'No response generated.';
  }
);
