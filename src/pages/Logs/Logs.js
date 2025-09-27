import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { logsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
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
  CloseIcon
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  // Frontend pagination state for components
  const [technicianCurrentPage, setTechnicianCurrentPage] = useState(1);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const itemsPerPageFrontend = 10;

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

  // Load data
  const loadTechnicianLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        action: selectedAction,
        dateFrom,
        dateTo,
        page: 1,
        limit: 1000
      };

      const response = await logsAPI.getTechnicianLogs(params);
      setTechnicianLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Greška pri učitavanju logova tehničara:', error);
      toast.error('Greška pri učitavanju logova tehničara');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedAction, dateFrom, dateTo, pagination.limit]);

  // Activity chart specific log loading - no filters applied
  const loadActivityChartTechnicianLogs = useCallback(async () => {
    try {
      const params = {
        search: '', // No search filter
        action: 'all', // All actions
        dateFrom: '', // No date filter
        dateTo: '', // No date filter
        page: 1,
        limit: 5000 // Higher limit to get all historical data
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
        limit: 5000 // Higher limit to get all historical data
      };

      const response = await logsAPI.getUserLogs(params);
      setActivityChartUserLogs(response.data.data);
    } catch (error) {
      console.error('Greška pri učitavanju user logova za activity chart:', error);
    }
  }, []); // No dependencies - should not be affected by any filters

  const loadUserLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        action: selectedAction,
        dateFrom,
        dateTo,
        page: 1,
        limit: 1000
      };

      const response = await logsAPI.getUserLogs(params);
      setUserLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Greška pri učitavanju logova korisnika:', error);
      toast.error('Greška pri učitavanju logova korisnika');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedAction, dateFrom, dateTo, pagination.limit]);

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

  // Handle navigation state from notifications
  useEffect(() => {
    if (location.state?.showMaterialValidation && activeTab === 'technicians') {
      setShowMaterialValidation(true);
    }
  }, [location.state, activeTab]);

  useEffect(() => {
    loadActions();
    loadStatistics();
    loadFilterOptions();
  }, [loadActions, loadStatistics, loadFilterOptions]);

  useEffect(() => {
    if (activeTab === 'technicians') {
      loadTechnicianLogs();
      loadMaterialValidationData();
    } else if (activeTab === 'users') {
      loadUserLogs();
    }
    // Dashboard tab loading is handled by the DashboardSection component
  }, [activeTab, loadTechnicianLogs, loadUserLogs, loadMaterialValidationData]);

  // Separate useEffect for loading logs for activity chart (only when switching to dashboard)
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Load logs for activity chart data - independent of dashboard filters
      loadActivityChartTechnicianLogs();
      loadActivityChartUserLogs();
    }
  }, [activeTab, loadActivityChartTechnicianLogs, loadActivityChartUserLogs]); // Only depends on activeTab, not on dashboard filters

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-purple-50 rounded-xl">
            <BarChartIcon size={24} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logovi aktivnosti</h1>
            <p className="text-slate-600 mt-1">Praćenje svih aktivnosti tehničara i radnih naloga</p>
          </div>
        </div>
      </div>

      {/* Analytics Stats Cards */}
      {statistics && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TableIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno logova</p>
                  <h3 className="text-xl font-bold text-slate-900 tabular-nums">{statistics.totalLogs}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUpIcon size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Danas</p>
                  <h3 className="text-xl font-bold text-slate-900 tabular-nums">{statistics.todayLogs}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <HardHatIcon size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Aktivni tehničari</p>
                  <h3 className="text-xl font-bold text-slate-900 tabular-nums">{statistics.activeTechnicians || 0}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <ClockIcon size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Prosek po danu</p>
                  <h3 className="text-xl font-bold text-slate-900 tabular-nums">{Math.round(statistics.totalLogs / 7) || 0}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Tabs Navigation */}
      <div className="mb-6">
        <div className="bg-slate-100 rounded-lg p-1 inline-flex">
          <button
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'dashboard' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChartIcon size={16} />
            <span>Dashboard</span>
          </button>
          <button
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'technicians' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab('technicians')}
          >
            <HardHatIcon size={16} />
            <span>Tehničari</span>
          </button>
          <button
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'users' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon size={16} />
            <span>Korisnici</span>
          </button>
        </div>
      </div>

      {/* Modern Search and Filters - Only show for technicians and users tabs */}
      {activeTab !== 'dashboard' && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="p-6">
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
                    className="h-9 w-full pl-10 pr-4 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-slate-50"
                  />
                </div>
                
                {/* Action Filter */}
                <div className="relative">
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                  >
                    <option value="all">Sve akcije</option>
                    {availableActions.map(action => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>

                {/* Date From Filter */}
                <div className="relative">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-slate-50"
                  />
                  <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>

                {/* Date To Filter */}
                <div className="relative">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-slate-50"
                  />
                  <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
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
                currentPage={technicianCurrentPage}
                itemsPerPage={itemsPerPageFrontend}
                onPageChange={setTechnicianCurrentPage}
              />
            ) : (
              <UserLogsSection 
                logs={userLogs}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                getActionIcon={getActionIcon}
                getActionColor={getActionColor}
                currentPage={userCurrentPage}
                itemsPerPage={itemsPerPageFrontend}
                onPageChange={setUserCurrentPage}
              />
            )}

            {/* Frontend pagination is now handled within each component */}
          </>
        )}
      </div>
    </div>
  );
};

export default Logs;