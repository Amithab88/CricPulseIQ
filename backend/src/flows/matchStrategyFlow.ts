import { defineFlow, generate } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';

const PlayerSchema = z.object({
  name: z.string(),
  role: z.string(),
  battingAvg: z.number(),
  bowlingEcon: z.number().nullable(),
  recentForm: z.string(),
  weaknesses: z.array(z.string()),
});

const OpponentPlayerSchema = z.object({
  name: z.string(),
  threat: z.enum(["high", "medium", "low"]),
  howToNeutralise: z.string(),
});

const MatchStrategyInput = z.object({
  ourTeam: z.object({
    name: z.string(),
    players: z.array(PlayerSchema),
    recentResults: z.array(z.string()),
  }),
  opponent: z.object({
    name: z.string(),
    knownStrengths: z.array(z.string()),
    knownWeaknesses: z.array(z.string()),
    keyPlayers: z.array(OpponentPlayerSchema),
  }),
  matchFormat: z.enum(["T20", "ODI", "40-over"]),
  venue: z.string(),
  pitchReport: z.string().nullable(),
  tossResult: z.object({
    wonToss: z.boolean(),
    decision: z.enum(["bat", "bowl"]),
  }).nullable(),
});

const MatchStrategyOutput = z.object({
  battingOrder: z.array(z.object({
    position: z.number(),
    name: z.string(),
    reason: z.string(),
  })),
  powerplayStrategy: z.object({
    batting: z.string(),
    bowling: z.string(),
    openingBowlers: z.array(z.string()),
  }),
  middleOversPlan: z.string(),
  deathOversTactics: z.object({
    batting: z.string(),
    bowling: z.string(),
    closingBowler: z.string(),
  }),
  bowlingRotations: z.array(z.object({
    over: z.string(),
    bowler: z.string(),
    plan: z.string(),
  })),
  fieldPlacementPhilosophy: z.string(),
  riskWarnings: z.array(z.object({
    scenario: z.string(),
    response: z.string(),
  })),
  captainSummary: z.string(),
});

const SYSTEM_PROMPT = `You are a professional cricket strategist preparing a detailed pre-match plan for a grassroots club. You think like a franchise T20 coach but communicate in clear, practical language a club cricketer can execute. Every recommendation must name specific players by name.`;

export const matchStrategyFlow = defineFlow(
  {
    name: 'matchStrategyFlow',
    inputSchema: MatchStrategyInput,
    outputSchema: MatchStrategyOutput,
  },
  async (input) => {
    const { ourTeam, opponent, matchFormat, venue, pitchReport, tossResult } = input;

    const userPrompt = `Generate a complete pre-match strategy for ${ourTeam.name} vs ${opponent.name} in a ${matchFormat} match at ${venue}.

The plan must cover exactly these 7 sections:
1. BATTING ORDER — Full recommended batting order (1-11) with rationale for the top 5 positions
2. POWERPLAY STRATEGY — First 6 overs batting and bowling approach, specific bowler names for overs 1-3
3. MIDDLE OVERS PLAN — Overs 7-15, rotation strategy, when to accelerate
4. DEATH OVERS TACTICS — Final 5 overs batting (who hits, target zones) and bowling (who bowls, which balls to bowl)
5. BOWLING ROTATIONS — Full bowling plan: who bowls which overs, backup options
6. FIELD PLACEMENT PHILOSOPHY — General field setup for pace vs spin, plus special fields for their key threats
7. RISK WARNINGS — 2-3 specific scenarios where our plan could fail and how to respond

OUR TEAM DETAILS:
${JSON.stringify(ourTeam, null, 2)}

OPPONENT DETAILS:
${JSON.stringify(opponent, null, 2)}

PITCH REPORT: ${pitchReport || 'Standard grassroots pitch.'}
TOSS: ${tossResult ? `${tossResult.wonToss ? 'Won' : 'Lost'} toss, decided to ${tossResult.decision}` : 'Toss not yet occurred.'}

Return exactly as JSON matching the specified schema.`;

    const llmResponse = await generate({
      model: gemini15Pro,
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.7 },
      output: {
        format: 'json',
        schema: MatchStrategyOutput,
      },
    });

    return llmResponse.output() ?? {
      battingOrder: [],
      powerplayStrategy: { batting: "N/A", bowling: "N/A", openingBowlers: [] },
      middleOversPlan: "N/A",
      deathOversTactics: { batting: "N/A", bowling: "N/A", closingBowler: "N/A" },
      bowlingRotations: [],
      fieldPlacementPhilosophy: "N/A",
      riskWarnings: [],
      captainSummary: "Insufficient data to generate a full match plan.",
    };
  }
);
