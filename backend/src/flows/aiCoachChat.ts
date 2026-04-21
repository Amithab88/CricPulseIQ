import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';

const CoachMessage = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AICoachInput = z.object({
  messages: z.array(CoachMessage),
  teamContext: z.object({
    clubName: z.string(),
    upcomingOpponent: z.string().nullable(),
    recentForm: z.string(),
    squad: z.array(z.object({
      name: z.string(),
      role: z.string(),
      battingAvg: z.number(),
      bowlingEcon: z.number().nullable(),
      weaknesses: z.array(z.string()),
      strengths: z.array(z.string()),
    })),
    liveMatchState: z.object({
      score: z.string(),
      over: z.string(),
      runRate: z.number(),
      target: z.number().nullable(),
    }).nullable(),
  }),
});

const AICoachOutput = z.object({
  reply: z.string(),
  suggestedChips: z.array(z.string()),
});

export const aiCoachChatFlow = defineFlow(
  {
    name: 'aiCoachChatFlow',
    inputSchema: AICoachInput,
    outputSchema: AICoachOutput,
  },
  async (input) => {
    const { messages, teamContext: ctx } = input;

    const squadStr = JSON.stringify(ctx.squad, null, 2);
    const liveMatchStr = ctx.liveMatchState ? `LIVE MATCH IN PROGRESS: ${JSON.stringify(ctx.liveMatchState)}` : '';

    const systemPrompt = `You are the AI coaching assistant for ${ctx.clubName}. You have deep knowledge of every player in the squad, their statistics, their weaknesses, and their recent form.

Squad details:
${squadStr}

Recent team form: ${ctx.recentForm}
${liveMatchStr}

You are a tactical, data-driven coach who speaks plainly. You never give generic cricket advice — every recommendation references specific players by name and specific numbers. You are concise (max 4 sentences per reply unless asked to elaborate). You understand grassroots club cricket — limited resources, amateur players, community stakes.

If asked about live match decisions, use the live match state above. If asked about selection or strategy, use the squad data.

Return your response as a JSON object with:
- "reply": Your coaching response (concise, data-driven).
- "suggestedChips": Exactly 3 relevant follow-up questions/actions (e.g. "Who should open?", "Bowling at death?").`;

    // Extract the latest user message and the history
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    }));
    const userMsg = messages[messages.length - 1].content;

    const llmResponse = await generate({
      model: gemini15Pro,
      system: systemPrompt,   // ← system prompt in dedicated field, not concatenated into user turn
      history: history,
      prompt: userMsg,         // ← user message only
      config: { temperature: 0.7 },
      output: {
        format: 'json',
        schema: AICoachOutput,
      },
    });

    return llmResponse.output() ?? {
      reply: "I'm processing the team data, coach. What's on your mind?",
      suggestedChips: ["Who should open the batting?", "Best death bowler?", "Team talk strategy"],
    };
  }
);
