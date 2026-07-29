"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WhyModal, usePlayerState } from "@/components/ui";
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Tax & Compliance</p>
          <p className="text-lg font-bold">
            T-{String(session?.tableNo ?? "—").padStart(2, "0")}
          </p>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {String(data?.phase ?? "")}
        </p>
      </header>

      <div className="relative min-h-[45vh] flex-1 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        {camError ? (
          <p className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-white">
            <span>
              <strong>Camera unavailable</strong>
              <br />
              {camError}
            </span>
          </p>
        ) : null}
        {scannedCode ? (
          <p className="absolute bottom-3 left-3 right-3 rounded bg-white/95 p-3 text-center text-[var(--fg)]">
            Scanned — now choose FILE or QUARANTINE
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void commit("FILE")}
          className="tap flex min-h-24 flex-col items-center justify-center rounded-lg border-2 border-[var(--fg)] bg-[var(--c3)] text-xl font-bold text-white"
        >
          <span aria-hidden>▲</span>
          FILE
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void commit("QUARANTINE")}
          className="tap flex min-h-24 flex-col items-center justify-center rounded-lg border-2 border-[var(--fg)] bg-[var(--c1)] text-xl font-bold text-white"
        >
          <span aria-hidden>⛔</span>
          QUARANTINE
        </button>
      </div>

      <button
        type="button"
        className="tap mx-4 mb-4 rounded-lg border-2 border-[var(--fg)] py-3 font-semibold"
        onClick={() => setManualOpen((v) => !v)}
      >
        Can&apos;t scan? Enter card ID
      </button>

      {manualOpen ? (
        <div className="mx-4 mb-6 flex flex-col gap-3">
          <label className="font-semibold">
            Card ID (under the QR)
            <input
              className="tap mt-2 w-full rounded-lg border-2 border-[var(--fg)] bg-transparent px-3 uppercase"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="RED-T01-V1"
            />
          </label>
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" className="mx-4 mb-4 rounded-lg border-2 border-[var(--c1)] p-3">
          <strong>Blocked — </strong>
          {actionError}
        </p>
      ) : null}

      {modal ? (
        <WhyModal modal={modal} onDismiss={() => setModal(null)} />
      ) : null}
    </main>
  );
}
