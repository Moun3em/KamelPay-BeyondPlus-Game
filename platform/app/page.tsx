import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-12 px-6 py-16">
      <header>
        <p className="text-xl font-semibold tracking-[0.18em] text-[var(--c3)]">
          KAMEL PAY × BEYOND PLUS
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight">
          Five-Corner<br />Compliance Simulation
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[var(--kp-slate)]">
          Scan the QR on your table tent to join, or open the facilitator
          console below.
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        <Link
          href="/join"
          className="tap flex items-center justify-between rounded-xl bg-[var(--kp-blue)] px-6 py-4 text-xl font-semibold text-white shadow-[0_2px_8px_rgba(0,89,247,0.18)] transition-colors hover:bg-[var(--kp-blue-deep)]"
        >
          <span>Join a table</span>
          <span aria-hidden className="text-2xl">→</span>
        </Link>
        <Link
          href="/console"
          className="tap flex items-center justify-between rounded-xl border-2 border-[var(--kp-line)] bg-white px-6 py-4 text-xl font-semibold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)]"
        >
          <span>Facilitator console</span>
          <span aria-hidden className="text-2xl text-[var(--kp-mute)]">→</span>
        </Link>
        <Link
          href="/projection"
          className="tap flex items-center justify-between rounded-xl border-2 border-[var(--kp-line)] bg-white px-6 py-4 text-xl font-semibold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)]"
        >
          <span>Projection board</span>
          <span aria-hidden className="text-2xl text-[var(--kp-mute)]">→</span>
        </Link>
      </nav>

      <footer className="text-base text-[var(--kp-mute)]">
        Need help? Ask the facilitator.
      </footer>
    </main>
  );
}