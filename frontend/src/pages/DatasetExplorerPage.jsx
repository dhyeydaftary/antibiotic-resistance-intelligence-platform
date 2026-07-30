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
import WardSpecimenPanel from '../components/explore/WardSpecimenPanel';
import ComorbidityPrevalencePanel from '../components/explore/ComorbidityPrevalencePanel';
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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'library' | 'resources'

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

  // Sync hash routing with active tabs
  useEffect(() => {
    if (!location.hash || loading) return;
    const hash = location.hash.slice(1);
    if (hash === 'organism-library' || hash === 'antibiotic-library') {
      setActiveTab('library');
    } else if (hash === 'research-hub' || hash === 'question-bank') {
      setActiveTab('resources');
    }
  }, [location.hash, loading]);

  useEffect(() => {
    if (!location.hash || loading) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) {
      // Small timeout to allow tab components to mount first
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [location.hash, activeTab, loading]);

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
            {/* Apple-style Segmented Control */}
            <div className="flex max-w-md mx-auto p-1 rounded-full bg-[#1D1D1F] border border-[#3A3A3C] shadow-panel-sm mb-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'library', label: 'Organisms & Drugs' },
                { id: 'resources', label: 'Research & Q&A' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 text-[13px] font-sans font-medium rounded-full transition-all duration-200 border ${
                      isActive
                        ? 'bg-[#2C2C2E] text-[#F5F5F7] border-[#3A3A3C]'
                        : 'border-transparent text-[#98989D] hover:text-[#F5F5F7]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <ScrollReveal index={0}>
                  <ExploreOverviewPanel stats={stats} />
                </ScrollReveal>

                <ScrollReveal index={1}>
                  <DatasetInsightPanel
                    stats={stats}
                    selectedOrganism={selectedOrganism}
                  />
                </ScrollReveal>

                {(stats.wardTypeDistribution || stats.specimenSourceDistribution) && (
                  <ScrollReveal index={2}>
                    <WardSpecimenPanel
                      wardTypeDistribution={stats.wardTypeDistribution}
                      specimenSourceDistribution={stats.specimenSourceDistribution}
                    />
                  </ScrollReveal>
                )}

                {(stats.comorbidityPrevalence || stats.symptomPrevalence || stats.vitalsLabsSummary) && (
                  <ScrollReveal index={3}>
                    <ComorbidityPrevalencePanel
                      comorbidityPrevalence={stats.comorbidityPrevalence}
                      symptomPrevalence={stats.symptomPrevalence}
                      vitalsLabsSummary={stats.vitalsLabsSummary}
                    />
                  </ScrollReveal>
                )}
              </div>
            )}

            {/* TAB CONTENT: Organisms & Antibiotics */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <ScrollReveal index={0}>
                  <Panel className={`p-6 ${HOVER}`}>
                    <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
                      Organism Distribution
                    </div>
                    <h2 className="mb-4 font-display text-h3 text-onpanel-ink">A real 2-level breakdown</h2>
                    <SunburstChart organisms={organisms} totalRows={stats.totalRows} />
                  </Panel>
                </ScrollReveal>

                <ScrollReveal index={1}>
                  <FeaturedPicksPanel organisms={organisms} totalRows={stats.totalRows} />
                </ScrollReveal>

                <ScrollReveal index={2}>
                  <OrganismLibraryPanel
                    organisms={organisms}
                    totalRows={stats.totalRows}
                    selected={selectedOrganism}
                    onSelect={selectOrganism}
                  />
                </ScrollReveal>

                <ScrollReveal index={3}>
                  <AntibioticLibraryPanel />
                </ScrollReveal>
              </div>
            )}

            {/* TAB CONTENT: Resources */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                <ScrollReveal index={0}>
                  <ResearchHubPanel />
                </ScrollReveal>

                <ScrollReveal index={1}>
                  <QuestionBankPanel stats={stats} />
                </ScrollReveal>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DatasetExplorerPage;
