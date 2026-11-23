import type { Employee } from '../types/employee';

export const SHEET_ID = '1zC1EaPaah0_APFu5W0RpZSw27gCfLLrvkuZY0GJCBYM';
export const SHEET_GID = '766970740';
export const GOOGLE_SHEET_GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'MonthlyIncome_GBP',
  'Attrition',
] as const;

/**
 * RFC-4180 compliant CSV parser handling quoted fields, escaped quotes,
 * embedded commas, and LF / CRLF / CR line endings.
 */
export function parseCsvRows(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && cleanText[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function toNumber(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/[£$,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function parseHireYear(dateStr: string): number | null {
  if (!dateStr) return null;
  const isoMatch = dateStr.match(/^(\d{4})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    return year >= 1970 && year <= 2035 ? year : null;
  }
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }
  return null;
}

export function parseEmployeeCsv(csvText: string): Employee[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV file or sheet response is empty.');
  }

  // Detect HTML responses (for example, Google login page when a sheet is private)
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<title>Sign in')
  ) {
    throw new Error(
      'Google Sheets returned a sign-in page instead of CSV data. Set the sheet sharing permission to "Anyone with the link can view", or use Upload CSV.'
    );
  }

  const matrix = parseCsvRows(trimmed);
  if (matrix.length < 2) {
    throw new Error(
      'No employee records found. Expected a header row followed by at least one data row.'
    );
  }

  const headers = matrix[0].map((h) => h.trim());
  const headerIndex = new Map<string, number>();
  headers.forEach((header, idx) => {
    headerIndex.set(header.toLowerCase(), idx);
  });

  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headerIndex.has(col.toLowerCase())
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV schema mismatch. Missing expected column(s): ${missingColumns.join(', ')}.`
    );
  }

  const getCell = (row: string[], colName: string): string => {
    const idx = headerIndex.get(colName.toLowerCase());
    if (idx === undefined) return '';
    return (row[idx] ?? '').trim();
  };

  const employees: Employee[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    const employeeId = getCell(row, 'EmployeeID');
    if (!employeeId) continue;

    const firstName = getCell(row, 'FirstName');
    const lastName = getCell(row, 'LastName');
    const hireDate = getCell(row, 'HireDate');
    const rawAttrition = getCell(row, 'Attrition').toLowerCase();
    const attrition: 'Yes' | 'No' =
      rawAttrition === 'yes' || rawAttrition === 'true' || rawAttrition === '1'
        ? 'Yes'
        : 'No';

    employees.push({
      employeeId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || employeeId,
      gender: getCell(row, 'Gender') || 'Unspecified',
      age: toNumber(getCell(row, 'Age'), 0),
      maritalStatus: getCell(row, 'MaritalStatus') || 'Unspecified',
      department: getCell(row, 'Department') || 'Unassigned',
      jobTitle: getCell(row, 'JobTitle') || 'Unspecified',
      jobLevel: Math.max(1, Math.round(toNumber(getCell(row, 'JobLevel'), 1))),
      employmentType: getCell(row, 'EmploymentType') || 'Full-Time',
      location: getCell(row, 'Location') || 'Unspecified',
      hireDate,
      hireYear: parseHireYear(hireDate),
      yearsAtCompany: toNumber(getCell(row, 'YearsAtCompany'), 0),
      yearsInCurrentRole: toNumber(getCell(row, 'YearsInCurrentRole'), 0),
      yearsSinceLastPromotion: toNumber(getCell(row, 'YearsSinceLastPromotion'), 0),
      yearsWithCurrManager: toNumber(getCell(row, 'YearsWithCurrManager'), 0),
      education: getCell(row, 'Education') || 'Unspecified',
      distanceFromHomeKm: toNumber(getCell(row, 'DistanceFromHome_km'), 0),
      businessTravel: getCell(row, 'BusinessTravel') || 'Non-Travel',
      monthlyIncomeGbp: toNumber(getCell(row, 'MonthlyIncome_GBP'), 0),
      attrition,
    });
  }

  if (employees.length === 0) {
    throw new Error('The CSV header matched, but zero valid employee rows were parsed.');
  }

  return employees;
}

export async function fetchGoogleSheetEmployees(
  signal?: AbortSignal
): Promise<Employee[]> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_SHEET_GVIZ_CSV_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      'Unable to connect to Google Sheets (network or CORS error). Check your internet connection or use Upload CSV to load a local export.'
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Google Sheets denied access (HTTP ${response.status}). Ensure the sheet is shared publicly ("Anyone with the link can view") or use Upload CSV.`
      );
    }
    if (response.status === 404) {
      throw new Error(
        'Google Sheet or tab gid=766970740 was not found (HTTP 404). Verify the sheet ID and tab GID, or upload a CSV file.'
      );
    }
    throw new Error(
      `Google Sheets request failed with HTTP ${response.status}. Try syncing again or upload a CSV export.`
    );
  }

  const csvText = await response.text();
  return parseEmployeeCsv(csvText);
}
