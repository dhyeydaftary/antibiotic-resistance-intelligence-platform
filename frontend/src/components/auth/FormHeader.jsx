export const FormHeader = ({ kicker, title, subtitle }) => (
  <div className="mb-10">
    {kicker ? (
      <p className="font-mono-label text-ink-muted">{kicker}</p>
    ) : null}
    <h2 className="mt-3 font-serif-display text-4xl sm:text-5xl leading-[1.05] text-ink">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
        {subtitle}
      </p>
    ) : null}
  </div>
);
