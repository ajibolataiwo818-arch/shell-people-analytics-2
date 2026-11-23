import { useRef } from 'react';
import { Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import type { DataSourceMeta } from '../types/employee';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onSyncSheet: () => void;
  onUploadCsv: (file: File) => void;
  isSyncing: boolean;
  sourceMeta: DataSourceMeta | null;
}

export function TopBar({
  isDark,
  onToggleTheme,
  onSyncSheet,
  onUploadCsv,
  isSyncing,
  sourceMeta,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCsv(file);
    }
    e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 min-w-0">
          <svg
            viewBox="0 0 36 34"
            className="w-8 h-8 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M18 2C9.4 2 3 8.1 3 16.5c0 4.3 1.7 8.1 4.4 10.6L11 31h14l3.6-3.9C31.3 24.6 33 20.8 33 16.5 33 8.1 26.6 2 18 2Z"
              fill="#FFC800"
              stroke="#F58220"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M18 4v25M12 6.2L15.5 29M24 6.2L20.5 29M7.2 11.4L13 29M28.8 11.4L23 29"
              stroke="#F58220"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#111113] dark:text-white whitespace-nowrap shrink-0">
            Shell People Analytics
          </span>
        </div>

        {/* Actions Zone */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {sourceMeta && (
            <span className="hidden lg:inline-block text-xs text-neutral-500 dark:text-neutral-400 mr-2 whitespace-nowrap font-mono-tabular">
              {sourceMeta.totalRecords} records ·{' '}
              {sourceMeta.sourceType === 'google-sheets' ? 'Google Sheet' : sourceMeta.label} ·{' '}
              {sourceMeta.syncedAt}
            </span>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload employee CSV file"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
            title="Upload a local CSV export as fallback"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upload CSV</span>
          </button>

          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#FFC800] hover:bg-[#F58220] text-[#111113] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111113] dark:focus-visible:outline-[#FFC800]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Syncing…' : 'Sync Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[#FFC800]" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-[#111113]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
