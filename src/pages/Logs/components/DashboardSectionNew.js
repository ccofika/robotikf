import React, { useEffect, useState, useMemo } from 'react';
import {
  ClockIcon,
  RefreshIcon,
  TrendingUpIcon,
  BarChartIcon,
  HardHatIcon,
  ChartIcon,
  CheckIcon,
  CloseIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
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

// Import CSS styles
import '../../../components/ui/DashboardStyles.css';

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
    kpi: null,
    charts: null,
    tables: null,
    map: null,
    cancellation: null,
    hourly: null,
    financial: null,
    technician: null
  });
  const [kpiLoading, setKpiLoading] = useState({});

  // Dashboard data state for initial title cards
  const [dashboardTitles, setDashboardTitles] = useState([
    {
      id: 'kpi',
      title: 'Key Performance Indicators',
      description: 'Osnovni KPI pokazatelji performansi',
      loaded: false
    },
    {
      id: 'charts',
      title: 'Analytics Charts',
      description: 'Grafikoni i distribucije aktivnosti',
      loaded: false
    },
    {
      id: 'tables',
      title: 'Data Tables',
      description: 'Tabele sa detaljnim podacima',
      loaded: false
    },
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

  // API fetch functions for each KPI type
  const fetchKPIData = async (kpiType, filterData = null) => {
    setKpiLoading(prev => ({ ...prev, [kpiType]: true }));

    try {
      const params = new URLSearchParams();

      // Add time range and filters
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

      let endpoint = '';
      switch (kpiType) {
        case 'kpi':
          endpoint = '/api/logs/dashboard/kpi';
          break;
        case 'charts':
          endpoint = '/api/logs/dashboard/charts';
          break;
        case 'tables':
          endpoint = '/api/logs/dashboard/tables';
          break;
        case 'map':
          endpoint = '/api/logs/dashboard/interactive-map';
          break;
        case 'cancellation':
          endpoint = '/api/logs/dashboard/cancellation-analysis';
          break;
        case 'hourly':
          endpoint = '/api/logs/dashboard/hourly-activity-distribution';
          break;
        case 'financial':
          endpoint = '/api/logs/dashboard/financial-analysis';
          break;
        case 'technician':
          endpoint = '/api/logs/dashboard/technician-comparison';
          break;
        default:
          throw new Error(`Unknown KPI type: ${kpiType}`);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${endpoint}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${kpiType} data`);
      }

      const response_data = await response.json();

      // Extract the actual data array based on KPI type
      let extractedData;
      switch (kpiType) {
        case 'charts':
          // For charts, use processed activity data from logs instead of API
          extractedData = processActivityData(technicianLogs, userLogs, 'all');
          break;
        case 'technician':
          extractedData = response_data.technicians || [];
          break;
        case 'financial':
        case 'cancellation':
        case 'hourly':
        case 'map':
        case 'tables':
        case 'kpi':
        default:
          extractedData = response_data.data || [];
          break;
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
            ? { ...title, loaded: true }
            : title
        )
      );

      console.log(`✅ Loaded ${kpiType} data:`, extractedData);

    } catch (error) {
      console.error(`❌ Error fetching ${kpiType} data:`, error);

      // Generate fallback mock data for each KPI type
      let mockData = [];
      switch (kpiType) {
        case 'charts':
          mockData = processActivityData(technicianLogs, userLogs, 'all');
          break;
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

      setKpiData(prev => ({
        ...prev,
        [kpiType]: mockData
      }));
    } finally {
      setKpiLoading(prev => ({ ...prev, [kpiType]: false }));
    }
  };

  // Handle KPI selection from dock
  const handleKPISelect = (kpiType) => {
    if (activeKPI === kpiType) {
      // Close if already open
      setActiveKPI(null);
    } else {
      // Close previous and open new
      setActiveKPI(kpiType);

      // Load data if not already loaded
      if (!kpiData[kpiType]) {
        fetchKPIData(kpiType, filterSummary);
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

  // Handle card click from title cards
  const handleCardClick = (kpiType) => {
    handleKPISelect(kpiType);
  };

  // Memoize KPI data to prevent unnecessary re-renders
  const memoizedKpiData = useMemo(() => kpiData, [JSON.stringify(kpiData)]);

  // Render KPI content inline
  const renderKPIContent = (kpiType) => {
    if (!kpiType || !memoizedKpiData[kpiType]) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Nema podataka za prikazivanje</p>
        </div>
      );
    }

    const data = memoizedKpiData[kpiType];

    switch (kpiType) {
      case 'kpi':
        return (
          <KPITrendCards
            data={data}
            filters={filterSummary}
            className="w-full"
          />
        );
      case 'charts':
        return (
          <TotalSalesChart
            data={data}
            title="Dnevne aktivnosti"
            description="Pregled aktivnosti na aplikaciji po danima"
            filters={filterSummary}
            className="w-full"
          />
        );
      case 'tables':
        return (
          <TrendChart
            data={data}
            filters={filterSummary}
            className="w-full"
          />
        );
      case 'map':
        return (
          <InteractiveActivityMap
            data={data}
            filters={filterSummary}
            loading={kpiLoading[kpiType]}
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
            onRefresh={() => handleKPIRefresh(kpiType)}
            className="w-full"
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Nepoznat tip KPI-a: {kpiType}</p>
          </div>
        );
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

  // Apply filters effect
  useEffect(() => {
    // Refresh active KPI when filters change
    if (activeKPI && filters) {
      fetchKPIData(activeKPI, filterSummary);
    }
  }, [filterSummary, activeKPI]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Global Dashboard Filters */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <GlobalDashboardFilters
          filters={filters}
          loading={filtersLoading}
          error={filtersError}
          filterSummary={filterSummary}
          filterOptions={filterOptions}
          onUpdateFilter={updateFilter}
          onUpdateFilters={updateFilters}
          onUpdateMunicipalities={updateMunicipalities}
          onToggleRegion={toggleRegion}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          onToggleComparison={toggleComparison}
          onToggleTrends={toggleTrends}
          DATE_PRESETS={DATE_PRESETS}
          SERBIA_REGIONS={SERBIA_REGIONS}
          SERVICE_TYPES={SERVICE_TYPES}
          ACTION_TYPES={ACTION_TYPES}
          STATUS_TYPES={STATUS_TYPES}
          PRIORITY_LEVELS={PRIORITY_LEVELS}
          WORK_ORDER_TYPES={WORK_ORDER_TYPES}
          ISSUE_CATEGORIES={ISSUE_CATEGORIES}
        />
      </div>

      {/* Main Content Area */}
      <div className="p-6 pb-32"> {/* Extra bottom padding for dock */}
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Analitike
          </h1>
          <p className="text-gray-600">
            Izaberite KPI koji želite da analizirate koristeći dock na dnu stranice
          </p>
        </div>

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
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                {dashboardTitles.find(t => t.id === activeKPI)?.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleKPIClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <CloseIcon className="w-5 h-5" />
              </Button>
            </div>

            {kpiLoading[activeKPI] ? (
              <div className="text-center py-12">
                <RefreshIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Učitavanje podataka...</p>
              </div>
            ) : (
              <div className="w-full">
                {renderKPIContent(activeKPI)}
              </div>
            )}
          </div>
        )}

        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <CheckIcon className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Dashboard Status</h3>
                <p className="text-sm text-gray-600">Sistem je operativan</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <TrendingUpIcon className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Performance</h3>
                <p className="text-sm text-gray-600">Optimizovano za brzinu</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <BarChartIcon className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Data Freshness</h3>
                <p className="text-sm text-gray-600">Real-time podaci</p>
              </div>
            </div>
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
    </div>
  );
};

export default DashboardSection;