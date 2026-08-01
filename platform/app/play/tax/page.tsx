"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseBanner, WhyModal, usePlayerState } from "@/components/ui";
import type { TeachingModal } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export default function TaxScannerPage() {
  const router = useRouter();
  const { data, error } = usePlayerState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [cardId, setCardId] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<TeachingModal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (error === "session") router.replace("/join");
  }, [error, router]);

  useEffect(() => {
    let cancelled = false;
    async function startCam() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices[0]?.deviceId;
        if (!deviceId || !videoRef.current) {
          setCamError("No camera found — use Enter card ID.");
          return;
        }
        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              setScannedCode(result.getText());
            }
          },
        );
        controlsRef.current = controls;
      } catch {
        setCamError(
          "Camera blocked or unavailable — use Enter card ID. (HTTPS required on phones.)",
        );
      }
    }
    void startCam();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);

  const session = data?.session as
    | { deviceId: string; tableNo: number; role: string }
    | undefined;

  const commit = useCallback(
    async (action: "FILE" | "QUARANTINE") => {
      if (!session) return;
      if (!scannedCode && !cardId.trim()) {
        setActionError("Scan a QR or enter a card ID first.");
        return;
      }
      setBusy(true);
      setActionError(null);
      const idempotencyKey =
        sessionStorage.getItem("kp5c_pending_key") ?? uuidv4();
      sessionStorage.setItem("kp5c_pending_key", idempotencyKey);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            idempotencyKey,
            qr: scannedCode ?? undefined,
            cardId: scannedCode ? undefined : cardId.trim().toUpperCase(),
          }),
        });
        const json = await res.json();
        if (json.modal) {
          sessionStorage.removeItem("kp5c_pending_key");
          setModal(json.modal);
          setScannedCode(null);
          setCardId("");
          return;
        }
        if (!res.ok) {
          setActionError(
            [json.error, json.hint].filter(Boolean).join(" — ") ||
              "Scan failed",
          );
          return;
        }
        sessionStorage.removeItem("kp5c_pending_key");
        setModal(json.modal);
        setScannedCode(null);
        setCardId("");
      } finally {
        setBusy(false);
      }
    },
    [session, scannedCode, cardId],
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--kp-canvas)]">
      <header className="flex items-center justify-between border-b border-[var(--kp-line)] bg-white px-5 py-4">
        <div>
          <p className="text-base font-semibold tracking-[0.12em] text-[var(--c3)]">
            TAX &amp; COMPLIANCE
          </p>
          <p className="text-2xl font-bold leading-tight tabular">
            T-{String(session?.tableNo ?? "—").padStart(2, "0")}
          </p>
        </div>
        <p className="text-base font-semibold uppercase tracking-wide text-[var(--kp-mute)]">
          {String(data?.phase ?? "")}
        </p>
      </header>

      <div className="relative min-h-[45vh] flex-1 bg-[var(--kp-ink)]">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        {camError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--kp-ink)]/95 p-6 text-center text-white">
            <div className="flex flex-col gap-2">
              <span aria-hidden className="text-4xl">📷</span>
              <strong className="text-xl font-bold">Camera unavailable</strong>
              <span className="text-base">{camError}</span>
            </div>
          </div>
        ) : null}
        {scannedCode ? (
          <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white p-4 text-center shadow-lg">
            <p className="text-base font-semibold text-[var(--kp-slate)]">
              Scanned
            </p>
            <p className="mt-1 text-lg font-bold tabular tracking-wider text-[var(--kp-ink)]">
              {scannedCode.slice(0, 16)}{scannedCode.length > 16 ? "…" : ""}
            </p>
            <p className="mt-2 text-base text-[var(--kp-mute)]">
              Choose FILE or QUARANTINE
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void commit("FILE")}
          className="tap flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl bg-[var(--kp-success)] text-xl font-bold text-white shadow-[0_2px_8px_rgba(0,115,77,0.20)] transition-colors hover:opacity-90 disabled:opacity-40"
        >
          <span aria-hidden className="text-2xl">✓</span>
          FILE
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void commit("QUARANTINE")}
          className="tap flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl bg-[var(--kp-danger)] text-xl font-bold text-white shadow-[0_2px_8px_rgba(163,0,27,0.20)] transition-colors hover:opacity-90 disabled:opacity-40"
        >
          <span aria-hidden className="text-2xl">⛔</span>
          QUARANTINE
        </button>
      </div>

      <button
        type="button"
        className="tap mx-4 mb-3 min-h-12 rounded-xl border-2 border-[var(--kp-line)] bg-white py-3 text-lg font-semibold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)]"
        onClick={() => setManualOpen((v) => !v)}
      >
        {manualOpen ? "Hide manual entry" : "Can't scan? Enter card ID"}
      </button>

      {manualOpen ? (
        <div className="mx-4 mb-4 flex flex-col gap-2 rounded-xl border-2 border-[var(--kp-line)] bg-white p-4">
          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">Card ID (under the QR)</span>
            <input
              className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg font-semibold uppercase tabular focus:border-[var(--kp-blue)] focus:outline-none"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="RED-T01-V1"
            />
          </label>
        </div>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="mx-4 mb-4 rounded-xl border-2 border-[var(--kp-danger)] bg-[var(--kp-danger)]/10 p-4 text-lg text-[var(--kp-ink)]"
        >
          <strong className="font-bold">Blocked — </strong>
          {actionError}
        </p>
      ) : null}

      {modal ? (
        <WhyModal modal={modal} onDismiss={() => setModal(null)} />
      ) : null}
      {data?.banner ? <PhaseBanner text={String(data.banner)} /> : null}
    </main>
  );
}