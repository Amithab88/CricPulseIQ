/**
 * CricPulseIQ — Centralized Genkit Prompt Definitions
 * All reusable prompts are defined here with definePrompt().
 * Flows import and render these rather than building raw strings.
 */

import { definePrompt } from '@genkit-ai/core';
import { gemini15Pro, gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';

// ─── Shared system instruction (injected into every prompt) ──────────────────
export const SYSTEM_INSTRUCTION = `You are CricPulseIQ's AI engine — a cricket intelligence system built for grassroots and club-level cricket.

CORE PRINCIPLES:
1. Every insight must reference specific player names, specific statistics, or specific match situations. Never give generic cricket advice.
2. You speak to club cricketers — practical, jargon-aware but not overly academic. Think county coach, not TV pundit.
3. You are confident in your analysis. Don't hedge excessively. If data supports a conclusion, state it.
4. Context is your edge. You always know the team's players, their recent form, and the match situation. Use it.
5. Be concise unless asked to elaborate. Club players make decisions in real time.

TONE: Sharp, warm, tactically precise. No filler phrases. Just analysis.
SAFETY: Do not fabricate statistics. If data is missing, say so and work with what's available.`;

// ─── Live Commentary Prompt ───────────────────────────────────────────────────
export const liveCommentaryPrompt = definePrompt(
  {
    name: 'liveCommentaryPrompt',
    model: gemini15Flash,
    config: { temperature: 0.88, maxOutputTokens: 120 },
    input: {
      schema: z.object({
        matchContext: z.string(),
        ballLine: z.string(),
        momentumLabel: z.string(),
        extraContext: z.string().optional(),
      }),
    },
    output: { format: 'text' },
  },
  `{{SYSTEM_INSTRUCTION}}

TASK: Write punchy live ball-by-ball commentary. Max 2 sentences. Name both players. Reflect the match pressure.

MATCH STATE:
{{matchContext}}
Momentum: {{momentumLabel}}

BALL: {{ballLine}}
{{#if extraContext}}
ADDITIONAL CONTEXT:
{{extraContext}}
{{/if}}`
);

// ─── AI Coach Chat Prompt ─────────────────────────────────────────────────────
export const aiCoachChatPrompt = definePrompt(
  {
    name: 'aiCoachChatPrompt',
    model: gemini15Pro,
    config: { temperature: 0.72, maxOutputTokens: 350 },
    input: {
      schema: z.object({
        playerContext: z.string(),
        shotZoneStr: z.string(),
        historyStr: z.string(),
        playerName: z.string(),
        userMessage: z.string(),
      }),
    },
    output: {
      format: 'json',
      schema: z.object({
        coachReply: z.string(),
        suggestedFollowUps: z.array(z.string()),
      }),
    },
  },
  `{{SYSTEM_INSTRUCTION}}

You are this player's personal AI coach. Answer grounded in their specific data. Reference actual numbers. Keep replies under 4 sentences unless detail is requested.

PLAYER PROFILE:
{{playerContext}}
Shot Zones: {{shotZoneStr}}

CONVERSATION:
{{historyStr}}
{{playerName}}: {{userMessage}}

Return JSON with "coachReply" and "suggestedFollowUps" (array of 2-3 follow-up questions).`
);

// ─── Match Strategy Prompt ────────────────────────────────────────────────────
export const matchStrategyPrompt = definePrompt(
  {
    name: 'matchStrategyPrompt',
    model: gemini15Pro,
    config: { temperature: 0.6, maxOutputTokens: 800 },
    input: {
      schema: z.object({
        ownTeamName: z.string(),
        opponentTeamName: z.string(),
        ownTeamSummary: z.string(),
        opponentSummary: z.string(),
        venue: z.string(),
        pitchConditions: z.string(),
        weather: z.string(),
        format: z.string(),
        tossLine: z.string().optional(),
      }),
    },
    output: {
      format: 'json',
      schema: z.object({
        battingPlan: z.string(),
        bowlingPlan: z.string(),
        keyMatchups: z.array(z.string()),
        fieldingNotes: z.string().optional(),
      }),
    },
  },
  `{{SYSTEM_INSTRUCTION}}

TASK: Generate a targeted pre-match plan for {{ownTeamName}} vs {{opponentTeamName}}.

Format: {{format}} | Venue: {{venue}}
Pitch: {{pitchConditions}}
Weather: {{weather}}
{{tossLine}}

OUR SQUAD:
{{ownTeamSummary}}

OPPONENT INTEL:
{{opponentSummary}}

Return JSON with "battingPlan", "bowlingPlan", "keyMatchups" (array), and "fieldingNotes".`
);

// ─── Scouting Report Prompt ───────────────────────────────────────────────────
export const scoutingReportPrompt = definePrompt(
  {
    name: 'scoutingReportPrompt',
    model: gemini15Pro,
    config: { temperature: 0.55, maxOutputTokens: 700 },
    input: {
      schema: z.object({
        playerContext: z.string(),
        careerStr: z.string(),
        shotZoneStr: z.string(),
      }),
    },
    output: {
      format: 'json',
      schema: z.object({
        summary: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        bowlingLineLength: z.string(),
        fieldingConfiguration: z.string(),
        riskRating: z.enum(['Low', 'Medium', 'High', 'Danger']),
      }),
    },
  },
  `{{SYSTEM_INSTRUCTION}}

TASK: Generate a detailed opposition scouting report. Coaches will use this in a team meeting. Be direct.

PLAYER PROFILE:
{{playerContext}}
{{careerStr}}
Shot Zones (wagon wheel): {{shotZoneStr}}

Return JSON: "summary" (2-3 sentences, no hedging), "strengths" (up to 3 with stat refs), "weaknesses" (up to 3 with stat refs), "bowlingLineLength" (exact plan), "fieldingConfiguration", "riskRating".`
);

// ─── Momentum Analysis Prompt ─────────────────────────────────────────────────
export const momentumAnalysisPrompt = definePrompt(
  {
    name: 'momentumAnalysisPrompt',
    model: gemini15Flash,
    config: { temperature: 0.6, maxOutputTokens: 500 },
    input: {
      schema: z.object({
        battingTeam: z.string(),
        bowlingTeam: z.string(),
        format: z.string(),
        innings: z.number(),
        overSummary: z.string(),
        phaseSummary: z.string(),
        currentMomentum: z.number(),
      }),
    },
    output: {
      format: 'json',
      schema: z.object({
        momentumScore: z.number(),
        momentumNarrative: z.string(),
        turningPoints: z.array(z.object({ over: z.number(), description: z.string() })),
        phaseVerdict: z.string(),
      }),
    },
  },
  `{{SYSTEM_INSTRUCTION}}

TASK: Analyse the batting innings momentum and identify turning points.

Match: {{battingTeam}} (batting) vs {{bowlingTeam}} | Innings {{innings}} | {{format}}
Over-by-over: {{overSummary}}
Phase breakdown: {{phaseSummary}}
Current momentum score: {{currentMomentum}}

Return JSON: "momentumScore" (-100 to +100), "momentumNarrative" (2-3 sentences), "turningPoints" (array of {over, description}), "phaseVerdict" (1 sentence).`
);
