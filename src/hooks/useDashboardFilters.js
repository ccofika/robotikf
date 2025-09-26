import { useState, useCallback, useMemo } from 'react';

// Serbia regions for municipality grouping
const SERBIA_REGIONS = {
  'Beograd': {
    name: 'Beograd',
    municipalities: ['Novi Beograd', 'Zemun', 'Zvezdara', 'Vračar', 'Stari Grad', 'Savski Venac', 'Palilula', 'Čukarica', 'Rakovica', 'Voždovac']
  },
  'Vojvodina': {
    name: 'Vojvodina',
    municipalities: ['Novi Sad', 'Pančevo', 'Zrenjanin', 'Subotica', 'Kikinda', 'Sombor', 'Vršac', 'Sremska Mitrovica']
  },
  'Šumadija i zapadna Srbija': {
    name: 'Šumadija i zapadna Srbija',
    municipalities: ['Kragujevac', 'Čačak', 'Užice', 'Kraljevo', 'Smederevo', 'Valjevo', 'Jagodina', 'Svetozarevo']
  },
  'Južna i istočna Srbija': {
    name: 'Južna i istočna Srbija',
    municipalities: ['Niš', 'Leskovac', 'Zaječar', 'Pirot', 'Vranje', 'Bor', 'Negotin', 'Knjaževac']
  }
};

// Date presets
const DATE_PRESETS = [
  {
    key: '24h',
    label: 'Poslednja 24 sata',
    getValue: () => {
      const end = new Date();
      const start = new Date(end - 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end };
    }
  },
  {
    key: '7d',
    label: 'Poslednja 7 dana',
    getValue: () => {
      const end = new Date();
      const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end };
    }
  },
  {
    key: '30d',
    label: 'Posledjih 30 dana',
    getValue: () => {
      const end = new Date();
      const start = new Date(end - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end };
    }
  },
  {
    key: 'quarter',
    label: 'Ovaj kvartal',
    getValue: () => {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
  },
  {
    key: 'custom',
    label: 'Prilagođeni period',
    getValue: () => ({ startDate: null, endDate: null })
  }
];

// Initial state
const getInitialState = () => ({
  dateMode: '7d',
  startDate: null,
  endDate: null,
  technician: 'all',
  municipalities: [],
  selectedRegions: [],
  action: 'all',
  isCustomDateMode: false
});

export const useDashboardFilters = (onFiltersChange) => {
  const [filters, setFilters] = useState(getInitialState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculate effective date range
  const effectiveDateRange = useMemo(() => {
    if (filters.dateMode === 'custom') {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
    }

    const preset = DATE_PRESETS.find(p => p.key === filters.dateMode);
    return preset ? preset.getValue() : DATE_PRESETS[1].getValue(); // Default to 7d
  }, [filters.dateMode, filters.startDate, filters.endDate]);

  // Calculate effective municipalities
  const effectiveMunicipalities = useMemo(() => {
    const fromRegions = filters.selectedRegions.reduce((acc, regionKey) => {
      const region = SERBIA_REGIONS[regionKey];
      if (region) {
        acc.push(...region.municipalities);
      }
      return acc;
    }, []);

    return [...new Set([...filters.municipalities, ...fromRegions])];
  }, [filters.municipalities, filters.selectedRegions]);

  // Get filter summary
  const filterSummary = useMemo(() => {
    const preset = DATE_PRESETS.find(p => p.key === filters.dateMode);

    return {
      dateRange: {
        mode: filters.dateMode,
        label: preset?.label || 'Prilagođeni period',
        startDate: effectiveDateRange.startDate,
        endDate: effectiveDateRange.endDate
      },
      technician: filters.technician,
      municipalities: effectiveMunicipalities,
      municipalityCount: effectiveMunicipalities.length,
      regions: filters.selectedRegions,
      action: filters.action,
      hasActiveFilters: filters.technician !== 'all' ||
                      effectiveMunicipalities.length > 0 ||
                      filters.action !== 'all'
    };
  }, [filters, effectiveDateRange, effectiveMunicipalities]);

  // Apply filters
  const applyFilters = useCallback(async () => {
    if (!onFiltersChange) return;

    setLoading(true);
    setError(null);

    try {
      const filterData = {
        ...filters,
        ...effectiveDateRange,
        municipalities: effectiveMunicipalities
      };

      await onFiltersChange(filterData);
    } catch (err) {
      console.error('Error applying filters:', err);
      setError(err.message || 'Greška pri primeni filtera');
    } finally {
      setLoading(false);
    }
  }, [filters, effectiveDateRange, effectiveMunicipalities, onFiltersChange]);

  // Update single filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };

      // Handle date mode changes
      if (key === 'dateMode') {
        if (value === 'custom') {
          newFilters.isCustomDateMode = true;
        } else {
          newFilters.isCustomDateMode = false;
          const dateRange = DATE_PRESETS.find(p => p.key === value)?.getValue();
          if (dateRange) {
            newFilters.startDate = dateRange.startDate;
            newFilters.endDate = dateRange.endDate;
          }
        }
      }

      return newFilters;
    });

    // Auto-apply filters after short delay
    setTimeout(() => {
      applyFilters();
    }, 100);
  }, [applyFilters]);

  // Update municipalities
  const updateMunicipalities = useCallback((municipalities) => {
    setFilters(prev => ({ ...prev, municipalities }));
    setTimeout(() => applyFilters(), 200);
  }, [applyFilters]);

  // Toggle region
  const toggleRegion = useCallback((regionKey) => {
    setFilters(prev => ({
      ...prev,
      selectedRegions: prev.selectedRegions.includes(regionKey)
        ? prev.selectedRegions.filter(r => r !== regionKey)
        : [...prev.selectedRegions, regionKey]
    }));
    setTimeout(() => applyFilters(), 200);
  }, [applyFilters]);

  // Reset filters
  const resetFilters = useCallback(() => {
    const resetState = getInitialState();
    setFilters(resetState);
    setTimeout(() => applyFilters(), 100);
  }, [applyFilters]);

  // Initial load
  const triggerInitialLoad = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  return {
    // State
    filters,
    loading,
    error,
    filterSummary,

    // Actions
    updateFilter,
    updateMunicipalities,
    toggleRegion,
    applyFilters,
    resetFilters,
    triggerInitialLoad,

    // Constants
    DATE_PRESETS,
    SERBIA_REGIONS
  };
};

export { SERBIA_REGIONS, DATE_PRESETS };