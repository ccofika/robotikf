import { useState, useEffect, useCallback } from 'react';

// Serbia regions mapping for municipality grouping
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

// Date presets for unified filtering
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

// Initial filter state
const getInitialFilterState = (initialValues = {}) => ({
  // Date filters
  dateMode: initialValues.initialDateMode || '7d', // Default to last 7 days
  startDate: initialValues.initialStartDate || null,
  endDate: initialValues.initialEndDate || null,

  // Standard filters
  technician: initialValues.initialTechnician || 'all',
  municipalities: initialValues.initialMunicipalities || [], // Changed to array for multiple selection
  selectedRegions: [], // New: for region-based filtering
  action: initialValues.initialAction || 'all',

  // UI state
  isCustomDateMode: initialValues.initialDateMode === 'custom',
  filtersApplied: false,
  lastApplied: null
});

export const useUnifiedFilters = (onFiltersChange, initialValues = {}) => {
  const [filters, setFilters] = useState(getInitialFilterState(initialValues));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Calculate effective date range based on current date mode
  const getEffectiveDateRange = useCallback(() => {
    if (filters.dateMode === 'custom') {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
    }

    const preset = DATE_PRESETS.find(p => p.key === filters.dateMode);
    if (preset) {
      return preset.getValue();
    }

    // Default to last 7 days if no valid preset
    return DATE_PRESETS.find(p => p.key === '7d').getValue();
  }, [filters.dateMode, filters.startDate, filters.endDate]);

  // Get municipalities from selected regions - moved outside useCallback to prevent dependency issues
  const getMunicipalitiesFromRegions = () => {
    if (filters.selectedRegions.length === 0) {
      return [];
    }

    return filters.selectedRegions.reduce((acc, regionKey) => {
      const region = SERBIA_REGIONS[regionKey];
      if (region) {
        acc.push(...region.municipalities);
      }
      return acc;
    }, []);
  };

  // Get effective municipalities (combines manual selection and region selection)
  const getEffectiveMunicipalities = () => {
    const fromRegions = getMunicipalitiesFromRegions();
    const allSelected = [...new Set([...filters.municipalities, ...fromRegions])];
    return allSelected;
  };

  // Update individual filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };

      // Handle date mode changes
      if (key === 'dateMode') {
        if (value === 'custom') {
          newFilters.isCustomDateMode = true;
          // Keep existing custom dates if any
        } else {
          newFilters.isCustomDateMode = false;
          // Apply preset dates
          const dateRange = DATE_PRESETS.find(p => p.key === value)?.getValue();
          if (dateRange) {
            newFilters.startDate = dateRange.startDate;
            newFilters.endDate = dateRange.endDate;
          }
        }
      }

      return newFilters;
    });
  }, []);

  // Update multiple municipalities
  const updateMunicipalities = useCallback((municipalities) => {
    setFilters(prev => ({ ...prev, municipalities }));
  }, []);

  // Update selected regions
  const updateRegions = useCallback((regions) => {
    setFilters(prev => ({ ...prev, selectedRegions: regions }));
  }, []);

  // Add municipality to selection
  const addMunicipality = useCallback((municipality) => {
    setFilters(prev => ({
      ...prev,
      municipalities: prev.municipalities.includes(municipality)
        ? prev.municipalities
        : [...prev.municipalities, municipality]
    }));
  }, []);

  // Remove municipality from selection
  const removeMunicipality = useCallback((municipality) => {
    setFilters(prev => ({
      ...prev,
      municipalities: prev.municipalities.filter(m => m !== municipality)
    }));
  }, []);

  // Toggle region selection
  const toggleRegion = useCallback((regionKey) => {
    setFilters(prev => ({
      ...prev,
      selectedRegions: prev.selectedRegions.includes(regionKey)
        ? prev.selectedRegions.filter(r => r !== regionKey)
        : [...prev.selectedRegions, regionKey]
    }));
  }, []);

  // Apply filters (triggers data refresh)
  const applyFilters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const effectiveDateRange = getEffectiveDateRange();
      const effectiveMunicipalities = getEffectiveMunicipalities();

      const appliedFilters = {
        ...filters,
        ...effectiveDateRange,
        municipalities: effectiveMunicipalities,
        filtersApplied: true,
        lastApplied: new Date()
      };

      setFilters(appliedFilters);

      if (onFiltersChange) {
        await onFiltersChange(appliedFilters);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error applying filters:', error);
      setError(error.message || 'Greška pri primeni filtera');
    } finally {
      setLoading(false);
    }
  }, [onFiltersChange]); // Removed filters dependency to prevent infinite loop

  // Reset all filters
  const resetFilters = useCallback(() => {
    const resetState = getInitialFilterState();
    setFilters(resetState);

    if (onFiltersChange) {
      onFiltersChange(resetState);
    }
  }, [onFiltersChange]);

  // Sync with external state changes
  const syncWithExternalState = useCallback((externalFilters) => {
    setFilters(prev => ({
      ...prev,
      dateMode: externalFilters.dateMode || prev.dateMode,
      technician: externalFilters.technician || prev.technician,
      municipalities: externalFilters.municipalities || prev.municipalities,
      action: externalFilters.action || prev.action,
      startDate: externalFilters.startDate || prev.startDate,
      endDate: externalFilters.endDate || prev.endDate,
      isCustomDateMode: externalFilters.dateMode === 'custom' || prev.isCustomDateMode
    }));
  }, []);

  // Get filter summary for display
  const getFilterSummary = () => {
    const effectiveDateRange = getEffectiveDateRange();
    const effectiveMunicipalities = getEffectiveMunicipalities();
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
  };

  // Apply initial filters with manual trigger
  const applyInitialFilters = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  // Set initial state on mount - completely without dependencies to prevent refresh loops
  useEffect(() => {
    let mounted = true;

    const initializeFilters = () => {
      if (!mounted || filters.filtersApplied) return;

      // Just set initial state without triggering API call
      setFilters(prev => ({
        ...prev,
        filtersApplied: true,
        lastApplied: new Date()
      }));
    };

    initializeFilters();

    return () => {
      mounted = false;
    };
  }, []); // No dependencies to prevent refresh loops

  return {
    // State
    filters,
    loading,
    error,
    lastRefresh,

    // Actions
    updateFilter,
    updateMunicipalities,
    updateRegions,
    addMunicipality,
    removeMunicipality,
    toggleRegion,
    applyFilters,
    applyInitialFilters,
    resetFilters,
    syncWithExternalState,

    // Computed values
    getEffectiveDateRange,
    getEffectiveMunicipalities,
    getFilterSummary,

    // Constants
    DATE_PRESETS,
    SERBIA_REGIONS
  };
};

export { SERBIA_REGIONS, DATE_PRESETS };