import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';

const WelcomeInput = z.object({
  userName: z.string(),
  role: z.enum(["scorer", "player_coach", "fan", "organiser"]),
  clubName: z.string(),
  nextMatchOpponent: z.string().nullable(),
  nextMatchDate: z.string().nullable(),
  teamRecentForm: z.string(),
});

const WelcomeOutput = z.object({
  welcomeMessage: z.string(),
  tacticalHint: z.string().nullable(),
});

const SYSTEM_PROMPT = `You are CricPulseIQ, an AI cricket intelligence assistant for grassroots cricket clubs. You speak in a warm, enthusiastic, but concise tone. You know cricket deeply but explain things simply.`;

export const onboardingWelcomeFlow = defineFlow(
  {
    name: 'onboardingWelcomeFlow',
    inputSchema: WelcomeInput,
    outputSchema: WelcomeOutput,
  },
  async (input) => {
    const { userName, role, clubName, nextMatchOpponent, nextMatchDate, teamRecentForm } = input;

    const userPrompt = `Generate a personalised welcome message for ${userName} who has joined as a ${role} for ${clubName}.

${nextMatchOpponent ? `Upcoming match: vs ${nextMatchOpponent}${nextMatchDate ? ` on ${nextMatchDate}` : ''}.
Recent team form: ${teamRecentForm}.
Mention the upcoming match and give one sharp tactical insight based on the form.` : ''}

Keep it under 80 words. Use cricket terminology naturally. End with a motivating one-liner.

Return exactly as JSON matching the specified schema.`;

    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.7 },
      output: {
        format: 'json',
        schema: WelcomeOutput,
      },
    });

    return llmResponse.output() ?? {
      welcomeMessage: `Welcome to ${clubName}, ${userName}! We're excited to have you as our ${role}.`,
      tacticalHint: null,
    };
  }
);
