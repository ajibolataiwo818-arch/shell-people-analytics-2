import type {
  Employee,
  FilterState,
  InsightFinding,
  RecommendedAction,
  RiskFactor,
  RiskTier,
  ScoredEmployee,
} from '../types/employee';

export const HIGH_RISK_THRESHOLD = 55;
export const MODERATE_RISK_THRESHOLD = 35;

export const FLIGHT_RISK_RUBRIC = [
  {
    rule: 'Non-Full-Time Arrangement',
    points: '+25 Part-Time / +20 Contract',
    rationale: 'Part-time and contract cohorts show elevated turnover sensitivity vs full-time staff.',
  },
  {
    rule: 'Compensation Below Level Median',
    points: '+20 (≥15% below) / +10 (< median)',
    rationale: 'Monthly GBP income compared against the Shell UK median for the employee’s Job Level.',
  },
  {
    rule: 'Promotion Stagnation',
    points: '+15 (≥5 yrs) / +8 (3–4 yrs)',
    rationale: 'Extended period since last promotion signals stalled career progression.',
  },
  {
    rule: 'Early Tenure or Manager Change',
    points: '+15 (≤3 yrs tenure or ≤1 yr mgr) / +8 (≤5 or ≤2)',
    rationale: 'Early onboarding window and recent leadership transitions carry heightened exit risk.',
  },
  {
    rule: 'Travel & Commute Strain',
    points: '+15 (≥30 km + frequent travel) / +10 (either) / +5 (≥20 km)',
    rationale: 'Sustained travel load or long UK commutes increase burnout and external pull.',
  },
  {
    rule: 'Department Attrition Exposure',
    points: '+10 (≥3 pp above avg) / +5 (above avg)',
    rationale: 'Reflects elevated team-level turnover pressure in the employee’s home department.',
  },
] as const;

export function formatGBP(amount: number, compact = false): string {
  if (!Number.isFinite(amount)) return '£0';
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `£${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `£${(amount / 1_000).toFixed(1)}k`;
    }
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatTravelLabel(raw: string): string {
  switch (raw) {
    case 'Travel_Frequently':
      return 'Frequent Travel';
    case 'Travel_Rarely':
      return 'Rare Travel';
    case 'Non-Travel':
      return 'Non-Travel';
    default:
      return raw.replace(/_/g, ' ');
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function scoreEmployees(allEmployees: Employee[]): ScoredEmployee[] {
  if (allEmployees.length === 0) return [];

  // Peer compensation benchmark: median monthly income per JobLevel across loaded dataset
  const incomeByLevel = new Map<number, number[]>();
  const deptCounts = new Map<string, { total: number; left: number }>();
  let totalLeft = 0;

  for (const emp of allEmployees) {
    const lvlList = incomeByLevel.get(emp.jobLevel) ?? [];
    lvlList.push(emp.monthlyIncomeGbp);
    incomeByLevel.set(emp.jobLevel, lvlList);

    const dStats = deptCounts.get(emp.department) ?? { total: 0, left: 0 };
    dStats.total += 1;
    if (emp.attrition === 'Yes') {
      dStats.left += 1;
      totalLeft += 1;
    }
    deptCounts.set(emp.department, dStats);
  }

  const levelMedians = new Map<number, number>();
  incomeByLevel.forEach((vals, lvl) => {
    levelMedians.set(lvl, median(vals));
  });

  const overallAttritionRate = (totalLeft / allEmployees.length) * 100;
  const deptAttritionRates = new Map<string, number>();
  deptCounts.forEach((stats, dept) => {
    deptAttritionRates.set(dept, stats.total > 0 ? (stats.left / stats.total) * 100 : 0);
  });

  return allEmployees.map((emp) => {
    const factors: RiskFactor[] = [];
    const lvlMedian = levelMedians.get(emp.jobLevel) ?? emp.monthlyIncomeGbp;

    // 1. Employment Type (+25 / +20)
    if (emp.employmentType === 'Part-Time') {
      factors.push({
        label: 'Part-Time status',
        detail: 'Part-Time employment carries highest attrition exposure',
        points: 25,
      });
    } else if (emp.employmentType === 'Contract') {
      factors.push({
        label: 'Contract status',
        detail: 'Fixed/Contract arrangement raises retention risk',
        points: 20,
      });
    }

    // 2. Compensation vs Level Median (+20 / +10)
    if (lvlMedian > 0) {
      const gapPct = ((lvlMedian - emp.monthlyIncomeGbp) / lvlMedian) * 100;
      if (gapPct >= 15) {
        factors.push({
          label: 'Pay ≥15% below L' + emp.jobLevel + ' median',
          detail: `${formatGBP(emp.monthlyIncomeGbp)} vs ${formatGBP(lvlMedian)} peer median`,
          points: 20,
        });
      } else if (gapPct > 0) {
        factors.push({
          label: 'Pay below L' + emp.jobLevel + ' median',
          detail: `${formatGBP(emp.monthlyIncomeGbp)} vs ${formatGBP(lvlMedian)} peer median`,
          points: 10,
        });
      }
    }

    // 3. Promotion Stagnation (+15 / +8)
    if (emp.yearsSinceLastPromotion >= 5) {
      factors.push({
        label: `${emp.yearsSinceLastPromotion} yrs since promotion`,
        detail: '5+ years without grade progression',
        points: 15,
      });
    } else if (emp.yearsSinceLastPromotion >= 3) {
      factors.push({
        label: `${emp.yearsSinceLastPromotion} yrs since promotion`,
        detail: '3–4 years without promotion',
        points: 8,
      });
    }

    // 4. Early Tenure or Manager Change (+15 / +8)
    if (emp.yearsAtCompany <= 3 || emp.yearsWithCurrManager <= 1) {
      const reason =
        emp.yearsAtCompany <= 3 && emp.yearsWithCurrManager <= 1
          ? `${emp.yearsAtCompany}y tenure, ${emp.yearsWithCurrManager}y w/ manager`
          : emp.yearsAtCompany <= 3
            ? `${emp.yearsAtCompany} yrs tenure (early career window)`
            : `${emp.yearsWithCurrManager} yr with current manager`;
      factors.push({
        label: 'Early tenure / mgr change',
        detail: reason,
        points: 15,
      });
    } else if (emp.yearsAtCompany <= 5 || emp.yearsWithCurrManager <= 2) {
      factors.push({
        label: 'Transition window',
        detail: `${emp.yearsAtCompany}y tenure · ${emp.yearsWithCurrManager}y w/ manager`,
        points: 8,
      });
    }

    // 5. Travel & Commute Strain (+15 / +10 / +5)
    const freqTravel = emp.businessTravel === 'Travel_Frequently';
    if (emp.distanceFromHomeKm >= 30 && freqTravel) {
      factors.push({
        label: 'Long commute + frequent travel',
        detail: `${emp.distanceFromHomeKm} km commute & frequent travel`,
        points: 15,
      });
    } else if (emp.distanceFromHomeKm >= 30 || freqTravel) {
      factors.push({
        label: freqTravel ? 'Frequent business travel' : `Long commute (${emp.distanceFromHomeKm} km)`,
        detail: freqTravel
          ? `Frequent travel · ${emp.distanceFromHomeKm} km from site`
          : `${emp.distanceFromHomeKm} km daily distance from site`,
        points: 10,
      });
    } else if (emp.distanceFromHomeKm >= 20) {
      factors.push({
        label: `Moderate commute (${emp.distanceFromHomeKm} km)`,
        detail: `${emp.distanceFromHomeKm} km distance from site`,
        points: 5,
      });
    }

    // 6. Department Attrition Exposure (+10 / +5)
    const deptRate = deptAttritionRates.get(emp.department) ?? overallAttritionRate;
    const deptDiff = deptRate - overallAttritionRate;
    if (deptDiff >= 3) {
      factors.push({
        label: 'High-attrition dept',
        detail: `${emp.department} (${deptRate.toFixed(1)}% vs ${overallAttritionRate.toFixed(1)}% avg)`,
        points: 10,
      });
    } else if (deptDiff > 0) {
      factors.push({
        label: 'Above-avg dept attrition',
        detail: `${emp.department} (${deptRate.toFixed(1)}% vs ${overallAttritionRate.toFixed(1)}% avg)`,
        points: 5,
      });
    }

    const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
    const flightRiskScore = Math.min(100, rawScore);
    const riskTier: RiskTier =
      flightRiskScore >= HIGH_RISK_THRESHOLD
        ? 'High'
        : flightRiskScore >= MODERATE_RISK_THRESHOLD
          ? 'Moderate'
          : 'Low';

    return {
      ...emp,
      flightRiskScore,
      riskTier,
      riskFactors: factors.sort((a, b) => b.points - a.points),
      levelMedianIncome: lvlMedian,
    };
  });
}

export function filterEmployees(
  employees: ScoredEmployee[],
  filters: FilterState
): ScoredEmployee[] {
  return employees.filter((emp) => {
    if (filters.department !== 'All' && emp.department !== filters.department) return false;
    if (filters.location !== 'All' && emp.location !== filters.location) return false;
    if (filters.employmentType !== 'All' && emp.employmentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && emp.gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && emp.attrition !== filters.attrition) return false;
    return true;
  });
}

export function getFilterOptions(employees: ScoredEmployee[]) {
  const unique = (getter: (e: ScoredEmployee) => string) =>
    Array.from(new Set(employees.map(getter).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

  return {
    departments: unique((e) => e.department),
    locations: unique((e) => e.location),
    employmentTypes: unique((e) => e.employmentType),
    genders: unique((e) => e.gender),
  };
}

export interface GroupBreakdown {
  label: string;
  total: number;
  active: number;
  left: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupBreakdown(
  employees: ScoredEmployee[],
  keyFn: (e: ScoredEmployee) => string,
  orderedKeys?: string[]
): GroupBreakdown[] {
  const map = new Map<string, { total: number; active: number; left: number; incomeSum: number }>();

  if (orderedKeys) {
    for (const key of orderedKeys) {
      map.set(key, { total: 0, active: 0, left: 0, incomeSum: 0 });
    }
  }

  for (const emp of employees) {
    const key = keyFn(emp);
    const cur = map.get(key) ?? { total: 0, active: 0, left: 0, incomeSum: 0 };
    cur.total += 1;
    if (emp.attrition === 'Yes') cur.left += 1;
    else cur.active += 1;
    cur.incomeSum += emp.monthlyIncomeGbp;
    map.set(key, cur);
  }

  const entries = Array.from(map.entries()).map(([label, s]) => ({
    label,
    total: s.total,
    active: s.active,
    left: s.left,
    attritionRate: s.total > 0 ? (s.left / s.total) * 100 : 0,
    avgIncome: s.total > 0 ? s.incomeSum / s.total : 0,
  }));

  if (!orderedKeys) {
    entries.sort((a, b) => b.total - a.total);
  }
  return entries;
}

export function getOverviewMetrics(employees: ScoredEmployee[]) {
  const headcount = employees.length;
  const activeEmployees = employees.filter((e) => e.attrition === 'No');
  const leftEmployees = employees.filter((e) => e.attrition === 'Yes');
  const attritionRate = headcount > 0 ? (leftEmployees.length / headcount) * 100 : 0;
  const avgIncome = mean(employees.map((e) => e.monthlyIncomeGbp));
  // Active monthly payroll represents current recurring monthly payroll spend;
  // if filtered specifically to Attrition = Yes, show the exited payroll footprint clearly
  const activeMonthlyPayroll = activeEmployees.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);
  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);

  return {
    headcount,
    activeCount: activeEmployees.length,
    leftCount: leftEmployees.length,
    attritionRate,
    avgIncome,
    activeMonthlyPayroll,
    totalMonthlyPayroll,
  };
}

export function getHiringTrend(employees: ScoredEmployee[]) {
  const yearMap = new Map<number, { hired: number; active: number; left: number }>();
  for (const emp of employees) {
    if (!emp.hireYear) continue;
    const cur = yearMap.get(emp.hireYear) ?? { hired: 0, active: 0, left: 0 };
    cur.hired += 1;
    if (emp.attrition === 'Yes') cur.left += 1;
    else cur.active += 1;
    yearMap.set(emp.hireYear, cur);
  }

  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, stats]) => ({
      year: String(year),
      ...stats,
    }));
}

export function getDeepDiveMetrics(employees: ScoredEmployee[]) {
  const headcount = employees.length;
  const active = employees.filter((e) => e.attrition === 'No');
  const avgTenure = mean(employees.map((e) => e.yearsAtCompany));
  const femaleCount = employees.filter((e) => e.gender.toLowerCase() === 'female').length;
  const femaleShare = headcount > 0 ? (femaleCount / headcount) * 100 : 0;
  const nonFullTimeCount = employees.filter((e) => e.employmentType !== 'Full-Time').length;
  const nonFullTimeShare = headcount > 0 ? (nonFullTimeCount / headcount) * 100 : 0;
  const avgYearsSincePromotion = mean(employees.map((e) => e.yearsSinceLastPromotion));
  const highRiskActive = active.filter((e) => e.flightRiskScore >= HIGH_RISK_THRESHOLD);

  return {
    avgTenure,
    femaleShare,
    femaleCount,
    nonFullTimeShare,
    nonFullTimeCount,
    avgYearsSincePromotion,
    highRiskCount: highRiskActive.length,
    activeCount: active.length,
    highRiskShareOfActive: active.length > 0 ? (highRiskActive.length / active.length) * 100 : 0,
  };
}

export function getAgeBandBreakdown(employees: ScoredEmployee[]) {
  const bands = ['< 25', '25–34', '35–44', '45–54', '55+'];
  return groupBreakdown(
    employees,
    (e) => {
      if (e.age < 25) return '< 25';
      if (e.age <= 34) return '25–34';
      if (e.age <= 44) return '35–44';
      if (e.age <= 54) return '45–54';
      return '55+';
    },
    bands
  );
}

export function getTenureBandBreakdown(employees: ScoredEmployee[]) {
  const bands = ['0–2 yrs', '3–5 yrs', '6–10 yrs', '11–15 yrs', '16+ yrs'];
  return groupBreakdown(
    employees,
    (e) => {
      if (e.yearsAtCompany <= 2) return '0–2 yrs';
      if (e.yearsAtCompany <= 5) return '3–5 yrs';
      if (e.yearsAtCompany <= 10) return '6–10 yrs';
      if (e.yearsAtCompany <= 15) return '11–15 yrs';
      return '16+ yrs';
    },
    bands
  );
}

export function getIncomeByLevelAndDept(employees: ScoredEmployee[]) {
  const levels = [1, 2, 3, 4, 5];
  const byLevel = levels.map((lvl) => {
    const subset = employees.filter((e) => e.jobLevel === lvl);
    return {
      label: `Level ${lvl}`,
      count: subset.length,
      avgIncome: mean(subset.map((e) => e.monthlyIncomeGbp)),
      medianIncome: median(subset.map((e) => e.monthlyIncomeGbp)),
    };
  });

  const deptMap = new Map<string, number[]>();
  for (const e of employees) {
    const arr = deptMap.get(e.department) ?? [];
    arr.push(e.monthlyIncomeGbp);
    deptMap.set(e.department, arr);
  }
  const byDepartment = Array.from(deptMap.entries())
    .map(([label, vals]) => ({
      label,
      count: vals.length,
      avgIncome: mean(vals),
      medianIncome: median(vals),
    }))
    .sort((a, b) => b.avgIncome - a.avgIncome);

  return { byLevel, byDepartment };
}

export function getTopFlightRiskWatchlist(
  filteredEmployees: ScoredEmployee[],
  limit = 10
): ScoredEmployee[] {
  return filteredEmployees
    .filter((e) => e.attrition === 'No')
    .sort((a, b) => {
      if (b.flightRiskScore !== a.flightRiskScore) {
        return b.flightRiskScore - a.flightRiskScore;
      }
      return b.yearsSinceLastPromotion - a.yearsSinceLastPromotion;
    })
    .slice(0, limit);
}

export function generateFindingsAndActions(
  filtered: ScoredEmployee[],
  baseline: ScoredEmployee[],
  filters: FilterState
): { findings: InsightFinding[]; actions: RecommendedAction[] } {
  if (filtered.length === 0) {
    return { findings: [], actions: [] };
  }

  const findings: InsightFinding[] = [];
  const actions: RecommendedAction[] = [];

  const filteredOverview = getOverviewMetrics(filtered);
  const baseOverview = getOverviewMetrics(baseline);
  const filteredDeep = getDeepDiveMetrics(filtered);
  const hasFilters = Object.values(filters).some((v) => v !== 'All');

  // 1. Workforce & Attrition Baseline vs Cohort
  const rateDelta = filteredOverview.attritionRate - baseOverview.attritionRate;
  findings.push({
    id: 'cohort-attrition',
    category: 'Workforce Retention',
    headline:
      hasFilters
        ? `Selected cohort attrition is ${filteredOverview.attritionRate.toFixed(1)}% (${rateDelta >= 0 ? '+' : ''}${rateDelta.toFixed(1)} pp vs UK baseline)`
        : `Overall Shell UK attrition stands at ${filteredOverview.attritionRate.toFixed(1)}% across ${filteredOverview.headcount} records`,
    metric: `${filteredOverview.leftCount} exits · ${filteredOverview.activeCount} active`,
    summary:
      filteredOverview.attritionRate >= 22
        ? `Turnover in this slice sits notably above the ${baseOverview.attritionRate.toFixed(1)}% company baseline and warrants targeted retention intervention.`
        : `Active monthly payroll in this cohort totals ${formatGBP(filteredOverview.activeMonthlyPayroll)} at ${formatGBP(filteredOverview.avgIncome)} average pay.`,
    severity:
      filteredOverview.attritionRate >= 25
        ? 'critical'
        : filteredOverview.attritionRate > baseOverview.attritionRate + 2
          ? 'warning'
          : 'neutral',
  });

  // 2. Employment Type Disparity
  const empTypes = groupBreakdown(filtered, (e) => e.employmentType).filter((g) => g.total >= 2);
  if (empTypes.length > 1) {
    const highestEmpType = [...empTypes].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    const fullTime = empTypes.find((g) => g.label === 'Full-Time');
    if (highestEmpType.attritionRate > 0) {
      findings.push({
        id: 'employment-type-risk',
        category: 'Contract Structure',
        headline: `${highestEmpType.label} staff exhibit ${highestEmpType.attritionRate.toFixed(1)}% attrition`,
        metric: `${highestEmpType.left} of ${highestEmpType.total} departed`,
        summary: fullTime
          ? `Compared to ${fullTime.attritionRate.toFixed(1)}% among Full-Time employees, ${highestEmpType.label} workers leave at ${(highestEmpType.attritionRate / Math.max(1, fullTime.attritionRate)).toFixed(1)}× the rate.`
          : `${highestEmpType.label} accounts for the highest contract-type turnover in the current filter view.`,
        severity: highestEmpType.attritionRate >= 30 ? 'critical' : 'warning',
      });

      if (highestEmpType.label !== 'Full-Time' && highestEmpType.attritionRate >= 25) {
        actions.push({
          id: 'action-emp-type',
          priority: 'Immediate',
          focusArea: 'Contract & Flexible Workforce',
          title: `Review retention & conversion pathways for ${highestEmpType.label} talent`,
          rationale: `${highestEmpType.label} attrition reached ${highestEmpType.attritionRate.toFixed(1)}% (${highestEmpType.left}/${highestEmpType.total}), driving disproportionate workforce churn.`,
          targetGroup: `${empTypes.find((e) => e.label === highestEmpType.label)?.active ?? 0} active ${highestEmpType.label} employees`,
          expectedImpact: 'Stabilise flexible talent pool & cut avoidable replacement hiring',
        });
      }
    }
  }

  // 3. Department / Location Hotspot
  const depts = groupBreakdown(filtered, (e) => e.department).filter((d) => d.total >= 3);
  const locs = groupBreakdown(filtered, (e) => e.location).filter((l) => l.total >= 3);

  if (depts.length > 1) {
    const topDept = [...depts].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    const lowDept = [...depts].sort((a, b) => a.attritionRate - b.attritionRate)[0];
    findings.push({
      id: 'dept-hotspot',
      category: 'Departmental Spread',
      headline: `${topDept.label} leads department attrition at ${topDept.attritionRate.toFixed(1)}%`,
      metric: `Low: ${lowDept.label} (${lowDept.attritionRate.toFixed(1)}%)`,
      summary: `A ${(topDept.attritionRate - lowDept.attritionRate).toFixed(1)} percentage-point spread separates the highest- and lowest-turnover functions in this view.`,
      severity: topDept.attritionRate >= 24 ? 'warning' : 'neutral',
    });

    if (topDept.attritionRate >= 20) {
      actions.push({
        id: 'action-dept-hotspot',
        priority: 'Immediate',
        focusArea: topDept.label,
        title: `Run targeted stay interviews in ${topDept.label}`,
        rationale: `${topDept.label} records ${topDept.attritionRate.toFixed(1)}% attrition (${topDept.left} departures out of ${topDept.total}), the highest departmental exit rate in the active view.`,
        targetGroup: `${topDept.active} active ${topDept.label} staff`,
        expectedImpact: 'Surface role-design, manager, or workload friction early',
      });
    }
  } else if (locs.length > 1) {
    const topLoc = [...locs].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    findings.push({
      id: 'loc-hotspot',
      category: 'UK Site Benchmark',
      headline: `${topLoc.label} reports the highest site attrition at ${topLoc.attritionRate.toFixed(1)}%`,
      metric: `${topLoc.left} exits of ${topLoc.total}`,
      summary: `Regional labour market pressure and commute profiles should be audited at ${topLoc.label}.`,
      severity: topLoc.attritionRate >= 22 ? 'warning' : 'neutral',
    });
  }

  // 4. Location Finding (when departments also existed)
  if (depts.length > 1 && locs.length > 1) {
    const topLoc = [...locs].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    const bestLoc = [...locs].sort((a, b) => a.attritionRate - b.attritionRate)[0];
    findings.push({
      id: 'uk-site-variance',
      category: 'Site Comparison',
      headline: `${topLoc.label} (${topLoc.attritionRate.toFixed(1)}%) vs ${bestLoc.label} (${bestLoc.attritionRate.toFixed(1)}%)`,
      metric: `${locs.length} UK locations analysed`,
      summary: `Site-level turnover varies substantially across UK hubs, led by ${topLoc.label} with ${topLoc.left} of ${topLoc.total} records exiting.`,
      severity: topLoc.attritionRate >= 23 ? 'warning' : 'neutral',
    });

    if (topLoc.attritionRate >= 20) {
      actions.push({
        id: 'action-site',
        priority: 'Near-Term',
        focusArea: `${topLoc.label} Hub`,
        title: `Audit hybrid flexibility & commute support at ${topLoc.label}`,
        rationale: `${topLoc.label} leads site attrition at ${topLoc.attritionRate.toFixed(1)}% compared with ${bestLoc.label} at ${bestLoc.attritionRate.toFixed(1)}%.`,
        targetGroup: `${topLoc.active} active employees based in ${topLoc.label}`,
        expectedImpact: 'Reduce site-specific regrettable exits by addressing local commute/market factors',
      });
    }
  }

  // 5. Compensation & Promotion Bottleneck
  const activeBelowMedian = filtered.filter(
    (e) => e.attrition === 'No' && e.monthlyIncomeGbp < e.levelMedianIncome * 0.9
  );
  const stalledPromotionActive = filtered.filter(
    (e) => e.attrition === 'No' && e.yearsSinceLastPromotion >= 5
  );
  const leaversAvgPay = mean(
    filtered.filter((e) => e.attrition === 'Yes').map((e) => e.monthlyIncomeGbp)
  );
  const activeAvgPay = mean(
    filtered.filter((e) => e.attrition === 'No').map((e) => e.monthlyIncomeGbp)
  );

  if (filteredDeep.activeCount > 0) {
    findings.push({
      id: 'comp-promo-signal',
      category: 'Pay & Progression',
      headline: `${activeBelowMedian.length} active staff sit ≥10% below Job-Level median pay`,
      metric: `${stalledPromotionActive.length} active ≥5 yrs since promotion`,
      summary:
        leaversAvgPay > 0 && activeAvgPay > 0
          ? `Departed staff averaged ${formatGBP(leaversAvgPay)}/mo vs ${formatGBP(activeAvgPay)}/mo for active peers (${formatGBP(activeAvgPay - leaversAvgPay)} gap).`
          : `Average time since promotion in this view is ${filteredDeep.avgYearsSincePromotion.toFixed(1)} years.`,
      severity: activeBelowMedian.length >= 10 || stalledPromotionActive.length >= 25 ? 'warning' : 'neutral',
    });
  }

  if (activeBelowMedian.length > 0) {
    actions.push({
      id: 'action-pay-equity',
      priority: 'Near-Term',
      focusArea: 'Compensation Benchmarking',
      title: `Prioritise mid-cycle pay calibration for ${activeBelowMedian.length} under-median active employees`,
      rationale: `${activeBelowMedian.length} active employees earn at least 10% below their Shell UK Job-Level median, creating avoidable poaching vulnerability.`,
      targetGroup: `Active staff ≥10% below L1–L5 median`,
      expectedImpact: 'Close internal pay compression before annual review cycle',
    });
  }

  if (stalledPromotionActive.length > 0) {
    actions.push({
      id: 'action-career-mobility',
      priority: 'Sustained',
      focusArea: 'Internal Mobility',
      title: `Launch career-path & promotion readiness reviews (${stalledPromotionActive.length} overdue)`,
      rationale: `${stalledPromotionActive.length} active employees in this view have waited 5+ years since their last promotion (overall cohort avg: ${filteredDeep.avgYearsSincePromotion.toFixed(1)} yrs).`,
      targetGroup: `Active employees with ≥5 yrs since last promotion`,
      expectedImpact: 'Unlock lateral moves, stretch assignments, and grade progression',
    });
  }

  // 6. High Flight-Risk Active Cohort Summary
  if (filteredDeep.activeCount > 0) {
    findings.push({
      id: 'flight-risk-concentration',
      category: 'Retention Watchlist',
      headline: `${filteredDeep.highRiskCount} active employees (${filteredDeep.highRiskShareOfActive.toFixed(1)}%) score High Flight Risk (≥${HIGH_RISK_THRESHOLD}/100)`,
      metric: `Female share: ${filteredDeep.femaleShare.toFixed(1)}% · Avg tenure: ${filteredDeep.avgTenure.toFixed(1)} yrs`,
      summary: `Concentrated across overlapping employment-type, pay-gap, promotion-lag, and travel-strain signals.`,
      severity: filteredDeep.highRiskShareOfActive >= 18 ? 'critical' : filteredDeep.highRiskCount > 0 ? 'warning' : 'positive',
    });
  }

  // Ensure at least 3 concrete recommended actions even on small filtered subsets
  if (actions.length < 3 && filteredDeep.highRiskCount > 0) {
    actions.push({
      id: 'action-watchlist-1on1',
      priority: 'Immediate',
      focusArea: 'Manager Action',
      title: `Schedule HRBP & line-manager check-ins for Top-10 watchlist`,
      rationale: `${filteredDeep.highRiskCount} active employees currently score ≥${HIGH_RISK_THRESHOLD} on the multi-factor flight-risk rubric.`,
      targetGroup: `Top-10 highest-scoring active employees`,
      expectedImpact: 'Proactive retention plans prior to resignation notice',
    });
  }

  return {
    findings: findings.slice(0, 6),
    actions: actions.slice(0, 4),
  };
}
