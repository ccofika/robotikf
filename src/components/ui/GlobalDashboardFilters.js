import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  ChevronDownIcon,
  CheckIcon,
  CloseIcon,
  FilterIcon,
  RefreshIcon,
  MapPinIcon,
  ChartIcon,
  TrendingUpIcon,
  BarChartIcon,
  HardHatIcon,
  SettingsIcon,
  UsersIcon,
  AlertTriangleIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';
import AdvancedFilterDropdown from './AdvancedFilterDropdown';

const GlobalDashboardFilters = ({
  filters,
  loading,
  error,
  filterSummary,
  filterOptions = { technicians: [], municipalities: [], actions: [] },
  onUpdateFilter,
  onUpdateFilters,
  onUpdateMunicipalities,
  onToggleRegion,
  onApplyFilters,
  onResetFilters,
  onToggleComparison,
  onToggleTrends,
  DATE_PRESETS = [],
  SERBIA_REGIONS = {},
  SERVICE_TYPES = [],
  ACTION_TYPES = [],
  STATUS_TYPES = [],
  PRIORITY_LEVELS = [],
  WORK_ORDER_TYPES = [],
  ISSUE_CATEGORIES = [],
  className = ''
}) => {
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [showMunicipalityDropdown, setShowMunicipalityDropdown] = useState(false);
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const datePresetsRef = useRef(null);
  const municipalityDropdownRef = useRef(null);
  const serviceTypeDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePresetsRef.current && !datePresetsRef.current.contains(event.target)) {
        setShowDatePresets(false);
      }
      if (municipalityDropdownRef.current && !municipalityDropdownRef.current.contains(event.target)) {
        setShowMunicipalityDropdown(false);
      }
      if (serviceTypeDropdownRef.current && !serviceTypeDropdownRef.current.contains(event.target)) {
        setShowServiceTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleMunicipalityToggle = (municipality) => {
    const currentMunicipalities = filters.municipalities || [];
    const isSelected = currentMunicipalities.includes(municipality);

    if (isSelected) {
      onUpdateMunicipalities(currentMunicipalities.filter(m => m !== municipality));
    } else {
      onUpdateMunicipalities([...currentMunicipalities, municipality]);
    }
  };

  const getMunicipalityDisplayText = () => {
    const effectiveMunicipalities = filterSummary.municipalities || [];

    if (effectiveMunicipalities.length === 0) {
      return 'Sve opštine';
    } else if (effectiveMunicipalities.length === 1) {
      return effectiveMunicipalities[0];
    } else if (effectiveMunicipalities.length <= 3) {
      return effectiveMunicipalities.join(', ');
    } else {
      return `${effectiveMunicipalities.length} opština`;
    }
  };

  const getServiceTypeLabel = () => {
    const selectedService = SERVICE_TYPES.find(s => s.value === filters.serviceType);
    return selectedService?.label || 'Sve usluge';
  };

  return (
    <div className={cn(
      "bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl relative",
      className
    )}>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Primary Filters Row */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">

            {/* Date Filter with Presets */}
            <div className="relative" ref={datePresetsRef}>
              <Button
                type={filters.isCustomDateMode ? "primary" : "secondary"}
                size="medium"
                onClick={() => setShowDatePresets(!showDatePresets)}
                prefix={<CalendarIcon size={16} />}
                suffix={<ChevronDownIcon size={16} />}
              >
                {filterSummary.dateRange.label}
                {filters.comparisonPeriod && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    +Poređenje
                  </span>
                )}
              </Button>

              {showDatePresets && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                  <div className="p-3 border-b border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Vremenski period</h4>
                    <div className="space-y-1">
                      {DATE_PRESETS.map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => {
                            onUpdateFilter('dateMode', preset.key);
                            setShowDatePresets(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150",
                            filters.dateMode === preset.key
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>{preset.label}</span>
                            {filters.dateMode === preset.key && (
                              <CheckIcon size={16} className="text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {filters.isCustomDateMode && (
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">OD DATUMA</label>
                            <input
                              type="date"
                              value={formatDate(filters.startDate)}
                              onChange={(e) => onUpdateFilter('startDate', new Date(e.target.value))}
                              className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">DO DATUMA</label>
                            <input
                              type="date"
                              value={formatDate(filters.endDate)}
                              onChange={(e) => onUpdateFilter('endDate', new Date(e.target.value))}
                              className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                          Poređenje sa prethodnim periodom
                        </label>
                        <button
                          onClick={onToggleComparison}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors duration-200 ease-in-out",
                            filters.comparisonPeriod ? "bg-green-600" : "bg-slate-200"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out",
                              filters.comparisonPeriod ? "translate-x-5" : "translate-x-0.5"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Technician Filter */}
            <select
              value={filters.technician}
              onChange={(e) => onUpdateFilter('technician', e.target.value)}
              className="h-10 px-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
            >
              <option value="all">Svi tehničari</option>
              {filterOptions.technicians.map(tech => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>

            {/* Municipality Filter with Regions */}
            <div className="relative" ref={municipalityDropdownRef}>
              <Button
                type="secondary"
                size="medium"
                onClick={() => setShowMunicipalityDropdown(!showMunicipalityDropdown)}
                prefix={<MapPinIcon size={16} />}
                suffix={<ChevronDownIcon size={16} />}
              >
                {getMunicipalityDisplayText()}
                {filterSummary.municipalityCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    {filterSummary.municipalityCount}
                  </span>
                )}
              </Button>

              {showMunicipalityDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] max-h-96 overflow-y-auto">
                  {/* Regions Section */}
                  <div className="p-3 border-b border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Regioni</h4>
                    <div className="space-y-1">
                      {Object.entries(SERBIA_REGIONS).map(([key, region]) => (
                        <label key={key} className="flex items-center space-x-2 cursor-pointer group p-1 rounded hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={filters.selectedRegions.includes(key)}
                            onChange={() => onToggleRegion(key)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            {region.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({region.municipalities.length})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Individual Municipalities */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Opštine</h4>
                      {filterSummary.municipalities.length > 0 && (
                        <button
                          onClick={() => onUpdateMunicipalities([])}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Očisti sve
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filterOptions.municipalities.map(municipality => (
                        <label key={municipality} className="flex items-center space-x-2 cursor-pointer group p-1 rounded hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={filterSummary.municipalities.includes(municipality)}
                            onChange={() => handleMunicipalityToggle(municipality)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            {municipality}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Type Filter */}
            <div className="relative" ref={serviceTypeDropdownRef}>
              <Button
                type="secondary"
                size="medium"
                onClick={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}
                prefix={<SettingsIcon size={16} />}
                suffix={<ChevronDownIcon size={16} />}
              >
                {getServiceTypeLabel()}
              </Button>

              {showServiceTypeDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                  <div className="p-2">
                    {SERVICE_TYPES.map((serviceType) => (
                      <button
                        key={serviceType.value}
                        onClick={() => {
                          onUpdateFilter('serviceType', serviceType.value);
                          setShowServiceTypeDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          filters.serviceType === serviceType.value
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{serviceType.label}</span>
                          {filters.serviceType === serviceType.value && (
                            <CheckIcon size={16} className="text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Type Filter */}
            <select
              value={filters.actionType}
              onChange={(e) => onUpdateFilter('actionType', e.target.value)}
              className="h-10 px-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
            >
              {ACTION_TYPES.map(action => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Advanced Filters Toggle */}
            <Button
              type={showAdvancedFilters ? "primary" : "secondary"}
              size="medium"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              prefix={<BarChartIcon size={16} />}
            >
              Napredni filteri
            </Button>

            {/* Filter Status Indicator */}
            {filterSummary.hasActiveFilters && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FilterIcon size={14} className="text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Aktivni filteri</span>
              </div>
            )}

            {/* Refresh Button */}
            <Button
              type="primary"
              size="medium"
              prefix={<RefreshIcon size={16} />}
              onClick={onApplyFilters}
              disabled={loading}
            >
              {loading ? 'Osvežava...' : 'Osvježi'}
            </Button>

            {/* Reset Button */}
            <Button
              type="secondary"
              size="medium"
              prefix={<CloseIcon size={16} />}
              onClick={onResetFilters}
              disabled={loading}
            >
              Resetuj
            </Button>
          </div>
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-slate-900 flex items-center">
                <FilterIcon size={18} className="mr-2 text-blue-600" />
                Napredni filteri
              </h4>

              {/* Single-select filters row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdvancedFilterDropdown
                  label="Status"
                  value={filters.status}
                  options={STATUS_TYPES}
                  icon={CheckIcon}
                  onChange={(value) => onUpdateFilter('status', value)}
                />

                <AdvancedFilterDropdown
                  label="Prioritet"
                  value={filters.priority}
                  options={PRIORITY_LEVELS}
                  icon={AlertTriangleIcon}
                  onChange={(value) => onUpdateFilter('priority', value)}
                />

                <AdvancedFilterDropdown
                  label="Tip naloga"
                  value={filters.workOrderType}
                  options={WORK_ORDER_TYPES}
                  icon={UsersIcon}
                  onChange={(value) => onUpdateFilter('workOrderType', value)}
                />

                <AdvancedFilterDropdown
                  label="Kategorija problema"
                  value={filters.issueCategory}
                  options={ISSUE_CATEGORIES}
                  icon={FilterIcon}
                  searchable={true}
                  onChange={(value) => onUpdateFilter('issueCategory', value)}
                />
              </div>

              {/* Multi-select filters row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AdvancedFilterDropdown
                  label="Tipovi usluga"
                  value={filters.selectedServiceTypes}
                  options={SERVICE_TYPES.filter(s => s.value !== 'all')}
                  multiSelect={true}
                  searchable={true}
                  icon={SettingsIcon}
                  placeholder="Izaberite tipove usluga"
                  onChange={(value) => onUpdateFilter('selectedServiceTypes', value)}
                />

                <AdvancedFilterDropdown
                  label="Tipovi akcija"
                  value={filters.selectedActionTypes}
                  options={ACTION_TYPES.filter(a => a.value !== 'all')}
                  multiSelect={true}
                  searchable={true}
                  icon={BarChartIcon}
                  placeholder="Izaberite tipove akcija"
                  onChange={(value) => onUpdateFilter('selectedActionTypes', value)}
                />

                <AdvancedFilterDropdown
                  label="Statusi (multi)"
                  value={filters.selectedStatuses}
                  options={STATUS_TYPES.filter(s => s.value !== 'all')}
                  multiSelect={true}
                  icon={CheckIcon}
                  placeholder="Izaberite statuse"
                  onChange={(value) => onUpdateFilter('selectedStatuses', value)}
                />
              </div>

              {/* Display options */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showTrends}
                      onChange={onToggleTrends}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Prikaži trendove</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.comparisonPeriod}
                      onChange={onToggleComparison}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Poređenje sa prethodnim periodom</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <FilterIcon size={14} />
                  <span>
                    {[
                      filters.selectedServiceTypes.length,
                      filters.selectedActionTypes.length,
                      filters.selectedStatuses.length
                    ].reduce((sum, count) => sum + count, 0)} naprednih filtera aktivno
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              <CloseIcon size={14} className="text-red-500" />
              <span>Greška: {error}</span>
              <button
                onClick={onApplyFilters}
                className="ml-auto text-xs text-red-700 hover:text-red-800 font-medium underline"
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
        )}

        {/* Filter Summary Row */}
        {(filterSummary.hasActiveFilters || filterSummary.dateRange.startDate) && !error && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4 text-sm text-slate-600 flex-wrap">
                <div className="flex items-center space-x-2">
                  <CalendarIcon size={14} />
                  <span>{filterSummary.dateRange.label}</span>
                  {filterSummary.comparisonEnabled && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      vs prethodni period
                    </span>
                  )}
                </div>

                {filters.technician !== 'all' && (
                  <div className="flex items-center space-x-2">
                    <HardHatIcon size={14} />
                    <span>{filters.technician}</span>
                  </div>
                )}

                {filterSummary.municipalityCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <MapPinIcon size={14} />
                    <span>{filterSummary.municipalityCount} opština</span>
                  </div>
                )}

                {filters.serviceType !== 'all' && (
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={14} />
                    <span>{getServiceTypeLabel()}</span>
                  </div>
                )}

                {filters.actionType !== 'all' && (
                  <div className="flex items-center space-x-2">
                    <FilterIcon size={14} />
                    <span>{ACTION_TYPES.find(a => a.value === filters.actionType)?.label}</span>
                  </div>
                )}
              </div>

              {loading && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Osvežava podatke...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalDashboardFilters;