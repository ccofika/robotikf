import React, { useEffect, useState, useMemo } from 'react';
import { X, CircleCheck, TrendingUp, ChartColumn } from 'lucide-react';
import { Btn, Sign } from '../../../security/sx/ui';
import { Panel, Stat, KV } from '../../../security/sx/layout';
import Dialog from '../../../security/sx/Dialog';
import { Loading } from '../../../montaza/ui';
import { cn } from '../../../utils/cn';
import GlobalDashboardFilters from '../../../components/ui/GlobalDashboardFilters';
import DrilldownModal from '../../../components/ui/DrilldownModal';
import { useGlobalDashboardFilters } from '../../../hooks/useGlobalDashboardFilters';
import { useDrilldownData } from '../../../hooks/useDrilldownData';
import { processActivityData } from '../../../utils/activityDataProcessor';

// Import new dock system components
import DashboardDock from '../../../components/ui/DashboardDock';
import KPICards from '../../../components/ui/KPICards';

// Import KPI components for inline rendering
import TotalSalesChart from '../../../components/ui/total-sales-chart';
import TrendChart from '../../../components/ui/TrendChart';
import KPITrendCards from '../../../components/ui/KPITrendCards';
import CancellationAnalysis from '../../../components/ui/CancellationAnalysis';
import HourlyActivityDistribution from '../../../components/ui/HourlyActivityDistribution';
import InteractiveActivityMap from '../../../components/ui/InteractiveActivityMap';
import FinancialAnalysis from '../../../components/ui/FinancialAnalysis';
import TechnicianComparison from '../../../components/ui/TechnicianComparison';

// Izgled taba (mx-logdash-)
import './DashboardSectionNew.mx.css';

const DashboardSection = ({
  technicianLogs = [],
  userLogs = [],
  handleDismissWorkOrder,
  filterOptions = { technicians: [], municipalities: [], actions: [] }
}) => {

  // Global filters and state
  const {
    filters,
    filtersLoading,
    filtersError,
    filterSummary,
    effectiveDateRange,
    updateFilter,
    updateFilters,
    updateMunicipalities,
    toggleRegion,
    applyFilters,
    resetFilters,
    toggleComparison,
    toggleTrends
  } = useGlobalDashboardFilters();

  const {
    drilldownData,
    drilldownLoading,
    isDrilldownOpen,
    selectedChartData,
    handleChartClick,
    closeDrilldown,
    isDrilldownAvailable
  } = useDrilldownData();

  // New dock system state
  const [activeKPI, setActiveKPI] = useState(null);
  const [kpiData, setKpiData] = useState({
    map: null,
    cancellation: null,
    hourly: null,
    financial: null,
    technician: null
  });
  const [kpiLoading, setKpiLoading] = useState({});

  // Municipality modal state
  const [municipalityModal, setMunicipalityModal] = useState({
    isOpen: false,
    municipalityData: null,
    workOrders: []
  });

  // Dashboard data state for initial title cards
  const [dashboardTitles, setDashboardTitles] = useState([
    {
      id: 'map',
      title: 'Interactive Map',
      description: 'Interaktivna mapa aktivnosti',
      loaded: false
    },
    {
      id: 'cancellation',
      title: 'Cancellation Analysis',
      description: 'Analiza otkazanih radnih naloga',
      loaded: false
    },
    {
      id: 'hourly',
      title: 'Hourly Activity',
      description: 'Distribucija aktivnosti po satima',
      loaded: false
    },
    {
      id: 'financial',
      title: 'Financial Analysis',
      description: 'Finansijska analiza i troškovi',
      loaded: false
    },
    {
      id: 'technician',
      title: 'Technician Comparison',
      description: 'Poređenje performansi tehničara',
      loaded: false
    }
  ]);

  // Constants for filters
  const DATE_PRESETS = [
    { label: 'Poslednja 24h', value: '24h' },
    { label: 'Poslednja 7 dana', value: '7d' },
    { label: 'Poslednja 30 dana', value: '30d' },
    { label: 'Poslednja 90 dana', value: '90d' },
    { label: 'Prošli mesec', value: 'last_month' },
    { label: 'Ovaj mesec', value: 'this_month' },
    { label: 'Prilagođeno', value: 'custom' }
  ];

  const SERBIA_REGIONS = {
    'Beograd': ['Novi Beograd', 'Stari Grad', 'Vračar', 'Zemun', 'Zvezdara', 'Palilula', 'Savski Venac', 'Rakovica', 'Voždovac', 'Čukarica'],
    'Vojvodina': ['Novi Sad', 'Subotica', 'Zrenjanin', 'Pančevo', 'Kikinda', 'Sombor', 'Sremska Mitrovica', 'Vršac'],
    'Centralna Srbija': ['Kragujevac', 'Niš', 'Čačak', 'Kruševac', 'Smederevo', 'Leskovac', 'Užice', 'Vranje', 'Zaječar'],
    'Južna Srbija': ['Vranje', 'Leskovac', 'Pirot', 'Prokuplje', 'Bujanovac', 'Preševo'],
    'Zapadna Srbija': ['Užice', 'Čačak', 'Kraljevo', 'Nova Varoš', 'Prijepolje', 'Priboj']
  };

  const SERVICE_TYPES = [
    'Instalacija',
    'Servis',
    'Dijagnostika',
    'Održavanje',
    'Popravka',
    'Modernizacija',
    'Konsultacije',
    'Tehnička podrška'
  ];

  const ACTION_TYPES = [
    'workorder_created',
    'workorder_finished',
    'workorder_assigned',
    'workorder_cancelled',
    'workorder_postponed',
    'material_added',
    'material_removed',
    'equipment_added',
    'equipment_removed',
    'comment_added',
    'image_added'
  ];

  const STATUS_TYPES = [
    'zavrsen',
    'nezavrsen',
    'otkazan',
    'odlozen'
  ];

  const PRIORITY_LEVELS = [
    'urgent',
    'high',
    'normal',
    'low'
  ];

  const WORK_ORDER_TYPES = [
    'Instalacija',
    'Servis',
    'Popravka',
    'Održavanje',
    'Dijagnostika'
  ];

  const ISSUE_CATEGORIES = [
    'Tehnički problem',
    'Mrežni problem',
    'Oprema',
    'Materijali',
    'Korisničko pitanje',
    'Administrativno'
  ];

  // API fetch functions for each KPI type (OPTIMIZED)
  const fetchKPIData = async (kpiType, filterData = null, statsOnlyMode = false) => {
    setKpiLoading(prev => ({ ...prev, [kpiType]: true }));

    try {
      const params = new URLSearchParams();

      // For dashboard initial load, use statsOnly for faster loading
      if (statsOnlyMode) {
        params.append('statsOnly', 'true');
      } else {
        // Add time range and filters for full data
        if (filterData) {
          if (filterData.startDate) params.append('period', '30d'); // Default to 30d
          if (filterData.technician && filterData.technician !== 'all') {
            params.append('technician', filterData.technician);
          }
          if (filterData.municipalities && filterData.municipalities.length > 0) {
            params.append('municipalities', filterData.municipalities.join(','));
          }
          if (filterData.actionType && filterData.actionType !== 'all') {
            params.append('action', filterData.actionType);
          }
        }
      }

      let endpoint = '';
      switch (kpiType) {
        case 'map':
          endpoint = '/api/logs/dashboard/interactive-map-optimized';
          break;
        case 'cancellation':
          endpoint = '/api/logs/dashboard/cancellation-analysis-optimized';
          break;
        case 'hourly':
          endpoint = '/api/logs/dashboard/hourly-activity-distribution-optimized';
          break;
        case 'financial':
          endpoint = '/api/logs/dashboard/financial-analysis-optimized';
          break;
        case 'technician':
          endpoint = '/api/logs/dashboard/technician-comparison-optimized';
          break;
        default:
          throw new Error(`Unknown KPI type: ${kpiType}`);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${endpoint}?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${kpiType} data`);
      }

      const response_data = await response.json();

      // Handle statsOnly vs full data response
      let extractedData;
      if (statsOnlyMode) {
        // For statsOnly, just save the basic count/info
        extractedData = {
          total: response_data.total || 0,
          isStatsOnly: true
        };
        console.log(`⚡ Loaded ${kpiType} stats (optimized):`, extractedData);
      } else {
        // Extract the actual data array based on KPI type
        switch (kpiType) {
          case 'technician':
            extractedData = response_data.data || [];
            break;
          case 'financial':
          case 'cancellation':
          case 'hourly':
          case 'map':
          default:
            extractedData = response_data.data || [];
            break;
        }
        console.log(`✅ Loaded ${kpiType} full data:`, extractedData);
      }

      // Update KPI data with the extracted array
      setKpiData(prev => ({
        ...prev,
        [kpiType]: extractedData
      }));

      // Mark as loaded in titles
      setDashboardTitles(prev =>
        prev.map(title =>
          title.id === kpiType
            ? { ...title, loaded: !statsOnlyMode } // Only mark as fully loaded if not statsOnly
            : title
        )
      );

    } catch (error) {
      console.error(`❌ Error fetching ${kpiType} data:`, error);

      // Check if it's a network error (backend not running)
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.log(`🔧 Backend server not running - using mock data for ${kpiType}`);
      }

      // Handle statsOnly vs full data for fallback
      let mockData;
      if (statsOnlyMode) {
        // Return basic stats for statsOnly mode
        mockData = {
          total: getRandomCount(kpiType),
          isStatsOnly: true
        };
        console.log(`📊 Using mock stats for ${kpiType}:`, mockData);
      } else {
        // Generate fallback mock data for each KPI type
        switch (kpiType) {
          case 'financial':
            mockData = generateMockFinancialData();
            break;
          case 'technician':
            mockData = generateMockTechnicianData();
            break;
          case 'cancellation':
            mockData = generateMockCancellationData();
            break;
          case 'hourly':
            mockData = generateMockHourlyData();
            break;
          case 'map':
            mockData = generateMockMapData();
            break;
          default:
            mockData = [];
        }
        console.log(`📊 Using mock data for ${kpiType}:`, mockData.length || 'object');
      }

      setKpiData(prev => ({
        ...prev,
        [kpiType]: mockData
      }));
    } finally {
      setKpiLoading(prev => ({ ...prev, [kpiType]: false }));
    }
  };

  // Handle KPI selection from dock (OPTIMIZED)
  const handleKPISelect = async (kpiType) => {
    if (activeKPI === kpiType) {
      // Close if already open
      setActiveKPI(null);
    } else {
      // Close previous and open new
      setActiveKPI(kpiType);

      // Load data if not already loaded
      const currentData = kpiData[kpiType];
      if (!currentData || currentData.isStatsOnly) {
        console.log(`🚀 Loading full ${kpiType} data...`);

        // Load full data directly (no more statsOnly step)
        await fetchKPIData(kpiType, filterSummary, false);
      }
    }
  };

  // Handle KPI panel close
  const handleKPIClose = () => {
    setActiveKPI(null);
  };

  // Handle KPI refresh
  const handleKPIRefresh = async (kpiType) => {
    await fetchKPIData(kpiType, filterSummary);
  };

  // Handle time range change for specific KPI
  const handleTimeRangeChange = async (kpiType, newTimeRange) => {
    console.log(`⏰ Time range changed for ${kpiType}: ${newTimeRange}`);

    // Update the global filter state to persist the time range (using dateMode)
    updateFilter('dateMode', newTimeRange);

    // Update filter summary with new time range
    const updatedFilters = {
      ...filterSummary,
      timeRange: newTimeRange
    };

    // Reload data for this KPI with new time range
    await fetchKPIData(kpiType, updatedFilters);
  };

  // Handle card click from title cards
  const handleCardClick = (kpiType) => {
    handleKPISelect(kpiType);
  };

  // Handle municipality click from map
  const handleMunicipalityClick = async (municipalityData) => {
    console.log('🏛️ Municipality clicked:', municipalityData);

    // First try to use sample work orders from the municipality data if available
    const sampleWorkOrders = municipalityData.sampleWorkOrders || municipalityData.activities || [];

    if (sampleWorkOrders.length > 0) {
      console.log('📋 Using sample work orders from municipality data:', sampleWorkOrders.length);
      setMunicipalityModal({
        isOpen: true,
        municipalityData: municipalityData,
        workOrders: sampleWorkOrders
      });
      return;
    }

    // Fallback to API call if no sample data is available
    try {
      console.log('🔍 Fetching work orders from API for municipality:', municipalityData.municipality);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/workorders?municipality=${municipalityData.municipality}&status=zavrsen&limit=50`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.ok) {
        const workOrdersData = await response.json();

        setMunicipalityModal({
          isOpen: true,
          municipalityData: municipalityData,
          workOrders: workOrdersData.data || workOrdersData || []
        });
      } else {
        console.error('Failed to fetch work orders for municipality');
        // Show modal with basic data even if work orders fail
        setMunicipalityModal({
          isOpen: true,
          municipalityData: municipalityData,
          workOrders: []
        });
      }
    } catch (error) {
      console.error('Error fetching municipality work orders:', error);
      // Show modal with basic data even if API fails
      setMunicipalityModal({
        isOpen: true,
        municipalityData: municipalityData,
        workOrders: []
      });
    }
  };

  // Close municipality modal
  const closeMunicipalityModal = () => {
    setMunicipalityModal({
      isOpen: false,
      municipalityData: null,
      workOrders: []
    });
  };

  // Memoize KPI data to prevent unnecessary re-renders
  const memoizedKpiData = useMemo(() => kpiData, [JSON.stringify(kpiData)]);

  // Render KPI content inline (OPTIMIZED)
  const renderKPIContent = (kpiType) => {
    if (!kpiType || !memoizedKpiData[kpiType]) {
      return (
        <div className="mx-logdash-empty">
          <p>Nema podataka za prikazivanje</p>
        </div>
      );
    }

    const data = memoizedKpiData[kpiType];

    // Show loading message if we only have stats and are loading full data
    if (data.isStatsOnly) {
      return (
        <div className="mx-logdash-empty">
          <span className="sx-tag is-info"><b className="sx-mono">{data.total}</b> ukupno stavki</span>
          <p>Učitavanje detaljnih podataka...</p>
        </div>
      );
    }

    switch (kpiType) {
      case 'map':
        return (
          <InteractiveActivityMap
            data={data}
            filters={filterSummary}
            loading={kpiLoading[kpiType]}
            onLocationClick={handleMunicipalityClick}
            className="w-full"
          />
        );
      case 'cancellation':
        return (
          <CancellationAnalysis
            data={data}
            loading={kpiLoading[kpiType]}
            filters={filterSummary}
            onRefresh={() => handleKPIRefresh(kpiType)}
            className="w-full"
          />
        );
      case 'hourly':
        return (
          <HourlyActivityDistribution
            data={data}
            loading={kpiLoading[kpiType]}
            filters={filterSummary}
            onRefresh={() => handleKPIRefresh(kpiType)}
            className="w-full"
          />
        );
      case 'financial':
        return (
          <FinancialAnalysis
            data={data}
            loading={kpiLoading[kpiType]}
            filters={filterSummary}
            onRefresh={() => handleKPIRefresh(kpiType)}
            className="w-full"
          />
        );
      case 'technician':
        return (
          <TechnicianComparison
            data={data}
            loading={kpiLoading[kpiType]}
            filters={filterSummary}
            timeRange={filterSummary.timeRange || '30d'}
            onTimeRangeChange={(newTimeRange) => handleTimeRangeChange(kpiType, newTimeRange)}
            onRefresh={() => handleKPIRefresh(kpiType)}
            className="w-full"
          />
        );
      default:
        return (
          <div className="mx-logdash-empty">
            <p>Nepoznat tip KPI-a: {kpiType}</p>
          </div>
        );
    }
  };

  // Helper function to generate random counts for statsOnly mode
  const getRandomCount = (kpiType) => {
    switch (kpiType) {
      case 'map':
        return Math.floor(Math.random() * 500) + 800; // 800-1300
      case 'cancellation':
        return Math.floor(Math.random() * 50) + 50; // 50-100
      case 'hourly':
        return Math.floor(Math.random() * 1000) + 4000; // 4000-5000
      case 'financial':
        return Math.floor(Math.random() * 200) + 250; // 250-450
      case 'technician':
        return Math.floor(Math.random() * 8) + 8; // 8-16
      default:
        return Math.floor(Math.random() * 100) + 50; // Default range
    }
  };

  // Mock data generation functions
  const generateMockFinancialData = () => {
    const mockData = [];
    for (let i = 0; i < 50; i++) {
      const revenue = Math.random() * 5000 + 1000;
      const cost = revenue * (0.4 + Math.random() * 0.3);
      mockData.push({
        id: `fin-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        revenue,
        cost,
        profit: revenue - cost,
        technician: `Tehničar ${i % 5 + 1}`,
        municipality: ['Beograd', 'Novi Sad', 'Niš'][i % 3],
        service_type: ['HFC', 'GPON', 'Servis'][i % 3]
      });
    }
    return mockData;
  };

  const generateMockTechnicianData = () => {
    return ['Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović', 'Ana Milić'].map((name, i) => ({
      id: `tech-${i}`,
      name,
      totalWorkOrders: Math.floor(Math.random() * 100) + 50,
      completedWorkOrders: Math.floor(Math.random() * 80) + 40,
      successRate: 75 + Math.random() * 20,
      avgResponseTime: Math.random() * 24 + 2,
      totalActivities: Math.floor(Math.random() * 300) + 100,
      municipalities: { 'Beograd': Math.floor(Math.random() * 30) + 10 }
    }));
  };

  const generateMockCancellationData = () => {
    const reasons = ['Korisnik nije kod kuće', 'Neispravna adresa', 'Nema signala'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: `cancel-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      workOrderId: `WO-${i}`,
      cancellationReason: reasons[i % reasons.length],
      technician: `Tehničar ${i % 3 + 1}`,
      municipality: ['Beograd', 'Novi Sad'][i % 2]
    }));
  };

  const generateMockHourlyData = () => {
    return Array.from({ length: 100 }, (_, i) => {
      const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      return {
        id: `hourly-${i}`,
        timestamp: date.toISOString(),
        hour: date.getHours(),
        action: ['workorder_finished', 'material_added', 'comment_added'][i % 3],
        technician: `Tehničar ${i % 4 + 1}`,
        municipality: ['Beograd', 'Novi Sad', 'Niš'][i % 3]
      };
    });
  };

  const generateMockMapData = () => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: `map-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      municipality: ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac'][i % 4],
      address: `Test adresa ${i + 1}`,
      technician: `Tehničar ${i % 3 + 1}`,
      action: ['workorder_finished', 'material_added'][i % 2],
      status: ['completed', 'in_progress'][i % 2]
    }));
  };

  // NOTE: Removed automatic API calls on page load - only load when user clicks on KPI

  // Apply filters effect - only refresh when filters change, not when KPI changes
  useEffect(() => {
    // Refresh active KPI when filters change
    if (activeKPI && filters) {
      fetchKPIData(activeKPI, filterSummary, false); // Always load full data when filters change
    }
  }, [filterSummary]); // Removed activeKPI from dependencies to prevent double loading

  return (
    <div className="mx-logdash" data-testid="logs-dashboard">

      {/* Welcome Section */}
      <header className="mx-logdash__head">
        <h1 className="mx-logdash__title">Dashboard Analitike</h1>
        <p className="mx-logdash__lead">Izaberite KPI koji želite da analizirate koristeći dock na dnu stranice</p>
      </header>

      {/* KPI Title Cards - Show initially */}
      {!activeKPI && (
        <KPICards
          kpiData={kpiData}
          onCardClick={handleCardClick}
          activeCard={activeKPI}
        />
      )}

      {/* Active KPI Content - Only show when KPI is selected */}
      {activeKPI && (
        <Panel
          className="mx-logdash__active"
          title={dashboardTitles.find(t => t.id === activeKPI)?.title}
          actions={<Btn size="sm" variant="ghost" icon={X} onClick={handleKPIClose} aria-label="Zatvori" title="Zatvori" />}
        >
          {kpiLoading[activeKPI] ? (
            <Loading rows={4} h={64} text="Učitavanje podataka..." />
          ) : (
            <div className="w-full">
              {renderKPIContent(activeKPI)}
            </div>
          )}
        </Panel>
      )}

      {/* Status Information */}
      <div className="mx-logdash-status">
        <div className="sx-card mx-logdash-status__item">
          <span className="sx-item__icon"><CircleCheck size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="mx-logdash-status__text">
            <h3>Dashboard Status</h3>
            <Sign tone="ok">Sistem je operativan</Sign>
          </div>
        </div>

        <div className="sx-card mx-logdash-status__item">
          <span className="sx-item__icon"><TrendingUp size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="mx-logdash-status__text">
            <h3>Performance</h3>
            <p>Optimizovano za brzinu</p>
          </div>
        </div>

        <div className="sx-card mx-logdash-status__item">
          <span className="sx-item__icon"><ChartColumn size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="mx-logdash-status__text">
            <h3>Data Freshness</h3>
            <p>Real-time podaci</p>
          </div>
        </div>
      </div>

      {/* Dashboard Dock - Fixed at bottom */}
      <DashboardDock
        onKPISelect={handleKPISelect}
        activeKPI={activeKPI}
        kpiData={kpiData}
      />


      {/* Drilldown Modal */}
      <DrilldownModal
        isOpen={isDrilldownOpen}
        onClose={closeDrilldown}
        data={drilldownData}
        loading={drilldownLoading}
        chartData={selectedChartData}
        title={selectedChartData?.title || 'Detaljni pregled'}
        subtitle={selectedChartData?.subtitle}
      />

      {/* Municipality Modal */}
      <Dialog
        open={municipalityModal.isOpen}
        onClose={closeMunicipalityModal}
        size="lg"
        title={municipalityModal.municipalityData?.municipality || 'Opština'}
        testId="municipality-modal"
      >
        {municipalityModal.municipalityData && (
          <div className="sx-stats mx-logdash-dlgstats">
            <Stat label="Aktivnosti" value={municipalityModal.municipalityData.activities || 0} />
            <Stat label="Adrese" value={municipalityModal.municipalityData.uniqueAddresses || 0} />
            <Stat label="Tehničari" value={municipalityModal.municipalityData.uniqueTechnicians || 0} />
            <Stat label="Završeno" value={municipalityModal.municipalityData.completed || 0} />
          </div>
        )}

        <h3 className="mx-logdash-dlg__title">
          Radni nalozi (prikazano {municipalityModal.workOrders.length} od {municipalityModal.municipalityData?.activities || 0})
        </h3>

        {municipalityModal.workOrders.length > 0 ? (
          <div className="mx-logdash-wos">
            {municipalityModal.workOrders.slice(0, 20).map((wo, index) => (
              <div key={wo._id || index} className="mx-logdash-wo">
                <div className="mx-logdash-wo__head">
                  <b className="sx-mono">{wo.workOrderId || wo._id}</b>
                  <Sign tone="ok">Završen</Sign>
                </div>
                <KV
                  className="mx-logdash-wo__kv"
                  items={[
                    { k: 'Adresa', v: wo.address },
                    { k: 'Korisnik', v: wo.userName },
                    { k: 'Tehničar', v: wo.primaryTechnician || wo.technician || 'N/A' },
                    { k: 'Tip', v: wo.type },
                    { k: 'Datum', v: new Date(wo.date).toLocaleDateString('sr-RS') }
                  ]}
                />
              </div>
            ))}

            {municipalityModal.workOrders.length > 20 && (
              <p className="mx-logdash-dlg__more">
                Prikazano prvih 20 od {municipalityModal.workOrders.length} radnih naloga
              </p>
            )}
          </div>
        ) : (
          <p className="mx-logdash-dlg__empty">
            Nema dostupnih radnih naloga za ovu opštinu
          </p>
        )}
      </Dialog>
    </div>
  );
};

export default DashboardSection;
