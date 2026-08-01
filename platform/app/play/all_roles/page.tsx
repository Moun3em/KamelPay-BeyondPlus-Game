"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhaseBanner, usePlayerState } from "@/components/ui";

export default function AllRolesPage() {
  const router = useRouter();
  const { data, error } = usePlayerState();

  useEffect(() => {
    if (error === "session") router.replace("/join");
  }, [error, router]);

  const links = [
    { href: "/play/cfo", label: "CFO — Balance sheet" },
    { href: "/play/tax", label: "Tax — Scanner" },
    { href: "/play/cio", label: "CIO — Systems" },
    { href: "/play/procurement", label: "Procurement — Trade" },
    { href: "/play/ops", label: "Operations — Trade" },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">All roles — single device</h1>
      <p className="text-[var(--muted)]">
        Table {String((data?.session as { tableNo?: number })?.tableNo ?? "—")}
      </p>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="tap flex items-center rounded-lg border-2 border-[var(--fg)] px-4 py-4 font-semibold"
        >
          {l.label}
        </Link>
      ))}
      {data?.banner ? <PhaseBanner text={String(data.banner)} /> : null}
    </main>
  );
}
