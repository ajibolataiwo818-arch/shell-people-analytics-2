import { useEffect, useRef } from 'react';
import {
  Chart,
  registerables,
  type ChartConfiguration,
  type ChartType,
} from 'chart.js';

Chart.register(...registerables);

interface ChartCardProps<TType extends ChartType = ChartType> {
  title: string;
  subtitle?: string;
  heightClass?: string;
  config: ChartConfiguration<TType>;
  isDark: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  headerRight?: React.ReactNode;
}

export function getChartTheme(isDark: boolean) {
  return {
    textColor: isDark ? '#D4D4D8' : '#3F3F46',
    mutedTextColor: isDark ? '#A1A1AA' : '#71717A',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(17, 17, 19, 0.07)',
    tooltipBg: isDark ? '#18181B' : '#111113',
    tooltipBorder: isDark ? '#27272A' : '#27272A',
    surfaceBorder: isDark ? '#151518' : '#FFFFFF',
    // Shell Brand Palette
    yellow: '#FFC800',
    orange: '#F58220',
    crimson: '#DC2626',
    ink: isDark ? '#F4F4F5' : '#111113',
    slate: isDark ? '#71717A' : '#52525B',
    softNeutral: isDark ? '#27272A' : '#E4E4E7',
  };
}

export function ChartCard<TType extends ChartType = ChartType>({
  title,
  subtitle,
  heightClass = 'h-72',
  config,
  isDark,
  isEmpty = false,
  emptyMessage = 'No records match the current filters.',
  headerRight,
}: ChartCardProps<TType>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<TType> | null>(null);

  useEffect(() => {
    if (isEmpty) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const theme = getChartTheme(isDark);
    Chart.defaults.font.family = "'DM Sans', system-ui, -apple-system, sans-serif";
    Chart.defaults.color = theme.textColor;

    chartRef.current = new Chart(canvas, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config, isDark, isEmpty]);

  return (
    <section className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-[#111113] dark:text-[#F4F4F5] truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>

      {isEmpty ? (
        <div
          className={`${heightClass} flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-500 dark:text-neutral-400 px-4 text-center`}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className={`relative w-full ${heightClass}`}>
          <canvas ref={canvasRef} aria-label={title} role="img" />
        </div>
      )}
    </section>
  );
}
