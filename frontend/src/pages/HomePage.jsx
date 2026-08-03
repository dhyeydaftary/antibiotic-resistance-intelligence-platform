import { useEffect, useState } from 'react';
import { HomeOverviewSkeleton, HomeToolsSkeleton } from '../components/common/Skeletons';
import { getHistory } from '../api/historyApi';
import { getDatasetStats } from '../api/datasetApi';
import { useAuth } from '../context/AuthContext';
import HomeHero from '../components/home/HomeHero';
import HomeOverviewPanel from '../components/home/HomeOverviewPanel';
import HomeResearchPanel from '../components/home/HomeResearchPanel';
import HomeInsightPanel from '../components/home/HomeInsightPanel';
import HomeToolsPanel from '../components/home/HomeToolsPanel';
import HomeQuoteBanner from '../components/home/HomeQuoteBanner';
import ScrollReveal from '../components/home/ScrollReveal';

const EMPTY_STATS = {
  total: 0,
  thisWeek: 0,
  thisWeekTrendPct: null,
  mostCommonResult: 'I',
  mostCommonResultCount: 0,
  mostCommonResultPct: 0,
  avgConfidence: 0,
};

function flattenRecord(record) {
  return (record.predictions || []).map((p) => ({
    result: p.result,
    confidence: Math.round((p.confidence || 0) * 100),
  }));
}

function computeStats(records) {
  if (!records.length) return EMPTY_STATS;

  const total = records.length;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeek = records.filter((r) => new Date(r.createdAt) >= weekAgo).length;
  const lastWeek = records.filter(
    (r) => new Date(r.createdAt) >= twoWeeksAgo && new Date(r.createdAt) < weekAgo
  ).length;
  const thisWeekTrendPct = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;

  const flattened = records.flatMap(flattenRecord);

  const resultCounts = flattened.reduce((acc, p) => {
    acc[p.result] = (acc[p.result] || 0) + 1;
    return acc;
  }, {});
  const [mostCommonResult, mostCommonResultCount] = Object.entries(resultCounts).sort(
    (a, b) => b[1] - a[1]
  )[0] || ['I', 0];
  const mostCommonResultPct = flattened.length
    ? (mostCommonResultCount / flattened.length) * 100
    : 0;

  const avgConfidence = flattened.length
    ? flattened.reduce((sum, p) => sum + p.confidence, 0) / flattened.length
    : 0;

  return {
    total,
    thisWeek,
    thisWeekTrendPct,
    mostCommonResult,
    mostCommonResultCount,
    mostCommonResultPct,
    avgConfidence,
  };
}

function buildDailySeries(records, days = 8) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    buckets.push({
      date: day,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      total: 0,
      confSum: 0,
      confCount: 0,
    });
  }

  records.forEach((record) => {
    const d = new Date(record.createdAt);
    d.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.date.getTime() === d.getTime());
    if (!bucket) return;
    bucket.total += 1;
    (record.predictions || []).forEach((p) => {
      bucket.confSum += Math.round((p.confidence || 0) * 100);
      bucket.confCount += 1;
    });
  });

  return buckets.map((b) => ({
    date: b.date,
    label: b.label,
    total: b.total,
    avgConfidence: b.confCount ? Math.round(b.confSum / b.confCount) : 0,
  }));
}

function getRecentPredictions(records, limit = 5) {
  const sorted = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return sorted.slice(0, limit).map((record) => {
    const primary = record.predictions?.[0] || {};
    return {
      recordId: record._id,
      organism: record.inputData?.organism || 'Unknown organism',
      result: primary.result || 'I',
      confidence: Math.round((primary.confidence || 0) * 100),
      date: record.createdAt,
    };
  });
}

function HomePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [dailySeries, setDailySeries] = useState([]);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [datasetStats, setDatasetStats] = useState(null);
  const [datasetStatsError, setDatasetStatsError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await getHistory();
        const records = result?.data?.history || [];
        if (cancelled) return;
        setStats(computeStats(records));
        setDailySeries(buildDailySeries(records));
        setRecentPredictions(getRecentPredictions(records));
      } catch (err) {
        console.error('Failed to load history for Home page:', err);
        if (!cancelled) {
          setStats(EMPTY_STATS);
          setDailySeries([]);
          setRecentPredictions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dataset stats — for augmented clinical headline pills
  useEffect(() => {
    getDatasetStats()
      .then((result) => setDatasetStats(result.data))
      .catch((err) => {
        setDatasetStatsError('Some dataset-derived stats are unavailable right now.');
        console.error('Failed to load dataset stats for Home:', err);
      });
  }, []);

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <HomeHero name={user?.name?.split(' ')[0] || 'there'} />

        {loading ? (
          <div className="space-y-6">
            <HomeOverviewSkeleton />
            <HomeToolsSkeleton />
          </div>
        ) : (
          <>
            {datasetStatsError && (
              <div className="rounded-[12px] border border-resistant/30 bg-resistant/5 px-4 py-3 font-sans text-[13px] text-resistant">
                {datasetStatsError}
              </div>
            )}
            <ScrollReveal index={0}>
              <HomeOverviewPanel stats={stats} dailySeries={dailySeries} datasetStats={datasetStats} />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <HomeResearchPanel recentPredictions={recentPredictions} />
            </ScrollReveal>
            <ScrollReveal index={0}>
              <HomeInsightPanel />
            </ScrollReveal>
            <ScrollReveal index={1}>
              <HomeToolsPanel datasetStats={datasetStats} />
            </ScrollReveal>
            <ScrollReveal index={0}>
              <HomeQuoteBanner />
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;
