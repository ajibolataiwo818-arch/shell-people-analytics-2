export type TabId = 'overview' | 'deep-dive' | 'insights';

export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  maritalStatus: string;
  department: string;
  jobTitle: string;
  jobLevel: number;
  employmentType: string;
  location: string;
  hireDate: string;
  hireYear: number | null;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsSinceLastPromotion: number;
  yearsWithCurrManager: number;
  education: string;
  distanceFromHomeKm: number;
  businessTravel: string;
  monthlyIncomeGbp: number;
  attrition: 'Yes' | 'No';
}

export interface RiskFactor {
  label: string;
  detail: string;
  points: number;
}

export type RiskTier = 'High' | 'Moderate' | 'Low';

export interface ScoredEmployee extends Employee {
  flightRiskScore: number;
  riskTier: RiskTier;
  riskFactors: RiskFactor[];
  levelMedianIncome: number;
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: string;
}

export interface DataSourceMeta {
  sourceType: 'google-sheets' | 'csv-upload';
  label: string;
  syncedAt: string;
  totalRecords: number;
}

export interface InsightFinding {
  id: string;
  category: string;
  headline: string;
  metric: string;
  summary: string;
  severity: 'critical' | 'warning' | 'neutral' | 'positive';
}

export interface RecommendedAction {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Sustained';
  focusArea: string;
  title: string;
  rationale: string;
  targetGroup: string;
  expectedImpact: string;
}
