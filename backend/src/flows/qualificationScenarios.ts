import { defineFlow } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/vertexai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';
import { CRICPULSEIQ_SYSTEM_PROMPT } from '../prompts/systemPrompt';

export const qualificationScenariosFlow = defineFlow(
  {
    name: 'qualificationScenariosFlow',
    inputSchema: z.object({
      tournamentName: z.string(),
      format: z.enum(['T20', 'ODI', 'Test']),
      qualifyingSpots: z.number().int(),
      standings: z.array(z.object({
        teamId: z.string(),
        teamName: z.string(),
        played: z.number(),
        wins: z.number(),
        losses: z.number(),
        ties: z.number(),
        points: z.number(),
        nrr: z.number(),
      })),
      remainingFixtures: z.array(z.object({
        homeTeam: z.string(),
        awayTeam: z.string(),
        date: z.string(),
      })),
      focusTeamId: z.string().optional(),
    }),
    outputSchema: z.object({
      qualifiedTeams: z.array(z.string()),
      eliminatedTeams: z.array(z.string()),
      onTheEdge: z.array(z.string()),
      focusTeamScenario: z.string().optional(),
      keyFixtures: z.array(z.object({
        fixture: z.string(),
        impact: z.string(),
      })),
      summary: z.string(),
    }),
  },
  async (input) => {
    const standingsStr = input.standings
      .sort((a, b) => b.points - a.points || b.nrr - a.nrr)
      .map((t, i) => `${i + 1}. ${t.teamName} — P:${t.played} W:${t.wins} L:${t.losses} Pts:${t.points} NRR:${t.nrr.toFixed(3)}`)
      .join('\n');

    const fixturesStr = input.remainingFixtures
      .map(f => `${f.homeTeam} vs ${f.awayTeam} (${f.date})`)
      .join('\n');

    const focusTeam = input.focusTeamId
      ? input.standings.find(s => s.teamId === input.focusTeamId)?.teamName
      : null;

    const prompt = `${CRICPULSEIQ_SYSTEM_PROMPT}

TASK: Analyse the current qualification picture for ${input.tournamentName}. ${input.qualifyingSpots} teams qualify from this stage.

STANDINGS:
${standingsStr}

REMAINING FIXTURES:
${fixturesStr}
${focusTeam ? `\nFocus team: ${focusTeam}` : ''}

Return JSON:
- "qualifiedTeams": Teams mathematically already qualified (list names).
- "eliminatedTeams": Teams mathematically eliminated.
- "onTheEdge": Teams still in contention.
- "focusTeamScenario": If a focus team was given, describe exactly what they need to qualify — specific wins, NRR targets, results needed elsewhere.
- "keyFixtures": Array of {fixture, impact} — up to 3 most pivotal remaining games with specific impact explanation.
- "summary": 3 sentences summarising the qualification race.`;

    const response = await generate({
      model: gemini15Pro,
      prompt,
      config: { temperature: 0.5 },
      output: {
        format: 'json',
        schema: z.object({
          qualifiedTeams: z.array(z.string()),
          eliminatedTeams: z.array(z.string()),
          onTheEdge: z.array(z.string()),
          focusTeamScenario: z.string().optional(),
          keyFixtures: z.array(z.object({ fixture: z.string(), impact: z.string() })),
          summary: z.string(),
        }),
      },
    });

    return response.output() ?? {
      qualifiedTeams: [],
      eliminatedTeams: [],
      onTheEdge: input.standings.map(s => s.teamName),
      keyFixtures: [],
      summary: 'Insufficient data for scenario analysis.',
    };
  }
);
