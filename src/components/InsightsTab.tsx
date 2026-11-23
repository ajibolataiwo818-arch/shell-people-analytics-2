import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { FilterState, ScoredEmployee } from '../types/employee';
import {
  FLIGHT_RISK_RUBRIC,
  HIGH_RISK_THRESHOLD,
  MODERATE_RISK_THRESHOLD,
  formatGBP,
  generateFindingsAndActions,
  getTopFlightRiskWatchlist,
} from '../utils/analytics';

interface InsightsTabProps {
  filteredEmployees: ScoredEmployee[];
  allEmployees: ScoredEmployee[];
  filters: FilterState;
  onShowActiveEmployees?: () => void;
}

export function InsightsTab({
  filteredEmployees,
  allEmployees,
  filters,
  onShowActiveEmployees,
}: InsightsTabProps) {
  const [showRubric, setShowRubric] = useState(true);

  const { findings, actions } = useMemo(
    () => generateFindingsAndActions(filteredEmployees, allEmployees, filters),
    [filteredEmployees, allEmployees, filters]
  );

  const watchlist = useMemo(
    () => getTopFlightRiskWatchlist(filteredEmployees, 10),
    [filteredEmployees]
  );

  const isDepartedOnly = filters.attrition === 'Yes';

  if (filteredEmployees.length === 0) {
    return (
      <div className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl p-10 text-center">
        <h3 className="text-base font-semibold text-[#111113] dark:text-[#F4F4F5]">
          No findings for this filter slice
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Adjust or reset the shared filters above to generate workforce insights and the flight-risk watchlist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Auto-Generated Findings */}
      <section aria-labelledby="findings-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="findings-heading"
              className="text-lg font-semibold tracking-tight text-[#111113] dark:text-white"
            >
              Automated Workforce Findings
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Dynamically computed from the {filteredEmployees.length} filtered records against the{' '}
              {allEmployees.length}-person Shell UK dataset
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {findings.map((finding) => {
            const severityText =
              finding.severity === 'critical'
                ? 'High Alert'
                : finding.severity === 'warning'
                  ? 'Watch'
                  : finding.severity === 'positive'
                    ? 'Healthy'
                    : 'Baseline';

            const severityColor =
              finding.severity === 'critical'
                ? 'text-[#DC2626] dark:text-[#F87171]'
                : finding.severity === 'warning'
                  ? 'text-[#D97706] dark:text-[#FBBF24]'
                  : finding.severity === 'positive'
                    ? 'text-[#16A34A] dark:text-[#4ADE80]'
                    : 'text-neutral-500 dark:text-neutral-400';

            return (
              <article
                key={finding.id}
                className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">
                      {finding.category}
                    </span>
                    <span className={`font-semibold ${severityColor}`}>{severityText}</span>
                  </div>

                  <h3 className="text-[15px] font-semibold leading-snug text-[#111113] dark:text-[#F4F4F5]">
                    {finding.headline}
                  </h3>

                  <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {finding.summary}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 text-xs font-mono-tabular font-medium text-[#111113] dark:text-[#FFC800]">
                  {finding.metric}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. Top-10 Flight-Risk Watchlist & Transparent Scoring Rule */}
      <section aria-labelledby="watchlist-heading" className="space-y-4">
        <div className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="watchlist-heading"
                className="text-lg font-semibold tracking-tight text-[#111113] dark:text-white"
              >
                Top-10 Active Flight-Risk Watchlist
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Transparent 0–100 retention risk model evaluated on active employees · High Risk ≥{' '}
                {HIGH_RISK_THRESHOLD} · Moderate {MODERATE_RISK_THRESHOLD}–{HIGH_RISK_THRESHOLD - 1}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRubric((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              <span>{showRubric ? 'Hide Scoring Rule' : 'Show Scoring Rule'}</span>
              {showRubric ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {showRubric && (
            <div className="px-4 sm:px-5 py-4 bg-neutral-50 dark:bg-[#111113] border-b border-neutral-200 dark:border-neutral-800">
              <div className="text-xs font-semibold text-[#111113] dark:text-[#F4F4F5] mb-2.5">
                Transparent Additive Scoring Rule (Max 100 Points)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
                {FLIGHT_RISK_RUBRIC.map((item) => (
                  <div key={item.rule} className="text-xs space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-[#111113] dark:text-[#F4F4F5]">
                        {item.rule}
                      </span>
                      <span className="font-mono-tabular font-semibold text-[#F58220] dark:text-[#FFC800] shrink-0">
                        {item.points}
                      </span>
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 leading-snug">
                      {item.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isDepartedOnly ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                The Attrition filter is currently set to <strong>Departed Only (Yes)</strong>. The
                flight-risk watchlist ranks active employees who can still be retained.
              </p>
              {onShowActiveEmployees && (
                <button
                  type="button"
                  onClick={onShowActiveEmployees}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#FFC800] hover:bg-[#F58220] text-[#111113] transition-colors cursor-pointer"
                >
                  Show Active Employees
                </button>
              )}
            </div>
          ) : watchlist.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No active employees found in the current filter selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4 whitespace-nowrap">Employee</th>
                    <th className="py-3 px-4 whitespace-nowrap">Function &amp; Site</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">Pay vs L-Median</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">Score</th>
                    <th className="py-3 px-4 min-w-[280px]">Triggered Risk Drivers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {watchlist.map((emp, idx) => {
                    const payDiffPct =
                      emp.levelMedianIncome > 0
                        ? ((emp.monthlyIncomeGbp - emp.levelMedianIncome) /
                            emp.levelMedianIncome) *
                          100
                        : 0;
                    const scoreClass =
                      emp.riskTier === 'High'
                        ? 'text-[#DC2626] dark:text-[#F87171]'
                        : emp.riskTier === 'Moderate'
                          ? 'text-[#D97706] dark:text-[#FBBF24]'
                          : 'text-neutral-700 dark:text-neutral-300';

                    return (
                      <tr
                        key={emp.employeeId}
                        className="hover:bg-neutral-50 dark:hover:bg-[#1A1A1F] transition-colors align-top"
                      >
                        <td className="py-3 px-4 font-mono-tabular text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#111113] dark:text-[#F4F4F5]">
                            {emp.fullName}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="font-mono-tabular">{emp.employeeId}</span> ·{' '}
                            {emp.jobTitle} · L{emp.jobLevel}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-neutral-800 dark:text-neutral-200">
                            {emp.department}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {emp.location} · {emp.employmentType} · {emp.yearsAtCompany}y tenure
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-mono-tabular">
                          <div className="font-medium text-[#111113] dark:text-[#F4F4F5]">
                            {formatGBP(emp.monthlyIncomeGbp)}
                          </div>
                          <div
                            className={`text-xs ${
                              payDiffPct < 0
                                ? 'text-[#DC2626] dark:text-[#F87171]'
                                : 'text-neutral-500 dark:text-neutral-400'
                            }`}
                          >
                            {payDiffPct >= 0 ? '+' : ''}
                            {payDiffPct.toFixed(0)}% vs L{emp.jobLevel} med
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right whitespace-nowrap font-mono-tabular font-bold ${scoreClass}`}>
                          <div>{emp.flightRiskScore}/100</div>
                          <div className="text-xs font-medium">{emp.riskTier} Risk</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {emp.riskFactors.length === 0 ? (
                            <span className="text-neutral-400">No elevated risk factors</span>
                          ) : (
                            emp.riskFactors.map((f, fIdx) => (
                              <span key={f.label}>
                                {fIdx > 0 && (
                                  <span className="text-neutral-400 mx-1.5" aria-hidden="true">
                                    ·
                                  </span>
                                )}
                                <span>
                                  {f.label}{' '}
                                  <strong className="font-mono-tabular text-[#111113] dark:text-[#FFC800]">
                                    (+{f.points})
                                  </strong>
                                </span>
                              </span>
                            ))
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 3. Recommended Actions */}
      <section aria-labelledby="actions-heading" className="space-y-4">
        <div>
          <h2
            id="actions-heading"
            className="text-lg font-semibold tracking-tight text-[#111113] dark:text-white"
          >
            Recommended HR Actions
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Prioritised retention and compensation interventions tailored to your current filter view
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action, index) => {
            const priorityClass =
              action.priority === 'Immediate'
                ? 'text-[#DC2626] dark:text-[#F87171]'
                : action.priority === 'Near-Term'
                  ? 'text-[#F58220] dark:text-[#FFC800]'
                  : 'text-neutral-600 dark:text-neutral-400';

            return (
              <div
                key={action.id}
                className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">
                      0{index + 1}. {action.focusArea}
                    </span>
                    <span className={`font-semibold ${priorityClass}`}>
                      {action.priority} Priority
                    </span>
                  </div>

                  <h3 className="text-[15px] font-semibold text-[#111113] dark:text-[#F4F4F5] leading-snug">
                    {action.title}
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {action.rationale}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Target: <strong className="text-[#111113] dark:text-[#F4F4F5]">{action.targetGroup}</strong>
                  </span>
                  <span className="text-[#F58220] dark:text-[#FFC800] font-medium">
                    {action.expectedImpact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
