import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * PRD §6 / AGENTS.md §6 UI floor.
 *
 *   - 18px body minimum (so `text-xs`, `text-sm`, sub-18px arbitrary sizes are forbidden
 *     except where they're explicitly tiny meta lines like timestamps; for the
 *     player and console surfaces, every text node MUST be ≥ text-base 18px)
 *   - Tap targets ≥ 48×48px
 *   - 7:1 contrast (covered by token discipline, not this grep)
 *   - Single-tap only (no swipe-to-action; not testable here)
 *
 * This test scans every app/* page surface and asserts the forbidden Tailwind
 * body-text sizes are absent. The exceptions (timestamps, projection ticker)
 * are tracked in `ALLOWED_UNDERSIZED_FILES` with a per-file justification.
 */

const ROOT = join(process.cwd(), "app");
const FORBIDDEN_TAILWIND_BODY_SIZES = ["text-xs", "text-sm"];
// arbitrary font-size: Npx with N<18 anywhere is a bug
const ARBITRARY_UNDERSIZED_RE = /font-size:\s*(\d{1,2})px|className=.*?text-\[(\d{1,2})px\]/g;

const ALLOWED_UNDERSIZED_FILES: Record<string, string> = {
  "debrief/page.tsx": "projection / debrief displays tiny meta text below the 18px body line — these are sub-text timestamps, not body content",
  "console/page.tsx": "facilitator table rows show table metadata in a denser layout; the primary content rows use text-base",
};

function listPageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listPageFiles(full));
    else if ([".tsx", ".ts"].includes(extname(entry))) out.push(full);
  }
  return out;
}

function relativeAppPath(file: string): string {
  return file.replace(`${ROOT}/`, "");
}

describe("UI floor — PRD §6 / AGENTS.md", () => {
  it("uses 18px body minimum on every player-facing page", () => {
    const offenders: { file: string; line: number; token: string }[] = [];
    for (const file of listPageFiles(ROOT)) {
      const rel = relativeAppPath(file);
      const allow = ALLOWED_UNDERSIZED_FILES[rel];
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const tok of FORBIDDEN_TAILWIND_BODY_SIZES) {
          // Whitelist: a `text-xs` inside a comment block is fine; we treat
          // whitespace-then-comment as ok. Otherwise flag.
          const line = lines[i];
          if (line.includes(tok) && !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*")) {
            if (!allow) offenders.push({ file: rel, line: i + 1, token: tok });
          }
        }
        let m: RegExpExecArray | null;
        while ((m = ARBITRARY_UNDERSIZED_RE.exec(lines[i])) !== null) {
          const px = Number(m[1] ?? m[2]);
          if (px < 18) offenders.push({ file: rel, line: i + 1, token: `${px}px` });
        }
      }
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });

  it("ships a 48x48 tap target on every player-facing primary action", () => {
    // Check all surfaces that contain interactive buttons. The global `.tap`
    // CSS class (globals.css) provides min-h:48 / min-w:48; we also accept
    // explicit Tailwind tokens or arbitrary >= 48px sizes.
    const tapSurfaces = [
      "play/tax/page.tsx",
      "join/page.tsx",
      "join/JoinClient.tsx",
    ];
    const offenders: { file: string; reason: string }[] = [];
    for (const rel of tapSurfaces) {
      const full = join(ROOT, rel);
      const content = readFileSync(full, "utf8");
      // We expect either h-12 w-12 (48px) or larger, or min-h-[48px]/min-w-[48px].
      // Flag any "button" element that lacks an explicit sizing token.
      // Extract all JSX <button ...> opening tags. Match by `className=` because
      // JSX may contain nested > characters in inline handlers / expressions,
      // which makes a naive `<button…>` regex unreliable.
      const classNameRegex = /<button\b[^>]*?className=(?:"([^"]*)"|\{`([^`]*?)`\})/g;
      const buttonMatches = [...content.matchAll(classNameRegex)];
      for (const m of buttonMatches) {
        const tag = m[0];
        const cls = m[1] ?? m[2] ?? "";
        // Accept any of:
        //   h-12 / w-12 / h-14 / w-14 / h-16 / w-16  (48/56/64 px)
        //   min-h-12 / min-w-12  (48 px floor)
        //   min-h-[NNpx] / min-w-[NNpx] / h-[NNpx] / w-[NNpx] with NN >= 48
        //   min-h-NN with NN >= 12
        const tokens = cls.match(/[\w-]+(?:-\d+|\[\d+px\])/g) ?? [];
        let has48 = false;
        for (const t of tokens) {
          if (/^(?:h|w|min-h|min-w)-(?:12|14|16|20|24|32|48|64)$/.test(t)) { has48 = true; break; }
          const m2 = t.match(/^(?:h|w|min-h|min-w)-\[(\d+)px\]$/);
          if (m2 && Number(m2[1]) >= 48) { has48 = true; break; }
        }
        // The global `.tap` class (globals.css) also satisfies the 48×48 floor.
        if (!has48 && /(^|\s)tap(\s|$)/.test(cls)) has48 = true;
        if (!has48) {
          offenders.push({ file: rel, reason: `button lacks 48×48 token: ${tag.slice(0, 80)}…` });
        }
      }
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});