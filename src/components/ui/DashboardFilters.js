import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  ChevronDownIcon,
  CheckIcon,
  CloseIcon,
  FilterIcon,
  RefreshIcon,
  MapPinIcon,
  ChartIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

const DashboardFilters = ({
  filters,
  loading,
  error,
  filterSummary,
  filterOptions = { technicians: [], municipalities: [], actions: [] },
  onUpdateFilter,
  onUpdateMunicipalities,
  onToggleRegion,
  onApplyFilters,
  onResetFilters,
  onTriggerInitialLoad,
  DATE_PRESETS = [],
  SERBIA_REGIONS = {},
  className = ''
}) => {
  const [showMunicipalityDropdown, setShowMunicipalityDropdown] = useState(false);
  const [showDatePresets, setShowDatePresets] = useState(false);

  const municipalityDropdownRef = useRef(null);
  const datePresetsRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (municipalityDropdownRef.current && !municipalityDropdownRef.current.contains(event.target)) {
        setShowMunicipalityDropdown(false);
      }
      if (datePresetsRef.current && !datePresetsRef.current.contains(event.target)) {
        setShowDatePresets(false);
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

  const hasData = filterSummary?.dateRange?.startDate || filterSummary?.dateRange?.endDate || loading;

  return (
    <div className={cn("bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg relative", className)}>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-4 flex-1 min-w-0 relative">

            {/* Date Filter with Presets */}
            <div className="relative" ref={datePresetsRef}>
              <Button
                type={filters.isCustomDateMode ? "primary" : "secondary"}
                size="small"
                onClick={() => setShowDatePresets(!showDatePresets)}
                prefix={<CalendarIcon size={16} />}
                suffix={<ChevronDownIcon size={16} />}
              >
                {filterSummary.dateRange.label}
              </Button>

              {showDatePresets && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] p-2">
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
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-600">OD DATUMA</label>
                        <input
                          type="date"
                          value={formatDate(filters.startDate)}
                          onChange={(e) => onUpdateFilter('startDate', new Date(e.target.value))}
                          className="w-full h-8 px-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <label className="block text-xs font-medium text-slate-600 mt-3">DO DATUMA</label>
                        <input
                          type="date"
                          value={formatDate(filters.endDate)}
                          onChange={(e) => onUpdateFilter('endDate', new Date(e.target.value))}
                          className="w-full h-8 px-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Technician Filter */}
            <select
              value={filters.technician}
              onChange={(e) => onUpdateFilter('technician', e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
            >
              <option value="all">Svi tehnićari</option>
              {filterOptions.technicians.map(tech => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>

            {/* Municipality Filter with Regions */}
            <div className="relative" ref={municipalityDropdownRef}>
              <Button
                type="secondary"
                size="small"
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
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] max-h-96 overflow-y-auto">
                  {/* Regions Section */}
                  <div className="p-3 border-b border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Regioni</h4>
                    <div className="space-y-1">
                      {Object.entries(SERBIA_REGIONS).map(([key, region]) => (
                        <label key={key} className="flex items-center space-x-2 cursor-pointer group">
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

                  {/* Individual Municipalities Section */}
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

            {/* Action Filter */}
            <select
              value={filters.action}
              onChange={(e) => onUpdateFilter('action', e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
            >
              <option value="all">Sve akcije</option>
              {filterOptions.actions.map(action => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            {/* Filter Status Indicator */}
            {filterSummary.hasActiveFilters && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                <FilterIcon size={14} className="text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Aktivni filteri</span>
              </div>
            )}

            {/* Initial Load or Refresh Button */}
            {!hasData ? (
              <Button
                type="primary"
                size="medium"
                prefix={<ChartIcon size={16} />}
                onClick={onTriggerInitialLoad}
                disabled={loading}
              >
                {loading ? 'Učitava...' : 'Prikaži podatke'}
              </Button>
            ) : (
              <Button
                type="secondary"
                size="medium"
                prefix={<RefreshIcon size={16} />}
                onClick={onApplyFilters}
                disabled={loading}
              >
                {loading ? 'Osvežava...' : 'Osvježi'}
              </Button>
            )}

            {/* Reset Button */}
            <Button
              type="primary"
              size="medium"
              prefix={<CloseIcon size={16} />}
              onClick={onResetFilters}
              disabled={loading}
            >
              Resetuj filtere
            </Button>
          </div>
        </div>

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
        {(filterSummary.hasActiveFilters || hasData) && !error && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <CalendarIcon size={14} />
                  <span>{filterSummary.dateRange.label}</span>
                </div>

                {filters.technician !== 'all' && (
                  <div className="flex items-center space-x-2">
                    <span>Tehničar:</span>
                    <span className="font-medium text-slate-900">{filters.technician}</span>
                  </div>
                )}

                {filterSummary.municipalityCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <MapPinIcon size={14} />
                    <span>{filterSummary.municipalityCount} opština</span>
                  </div>
                )}

                {filters.action !== 'all' && (
                  <div className="flex items-center space-x-2">
                    <FilterIcon size={14} />
                    <span>Akcija: {filterOptions.actions.find(a => a.value === filters.action)?.label || filters.action}</span>
                  </div>
                )}
              </div>

              {loading && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Osvežava...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFilters;