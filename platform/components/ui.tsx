"use client";

import { useCallback, useEffect, useState } from "react";
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

  const iconClass =
    modal.icon === "check"
      ? "bg-[var(--kp-success)]/10 border-[var(--kp-success)] text-[var(--kp-success)]"
      : modal.icon === "cross"
        ? "bg-[var(--kp-danger)]/10 border-[var(--kp-danger)] text-[var(--kp-danger)]"
        : modal.icon === "warn"
          ? "bg-[var(--kp-warn)]/10 border-[var(--kp-warn)] text-[var(--kp-warn)]"
          : "bg-[var(--kp-tinted)] border-[var(--kp-blue)] text-[var(--kp-blue)]";

  const sign = modal.delta_aed >= 0 ? "+" : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--kp-canvas)] p-6"
    >
      <div className="flex items-center gap-3 text-xl font-bold tracking-wide text-[var(--c3)]">
        <span
          aria-hidden
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-2xl ${iconClass}`}
        >
          {icon}
        </span>
        <span>{modal.word}</span>
      </div>
      <h2 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-[var(--kp-ink)]">
        {modal.title}
      </h2>
      <p
        className={`mt-2 text-4xl font-bold tabular ${
          modal.delta_aed >= 0 ? "text-[var(--kp-success)]" : "text-[var(--kp-danger)]"
        }`}
      >
        {sign}
        {modal.delta_aed.toLocaleString()} AED
      </p>
      <p className="mt-6 flex-1 text-lg leading-relaxed text-[var(--kp-slate)]">
        {modal.why}
      </p>
      <button
        type="button"
        className="tap mt-6 w-full rounded-xl bg-[var(--kp-blue)] py-4 text-xl font-bold text-white transition-colors hover:bg-[var(--kp-blue-deep)]"
        onClick={onDismiss}
      >
        Got it — continue
      </button>
    </div>
  );
}

export function usePlayerState(pollMs = 5000, scope?: string) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const url = scope ? `/api/state?scope=${encodeURIComponent(scope)}` : "/api/state";
    const res = await fetch(url);
    if (res.status === 401) {
      setError("session");
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    let dead = false;
    const tick = async () => {
      if (dead) return;
      await load();
    };
    void tick();
    const id = setInterval(() => void tick(), pollMs);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [pollMs, load]);

  useEffect(() => {
    const table = (data?.session as { tableNo?: number } | undefined)?.tableNo;
    if (!table) return;
    const es = new EventSource(`/api/stream?table=${table}`);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "tick") {
          void load();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [data?.session, load]);

  return { data, error, refresh: load };
}

export function formatAed(n: number): string {
  return `AED ${n.toLocaleString()}`;
}

/** Player-facing announcement banner (Event Mode phase messages + broadcasts). */
export function PhaseBanner({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="rounded-2xl border border-[var(--kp-warn)] bg-[var(--kp-warn)]/10 p-4 text-lg font-semibold text-[var(--kp-ink)]"
    >
      <span aria-hidden className="mr-2">📢</span>
      {text}
    </p>
  );
}
