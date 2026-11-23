import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Upload } from 'lucide-react';
import { DeepDiveTab } from './components/DeepDiveTab';
import { FilterBar } from './components/FilterBar';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import { TopBar } from './components/TopBar';
import type {
  DataSourceMeta,
  FilterState,
  ScoredEmployee,
  TabId,
} from './types/employee';
import {
  filterEmployees,
  getFilterOptions,
  scoreEmployees,
} from './utils/analytics';
import {
  fetchGoogleSheetEmployees,
  parseEmployeeCsv,
} from './utils/csvParser';

const DEFAULT_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'deep-dive', label: 'Deep Dive' },
  { id: 'insights', label: 'Insights' },
];

function formatTimeNow(): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('shell-analytics-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [employees, setEmployees] = useState<ScoredEmployee[]>([]);
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('shell-analytics-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const syncFromGoogleSheet = useCallback(async (signal?: AbortSignal) => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const rawEmployees = await fetchGoogleSheetEmployees(signal);
      if (signal?.aborted) return;
      const scored = scoreEmployees(rawEmployees);
      setEmployees(scored);
      setSourceMeta({
        sourceType: 'google-sheets',
        label: 'Google Sheets (gviz CSV)',
        syncedAt: formatTimeNow(),
        totalRecords: scored.length,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while loading the Google Sheet.';
      setErrorMessage(message);
    } finally {
      if (!signal?.aborted) {
        setIsSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    syncFromGoogleSheet(controller.signal);
    return () => controller.abort();
  }, [syncFromGoogleSheet]);

  const handleUploadCsv = useCallback(async (file: File) => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const text = await file.text();
      const rawEmployees = parseEmployeeCsv(text);
      const scored = scoreEmployees(rawEmployees);
      setEmployees(scored);
      setFilters(DEFAULT_FILTERS);
      setSourceMeta({
        sourceType: 'csv-upload',
        label: file.name,
        syncedAt: formatTimeNow(),
        totalRecords: scored.length,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not parse the uploaded CSV file.';
      setErrorMessage(message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const filterOptions = useMemo(() => getFilterOptions(employees), [employees]);

  const filteredEmployees = useMemo(
    () => filterEmployees(employees, filters),
    [employees, filters]
  );

  const handleResetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F6F4] dark:bg-[#0C0C0E] text-[#111113] dark:text-[#F4F4F5] transition-colors duration-150">
      <TopBar
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onSyncSheet={() => syncFromGoogleSheet()}
        onUploadCsv={handleUploadCsv}
        isSyncing={isSyncing}
        sourceMeta={sourceMeta}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Executive Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111113] dark:text-white text-balance">
              Shell UK Workforce Analytics
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Live headcount, attrition dynamics, compensation equity, and flight-risk oversight across UK operations.
            </p>
          </div>

          {sourceMeta && (
            <div className="lg:hidden text-xs text-neutral-500 dark:text-neutral-400 font-mono-tabular">
              {sourceMeta.totalRecords} records ·{' '}
              {sourceMeta.sourceType === 'google-sheets' ? 'Google Sheet' : sourceMeta.label} ·{' '}
              {sourceMeta.syncedAt}
            </div>
          )}
        </div>

        {/* Clear Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-5 h-5 text-[#DC2626] dark:text-[#F87171] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Unable to load dataset
                </h2>
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 leading-relaxed">
                  {errorMessage}
                </p>
                {employees.length > 0 && (
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Continuing to display the previously loaded {employees.length} records.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fallbackFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadCsv(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => syncFromGoogleSheet()}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFC800] hover:bg-[#F58220] text-[#111113] transition-colors cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Retry Sync</span>
              </button>
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-[#151518] text-red-900 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Initial Loading Skeleton */}
        {isSyncing && employees.length === 0 ? (
          <div className="space-y-5" aria-busy="true" aria-label="Loading workforce data">
            <div className="h-28 rounded-xl bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-xl bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="h-80 rounded-xl bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 animate-pulse" />
              <div className="h-80 rounded-xl bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 animate-pulse" />
            </div>
          </div>
        ) : employees.length > 0 ? (
          <>
            {/* Shared Filters Above Three Tabs */}
            <FilterBar
              filters={filters}
              onChange={setFilters}
              onReset={handleResetFilters}
              options={filterOptions}
              filteredCount={filteredEmployees.length}
              totalCount={employees.length}
            />

            {/* Tab Navigation */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 overflow-x-auto">
              <nav aria-label="Analytics Views" className="flex items-center gap-1 sm:gap-2">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] ${
                        isActive
                          ? 'text-[#111113] dark:text-[#FFC800]'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-[#111113] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 bottom-0 h-[3px] bg-[#FFC800] rounded-t-xs"
                        />
                      )}
                    </button>
                  );
                })}
              </nav>

              <span className="hidden sm:inline-block text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap shrink-0 font-mono-tabular">
                {filteredEmployees.length === 0
                  ? '0 records selected'
                  : `${filteredEmployees.length} filtered · GBP (£)`}
              </span>
            </div>

            {/* Active Tab Viewport */}
            {activeTab === 'overview' && (
              <OverviewTab
                employees={filteredEmployees}
                filters={filters}
                isDark={isDark}
              />
            )}

            {activeTab === 'deep-dive' && (
              <DeepDiveTab employees={filteredEmployees} isDark={isDark} />
            )}

            {activeTab === 'insights' && (
              <InsightsTab
                filteredEmployees={filteredEmployees}
                allEmployees={employees}
                filters={filters}
                onShowActiveEmployees={() =>
                  setFilters((prev) => ({ ...prev, attrition: 'No' }))
                }
              />
            )}
          </>
        ) : null}
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] mt-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Shell People Analytics · Shell UK Employee Dataset</span>
          <span>Live Google Sheets CSV via gviz endpoint with local CSV upload fallback</span>
        </div>
      </footer>
    </div>
  );
}
