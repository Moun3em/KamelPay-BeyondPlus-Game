"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhaseBanner, usePlayerState } from "@/components/ui";

export default function TradePortalPage() {
  const router = useRouter();
  const { data, error } = usePlayerState();

  useEffect(() => {
    if (error === "session") router.replace("/join");
  }, [error, router]);

  const ledger = data?.ledger as {
    missing: { archetype: string; held_by_table: number }[];
    holding_for: { archetype: string; owner_table: number }[];
  } | undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Trade Portal</h1>

      <section>
        <div className="mb-2 grid grid-cols-2 gap-2 text-lg font-bold tracking-wide">
          <span>YOU NEED</span>
          <span>WALK TO</span>
        </div>
        <ul className="space-y-3">
          {(ledger?.missing ?? []).map((m) => (
            <li
              key={`${m.archetype}-${m.held_by_table}`}
              className="grid grid-cols-2 gap-2 border-b border-[var(--fg)] pb-2 text-lg font-semibold"
            >
              <span>Invoice {m.archetype}</span>
              <span>
                TABLE {String(m.held_by_table).padStart(2, "0")}
              </span>
            </li>
          ))}
          {(ledger?.missing ?? []).length === 0 ? (
            <li className="text-[var(--muted)]">No outstanding own valids.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <div className="mb-2 grid grid-cols-2 gap-2 text-lg font-bold tracking-wide">
          <span>YOU ARE HOLDING</span>
          <span>THEY NEED IT</span>
        </div>
        <ul className="space-y-3">
          {(ledger?.holding_for ?? []).map((h) => (
            <li
              key={h.archetype + h.owner_table}
              className="grid grid-cols-2 gap-2 border-b border-[var(--fg)] pb-2 text-lg font-semibold"
            >
              <span>
                T-{String(h.owner_table).padStart(2, "0")}&apos;s {h.archetype}
              </span>
              <span>
                TABLE {String(h.owner_table).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[var(--muted)]">
        You cannot close your ledger from this chair.
      </p>
      {data?.banner ? <PhaseBanner text={String(data.banner)} /> : null}
    </main>
  );
}
