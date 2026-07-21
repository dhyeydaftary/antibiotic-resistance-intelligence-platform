import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import ChapterKicker from "./ChapterKicker";

/**
 * Signature Particle Morph section.
 *
 * A canvas holds ~800 particles that drift with noise.
 * As the user scrolls through this 4x viewport section, particles
 * interpolate toward one of three organism target-point clouds:
 *   0.20 — E. coli (rod)
 *   0.50 — S. aureus (grape cluster of cocci)
 *   0.80 — phage-like (icosahedral head + tail fibers)
 *
 * Between assemblies the particles disperse back to a drifting field —
 * so the emergence/disintegration is continuous.
 */
const PARTICLE_COUNT = 900;

function generateRodPoints(n) {
  // Elongated capsule outline + interior speckle
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    // Capsule: two half-circles + rectangle
    const rx = 0.42, ry = 0.16;
    if (t < 0.55) {
      // outline
      const a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      // pinch to capsule
      pts.push([x, y]);
    } else {
      // interior speckle
      const a = Math.random() * Math.PI * 2;
      const r = Math.random();
      pts.push([Math.cos(a) * rx * r * 0.9, Math.sin(a) * ry * r * 0.85]);
    }
  }
  return pts;
}
function generateCocciCluster(n) {
  const pts = [];
  const centers = [
    [-0.18, -0.08], [-0.05, -0.14], [0.08, -0.05], [0.2, -0.12],
    [-0.12, 0.08], [0.02, 0.14], [0.16, 0.06], [-0.24, 0.03],
    [0.28, -0.02], [0.09, 0.02], [-0.04, -0.02], [0.22, 0.14],
  ];
  for (let i = 0; i < n; i++) {
    const c = centers[i % centers.length];
    const a = Math.random() * Math.PI * 2;
    const r = 0.06 * Math.sqrt(Math.random());
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  return pts;
}
function generatePhage(n) {
  // Icosahedral head (hex outline) + tail sheath + tail fibers
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    if (t < 0.45) {
      // Hexagonal head at top
      const a = Math.floor(Math.random() * 6);
      const angle = (a / 6) * Math.PI * 2 + Math.PI / 2;
      const r = 0.18 * (0.9 + Math.random() * 0.1);
      const nx = Math.cos(angle) * r;
      const ny = Math.sin(angle) * r - 0.18;
      // interpolate along hex edge
      const nextAngle = ((a + 1) / 6) * Math.PI * 2 + Math.PI / 2;
      const lerp = Math.random();
      const x = Math.cos(angle) * r * (1 - lerp) + Math.cos(nextAngle) * r * lerp;
      const y = (Math.sin(angle) * r * (1 - lerp) + Math.sin(nextAngle) * r * lerp) - 0.18;
      pts.push([x, y]);
    } else if (t < 0.7) {
      // Tail sheath: vertical band below head
      pts.push([(Math.random() - 0.5) * 0.06, 0.02 + Math.random() * 0.22]);
    } else {
      // Fibers spreading at bottom
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.9);
      const r = 0.15 + Math.random() * 0.14;
      pts.push([Math.cos(a) * r * 0.6, 0.26 + Math.sin(a) * r * 0.5 + Math.abs(Math.cos(a) * 0.1)]);
    }
  }
  return pts;
}

/**
 * Greedy nearest-neighbor match between current particle positions and a
 * target point cloud. Target points are generated independently via
 * Math.random(), so matching by fixed array index has no spatial relation
 * to where a particle actually is — that's what made assembly look like
 * scattered noise converging along long, crossing paths. Matching each
 * particle to its closest still-unclaimed target instead gives every
 * particle the shortest reasonable path, so the silhouette reads as
 * coherently emerging. Computed once per phase-entry, not per frame.
 */
function computeNearestNeighborAssignment(particles, targetPoints) {
  const n = particles.length;
  const assignment = new Int32Array(n);
  const used = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const px = particles[i].x;
    const py = particles[i].y;
    let bestJ = -1;
    let bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const dx = targetPoints[j][0] - px;
      const dy = targetPoints[j][1] - py;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestJ = j;
      }
    }
    used[bestJ] = 1;
    assignment[i] = bestJ;
  }
  return assignment;
}

const ORGANISMS = [
  { key: "coli", label: "Escherichia coli", note: "Rod · Gram-negative", awareHint: "Watch" },
  { key: "aureus", label: "Staphylococcus aureus", note: "Cocci cluster · Gram-positive", awareHint: "Access" },
  { key: "phage", label: "Bacteriophage T4", note: "Viral · resistance carrier", awareHint: "Reserve" },
];

export default function ParticleMorph() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const [reduced, setReduced] = useState(false);
  const [currentOrg, setCurrentOrg] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = 0, height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Three target point clouds
    const targets = [
      generateRodPoints(PARTICLE_COUNT),
      generateCocciCluster(PARTICLE_COUNT),
      generatePhage(PARTICLE_COUNT),
    ];

    // Particles
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5),
        y: (Math.random() - 0.5),
        vx: (Math.random() - 0.5) * 0.0014,
        vy: (Math.random() - 0.5) * 0.0014,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Assembly progress values by scroll:
    // 0.10-0.28 assemble org0, 0.28-0.4 disperse
    // 0.42-0.58 assemble org1, 0.58-0.7 disperse
    // 0.72-0.88 assemble org2, 0.88-1 disperse
    function assemblyForScroll(sp) {
      const bands = [
        { start: 0.08, mid: 0.22, end: 0.38, org: 0 },
        { start: 0.42, mid: 0.55, end: 0.7, org: 1 },
        { start: 0.72, mid: 0.85, end: 0.98, org: 2 },
      ];
      for (const b of bands) {
        if (sp >= b.start && sp <= b.end) {
          let a;
          let dispersing;
          if (sp <= b.mid) {
            a = (sp - b.start) / (b.mid - b.start);
            dispersing = false;
          } else {
            a = 1 - (sp - b.mid) / (b.end - b.mid);
            dispersing = true;
          }
          return { org: b.org, amount: Math.max(0, Math.min(1, a)), dispersing };
        }
      }
      return { org: 0, amount: 0, dispersing: true };
    }

    let last = performance.now();
    let raf;
    let assignedOrg = -1;
    let assignment = null;

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const sp = scrollYProgress.get();
      const { org, amount, dispersing } = assemblyForScroll(sp);

      // Recompute the particle-to-target assignment fresh each time a phase
      // is (re-)entered, using wherever the particles currently are — then
      // hold it steady for the rest of that phase (assemble + disperse).
      if (amount > 0.02) {
        if (assignedOrg !== org) {
          assignment = computeNearestNeighborAssignment(particles, targets[org]);
          assignedOrg = org;
        }
      } else {
        assignedOrg = -1;
      }

      // Notify current org
      setCurrentOrg(org);

      // Clear
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.85;

      const tgt = targets[org];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.phase += dt * 0.4;

        // Noise-based drift
        const driftX = Math.sin(p.phase + i * 0.13) * 0.00016;
        const driftY = Math.cos(p.phase * 1.1 + i * 0.19) * 0.00016;

        if (amount > 0.02) {
          const targetIndex = assignment ? assignment[i] : i;
          const [tx, ty] = tgt[targetIndex];
          const easing = amount * amount * (3 - 2 * amount); // smoothstep
          p.x += (tx - p.x) * 0.08 * easing;
          p.y += (ty - p.y) * 0.08 * easing;
          if (dispersing) {
            // actively push particles outward as the shape disintegrates, instead
            // of letting them freeze in place once the pull-toward-target fades
            const dist = Math.hypot(p.x, p.y) || 0.001;
            const outwardPush = (1 - easing) * 0.008;
            p.x += (p.x / dist) * outwardPush;
            p.y += (p.y / dist) * outwardPush;
          }
          // small residual jitter
          p.x += driftX * (1 - easing);
          p.y += driftY * (1 - easing);
        } else {
          // free drift
          p.vx += driftX;
          p.vy += driftY;
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.x += p.vx;
          p.y += p.vy;

          // soft boundary
          if (p.x > 0.55) p.x = -0.55;
          if (p.x < -0.55) p.x = 0.55;
          if (p.y > 0.5) p.y = -0.5;
          if (p.y < -0.5) p.y = 0.5;
        }

        const sx = cx + p.x * scale;
        const sy = cy + p.y * scale;

        // color: base paper (visible on this section's dark #12141A background);
        // blends towards teal as a shape assembles
        const alpha = 0.35 + amount * 0.5;
        ctx.fillStyle = amount > 0.4 ? `rgba(44,122,107,${alpha})` : `rgba(247,245,240,${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced, scrollYProgress]);

  const labelOpacity = useTransform(scrollYProgress, [0, 0.05, 0.98, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      id="particles"
      data-testid="particle-morph-section"
      className="relative"
      style={{ height: "380vh", background: "#12141A", color: "#F7F5F0" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Canvas */}
        {!reduced ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="-1 -1 2 2" className="w-1/2 h-1/2" fill="none" stroke="#2C7A6B" strokeWidth="0.01">
              <ellipse cx="0" cy="0" rx="0.42" ry="0.16" />
            </svg>
          </div>
        )}

        {/* Section framing */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="max-w-[1400px] mx-auto px-6 md:px-14 h-full flex flex-col justify-between py-16 md:py-20">
            <div className="flex items-start justify-between">
              <div>
                <ChapterKicker tone="light">Ch. 03 · Signature</ChapterKicker>
                <motion.h2
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-3 font-serif text-3xl md:text-5xl font-light leading-[1.05] text-paper max-w-[560px] text-balance"
                >
                  Resistance <em className="italic">evolves</em>.<br />
                  So does the model.
                </motion.h2>
              </div>
              <div className="hidden md:block text-right font-mono text-[10px] tracking-[0.3em] uppercase text-paper/50">
                Particle field · 900 nodes<br />
                Emergent silhouette
              </div>
            </div>

            {/* Current organism label */}
            <motion.div style={{ opacity: labelOpacity }} className="text-center">
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-paper/50">
                Now assembling
              </p>
              <div className="mt-3 font-serif text-3xl md:text-5xl italic text-paper transition-opacity duration-500">
                {ORGANISMS[currentOrg].label}
              </div>
              <div className="mt-2 font-mono text-[11px] tracking-[0.25em] uppercase text-paper/60">
                {ORGANISMS[currentOrg].note} · AWaRe {ORGANISMS[currentOrg].awareHint}
              </div>
            </motion.div>

            <div className="grid grid-cols-3 gap-4 max-w-[720px] mx-auto w-full">
              {ORGANISMS.map((o, i) => (
                <div key={o.key} className="text-center">
                  <div
                    className={`h-px w-full mb-2 ${i === currentOrg ? "bg-teal" : "bg-paper/20"}`}
                  />
                  <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-paper/60">
                    {String(i + 1).padStart(2, "0")} · {o.key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
