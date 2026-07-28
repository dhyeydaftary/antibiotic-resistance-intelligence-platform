import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getDatasetStats } from '../api/datasetApi';
import ExploreHero from '../components/explore/ExploreHero';
import ExploreOverviewPanel from '../components/explore/ExploreOverviewPanel';
import SunburstChart from '../components/explore/SunburstChart';
import OrganismLibraryPanel from '../components/explore/OrganismLibraryPanel';
import AntibioticLibraryPanel from '../components/explore/AntibioticLibraryPanel';
import DatasetInsightPanel from '../components/explore/DatasetInsightPanel';
import FeaturedPicksPanel from '../components/explore/FeaturedPicksPanel';
import ResearchHubPanel from '../components/explore/ResearchHubPanel';
import QuestionBankPanel from '../components/explore/QuestionBankPanel';
import Panel from '../components/app/Panel';
import ScrollReveal from '../components/home/ScrollReveal';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

function DatasetExplorerPage() {
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrganism, setSelectedOrganism] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getDatasetStats()
      .then((result) => {
        if (cancelled) return;
        setStats(result.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError('Failed to load dataset statistics.');
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!location.hash || loading) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, loading]);

  function selectOrganism(name) {
    setSelectedOrganism(name);
  }

  const organisms = stats?.organismDistribution
    ? [...stats.organismDistribution].sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <ExploreHero />

        {loading && (
          <div className="h-[260px] animate-pulse rounded-[20px] border border-panel-border bg-panel" />
        )}

        {error && (
          <div className="rounded-[20px] border border-resistant/30 bg-resistant/5 p-6 font-sans text-small text-resistant">
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            <ScrollReveal index={0}>
              <ExploreOverviewPanel stats={stats} />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <Panel className={`p-6 ${HOVER}`}>
                <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
                  Organism Distribution
                </div>
                <h2 className="mb-4 font-display text-h3 text-onpanel-ink">A real 2-level breakdown</h2>
                <SunburstChart organisms={organisms} totalRows={stats.totalRows} />
              </Panel>
            </ScrollReveal>

            <ScrollReveal index={0}>
              <FeaturedPicksPanel organisms={organisms} totalRows={stats.totalRows} />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <DatasetInsightPanel
                stats={stats}
                selectedOrganism={selectedOrganism}
              />
            </ScrollReveal>

            <ScrollReveal index={0}>
              <OrganismLibraryPanel
                organisms={organisms}
                totalRows={stats.totalRows}
                selected={selectedOrganism}
                onSelect={selectOrganism}
              />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <AntibioticLibraryPanel />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <ResearchHubPanel />
            </ScrollReveal>

            <ScrollReveal index={0}>
              <QuestionBankPanel stats={stats} />
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
}

export default DatasetExplorerPage;
