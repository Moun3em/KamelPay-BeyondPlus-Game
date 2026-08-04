import type { Phase } from "./config";

/**
 * Idiot-proof facilitator guidance: a pure function that turns the current
 * game state into "what do I do right now" — shown at the top of the console
 * so anyone can run the room without training.
 */

export type ConsoleGuide = {
  title: string;
  steps: string[];
};

export function guidanceFor(phase: Phase, eventMode: boolean, paused: boolean): ConsoleGuide {
  if (paused) {
    return {
      title: "Game is PAUSED",
      steps: ["Fix whatever needed pausing, then press Resume to restart the clock."],
    };
  }
  switch (phase) {
    case "LOBBY":
      return {
        title: "Joining time — get everyone in",
        steps: [
          "Tables open the link on their phones and enter their PIN.",
          "Claim roles: Player 1–5 (one phone can claim ALL roles).",
          "Check the table below — every table should have at least 3 devices.",
          "When everyone is in: press TUTORIAL to start the clock.",
        ],
      };
    case "TUTORIAL":
      return {
        title: "Practice round — 3 minutes",
        steps: [
          "Ask each table to scan one practice card and read the explanation.",
          "When they've got it, press A to open the real game.",
        ],
      };
    case "A":
      return {
        title: "Phase A — Internal Audit: tables are scanning",
        steps: [
          "Your main job: watch the Red flags below and help stuck tables.",
          "Do not touch capital unless a phone failure cost a table a scan.",
          "Phase B (trading) opens automatically" + (eventMode ? " — Event Mode is on, sit back." : " — press B when ready."),
        ],
      };
    case "B":
      return {
        title: "Phase B — Trading is open",
        steps: [
          "Procurement officers will bring you foreign invoices to return to their owners.",
          "Use the ASP trade validation panel (numbered 1-2-3-4) to validate each trade.",
          "Both tables gain +AED 5,000 per validated trade.",
        ],
      };
    case "C":
      return {
        title: "Phase C — Outages are striking",
        steps: [
          "Tables are losing AED 1,000 every 10 seconds until their CIO fixes the outage.",
          "Only step in (Force-resolve outage) if a table is genuinely stuck.",
          "Green control cards unlock once an outage is resolved.",
        ],
      };
    case "FROZEN":
      return {
        title: "Game over — leaderboard locked",
        steps: [
          "Show the projection to the room.",
          "Open the Debrief screen (link above) for the fines + GRN-04 story.",
          "Press DEBRIEF when you're ready to wrap up.",
        ],
      };
    case "DEBRIEF":
      return {
        title: "Debrief",
        steps: [
          "Present the Debrief screen: total fines, the X3 trap, the GRN-04 comparison.",
          "Reset game (wipe all progress) starts a fresh run.",
        ],
      };
    default:
      // Unknown/loading phase (e.g. first paint before state arrives) — never
      // return undefined; a console that crashes on load helps no one.
      return {
        title: "Loading…",
        steps: ["Waiting for the game state. This clears in a second."],
      };
  }
}
