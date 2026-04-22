import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/vertexai';
import * as z from 'zod';
const SYSTEM_INSTRUCTION = `You are an expert cricket analyst tasked with selecting the best performing players of a tournament. You balance raw stats with match impact.`;

export const teamOfTournamentFlow = defineFlow(
  {
    name: 'teamOfTournamentFlow',
    inputSchema: z.object({
      tournamentName: z.string(),
      format: z.enum(['T20', 'ODI', 'Test']),
      players: z.array(z.object({
        playerId: z.string(),
        name: z.string(),
        teamName: z.string(),
        role: z.string(),
        matches: z.number(),
        runs: z.number().optional(),
        avg: z.number().optional(),
        strikeRate: z.number().optional(),
        wickets: z.number().optional(),
        economy: z.number().optional(),
        bowlingAvg: z.number().optional(),
        mvpScore: z.number().describe('AI-calculated composite score'),
      })),
    }),
    outputSchema: z.object({
      teamOf11: z.array(z.object({
        playerId: z.string(),
        name: z.string(),
        teamName: z.string(),
        role: z.string(),
        selectionReason: z.string(),
      })),
      captain: z.string(),
      mvp: z.string(),
      tournamentNarrative: z.string(),
    }),
  },
  async (input: any) => {
    const playerList = input.players
      .map((p: any) => {
        const batting = p.runs !== undefined ? `Runs: ${p.runs}, Avg: ${p.avg}, SR: ${p.strikeRate}` : '';
        const bowling = p.wickets !== undefined ? `Wkts: ${p.wickets}, Econ: ${p.economy}, Avg: ${p.bowlingAvg}` : '';
        return `- ${p.name} (${p.teamName}, ${p.role}), MVP: ${p.mvpScore} — ${[batting, bowling].filter(Boolean).join(' | ')}`;
      })
      .join('\n');

    const prompt = `${SYSTEM_INSTRUCTION}

TASK: Select the Team of the Tournament for ${input.tournamentName} (${input.format}). Pick exactly 11 players.

PLAYER POOL:
${playerList}

Rules:
- Must include at least 5 batsmen, 4 bowlers, 1 wicket-keeper, and at least 1 all-rounder.
- Balance the team to field 11 in a real match.
- Each player's selection must be justified with specific stats from above.

Return JSON:
- "teamOf11": Array of 11 objects {playerId, name, teamName, role, selectionReason — 1 sentence referencing their stats}.
- "captain": Name of the tournament captain and one-line reason.
- "mvp": Name of the tournament MVP and one-line reason.
- "tournamentNarrative": 3 sentences summarising how the tournament played out and who defined it.`;

    const response = await generate({
      model: gemini15Pro,
      prompt,
      config: { temperature: 0.5 },
      // Schema validation handled by defineFlow's outputSchema — no duplicate inline schema
      output: { format: 'json' },
    });

    return response.output() ?? {
      teamOf11: [],
      captain: 'N/A',
      mvp: 'N/A',
      tournamentNarrative: 'Insufficient data.',
    };
  }
);
