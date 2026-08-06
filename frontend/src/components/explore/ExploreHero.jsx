// Static page-title header for DatasetExplorerPage — no props, no data.
function ExploreHero() {
  return (
    <div className="py-4 sm:py-8">
      <div className="mb-3 font-mono text-mono-label font-medium uppercase tracking-[0.12em] text-page-faint">
        Dataset Explorer
      </div>
      <h1 className="font-display text-h1 text-page-ink sm:text-[44px]">Explore the AMR Dataset</h1>
      <p className="mt-3 max-w-lg font-sans text-subtitle text-page-muted">
        Browse organisms and antibiotics, WHO AWaRe coverage, and see what's really in the data
        behind every prediction.
      </p>
    </div>
  );
}

export default ExploreHero;
