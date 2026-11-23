import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { FilterState, ScoredEmployee } from '../types/employee';
import {
  formatGBP,
  formatPercent,
  getHiringTrend,
  getOverviewMetrics,
  groupBreakdown,
} from '../utils/analytics';
import { ChartCard, getChartTheme } from './ChartCard';
import { KpiCard } from './KpiCard';

interface OverviewTabProps {
  employees: ScoredEmployee[];
  filters: FilterState;
  isDark: boolean;
}

export function OverviewTab({ employees, filters, isDark }: OverviewTabProps) {
  const metrics = useMemo(() => getOverviewMetrics(employees), [employees]);
  const isEmpty = employees.length === 0;

  const deptData = useMemo(
    () => groupBreakdown(employees, (e) => e.department),
    [employees]
  );

  const locationData = useMemo(
    () => groupBreakdown(employees, (e) => e.location),
    [employees]
  );

  const genderData = useMemo(
    () => groupBreakdown(employees, (e) => e.gender),
    [employees]
  );

  const empTypeData = useMemo(
    () => groupBreakdown(employees, (e) => e.employmentType),
    [employees]
  );

  const hiringData = useMemo(() => getHiringTrend(employees), [employees]);

  const theme = useMemo(() => getChartTheme(isDark), [isDark]);

  const departmentConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: deptData.map((d) => d.label),
        datasets: [
          {
            label: 'Active',
            data: deptData.map((d) => d.active),
            backgroundColor: theme.yellow,
            borderRadius: 4,
            barPercentage: 0.72,
          },
          {
            label: 'Departed (Attrition)',
            data: deptData.map((d) => d.left),
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
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              color: theme.textColor,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const row = deptData[idx];
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}% · Avg Pay: ${formatGBP(row.avgIncome)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.textColor, font: { size: 11 } },
          },
        },
      },
    }),
    [deptData, theme]
  );

  const locationConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: locationData.map((l) => l.label),
        datasets: [
          {
            label: 'Active',
            data: locationData.map((l) => l.active),
            backgroundColor: theme.ink,
            borderRadius: 4,
            barPercentage: 0.65,
          },
          {
            label: 'Departed',
            data: locationData.map((l) => l.left),
            backgroundColor: theme.orange,
            borderRadius: 4,
            barPercentage: 0.65,
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
              pointStyle: 'rectRounded',
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
                const row = locationData[idx];
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.textColor, font: { size: 11 }, maxRotation: 30 },
          },
          y: {
            stacked: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
        },
      },
    }),
    [locationData, theme]
  );

  const genderConfig = useMemo<ChartConfiguration<'doughnut'>>(
    () => ({
      type: 'doughnut',
      data: {
        labels: genderData.map((g) => g.label),
        datasets: [
          {
            data: genderData.map((g) => g.total),
            backgroundColor: [theme.yellow, theme.ink, theme.orange, theme.slate],
            borderColor: theme.surfaceBorder,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
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
              label: (ctx) => {
                const row = genderData[ctx.dataIndex];
                const pct =
                  employees.length > 0 ? ((row.total / employees.length) * 100).toFixed(1) : '0.0';
                return ` ${row.label}: ${row.total} (${pct}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    }),
    [genderData, employees.length, theme]
  );

  const empTypeConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: empTypeData.map((e) => e.label),
        datasets: [
          {
            label: 'Active',
            data: empTypeData.map((e) => e.active),
            backgroundColor: theme.yellow,
            borderRadius: 4,
            barPercentage: 0.55,
          },
          {
            label: 'Departed',
            data: empTypeData.map((e) => e.left),
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
              pointStyle: 'rectRounded',
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
                const row = empTypeData[idx];
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
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
        },
      },
    }),
    [empTypeData, theme]
  );

  const hiringConfig = useMemo<ChartConfiguration<'line'>>(
    () => ({
      type: 'line',
      data: {
        labels: hiringData.map((h) => h.year),
        datasets: [
          {
            label: 'Annual Hires',
            data: hiringData.map((h) => h.hired),
            borderColor: theme.orange,
            backgroundColor: isDark
              ? 'rgba(245, 130, 32, 0.18)'
              : 'rgba(255, 200, 0, 0.25)',
            fill: true,
            tension: 0.28,
            borderWidth: 2.5,
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: theme.yellow,
            pointBorderColor: theme.ink,
            pointBorderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#FFFFFF',
            bodyColor: '#E4E4E7',
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const row = hiringData[ctx.dataIndex];
                return ` ${row.hired} hired (${row.active} active · ${row.left} departed)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.mutedTextColor, maxTicksLimit: 12 },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.mutedTextColor, precision: 0 },
          },
        },
      },
    }),
    [hiringData, isDark, theme]
  );

  const isDepartedOnly = filters.attrition === 'Yes';
  const payrollDisplay = isDepartedOnly
    ? metrics.totalMonthlyPayroll
    : metrics.activeMonthlyPayroll;

  return (
    <div className="space-y-6">
      {/* 5 Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Headcount"
          value={metrics.headcount.toLocaleString('en-GB')}
          detail={`${metrics.activeCount} active · ${metrics.leftCount} departed`}
          accent="yellow"
        />
        <KpiCard
          label="Attrition Rate"
          value={formatPercent(metrics.attritionRate)}
          detail={`${metrics.leftCount} exits in filtered cohort`}
          accent={metrics.attritionRate >= 22 ? 'crimson' : 'orange'}
        />
        <KpiCard
          label="Active Employees"
          value={metrics.activeCount.toLocaleString('en-GB')}
          detail={
            metrics.headcount > 0
              ? `${((metrics.activeCount / metrics.headcount) * 100).toFixed(1)}% retention in view`
              : 'No records'
          }
          accent="neutral"
        />
        <KpiCard
          label="Average Monthly Income"
          value={formatGBP(metrics.avgIncome)}
          detail={`${formatGBP(metrics.avgIncome * 12)} annualised avg`}
          accent="yellow"
        />
        <KpiCard
          label={isDepartedOnly ? 'Departed Payroll' : 'Active Monthly Payroll'}
          value={formatGBP(payrollDisplay, true)}
          detail={`${formatGBP(payrollDisplay * 12, true)} annualised run-rate`}
          accent="orange"
        />
      </div>

      {/* Primary Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active vs departed employees across Shell UK functions"
          heightClass="h-80"
          config={departmentConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Workforce by UK Location"
          subtitle="Active headcount and attrition across UK operational hubs"
          heightClass="h-80"
          config={locationConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />
      </div>

      {/* Secondary Demographic & Hiring Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Gender Distribution"
          subtitle="Share of filtered workforce and attrition rate"
          heightClass="h-64"
          config={genderConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Employment Type Breakdown"
          subtitle="Full-Time, Part-Time, and Contract turnover comparison"
          heightClass="h-64"
          config={empTypeConfig}
          isDark={isDark}
          isEmpty={isEmpty}
        />

        <div className="md:col-span-2 lg:col-span-1">
          <ChartCard
            title="Hiring Trend by Year"
            subtitle="Cohort intake trajectory by hire date"
            heightClass="h-64"
            config={hiringConfig}
            isDark={isDark}
            isEmpty={isEmpty || hiringData.length === 0}
          />
        </div>
      </div>
    </div>
  );
}
