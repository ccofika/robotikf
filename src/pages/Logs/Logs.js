import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import {
  BarChart3, HardHat, Users, Play, Pause, Download, Settings, Keyboard, Bell, Zap, Clock, Filter, Rows3, RefreshCw,
  TrendingUp, TrendingDown, Search, X, RotateCcw, FileText, FileJson, FileSpreadsheet, File,
  Package, Router, MessageSquare, Image as ImageIcon, CheckCircle2, XCircle
} from 'lucide-react';
import { logsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cx, Btn, State, Kbd } from '../../security/sx/ui';
import { PageHead, Panel, Note, Tabs, Stat } from '../../security/sx/layout';
import { Field, Select, Switch, Choice, DateField } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { Loading } from '../../montaza/ui';
import './Logs.mx.css';

// Import the component sections
import DashboardSection from './components/DashboardSectionNew';
import TechnicianLogsSection from './components/TechnicianLogsSection';
import UserLogsSection from './components/UserLogsSection';
import { localYmd } from '../../utils/localDate';

// Ikonice formata u dijalogu za izvoz
const FORMAT_ICONS = { csv: FileText, json: FileJson, excel: FileSpreadsheet, pdf: File };

// Prečice na tastaturi (grupa, [opis, taster])
const SHORTCUTS = [
  ['Opšte', [['Pomoć', '?'], ['Zatvori modal', 'Esc'], ['Fokusiraj pretragu', 'Ctrl+F'], ['Osveži podatke', 'Ctrl+R']]],
  ['Navigacija', [['Dashboard', 'Alt+1'], ['Tehničari', 'Alt+2'], ['Korisnici', 'Alt+3']]],
  ['Akcije', [['Eksportuj', 'Ctrl+E'], ['Podešavanja', 'Ctrl+,'], ['Prečice', 'Ctrl+K']]]
];

// Prekidači u podešavanjima (ključ u settings, natpis)
const TOGGLES = [
  ['showMiniCharts', 'Prikaži mini grafikone'],
  ['compactView', 'Kompaktni prikaz'],
  ['enableNotifications', 'Omogući notifikacije'],
  ['soundEnabled', 'Zvučna upozorenja']
];

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
        return <Package size={15} strokeWidth={1.9} />;
      case 'equipment_added':
      case 'equipment_removed':
        return <Router size={15} strokeWidth={1.9} />;
      case 'comment_added':
        return <MessageSquare size={15} strokeWidth={1.9} />;
      case 'image_added':
      case 'image_removed':
        return <ImageIcon size={15} strokeWidth={1.9} />;
      case 'workorder_finished':
        return <CheckCircle2 size={15} strokeWidth={1.9} />;
      case 'workorder_cancelled':
        return <XCircle size={15} strokeWidth={1.9} />;
      default:
        return <Clock size={15} strokeWidth={1.9} />;
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
      downloadFile(csv, `logs_export_${localYmd()}.csv`, 'text/csv;charset=utf-8;');
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
      XLSX.writeFile(workbook, `logs_export_${localYmd()}.xlsx`);
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
      const filename = `logs_export_${localYmd()}.pdf`;
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
      downloadFile(json, `logs_export_${localYmd()}.json`, 'application/json;charset=utf-8;');
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
        setDateFrom(localYmd(today));
        setDateTo(localYmd(today));
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        setDateFrom(localYmd(weekAgo));
        setDateTo(localYmd(today));
        break;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        setDateFrom(localYmd(monthAgo));
        setDateTo(localYmd(today));
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

  // Brzi filter koji odgovara izabranim datumima (samo za prikaz izabrane pilule)
  const todayYmd = localYmd();
  const quickFilter = !dateFrom && !dateTo ? 'all'
    : dateTo !== todayYmd ? null
      : dateFrom === todayYmd ? 'today'
        : dateFrom === localYmd(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ? 'week'
          : dateFrom === localYmd(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ? 'month' : null;

  const searchPlaceholder = `Pretraži ${activeTab === 'technicians' ? 'po tehničaru, opisu, korisniku...' : 'po korisniku, adresi, tehničaru...'}`;

  // Trend uz brojku (strelica + procenat), samo kad postoji promena
  const trendTag = (trend) => (trend.direction === 'neutral' ? null : (
    <span className={cx('mx-logs-trend', `is-${trend.direction}`)}>
      {trend.direction === 'up' ? <TrendingUp size={12} strokeWidth={2} aria-hidden="true" /> : <TrendingDown size={12} strokeWidth={2} aria-hidden="true" />}
      {trend.percent}%
    </span>
  ));

  return (
    <div className="sx-page mx-logs" data-testid="page-logs">
      <PageHead
        className="mx-logs-head"
        eyebrow="Montaža · Logovi"
        title="Logovi aktivnosti"
        lead="Praćenje svih aktivnosti tehničara i radnih naloga"
        actions={<>
          <Btn
            variant={autoRefresh ? 'danger' : 'secondary'}
            icon={autoRefresh ? Pause : Play}
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="logs-autorefresh"
          >
            {autoRefresh ? 'Zaustavi' : 'Auto-refresh'}
          </Btn>
          <Btn icon={Download} onClick={handleExport} title="Ctrl+E" data-testid="logs-export">
            Export
          </Btn>
          <Btn icon={Settings} onClick={() => setShowSettings(true)} title="Ctrl+," data-testid="logs-settings">
            Podešavanja
          </Btn>
          <Btn
            icon={Keyboard}
            onClick={() => setShowKeyboardShortcuts(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts (?)"
            data-testid="logs-shortcuts"
          />
          {/* Upozorenja: spisak se vidi samo kad ih ima */}
          <Popover.Root open={showAlerts && alerts.length > 0} onOpenChange={(open) => { if (!open) setShowAlerts(false); }}>
            <Popover.Trigger asChild>
              <Btn icon={Bell} onClick={() => setShowAlerts(!showAlerts)} data-testid="logs-alerts">
                Upozorenja
                {alerts.length > 0 && (
                  <span className="sx-tag is-bad mx-logs-badge">{alerts.length}</span>
                )}
              </Btn>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="sx-portal sx-popover mx-logs-alerts" align="end" sideOffset={8} collisionPadding={12}>
                <h3 className="mx-logs-alerts__title">Upozorenja</h3>
                {alerts.map(alert => (
                  <button
                    key={alert.id}
                    type="button"
                    className="mx-logs-alert"
                    onClick={() => {
                      if (alert.action) alert.action();
                      setShowAlerts(false);
                    }}
                  >
                    <span className={cx('sx-item__icon', alert.type === 'warning' && 'is-warn')}>
                      <Bell size={16} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="sx-item__main">
                      <b>{alert.title}</b>
                      <span>{alert.message}</span>
                    </span>
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </>}
      >
        {/* LIVE uz naslov (kao ranije) */}
        {autoRefresh && <span className="mx-logs-live"><State tone="ok" live>LIVE</State></span>}
      </PageHead>

      {/* Traka stanja ispod zaglavlja (kao ranije) */}
      <div className="mx-logs-status" data-testid="logs-status">
        <div className="mx-logs-meta">
          <span>
            <Zap size={14} strokeWidth={1.9} className={performanceMetrics.cacheHit ? 'is-ok' : 'is-warn'} aria-hidden="true" />
            Performance: <b>{performanceMetrics.queryTime}ms</b>
            {performanceMetrics.cacheHit && <em>(cached)</em>}
          </span>
          <span>
            <Clock size={14} strokeWidth={1.9} aria-hidden="true" />
            Ažurirano: <b>{getRelativeTime(lastUpdated)}</b>
          </span>
          {activeFilterCount > 0 && (
            <span>
              <Filter size={14} strokeWidth={1.9} aria-hidden="true" />
              Aktivno filtera: <b className="is-info">{activeFilterCount}</b>
            </span>
          )}
          <span>
            <Rows3 size={14} strokeWidth={1.9} aria-hidden="true" />
            Po stranici: <b>{activeTab === 'technicians' ? pagination.limit : activeTab === 'users' ? userPagination.limit : 'N/A'}</b>
          </span>
        </div>
        {isRefreshing && (
          <span className="mx-logs-meta">
            <span>
              <RefreshCw size={14} strokeWidth={1.9} className="mx-logs-spin" aria-hidden="true" />
              Osvežavanje...
            </span>
          </span>
        )}
      </div>

      {statistics && (
        <div className="sx-stats" data-testid="logs-stats">
          <Stat label="Ukupno logova" value={statistics.totalLogs?.toLocaleString()} small={trendTag(totalLogsTrend)} />
          <Stat label="Danas" value={statistics.todayLogs?.toLocaleString()} small={trendTag(todayLogsTrend)} />
          <Stat label="Aktivni tehničari" value={statistics.activeTechnicians || 0} small={trendTag(techniciansTrend)} />
          <Stat label="Prosek po danu" value={Math.round(statistics.totalLogs / 7)?.toLocaleString() || 0} />
        </div>
      )}

      <Tabs
        ariaLabel="Logovi"
        layoutId="mx-logs-tabs"
        value={activeTab}
        onChange={setActiveTab}
        testId="logs-tabs"
        items={[
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3, testId: 'logs-tab-dashboard' },
          { key: 'technicians', label: 'Tehničari', icon: HardHat, count: pagination.totalCount, testId: 'logs-tab-technicians' },
          { key: 'users', label: 'Korisnici', icon: Users, count: userPagination.totalCount, testId: 'logs-tab-users' }
        ]}
      />

      {/* Pretraga i filteri - samo za tabove Tehničari i Korisnici (isti raspored kao ranije: brzi filteri, pa pretraga ili napredni filteri) */}
      {activeTab !== 'dashboard' && (
        <Panel
          className="mx-logs-filters"
          testId="logs-filters"
          title="Brzi filteri"
          actions={
            <Btn
              size="sm"
              variant="ghost"
              iconRight={Filter}
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              aria-expanded={showFiltersPanel}
              data-testid="logs-advanced"
            >
              {showFiltersPanel ? 'Sakrij napredne' : 'Napredni filteri'}
            </Btn>
          }
        >
          <div className="mx-logs-quick">
            <Choice
              size="sm"
              label="Brzi filteri"
              layoutId="mx-logs-quick"
              value={quickFilter}
              onChange={applyQuickFilter}
              testId="logs-quick"
              options={[
                { value: 'today', label: 'Danas' },
                { value: 'week', label: 'Ova nedelja' },
                { value: 'month', label: 'Ovaj mesec' },
                { value: 'all', label: 'Sve' }
              ]}
            />
            {activeFilterCount > 0 && (
              <span className="sx-tag is-info">{activeFilterCount} aktivnih filtera</span>
            )}
          </div>

          {/* type="text": prečica Ctrl+F traži prvo input[type="text"] na strani */}
          {showFiltersPanel ? (
            <div className="mx-logs-searchrow is-adv" data-testid="logs-advanced-panel">
              <div className="mx-logs-searchrow__fields">
            <div className={cx('sx-search', searchTerm && 'has-value')}>
              <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="logs-search"
              />
              {searchTerm && (
                <button type="button" className="sx-search__clear" onClick={() => setSearchTerm('')} aria-label="Obriši pretragu">
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
                <Select size="sm" value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} aria-label="Akcija" data-testid="logs-action">
                  <option value="all">Sve akcije</option>
                  {availableActions.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </Select>
                <DateField value={dateFrom} onChange={setDateFrom} clearable compact aria-label="Datum od" testId="logs-date-from" />
                <DateField value={dateTo} onChange={setDateTo} clearable compact aria-label="Datum do" testId="logs-date-to" />
              </div>
              <div className="mx-logs-searchrow__end">
                <Btn size="sm" icon={Search} onClick={handleSearch} data-testid="logs-search-btn">
                  Pretraži
                </Btn>
                <Btn size="sm" variant="primary" icon={RotateCcw} onClick={handleReset} data-testid="logs-reset">
                  Resetuj
                </Btn>
              </div>
            </div>
          ) : (
            <div className="mx-logs-searchrow">
            <div className={cx('sx-search', searchTerm && 'has-value')}>
              <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="logs-search"
              />
              {searchTerm && (
                <button type="button" className="sx-search__clear" onClick={() => setSearchTerm('')} aria-label="Obriši pretragu">
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            </div>
          )}
        </Panel>
      )}

      {/* Sadržaj */}
      {loading ? (
        <Panel pad={false}>
          <Loading text="Učitava podatke..." />
        </Panel>
      ) : activeTab === 'dashboard' ? (
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

      {/* Izvoz */}
      <Dialog
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        eyebrow="Montaža · Logovi"
        title="Eksportuj podatke"
        size="md"
        testId="logs-export-modal"
        footer={<>
          <Btn variant="ghost" onClick={() => setShowExportModal(false)}>
            Otkaži
          </Btn>
          <Btn
            variant="primary"
            icon={Download}
            onClick={() => {
              console.log('🔘 Export button clicked');
              console.log('📋 Current exportFormat before performExport:', exportFormat);
              performExport();
            }}
            data-testid="logs-export-submit"
          >
            Eksportuj
          </Btn>
        </>}
      >
        <div className="mx-logs-dlg">
          <Field label="Format" className="mx-logs-formats">
            <Choice
              label="Format"
              layoutId="mx-logs-format"
              value={exportFormat}
              onChange={(format) => {
                console.log('🖱️ Format button clicked:', format);
                console.log('📋 Previous exportFormat:', exportFormat);
                setExportFormat(format);
                console.log('✅ setExportFormat called with:', format);
              }}
              options={['csv', 'json', 'excel', 'pdf'].map(format => ({
                value: format,
                label: format.toUpperCase(),
                icon: FORMAT_ICONS[format],
                testId: `logs-format-${format}`
              }))}
            />
          </Field>
          <Field label="Opseg datuma" htmlFor="mx-logs-export-range">
            <Select id="mx-logs-export-range" value={exportDateRange} onChange={(e) => setExportDateRange(e.target.value)}>
              <option value="current">Trenutni prikaz</option>
              <option value="today">Samo danas</option>
              <option value="week">Poslednja nedelja</option>
              <option value="month">Poslednji mesec</option>
              <option value="all">Svi podaci</option>
            </Select>
          </Field>
          <Note tone="info">
            Eksportovani podaci će uključiti sve filtrirana polja sa trenutne stranice.
          </Note>
        </div>
      </Dialog>

      {/* Prečice na tastaturi */}
      <Dialog
        open={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        eyebrow="Montaža · Logovi"
        title="Prečice na tastaturi"
        size="lg"
        testId="logs-shortcuts-modal"
      >
        <div className="mx-logs-keys">
          {SHORTCUTS.map(([group, rows]) => (
            <section key={group}>
              <h3 className="sx-label">{group}</h3>
              <ul>
                {rows.map(([text, key]) => (
                  <li key={text}>
                    <span>{text}</span>
                    <Kbd>{key}</Kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mx-logs-keys__note">
          Napomena: Koristite <Kbd>Cmd</Kbd> umesto <Kbd>Ctrl</Kbd> na macOS
        </p>
      </Dialog>

      {/* Podešavanja */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        eyebrow="Montaža · Logovi"
        title="Podešavanja"
        size="md"
        testId="logs-settings-modal"
        footer={<>
          <Btn variant="ghost" onClick={handleResetSettings} data-testid="logs-settings-reset">
            Resetuj
          </Btn>
          <Btn onClick={() => setShowSettings(false)} className="mx-right">
            Otkaži
          </Btn>
          <Btn variant="primary" onClick={handleSaveSettings} data-testid="logs-settings-save">
            Sačuvaj
          </Btn>
        </>}
      >
        <div className="mx-logs-dlg">
          <Note tone="info">
            Trenutno primenjeno: <b>{pagination.limit}</b> stavki po stranici
          </Note>
          <Field
            label="Auto-refresh interval"
            htmlFor="mx-logs-interval"
            aside={<span className="mx-logs-aside">(trenutno: {refreshInterval/1000}s)</span>}
          >
            <Select
              id="mx-logs-interval"
              value={settings.autoRefreshInterval}
              onChange={(e) => setSettings({...settings, autoRefreshInterval: parseInt(e.target.value)})}
            >
              <option value={10000}>10 sekundi</option>
              <option value={30000}>30 sekundi</option>
              <option value={60000}>1 minut</option>
              <option value={120000}>2 minuta</option>
              <option value={300000}>5 minuta</option>
            </Select>
          </Field>
          <Field
            label="Broj stavki po stranici"
            htmlFor="mx-logs-per-page"
            aside={<span className="mx-logs-aside">(primeniće se nakon čuvanja)</span>}
            hint="Veći broj može usporiti učitavanje. Preporučeno: 50"
          >
            <Select
              id="mx-logs-per-page"
              value={settings.itemsPerPage}
              onChange={(e) => setSettings({...settings, itemsPerPage: parseInt(e.target.value)})}
              data-testid="logs-per-page"
            >
              <option value={25}>25</option>
              <option value={50}>50 (default)</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </Select>
          </Field>
          {/* natpis levo, prekidač desno (kao ranije) */}
          <div className="mx-logs-switches">
            {TOGGLES.map(([key, text]) => (
              <div key={key} className="mx-logs-switchrow">
                <span>{text}</span>
                <Switch checked={settings[key]} onChange={() => setSettings({...settings, [key]: !settings[key]})} label={text} />
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Logs;