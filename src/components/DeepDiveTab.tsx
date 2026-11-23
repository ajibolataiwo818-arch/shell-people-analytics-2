import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import {
  HIGH_RISK_THRESHOLD,
  formatGBP,
  formatPercent,
  formatTravelLabel,
  getAgeBandBreakdown,
  getDeepDiveMetrics,
  getIncomeByLevelAndDept,
  getTenureBandBreakdown,
  groupBreakdown,
} from '../utils/analytics';
import { ChartCard, getChartTheme } from './ChartCard';
import { KpiCard } from './KpiCard';

interface DeepDiveTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
}

type SortKey =
  | 'employeeId'
  | 'fullName'
  | 'department'
  | 'location'
  | 'jobLevel'
  | 'employmentType'
  | 'yearsAtCompany'
  | 'monthlyIncomeGbp'
  | 'flightRiskScore'
  | 'attrition';

const PAGE_SIZE = 15;

export function DeepDiveTab({ employees, isDark }: DeepDiveTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('flightRiskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const metrics = useMemo(() => getDeepDiveMetrics(employees), [employees]);
  const isEmpty = employees.length === 0;
  const theme = useMemo(() => getChartTheme(isDark), [isDark]);

  const ageBands = useMemo(() => getAgeBandBreakdown(employees), [employees]);
  const tenureBands = useMemo(() => getTenureBandBreakdown(employees), [employees]);
  const incomeBreakdown = useMemo(() => getIncomeByLevelAndDept(employees), [employees]);

  const educationData = useMemo(() => {
    const order = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
    const raw = groupBreakdown(employees, (e) => e.education);
    return raw.sort((a, b) => {
      const ia = order.indexOf(a.label);
      const ib = order.indexOf(b.label);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.total - a.total;
    });
  }, [employees]);

  const travelData = useMemo(() => {
    const order = ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'];
    const raw = groupBreakdown(employees, (e) => e.businessTravel);
    return raw.sort((a, b) => {
      const ia = order.indexOf(a.label);
      const ib = order.indexOf(b.label);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return b.total - a.total;
    });
  }, [employees]);

  // Age Bands + Attrition Rate combo chart
  const ageConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(
    () => ({
      type: 'bar',
      data: {
        labels: ageBands.map((b) => b.label),
        datasets: [
          {
            type: 'bar',
            label: 'Headcount',
            data: ageBands.map((b) => b.total),
            backgroundColor: theme.yellow,
            borderRadius: 4,
            barPercentage: 0.6,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Attrition %',
            data: ageBands.map((b) => Number(b.attritionRate.toFixed(1))),
            borderColor: theme.crimson,
            backgroundColor: theme.crimson,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.25,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const b = ageBands[idx];
                return `Active: ${b.active} · Departed: ${b.left}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textColor },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            suggestedMax: 45,
            grid: { drawOnChartArea: false },
            ticks: {
              color: theme.crimson,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    }),
    [ageBands, theme]
  );

  // Tenure Bands + Attrition Rate combo chart
  const tenureConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(
    () => ({
      type: 'bar',
      data: {
        labels: tenureBands.map((b) => b.label),
        datasets: [
          {
            type: 'bar',
            label: 'Headcount',
            data: tenureBands.map((b) => b.total),
            backgroundColor: theme.orange,
            borderRadius: 4,
            barPercentage: 0.6,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Attrition %',
            data: tenureBands.map((b) => Number(b.attritionRate.toFixed(1))),
            borderColor: theme.ink,
            backgroundColor: theme.ink,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.25,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const b = tenureBands[idx];
                return `Active: ${b.active} · Departed: ${b.left}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textColor },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            suggestedMax: 45,
            grid: { drawOnChartArea: false },
            ticks: {
              color: theme.textColor,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    }),
    [tenureBands, theme]
  );

  // Income by Job Level
  const incomeByLevelConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: incomeBreakdown.byLevel.map((l) => l.label),
        datasets: [
          {
            label: 'Mean Monthly Income (£)',
            data: incomeBreakdown.byLevel.map((l) => Math.round(l.avgIncome)),
            backgroundColor: theme.yellow,
            borderRadius: 4,
            barPercentage: 0.68,
          },
          {
            label: 'Median Monthly Income (£)',
            data: incomeBreakdown.byLevel.map((l) => Math.round(l.medianIncome)),
            backgroundColor: theme.ink,
            borderRadius: 4,
            barPercentage: 0.68,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatGBP(Number(ctx.parsed.y))}`,
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                return `Employees in band: ${incomeBreakdown.byLevel[idx].count}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textColor },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.mutedTextColor,
              callback: (v) => formatGBP(Number(v)),
            },
          },
        },
      },
    }),
    [incomeBreakdown.byLevel, theme]
  );

  // Income by Department
  const incomeByDeptConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: incomeBreakdown.byDepartment.map((d) => d.label),
        datasets: [
          {
            label: 'Average Monthly Income (£)',
            data: incomeBreakdown.byDepartment.map((d) => Math.round(d.avgIncome)),
            backgroundColor: theme.orange,
            borderRadius: 4,
            barPercentage: 0.72,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const row = incomeBreakdown.byDepartment[ctx.dataIndex];
                return ` Avg: ${formatGBP(row.avgIncome)} · Median: ${formatGBP(row.medianIncome)} (n=${row.count})`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.mutedTextColor,
              callback: (v) => formatGBP(Number(v), true),
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: theme.textColor, font: { size: 11 } },
          },
        },
      },
    }),
    [incomeBreakdown.byDepartment, theme]
  );

  // Education Breakdown
  const educationConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: educationData.map((e) => e.label),
        datasets: [
          {
            label: 'Active',
            data: educationData.map((e) => e.active),
            backgroundColor: theme.yellow,
            borderRadius: 4,
            barPercentage: 0.62,
          },
          {
            label: 'Departed',
            data: educationData.map((e) => e.left),
            backgroundColor: theme.orange,
            borderRadius: 4,
            barPercentage: 0.62,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const row = educationData[idx];
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}% · Avg Pay: ${formatGBP(row.avgIncome)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.textColor, font: { size: 11 } },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
        },
      },
    }),
    [educationData, theme]
  );

  // Business Travel Breakdown
  const travelConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: travelData.map((t) => formatTravelLabel(t.label)),
        datasets: [
          {
            label: 'Active',
            data: travelData.map((t) => t.active),
            backgroundColor: theme.ink,
            borderRadius: 4,
            barPercentage: 0.55,
          },
          {
            label: 'Departed',
            data: travelData.map((t) => t.left),
            backgroundColor: theme.crimson,
            borderRadius: 4,
            barPercentage: 0.55,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const row = travelData[idx];
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.textColor },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
        },
      },
    }),
    [travelData, theme]
  );

  // Income vs Tenure Scatter Plot
  const scatterConfig = useMemo<ChartConfiguration<'scatter'>>(() => {
    const activePoints = employees
      .filter((e) => e.attrition === 'No')
      .map((e) => ({ x: e.yearsAtCompany, y: e.monthlyIncomeGbp, emp: e }));
    const leftPoints = employees
      .filter((e) => e.attrition === 'Yes')
      .map((e) => ({ x: e.yearsAtCompany, y: e.monthlyIncomeGbp, emp: e }));

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Active',
            data: activePoints,
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.72)' : 'rgba(245, 130, 32, 0.72)',
            borderColor: theme.yellow,
            pointRadius: 4.5,
            pointHoverRadius: 7,
          },
          {
            label: 'Departed (Attrition)',
            data: leftPoints,
            backgroundColor: 'rgba(220, 38, 38, 0.82)',
            borderColor: theme.crimson,
            pointRadius: 5,
            pointHoverRadius: 7.5,
            pointStyle: 'triangle',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              title: (items) => {
                const raw = items[0]?.raw as { emp?: ScoredEmployee } | undefined;
                if (!raw?.emp) return '';
                return `${raw.emp.fullName} (${raw.emp.employeeId})`;
              },
              label: (ctx) => {
                const raw = ctx.raw as { emp?: ScoredEmployee };
                const e = raw.emp;
                if (!e) return '';
                return [
                  ` ${e.jobTitle} · L${e.jobLevel} (${e.department})`,
                  ` Tenure: ${e.yearsAtCompany} yrs · Income: ${formatGBP(e.monthlyIncomeGbp)}/mo`,
                  ` Status: ${e.attrition === 'Yes' ? 'Departed' : `Active · Risk ${e.flightRiskScore}/100`}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Years at Company',
              color: theme.mutedTextColor,
              font: { size: 11 },
            },
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
          y: {
            title: {
              display: true,
              text: 'Monthly Income (GBP)',
              color: theme.mutedTextColor,
              font: { size: 11 },
            },
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.mutedTextColor,
              callback: (v) => formatGBP(Number(v), true),
            },
          },
        },
      },
    };
  }, [employees, isDark, theme]);

  // Search & Sort for Employee Table
  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? employees.filter(
          (e) =>
            e.employeeId.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q)
        )
      : employees;

    return [...searched].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'employeeId':
          cmp = a.employeeId.localeCompare(b.employeeId);
          break;
        case 'fullName':
          cmp = a.fullName.localeCompare(b.fullName);
          break;
        case 'department':
          cmp = a.department.localeCompare(b.department);
          break;
        case 'location':
          cmp = a.location.localeCompare(b.location);
          break;
        case 'jobLevel':
          cmp = a.jobLevel - b.jobLevel;
          break;
        case 'employmentType':
          cmp = a.employmentType.localeCompare(b.employmentType);
          break;
        case 'yearsAtCompany':
          cmp = a.yearsAtCompany - b.yearsAtCompany;
          break;
        case 'monthlyIncomeGbp':
          cmp = a.monthlyIncomeGbp - b.monthlyIncomeGbp;
          break;
        case 'flightRiskScore':
          cmp = a.flightRiskScore - b.flightRiskScore;
          break;
        case 'attrition':
          cmp = a.attrition.localeCompare(b.attrition);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredAndSortedRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'monthlyIncomeGbp' ||
          key === 'flightRiskScore' ||
          key === 'yearsAtCompany' ||
          key === 'jobLevel'
          ? 'desc'
          : 'asc'
      );
    }
    setPage(1);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#F58220] dark:text-[#FFC800]" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#F58220] dark:text-[#FFC800]" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-6">
      {/* 5 Deep Dive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Average Tenure"
          value={`${metrics.avgTenure.toFixed(1)} yrs`}
          detail="Mean years at Shell UK"
          accent="yellow"
        />
        <KpiCard
          label="Female Share"
          value={formatPercent(metrics.femaleShare)}
          detail={`${metrics.femaleCount} of ${employees.length} employees`}
          accent="neutral"
        />
        <KpiCard
          label="Non-Full-Time Share"
          value={formatPercent(metrics.nonFullTimeShare)}
          detail={`${metrics.nonFullTimeCount} Part-Time & Contract`}
          accent="orange"
        />
        <KpiCard
          label="Years Since Promotion"
          value={`${metrics.avgYearsSincePromotion.toFixed(1)} yrs`}
          detail="Mean progression interval"
          accent="neutral"
        />
        <KpiCard
          label="High Flight-Risk Count"
          value={metrics.highRiskCount.toLocaleString('en-GB')}
          detail={`Active staff scoring ≥${HIGH_RISK_THRESHOLD}/100 (${metrics.highRiskShareOfActive.toFixed(1)}%)`}
          accent={metrics.highRiskCount > 0 ? 'crimson' : 'neutral'}
        />
      </div>

      {/* Age & Tenure Bands with Attrition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Workforce headcount bars with attrition % overlay"
          heightClass="h-72"
          config={ageConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Years at Shell UK vs attrition rate by cohort"
          heightClass="h-72"
          config={tenureConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
      </div>

      {/* Income by Level & Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Monthly Income by Job Level"
          subtitle="Mean and median GBP compensation across Levels 1–5"
          heightClass="h-72"
          config={incomeByLevelConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
        <ChartCard
          title="Average Monthly Income by Department"
          subtitle="Ranked departmental pay comparison (GBP/month)"
          heightClass="h-72"
          config={incomeByDeptConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
      </div>

      {/* Education, Travel, and Income-vs-Tenure Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Education & Attrition"
          subtitle="Headcount split across qualification levels"
          heightClass="h-72"
          config={educationConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Turnover comparison by travel frequency"
          heightClass="h-72"
          config={travelConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
        <ChartCard
          title="Monthly Income vs Tenure"
          subtitle="Individual compensation trajectory & exit distribution"
          heightClass="h-72"
          config={scatterConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
      </div>

      {/* Searchable, Sortable Employee Table */}
      <section className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#111113] dark:text-[#F4F4F5]">
              Employee Directory
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono-tabular">
              {filteredAndSortedRows.length} matching records · click any column header to sort
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, name, role, dept, site…"
              aria-label="Search employees"
              className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] placeholder:text-neutral-400 focus:outline-none focus:border-[#F58220] dark:focus:border-[#FFC800] transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111113] text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('employeeId')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>ID</span>
                    {renderSortIcon('employeeId')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('fullName')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Employee</span>
                    {renderSortIcon('fullName')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('department')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Department</span>
                    {renderSortIcon('department')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('location')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Location</span>
                    {renderSortIcon('location')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('jobLevel')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Level</span>
                    {renderSortIcon('jobLevel')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('employmentType')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Type</span>
                    {renderSortIcon('employmentType')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('yearsAtCompany')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Tenure</span>
                    {renderSortIcon('yearsAtCompany')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('monthlyIncomeGbp')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Income/mo</span>
                    {renderSortIcon('monthlyIncomeGbp')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('flightRiskScore')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Flight Risk</span>
                    {renderSortIcon('flightRiskScore')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('attrition')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    <span>Status</span>
                    {renderSortIcon('attrition')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-10 px-4 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    No employees match your filters or search query.
                  </td>
                </tr>
              ) : (
                pageRows.map((emp) => {
                  const riskColor =
                    emp.riskTier === 'High'
                      ? 'text-[#DC2626] dark:text-[#F87171] font-semibold'
                      : emp.riskTier === 'Moderate'
                        ? 'text-[#D97706] dark:text-[#FBBF24] font-medium'
                        : 'text-neutral-600 dark:text-neutral-400';

                  return (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-neutral-50 dark:hover:bg-[#1A1A1F] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {emp.employeeId}
                      </td>
                      <td className="py-2.5 px-4 min-w-[180px]">
                        <div className="font-medium text-[#111113] dark:text-[#F4F4F5] leading-tight">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[220px]">
                          {emp.jobTitle}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.location}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        L{emp.jobLevel}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.employmentType}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.yearsAtCompany} yrs
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular font-medium text-[#111113] dark:text-[#F4F4F5] whitespace-nowrap">
                        {formatGBP(emp.monthlyIncomeGbp)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono-tabular whitespace-nowrap ${riskColor}`}>
                        {emp.flightRiskScore}/100 · {emp.riskTier}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-xs font-medium">
                        {emp.attrition === 'Yes' ? (
                          <span className="text-[#DC2626] dark:text-[#F87171]">Departed</span>
                        ) : (
                          <span className="text-[#16A34A] dark:text-[#4ADE80]">Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-mono-tabular">
            Page {safePage} of {totalPages} ({filteredAndSortedRows.length} rows)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
