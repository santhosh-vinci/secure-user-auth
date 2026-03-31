interface BrandHeaderProps {
  title: string;
  subtitle: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  return (
    <div className="text-center mb-7">
      {/* Logo mark */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 mb-5 shadow-[0_2px_12px_rgba(108,99,255,0.15)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path
            d="M12 2L3 7v10l9 5 9-5V7L12 2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            fill="rgba(108,99,255,0.12)"
          />
          <path d="M12 2v20M3 7l9 5 9-5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-[22px] font-bold tracking-tight text-[#1a1d2e]">{title}</h1>
      <p className="text-sm text-muted mt-1.5">{subtitle}</p>
    </div>
  );
}
