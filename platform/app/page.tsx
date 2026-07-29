import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[var(--c3)]">
          Kamel Pay × Beyond Plus
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">
          Five-Corner Compliance Simulation
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Scan your table tent QR, or open a facilitator surface below.
        </p>
      </div>
      <nav className="flex flex-col gap-3">
        <Link
          href="/join"
          className="tap flex items-center justify-center rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] px-4 py-3 font-semibold text-[var(--bg)]"
        >
          Join a table
        </Link>
        <Link
          href="/console"
          className="tap flex items-center justify-center rounded-lg border-2 border-[var(--fg)] px-4 py-3 font-semibold"
        >
          Facilitator console
        </Link>
        <Link
          href="/projection"
          className="tap flex items-center justify-center rounded-lg border-2 border-[var(--fg)] px-4 py-3 font-semibold"
        >
          Projection board
        </Link>
      </nav>
    </main>
  );
}
