import { RotateCcw } from 'lucide-react';
import type { FilterState } from '../types/employee';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  filteredCount: number;
  totalCount: number;
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  options,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  const hasActiveFilter = Object.values(filters).some((v) => v !== 'All');

  const updateField = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const selectClass =
    'w-full h-10 px-3 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1A1A1F] text-[#111113] dark:text-[#F4F4F5] focus:outline-none focus:border-[#F58220] dark:focus:border-[#FFC800] transition-colors cursor-pointer';

  const labelClass =
    'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';

  return (
    <section
      aria-label="Workforce Filters"
      className="bg-white dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-[#111113] dark:text-[#F4F4F5] text-sm">
            Workforce Filters
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            Showing <strong className="text-[#111113] dark:text-white">{filteredCount}</strong> of{' '}
            {totalCount} employees
          </span>
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-[#111113] dark:text-[#FFC800] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label htmlFor="filter-department" className={labelClass}>
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department}
            onChange={(e) => updateField('department', e.target.value)}
            className={selectClass}
          >
            <option value="All">All Departments</option>
            {options.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-location" className={labelClass}>
            Location
          </label>
          <select
            id="filter-location"
            value={filters.location}
            onChange={(e) => updateField('location', e.target.value)}
            className={selectClass}
          >
            <option value="All">All UK Locations</option>
            {options.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-employment-type" className={labelClass}>
            Employment Type
          </label>
          <select
            id="filter-employment-type"
            value={filters.employmentType}
            onChange={(e) => updateField('employmentType', e.target.value)}
            className={selectClass}
          >
            <option value="All">All Types</option>
            {options.employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className={selectClass}
          >
            <option value="All">All Genders</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-attrition" className={labelClass}>
            Attrition Status
          </label>
          <select
            id="filter-attrition"
            value={filters.attrition}
            onChange={(e) => updateField('attrition', e.target.value)}
            className={selectClass}
          >
            <option value="All">All (Active &amp; Left)</option>
            <option value="No">Active Only (No)</option>
            <option value="Yes">Departed Only (Yes)</option>
          </select>
        </div>
      </div>
    </section>
  );
}
