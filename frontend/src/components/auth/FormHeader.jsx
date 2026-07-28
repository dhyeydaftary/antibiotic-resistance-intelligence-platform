export const FormHeader = ({ kicker, title, subtitle }) => (
  <div className="mb-10">
    {kicker ? (
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-onpanel-faint">
        {kicker}
      </p>
    ) : null}
    <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.015em] text-onpanel-ink sm:text-[32px]">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-4 font-sans text-[14px] leading-relaxed text-onpanel-muted">
        {subtitle}
      </p>
    ) : null}
  </div>
);