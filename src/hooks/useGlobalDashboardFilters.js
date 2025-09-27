import { useState, useCallback, useMemo, useRef } from 'react';

// Enhanced Serbia regions mapping
const SERBIA_REGIONS = {
  'Belgrade': {
    name: 'Beograd',
    municipalities: ['Novi Beograd', 'Zemun', 'Zvezdara', 'Vračar', 'Stari Grad', 'Savski Venac', 'Palilula', 'Čukarica', 'Rakovica', 'Voždovac']
  },
  'Vojvodina': {
    name: 'Vojvodina',
    municipalities: ['Novi Sad', 'Pančevo', 'Zrenjanin', 'Subotica', 'Kikinda', 'Sombor', 'Vršac', 'Sremska Mitrovica']
  },
  'Sumadija': {
    name: 'Šumadija i zapadna Srbija',
    municipalities: ['Kragujevac', 'Čačak', 'Užice', 'Kraljevo', 'Smederevo', 'Valjevo', 'Jagodina', 'Svetozarevo']
  },
  'South': {
    name: 'Južna i istočna Srbija',
    municipalities: ['Niš', 'Leskovac', 'Zaječar', 'Pirot', 'Vranje', 'Bor', 'Negotin', 'Knjaževac']
  }
};

// Enhanced date presets with more options
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
    key: 'year',
    label: 'Ova godina',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
  },
  {
    key: 'custom',
    label: 'Prilagođeni period',
    getValue: () => ({ startDate: null, endDate: null })
  }
];

// Service types for filtering
const SERVICE_TYPES = [
  { value: 'all', label: 'Sve usluge' },
  { value: 'HFC', label: 'HFC' },
  { value: 'GPON', label: 'GPON' },
  { value: 'STB', label: 'Set-Top Box' },
  { value: 'commercial', label: 'Komercijalna usluga' },
  { value: 'service', label: 'Servis' }
];

// Action types for enhanced filtering
const ACTION_TYPES = [
  { value: 'all', label: 'Sve akcije' },
  { value: 'installation', label: 'Instalacija', description: 'Nove instalacije' },
  { value: 'removal', label: 'Demontaža', description: 'Uklanjanje opreme' },
  { value: 'service', label: 'Servis', description: 'Servisni radovi' },
  { value: 'material_validation', label: 'Validacija materijala', description: 'Provera materijala' },
  { value: 'maintenance', label: 'Održavanje', description: 'Redovno održavanje' },
  { value: 'repair', label: 'Popravka', description: 'Kvarovi i popravke' },
  { value: 'upgrade', label: 'Nadogradnja', description: 'Poboljšanje usluge' },
  { value: 'relocation', label: 'Premeštanje', description: 'Promena lokacije' }
];

// Status types with descriptions
const STATUS_TYPES = [
  { value: 'all', label: 'Svi statusi' },
  { value: 'completed', label: 'Završeno', description: 'Uspešno završeni nalozi' },
  { value: 'in_progress', label: 'U toku', description: 'Trenutno se izvršavaju' },
  { value: 'pending', label: 'Na čekanju', label: 'Čeka se početak rada' },
  { value: 'cancelled', label: 'Otkazano', description: 'Otkazani nalozi' },
  { value: 'delayed', label: 'Odloženo', description: 'Privremeno odloženi' },
  { value: 'scheduled', label: 'Zakazano', description: 'Zakazano za buduće izvršavanje' }
];

// Priority levels
const PRIORITY_LEVELS = [
  { value: 'all', label: 'Svi prioriteti' },
  { value: 'urgent', label: 'Hitno', description: 'Kritični kvarovi' },
  { value: 'high', label: 'Visok', description: 'Važni radovi' },
  { value: 'medium', label: 'Srednji', description: 'Standardni radovi' },
  { value: 'low', label: 'Nizak', description: 'Nije hitno' }
];

// Work order types
const WORK_ORDER_TYPES = [
  { value: 'all', label: 'Svi tipovi naloga' },
  { value: 'residential', label: 'Stambeni', description: 'Kućni korisnici' },
  { value: 'business', label: 'Poslovni', description: 'Kompanije i preduzeća' },
  { value: 'government', label: 'Državni', description: 'Državne institucije' },
  { value: 'emergency', label: 'Hitni', description: 'Hitni pozivi' }
];

// Issue categories for detailed filtering
const ISSUE_CATEGORIES = [
  { value: 'all', label: 'Sve kategorije problema' },
  { value: 'connectivity', label: 'Problemi sa vezom', description: 'Internet, TV, telefon' },
  { value: 'equipment', label: 'Problemi sa opremom', description: 'Routeri, modemi, STB' },
  { value: 'billing', label: 'Naplatni problemi', description: 'Računi i plaćanja' },
  { value: 'speed', label: 'Brzina interneta', description: 'Spor internet' },
  { value: 'outage', label: 'Prekidi usluge', description: 'Potpuni prekidi' },
  { value: 'quality', label: 'Kvalitet usluge', description: 'Loš signal, slika' }
];

// Initial filter state
const getInitialState = () => ({
  // Date filters
  dateMode: '7d',
  startDate: null,
  endDate: null,
  isCustomDateMode: false,

  // Location filters
  municipalities: [],
  selectedRegions: [],

  // Service filters
  technician: 'all',
  serviceType: 'all',
  actionType: 'all',

  // Status filters
  status: 'all',
  priority: 'all',
  workOrderType: 'all',
  issueCategory: 'all',

  // Multi-select filters
  selectedServiceTypes: [],
  selectedActionTypes: [],
  selectedStatuses: [],
  selectedPriorities: [],

  // Analytics specific
  comparisonPeriod: false, // Enable/disable comparison with previous period
  showTrends: true,

  // UI state
  filtersApplied: false,
  lastApplied: null
});

export const useGlobalDashboardFilters = (onFiltersChange) => {
  const [filters, setFilters] = useState(getInitialState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Calculate effective date range
  const effectiveDateRange = useMemo(() => {
    if (filters.dateMode === 'custom') {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
    }

    const preset = DATE_PRESETS.find(p => p.key === filters.dateMode);
    return preset ? preset.getValue() : DATE_PRESETS[1].getValue();
  }, [filters.dateMode, filters.startDate, filters.endDate]);

  // Calculate effective municipalities (from regions + individual selection)
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

  // Get comparison period for trends
  const comparisonDateRange = useMemo(() => {
    if (!filters.comparisonPeriod || !effectiveDateRange.startDate || !effectiveDateRange.endDate) {
      return null;
    }

    const duration = effectiveDateRange.endDate - effectiveDateRange.startDate;
    const comparisonStart = new Date(effectiveDateRange.startDate.getTime() - duration);
    const comparisonEnd = new Date(effectiveDateRange.startDate.getTime());

    return {
      startDate: comparisonStart,
      endDate: comparisonEnd
    };
  }, [effectiveDateRange, filters.comparisonPeriod]);

  // Filter summary for display
  const filterSummary = useMemo(() => {
    const preset = DATE_PRESETS.find(p => p.key === filters.dateMode);

    return {
      dateRange: {
        mode: filters.dateMode,
        label: preset?.label || 'Prilagođeni period',
        startDate: effectiveDateRange.startDate,
        endDate: effectiveDateRange.endDate
      },
      comparisonRange: comparisonDateRange,
      technician: filters.technician,
      municipalities: effectiveMunicipalities,
      municipalityCount: effectiveMunicipalities.length,
      regions: filters.selectedRegions,
      serviceType: filters.serviceType,
      timeRange: filters.dateMode, // Add timeRange field mapping to dateMode
      actionType: filters.actionType,
      status: filters.status,
      priority: filters.priority,
      hasActiveFilters: filters.technician !== 'all' ||
                      effectiveMunicipalities.length > 0 ||
                      filters.serviceType !== 'all' ||
                      filters.actionType !== 'all' ||
                      filters.status !== 'all' ||
                      filters.priority !== 'all' ||
                      filters.workOrderType !== 'all' ||
                      filters.issueCategory !== 'all' ||
                      filters.selectedServiceTypes.length > 0 ||
                      filters.selectedActionTypes.length > 0 ||
                      filters.selectedStatuses.length > 0 ||
                      filters.selectedPriorities.length > 0,
      showTrends: filters.showTrends,
      comparisonEnabled: filters.comparisonPeriod
    };
  }, [filters, effectiveDateRange, effectiveMunicipalities, comparisonDateRange]);

  // Debounced apply filters to prevent excessive API calls
  const debouncedApplyFilters = useCallback((immediate = false) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const applyNow = () => {
      if (!onFiltersChange) return;

      setLoading(true);
      setError(null);

      const filterData = {
        ...filters,
        ...effectiveDateRange,
        municipalities: effectiveMunicipalities,
        comparisonDateRange: comparisonDateRange,
        filtersApplied: true,
        lastApplied: new Date()
      };

      Promise.resolve(onFiltersChange(filterData))
        .then(() => {
          setFilters(prev => ({
            ...prev,
            filtersApplied: true,
            lastApplied: new Date()
          }));
        })
        .catch((err) => {
          console.error('Error applying filters:', err);
          setError(err.message || 'Greška pri primeni filtera');
        })
        .finally(() => {
          setLoading(false);
        });
    };

    if (immediate) {
      applyNow();
    } else {
      debounceRef.current = setTimeout(applyNow, 500);
    }
  }, [filters, effectiveDateRange, effectiveMunicipalities, comparisonDateRange, onFiltersChange]);

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

    // Auto-apply filters with debounce
    debouncedApplyFilters();
  }, [debouncedApplyFilters]);

  // Bulk update filters
  const updateFilters = useCallback((updates) => {
    setFilters(prev => ({ ...prev, ...updates }));
    debouncedApplyFilters();
  }, [debouncedApplyFilters]);

  // Update municipalities
  const updateMunicipalities = useCallback((municipalities) => {
    setFilters(prev => ({ ...prev, municipalities }));
    debouncedApplyFilters();
  }, [debouncedApplyFilters]);

  // Toggle region
  const toggleRegion = useCallback((regionKey) => {
    setFilters(prev => ({
      ...prev,
      selectedRegions: prev.selectedRegions.includes(regionKey)
        ? prev.selectedRegions.filter(r => r !== regionKey)
        : [...prev.selectedRegions, regionKey]
    }));
    debouncedApplyFilters();
  }, [debouncedApplyFilters]);

  // Apply filters immediately
  const applyFilters = useCallback(() => {
    debouncedApplyFilters(true);
  }, [debouncedApplyFilters]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    const resetState = getInitialState();
    setFilters(resetState);
    debouncedApplyFilters(true);
  }, [debouncedApplyFilters]);

  // Toggle comparison period
  const toggleComparison = useCallback(() => {
    setFilters(prev => ({ ...prev, comparisonPeriod: !prev.comparisonPeriod }));
    debouncedApplyFilters();
  }, [debouncedApplyFilters]);

  // Toggle trends display
  const toggleTrends = useCallback(() => {
    setFilters(prev => ({ ...prev, showTrends: !prev.showTrends }));
    // No need to trigger API call for this UI-only change
  }, []);

  return {
    // State
    filters,
    loading,
    error,
    filterSummary,

    // Date ranges
    effectiveDateRange,
    comparisonDateRange,

    // Actions
    updateFilter,
    updateFilters,
    updateMunicipalities,
    toggleRegion,
    applyFilters,
    resetFilters,
    toggleComparison,
    toggleTrends,

    // Constants
    DATE_PRESETS,
    SERBIA_REGIONS,
    SERVICE_TYPES,
    ACTION_TYPES
  };
};

export {
  SERBIA_REGIONS,
  DATE_PRESETS,
  SERVICE_TYPES,
  ACTION_TYPES,
  STATUS_TYPES,
  PRIORITY_LEVELS,
  WORK_ORDER_TYPES,
  ISSUE_CATEGORIES
};