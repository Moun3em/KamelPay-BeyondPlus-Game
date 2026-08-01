"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WhyModal, usePlayerState } from "@/components/ui";
import type { TeachingModal } from "@/lib/types";

export default function CioPage() {
  const router = useRouter();
  const { data, error } = usePlayerState(2000);
  const [answer, setAnswer] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [modal, setModal] = useState<TeachingModal | null>(null);
  const solveKey = useRef<string | null>(null);

  useEffect(() => {
    if (error === "session") router.replace("/join");
  }, [error, router]);

  const session = data?.session as { deviceId: string; tableNo: number } | undefined;
  const outage = data?.outage as {
    active: boolean;
    green_unlocked: boolean;
    wrong_tries: number;
  } | undefined;

  useEffect(() => {
    if (!outage?.active || muted) return;
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* ignore */
    }
  }, [outage?.active, muted]);

  async function submit() {
    if (!session) return;
    solveKey.current ??= crypto.randomUUID();
    let json: Record<string, unknown>;
    try {
      const res = await fetch("/api/outage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "solve",
          answer,
          idempotencyKey: solveKey.current,
        }),
      });
      json = await res.json() as Record<string, unknown>;
      solveKey.current = null;
    } catch {
      setMsg("Network interrupted. Tap Restore systems to retry safely.");
      return;
    }
    if (json.ok) {
      setModal(json.modal as TeachingModal);
      setMsg(null);
      return;
    }
    setMsg(
      [json.hint, json.force, "Incorrect sequence."]
        .filter(Boolean)
        .join(" "),
    );
  }

  if (outage?.active) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 bg-[var(--c1)] px-4 py-6 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">OUTAGE</h1>
          <button
            type="button"
            className="tap rounded border-2 border-white px-3 font-semibold"
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? "Unmute alarm" : "Mute alarm"}
          </button>
        </div>
        <p className="text-lg">
          Encrypted system log — restore five-corner routing for a supplier-issued
          invoice.
        </p>
        <pre className="overflow-auto rounded border-2 border-white/40 bg-black/30 p-3 text-lg leading-relaxed">
{`C? → C? → C? → C? → C?
supplier ASP · buyer ASP · FTA
sequence required`}
        </pre>
        <label className="font-semibold">
          Corner order (e.g. 1-3-4-2-5)
          <input
            className="tap mt-2 w-full rounded-lg border-2 border-white bg-transparent px-3 text-white"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="tap rounded-lg border-2 border-white bg-white py-4 text-xl font-bold text-[var(--c1)]"
          onClick={() => void submit()}
        >
          Restore systems
        </button>
        {msg ? (
          <p role="alert" className="rounded border-2 border-white p-3">
            <strong>Check — </strong>
            {msg}
          </p>
        ) : null}
        {modal ? (
          <WhyModal modal={modal} onDismiss={() => setModal(null)} />
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">System Monitor</h1>
      <p className="flex items-center gap-2 text-lg font-semibold text-[var(--c3)]">
        <span aria-hidden>●</span> ALL SYSTEMS NOMINAL
      </p>
      <ul className="space-y-2">
        <li>Supplier ASP — connected</li>
        <li>Buyer ASP — connected</li>
        <li>FTA reporting — real-time</li>
      </ul>
      <p className="text-[var(--muted)]">
        Nothing is wrong. This is the most dangerous screen in the room.
      </p>
      {outage?.green_unlocked ? (
        <p className="rounded-lg border-2 border-[var(--c3)] p-3 font-semibold">
          <span aria-hidden>✓</span> Green AbsoluteCard deck unlocked
        </p>
      ) : null}
    </main>
  );
}
