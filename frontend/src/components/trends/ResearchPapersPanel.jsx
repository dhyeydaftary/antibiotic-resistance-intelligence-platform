import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, FileWarning } from 'lucide-react';
import { getResearchPapers } from '../../api/trendsApi';
import Panel from '../app/Panel';

const cardVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05 } }),
};

function ResearchPapersPanel({ antibiotic, organism }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getResearchPapers(antibiotic, organism)
      .then((result) => setPapers(result.data.papers))
      .catch((err) => {
        setError('Failed to load research papers.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [antibiotic, organism]);

  return (
    <Panel className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
            Related research
          </div>
          <div className="mt-0.5 font-display text-[18px] font-semibold text-onpanel-ink">
            PubMed literature for {antibiotic}
            {organism !== 'all' && ` · ${organism}`}
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-panel-raised px-3 py-1 font-mono text-[10px] font-medium text-onpanel-muted">
          <BookOpen size={11} /> PubMed
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[14px] bg-panel-raised" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-[14px] bg-resistant/10 p-3 font-sans text-[13px] text-resistant">
          <FileWarning size={14} /> {error}
        </div>
      )}

      {!loading && !error && papers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[14px] bg-panel-raised px-6 py-10 text-center">
          <FileWarning size={20} className="mb-2 text-onpanel-faint" />
          <p className="font-sans text-[13px] text-onpanel-muted">
            No verified PubMed papers found for this antibiotic/organism combination.
          </p>
        </div>
      )}

      {!loading && !error && papers.length > 0 && (
        <div className="space-y-3">
          {papers.map((paper, i) => (
            <motion.a
              key={paper.pmid}
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="group block rounded-[14px] bg-panel-raised p-4 transition-colors hover:bg-panel-border"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-sans text-[14px] font-semibold leading-[1.4] text-onpanel-ink">
                  {paper.title}
                </h3>
                <ExternalLink size={14} className="mt-0.5 shrink-0 text-onpanel-faint transition-colors group-hover:text-accent-blue" />
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-onpanel-muted">
                {paper.journal || 'Journal unavailable'} · {paper.publicationDate}
              </div>
              {paper.abstractExcerpt && (
                <p className="mt-2 font-sans text-[12px] leading-[1.5] text-onpanel-muted">
                  {paper.abstractExcerpt}
                </p>
              )}
            </motion.a>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-panel-border pt-3 font-mono text-[10px] text-onpanel-faint">
        Results are real PubMed citations, sorted by publication date. Excerpts are verbatim from official abstracts — not AI-generated.
      </div>
    </Panel>
  );
}

export default ResearchPapersPanel;