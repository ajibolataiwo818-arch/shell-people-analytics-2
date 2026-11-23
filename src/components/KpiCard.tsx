interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  accent?: 'yellow' | 'orange' | 'crimson' | 'neutral';
}

export function KpiCard({ label, value, detail, accent = 'neutral' }: KpiCardProps) {
  const accentDotClass =
    accent === 'yellow'
      ? 'bg-[#FFC800]'
      : accent === 'orange'
        ? 'bg-[#F58220]'
        : accent === 'crimson'
          ? 'bg-[#DC2626]'
          : 'bg-neutral-400 dark:bg-neutral-600';

  return (
    <div className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-xs shrink-0 ${accentDotClass}`} aria-hidden="true" />
      </div>

      <div className="font-mono-tabular text-2xl sm:text-[26px] font-semibold tracking-tight text-[#111113] dark:text-white leading-none">
        {value}
      </div>

      <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug truncate">
        {detail}
      </div>
    </div>
  );
}
