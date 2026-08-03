import Link from "next/link";
import { FiveCorners } from "@/components/five-corners";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-[var(--kp-ink)] via-[#0A1B33] to-[#071321] text-white">
      {/* Ambient constellation — the five-corner route, drifting */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <FiveCorners className="absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 opacity-60" />
      </div>
      {/* Soft vignette to keep the reading plane calm */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,transparent_40%,rgba(7,19,33,0.92)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-12 px-6 py-16">
        <header className="kp-rise" style={{ animationDelay: "0.05s" }}>
          <p className="text-lg font-semibold tracking-[0.18em] text-[var(--kp-heat-soft)]">
            KAMEL PAY × BEYOND PLUS
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight">
            Five-Corner
            <br />
            Compliance Simulation
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-white/75">
            Scan the QR on your table tent to join, or open the facilitator
            console below.
          </p>
        </header>

        <nav className="flex flex-col gap-3">
          <Link
            href="/join"
            className="kp-rise tap flex items-center justify-between rounded-2xl bg-[var(--kp-blue)] px-6 py-4 text-xl font-semibold text-white shadow-[0_10px_30px_rgba(26,122,229,0.35)] transition-colors hover:bg-[var(--kp-blue-deep)]"
            style={{ animationDelay: "0.15s" }}
          >
            <span>Join a table</span>
            <span aria-hidden className="text-2xl">
              →
            </span>
          </Link>
          <Link
            href="/console"
            className="kp-rise tap flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-xl font-semibold text-white transition-colors hover:bg-white/[0.12]"
            style={{ animationDelay: "0.25s" }}
          >
            <span>Facilitator console</span>
            <span aria-hidden className="text-2xl text-white/60">
              →
            </span>
          </Link>
          <Link
            href="/projection"
            className="kp-rise tap flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-xl font-semibold text-white transition-colors hover:bg-white/[0.12]"
            style={{ animationDelay: "0.35s" }}
          >
            <span>Projection board</span>
            <span aria-hidden className="text-2xl text-white/60">
              →
            </span>
          </Link>
        </nav>

        <footer
          className="kp-rise text-lg text-white/50"
          style={{ animationDelay: "0.45s" }}
        >
          Need help? Ask the facilitator.
        </footer>
      </div>
    </main>
  );
}
