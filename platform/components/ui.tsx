"use client";

import { useEffect, useState } from "react";
import type { TeachingModal } from "@/lib/types";

export function WhyModal({
  modal,
  onDismiss,
}: {
  modal: TeachingModal;
  onDismiss: () => void;
}) {
  useEffect(() => {
    try {
      navigator.vibrate?.(40);
    } catch {
      /* ignore */
    }
  }, []);

  const icon =
    modal.icon === "check"
      ? "✓"
      : modal.icon === "cross"
        ? "✕"
        : modal.icon === "warn"
          ? "!"
          : "i";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] p-6"
    >
      <div className="flex items-center gap-3 text-xl font-bold">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--fg)] text-2xl"
        >
          {icon}
        </span>
        <span>{modal.word}</span>
      </div>
      <h2 className="mt-6 text-2xl font-bold">{modal.title}</h2>
      <p className="mt-2 text-3xl font-bold tabular">
        {modal.delta_aed >= 0 ? "+" : ""}
        {modal.delta_aed.toLocaleString()} AED
      </p>
      <p className="mt-6 flex-1 text-lg leading-relaxed">{modal.why}</p>
      <button
        type="button"
        className="tap mt-6 w-full rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] py-4 text-xl font-bold text-[var(--bg)]"
        onClick={onDismiss}
      >
        Got it — continue
      </button>
    </div>
  );
}

export function usePlayerState(pollMs = 5000) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      const res = await fetch("/api/state");
      if (res.status === 401) {
        if (!dead) setError("session");
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (!dead) setData(json);
    };
    void load();
    const id = setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [pollMs]);

  useEffect(() => {
    const table = (data?.session as { tableNo?: number } | undefined)?.tableNo;
    if (!table) return;
    const es = new EventSource(`/api/stream?table=${table}`);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "tick") {
          void fetch("/api/state")
            .then((r) => r.json())
            .then(setData);
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [data?.session]);

  return { data, error };
}

export function formatAed(n: number): string {
  return `AED ${n.toLocaleString()}`;
}
