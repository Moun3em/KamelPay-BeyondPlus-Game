import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Guide — Five-Corner Compliance Simulation",
  description:
    "How the Five-Corner Compliance Simulation works, how to play, and how to run it — for players, facilitators and anyone new.",
};

const phases = [
  {
    n: "00",
    name: "LOBBY",
    time: "10 min",
    what: "Tables claim roles and join the room. One phone can hold ALL roles.",
    act: "Players: open the link, enter the table PIN, claim your role. Facilitator: walk the room until every table has ≥3 devices.",
  },
  {
    n: "01",
    name: "TUTORIAL",
    time: "3 min",
    what: "One practice scan per table on a known-good card. The WHY modal must appear on every phone.",
    act: "Players: scan, tap FILE, read the explanation. Facilitator: fix any phone where the WHY modal does not appear.",
  },
  {
    n: "02",
    name: "Phase A — Internal Audit",
    time: "15 min",
    what: "The race. Scan invoices, read them, decide FILE or QUARANTINE. Every decision is scored and explained instantly.",
    act: "Players: read before you tap — valid and invalid cards look identical. Facilitator: nudge tables idle longer than 3 minutes.",
  },
  {
    n: "03",
    name: "Phase B — Trading",
    time: "25 min",
    what: "Some of your valid invoices physically sit at other tables. You can't close a clean ledger without them. Trading opens through the ASP.",
    act: "Players: Procurement leads — find foreign invoices, bring them to the ASP station. Facilitator: validate trades (Card ID, From, To, Validate). Both tables earn +5,000.",
  },
  {
    n: "04",
    name: "Phase C — Outages",
    time: "20 min",
    what: "Outages strike. Each unresolved outage drains −1,000 every 10 seconds (cap −150,000). CIOs solve them; green CONTROL cards unlock.",
    act: "Players: CIO answers the outage question. Facilitator: force-resolve only if a table is genuinely stuck.",
  },
  {
    n: "05",
    name: "FROZEN",
    time: "—",
    what: "The leaderboard locks. Winner = highest compliant capital.",
    act: "Facilitator: show the projection, announce the top 3.",
  },
  {
    n: "06",
    name: "DEBRIEF",
    time: "5+ min",
    what: "The room's own data tells the story: total fines, the most-missed trap, the GRN-04 comparison.",
    act: "Facilitator: open the Debrief screen. The line: 'You just did, under pressure, what a compliant e-invoicing pipeline does every day: read, decide, transmit, verify.'",
  },
];

const roles = [
  {
    name: "CFO",
    color: "violet",
    duty: "Owns the capital. Sets the pace and the risk appetite for the table.",
    tip: "Watch the live leaderboard and decide when your table plays aggressively or safely.",
  },
  {
    name: "Tax & Compliance",
    color: "red",
    duty: "The authority on invoice decisions. Reads every card carefully and calls FILE or QUARANTINE.",
    tip: "You are the voice of the regulation — when in doubt, quarantine and review later.",
  },
  {
    name: "CIO",
    color: "orange",
    duty: "Owns systems. When an outage hits, only you can solve it.",
    tip: "Outage questions are under time pressure — your table bleeds capital every 10 seconds you hesitate.",
  },
  {
    name: "OPS",
    color: "blue",
    duty: "Keeps the pipeline moving. Scans volume, watches the flow, flags anomalies.",
    tip: "You are the first reader. Catch the red flags before they reach compliance.",
  },
  {
    name: "Procurement",
    color: "green",
    duty: "Owns the trade ring. Knows which invoices are foreign and negotiates with other tables.",
    tip: "In Phase B you are the deal-maker. A trade done right is +5,000 for both tables.",
  },
];

const scoring = [
  ["FILE a valid invoice", "+50,000", "Correct decision — the invoice was compliant."],
  ["QUARANTINE an invalid invoice", "+10,000", "Correct decision — you caught the trap."],
  ["FILE an invalid invoice", "Penalty", "The card's regulatory penalty is applied to your capital."],
  ["QUARANTINE a valid invoice", "−25,000", "You rejected a compliant invoice. Lost revenue + fine."],
  ["ASP-validated trade", "+5,000 both", "Foreign invoice returned to its true owner — both tables earn."],
  ["Unresolved outage", "−1,000 / 10 s", "Drains every 10 seconds until the CIO solves it. Cap −150,000."],
];

const emergencies = [
  ["Phone dies", "Reopen the link — state restores. If not, join again with the same table PIN."],
  ["Camera fails on every phone", "Use the 'Enter card ID' manual path — the game continues."],
  ["Table stuck / outage won't clear", "Force-resolve the outage from the facilitator console."],
  ["Wrong penalty applied", "Adjust capital from the console."],
  ["Room chaos", "PAUSE ALL from the console, fix the issue, Resume."],
  ["Game must end NOW", "Kill switch — the leaderboard locks immediately."],
  ["Full restart needed", "Reset game (only from FROZEN or LOBBY)."],
];

const faqs = [
  [
    "Where do we open the game?",
    "The join link is on your table tent (and the projection). Open it on any phone browser — no app to install.",
  ],
  [
    "What is the table PIN?",
    "A short code printed on your table's tent and PIN cards. Enter your table number and the PIN to join. The PIN identifies your table, not a person.",
  ],
  [
    "We have fewer than five people at the table.",
    "No problem — one phone can claim ALL roles at once. You play the same game; you just wear more hats.",
  ],
  [
    "How do we scan a card?",
    "Point your phone camera at the QR code on the card. If the camera fails, tap 'Enter card ID' and type the code printed under the QR.",
  ],
  [
    "What is the WHY modal?",
    "After every decision, the platform shows the regulation behind the verdict — correct or incorrect. Read it: that is where the learning lands. It requires a deliberate tap to dismiss.",
  ],
  [
    "How do I know if an invoice is valid?",
    "You read it. Valid and invalid cards look identical — same layout, same weight, same design. The difference is in the data: missing TRNs, blank fields, PDF attachments, direct email transmissions, inconsistent amounts. There is no colour or badge to trust.",
  ],
  [
    "Why are some of our invoices at other tables?",
    "Three of your valid invoices physically start at other tables. That is the trade ring: to file your full ledger you must find them, negotiate, and bring them home through the ASP.",
  ],
  [
    "What are the colored card bands?",
    "Sorting aids only. INVOICE (orange band) = the documents you decide on. CONTROL (green) = system cards unlocked after outages. ALLIANCE (blue) = negotiation cards for Phase B. PRACTICE (grey) = the tutorial card.",
  ],
  [
    "What happens when an outage hits?",
    "A banner appears; your capital drains −1,000 every 10 seconds. Your CIO solves the outage question to stop it. Once resolved, green CONTROL cards unlock for your table.",
  ],
  [
    "What if I disconnect mid-game?",
    "Reopen the link. Your session restores from the server — a dropped phone never costs your team the game.",
  ],
  [
    "How is the winner decided?",
    "Highest compliant capital when the leaderboard freezes. Speed without accuracy is a losing strategy.",
  ],
  [
    "Can the facilitator change the game?",
    "Yes — and only them. Pause/Resume, adjust capital, force-resolve outages, advance phases early, or reset. Every action records an audit reason.",
  ],
];

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-[var(--kp-line)] bg-white px-6 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
        {q}
        <span className="text-[var(--kp-heat)] transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-base leading-relaxed text-[var(--kp-slate)]">{a}</p>
    </details>
  );
}

export default function GuidePage() {
  // The guide is a documentation page: lock it to the light palette so it
  // renders identically under any OS theme (the dark-mode block re-themes
  // --kp-slate/--kp-mute/--kp-canvas-soft, which would break white cards).
  const lightScope = {
    colorScheme: "light",
    "--kp-canvas-soft": "#F4F7FB",
    "--kp-slate": "#364151",
    "--kp-mute": "#42546B",
    "--kp-indigo": "#12305A",
    "--kp-blue": "#1A7AE5",
    "--kp-blue-deep": "#0D5BB5",
    "--kp-heat": "#F07A00",
    "--kp-heat-deep": "#C45F00",
    "--kp-heat-soft": "#FFC98A",
    "--kp-line": "#D1DAE5",
    "--kp-tinted": "#E4ECF6",
  } as React.CSSProperties;
  return (
    <main
      className="min-h-dvh bg-[#F4F7FB] [font-family:var(--font-body)]"
      style={lightScope}
    >
      {/* HERO */}
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#071321_0%,#0F2748_45%,#12305A_100%)] px-6 py-20 text-white sm:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(26,122,229,0.35),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(240,122,0,0.28),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
            <span className="inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            Serious Game · UAE E-Invoicing
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl [font-family:var(--font-display)]">
            Five-Corner Compliance Simulation
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Ten companies. One million AED each. One hour. You read real-style e-invoices, decide
            FILE or QUARANTINE, and the platform scores you against real UAE regulation — live.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["~80 min", "Full session incl. debrief"],
              ["3–10 tables", "5 roles per company"],
              ["BYO phone", "No app, no install"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/15 bg-white/5 px-5 py-4">
                <div className="text-xl font-bold text-white [font-family:var(--font-display)]">{k}</div>
                <div className="mt-1 text-sm text-white/60">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-[var(--kp-heat)]/40 bg-[var(--kp-heat)]/10 px-6 py-5">
            <p className="text-base font-semibold text-white">
              The golden rule:{" "}
              <span className="text-[var(--kp-heat-soft)]">valid and invalid cards look identical.</span>{" "}
              No colour, no badge, no layout tells you the answer. The only way to decide is to
              read the invoice.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-14 sm:px-10">
        {/* THE ARC */}
        <section id="arc">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kp-blue-deep)]">
            <span className="mr-2 inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            The arc
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
            The game from join to debrief
          </h2>
          <div className="mt-8 space-y-4">
            {phases.map((p) => (
              <div key={p.n} className="grid gap-4 rounded-2xl border border-[var(--kp-line)] bg-white p-6 sm:grid-cols-[72px_1fr]">
                <div>
                  <div className="font-mono text-3xl font-semibold text-[var(--kp-heat)]">{p.n}</div>
                  <div className="mt-1 font-mono text-xs uppercase tracking-wider text-[var(--kp-mute)]">{p.time}</div>
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="text-xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">{p.name}</h3>
                  </div>
                  <p className="mt-1 text-base leading-relaxed text-[var(--kp-slate)]">{p.what}</p>
                  <p className="mt-3 rounded-xl bg-[var(--kp-canvas-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--kp-slate)]">
                    <span className="font-semibold text-[var(--kp-blue-deep)]">What to do: </span>
                    {p.act}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ROLES */}
        <section id="roles" className="mt-16">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kp-blue-deep)]">
            <span className="mr-2 inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            The team
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
            Five roles per company
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {roles.map((r) => (
              <div key={r.name} className="rounded-2xl border border-[var(--kp-line)] bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-3 w-3 rounded-full bg-[var(--kp-blue)]" />
                  <h3 className="text-xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">{r.name}</h3>
                </div>
                <p className="mt-2 text-base leading-relaxed text-[var(--kp-slate)]">{r.duty}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--kp-mute)]">
                  <span className="font-semibold text-[var(--kp-blue-deep)]">Pro tip: </span>
                  {r.tip}
                </p>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-dashed border-[var(--kp-heat)]/50 bg-[var(--kp-heat)]/5 p-6">
              <h3 className="text-xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
                Short on people?
              </h3>
              <p className="mt-2 text-base leading-relaxed text-[var(--kp-slate)]">
                One phone can claim <span className="font-semibold">ALL roles</span> at a table. The
                game is fully playable from a single device — it just gets busier.
              </p>
            </div>
          </div>
        </section>

        {/* HOW TO PLAY */}
        <section id="play" className="mt-16">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kp-blue-deep)]">
            <span className="mr-2 inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            For players
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
            The decision loop
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              ["1 · SCAN", "Point your camera at the QR — or type the card ID printed under it."],
              ["2 · READ", "Check the six hallmarks: format, TRNs, mandatory fields, ASP routing, timestamps, amounts."],
              ["3 · DECIDE", "FILE the compliant invoice. QUARANTINE the trap. Wrong calls cost capital."],
              ["4 · LEARN", "The platform shows the regulation behind every verdict. Read it — this is the training."],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-[var(--kp-line)] bg-white p-5">
                <div className="font-mono text-sm font-semibold uppercase tracking-wider text-[var(--kp-heat)]">{k}</div>
                <p className="mt-2 text-base leading-relaxed text-[var(--kp-slate)]">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SCORING */}
        <section id="scoring" className="mt-16">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kp-blue-deep)]">
            <span className="mr-2 inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            Scoring
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
            How capital moves
          </h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--kp-line)]">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="bg-[var(--kp-indigo)] text-white">
                  <th className="px-5 py-3 font-semibold">Decision</th>
                  <th className="px-5 py-3 font-semibold">Impact</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {scoring.map(([d, i, n], idx) => (
                  <tr key={d} className={idx % 2 ? "bg-[var(--kp-canvas-soft)]" : "bg-white"}>
                    <td className="px-5 py-3 font-medium text-[var(--kp-indigo)]">{d}</td>
                    <td className="px-5 py-3 font-semibold text-[var(--kp-slate)]">{i}</td>
                    <td className="hidden px-5 py-3 text-sm text-[var(--kp-mute)] sm:table-cell">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FACILITATOR */}
        <section id="facilitator" className="mt-16">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kp-blue-deep)]">
            <span className="mr-2 inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            For facilitators
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
            How to guide the room
          </h2>

          <div className="mt-8 rounded-2xl border border-[var(--kp-line)] bg-white p-6">
            <h3 className="text-lg font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
              Before the event (T−30 min)
            </h3>
            <ul className="mt-3 space-y-2 text-base leading-relaxed text-[var(--kp-slate)]">
              <li>• Put the projection on <code className="rounded bg-[var(--kp-tinted)] px-1.5 py-0.5 font-mono text-sm">/projection</code> and open the console on your laptop.</li>
              <li>• <span className="font-semibold">Reset the game</span> so every table starts at 1,000,000 and the phase is LOBBY.</li>
              <li>• Set active tables to the real headcount (3–10).</li>
              <li>• Hand each table its envelope: tent with PIN + join link, the card deck, the how-to-play card.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--kp-line)] bg-white p-6">
            <h3 className="text-lg font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
              Your job during each phase
            </h3>
            <ul className="mt-3 space-y-2 text-base leading-relaxed text-[var(--kp-slate)]">
              <li>• <span className="font-semibold">LOBBY:</span> get every table to ≥3 devices. Watch the console&apos;s red flags for stragglers.</li>
              <li>• <span className="font-semibold">TUTORIAL:</span> one practice scan per table; confirm the WHY modal appears. Then advance to A.</li>
              <li>• <span className="font-semibold">Phase A:</span> encourage volume, not perfection. Nudge tables idle &gt;3 minutes. Do not touch capital unless a real failure happened.</li>
              <li>• <span className="font-semibold">Phase B:</span> you are the ASP. Run the trade validation panel: Card ID, From, To, Validate. Keep a short queue; validate as they arrive.</li>
              <li>• <span className="font-semibold">Phase C:</span> outages arm automatically. Force-resolve only if a table is genuinely stuck. Watch the −150,000 cap.</li>
              <li>• <span className="font-semibold">FROZEN → DEBRIEF:</span> show the leaderboard, open the Debrief screen, land the line.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--kp-line)] bg-white p-6">
            <h3 className="text-lg font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
              Console superpowers (use them, record a reason)
            </h3>
            <ul className="mt-3 space-y-2 text-base leading-relaxed text-[var(--kp-slate)]">
              <li>• <span className="font-semibold">Pause / Resume</span> — freeze the room, fix, resume.</li>
              <li>• <span className="font-semibold">Adjust capital</span> — repair a wrong penalty.</li>
              <li>• <span className="font-semibold">Force-resolve outage</span> — unstick a stuck table.</li>
              <li>• <span className="font-semibold">Scan for a table</span> — the zero-device rescue: play a card for a table with no phone.</li>
              <li>• <span className="font-semibold">Kill switch</span> — end the game now; the leaderboard locks.</li>
              <li>• <span className="font-semibold">Reset</span> — full restart, only from FROZEN or LOBBY.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--kp-line)] bg-white p-6">
            <h3 className="text-lg font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
              Emergency playbook
            </h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--kp-line)]">
              <table className="w-full text-left text-base">
                <tbody>
                  {emergencies.map(([k, v], idx) => (
                    <tr key={k} className={idx % 2 ? "bg-[var(--kp-canvas-soft)]" : "bg-white"}>
                      <td className="w-1/3 px-4 py-3 font-semibold text-[var(--kp-indigo)]">{k}</td>
                      <td className="px-4 py-3 text-[var(--kp-slate)]">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--kp-mute)]">
              Golden rules: never hand out card verdicts — let the platform teach. The cards look
              identical — don&apos;t spoil it. Every console action needs an audit reason — type it.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-16">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kp-blue-deep)]">
            <span className="mr-2 inline-block h-1 w-7 bg-[var(--kp-heat)]" />
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--kp-indigo)] [font-family:var(--font-display)]">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map(([q, a]) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-[var(--kp-line)] pt-8 text-center font-mono text-xs uppercase tracking-[0.08em] text-[var(--kp-mute)]">
          BeyondPlus × KamelPay · Five-Corner Compliance Simulation
        </footer>
      </div>
    </main>
  );
}
