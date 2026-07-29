import { tickMemoryOutages } from "./outage.store";
import { publishGlobal } from "./sse";
import { tickOutagesPg } from "./store.pg";
import { selectStoreKind } from "./store.interface";

/** Tick-only catch-up. Arming belongs exclusively to the atomic Phase C transition. */
export async function catchUpOutages(now = new Date()): Promise<{ ticks: number }> {
  const ticks = await tickOutagesOnce(now);
  if (ticks) await publishGlobal();
  return { ticks };
}

export async function tickOutagesOnce(now = new Date()): Promise<number> {
  return selectStoreKind() === "postgres" ? tickOutagesPg(now) : tickMemoryOutages(now);
}

type CronDependencies = {
  tick: () => Promise<number>;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  publish: () => Promise<unknown>;
  signal: AbortSignal;
};

export async function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

export async function runOutageCron(deps: CronDependencies): Promise<{ ticks: number; attempts: number }> {
  let ticks = 0;
  let attempts = 0;
  for (let slot = 0; slot < 6 && !deps.signal.aborted; slot++) {
    const inserted = await deps.tick();
    attempts++;
    ticks += inserted;
    if (inserted > 0) await deps.publish();
    if (slot < 5) await deps.sleep(10_000, deps.signal);
  }
  return { ticks, attempts };
}
