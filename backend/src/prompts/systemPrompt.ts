/**
 * CricPulseIQ — Core AI Engine System Prompt
 * Shared across all Genkit flows to maintain a consistent analytical voice.
 */

export const CRICPULSEIQ_SYSTEM_PROMPT = `
You are CricPulseIQ's AI engine — a cricket intelligence system built for grassroots and club-level cricket.

CORE PRINCIPLES:
1. Every insight must reference specific player names, specific statistics, or specific match situations. Never give generic cricket advice.
2. You speak to club cricketers — practical, jargon-aware but not overly academic. Think county coach, not TV pundit.
3. You are confident in your analysis. Don't hedge excessively. If data supports a conclusion, state it.
4. Context is your edge. You always know the team's players, their recent form, and the match situation. Use it.
5. Be concise unless asked to elaborate. Club players make decisions in real time.

TONE: Sharp, warm, tactically precise. No filler phrases ("Great question!", "Certainly!", "As an AI..."). Just analysis.

SAFETY: Do not fabricate statistics. If data is missing, say so and work with what's available. Do not make claims about real professional players that could be defamatory.
`.trim();

/**
 * Builds a context-rich prompt prefix for player-specific flows.
 */
export function buildPlayerContext(params: {
  playerName: string;
  role: string;
  recentForm: string;
  vsSpinRating?: number;
  vsPaceRating?: number;
  phaseRatings?: { powerplay?: number; middleOvers?: number; death?: number };
}): string {
  const { playerName, role, recentForm, vsSpinRating, vsPaceRating, phaseRatings } = params;
  const lines: string[] = [
    `Player: ${playerName} (${role})`,
    `Recent Form: ${recentForm}`,
  ];
  if (vsSpinRating !== undefined) lines.push(`vs Spin Rating: ${vsSpinRating}/100`);
  if (vsPaceRating !== undefined) lines.push(`vs Pace Rating: ${vsPaceRating}/100`);
  if (phaseRatings) {
    if (phaseRatings.powerplay !== undefined) lines.push(`Powerplay Rating: ${phaseRatings.powerplay}/100`);
    if (phaseRatings.middleOvers !== undefined) lines.push(`Middle Overs Rating: ${phaseRatings.middleOvers}/100`);
    if (phaseRatings.death !== undefined) lines.push(`Death Overs Rating: ${phaseRatings.death}/100`);
  }
  return lines.join('\n');
}

/**
 * Builds a context-rich prompt prefix for match-state flows (commentary, strategy).
 */
export function buildMatchContext(params: {
  innings: number;
  battingTeam: string;
  over: number;
  ball: number;
  score: string;
  target?: number;
  requiredRunRate?: number;
  currentRunRate?: number;
}): string {
  const { innings, battingTeam, over, ball, score, target, requiredRunRate, currentRunRate } = params;
  const lines: string[] = [
    `Innings: ${innings} | Batting: ${battingTeam}`,
    `Score: ${score} | Over: ${over}.${ball}`,
  ];
  if (target !== undefined) lines.push(`Target: ${target}`);
  if (currentRunRate !== undefined) lines.push(`Current RR: ${currentRunRate.toFixed(2)}`);
  if (requiredRunRate !== undefined) lines.push(`Required RR: ${requiredRunRate.toFixed(2)}`);
  return lines.join('\n');
}
