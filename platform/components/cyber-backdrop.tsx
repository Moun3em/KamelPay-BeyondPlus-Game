/**
 * CyberBackdrop — the futuristic ambient layer.
 *
 * Cyber grid + breathing glow orbs + a few floating particles. Pure CSS
 * (transform/opacity only), decorative, aria-hidden, dies under
 * prefers-reduced-motion and the motion-paused guard.
 */
export function CyberBackdrop({
  grid = true,
  orbs = true,
  particles = true,
}: {
  grid?: boolean;
  orbs?: boolean;
  particles?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {grid ? <div className="kp-cyber-grid absolute inset-0" /> : null}
      {orbs ? (
        <>
          <div className="kp-glow-pulse absolute -left-40 top-1/4 h-[480px] w-[480px] rounded-full bg-[var(--kp-blue)]/20 blur-3xl" />
          <div
            className="kp-glow-pulse absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full bg-[var(--kp-heat)]/15 blur-3xl"
            style={{ animationDelay: "1.6s" }}
          />
          <div
            className="kp-glow-pulse absolute left-1/3 -top-32 h-[360px] w-[360px] rounded-full bg-[#8B5CF6]/10 blur-3xl"
            style={{ animationDelay: "3.1s" }}
          />
        </>
      ) : null}
      {particles ? (
        <>
          {[
            { l: "12%", t: "22%", d: "0s", s: 5 },
            { l: "82%", t: "18%", d: "1.2s", s: 4 },
            { l: "70%", t: "70%", d: "2.4s", s: 6 },
            { l: "24%", t: "78%", d: "0.7s", s: 4 },
            { l: "48%", t: "12%", d: "1.9s", s: 3 },
            { l: "90%", t: "48%", d: "2.9s", s: 5 },
          ].map((p, i) => (
            <span
              key={i}
              className="kp-float absolute rounded-full bg-white/40"
              style={{
                left: p.l,
                top: p.t,
                width: p.s,
                height: p.s,
                animationDelay: p.d,
              }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
