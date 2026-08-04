import Link from "next/link";
import { FiveCorners } from "@/components/five-corners";
import { CyberBackdrop } from "@/components/cyber-backdrop";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#050A14] text-white">
      {/* Futuristic ambient layer */}
      <CyberBackdrop />

      {/* Glowing five-corner constellation — the game's identity */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <FiveCorners className="absolute left-1/2 top-1/2 h-[125vmin] w-[125vmin] -translate-x-1/2 -translate-y-1/2 opacity-75" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-12 px-6 py-16">
        <header className="kp-rise" style={{ animationDelay: "0.05s" }}>
          <p className="flex items-center gap-2 font-mono text-lg font-semibold tracking-[0.22em] text-[var(--kp-heat-soft)]">
            <span
              className="kp-live inline-block h-2.5 w-2.5 rounded-full bg-[var(--kp-success)]"
              aria-hidden="true"
            />
            KAMEL PAY × BEYOND PLUS
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight">
            Five-Corner
            <br />
            Compliance Simulation
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-white/70">
            Scan the QR on your table tent to join, or open the facilitator
            console below.
          </p>
        </header>

        <nav className="flex flex-col gap-3">
          <Link
            href="/join"
            className="kp-rise tap flex items-center justify-between rounded-2xl bg-[var(--kp-blue)] px-6 py-4 text-xl font-semibold text-white shadow-[0_0_28px_rgba(26,122,229,0.45)] transition-colors hover:bg-[var(--kp-blue-deep)]"
            style={{ animationDelay: "0.15s" }}
          >
            <span>Join a table</span>
            <span aria-hidden className="text-2xl">
              →
            </span>
          </Link>
          <Link
            href="/console"
            className="kp-rise kp-glass tap flex items-center justify-between rounded-2xl px-6 py-4 text-xl font-semibold text-white transition-colors hover:border-[var(--kp-blue)]/60"
            style={{ animationDelay: "0.25s" }}
          >
            <span>Facilitator console</span>
            <span aria-hidden className="text-2xl text-white/60">
              →
            </span>
          </Link>
          <Link
            href="/projection"
            className="kp-rise kp-glass tap flex items-center justify-between rounded-2xl px-6 py-4 text-xl font-semibold text-white transition-colors hover:border-[var(--kp-blue)]/60"
            style={{ animationDelay: "0.35s" }}
          >
            <span>Projection board</span>
            <span aria-hidden className="text-2xl text-white/60">
              →
            </span>
          </Link>
        </nav>

        <footer
          className="kp-rise font-mono text-base text-white/40"
          style={{ animationDelay: "0.45s" }}
        >
          NEED HELP? ASK THE FACILITATOR.
        </footer>
      </div>
    </main>
  );
}
