// UNUSED — grep confirms AboutPage.jsx never renders AboutNavRail. Also
// stale: NAV_ITEMS' 'how-it-was-built' id doesn't match the actual
// section id in use today (AboutPipeline.jsx uses id="methodology"),
// so even if re-enabled this one entry would need fixing first. Every
// other NAV_ITEMS id was verified to still match its section.
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
    { id: 'opening', label: 'Premise' },
    { id: 'the-gap', label: 'The Gap' },
    { id: 'philosophy', label: 'Philosophy' },
    { id: 'trust-boundaries', label: 'Boundaries' },
    { id: 'how-it-was-built', label: 'Methodology' },
    { id: 'explainability', label: 'Explainability' },
    { id: 'who-its-for', label: 'Audience' },
    { id: 'contributors', label: 'Contributors' },
    { id: 'back-matter', label: 'Appendix' },
];

export default function AboutNavRail() {
    const [activeId, setActiveId] = useState('opening');

    useEffect(() => {
        const handleScroll = () => {
            const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
            const scrollPos = window.scrollY + 160;

            for (let i = sections.length - 1; i >= 0; i--) {
                const sec = sections[i];
                if (sec.offsetTop <= scrollPos) {
                    setActiveId(sec.id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className="sticky top-16 z-30 hidden border-b border-canvas-hairline/80 bg-canvas/90 backdrop-blur-md transition-all sm:block">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-page-ink">
                        Research Paper Structure
                    </span>
                </div>

                <nav aria-label="About Page Sections" className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeId === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                aria-current={isActive ? 'true' : undefined}
                                className={`relative rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                                    isActive
                                        ? 'text-accent-blue font-semibold'
                                        : 'text-page-muted hover:text-page-ink'
                                }`}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="activeNavIndicator"
                                        className="absolute inset-0 rounded-full bg-accent-blue/10 border border-accent-blue/20"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
