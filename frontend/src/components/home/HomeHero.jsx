function HomeHero({ name }) {
  return (
    <div className="py-4 sm:py-8">
      <div className="mb-3 font-mono text-mono-label font-medium uppercase tracking-[0.12em] text-page-faint">
        Welcome back
      </div>
      <h1 className="font-display text-h1 text-page-ink sm:whitespace-nowrap sm:text-[44px]">
        Good to see you, {name}
      </h1>
      <p className="mt-3 max-w-lg font-sans text-subtitle text-page-muted">
        Your antimicrobial resistance intelligence overview.
        <br className="hidden sm:block" />
        Pick up where you left off or start a new prediction.
      </p>
    </div>
  );
}

export default HomeHero;
