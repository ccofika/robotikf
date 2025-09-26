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
import TotalSalesChart from '../../../components/ui/total-sales-chart';
import GlobalDashboardFilters from '../../../components/ui/GlobalDashboardFilters';
import DrilldownModal from '../../../components/ui/DrilldownModal';
import TrendChart from '../../../components/ui/TrendChart';
import KPITrendCards from '../../../components/ui/KPITrendCards';
import CancellationAnalysis from '../../../components/ui/CancellationAnalysis';
import HourlyActivityDistribution from '../../../components/ui/HourlyActivityDistribution';
import InteractiveActivityMap from '../../../components/ui/InteractiveActivityMap';
import PredictiveAnalytics from '../../../components/ui/PredictiveAnalytics';
import FinancialAnalysis from '../../../components/ui/FinancialAnalysis';
import TechnicianComparison from '../../../components/ui/TechnicianComparison';
import RealTimeAlerts from '../../../components/ui/RealTimeAlerts';
import AnomalyDetection from '../../../components/ui/AnomalyDetection';
import { useGlobalDashboardFilters } from '../../../hooks/useGlobalDashboardFilters';
import { useDrilldownData } from '../../../hooks/useDrilldownData';
import { processActivityData, getActivityFilterOptions } from '../../../utils/activityDataProcessor';

const DashboardSection = ({
  technicianLogs = [],
  userLogs = [],
  handleDismissWorkOrder,
  filterOptions = { technicians: [], municipalities: [], actions: [] }
}) => {

  // Activity chart state
  const [activityPeriod, setActivityPeriod] = useState('all');

  // Completion time analytics state
  const [completionTimeData, setCompletionTimeData] = useState(null);
  const [completionTimeLoading, setCompletionTimeLoading] = useState(false);
  const [completionTimePeriod, setCompletionTimePeriod] = useState('all');
  const [selectedTechnician, setSelectedTechnician] = useState('all');

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Trend data state
  const [kpiData, setKpiData] = useState([]);
  const [trendChartsData, setTrendChartsData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Cancellation analysis state
  const [cancellationData, setCancellationData] = useState([]);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationError, setCancellationError] = useState(null);
  const [cancellationTimeRange, setCancellationTimeRange] = useState('30d');

  // Hourly activity distribution state
  const [hourlyActivityData, setHourlyActivityData] = useState([]);
  const [hourlyActivityLoading, setHourlyActivityLoading] = useState(false);
  const [hourlyActivityError, setHourlyActivityError] = useState(null);
  const [hourlyActivityTimeRange, setHourlyActivityTimeRange] = useState('30d');

  // Interactive map state
  const [mapData, setMapData] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapTimeRange, setMapTimeRange] = useState('30d');

  // Predictive analytics state
  const [predictiveData, setPredictiveData] = useState([]);
  const [predictiveLoading, setPredictiveLoading] = useState(false);
  const [predictiveError, setPredictiveError] = useState(null);
  const [predictiveTimeRange, setPredictiveTimeRange] = useState('30d');

  // Financial analysis state
  const [financialData, setFinancialData] = useState([]);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState(null);
  const [financialTimeRange, setFinancialTimeRange] = useState('30d');

  // Technician comparison state
  const [technicianComparisonData, setTechnicianComparisonData] = useState([]);
  const [technicianComparisonLoading, setTechnicianComparisonLoading] = useState(false);
  const [technicianComparisonError, setTechnicianComparisonError] = useState(null);
  const [technicianComparisonTimeRange, setTechnicianComparisonTimeRange] = useState('30d');

  // Global filters hook
  const {
    filters,
    loading: filtersLoading,
    error: filtersError,
    filterSummary,
    effectiveDateRange,
    comparisonDateRange,
    updateFilter,
    updateFilters,
    updateMunicipalities,
    toggleRegion,
    applyFilters,
    resetFilters,
    toggleComparison,
    toggleTrends,
    DATE_PRESETS,
    SERBIA_REGIONS,
    SERVICE_TYPES,
    ACTION_TYPES,
    STATUS_TYPES,
    PRIORITY_LEVELS,
    WORK_ORDER_TYPES,
    ISSUE_CATEGORIES
  } = useGlobalDashboardFilters(handleGlobalFiltersChange);

  // Drill-down functionality
  const {
    drilldownState,
    handleChartClick,
    closeDrilldown,
    handleViewDetails,
    handleExportData,
    isDrilldownAvailable
  } = useDrilldownData();

  // Handle global filters change
  async function handleGlobalFiltersChange(filterData) {
    console.log('Global filters changed:', filterData);

    setDashboardLoading(true);
    try {
      // Apply filters to all dashboard components
      await Promise.all([
        fetchCompletionTimeData(filterData),
        fetchTrendData(filterData),
        fetchCancellationData(filterData),
        fetchHourlyActivityData(filterData),
        fetchMapData(filterData),
        fetchPredictiveData(filterData),
        fetchFinancialData(filterData),
        fetchTechnicianComparisonData(filterData),
        // Add other dashboard data fetching here
      ]);
    } catch (error) {
      console.error('Error applying global filters:', error);
    } finally {
      setDashboardLoading(false);
    }
  }

  // Fetch trend data for KPIs and charts
  const fetchTrendData = async (filterData = null) => {
    if (!filterData || !filterData.comparisonDateRange) {
      // No comparison data needed
      return;
    }

    setTrendLoading(true);
    try {
      const params = new URLSearchParams();

      // Current period parameters
      if (filterData.startDate) params.append('currentStart', filterData.startDate.toISOString());
      if (filterData.endDate) params.append('currentEnd', filterData.endDate.toISOString());

      // Comparison period parameters
      if (filterData.comparisonDateRange) {
        params.append('comparisonStart', filterData.comparisonDateRange.startDate.toISOString());
        params.append('comparisonEnd', filterData.comparisonDateRange.endDate.toISOString());
      }

      // Filter parameters
      if (filterData.technician && filterData.technician !== 'all') params.append('technician', filterData.technician);
      if (filterData.municipalities && filterData.municipalities.length > 0) {
        params.append('municipalities', filterData.municipalities.join(','));
      }
      if (filterData.serviceType && filterData.serviceType !== 'all') params.append('serviceType', filterData.serviceType);
      if (filterData.actionType && filterData.actionType !== 'all') params.append('actionType', filterData.actionType);

      // Fetch KPI data
      const kpiResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/dashboard/kpi-trends?${params.toString()}`);
      if (kpiResponse.ok) {
        const kpiData = await kpiResponse.json();
        setKpiData(kpiData.data || []);
      }

      // Fetch trend charts data
      const trendsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/dashboard/trend-charts?${params.toString()}`);
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        setTrendChartsData(trendsData.data || []);
      }

    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setTrendLoading(false);
    }
  };

  // Fetch cancellation analysis data from new dedicated endpoint
  const fetchCancellationData = async (filterData = null, timeRange = cancellationTimeRange) => {
    setCancellationLoading(true);
    setCancellationError(null);
    try {
      const params = new URLSearchParams();

      // Add time range parameter
      params.append('timeRange', timeRange);

      // Apply filters if provided
      if (filterData) {
        if (filterData.technician && filterData.technician !== 'all') {
          params.append('technician', filterData.technician);
        }
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          params.append('municipalities', filterData.municipalities.join(','));
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/dashboard/cancellation-analysis?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch cancellation analysis data');

      const data = await response.json();

      // The API now returns properly structured cancellation data
      setCancellationData(data.data || []);
    } catch (error) {
      console.error('Error fetching cancellation data:', error);
      setCancellationError(error.message || 'Greška pri učitavanju podataka o otkazivanju');
      // Generate mock data for demonstration if API fails
      setCancellationData(generateMockCancellationData());
    } finally {
      setCancellationLoading(false);
    }
  };


  // Generate mock cancellation data for demonstration
  const generateMockCancellationData = () => {
    const reasons = [
      'Korisnik nije kod kuće',
      'Neispravna adresa',
      'Nema signala',
      'Materijal nedostupan',
      'Kašnjenje tehničara',
      'Kvar opreme',
      'Korisnik odustao',
      'Vremenski uslovi',
      'Ostali razlozi'
    ];

    const technicians = ['Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović', 'Ana Milić'];
    const municipalities = ['Beograd', 'Novi Sad', 'Zemun', 'Novi Beograd', 'Zvezdara', 'Vračar', 'Stari Grad'];
    const types = ['Instalacija', 'Servis', 'Dijagnostika', 'Održavanje'];

    const mockData = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const randomDate = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const reason = reasons[Math.floor(Math.random() * reasons.length)];

      mockData.push({
        id: `mock-${i}`,
        workOrderId: `mock-wo-${i}`,
        tisJobId: `TIS-${10000 + i}`,
        timestamp: randomDate.toISOString(),
        technician: technicians[Math.floor(Math.random() * technicians.length)],
        municipality: municipalities[Math.floor(Math.random() * municipalities.length)],
        address: `Test adresa ${i + 1}`,
        userName: `Korisnik ${i + 1}`,
        type: types[Math.floor(Math.random() * types.length)],
        cancellationReason: reason,
        cancellationComment: `Mock komentar za ${reason.toLowerCase()}`,
        responseTime: Math.random() * 240 + 30, // 30-270 minutes
        status: 'cancelled',
        date: randomDate.toISOString(),
        createdAt: new Date(randomDate.getTime() - Math.random() * 2 * 60 * 60 * 1000).toISOString() // Created 0-2 hours before cancellation
      });
    }

    return mockData;
  };

  // Handle cancellation time range change
  const handleCancellationTimeRangeChange = (timeRange) => {
    setCancellationTimeRange(timeRange);
    fetchCancellationData(null, timeRange);
  };

  // Handle cancellation data refresh
  const handleCancellationRefresh = () => {
    fetchCancellationData(null, cancellationTimeRange);
  };

  // Handle cancellation data export
  const handleCancellationExport = (analysisData) => {
    const csvContent = convertCancellationDataToCSV(analysisData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analiza-otkazivanja-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Convert cancellation analysis data to CSV
  const convertCancellationDataToCSV = (analysisData) => {
    const headers = [
      'Razlog otkazivanja',
      'Broj slučajeva',
      'Procenat',
      'Trend',
      'Prosečno vreme odgovora',
      'Broj tehničara',
      'Broj opština',
      'Poslednji incidenti (7 dana)'
    ];

    const rows = analysisData.reasons.map(reason => [
      reason.reason,
      reason.count,
      `${reason.percentage.toFixed(1)}%`,
      `${(reason.trend * 100).toFixed(1)}%`,
      `${Math.round(reason.avgResponseTime)} min`,
      reason.technicians.length,
      reason.locations.length,
      reason.recentIncidents.length
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  // Fetch hourly activity distribution data from new dedicated endpoint
  const fetchHourlyActivityData = async (filterData = null, timeRange = hourlyActivityTimeRange) => {
    setHourlyActivityLoading(true);
    setHourlyActivityError(null);
    try {
      const params = new URLSearchParams();

      // Add time range parameter
      params.append('timeRange', timeRange);

      // Apply filters if provided
      if (filterData) {
        if (filterData.technician && filterData.technician !== 'all') {
          params.append('technician', filterData.technician);
        }
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          params.append('municipalities', filterData.municipalities.join(','));
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/dashboard/hourly-activity-distribution?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch hourly activity distribution data');

      const data = await response.json();

      // The API now returns properly structured hourly activity data
      setHourlyActivityData(data.data || []);
    } catch (error) {
      console.error('Error fetching hourly activity data:', error);
      setHourlyActivityError(error.message || 'Greška pri učitavanju podataka o aktivnostima');
      // Generate mock data for demonstration if API fails
      setHourlyActivityData(generateMockHourlyActivityData());
    } finally {
      setHourlyActivityLoading(false);
    }
  };


  // Generate mock hourly activity data for demonstration
  const generateMockHourlyActivityData = () => {
    const actions = [
      'workorder_finished', 'workorder_created', 'workorder_assigned', 'material_added',
      'equipment_added', 'comment_added', 'image_added', 'workorder_status_changed'
    ];
    const activityTypes = [
      'Rad sa nalozima', 'Upravljanje statusom', 'Materijali', 'Oprema', 'Dokumentacija'
    ];
    const priorities = ['high', 'medium', 'low', 'normal'];
    const technicians = ['Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović', 'Ana Milić'];
    const municipalities = ['Beograd', 'Novi Sad', 'Zemun', 'Novi Beograd', 'Zvezdara', 'Vračar', 'Stari Grad'];
    const workOrderTypes = ['Instalacija', 'Servis', 'Dijagnostika', 'Održavanje'];
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const mockData = [];
    const now = new Date();

    // Generate activities across different hours and days
    for (let i = 0; i < 500; i++) {
      const randomDate = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);

      // Bias towards working hours (8-18)
      const isWorkingHours = Math.random() < 0.7;
      if (isWorkingHours) {
        randomDate.setHours(8 + Math.floor(Math.random() * 10)); // 8-17
      } else {
        randomDate.setHours(Math.floor(Math.random() * 24)); // Any hour
      }

      const action = actions[Math.floor(Math.random() * actions.length)];

      mockData.push({
        id: `activity-${i}`,
        timestamp: randomDate.toISOString(),
        hour: randomDate.getHours(),
        dayOfWeek: daysOfWeek[randomDate.getDay()],
        technician: technicians[Math.floor(Math.random() * technicians.length)],
        municipality: municipalities[Math.floor(Math.random() * municipalities.length)],
        address: `Test adresa ${i + 1}`,
        workOrderId: `wo-${2000 + i}`,
        tisJobId: `TIS-${20000 + i}`,
        action: action,
        activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        activityPriority: priorities[Math.floor(Math.random() * priorities.length)],
        description: `Mock description for ${action}`,
        responseTime: Math.random() * 180 + 15, // 15-195 minutes
        workOrderType: workOrderTypes[Math.floor(Math.random() * workOrderTypes.length)],
        userName: `Korisnik ${i + 1}`
      });
    }

    return mockData;
  };

  // Handle hourly activity time range change
  const handleHourlyActivityTimeRangeChange = (timeRange) => {
    setHourlyActivityTimeRange(timeRange);
    fetchHourlyActivityData(null, timeRange);
  };

  // Handle hourly activity refresh
  const handleHourlyActivityRefresh = () => {
    fetchHourlyActivityData(null, hourlyActivityTimeRange);
  };

  // Handle hourly activity export
  const handleHourlyActivityExport = (analysisData) => {
    const csvContent = convertHourlyActivityDataToCSV(analysisData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `distribucija-aktivnosti-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Convert hourly activity analysis data to CSV
  const convertHourlyActivityDataToCSV = (analysisData) => {
    const headers = [
      'Sat',
      'Period',
      'Broj aktivnosti',
      'Procenat',
      'Broj tehničara',
      'Broj opština',
      'Prosečno vreme odgovora'
    ];

    const rows = analysisData.hourlyData.map(hour => [
      `${hour.hour.toString().padStart(2, '0')}:00`,
      hour.hour >= 6 && hour.hour < 12 ? 'Jutro' :
      hour.hour >= 12 && hour.hour < 18 ? 'Popodne' :
      hour.hour >= 18 && hour.hour < 24 ? 'Veče' : 'Noć',
      hour.totalActivities,
      `${hour.percentage.toFixed(1)}%`,
      hour.technicians.length,
      hour.municipalities.length,
      hour.averageResponseTime > 0 ? `${Math.round(hour.averageResponseTime)} min` : 'N/A'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  // Fetch map data for geographic visualization
  // Fetch interactive map data from new dedicated endpoint
  const fetchMapData = async (filterData = null, timeRange = mapTimeRange) => {
    setMapLoading(true);
    setMapError(null);
    try {
      const params = new URLSearchParams();

      // Add time range parameter
      params.append('timeRange', timeRange);

      // Apply filters if provided
      if (filterData) {
        if (filterData.technician && filterData.technician !== 'all') {
          params.append('technician', filterData.technician);
        }
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          params.append('municipalities', filterData.municipalities.join(','));
        }
        if (filterData.activityType && filterData.activityType !== 'all') {
          params.append('activityType', filterData.activityType);
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/dashboard/interactive-map?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch interactive map data');

      const data = await response.json();

      // The API now returns properly structured map data
      setMapData(data.data || []);
    } catch (error) {
      console.error('Error fetching map data:', error);
      setMapError(error.message || 'Greška pri učitavanju mape aktivnosti');
      // Generate mock data for demonstration if API fails
      setMapData(generateMockMapData());
    } finally {
      setMapLoading(false);
    }
  };

  // Generate mock map data for demonstration
  const generateMockMapData = () => {
    const actions = [
      'workorder_finished', 'workorder_created', 'workorder_assigned', 'material_added',
      'equipment_added', 'comment_added', 'image_added', 'workorder_status_changed',
      'workorder_cancelled', 'workorder_postponed'
    ];
    const activityTypes = [
      'Radni nalozi', 'Materijali', 'Oprema', 'Dokumentacija', 'Status promene'
    ];
    const priorities = ['high', 'medium', 'low', 'normal'];
    const statuses = ['zavrsen', 'nezavrsen', 'otkazan', 'odlozen'];
    const types = ['Instalacija', 'Servis', 'Dijagnostika', 'Održavanje'];
    const technicians = ['Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović', 'Ana Milić', 'Petar Milanović'];
    const municipalities = [
      'Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Novi Pazar',
      'Zemun', 'Pančevo', 'Čačak', 'Novi Beograd', 'Zvezdara', 'Vračar', 'Stari Grad', 'Palilula', 'Savski Venac'
    ];

    const mockData = [];
    const now = new Date();

    // Generate activities with geographic distribution
    for (let i = 0; i < 800; i++) {
      const randomDate = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const municipality = municipalities[Math.floor(Math.random() * municipalities.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];

      mockData.push({
        id: `map-activity-${i}`,
        timestamp: randomDate.toISOString(),
        municipality,
        address: `Mock adresa ${i + 1}, ${municipality}`,
        technician: technicians[Math.floor(Math.random() * technicians.length)],
        userName: `Korisnik ${i + 1}`,
        action: action,
        activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        type: types[Math.floor(Math.random() * types.length)],
        responseTime: Math.random() * 180 + 15, // 15-195 minutes
        workOrderId: `wo-${3000 + i}`,
        description: `Mock description for ${action}`,
        source: Math.random() > 0.5 ? 'workorder' : 'log'
      });
    }

    return mockData;
  };

  // Handle map time range change
  const handleMapTimeRangeChange = (timeRange) => {
    setMapTimeRange(timeRange);
    fetchMapData(null, timeRange);
  };

  // Handle map refresh
  const handleMapRefresh = () => {
    fetchMapData(null, mapTimeRange);
  };

  // Handle map export
  const handleMapExport = (analysisData) => {
    const csvContent = convertMapDataToCSV(analysisData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mapa-aktivnosti-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle map location click
  const handleMapLocationClick = (locationData) => {
    // Open drill-down with location-specific data
    handleChartClick({
      chartType: 'location',
      segment: 'municipality',
      municipality: locationData.municipality,
      label: `Opština - ${locationData.municipality}`,
      value: locationData.activities,
      additionalFilters: {
        startDate: effectiveDateRange.startDate?.toISOString(),
        endDate: effectiveDateRange.endDate?.toISOString(),
        municipality: locationData.municipality
      }
    });
  };

  // Convert map analysis data to CSV
  const convertMapDataToCSV = (analysisData) => {
    const headers = [
      'Opština',
      'Region',
      'Broj aktivnosti',
      'Broj tehničara',
      'Prosečno vreme odgovora',
      'Stopa završavanja',
      'Stopa hitnosti',
      'Trend',
      'Gustina'
    ];

    const rows = analysisData.municipalityData.map(municipality => [
      municipality.municipality,
      municipality.coordinates.region,
      municipality.totalActivities,
      municipality.technicians.length,
      `${Math.round(municipality.averageResponseTime)} min`,
      `${municipality.completionRate.toFixed(1)}%`,
      `${municipality.urgencyRate.toFixed(1)}%`,
      `${(municipality.trend * 100).toFixed(1)}%`,
      municipality.density
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  // Fetch predictive analytics data
  const fetchPredictiveData = async (filterData = null, timeRange = predictiveTimeRange) => {
    setPredictiveLoading(true);
    setPredictiveError(null);
    try {
      const params = new URLSearchParams();

      // Calculate date range based on timeRange parameter for historical data
      const now = new Date();
      let startDate, endDate = now;

      switch (timeRange) {
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
          break;
        case '180d':
          startDate = new Date(now - 180 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      }

      // Use existing technician logs API for historical data
      params.append('dateFrom', startDate.toISOString().split('T')[0]);
      params.append('dateTo', endDate.toISOString().split('T')[0]);
      params.append('page', '1');
      params.append('limit', '10000'); // Get comprehensive data for better predictions

      // Apply additional filters if provided
      if (filterData) {
        if (filterData.technician && filterData.technician !== 'all') {
          params.append('technician', filterData.technician);
        }
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          // Filter will be applied on frontend since API doesn't support municipality filtering
        }
      }

      // Use new predictive analytics endpoint
      const predictiveParams = new URLSearchParams();
      predictiveParams.append('startDate', startDate.toISOString().split('T')[0]);
      predictiveParams.append('endDate', endDate.toISOString().split('T')[0]);
      predictiveParams.append('predictionHorizon', timeRange);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/dashboard/predictive-analytics?${predictiveParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch predictive data');

      const result = await response.json();

      if (result.success) {
        // Data is already processed by the backend
        const processedData = result.data || [];

        // Apply frontend filters if needed
        let filteredData = processedData;
        if (filterData?.municipalities?.length > 0) {
          filteredData = processedData.filter(item =>
            filterData.municipalities.includes(item.municipality)
          );
        }

        setPredictiveData(filteredData);
        console.log(`📊 Predictive Analytics: Loaded ${filteredData.length} records`, result.metadata);
      } else {
        throw new Error(result.error || 'Failed to fetch predictive data');
      }
    } catch (error) {
      console.error('Error fetching predictive data:', error);
      setPredictiveError(error.message || 'Greška pri učitavanju prediktivnih podataka');
      // Generate mock data for demonstration if API fails
      setPredictiveData(generateMockPredictiveData());
    } finally {
      setPredictiveLoading(false);
    }
  };

  // Fetch financial analysis data
  const fetchFinancialData = async (filterData = null, timeRange = financialTimeRange) => {
    setFinancialLoading(true);
    setFinancialError(null);
    try {
      const params = new URLSearchParams();

      // Add time range parameter
      params.append('timeRange', timeRange);

      // Apply filters if provided
      if (filterData) {
        if (filterData.technician && filterData.technician !== 'all') {
          params.append('technician', filterData.technician);
        }
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          params.append('municipalities', filterData.municipalities.join(','));
        }
      }

      console.log(`💰 Fetching financial data with params: ${params.toString()}`);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/dashboard/financial-analysis?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch financial analysis data');

      const data = await response.json();

      console.log(`💰 Financial data received:`, data);

      // The API returns properly structured financial data
      setFinancialData(data.data || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setFinancialError(error.message || 'Greška pri učitavanju finansijskih podataka');
      // Generate mock data for demonstration if API fails
      setFinancialData(generateMockFinancialData());
    } finally {
      setFinancialLoading(false);
    }
  };

  // Generate mock financial data for demonstration
  const generateMockFinancialData = () => {
    const serviceTypes = ['HFC', 'GPON', 'Servisne usluge', 'Novi korisnici'];
    const technicians = ['Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović', 'Ana Milić', 'Petar Milanović'];
    const municipalities = [
      'Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Novi Pazar',
      'Zemun', 'Pančevo', 'Čačak', 'Novi Beograd', 'Zvezdara', 'Vračar', 'Stari Grad'
    ];

    const mockData = [];
    const now = new Date();

    // Generate financial transactions
    for (let i = 0; i < 250; i++) {
      const randomDate = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      const basePrice = Math.floor(Math.random() * 3000) + 1500; // 1500-4500 RSD
      const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 500) : 0;
      const finalPrice = basePrice - discount;
      const technicianEarnings = Math.floor(finalPrice * 0.6); // 60% to technicians
      const companyProfit = finalPrice - technicianEarnings;

      mockData.push({
        id: `financial-${i}`,
        timestamp: randomDate.toISOString(),
        workOrderId: `wo-${4000 + i}`,
        tisJobId: `TIS-${9000 + i}`,

        // Financial data
        basePrice: basePrice,
        discountPercent: discount > 0 ? Math.floor((discount / basePrice) * 100) : 0,
        discountAmount: discount,
        finalPrice: finalPrice,
        totalTechnicianEarnings: technicianEarnings,
        companyProfit: companyProfit,
        profitMargin: (companyProfit / finalPrice) * 100,

        // Service and location data
        serviceCategory: serviceType,
        municipality: municipalities[Math.floor(Math.random() * municipalities.length)],
        address: `Mock adresa ${i + 1}`,
        userName: `Korisnik ${i + 1}`,

        // Technician data
        technician: technicians[Math.floor(Math.random() * technicians.length)],
        primaryTechnicianEarnings: technicianEarnings,

        // For compatibility with existing frontend
        revenue: finalPrice,
        cost: technicianEarnings,
        profit: companyProfit,
        service_type: serviceType,
        location: municipalities[Math.floor(Math.random() * municipalities.length)],

        // Additional data
        hasDiscount: discount > 0,
        isHighValue: finalPrice > 3500
      });
    }

    return mockData;
  };

  // Handle financial time range change
  const handleFinancialTimeRangeChange = (timeRange) => {
    setFinancialTimeRange(timeRange);
    fetchFinancialData(null, timeRange);
  };

  // Handle financial refresh
  const handleFinancialRefresh = () => {
    fetchFinancialData(null, financialTimeRange);
  };

  // Handle financial export
  const handleFinancialExport = (financialData) => {
    const csvContent = convertFinancialDataToCSV(financialData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `finansijska-analiza-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Convert financial data to CSV for export
  const convertFinancialDataToCSV = (data) => {
    if (!data || data.length === 0) {
      return 'Nema podataka za izvoz\n';
    }

    const headers = [
      'ID', 'Datum', 'Tehničar', 'Opština', 'Korisnik',
      'Tip usluge', 'Osnovna cena', 'Popust', 'Finalna cena',
      'Zarada tehničara', 'Profit kompanije', 'Marža profita (%)',
      'TIS Job ID', 'Adresa'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = [
        item.id || '',
        item.timestamp ? new Date(item.timestamp).toLocaleDateString('sr-RS') : '',
        item.technician || 'N/A',
        item.municipality || 'N/A',
        item.userName || 'N/A',
        item.serviceCategory || item.service_type || 'N/A',
        item.basePrice || item.revenue || 0,
        item.discountAmount || 0,
        item.finalPrice || item.revenue || 0,
        item.totalTechnicianEarnings || item.cost || 0,
        item.companyProfit || item.profit || 0,
        item.profitMargin ? item.profitMargin.toFixed(2) : '0.00',
        item.tisJobId || 'N/A',
        item.address || 'N/A'
      ];

      csvRows.push(row.map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','));
    });

    return csvRows.join('\n');
  };

  // Fetch technician comparison data
  const fetchTechnicianComparisonData = async (filterData = null, timeRange = technicianComparisonTimeRange) => {
    setTechnicianComparisonLoading(true);
    setTechnicianComparisonError(null);
    try {
      const params = new URLSearchParams();

      // Add time range parameter
      params.append('timeRange', timeRange);

      // Add includeInactive parameter (only show active technicians by default)
      params.append('includeInactive', 'false');

      // Apply filters if provided
      if (filterData) {
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          params.append('municipalities', filterData.municipalities.join(','));
        }
      }

      console.log(`👥 Fetching technician comparison data with params: ${params.toString()}`);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/dashboard/technician-comparison?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch technician comparison data');

      const data = await response.json();

      console.log(`👥 Technician comparison data received:`, data);

      // The API returns properly structured technician data
      setTechnicianComparisonData(data.technicians || []);
    } catch (error) {
      console.error('Error fetching technician comparison data:', error);
      setTechnicianComparisonError(error.message || 'Greška pri učitavanju podataka za poređenje tehničara');
      // Generate mock data for demonstration if API fails
      setTechnicianComparisonData(generateMockTechnicianComparisonData());
    } finally {
      setTechnicianComparisonLoading(false);
    }
  };

  // Generate mock technician comparison data for demonstration
  const generateMockTechnicianComparisonData = () => {
    const technicians = [
      'Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović',
      'Ana Milić', 'Petar Milanović', 'Milica Radović',
      'Nikola Stojanović', 'Jelena Pavlović', 'Milan Đorđević'
    ];

    const serviceTypes = ['Instalacija', 'Servis', 'Dijagnostika', 'Održavanje'];
    const municipalities = [
      'Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Novi Pazar',
      'Zemun', 'Pančevo', 'Čačak', 'Novi Beograd', 'Zvezdara', 'Vračar'
    ];

    const mockData = technicians.map((name, index) => {
      const totalWorkOrders = Math.floor(Math.random() * 150) + 50; // 50-200 work orders
      const completedWorkOrders = Math.floor(totalWorkOrders * (0.6 + Math.random() * 0.35)); // 60-95% success rate
      const totalActivities = Math.floor(Math.random() * 500) + 200; // 200-700 activities
      const totalEarnings = Math.floor(Math.random() * 80000) + 30000; // 30k-110k RSD
      const avgResponseTime = Math.random() * 48 + 2; // 2-50 hours

      // Create work days
      const workDays = [];
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        if (Math.random() > 0.3) { // 70% chance of working each day
          const workDate = new Date(now - i * 24 * 60 * 60 * 1000);
          workDays.push(workDate.toISOString().split('T')[0]);
        }
      }

      // Create municipality distribution
      const techMunicipalities = {};
      const numMunicipalities = Math.floor(Math.random() * 5) + 2; // 2-6 municipalities
      for (let i = 0; i < numMunicipalities; i++) {
        const municipality = municipalities[Math.floor(Math.random() * municipalities.length)];
        techMunicipalities[municipality] = Math.floor(Math.random() * 30) + 5;
      }

      // Create service type distribution
      const techServiceTypes = {};
      serviceTypes.forEach(type => {
        if (Math.random() > 0.3) {
          techServiceTypes[type] = Math.floor(Math.random() * 40) + 5;
        }
      });

      const successRate = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0;
      const performanceScore = Math.min(100,
        (successRate * 0.4) +
        (Math.max(0, 100 - avgResponseTime) * 0.3) +
        (Math.min(100, totalActivities / 5) * 0.3)
      );

      return {
        id: `tech-${index}`,
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        role: index < 2 ? 'admin' : 'technician',

        // Work Order Statistics
        totalWorkOrders,
        completedWorkOrders,
        cancelledWorkOrders: Math.floor(totalWorkOrders * 0.05 + Math.random() * 0.1), // 5-15% cancelled
        postponedWorkOrders: Math.floor(totalWorkOrders * 0.02 + Math.random() * 0.05), // 2-7% postponed
        overdueWorkOrders: Math.floor(totalWorkOrders * 0.03 + Math.random() * 0.07), // 3-10% overdue

        // Performance Metrics
        successRate,
        avgResponseTime,
        totalResponseTime: avgResponseTime * completedWorkOrders,
        responseTimeCount: completedWorkOrders,

        // Activity Metrics
        totalActivities,
        activeDays: workDays.length,
        workDays,

        // Financial Metrics
        totalEarnings,
        totalTransactions: Math.floor(completedWorkOrders * 0.8), // 80% of completed orders have financial data
        avgEarningsPerTransaction: totalEarnings / Math.max(1, Math.floor(completedWorkOrders * 0.8)),
        profitGenerated: totalEarnings * 1.5, // Company profit is typically 1.5x technician earnings

        // Location Distribution
        municipalities: techMunicipalities,
        serviceTypes: techServiceTypes,

        // Time Analysis
        firstActivity: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),

        // Ranking Metrics
        rank: index + 1,
        performanceScore,
        trend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',

        // For compatibility with existing component
        worker: name,
        technician: name
      };
    });

    // Sort by performance score
    return mockData.sort((a, b) => b.performanceScore - a.performanceScore)
      .map((tech, index) => ({ ...tech, rank: index + 1 }));
  };

  // Handle technician comparison time range change
  const handleTechnicianComparisonTimeRangeChange = (timeRange) => {
    setTechnicianComparisonTimeRange(timeRange);
    fetchTechnicianComparisonData(null, timeRange);
  };

  // Handle technician comparison refresh
  const handleTechnicianComparisonRefresh = () => {
    fetchTechnicianComparisonData(null, technicianComparisonTimeRange);
  };

  // Handle technician comparison export
  const handleTechnicianComparisonExport = (technicianData) => {
    const csvContent = convertTechnicianComparisonDataToCSV(technicianData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `poredenje-tehnicara-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Convert technician comparison data to CSV for export
  const convertTechnicianComparisonDataToCSV = (data) => {
    if (!data || data.length === 0) {
      return 'Nema podataka za izvoz\n';
    }

    const headers = [
      'Rank', 'Ime', 'Email', 'Uloga', 'Ukupno radnih naloga', 'Završeno',
      'Otkazano', 'Odloženo', 'Stopa uspešnosti (%)', 'Prosečno vreme odgovora (h)',
      'Ukupne aktivnosti', 'Aktivni dani', 'Ukupne zarade (RSD)',
      'Prosečna zarada po transakciji', 'Profit generisan', 'Performance Score',
      'Trend', 'Najčešća opština', 'Najčešći tip usluge'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(technician => {
      // Find most common municipality and service type
      const topMunicipality = Object.entries(technician.municipalities || {})
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
      const topServiceType = Object.entries(technician.serviceTypes || {})
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      const row = [
        technician.rank || 0,
        technician.name || 'N/A',
        technician.email || 'N/A',
        technician.role || 'technician',
        technician.totalWorkOrders || 0,
        technician.completedWorkOrders || 0,
        technician.cancelledWorkOrders || 0,
        technician.postponedWorkOrders || 0,
        technician.successRate ? technician.successRate.toFixed(2) : '0.00',
        technician.avgResponseTime ? technician.avgResponseTime.toFixed(2) : '0.00',
        technician.totalActivities || 0,
        technician.activeDays || 0,
        technician.totalEarnings || 0,
        technician.avgEarningsPerTransaction ? technician.avgEarningsPerTransaction.toFixed(2) : '0.00',
        technician.profitGenerated || 0,
        technician.performanceScore ? technician.performanceScore.toFixed(2) : '0.00',
        technician.trend || 'stable',
        topMunicipality,
        topServiceType
      ];

      csvRows.push(row.map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','));
    });

    return csvRows.join('\n');
  };

  // Process logs for predictive analysis
  const processPredictiveAnalysisLogs = (logs, filterData) => {
    // Apply municipality filter if provided
    let filteredLogs = logs;
    if (filterData && filterData.municipalities && filterData.municipalities.length > 0) {
      filteredLogs = logs.filter(log => filterData.municipalities.includes(log.municipality));
    }

    // Add additional processing to create prediction-ready activity records
    return filteredLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      technician: log.technician,
      municipality: log.municipality,
      workOrderId: log.workOrderId || `WO-${log.id}`,
      action: log.action,
      activityType: log.action || 'General Activity',
      responseTime: Math.random() * 120 + 15, // Mock response time for demo
      status: log.status || 'completed',
      priority: Math.random() > 0.8 ? 'urgent' : 'normal', // Mock priority
      urgent: Math.random() > 0.8, // Mock urgent flag
      completedAt: log.timestamp,
      duration: Math.random() * 240 + 30, // Mock duration for predictions
      complexity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
    }));
  };

  // Generate mock predictive data for demonstration
  const generateMockPredictiveData = () => {
    const activities = [
      'Instalacija', 'Servis', 'Dijagnostika', 'Održavanje', 'Zamena opreme',
      'Konfiguracija', 'Tehnička podrška', 'Pregled kvaliteta', 'Otklanjanje kvara'
    ];
    const technicians = ['Marko Petrović', 'Jovana Nikolić', 'Stefan Jovanović', 'Ana Milić', 'Petar Milanović'];
    const municipalities = [
      'Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Novi Pazar',
      'Zemun', 'Pančevo', 'Čačak', 'Novi Beograd', 'Zvezdara', 'Vračar', 'Stari Grad'
    ];

    const mockData = [];
    const now = new Date();

    // Generate historical data for better predictions (last 60 days)
    for (let i = 0; i < 1200; i++) {
      const randomDate = new Date(now - Math.random() * 60 * 24 * 60 * 60 * 1000);

      // Create realistic patterns (more work on weekdays, seasonal variations)
      const dayOfWeek = randomDate.getDay();
      let workloadMultiplier = 1;

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        workloadMultiplier = 0.3; // Weekend reduced workload
      } else if (dayOfWeek === 1 || dayOfWeek === 5) {
        workloadMultiplier = 1.2; // Monday/Friday slightly higher
      }

      // Skip some entries to create realistic gaps
      if (Math.random() > workloadMultiplier) continue;

      mockData.push({
        id: `pred-activity-${i}`,
        timestamp: randomDate.toISOString(),
        technician: technicians[Math.floor(Math.random() * technicians.length)],
        municipality: municipalities[Math.floor(Math.random() * municipalities.length)],
        workOrderId: `WO-${4000 + i}`,
        action: activities[Math.floor(Math.random() * activities.length)],
        activityType: activities[Math.floor(Math.random() * activities.length)],
        responseTime: Math.random() * 120 + 15,
        status: Math.random() > 0.1 ? 'completed' : 'in_progress',
        priority: Math.random() > 0.75 ? 'urgent' : 'normal',
        urgent: Math.random() > 0.8,
        completedAt: randomDate.toISOString(),
        duration: Math.random() * 240 + 30,
        complexity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
      });
    }

    return mockData;
  };

  // Handle predictive analytics time range change
  const handlePredictiveTimeRangeChange = (timeRange) => {
    setPredictiveTimeRange(timeRange);
    fetchPredictiveData(null, timeRange);
  };

  // Handle predictive analytics refresh
  const handlePredictiveRefresh = () => {
    fetchPredictiveData(null, predictiveTimeRange);
  };

  // Handle predictive analytics export
  const handlePredictiveExport = (analysisData) => {
    const csvContent = convertPredictiveDataToCSV(analysisData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `prediktivna-analiza-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Convert predictive analysis data to CSV
  const convertPredictiveDataToCSV = (analysisData) => {
    const headers = [
      'Datum',
      'Predviđeno naloga',
      'Potrebno tehničara',
      'Vreme odgovora',
      'Pouzdanost',
      'Dan u nedelji'
    ];

    const rows = analysisData.predictions?.map(prediction => [
      prediction.date,
      prediction.predictedWorkOrders,
      prediction.predictedTechnicians,
      `${Math.round(prediction.predictedResponseTime)} min`,
      `${prediction.confidence.toFixed(1)}%`,
      prediction.dayOfWeek
    ]) || [];

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  // Process activity data for the chart
  const activityChartData = useMemo(() => {
    const processedData = processActivityData(technicianLogs, userLogs, activityPeriod);
    return processedData;
  }, [technicianLogs, userLogs, activityPeriod]);

  // Get filter options for activity chart
  const activityFilterOptions = useMemo(() => getActivityFilterOptions(), []);

  // Fetch completion time analytics with global filters
  const fetchCompletionTimeData = async (filterData = null) => {
    setCompletionTimeLoading(true);
    try {
      const params = new URLSearchParams();

      if (filterData) {
        // Use global filters
        if (filterData.startDate) params.append('startDate', filterData.startDate.toISOString());
        if (filterData.endDate) params.append('endDate', filterData.endDate.toISOString());
        if (filterData.technician && filterData.technician !== 'all') params.append('technician', filterData.technician);
        if (filterData.municipalities && filterData.municipalities.length > 0) {
          params.append('municipalities', filterData.municipalities.join(','));
        }
        if (filterData.serviceType && filterData.serviceType !== 'all') params.append('serviceType', filterData.serviceType);
        if (filterData.actionType && filterData.actionType !== 'all') params.append('actionType', filterData.actionType);
        if (filterData.status && filterData.status !== 'all') params.append('status', filterData.status);
        if (filterData.priority && filterData.priority !== 'all') params.append('priority', filterData.priority);

        // Add comparison period if enabled
        if (filterData.comparisonDateRange) {
          params.append('comparisonStart', filterData.comparisonDateRange.startDate.toISOString());
          params.append('comparisonEnd', filterData.comparisonDateRange.endDate.toISOString());
        }
      } else {
        // Fallback to legacy period parameter
        if (completionTimePeriod !== 'all') params.append('period', completionTimePeriod);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/workorders/statistics/completion-time?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch completion time data');

      const data = await response.json();
      setCompletionTimeData(data);
    } catch (error) {
      console.error('Error fetching completion time data:', error);
      setCompletionTimeData(null);
    } finally {
      setCompletionTimeLoading(false);
    }
  };

  // Load completion time data on mount and when period changes
  useEffect(() => {
    fetchCompletionTimeData(completionTimePeriod);
  }, [completionTimePeriod]);

  // Load cancellation data on mount
  useEffect(() => {
    fetchCancellationData();
  }, []);

  // Load hourly activity data on mount
  useEffect(() => {
    fetchHourlyActivityData();
  }, []);

  // Load map data on mount
  useEffect(() => {
    fetchMapData();
  }, []);

  // Load predictive data on mount
  useEffect(() => {
    fetchPredictiveData();
  }, []);

  // Load financial data on mount
  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Load technician comparison data on mount
  useEffect(() => {
    fetchTechnicianComparisonData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Global Dashboard Filters */}
      <GlobalDashboardFilters
        filters={filters}
        loading={filtersLoading || dashboardLoading}
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

      {/* KPI Trend Cards - Only show when comparison is enabled */}
      {filterSummary.comparisonEnabled && (
        <div className="col-span-full">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <TrendingUpIcon size={20} className="mr-2 text-blue-600" />
              Ključni indikatori performansi sa trendovima
            </h3>
            <p className="text-slate-600 text-sm mt-1">
              Poređenje trenutnog perioda sa prethodnim periodom
            </p>
          </div>

          <KPITrendCards
            kpiData={kpiData}
            loading={trendLoading}
            comparisonEnabled={filterSummary.comparisonEnabled}
            className="mb-6"
          />
        </div>
      )}

      {/* Trend Charts - Only show when trends are enabled and comparison data exists */}
      {filterSummary.showTrends && filterSummary.comparisonEnabled && trendChartsData.length > 0 && (
        <div className="col-span-full">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <ChartIcon size={20} className="mr-2 text-purple-600" />
              Trendski grafici
            </h3>
            <p className="text-slate-600 text-sm mt-1">
              Detaljan pregled trendova tokom vremena
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {trendChartsData.map((chartData, index) => (
              <TrendChart
                key={chartData.id || index}
                title={chartData.title}
                subtitle={chartData.subtitle}
                currentPeriodData={chartData.currentPeriodData || []}
                previousPeriodData={chartData.previousPeriodData || []}
                metric={chartData.metric || 'value'}
                showComparison={true}
                color={chartData.color || 'blue'}
                className="h-80"
              />
            ))}
          </div>
        </div>
      )}

      {/* Cancellation Analysis */}
      <div className="col-span-full">
        <CancellationAnalysis
          data={cancellationData}
          loading={cancellationLoading}
          error={cancellationError}
          timeRange={cancellationTimeRange}
          onTimeRangeChange={handleCancellationTimeRangeChange}
          onRefresh={handleCancellationRefresh}
          onExport={handleCancellationExport}
          className="mb-6"
        />
      </div>

      {/* Hourly Activity Distribution */}
      <div className="col-span-full">
        <HourlyActivityDistribution
          data={hourlyActivityData}
          loading={hourlyActivityLoading}
          error={hourlyActivityError}
          timeRange={hourlyActivityTimeRange}
          onTimeRangeChange={handleHourlyActivityTimeRangeChange}
          onRefresh={handleHourlyActivityRefresh}
          onExport={handleHourlyActivityExport}
          className="mb-6"
        />
      </div>

      {/* Interactive Activity Map */}
      <div className="col-span-full">
        <InteractiveActivityMap
          data={mapData}
          loading={mapLoading}
          error={mapError}
          timeRange={mapTimeRange}
          onTimeRangeChange={handleMapTimeRangeChange}
          onRefresh={handleMapRefresh}
          onExport={handleMapExport}
          onLocationClick={handleMapLocationClick}
          className="mb-6"
        />
      </div>

      {/* Real-time Alerts */}
      <div className="col-span-full">
        <RealTimeAlerts
          data={[...technicianLogs, ...userLogs]}
          loading={dashboardLoading}
          onRefresh={() => {
            // Refresh dashboard data
            fetchCancellationData();
            fetchHourlyActivityData();
            fetchMapData();
            fetchPredictiveData();
          }}
          onAlertAction={(alert, action) => {
            console.log('Alert action:', alert, action);
            // Handle alert actions (escalate, dismiss, etc.)
          }}
          className="mb-6"
        />
      </div>

      {/* Financial Analysis */}
      <div className="col-span-full">
        <FinancialAnalysis
          data={financialData}
          loading={financialLoading}
          error={financialError}
          timeRange={financialTimeRange}
          onTimeRangeChange={handleFinancialTimeRangeChange}
          onRefresh={handleFinancialRefresh}
          onExport={handleFinancialExport}
          className="mb-6"
        />
      </div>

      {/* Technician Comparison */}
      <div className="col-span-full">
        <TechnicianComparison
          data={technicianComparisonData}
          loading={technicianComparisonLoading}
          error={technicianComparisonError}
          timeRange={technicianComparisonTimeRange}
          onTimeRangeChange={handleTechnicianComparisonTimeRangeChange}
          onRefresh={handleTechnicianComparisonRefresh}
          onExport={handleTechnicianComparisonExport}
          className="mb-6"
        />
      </div>

      {/* Anomaly Detection */}
      <div className="col-span-full">
        <AnomalyDetection
          data={[...technicianLogs, ...userLogs]}
          loading={dashboardLoading}
          onRefresh={() => {
            fetchCancellationData();
            fetchHourlyActivityData();
            fetchMapData();
            fetchPredictiveData();
          }}
          onExport={(data) => {
            console.log('Exporting anomaly data:', data);
            // Handle anomaly data export
          }}
          onAnomalyClick={(anomaly) => {
            console.log('Anomaly clicked:', anomaly);
            // Handle anomaly details view
          }}
          className="mb-6"
        />
      </div>

      {/* Predictive Analytics */}
      <div className="col-span-full">
        <PredictiveAnalytics
          data={predictiveData}
          loading={predictiveLoading}
          error={predictiveError}
          timeRange={predictiveTimeRange}
          onTimeRangeChange={handlePredictiveTimeRangeChange}
          onRefresh={handlePredictiveRefresh}
          onExport={handlePredictiveExport}
          className="mb-6"
        />
      </div>

      {/* Daily Activity Chart - Full Width */}
      <div className="col-span-full">
        <TotalSalesChart
          data={activityChartData}
          title="Dnevne aktivnosti na aplikaciji"
          description="Pregled svih aktivnosti korisnika i tehničara na aplikaciji grupisan po danima"
          filterOptions={activityFilterOptions}
          className="w-full"
          onFilterChange={({ period, actionFilter }) => {
            // Update activity chart period instantly
            if (period && period !== activityPeriod) {
              setActivityPeriod(period);
            }
          }}
          onChartClick={(chartData) => {
            // Enable drill-down on chart click
            handleChartClick({
              ...chartData,
              chartType: 'activity',
              additionalFilters: {
                startDate: effectiveDateRange.startDate?.toISOString(),
                endDate: effectiveDateRange.endDate?.toISOString(),
                ...filterSummary
              }
            });
          }}
          enableDrilldown={isDrilldownAvailable('activity')}
        />
      </div>

      {/* Completion Time Analytics - Full Width */}
      <div className="col-span-full">
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <ClockIcon size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Analitika vremena završavanja radnih naloga</h3>
                  <p className="text-slate-600 mt-1">Praćenje vremena od zakazanog termina do prvog menjanja statusa</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Period Filter */}
                <select
                  value={completionTimePeriod}
                  onChange={(e) => setCompletionTimePeriod(e.target.value)}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                  disabled={completionTimeLoading}
                >
                  <option value="danas">Danas</option>
                  <option value="nedelja">Ova nedelja</option>
                  <option value="mesec">Ovaj mesec</option>
                  <option value="kvartal">Ovaj kvartal</option>
                  <option value="godina">Ova godina</option>
                  <option value="all">Sve od početka</option>
                </select>

                {/* Refresh Button */}
                <Button
                  type="secondary"
                  size="small"
                  prefix={<RefreshIcon size={16} />}
                  onClick={() => fetchCompletionTimeData(completionTimePeriod)}
                  disabled={completionTimeLoading}
                >
                  Osvježi
                </Button>
              </div>
            </div>
          </div>

          {completionTimeLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4 mx-auto"></div>
              <p className="text-slate-600 font-medium">Učitava analitiku vremena...</p>
            </div>
          ) : completionTimeData ? (
            <div className="p-6">
              {/* Overall Statistics */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <BarChartIcon size={18} className="mr-2 text-purple-600" />
                  {selectedTechnician === 'all' ? 'Ukupna statistika' : `Statistika za ${selectedTechnician}`}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Prosečno vreme</p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{completionTimeData.overall.avgCompletionTime}h</h3>
                      </div>
                      <div className="p-2 bg-purple-200 rounded-lg">
                        <ClockIcon size={20} className="text-purple-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Najbrže vreme</p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{completionTimeData.overall.minCompletionTime}h</h3>
                      </div>
                      <div className="p-2 bg-green-200 rounded-lg">
                        <TrendingUpIcon size={20} className="text-green-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Najduže vreme</p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{completionTimeData.overall.maxCompletionTime}h</h3>
                      </div>
                      <div className="p-2 bg-red-200 rounded-lg">
                        <ClockIcon size={20} className="text-red-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Ukupno naloga</p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{completionTimeData.overall.totalWorkOrders}</h3>
                      </div>
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <ChartIcon size={20} className="text-blue-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Distribucija brzine završavanja</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-green-50 to-green-100/80 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Brzi (≤ {(completionTimeData.overall.avgCompletionTime * 0.8).toFixed(1)}h)</p>
                        <p className="text-2xl font-bold text-green-800">{completionTimeData.distribution.fast}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                        <TrendingUpIcon size={20} className="text-green-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100/80 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-700">Prosečni</p>
                        <p className="text-2xl font-bold text-yellow-800">{completionTimeData.distribution.average}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                        <ClockIcon size={20} className="text-yellow-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-red-100/80 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Spori (≥ {(completionTimeData.overall.avgCompletionTime * 1.2).toFixed(1)}h)</p>
                        <p className="text-2xl font-bold text-red-800">{completionTimeData.distribution.slow}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                        <ClockIcon size={20} className="text-red-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technician Filter Cards */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Filter po tehničaru</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedTechnician('all')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md",
                      selectedTechnician === 'all'
                        ? "bg-purple-600 text-white shadow-lg"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-purple-50"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <HardHatIcon size={16} />
                      <span>Svi ({completionTimeData.overall.totalWorkOrders})</span>
                    </div>
                  </button>

                  {completionTimeData.technicians?.map(tech => (
                    <button
                      key={tech.name}
                      onClick={() => setSelectedTechnician(tech.name)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md",
                        selectedTechnician === tech.name
                          ? "bg-purple-600 text-white shadow-lg"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-purple-50"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          tech.efficiency === 'high' ? "bg-green-500" :
                          tech.efficiency === 'medium' ? "bg-yellow-500" : "bg-red-500"
                        )}></div>
                        <span>{tech.name} ({tech.totalWorkOrders})</span>
                        <span className="text-xs opacity-75">{tech.avgCompletionTime}h</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Technician Details Table */}
              {completionTimeData.technicians && completionTimeData.technicians.length > 0 && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-900">Detaljni pregled po tehničarima</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tehničar</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Prosečno vreme</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Min vreme</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Max vreme</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Ukupno naloga</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Efikasnost</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">tisJobIds</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {completionTimeData.technicians
                          .filter(tech => selectedTechnician === 'all' || tech.name === selectedTechnician)
                          .map((tech, index) => (
                          <tr
                            key={tech.name}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => handleChartClick({
                              chartType: 'completion_time',
                              segment: 'technician',
                              technician: tech.name,
                              label: `Tehničar - ${tech.name}`,
                              value: tech.totalWorkOrders,
                              additionalFilters: {
                                startDate: effectiveDateRange.startDate?.toISOString(),
                                endDate: effectiveDateRange.endDate?.toISOString(),
                                technician: tech.name
                              }
                            })}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <HardHatIcon size={16} className="text-purple-600" />
                                  </div>
                                </div>
                                <span className="font-medium text-slate-900">{tech.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-900">{tech.avgCompletionTime}h</td>
                            <td className="px-6 py-4 text-sm font-mono text-green-600">{tech.minCompletionTime}h</td>
                            <td className="px-6 py-4 text-sm font-mono text-red-600">{tech.maxCompletionTime}h</td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{tech.totalWorkOrders}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                tech.efficiency === 'high' ? "bg-green-100 text-green-800" :
                                tech.efficiency === 'medium' ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                              )}>
                                {tech.efficiency === 'high' ? 'Visoka' :
                                 tech.efficiency === 'medium' ? 'Srednja' : 'Niska'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-slate-600 font-mono">
                                {tech.tisJobIds && tech.tisJobIds.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {tech.tisJobIds.slice(0, 3).map((tisId, idx) => (
                                      <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                        {tisId}
                                      </span>
                                    ))}
                                    {tech.tisJobIds.length > 3 && (
                                      <span className="text-slate-400 text-xs">+{tech.tisJobIds.length - 3} više</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">N/A</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="p-3 bg-slate-50 rounded-xl mb-4 inline-flex">
                <ClockIcon size={48} className="text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema podataka</h4>
              <p className="text-slate-600">Nema radnih naloga sa zabeleženim vremenom prvog menjanja statusa za izabrani period.</p>
            </div>
          )}
        </div>
      </div>

      {/* Drill-down Modal */}
      <DrilldownModal
        isOpen={drilldownState.isOpen}
        onClose={closeDrilldown}
        title={drilldownState.title}
        subtitle={drilldownState.subtitle}
        data={drilldownState.data}
        loading={drilldownState.loading}
        error={drilldownState.error}
        filterCriteria={drilldownState.filterCriteria}
        onViewDetails={handleViewDetails}
        onExportData={handleExportData}
      />
    </div>
  );
};

export default DashboardSection;