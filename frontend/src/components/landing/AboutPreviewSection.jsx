import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// Short teaser section linking to /about — static content, no data.
export default function AboutPreviewSection() {
    return (
        <section className="bg-canvas px-6 py-16 sm:py-20">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-2xl text-center"
            >
                <div className="mb-5 flex items-center justify-center gap-3">
                    <span className="h-px w-6 bg-canvas-hairline" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
                        Who's behind this
                    </span>
                    <span className="h-px w-6 bg-canvas-hairline" />
                </div>
                <p className="font-display text-[24px] font-medium leading-[1.4] text-page-ink sm:text-[28px]">
                    Built by students. Designed for researchers.
                    <br />
                    Grounded in evidence.
                </p>
                <Link
                    to="/about"
                    className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-canvas-hairline px-5 py-2.5 font-sans text-[14px] font-medium text-page-ink transition-colors hover:border-accent-blue hover:text-accent-blue"
                >
                    Learn our story
                    <ArrowRight size={14} />
                </Link>
            </motion.div>
        </section>
    );
}