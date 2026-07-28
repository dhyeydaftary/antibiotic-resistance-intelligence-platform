import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

// Real antibiotics your models actually predict, real WHO AWaRe tiers —
// same source of truth as predict.py's AWARE_MAP, HowItWorks, and Marquee.
// No per-antibiotic AUC/isolate-count/SHAP-driver claims: your models don't
// train on genetic markers (only Age, Gender, Diabetes, Hypertension,
// Hospital_before, Infection_Freq, Year, Month, Organism), so a claim like
// "top driver: gyrA mutation" would be a fabricated capability, not a fact.
const TIER_META = {
    Access: { color: '#30D158', glow: 'rgba(48,209,88,0.55)' },
    Watch: { color: '#FF9F0A', glow: 'rgba(255,159,10,0.55)' },
    Reserve: { color: '#FF3B30', glow: 'rgba(255,59,48,0.55)' },
};

const MODELS = [
    { code: 'AMX/AMP', name: 'Amoxicillin/Ampicillin', tier: 'Access' },
    { code: 'AMC', name: 'Amoxicillin-clavulanic acid', tier: 'Access' },
    { code: 'CZ', name: 'Cefazolin', tier: 'Access' },
    { code: 'FOX', name: 'Cefoxitin', tier: 'Watch' },
    { code: 'CTX/CRO', name: 'Cefotaxime/Ceftriaxone', tier: 'Watch' },
    { code: 'IPM', name: 'Imipenem', tier: 'Watch' },
    { code: 'GEN', name: 'Gentamicin', tier: 'Access' },
    { code: 'AN', name: 'Amikacin', tier: 'Access' },
    { code: 'NAL', name: 'Nalidixic acid', tier: 'Watch' },
    { code: 'OFX', name: 'Ofloxacin', tier: 'Watch' },
    { code: 'CIP', name: 'Ciprofloxacin', tier: 'Watch' },
    { code: 'C', name: 'Chloramphenicol', tier: 'Access' },
    { code: 'SXT', name: 'Trimethoprim-sulfamethoxazole', tier: 'Access' },
    { code: 'FUR', name: 'Nitrofurantoin', tier: 'Access' },
    { code: 'COL', name: 'Colistin', tier: 'Reserve' },
];

// Base radius is now responsive — see the `radius` state in the component,
// set via matchMedia on mount and on resize.

// Fibonacci sphere: even point distribution, no grid seams / pole bunching.
function fibonacciSphere(n, radius) {
    const points = [];
    const phi = Math.PI * (Math.sqrt(5) - 1);
    for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = phi * i;
        points.push({ x: Math.cos(theta) * r * radius, y: y * radius, z: Math.sin(theta) * r * radius });
    }
    return points;
}

export default function CapabilitiesSection() {
    const [radius, setRadius] = useState(220);
    const basePositions = useMemo(() => fibonacciSphere(MODELS.length, radius), [radius]);
    const [activeIdx, setActiveIdx] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [canHover, setCanHover] = useState(false);
    const containerRef = useRef(null);

    const rotY = useMotionValue(0);
    const rotX = useMotionValue(-0.15);
    const targetY = useSpring(0, { stiffness: 60, damping: 20, mass: 1 });
    const targetX = useSpring(-0.15, { stiffness: 60, damping: 20, mass: 1 });
    // Eases the ambient spin rate toward 0 (or back up) instead of an instant
    // cutoff — cutting straight to 0 on click felt like a hard stop.
    const spinRate = useMotionValue(0);

    useEffect(() => {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        setCanHover(window.matchMedia('(hover: hover)').matches);
        const updateRadius = () => setRadius(window.innerWidth < 640 ? 130 : window.innerWidth < 1024 ? 175 : 220);
        updateRadius();
        window.addEventListener('resize', updateRadius);
        return () => window.removeEventListener('resize', updateRadius);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) setRevealed(true); }),
            { threshold: 0.25 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (reducedMotion) return;
        let raf = 0;
        let last = performance.now();
        const AMBIENT = 0.00025;
        const tick = (t) => {
            const dt = t - last;
            last = t;
            const targetSpin = activeIdx === null ? AMBIENT : 0;
            spinRate.set(spinRate.get() + (targetSpin - spinRate.get()) * 0.06);
            rotY.set(rotY.get() + spinRate.get() * dt + (targetY.get() - rotY.get()) * 0.08);
            rotX.set(rotX.get() + (targetX.get() - rotX.get()) * 0.08);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [activeIdx, rotY, rotX, targetY, targetX, spinRate, reducedMotion]);

    const onMove = (e) => {
        if (reducedMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        targetY.set(nx * 0.6);
        targetX.set(-0.15 + ny * -0.4);
    };
    const onLeave = () => {
        targetY.set(0);
        targetX.set(-0.15);
    };

    const active = activeIdx !== null ? MODELS[activeIdx] : null;

    return (
        <section id="capabilities" className="relative bg-panel px-6 py-24 sm:py-32" style={{ isolation: 'isolate' }}>
            <div className="mx-auto max-w-5xl">
                <div className="mb-4 flex items-center gap-3">
                    <span className="h-px w-6 bg-panel-border" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-onpanel-faint">
                        Not a black box
                    </span>
                </div>

                <h2 className="max-w-xl font-display text-[32px] font-semibold leading-[1.15] tracking-[-0.015em] text-onpanel-ink sm:text-[42px]">
                    Fifteen models you can actually inspect.
                </h2>
                <p className="mt-4 max-w-xl font-sans text-[15px] leading-[1.65] text-onpanel-muted">
                    You just read how the fifteen parallel models work. Here they are — each point
                    below is one real model. Hover or tap any of them.
                </p>

                <div
                    ref={containerRef}
                    onPointerMove={onMove}
                    onPointerLeave={onLeave}
                    onClick={(e) => { if (e.target === e.currentTarget) setActiveIdx(null); }}
                    className="relative mx-auto mt-14 flex items-center justify-center"
                    style={{ height: 560 }}
                >
                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                            width: radius * 2.6,
                            height: radius * 2.6,
                            background: 'radial-gradient(circle at 50% 50%, rgba(48,209,88,0.06), rgba(255,159,10,0.04) 35%, transparent 65%)',
                        }}
                    />

                    <motion.div
                        className="relative"
                        style={{ width: 0, height: 0 }}
                        initial={{ scale: 0.72, opacity: 0 }}
                        animate={revealed ? { scale: 1, opacity: 1 } : { scale: 0.72, opacity: 0 }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {MODELS.map((m, i) => (
                            <Node
                                key={m.code}
                                model={m}
                                base={basePositions[i]}
                                index={i}
                                radius={radius}
                                canHover={canHover}
                                rotX={rotX}
                                rotY={rotY}
                                revealed={revealed}
                                active={activeIdx === i}
                                anyActive={activeIdx !== null}
                                onActivate={() => setActiveIdx((cur) => (cur === i ? null : i))}
                                onHoverActivate={() => setActiveIdx(i)}
                                onHoverDeactivate={() => setActiveIdx((cur) => (cur === i ? null : cur))}
                            />
                        ))}
                    </motion.div>

                    <div className="pointer-events-none absolute">
                        <div className="rounded-full border border-panel-border bg-panel-raised/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-onpanel-muted backdrop-blur">
                            CatBoost · SHAP
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {active && (
                            <motion.div
                                key={active.code}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="pointer-events-none absolute bottom-4 left-4 right-4 mx-auto max-w-md rounded-[18px] border border-panel-border bg-panel-raised/90 p-5 backdrop-blur-md sm:left-6 sm:right-auto"
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ background: TIER_META[active.tier].color, boxShadow: `0 0 10px ${TIER_META[active.tier].glow}` }}
                                    />
                                    <span
                                        className="font-mono text-[10px] uppercase tracking-[0.2em]"
                                        style={{ color: TIER_META[active.tier].color }}
                                    >
                                        AWaRe · {active.tier} · {active.code}
                                    </span>
                                </div>
                                <h3 className="font-display text-[19px] font-semibold text-onpanel-ink">
                                    {active.name}
                                </h3>
                                <p className="mt-2.5 font-sans text-[13px] leading-[1.5] text-onpanel-muted">
                                    Explained via CatBoost's native SHAP.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] uppercase tracking-[0.15em] text-onpanel-muted">
                    {Object.keys(TIER_META).map((t) => (
                        <div key={t} className="flex items-center gap-2">
                            <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ background: TIER_META[t].color, boxShadow: `0 0 8px ${TIER_META[t].glow}` }}
                            />
                            {t}
                        </div>
                    ))}
                    <div className="text-onpanel-faint">Drag / hover to orbit · Tap a node</div>
                </div>
            </div>
        </section>
    );
}

function Node({
    model, base, index, radius, canHover, rotX, rotY, revealed, active, anyActive,
    onActivate, onHoverActivate, onHoverDeactivate,
}) {
    // Real rotation, computed numerically: rotate the base point around X
    // then around Y using explicit sin/cos matrix math — no reliance on CSS
    // transform composition order.
    const rotated = useTransform([rotX, rotY], ([rx, ry]) => {
        const cosX = Math.cos(rx), sinX = Math.sin(rx);
        const cosY = Math.cos(ry), sinY = Math.sin(ry);
        const y1 = base.y * cosX - base.z * sinX;
        const z1 = base.y * sinX + base.z * cosX;
        const x2 = base.x * cosY + z1 * sinY;
        const z2 = -base.x * sinY + z1 * cosY;
        return { x: x2, y: y1, z: z2 };
    });

    const x = useTransform(rotated, (p) => p.x);
    const y = useTransform(rotated, (p) => p.y);
    const z = useTransform(rotated, (p) => p.z);
    const depth = useTransform(z, (v) => (v + radius) / (radius * 2));
    const scale = useTransform(depth, [0, 1], [0.55, 1.15]);
    const opacity = useTransform(depth, [0, 1], [0.28, 1]);
    const blurAmt = useTransform(depth, [0, 1], [1.4, 0]);
    const filter = useTransform(blurAmt, (b) => `blur(${b}px)`);
    const zIndex = useTransform(z, (v) => Math.round(v + 1000));

    const meta = TIER_META[model.tier];
    const size = 14;

    // Hover activates/deactivates only on devices that actually have hover
    // (laptop/desktop). Touch/tablet devices rely on tap (onClick) only —
    // mixing both on touch causes the classic "tap fires hover then click"
    // double-activation glitch.
    const hoverProps = canHover
        ? { onMouseEnter: onHoverActivate, onMouseLeave: onHoverDeactivate }
        : {};

    return (
        <motion.button
            type="button"
            {...hoverProps}
            onClick={(e) => { e.stopPropagation(); onActivate(); }}
            aria-label={`${model.name}, ${model.tier} tier model`}
            className="absolute cursor-pointer border-0 bg-transparent p-0"
            style={{
                left: 0, top: 0, x, y,
                translateX: '-50%', translateY: '-50%',
                scale, opacity: revealed ? opacity : 0, filter, zIndex,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: revealed ? 1 : 0 }}
            transition={{ delay: revealed ? 0.4 + index * 0.045 : 0, duration: 0.6 }}
            whileHover={{ scale: 1.35 }}
        >
            <span
                className="relative block rounded-full transition-shadow duration-300"
                style={{
                    width: size,
                    height: size,
                    background: meta.color,
                    boxShadow: active
                        ? `0 0 0 4px rgba(245,245,247,0.15), 0 0 28px ${meta.glow}, 0 0 60px ${meta.glow}`
                        : `0 0 14px ${meta.glow}`,
                    outline: active ? '1px solid rgba(245,245,247,0.9)' : 'none',
                }}
            />
            <span
                className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.15em]"
                style={{
                    color: active ? '#F5F5F7' : 'rgba(245,245,247,0.6)',
                    opacity: active ? 1 : anyActive ? 0.15 : 0.75,
                    transition: 'opacity 200ms ease',
                }}
            >
                {model.code}
            </span>
        </motion.button>
    );
}