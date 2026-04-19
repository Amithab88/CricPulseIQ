import { defineFlow } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT } from '../prompts/systemPrompt';

export const onboardingWelcomeFlow = defineFlow(
  {
    name: 'onboardingWelcomeFlow',
    inputSchema: z.object({
      clubName: z.string(),
      managerName: z.string(),
      playerCount: z.number().int(),
      upcomingMatchDate: z.string().optional(),
      upcomingOpponent: z.string().optional(),
    }),
    outputSchema: z.object({
      welcomeMessage: z.string(),
      dailyBriefing: z.string(),
      quickActions: z.array(z.string()),
    }),
  },
  async (input) => {
    const matchLine = input.upcomingMatchDate && input.upcomingOpponent
      ? `Next match: vs ${input.upcomingOpponent} on ${input.upcomingMatchDate}.`
      : 'No upcoming matches scheduled yet.';

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: Generate a personalised welcome back message and daily briefing for a club cricket manager.

Club: ${input.clubName}
Manager: ${input.managerName}
Squad size: ${input.playerCount} players
${matchLine}

Return JSON:
- "welcomeMessage": A warm but sharp 1-sentence greeting using their name and club name.
- "dailyBriefing": 2-3 sentences of tactical focus for today — if there's an upcoming match, reference it directly; otherwise suggest training priorities.
- "quickActions": 3 strings — the most important things they should do now in the app (e.g. "Review Ravi's scouting report before Saturday").`;

    const response = await generate({
      model: gemini15Flash,
      prompt,
      config: { temperature: 0.75 },
      output: {
        format: 'json',
        schema: z.object({
          welcomeMessage: z.string(),
          dailyBriefing: z.string(),
          quickActions: z.array(z.string()),
        }),
      },
    });

    return response.output() ?? {
      welcomeMessage: `Welcome back, ${input.managerName}.`,
      dailyBriefing: 'No data available for today\'s briefing.',
      quickActions: [],
    };
  }
);
