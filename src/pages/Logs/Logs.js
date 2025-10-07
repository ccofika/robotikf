import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { logsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  SearchIcon,
  HardHatIcon,
  UsersIcon,
  FilterIcon,
  ClockIcon,
  ChartIcon,
  BarChartIcon,
  TableIcon,
  TrendingUpIcon,
  RefreshIcon,
  CalendarIcon,
  MaterialIcon,
  EquipmentIcon,
  CommentIcon,
  ImageIcon,
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  SettingsIcon,
  BellIcon,
  PlayIcon,
  PauseIcon,
  TrendingDownIcon,
  ActivityIcon,
  ZapIcon,
  FileIcon,
  InfoIcon,
  XIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { cn } from '../../utils/cn';

// Import the component sections
import DashboardSection from './components/DashboardSectionNew';
import TechnicianLogsSection from './components/TechnicianLogsSection';
import UserLogsSection from './components/UserLogsSection';

const Logs = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const [technicianLogs, setTechnicianLogs] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search and filter states with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // New UX state for improvements
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [previousStats, setPreviousStats] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({ queryTime: 0, cacheHit: false });

  // FAZA 2 - Advanced Features State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDateRange, setExportDateRange] = useState('current');
  const [settings, setSettings] = useState({
    itemsPerPage: 50,
    autoRefreshInterval: 30000,
    showMiniCharts: true,
    compactView: false,
    enableNotifications: true,
    soundEnabled: false
  });

  // Server-side pagination state for technician logs
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });

  // Server-side pagination state for user logs
  const [userPagination, setUserPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [userPerformance, setUserPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });

  const [dashboardStats, setDashboardStats] = useState({
    totalLogs: 0,
    uniqueTechnicians: 0,
    logsWithMaterials: 0
  });

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Material validation specific state
  const [materialValidationData, setMaterialValidationData] = useState({
    averages: {},
    anomalies: [],
    loading: false
  });
  const [showMaterialValidation, setShowMaterialValidation] = useState(false);

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);

  // Activity chart specific logs - separate from regular logs
  const [activityChartTechnicianLogs, setActivityChartTechnicianLogs] = useState([]);
  const [activityChartUserLogs, setActivityChartUserLogs] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    technicians: [],
    municipalities: [],
    actions: []
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch dashboard stats (lightweight call)
  const fetchDashboardStats = useCallback(async () => {
    const startTime = Date.now();
    setDashboardLoading(true);
    try {
      const response = await logsAPI.getTechnicianLogs({ statsOnly: true });
      const newStats = response.data;

      // Store previous stats for trend calculation
      setPreviousStats(dashboardStats);
      setDashboardStats(newStats);

      // Update performance metrics
      setPerformanceMetrics({
        queryTime: Date.now() - startTime,
        cacheHit: (Date.now() - startTime) < 100
      });

      // Update last updated time
      setLastUpdated(new Date());

      // Check for alerts
      checkForAlerts(newStats);
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, [dashboardStats]);

  // Load technician logs with server-side pagination
  const loadTechnicianLogs = useCallback(async (page = pagination.currentPage) => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearchTerm,
        action: selectedAction,
        dateFrom,
        dateTo,
        page,
        limit: pagination.limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const response = await logsAPI.getTechnicianLogs(params);
      const { data, pagination: paginationData, performance: performanceData } = response.data;

      setTechnicianLogs(data);
      setPagination(paginationData);
      setPerformance(performanceData);

      // Update current page in state if different
      if (paginationData.currentPage !== pagination.currentPage) {
        setPagination(prev => ({ ...prev, currentPage: paginationData.currentPage }));
      }
    } catch (error) {
      console.error('Greška pri učitavanju logova tehničara:', error);
      toast.error('Greška pri učitavanju logova tehničara');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedAction, dateFrom, dateTo, pagination.limit, pagination.currentPage]);

  // Activity chart specific log loading - no filters applied
  const loadActivityChartTechnicianLogs = useCallback(async () => {
    try {
      const params = {
        search: '', // No search filter
        action: 'all', // All actions
        dateFrom: '', // No date filter
        dateTo: '', // No date filter
        page: 1,
        limit: 100 // Reduced limit for better performance
      };

      const response = await logsAPI.getTechnicianLogs(params);
      setActivityChartTechnicianLogs(response.data.data);
    } catch (error) {
      console.error('Greška pri učitavanju logova tehničara za activity chart:', error);
    }
  }, []); // No dependencies - should not be affected by any filters

  const loadActivityChartUserLogs = useCallback(async () => {
    try {
      const params = {
        search: '', // No search filter
        action: 'all', // All actions  
        dateFrom: '', // No date filter
        dateTo: '', // No date filter
        page: 1,
        limit: 100 // Reduced limit for better performance
      };

      const response = await logsAPI.getUserLogs(params);
      setActivityChartUserLogs(response.data.data);
    } catch (error) {
      console.error('Greška pri učitavanju user logova za activity chart:', error);
    }
  }, []); // No dependencies - should not be affected by any filters

  const loadUserLogs = useCallback(async (page = userPagination.currentPage) => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearchTerm,
        action: selectedAction,
        dateFrom,
        dateTo,
        page,
        limit: userPagination.limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const response = await logsAPI.getUserLogs(params);
      const { data, pagination: paginationData, performance: performanceData } = response.data;

      setUserLogs(data);
      setUserPagination(paginationData);
      setUserPerformance(performanceData);

      // Update current page in state if different
      if (paginationData.currentPage !== userPagination.currentPage) {
        setUserPagination(prev => ({ ...prev, currentPage: paginationData.currentPage }));
      }
    } catch (error) {
      console.error('Greška pri učitavanju logova korisnika:', error);
      toast.error('Greška pri učitavanju logova korisnika');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedAction, dateFrom, dateTo, userPagination.limit, userPagination.currentPage]);

  const loadActions = useCallback(async () => {
    try {
      const response = await logsAPI.getActions();
      setAvailableActions(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju akcija:', error);
    }
  }, []);

  const loadStatistics = useCallback(async () => {
    try {
      const response = await logsAPI.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju statistika:', error);
    }
  }, []);

  // Material validation functions - fixed from backup
  const loadMaterialValidationData = useCallback(async () => {
    setMaterialValidationData(prev => ({ ...prev, loading: true }));
    try {
      // Load material logs to calculate averages and detect anomalies
      const response = await logsAPI.getTechnicianLogs({
        action: 'material_added',
        limit: 1000 // Get more records for better analysis
      });
      
      const materialLogs = response.data.data.flatMap(group => 
        group.logs.filter(log => log.materialDetails)
      );
      
      // Calculate averages per material type
      const materialUsage = {};
      materialLogs.forEach(log => {
        const { materialType, quantity } = log.materialDetails;
        if (!materialUsage[materialType]) {
          materialUsage[materialType] = [];
        }
        materialUsage[materialType].push(quantity);
      });
      
      const averages = {};
      Object.keys(materialUsage).forEach(type => {
        const quantities = materialUsage[type];
        const avg = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length;
        const stdDev = Math.sqrt(
          quantities.reduce((sum, qty) => sum + Math.pow(qty - avg, 2), 0) / quantities.length
        );
        averages[type] = {
          average: avg,
          standardDeviation: stdDev,
          threshold: avg + (stdDev * 2), // 2 standard deviations above average
          totalUsages: quantities.length
        };
      });
      
      // Detect anomalies (recent material additions that exceed threshold)
      const recentLogs = materialLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return logDate >= thirtyDaysAgo;
      });
      
      const anomalies = recentLogs.filter(log => {
        const { materialType, quantity } = log.materialDetails;
        const typeAverage = averages[materialType];
        return typeAverage && quantity > typeAverage.threshold;
      }).map(log => ({
        ...log,
        severity: log.materialDetails.quantity > (averages[log.materialDetails.materialType].threshold * 1.5) ? 'high' : 'medium',
        expectedRange: `${Math.round(averages[log.materialDetails.materialType].average)} ± ${Math.round(averages[log.materialDetails.materialType].standardDeviation)}`,
        threshold: Math.round(averages[log.materialDetails.materialType].threshold)
      }));
      
      setMaterialValidationData({
        averages,
        anomalies: anomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        loading: false
      });
    } catch (error) {
      console.error('Greška pri učitavanju podataka za validaciju materijala:', error);
      toast.error('Greška pri učitavanju podataka za validaciju materijala');
      setMaterialValidationData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Dashboard functions - simplified
  const loadDashboardData = useCallback(async (filterData) => {
    setLoading(true);
    try {
      const params = {
        period: filterData.dateMode || '7d',
        technician: filterData.technician || 'all',
        municipality: Array.isArray(filterData.municipalities) && filterData.municipalities.length > 0
          ? filterData.municipalities.join(',')
          : 'all',
        action: filterData.action || 'all',
        startDate: filterData.startDate,
        endDate: filterData.endDate
      };

      // Load dashboard data from separate API endpoints
      const [kpiResponse, chartsResponse, tablesResponse] = await Promise.all([
        logsAPI.getDashboardKPI(params),
        logsAPI.getDashboardCharts(params),
        logsAPI.getDashboardTables(params)
      ]);

      setDashboardData({
        kpi: kpiResponse.data,
        charts: chartsResponse.data,
        tables: tablesResponse.data
      });
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      toast.error('Greška pri učitavanju dashboard podataka');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await logsAPI.getDashboardFilters();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opcija filtera:', error);
    }
  }, []);


  // Admin dismiss functionality
  const handleDismissWorkOrder = async (workOrderId) => {
    try {
      await logsAPI.dismissWorkOrder(workOrderId);
      toast.success('Radni nalog je uklonjen iz problematičnih');
      // Refresh dashboard data to reflect changes
      loadDashboardData();
    } catch (error) {
      console.error('Greška pri uklanjanju radnog naloga:', error);
      toast.error('Greška pri uklanjanju radnog naloga');
    }
  };

  // Handle dashboard filter changes
  const handleDashboardFiltersChange = useCallback(async (filterData) => {
    console.log('Dashboard filters changed:', filterData);
    await loadDashboardData(filterData);
  }, [loadDashboardData]);

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [pagination.totalPages]);

  const handleUserPageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= userPagination.totalPages) {
      setUserPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [userPagination.totalPages]);

  // Check for alerts based on stats
  const checkForAlerts = useCallback((stats) => {
    const newAlerts = [];

    // Check for material anomalies
    if (materialValidationData?.anomalies?.length > 0) {
      newAlerts.push({
        id: 'material-anomaly',
        type: 'warning',
        title: 'Materijal anomalija detektovana',
        message: `${materialValidationData.anomalies.length} radnih naloga sa anomalijama`,
        action: () => {
          setActiveTab('technicians');
          setShowMaterialValidation(true);
        }
      });
    }

    // Check for high activity
    if (statistics?.todayLogs > 200) {
      newAlerts.push({
        id: 'high-activity',
        type: 'info',
        title: 'Visoka aktivnost danas',
        message: `${statistics.todayLogs} logova danas`,
        action: null
      });
    }

    setAlerts(newAlerts);
  }, [materialValidationData, statistics]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardStats(),
      loadTechnicianLogs(pagination.currentPage)
    ]);
    if (activeTab === 'technicians') {
      await loadMaterialValidationData();
    }
    setIsRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    if (activeTab === 'technicians') {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [debouncedSearchTerm, selectedAction, dateFrom, dateTo, activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      setUserPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [debouncedSearchTerm, selectedAction, dateFrom, dateTo, activeTab]);

  // Fetch data when pagination or filters change (SERVER-SIDE)
  useEffect(() => {
    if (activeTab === 'technicians') {
      loadTechnicianLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.limit, debouncedSearchTerm, selectedAction, dateFrom, dateTo, activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUserLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPagination.currentPage, userPagination.limit, debouncedSearchTerm, selectedAction, dateFrom, dateTo, activeTab]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('logs_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setRefreshInterval(parsed.autoRefreshInterval);
        // Apply items per page to pagination
        setPagination(prev => ({ ...prev, limit: parsed.itemsPerPage }));
        setUserPagination(prev => ({ ...prev, limit: parsed.itemsPerPage }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Initial load - fetch dashboard stats
  useEffect(() => {
    fetchDashboardStats();
    loadActions();
    loadStatistics();
    loadFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle navigation state from notifications
  useEffect(() => {
    if (location.state?.showMaterialValidation && activeTab === 'technicians') {
      setShowMaterialValidation(true);
    }
  }, [location.state, activeTab]);

  useEffect(() => {
    if (activeTab === 'technicians') {
      loadMaterialValidationData();
    }
    // Dashboard tab loading is handled by the DashboardSection component
    // User logs are now loaded by the pagination/filter useEffect
  }, [activeTab, loadMaterialValidationData]);

  // Separate useEffect for loading logs for activity chart (only when switching to dashboard)
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Load logs for activity chart data - independent of dashboard filters
      loadActivityChartTechnicianLogs();
      loadActivityChartUserLogs();
    }
  }, [activeTab, loadActivityChartTechnicianLogs, loadActivityChartUserLogs]); // Only depends on activeTab, not on dashboard filters

  // Auto-refresh functionality
  useEffect(() => {
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        handleRefresh();
      }, refreshInterval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval]);

  // Calculate active filter count
  useEffect(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedAction !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    setActiveFilterCount(count);
  }, [searchTerm, selectedAction, dateFrom, dateTo]);

  // FAZA 2 - Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Prevent shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        // Allow Ctrl+F in input fields
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
        return;
      }

      // Global shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false);
        setShowExportModal(false);
        setShowSettings(false);
        setShowShareModal(false);
        setShowAlerts(false);
      }

      // With Ctrl/Cmd key
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'f':
            e.preventDefault();
            document.querySelector('input[type="text"]')?.focus();
            break;
          case 'r':
            e.preventDefault();
            handleRefresh();
            break;
          case 'e':
            e.preventDefault();
            setShowExportModal(true);
            break;
          case 'k':
            e.preventDefault();
            setShowKeyboardShortcuts(true);
            break;
          case ',':
            e.preventDefault();
            setShowSettings(true);
            break;
          default:
            break;
        }
      }

      // Alt key shortcuts for tab switching
      if (e.altKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            setActiveTab('dashboard');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('technicians');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('users');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Search and filter handlers
  const handleSearch = () => {
    if (activeTab === 'technicians') {
      loadTechnicianLogs(1);
    } else if (activeTab === 'users') {
      loadUserLogs(1);
    }
    // Dashboard doesn't use search functionality
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedAction('all');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => {
      if (activeTab === 'technicians') {
        loadTechnicianLogs(1);
      } else if (activeTab === 'users') {
        loadUserLogs(1);
      }
      // Dashboard doesn't use search/reset functionality
    }, 100);
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'material_added':
      case 'material_removed':
        return <MaterialIcon size={16} />;
      case 'equipment_added':
      case 'equipment_removed':
        return <EquipmentIcon size={16} />;
      case 'comment_added':
        return <CommentIcon size={16} />;
      case 'image_added':
      case 'image_removed':
        return <ImageIcon size={16} />;
      case 'workorder_finished':
        return <CheckIcon size={16} />;
      case 'workorder_cancelled':
        return <CloseIcon size={16} />;
      default:
        return <ClockIcon size={16} />;
    }
  };

  // Get action color
  const getActionColor = (action) => {
    switch (action) {
      case 'material_added':
      case 'equipment_added':
      case 'image_added':
        return 'success';
      case 'material_removed':
      case 'equipment_removed':
      case 'image_removed':
        return 'warning';
      case 'workorder_finished':
        return 'success';
      case 'workorder_cancelled':
        return 'danger';
      case 'comment_added':
        return 'info';
      default:
        return 'neutral';
    }
  };

  // Calculate trend percentage
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { percent: 0, direction: 'neutral' };
    const diff = current - previous;
    const percent = Math.round((diff / previous) * 100);
    return {
      percent: Math.abs(percent),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
    };
  };

  // Format relative time for last updated
  const getRelativeTime = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Upravo sada';
    if (seconds < 3600) return `Pre ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Pre ${Math.floor(seconds / 3600)} h`;
    return `Pre ${Math.floor(seconds / 86400)} dana`;
  };

  // FAZA 2 - Export Functions
  const handleExport = () => {
    setShowExportModal(true);
  };

  const performExport = async () => {
    try {
      // Log the current export format FIRST
      console.log('═══════════════════════════════════════════');
      console.log('🚀 performExport called');
      console.log('📋 Current exportFormat state:', exportFormat);
      console.log('📑 Active tab:', activeTab);
      console.log('═══════════════════════════════════════════');

      // Prepare data based on active tab
      let dataToExport = [];
      if (activeTab === 'technicians') {
        dataToExport = technicianLogs;
      } else if (activeTab === 'users') {
        dataToExport = userLogs;
      } else if (activeTab === 'dashboard') {
        toast.warning('Molimo prebacite se na Tehničari ili Korisnici tab pre exporta');
        return;
      }

      // Check if there's data to export
      if (!dataToExport || dataToExport.length === 0) {
        toast.warning('Nema podataka za export. Molimo učitajte podatke prvo.');
        return;
      }

      console.log('✅ Data to export:', dataToExport.length, 'groups');

      // Show loading toast
      toast.info('Pripremam podatke za export...');

      console.log('🔀 Entering switch statement with exportFormat:', exportFormat);

      // Export based on format
      switch (exportFormat) {
        case 'csv':
          console.log('➡️ Switch matched: CSV');
          exportToCSV(dataToExport);
          break;
        case 'excel':
          console.log('➡️ Switch matched: EXCEL');
          exportToExcel(dataToExport);
          break;
        case 'pdf':
          console.log('➡️ Switch matched: PDF');
          exportToPDF(dataToExport);
          break;
        case 'json':
          console.log('➡️ Switch matched: JSON');
          exportToJSON(dataToExport);
          break;
        default:
          console.log('❌ Switch DEFAULT - Unknown format:', exportFormat);
          toast.error('Nepoznat format exporta');
          return;
      }

      setShowExportModal(false);

      // Success message with delay to ensure download started
      setTimeout(() => {
        toast.success(`Podaci uspešno eksportovani u ${exportFormat.toUpperCase()} format`);
      }, 500);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Greška pri exportovanju podataka: ' + error.message);
    }
  };

  const exportToCSV = (data) => {
    console.log('🔵 exportToCSV called');
    try {
      const csv = convertToCSV(data);
      downloadFile(csv, `logs_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
      console.log('✅ CSV export completed');
    } catch (error) {
      console.error('❌ CSV Export error:', error);
      toast.error('Greška pri kreiranju CSV fajla');
    }
  };

  const exportToExcel = (data) => {
    console.log('🟢 exportToExcel called');
    try {
      // Prepare data for Excel
      const rows = data.flatMap(group =>
        (group.logs || []).map(log => ({
          'Datum': new Date(log.timestamp).toLocaleString('sr-RS'),
          'Tehničar/Korisnik': group.technicianName || group.userName || 'N/A',
          'Akcija': log.action || 'N/A',
          'Opis': log.description || 'N/A',
          'Radni Nalog': (typeof log.workOrderId === 'object' ? log.workOrderId?._id : log.workOrderId) || 'N/A',
          'Adresa': log.workOrderInfo?.address || 'N/A',
          'Opština': log.workOrderInfo?.municipality || 'N/A'
        }))
      );

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Logovi');

      // Auto-size columns
      const maxWidth = 50;
      const wscols = [
        { wch: 20 }, // Datum
        { wch: 25 }, // Tehničar/Korisnik
        { wch: 20 }, // Akcija
        { wch: maxWidth }, // Opis
        { wch: 25 }, // Radni Nalog
        { wch: 30 }, // Adresa
        { wch: 20 }  // Opština
      ];
      worksheet['!cols'] = wscols;

      // Generate Excel file
      XLSX.writeFile(workbook, `logs_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      console.log('✅ Excel export completed');
    } catch (error) {
      console.error('❌ Excel Export error:', error);
      toast.error('Greška pri kreiranju Excel fajla');
    }
  };

  const exportToPDF = (data) => {
    console.log('🔴 exportToPDF called');
    try {
      console.log('Creating jsPDF instance...');
      // Create PDF document
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      console.log('jsPDF instance created');

      // Add title
      doc.setFontSize(18);
      doc.text('Logovi Aktivnosti', 14, 15);

      // Add date
      doc.setFontSize(11);
      doc.text(`Datum izvoza: ${new Date().toLocaleDateString('sr-RS')}`, 14, 22);

      console.log('Preparing table data...');
      // Prepare data for table
      const tableData = data.flatMap(group =>
        (group.logs || []).map(log => [
          new Date(log.timestamp).toLocaleString('sr-RS', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }),
          group.technicianName || group.userName || 'N/A',
          log.action || 'N/A',
          (log.description || 'N/A').substring(0, 50), // Limit description length
          (typeof log.workOrderId === 'object' ? log.workOrderId?._id : log.workOrderId) || 'N/A'
        ])
      );
      console.log('Table data prepared, rows:', tableData.length);

      // Add table
      console.log('Adding autoTable...');
      autoTable(doc, {
        head: [['Datum', 'Tehničar/Korisnik', 'Akcija', 'Opis', 'Radni Nalog']],
        body: tableData,
        startY: 28,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [99, 102, 241], // purple
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: 28 }
      });
      console.log('autoTable added');

      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      console.log('Adding page numbers, total pages:', pageCount);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Stranica ${i} od ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const filename = `logs_export_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Saving PDF as:', filename);
      doc.save(filename);
      console.log('✅ PDF export completed successfully');
    } catch (error) {
      console.error('❌ PDF Export error:', error);
      toast.error('Greška pri kreiranju PDF fajla: ' + error.message);
    }
  };

  const exportToJSON = (data) => {
    try {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, `logs_export_${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
    } catch (error) {
      console.error('JSON Export error:', error);
      toast.error('Greška pri kreiranju JSON fajla');
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    // CSV headers
    const headers = ['Datum', 'Tehničar/Korisnik', 'Akcija', 'Opis', 'Radni Nalog'];

    // CSV rows
    const rows = data.flatMap(group =>
      (group.logs || []).map(log => [
        new Date(log.timestamp).toLocaleString('sr-RS'),
        group.technicianName || group.userName || 'N/A',
        log.action || 'N/A',
        log.description || 'N/A',
        (typeof log.workOrderId === 'object' ? log.workOrderId?._id : log.workOrderId) || 'N/A'
      ])
    );

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  };

  const downloadFile = (content, filename, contentType) => {
    try {
      // Create blob with BOM for UTF-8 if CSV
      const BOM = '\ufeff';
      const blobContent = contentType.includes('csv') ? BOM + content : content;
      const blob = new Blob([blobContent], { type: contentType });

      // Check if browser supports download attribute
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // IE11 & Edge Legacy
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        // Modern browsers
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);

        // Click with delay to ensure browser processes it
        setTimeout(() => {
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
        }, 0);
      }
    } catch (error) {
      console.error('Download file error:', error);
      toast.error('Greška pri download-u fajla: ' + error.message);
    }
  };

  // Settings handlers
  const handleSaveSettings = () => {
    // Save to localStorage
    localStorage.setItem('logs_settings', JSON.stringify(settings));

    // Apply settings
    if (settings.autoRefreshInterval !== refreshInterval) {
      setRefreshInterval(settings.autoRefreshInterval);
    }

    // Apply items per page to pagination
    const oldLimit = pagination.limit;
    if (settings.itemsPerPage !== oldLimit) {
      setPagination(prev => ({ ...prev, limit: settings.itemsPerPage, currentPage: 1 }));
      setUserPagination(prev => ({ ...prev, limit: settings.itemsPerPage, currentPage: 1 }));

      // Force refresh data with new limit
      setTimeout(() => {
        if (activeTab === 'technicians') {
          loadTechnicianLogs(1);
        } else if (activeTab === 'users') {
          loadUserLogs(1);
        }
      }, 100);
    }

    setShowSettings(false);
    toast.success(`Podešavanja sačuvana! Stavki po stranici: ${settings.itemsPerPage}`);
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      itemsPerPage: 50,
      autoRefreshInterval: 30000,
      showMiniCharts: true,
      compactView: false,
      enableNotifications: true,
      soundEnabled: false
    };
    setSettings(defaultSettings);
    toast.info('Podešavanja su resetovana na podrazumevane vrednosti');
  };

  // Share handlers
  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link je kopiran u clipboard');
  };

  // Quick preset filter handlers
  const applyQuickFilter = (preset) => {
    const today = new Date();
    switch (preset) {
      case 'today':
        setDateFrom(today.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        setDateFrom(weekAgo.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        setDateFrom(monthAgo.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'all':
        setDateFrom('');
        setDateTo('');
        break;
      default:
        break;
    }
  };

  // Calculate trends for stats - memoized for performance
  const totalLogsTrend = useMemo(
    () => calculateTrend(dashboardStats?.totalLogs || 0, previousStats?.totalLogs || 0),
    [dashboardStats?.totalLogs, previousStats?.totalLogs]
  );

  const todayLogsTrend = useMemo(
    () => calculateTrend(statistics?.todayLogs || 0, 0),
    [statistics?.todayLogs]
  );

  const techniciansTrend = useMemo(
    () => calculateTrend(statistics?.activeTechnicians || 0, 0),
    [statistics?.activeTechnicians]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Enhanced Modern Header */}
      <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <BarChartIcon size={24} className="text-purple-600" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-slate-900">Logovi aktivnosti</h1>
                {autoRefresh && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                    <ActivityIcon size={14} className="text-green-600 animate-pulse" />
                    <span className="text-xs font-medium text-green-700">LIVE</span>
                  </div>
                )}
              </div>
              <p className="text-slate-600 mt-1">Praćenje svih aktivnosti tehničara i radnih naloga</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button
              type={autoRefresh ? "danger" : "secondary"}
              size="small"
              prefix={autoRefresh ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Zaustavi' : 'Auto-refresh'}
            </Button>
            <Button
              type="secondary"
              size="small"
              prefix={<DownloadIcon size={14} />}
              onClick={handleExport}
              title="Ctrl+E"
            >
              Export
            </Button>
            <Button
              type="secondary"
              size="small"
              prefix={<SettingsIcon size={14} />}
              onClick={() => setShowSettings(true)}
              title="Ctrl+,"
            >
              Podešavanja
            </Button>
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <InfoIcon size={14} />
            </button>
            <div className="relative">
              <Button
                type="secondary"
                size="small"
                prefix={<BellIcon size={14} />}
                onClick={() => setShowAlerts(!showAlerts)}
              >
                Upozorenja
                {alerts.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {alerts.length}
                  </span>
                )}
              </Button>

              {/* Alerts Dropdown */}
              {showAlerts && alerts.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Upozorenja</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {alerts.map(alert => (
                      <div
                        key={alert.id}
                        className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          if (alert.action) alert.action();
                          setShowAlerts(false);
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            alert.type === 'warning' && "bg-yellow-50",
                            alert.type === 'info' && "bg-blue-50"
                          )}>
                            <BellIcon size={16} className={cn(
                              alert.type === 'warning' && "text-yellow-600",
                              alert.type === 'info' && "text-blue-600"
                            )} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{alert.title}</p>
                            <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <ZapIcon size={14} className={cn(
                "transition-colors",
                performanceMetrics.cacheHit ? "text-green-600" : "text-orange-600"
              )} />
              <span className="text-xs text-slate-600">
                Performance: <span className="font-semibold text-slate-900">{performanceMetrics.queryTime}ms</span>
                {performanceMetrics.cacheHit && <span className="ml-1 text-green-600">(cached)</span>}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600">
                Ažurirano: <span className="font-semibold text-slate-900">{getRelativeTime(lastUpdated)}</span>
              </span>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex items-center space-x-2">
                <FilterIcon size={14} className="text-purple-600" />
                <span className="text-xs text-slate-600">
                  Aktivno filtera: <span className="font-semibold text-purple-600">{activeFilterCount}</span>
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <TableIcon size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600">
                Po stranici: <span className="font-semibold text-slate-900">{activeTab === 'technicians' ? pagination.limit : activeTab === 'users' ? userPagination.limit : 'N/A'}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isRefreshing && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-xs text-slate-600">Osvežavanje...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Interactive Stats Cards */}
      {statistics && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Logs Card */}
            <div className="group bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <TableIcon size={20} className="text-blue-600" />
                </div>
                {totalLogsTrend.direction !== 'neutral' && (
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium",
                    totalLogsTrend.direction === 'up' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {totalLogsTrend.direction === 'up' ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
                    <span>{totalLogsTrend.percent}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Ukupno logova</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums mb-2">{statistics.totalLogs?.toLocaleString()}</h3>
                {/* Mini sparkline placeholder */}
                <div className="h-8 flex items-end space-x-1">
                  {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                    <div key={i} className="flex-1 bg-blue-200 rounded-t transition-all group-hover:bg-blue-400" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today Logs Card */}
            <div className="group bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:border-green-300 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <TrendingUpIcon size={20} className="text-green-600" />
                </div>
                {todayLogsTrend.direction !== 'neutral' && (
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium",
                    todayLogsTrend.direction === 'up' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {todayLogsTrend.direction === 'up' ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
                    <span>{todayLogsTrend.percent}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Danas</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums mb-2">{statistics.todayLogs?.toLocaleString()}</h3>
                {/* Mini sparkline placeholder */}
                <div className="h-8 flex items-end space-x-1">
                  {[30, 50, 65, 45, 75, 60, 85].map((height, i) => (
                    <div key={i} className="flex-1 bg-green-200 rounded-t transition-all group-hover:bg-green-400" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Technicians Card */}
            <div className="group bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <HardHatIcon size={20} className="text-orange-600" />
                </div>
                {techniciansTrend.direction !== 'neutral' && (
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium",
                    techniciansTrend.direction === 'up' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {techniciansTrend.direction === 'up' ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
                    <span>{techniciansTrend.percent}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Aktivni tehničari</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums mb-2">{statistics.activeTechnicians || 0}</h3>
                {/* Mini sparkline placeholder */}
                <div className="h-8 flex items-end space-x-1">
                  {[50, 40, 60, 55, 70, 65, 75].map((height, i) => (
                    <div key={i} className="flex-1 bg-orange-200 rounded-t transition-all group-hover:bg-orange-400" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Average Card */}
            <div className="group bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <ClockIcon size={20} className="text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Prosek po danu</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums mb-2">{Math.round(statistics.totalLogs / 7)?.toLocaleString() || 0}</h3>
                {/* Mini sparkline placeholder */}
                <div className="h-8 flex items-end space-x-1">
                  {[45, 55, 50, 60, 58, 65, 62].map((height, i) => (
                    <div key={i} className="flex-1 bg-purple-200 rounded-t transition-all group-hover:bg-purple-400" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tabs Navigation with Badges */}
      <div className="mb-6">
        <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-xl shadow-sm p-1 inline-flex">
          <button
            className={cn(
              "relative flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'dashboard'
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
            onClick={() => setActiveTab('dashboard')}
            title="Pregled dashboard-a sa analitikom"
          >
            <BarChartIcon size={16} />
            <span>Dashboard</span>
            {activeTab === 'dashboard' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </button>
          <button
            className={cn(
              "relative flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'technicians'
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
            onClick={() => setActiveTab('technicians')}
            title="Logovi aktivnosti tehničara"
          >
            <HardHatIcon size={16} />
            <span>Tehničari</span>
            {pagination.totalCount > 0 && (
              <span className={cn(
                "ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                activeTab === 'technicians'
                  ? "bg-white/20 text-white"
                  : "bg-orange-100 text-orange-700"
              )}>
                {pagination.totalCount}
              </span>
            )}
            {activeTab === 'technicians' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </button>
          <button
            className={cn(
              "relative flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'users'
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
            onClick={() => setActiveTab('users')}
            title="Logovi aktivnosti korisnika"
          >
            <UsersIcon size={16} />
            <span>Korisnici</span>
            {userPagination.totalCount > 0 && (
              <span className={cn(
                "ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                activeTab === 'users'
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-700"
              )}>
                {userPagination.totalCount}
              </span>
            )}
            {activeTab === 'users' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>
      </div>

      {/* Enhanced Search and Filters - Only show for technicians and users tabs */}
      {activeTab !== 'dashboard' && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
          {/* Quick Preset Filters */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Brzi filteri</h3>
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
              >
                <span>{showFiltersPanel ? 'Sakrij napredne' : 'Napredni filteri'}</span>
                <FilterIcon size={12} />
              </button>
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <button
                onClick={() => applyQuickFilter('today')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  dateFrom === new Date().toISOString().split('T')[0] && dateTo === new Date().toISOString().split('T')[0]
                    ? "bg-purple-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                Danas
              </button>
              <button
                onClick={() => applyQuickFilter('week')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              >
                Ova nedelja
              </button>
              <button
                onClick={() => applyQuickFilter('month')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              >
                Ovaj mesec
              </button>
              <button
                onClick={() => applyQuickFilter('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  !dateFrom && !dateTo
                    ? "bg-purple-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                Sve
              </button>
              {activeFilterCount > 0 && (
                <div className="ml-2 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-xs font-medium text-purple-700">
                    {activeFilterCount} aktivnih filtera
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Filters (Collapsible) */}
          {showFiltersPanel && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder={`Pretraži ${activeTab === 'technicians' ? 'po tehničaru, opisu, korisniku...' : 'po korisniku, adresi, tehničaru...'}`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="h-10 w-full pl-10 pr-4 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-slate-400"
                    />
                  </div>

                  {/* Action Filter */}
                  <div className="relative">
                    <select
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="h-10 px-4 pr-10 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none hover:border-slate-400"
                    >
                      <option value="all">Sve akcije</option>
                      {availableActions.map(action => (
                        <option key={action.value} value={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                    <FilterIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>

                  {/* Date From Filter */}
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-10 px-4 pr-10 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-slate-400"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>

                  {/* Date To Filter */}
                  <div className="relative">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-10 px-4 pr-10 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-slate-400"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-3">
                  <Button
                    type="secondary"
                    size="medium"
                    prefix={<SearchIcon size={16} />}
                    onClick={handleSearch}
                  >
                    Pretraži
                  </Button>
                  <Button
                    type="primary"
                    size="medium"
                    prefix={<RefreshIcon size={16} />}
                    onClick={handleReset}
                  >
                    Resetuj
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Simple search bar when advanced panel is closed */}
          {!showFiltersPanel && (
            <div className="px-6 pb-6">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={`Pretraži ${activeTab === 'technicians' ? 'po tehničaru, opisu, korisniku...' : 'po korisniku, adresi, tehničaru...'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-12 w-full pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-slate-400 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div>
        {loading ? (
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-slate-600 font-medium">Učitava podatke...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' ? (
              <DashboardSection
                dashboardData={dashboardData}
                filterOptions={filterOptions}
                loading={loading}
                handleDismissWorkOrder={handleDismissWorkOrder}
                technicianLogs={activityChartTechnicianLogs}
                userLogs={activityChartUserLogs}
                onFiltersChange={handleDashboardFiltersChange}
              />
            ) : activeTab === 'technicians' ? (
              <TechnicianLogsSection
                logs={technicianLogs}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                getActionIcon={getActionIcon}
                getActionColor={getActionColor}
                materialValidationData={materialValidationData}
                showMaterialValidation={showMaterialValidation}
                setShowMaterialValidation={setShowMaterialValidation}
                pagination={pagination}
                performance={performance}
                loading={loading}
                onPageChange={handlePageChange}
              />
            ) : (
              <UserLogsSection
                logs={userLogs}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                getActionIcon={getActionIcon}
                getActionColor={getActionColor}
                pagination={userPagination}
                performance={userPerformance}
                loading={loading}
                onPageChange={handleUserPageChange}
              />
            )}

            {/* Frontend pagination is now handled within each component */}
          </>
        )}
      </div>

      {/* FAZA 2 - Modalni Paneli */}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Eksportuj podatke</h2>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
                <div className="grid grid-cols-2 gap-3">
                  {['csv', 'json', 'excel', 'pdf'].map(format => (
                    <button
                      key={format}
                      onClick={() => {
                        console.log('🖱️ Format button clicked:', format);
                        console.log('📋 Previous exportFormat:', exportFormat);
                        setExportFormat(format);
                        console.log('✅ setExportFormat called with:', format);
                      }}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                        exportFormat === format
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      )}
                    >
                      <FileIcon size={16} className="mx-auto mb-1" />
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Opseg datuma</label>
                <select
                  value={exportDateRange}
                  onChange={(e) => setExportDateRange(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="current">Trenutni prikaz</option>
                  <option value="today">Samo danas</option>
                  <option value="week">Poslednja nedelja</option>
                  <option value="month">Poslednji mesec</option>
                  <option value="all">Svi podaci</option>
                </select>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <InfoIcon size={14} className="inline mr-1" />
                  Eksportovani podaci će uključiti sve filtrirana polja sa trenutne stranice.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button type="secondary" size="medium" onClick={() => setShowExportModal(false)}>
                Otkaži
              </Button>
              <Button
                type="primary"
                size="medium"
                prefix={<DownloadIcon size={16} />}
                onClick={() => {
                  console.log('🔘 Export button clicked');
                  console.log('📋 Current exportFormat before performExport:', exportFormat);
                  performExport();
                }}
              >
                Eksportuj
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Prečice na tastaturi</h2>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* General */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">Opšte</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Pomoć</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">?</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Zatvori modal</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Fokusiraj pretragu</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Ctrl+F</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Osveži podatke</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Ctrl+R</kbd>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">Navigacija</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Dashboard</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Alt+1</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Tehničari</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Alt+2</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Korisnici</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Alt+3</kbd>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">Akcije</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Eksportuj</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Ctrl+E</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Podešavanja</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Ctrl+,</kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Prečice</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Ctrl+K</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Napomena: Koristite <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Cmd</kbd> umesto <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Ctrl</kbd> na macOS
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Podešavanja</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Current Settings Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <InfoIcon size={14} className="inline mr-1" />
                  Trenutno primenjeno: <strong>{pagination.limit}</strong> stavki po stranici
                </p>
              </div>

              {/* Auto-refresh interval */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Auto-refresh interval
                  <span className="ml-2 text-xs text-slate-500">(trenutno: {refreshInterval/1000}s)</span>
                </label>
                <select
                  value={settings.autoRefreshInterval}
                  onChange={(e) => setSettings({...settings, autoRefreshInterval: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={10000}>10 sekundi</option>
                  <option value={30000}>30 sekundi</option>
                  <option value={60000}>1 minut</option>
                  <option value={120000}>2 minuta</option>
                  <option value={300000}>5 minuta</option>
                </select>
              </div>

              {/* Items per page */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Broj stavki po stranici
                  <span className="ml-2 text-xs text-slate-500">(primeniće se nakon čuvanja)</span>
                </label>
                <select
                  value={settings.itemsPerPage}
                  onChange={(e) => setSettings({...settings, itemsPerPage: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50 (default)</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Veći broj može usporiti učitavanje. Preporučeno: 50
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Prikaži mini grafikone</span>
                  <button
                    onClick={() => setSettings({...settings, showMiniCharts: !settings.showMiniCharts})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.showMiniCharts ? "bg-purple-600" : "bg-slate-300"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.showMiniCharts ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Kompaktni prikaz</span>
                  <button
                    onClick={() => setSettings({...settings, compactView: !settings.compactView})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.compactView ? "bg-purple-600" : "bg-slate-300"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.compactView ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Omogući notifikacije</span>
                  <button
                    onClick={() => setSettings({...settings, enableNotifications: !settings.enableNotifications})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.enableNotifications ? "bg-purple-600" : "bg-slate-300"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.enableNotifications ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Zvučna upozorenja</span>
                  <button
                    onClick={() => setSettings({...settings, soundEnabled: !settings.soundEnabled})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.soundEnabled ? "bg-purple-600" : "bg-slate-300"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.soundEnabled ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <Button type="secondary" size="medium" onClick={handleResetSettings}>
                Resetuj
              </Button>
              <div className="flex items-center space-x-3">
                <Button type="secondary" size="medium" onClick={() => setShowSettings(false)}>
                  Otkaži
                </Button>
                <Button type="primary" size="medium" onClick={handleSaveSettings}>
                  Sačuvaj
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;