import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getDatasetStats } from '../api/datasetApi';
import ExploreHero from '../components/explore/ExploreHero';
import ExploreOverviewPanel from '../components/explore/ExploreOverviewPanel';
import OrganismLibraryPanel from '../components/explore/OrganismLibraryPanel';
import AntibioticLibraryPanel from '../components/explore/AntibioticLibraryPanel';
import DatasetInsightPanel from '../components/explore/DatasetInsightPanel';
import ResearchHubPanel from '../components/explore/ResearchHubPanel';
import QuestionBankPanel from '../components/explore/QuestionBankPanel';
import ScrollReveal from '../components/home/ScrollReveal';

function DatasetExplorerPage() {
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrganism, setSelectedOrganism] = useState(null);
  const [selectedAntibiotic, setSelectedAntibiotic] = useState(null);

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

  // Lets Home's "View all" / "Explore now" links land on the right section
  // (e.g. /explore#research-hub) instead of just the top of the page.
  useEffect(() => {
    if (!location.hash || loading) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, loading]);

  function selectOrganism(name) {
    setSelectedOrganism(name);
    if (name) setSelectedAntibiotic(null);
  }

  function selectAntibiotic(name) {
    setSelectedAntibiotic(name);
    if (name) setSelectedOrganism(null);
  }

  const organisms = stats?.organismDistribution
    ? [...stats.organismDistribution].sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <ExploreHero
          organisms={organisms}
          onSelectOrganism={selectOrganism}
          onSelectAntibiotic={selectAntibiotic}
        />

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
              <DatasetInsightPanel
                stats={stats}
                selectedOrganism={selectedOrganism}
                selectedAntibiotic={selectedAntibiotic}
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
              <AntibioticLibraryPanel selected={selectedAntibiotic} onSelect={selectAntibiotic} />
            </ScrollReveal>

            <ScrollReveal index={0}>
              <ResearchHubPanel />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <QuestionBankPanel />
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
}

export default DatasetExplorerPage;
