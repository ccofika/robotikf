import React, { useState, useEffect, useCallback } from 'react';
import { logsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { 
  SearchIcon, 
  HardHatIcon, 
  UsersIcon,
  FilterIcon,
  ClockIcon,
  ChartIcon,
  BarChartIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { cn } from '../../utils/cn';

// Import the component sections
import DashboardSection from './components/DashboardSection';
import TechnicianLogsSection from './components/TechnicianLogsSection';
import UserLogsSection from './components/UserLogsSection';

const Logs = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
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
    limit: 50,
    total: 0,
    pages: 0
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
  const [dashboardFilters, setDashboardFilters] = useState({
    period: 'nedelja',
    technician: 'all',
    municipality: 'all',
    action: 'all',
    dateRangeMode: false,
    startDate: null,
    endDate: null
  });
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
        page,
        limit: pagination.limit
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

  const loadUserLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        action: selectedAction,
        dateFrom,
        dateTo,
        page,
        limit: pagination.limit
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

  // Material validation functions
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

  // Dashboard functions
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        period: dashboardFilters.period,
        technician: dashboardFilters.technician,
        municipality: dashboardFilters.municipality,
        action: dashboardFilters.action,
        startDate: dashboardFilters.startDate,
        endDate: dashboardFilters.endDate
      };

      const response = await logsAPI.getDashboardData(params);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      toast.error('Greška pri učitavanju dashboard podataka');
    } finally {
      setLoading(false);
    }
  }, [dashboardFilters]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await logsAPI.getFilterOptions();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opcija filtera:', error);
    }
  }, []);

  const handleDashboardFilterChange = (key, value) => {
    setDashboardFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetDashboardFilters = () => {
    setDashboardFilters({
      period: 'nedelja',
      technician: 'all',
      municipality: 'all',
      action: 'all',
      dateRangeMode: false,
      startDate: null,
      endDate: null
    });
  };

  const handleDateRangeModeToggle = () => {
    setDashboardFilters(prev => ({ ...prev, dateRangeMode: !prev.dateRangeMode }));
  };

  useEffect(() => {
    loadActions();
    loadStatistics();
    loadFilterOptions();
  }, [loadActions, loadStatistics, loadFilterOptions]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'technicians') {
      loadTechnicianLogs();
      loadMaterialValidationData();
    } else {
      loadUserLogs();
    }
  }, [activeTab, loadTechnicianLogs, loadUserLogs, loadMaterialValidationData, loadDashboardData]);

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

      {/* Modern Search and Filters */}
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

      {/* Content */}
      <div>
        {loading ? (
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-slate-600 font-medium">Učitava logove...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' ? (
              <DashboardSection 
                dashboardData={dashboardData}
                dashboardFilters={dashboardFilters}
                handleDashboardFilterChange={handleDashboardFilterChange}
                resetDashboardFilters={resetDashboardFilters}
                filterOptions={filterOptions}
                loading={loading}
                handleDateRangeModeToggle={handleDateRangeModeToggle}
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
              />
            ) : (
              <UserLogsSection 
                logs={userLogs}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                getActionIcon={getActionIcon}
                getActionColor={getActionColor}
              />
            )}

            {/* Modern Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600">
                  Prikazuje se stranica <span className="font-medium text-slate-900">{pagination.page}</span> od <span className="font-medium text-slate-900">{pagination.pages}</span> ({pagination.total} ukupno)
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    type="secondary"
                    size="small"
                    disabled={pagination.page === 1}
                    onClick={() => {
                      const newPage = pagination.page - 1;
                      if (activeTab === 'technicians') {
                        loadTechnicianLogs(newPage);
                      } else {
                        loadUserLogs(newPage);
                      }
                    }}
                  >
                    Prethodna
                  </Button>
                  
                  <span className="px-3 py-1 text-sm font-medium text-slate-700">
                    {pagination.page} od {pagination.pages}
                  </span>
                  
                  <Button
                    type="secondary"
                    size="small"
                    disabled={pagination.page === pagination.pages}
                    onClick={() => {
                      const newPage = pagination.page + 1;
                      if (activeTab === 'technicians') {
                        loadTechnicianLogs(newPage);
                      } else {
                        loadUserLogs(newPage);
                      }
                    }}
                  >
                    Sledeća
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Logs;
const TechnicianLogsSection = ({ logs, expandedGroups, toggleGroup, getActionIcon, getActionColor, materialValidationData, showMaterialValidation, setShowMaterialValidation }) => {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <HardHatIcon size={48} />
        <h3>Nema logova</h3>
        <p>Trenutno nema dostupnih logova za tehničare.</p>
      </div>
    );
  }

  return (
    <div className="logs-groups">
      {logs.map((group) => (
        <div key={group.technicianId} className="log-group">
          <div 
            className="group-header"
            onClick={() => toggleGroup(group.technicianId)}
          >
            <div className="group-info">
              <HardHatIcon size={20} />
              <div className="group-details">
                <h3>{group.technicianName}</h3>
                <span className="group-count">{group.logs.length} aktivnosti</span>
              </div>
            </div>
            <div className={`expand-icon ${expandedGroups.has(group.technicianId) ? 'expanded' : ''}`}>
              ▼
            </div>
          </div>

          {expandedGroups.has(group.technicianId) && (
            <div className="group-logs">
              {group.logs.map((log) => (
                <LogItem 
                  key={log._id} 
                  log={log} 
                  getActionIcon={getActionIcon}
                  getActionColor={getActionColor}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* Material Usage Validation Section */}
      <MaterialValidationSection 
        materialValidationData={materialValidationData}
        showMaterialValidation={showMaterialValidation}
        setShowMaterialValidation={setShowMaterialValidation}
      />
    </div>
  );
};

// User Logs Section Component
const UserLogsSection = ({ logs, expandedGroups, toggleGroup, getActionIcon, getActionColor }) => {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <UsersIcon size={48} />
        <h3>Nema logova</h3>
        <p>Trenutno nema dostupnih logova za korisnike.</p>
      </div>
    );
  }

  return (
    <div className="logs-groups">
      {logs.map((group, index) => (
        <div key={`${group.userName}_${group.tisId}_${index}`} className="log-group">
          <div 
            className="group-header"
            onClick={() => toggleGroup(`${group.userName}_${group.tisId}_${index}`)}
          >
            <div className="group-info">
              <UsersIcon size={20} />
              <div className="group-details">
                <h3>{group.userName}</h3>
                <span className="group-count">
                  {group.tisId && `TIS: ${group.tisId} • `}
                  {group.logs.length} aktivnosti
                </span>
              </div>
            </div>
            <div className={`expand-icon ${expandedGroups.has(`${group.userName}_${group.tisId}_${index}`) ? 'expanded' : ''}`}>
              ▼
            </div>
          </div>

          {expandedGroups.has(`${group.userName}_${group.tisId}_${index}`) && (
            <div className="group-logs">
              {group.logs.map((log) => (
                <LogItem 
                  key={log._id} 
                  log={log} 
                  getActionIcon={getActionIcon}
                  getActionColor={getActionColor}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Individual Log Item Component
const LogItem = ({ log, getActionIcon, getActionColor }) => {
  const [showImageModal, setShowImageModal] = useState(false);

  return (
    <div className="log-item">
      <div className="log-timeline">
        <div className={`log-icon ${getActionColor(log.action)}`}>
          {getActionIcon(log.action)}
        </div>
      </div>

      <div className="log-content">
        <div className="log-header">
          <span className="log-description">{log.description}</span>
          <span className="log-time">
            <ClockIcon size={14} />
            {log.formattedTimestamp}
          </span>
        </div>

        <div className="log-details">
          <span className="log-performer">
            Izvršio: <strong>{log.performedByName}</strong>
          </span>
          
          {log.workOrderInfo && (
            <span className="log-workorder">
              RN: <strong>{log.workOrderInfo.municipality}, {log.workOrderInfo.address}</strong>
              {log.workOrderInfo.tisId && (
                <span className="tis-id">TIS: {log.workOrderInfo.tisId}</span>
              )}
            </span>
          )}
        </div>

        {/* Additional Details */}
        {log.materialDetails && (
          <div className="log-extra-info">
            <MaterialIcon size={14} />
            <span>
              {log.materialDetails.materialType} - Količina: {log.materialDetails.quantity}
            </span>
          </div>
        )}

        {log.equipmentDetails && (
          <div className="log-extra-info">
            <EquipmentIcon size={14} />
            <span>
              {log.equipmentDetails.equipmentType} 
              {log.equipmentDetails.serialNumber && ` (S/N: ${log.equipmentDetails.serialNumber})`}
              {log.equipmentDetails.isWorking !== undefined && (
                <span className={`equipment-status ${log.equipmentDetails.isWorking ? 'working' : 'broken'}`}>
                  {log.equipmentDetails.isWorking ? 'Ispravna' : 'Neispravna'}
                </span>
              )}
            </span>
          </div>
        )}

        {log.imageDetails && (
          <div className="log-extra-info">
            <ImageIcon size={14} />
            <span>
              Slika: {log.imageDetails.imageName}
              {log.imageDetails.imageUrl && (
                <button 
                  className="view-image-btn"
                  onClick={() => setShowImageModal(true)}
                >
                  Prikaži
                </button>
              )}
            </span>
          </div>
        )}

        {log.commentText && (
          <div className="log-comment">
            <CommentIcon size={14} />
            <span>"{log.commentText}"</span>
          </div>
        )}

        {log.statusChange && (
          <div className="log-status-change">
            <span className="status-from">{log.statusChange.oldStatus}</span>
            <span className="status-arrow">→</span>
            <span className="status-to">{log.statusChange.newStatus}</span>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && log.imageDetails?.imageUrl && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="image-modal-close"
              onClick={() => setShowImageModal(false)}
            >
              <CloseIcon size={20} />
            </button>
            <img 
              src={log.imageDetails.imageUrl} 
              alt={log.imageDetails.imageName}
              className="modal-image"
            />
            <p className="image-caption">{log.imageDetails.imageName}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Dashboard Section Component
const DashboardSection = ({ 
  dashboardData, 
  dashboardFilters, 
  handleDashboardFilterChange, 
  resetDashboardFilters, 
  filterOptions, 
  loading,
  handleDateRangeModeToggle
}) => {
  useEffect(() => {
    // Load Chart.js from CDN
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      document.head.appendChild(script);
    }
  }, []);

  return (
  <div className="dashboard-container">
    {/* Enhanced Filter Section */}
    <div className="dashboard-filters">
      <div className="filter-row">
        <div className="filter-group">
          <label>
            <CalendarIcon className="icon-sm" />
            Datum/Period:
          </label>
          <div className="date-filter-container">
            <button 
              className={`date-mode-toggle ${dashboardFilters.dateRangeMode ? 'active' : ''}`}
              onClick={handleDateRangeModeToggle}
            >
              {dashboardFilters.dateRangeMode ? 'Opseg datuma' : 'Period'}
            </button>
            
            {dashboardFilters.dateRangeMode ? (
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={dashboardFilters.startDate ? dashboardFilters.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDashboardFilterChange('startDate', new Date(e.target.value))}
                  className="date-input"
                />
                <span className="date-separator">do</span>
                <input
                  type="date"
                  value={dashboardFilters.endDate ? dashboardFilters.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDashboardFilterChange('endDate', new Date(e.target.value))}
                  className="date-input"
                />
              </div>
            ) : (
              <select
                value={dashboardFilters.period}
                onChange={(e) => handleDashboardFilterChange('period', e.target.value)}
                className="filter-select"
              >
                <option value="danas">Danas</option>
                <option value="nedelja">Ova nedelja</option>
                <option value="mesec">Ovaj mesec</option>
                <option value="kvartal">Ovaj kvartal</option>
                <option value="godina">Ova godina</option>
              </select>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>
            <HardHatIcon className="icon-sm" />
            Tehnićar:
          </label>
          <select
            value={dashboardFilters.technician}
            onChange={(e) => handleDashboardFilterChange('technician', e.target.value)}
            className="filter-select"
          >
            <option value="all">Svi tehnićari</option>
            {filterOptions.technicians.map(tech => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Opština:</label>
          <select
            value={dashboardFilters.municipality}
            onChange={(e) => handleDashboardFilterChange('municipality', e.target.value)}
            className="filter-select"
          >
            <option value="all">Sve opštine</option>
            {filterOptions.municipalities.map(mun => (
              <option key={mun} value={mun}>{mun}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Tip akcije:</label>
          <select
            value={dashboardFilters.action}
            onChange={(e) => handleDashboardFilterChange('action', e.target.value)}
            className="filter-select"
          >
            <option value="all">Sve akcije</option>
            {filterOptions.actions.map(action => (
              <option key={action.value} value={action.value}>{action.label}</option>
            ))}
          </select>
        </div>
        
        <button onClick={resetDashboardFilters} className="reset-filters-btn">
          <RefreshIcon className="icon-sm" />
          Resetuj filtere
        </button>
      </div>
    </div>

    {loading ? (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Učitavanje dashboard podataka...</p>
      </div>
    ) : (
      <>
        {/* Existing KPI Cards */}
        {dashboardData.kpi && (
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-icon">
                <ChartIcon className="icon-lg" />
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.kpi.totalActions}</h3>
                <p>Ukupno akcija</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">
                <CheckIcon className="icon-lg" />
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.kpi.completedWorkOrders}</h3>
                <p>Završeni radni nalozi</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">
                <HardHatIcon className="icon-lg" />
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.kpi.activeTechniciansCount}</h3>
                <p>Aktivni tehnićari</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">
                <ClockIcon className="icon-lg" />
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.kpi.avgResponseTime}h</h3>
                <p>Prosečno vreme odgovora</p>
              </div>
            </div>
          </div>
        )}

        {/* Existing Charts Grid */}
        {dashboardData.charts && (
          <div className="charts-grid">
            <div className="chart-container">
              <h3>Distribucija akcija</h3>
              <DoughnutChart 
                data={dashboardData.charts.actionsDistribution}
                actionLabels={filterOptions.actions.reduce((acc, action) => {
                  acc[action.value] = action.label;
                  return acc;
                }, {})}
              />
            </div>
            <div className="chart-container">
              <h3>Status radnih naloga</h3>
              <PieChart data={dashboardData.charts.statusBreakdown} />
            </div>
            <div className="chart-container">
              <h3>Produktivnost tehničara</h3>
              <BarChart data={dashboardData.charts.technicianProductivity} />
            </div>
            <div className="chart-container">
              <h3>Materijali po opštinama</h3>
              <RadarChart data={dashboardData.charts.municipalityMaterials} />
            </div>
            <div className="chart-container chart-wide">
              <h3>Aktivnost tokom vremena</h3>
              <LineChart data={dashboardData.charts.activityTimeline} />
            </div>
          </div>
        )}

        {/* Existing Tables Section */}
        {dashboardData.tables && (
          <div className="tables-grid">
            <div className="table-container">
              <h3>Top 10 tehnićara</h3>
              <TopTechniciansTable data={dashboardData.tables.topTechnicians} />
            </div>
            <div className="table-container">
              <h3>Nedavne aktivnosti</h3>
              <RecentActionsTable 
                data={dashboardData.tables.recentActions}
                actionLabels={filterOptions.actions.reduce((acc, action) => {
                  acc[action.value] = action.label;
                  return acc;
                }, {})}
              />
            </div>
            <div className="table-container table-wide">
              <h3>Problematični radni nalozi</h3>
              <ProblematicWorkOrdersTable data={dashboardData.tables.problematicWorkOrders} />
            </div>
          </div>
        )}

        {/* NEW: Map and Travel Analytics Section */}
        <div className="map-analytics-section">
          <h2 className="section-title">
            <CommentIcon className="icon-md" />
            Mapa lokacija i analiza putovanja
          </h2>
          
          {/* Interactive Map */}
          <div className="map-container">
            <h3>Lokacije tehničara</h3>
            <TechnicianLocationMap 
              mapData={dashboardData.mapData || []}
              filters={dashboardFilters}
            />
          </div>
          
          {/* Travel Time Analytics */}
          <div className="travel-analytics-container">
            <h3>Analiza vremena putovanja</h3>
            <TravelTimeAnalytics 
              analyticsData={dashboardData.travelAnalytics || []}
              filters={dashboardFilters}
            />
          </div>
        </div>
             </>
     )}
   </div>
  );
};

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// NEW: Technician Location Map Component with Real Leaflet
const TechnicianLocationMap = ({ mapData, filters }) => {
  const [visibleTechnicians, setVisibleTechnicians] = useState(new Set());
  const [showRoutes, setShowRoutes] = useState(true);
  const [geocodedLocations, setGeocodedLocations] = useState(new Map());
  const [geocodingStatus, setGeocodingStatus] = useState('idle'); // idle, loading, complete, error
  const mapRef = useRef(null);
  
  // Geocoding function using backend API
  const geocodeAddress = async (address) => {
    try {
      console.log('🌍 Geocoding address via backend:', address);
      
      // Use backend geocoding endpoint instead of direct Nominatim calls
      const response = await fetch('/api/logs/geocode-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [address]
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🎯 Backend geocoding response:', data);
      
      if (data.results && data.results.length > 0 && data.results[0].status === 'success') {
        const result = data.results[0];
        return {
          lat: result.coordinates.lat,
          lng: result.coordinates.lng,
          success: true
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Backend geocoding error:', error);
      return { success: false };
    }
  };



  // Geocode all locations
  useEffect(() => {
    const geocodeAllLocations = async () => {
      console.log('🗺️ MapData received:', mapData);
      
      if (!mapData || mapData.length === 0) {
        console.log('❌ No mapData provided');
        return;
      }
      
      setGeocodingStatus('loading');
      const newGeocodedMap = new Map();
      const addressesToGeocode = new Set();
      
      // Collect unique addresses
      mapData.forEach((techData, index) => {
        console.log(`👤 Technician ${index + 1}:`, techData.technician);
        console.log(`📍 Locations count:`, techData.locations?.length || 0);
        
        if (techData.locations) {
          techData.locations.forEach((location, locIndex) => {
            console.log(`  Location ${locIndex + 1}:`, {
              address: location.address,
              hasCoordinates: !!(location.coordinates?.lat && location.coordinates?.lng),
              coordinates: location.coordinates,
              timestamp: location.timestamp,
              action: location.action
            });
            
            if (location.address && !location.coordinates) {
              addressesToGeocode.add(location.address);
            } else if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
              // Use existing coordinates
              newGeocodedMap.set(location.address || `${location.coordinates.lat},${location.coordinates.lng}`, {
                lat: location.coordinates.lat,
                lng: location.coordinates.lng,
                success: true
              });
            }
          });
        }
      });
      
      console.log('🔍 Unique addresses to geocode:', Array.from(addressesToGeocode));
      
      // Geocode addresses with delay to respect rate limiting
      for (const address of addressesToGeocode) {
        console.log(`🌍 Geocoding: ${address}`);
        const result = await geocodeAddress(address);
        console.log(`📍 Result for "${address}":`, result);
        newGeocodedMap.set(address, result);
        
        // Add delay between requests to avoid overloading backend
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setGeocodedLocations(newGeocodedMap);
      setGeocodingStatus('complete');
      
      console.log('✅ Geocoding complete. Total geocoded locations:', newGeocodedMap.size);
      console.log('🗺️ Final geocoded map:', Object.fromEntries(newGeocodedMap));
    };

    geocodeAllLocations();
  }, [mapData]);
  
  useEffect(() => {
    // Initialize all technicians as visible
    const techNames = mapData.map(item => item.technician);
    setVisibleTechnicians(new Set(techNames));
  }, [mapData]);
  
  const toggleTechnician = (techName) => {
    const newVisible = new Set(visibleTechnicians);
    if (newVisible.has(techName)) {
      newVisible.delete(techName);
    } else {
      newVisible.add(techName);
    }
    setVisibleTechnicians(newVisible);
  };
  
  const technicianColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
  ];
  
  // Create custom icons for each technician
  const createCustomIcon = (color, number) => {
    return new L.DivIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${color};
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${number}</div>
      `,
      className: 'custom-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  };
  
  // Get coordinates for a location
  const getLocationCoordinates = (location) => {
    // First check if location has direct coordinates
    if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
      return [location.coordinates.lat, location.coordinates.lng];
    }
    
    // Then check geocoded locations
    const geocoded = geocodedLocations.get(location.address);
    if (geocoded && geocoded.success) {
      return [geocoded.lat, geocoded.lng];
    }
    
    return null;
  };
  
  // Generate routes for visible technicians
  const generateRoutes = () => {
    if (geocodingStatus !== 'complete') return [];
    
    const routes = [];
    mapData
      .filter(item => visibleTechnicians.has(item.technician))
      .forEach((techData, techIndex) => {
        const color = technicianColors[techIndex % technicianColors.length];
        const locations = techData.locations
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map(loc => ({ ...loc, coords: getLocationCoordinates(loc) }))
          .filter(loc => loc.coords !== null);
        
        // Group locations by day
        const dayGroups = {};
        locations.forEach(location => {
          const day = new Date(location.timestamp).toDateString();
          if (!dayGroups[day]) dayGroups[day] = [];
          dayGroups[day].push(location);
        });
        
        // Create routes for each day
        Object.values(dayGroups).forEach(dayLocations => {
          if (dayLocations.length > 1) {
            const routePoints = dayLocations.map(loc => loc.coords);
            routes.push({
              positions: routePoints,
              color: color,
              technician: techData.technician
            });
          }
        });
      });
    return routes;
  };
  
  const routes = showRoutes ? generateRoutes() : [];
  
  // Belgrade - Borča/Krnjača area coordinates
  const beogradCenter = [44.880, 20.440];
  
  // Get successfully geocoded locations count
  const getGeocodedLocationsCount = () => {
    let count = 0;
    mapData.forEach(techData => {
      techData.locations.forEach(location => {
        if (getLocationCoordinates(location) !== null) {
          count++;
        }
      });
    });
    return count;
  };
  
  return (
    <div className="map-component">
      {/* Geocoding Status */}
      {geocodingStatus === 'loading' && (
        <div className="geocoding-status loading">
          <div className="loading-spinner"></div>
          <p>Pretvaranje adresa u koordinate...</p>
        </div>
      )}
      
      {geocodingStatus === 'complete' && (
        <div className="geocoding-status complete">
          <CheckIcon size={16} />
          <p>Uspešno pronađeno {getGeocodedLocationsCount()} lokacija od {mapData.reduce((sum, item) => sum + item.locations.length, 0)}</p>
        </div>
      )}
      
      {/* Map Controls */}
      <div className="map-controls">
        <div className="technician-toggles">
          <h4>Prikaži tehničare:</h4>
          <div className="technician-chips">
            {mapData.map((item, index) => {
              const validLocations = item.locations.filter(loc => getLocationCoordinates(loc) !== null).length;
              return (
                <label key={item.technician} className="technician-chip">
                  <input
                    type="checkbox"
                    checked={visibleTechnicians.has(item.technician)}
                    onChange={() => toggleTechnician(item.technician)}
                  />
                  <span 
                    className="chip-indicator"
                    style={{ backgroundColor: technicianColors[index % technicianColors.length] }}
                  ></span>
                  {item.technician} ({validLocations}/{item.locations.length})
                </label>
              );
            })}
          </div>
        </div>
        
        <div className="map-options">
          <label className="route-toggle">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
            />
            <span>Prikaži rute</span>
          </label>
        </div>
      </div>
      
      {/* Real Leaflet Map */}
      <div className="leaflet-map-container">
        <MapContainer
          center={beogradCenter}
          zoom={12}
          style={{ height: '500px', width: '100%', borderRadius: '8px' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Render markers for visible technicians */}
          {geocodingStatus === 'complete' && mapData
            .filter(item => visibleTechnicians.has(item.technician))
            .map((techData, techIndex) => {
              const color = technicianColors[techIndex % technicianColors.length];
              return techData.locations
                .map((location, locIndex) => {
                  const coordinates = getLocationCoordinates(location);
                  if (!coordinates) return null;
                  
                  return (
                    <Marker
                      key={`${techData.technician}-${locIndex}`}
                      position={coordinates}
                      icon={createCustomIcon(color, locIndex + 1)}
                    >
                      <Popup>
                        <div className="map-popup">
                          <h5 style={{ color: color, margin: '0 0 8px 0' }}>
                            {techData.technician}
                          </h5>
                          <p><strong>Adresa:</strong> {location.address}</p>
                          <p><strong>Vreme:</strong> {location.formattedTime}</p>
                          <p><strong>Akcija:</strong> {location.action}</p>
                          <p><strong>Redni broj:</strong> {locIndex + 1}</p>
                          <p><strong>Koordinate:</strong> {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })
                .filter(marker => marker !== null);
            })}
          
          {/* Render routes */}
          {routes.map((route, index) => (
            <Polyline
              key={index}
              positions={route.positions}
              color={route.color}
              weight={3}
              opacity={0.7}
              dashArray="5, 10"
            />
          ))}
        </MapContainer>
      </div>
      
      <div className="map-info">
        <div className="map-stats">
          <span>Prikazano lokacija: {getGeocodedLocationsCount()}</span>
          <span>Aktivnih tehničara: {Array.from(visibleTechnicians).length}</span>
          <span>Prikazanih ruta: {routes.length}</span>
        </div>
      </div>
    </div>
  );
};

// NEW: Travel Time Analytics Component
const TravelTimeAnalytics = ({ analyticsData, filters }) => {
  const [expandedTechnicians, setExpandedTechnicians] = useState(new Set());
  const [sortBy, setSortBy] = useState('routes');
  
  // Debug: Log the analytics data
  useEffect(() => {
    console.log('🚗 === TRAVEL ANALYTICS DEBUG ===');
    console.log('📊 Raw analyticsData received:', analyticsData);
    console.log('🔍 Type of analyticsData:', typeof analyticsData);
    console.log('📏 Length of analyticsData:', analyticsData?.length);
    console.log('🎛️ Filters:', filters);
    
    if (analyticsData && analyticsData.length > 0) {
      console.log('👤 First technician sample:', JSON.stringify(analyticsData[0], null, 2));
      
      analyticsData.forEach((tech, index) => {
        console.log(`👨‍🔧 Technician ${index + 1}: ${tech.technician}`);
        console.log(`  📈 Routes: ${tech.totalRoutes || tech.routes?.length || 0}`);
        console.log(`  ⏱️ Avg Travel Time: ${tech.averageTravelTime}`);
        console.log(`  ✅ Avg Completion Time: ${tech.averageCompletionTime}`);
        console.log(`  📋 Total Work Orders: ${tech.totalWorkOrders}`);
        console.log(`  🎯 Total Activities: ${tech.totalActivities}`);
        console.log(`  🗺️ Routes array:`, tech.routes);
      });
    } else {
      console.log('❌ No analytics data or empty array');
    }
    console.log('🚗 === END TRAVEL ANALYTICS DEBUG ===');
  }, [analyticsData, filters]);
  
  const toggleExpanded = (techName) => {
    const newExpanded = new Set(expandedTechnicians);
    if (newExpanded.has(techName)) {
      newExpanded.delete(techName);
    } else {
      newExpanded.add(techName);
    }
    setExpandedTechnicians(newExpanded);
  };
  
  // Safe data processing with fallbacks
  const processedData = (analyticsData || []).map(item => ({
    technician: item.technician || 'Nepoznat tehničar',
    totalRoutes: item.totalRoutes || item.routes?.length || 0,
    averageTravelTime: item.averageTravelTime || 'N/A',
    averageCompletionTime: item.averageCompletionTime || 'N/A',
    totalWorkOrders: item.totalWorkOrders || 0,
    routes: item.routes || [],
    // Additional fallback data
    totalActivities: item.totalActivities || 0,
    averageDistance: item.averageDistance || 'N/A',
    efficiency: item.efficiency || 'N/A'
  }));
  
  const sortedData = [...processedData].sort((a, b) => {
    switch (sortBy) {
      case 'routes':
        return b.totalRoutes - a.totalRoutes;
      case 'travelTime':
        const timeA = parseFloat(a.averageTravelTime) || 0;
        const timeB = parseFloat(b.averageTravelTime) || 0;
        return timeA - timeB;
      case 'completionTime':
        const compA = parseFloat(a.averageCompletionTime) || 0;
        const compB = parseFloat(b.averageCompletionTime) || 0;
        return compA - compB;
      case 'name':
        return a.technician.localeCompare(b.technician);
      case 'activities':
        return b.totalActivities - a.totalActivities;
      default:
        return 0;
    }
  });
  
  const getTravelTimeColor = (travelTime) => {
    if (travelTime === 'N/A') return '#95a5a6'; // Gray for N/A
    const timeStr = String(travelTime).replace(/[^\d.]/g, ''); // Extract numbers
    const minutes = parseFloat(timeStr) || 0;
    if (minutes <= 15) return '#4ECDC4'; // Green - fast
    if (minutes <= 30) return '#FECA57'; // Yellow - normal
    return '#FF6B6B'; // Red - slow
  };
  
  const formatTime = (timeValue) => {
    if (!timeValue || timeValue === 'N/A') return 'N/A';
    if (typeof timeValue === 'string' && timeValue.includes('min')) return timeValue;
    if (typeof timeValue === 'number') return `${timeValue.toFixed(1)} min`;
    return String(timeValue);
  };
  
  return (
    <div className="travel-analytics">
      {/* Debug Information */}
      <div className="debug-info" style={{ 
        background: '#f8f9fa', 
        padding: '10px', 
        borderRadius: '4px', 
        marginBottom: '20px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <p><strong>Debug:</strong> Primljeno {(analyticsData || []).length} tehničara u analytics podacima</p>
        <p><strong>Obrađeno:</strong> {processedData.length} tehničara nakon obrade</p>
        {processedData.length > 0 && (
          <p><strong>Primer podataka:</strong> {JSON.stringify(processedData[0], null, 2).substring(0, 200)}...</p>
        )}
      </div>
      
      {/* Analytics Controls */}
      <div className="analytics-controls">
        <div className="sort-controls">
          <label>Sortiraj po:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="routes">Broj ruta</option>
            <option value="activities">Broj aktivnosti</option>
            <option value="travelTime">Prosečno vreme putovanja</option>
            <option value="completionTime">Prosečno vreme završetka</option>
            <option value="name">Ime (A-Z)</option>
          </select>
        </div>
        
        <div className="analytics-summary">
          <p>
            Ukupno tehničara: {processedData.length} | 
            Ukupno ruta: {processedData.reduce((sum, item) => sum + item.totalRoutes, 0)} |
            Ukupno aktivnosti: {processedData.reduce((sum, item) => sum + item.totalActivities, 0)}
          </p>
        </div>
      </div>
      
      {/* Technician Cards */}
      <div className="technician-analytics-grid">
        {sortedData.map((techData, index) => (
          <div key={`${techData.technician}-${index}`} className="technician-analytics-card">
            <div className="card-header" onClick={() => toggleExpanded(techData.technician)}>
              <div className="technician-info">
                <h4>{techData.technician}</h4>
                <div className="technician-stats">
                  <span className="stat-badge">
                    <ClockIcon className="icon-xs" />
                    {formatTime(techData.averageTravelTime)}
                  </span>
                  <span className="stat-badge">
                    <CheckIcon className="icon-xs" />
                    {formatTime(techData.averageCompletionTime)}
                  </span>
                  <span className="stat-badge">
                    {techData.totalRoutes} ruta
                  </span>
                  <span className="stat-badge">
                    {techData.totalActivities} aktivnosti
                  </span>
                </div>
              </div>
              <button className="expand-btn">
                {expandedTechnicians.has(techData.technician) ? '−' : '+'}
              </button>
            </div>
            
            {expandedTechnicians.has(techData.technician) && (
              <div className="card-content">
                <div className="routes-list">
                  {techData.routes && techData.routes.length > 0 ? (
                    techData.routes.map((route, routeIndex) => (
                      <div key={routeIndex} className="route-item">
                        <div className="route-path">
                          <div className="location-from">
                            <strong>{route.from?.address || 'Nepoznata lokacija'}</strong>
                            <small>{route.from?.time || 'N/A'}</small>
                          </div>
                          <div className="route-arrow">→</div>
                          <div className="location-to">
                            <strong>{route.to?.address || 'Nepoznata lokacija'}</strong>
                            <small>{route.to?.time || 'N/A'}</small>
                          </div>
                        </div>
                        <div 
                          className="travel-time-badge"
                          style={{ backgroundColor: getTravelTimeColor(route.travelTime) }}
                        >
                          {formatTime(route.travelTime)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-routes">
                      <p>Nema dostupnih ruta za izabrani period</p>
                      <small>Možda tehničar radi samo na jednoj lokaciji ili nema dovoljno podataka</small>
                    </div>
                  )}
                </div>
                
                <div className="technician-summary">
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Prosečno vreme između lokacija:</span>
                      <span className="summary-value">{formatTime(techData.averageTravelTime)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Prosečno vreme završavanja naloga:</span>
                      <span className="summary-value">{formatTime(techData.averageCompletionTime)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Ukupno radnih naloga:</span>
                      <span className="summary-value">{techData.totalWorkOrders || 'N/A'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Ukupno aktivnosti:</span>
                      <span className="summary-value">{techData.totalActivities}</span>
                    </div>
                    {techData.averageDistance && techData.averageDistance !== 'N/A' && (
                      <div className="summary-item">
                        <span className="summary-label">Prosečna udaljenost:</span>
                        <span className="summary-value">{techData.averageDistance}</span>
                      </div>
                    )}
                    {techData.efficiency && techData.efficiency !== 'N/A' && (
                      <div className="summary-item">
                        <span className="summary-label">Efikasnost:</span>
                        <span className="summary-value">{techData.efficiency}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Raw data display for debugging */}
                <details className="debug-details" style={{ marginTop: '10px' }}>
                  <summary style={{ fontSize: '12px', color: '#6c757d', cursor: 'pointer' }}>
                    Prikaži sirove podatke (debug)
                  </summary>
                  <pre style={{ 
                    background: '#f8f9fa', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    color: '#495057'
                  }}>
                    {JSON.stringify(techData, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {processedData.length === 0 && (
        <div className="no-data-message">
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <ClockIcon size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <h3>Nema podataka o putovanju</h3>
            <p>Nema dostupnih podataka o putovanju za izabrani period i filtere.</p>
            <small>Proverite da li su tehnićari imali aktivnosti u izabranom periodu.</small>
          </div>
        </div>
      )}
    </div>
  );
};

// Chart Components
const DoughnutChart = ({ data, actionLabels }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (window.Chart && chartRef.current && data && data.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Sort data by count and take top 8 most frequent actions
      const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 8);

      chartInstance.current = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: sortedData.map(item => actionLabels[item._id] || item._id),
          datasets: [{
            data: sortedData.map(item => item.count),
            backgroundColor: [
              'rgba(52, 152, 219, 0.8)',    // Plava
              'rgba(46, 204, 113, 0.8)',    // Zelena
              'rgba(231, 76, 60, 0.8)',     // Crvena
              'rgba(241, 196, 15, 0.8)',    // Žuta
              'rgba(155, 89, 182, 0.8)',    // Ljubičasta
              'rgba(230, 126, 34, 0.8)',    // Narandžasta
              'rgba(52, 73, 94, 0.8)',      // Tamno siva
              'rgba(26, 188, 156, 0.8)'     // Tirkizna
            ],
            borderWidth: 3,
            borderColor: 'rgba(255, 255, 255, 0.8)',
            hoverBorderWidth: 4,
            hoverBorderColor: 'rgba(255, 255, 255, 1)',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '50%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                color: '#2c3e50', 
                font: { size: 12, weight: '500' },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#2c3e50',
              bodyColor: '#2c3e50',
              borderColor: 'rgba(52, 152, 219, 0.5)',
              borderWidth: 2,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed * 100) / total).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              bottom: 10
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, actionLabels]);

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '320px',
        color: '#7f8c8d',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Nema podataka za prikazivanje akcija
      </div>
    );
  }

  return <canvas ref={chartRef} style={{ maxHeight: '320px' }}></canvas>;
};

const PieChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (window.Chart && chartRef.current && data && data.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Status labels mapping
      const statusLabels = {
        'Na čekanju': 'Na čekanju',
        'U toku': 'U toku',
        'Završen': 'Završen',
        'Otkazan': 'Otkazan',
        'Odložen': 'Odložen',
        'Kreiran': 'Kreiran',
        'Dodeljen': 'Dodeljen'
      };

      const chartData = data.map(item => ({
        label: statusLabels[item._id] || item._id || 'Nepoznato',
        value: item.count,
        originalId: item._id
      }));

      chartInstance.current = new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: chartData.map(item => item.label),
          datasets: [{
            data: chartData.map(item => item.value),
            backgroundColor: [
              'rgba(52, 152, 219, 0.8)',    // Plava
              'rgba(46, 204, 113, 0.8)',    // Zelena
              'rgba(231, 76, 60, 0.8)',     // Crvena
              'rgba(241, 196, 15, 0.8)',    // Žuta
              'rgba(155, 89, 182, 0.8)',    // Ljubičasta
              'rgba(230, 126, 34, 0.8)',    // Narandžasta
              'rgba(52, 73, 94, 0.8)'       // Tamno siva
            ],
            borderWidth: 3,
            borderColor: 'rgba(255, 255, 255, 0.8)',
            hoverBorderWidth: 4,
            hoverBorderColor: 'rgba(255, 255, 255, 1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                color: '#2c3e50', 
                font: { size: 13, weight: '500' },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#2c3e50',
              bodyColor: '#2c3e50',
              borderColor: 'rgba(52, 152, 219, 0.5)',
              borderWidth: 2,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed * 100) / total).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              bottom: 10
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '320px',
        color: '#7f8c8d',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Nema podataka za prikazivanje
      </div>
    );
  }

  return <canvas ref={chartRef} style={{ maxHeight: '320px' }}></canvas>;
};

const BarChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (window.Chart && chartRef.current && data && data.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Sort data by count and take top 10 most productive technicians
      const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

      const maxValue = Math.max(...sortedData.map(item => item.count));

      chartInstance.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedData.map(item => item._id),
          datasets: [{
            label: 'Broj akcija',
            data: sortedData.map(item => item.count),
            backgroundColor: sortedData.map((_, index) => {
              // Gradient colors from blue to teal
              const intensity = 1 - (index / sortedData.length) * 0.3;
              return `rgba(52, 152, 219, ${intensity * 0.8})`;
            }),
            borderColor: sortedData.map((_, index) => {
              const intensity = 1 - (index / sortedData.length) * 0.3;
              return `rgba(52, 152, 219, ${intensity})`;
            }),
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
            hoverBackgroundColor: sortedData.map(() => 'rgba(52, 152, 219, 0.9)'),
            hoverBorderColor: sortedData.map(() => 'rgba(52, 152, 219, 1)'),
            hoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#2c3e50',
              bodyColor: '#2c3e50',
              borderColor: 'rgba(52, 152, 219, 0.5)',
              borderWidth: 2,
              cornerRadius: 8,
              displayColors: false,
              titleFont: { size: 13, weight: '600' },
              bodyFont: { size: 12 },
              callbacks: {
                title: function(context) {
                  return `Tehničar: ${context[0].label}`;
                },
                label: function(context) {
                  return `Broj akcija: ${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: maxValue + Math.ceil(maxValue * 0.1),
              ticks: { 
                color: '#2c3e50',
                font: { size: 12 },
                callback: function(value) {
                  return Number.isInteger(value) ? value : '';
                }
              },
              grid: { 
                color: 'rgba(52, 152, 219, 0.1)',
                lineWidth: 1
              },
              title: {
                display: true,
                text: 'Broj akcija',
                color: '#2c3e50',
                font: { size: 12, weight: '500' }
              }
            },
            x: {
              ticks: { 
                color: '#2c3e50', 
                maxRotation: 45,
                font: { size: 11 }
              },
              grid: { 
                color: 'rgba(52, 152, 219, 0.1)',
                lineWidth: 1
              },
              title: {
                display: true,
                text: 'Tehničari',
                color: '#2c3e50',
                font: { size: 12, weight: '500' }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '320px',
        color: '#7f8c8d',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Nema podataka za prikazivanje
      </div>
    );
  }

  return <canvas ref={chartRef} style={{ maxHeight: '320px' }}></canvas>;
};

const RadarChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (window.Chart && chartRef.current && data && data.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Sort data by total materials (added + removed) for better visualization
      const sortedData = data.sort((a, b) => 
        (b.materialAdded + b.materialRemoved) - (a.materialAdded + a.materialRemoved)
      ).slice(0, 8); // Show top 8 municipalities

      chartInstance.current = new window.Chart(ctx, {
        type: 'radar',
        data: {
          labels: sortedData.map(item => item._id || 'Nepoznato'),
          datasets: [
            {
              label: 'Dodano materijala',
              data: sortedData.map(item => item.materialAdded || 0),
              backgroundColor: 'rgba(52, 152, 219, 0.25)',
              borderColor: 'rgba(52, 152, 219, 0.8)',
              borderWidth: 3,
              pointBackgroundColor: 'rgba(52, 152, 219, 0.9)',
              pointBorderColor: 'rgba(255, 255, 255, 0.8)',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7
            },
            {
              label: 'Uklonjeno materijala',
              data: sortedData.map(item => item.materialRemoved || 0),
              backgroundColor: 'rgba(231, 76, 60, 0.25)',
              borderColor: 'rgba(231, 76, 60, 0.8)',
              borderWidth: 3,
              pointBackgroundColor: 'rgba(231, 76, 60, 0.9)',
              pointBorderColor: 'rgba(255, 255, 255, 0.8)',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                color: '#2c3e50', 
                font: { size: 13, weight: '500' },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#2c3e50',
              bodyColor: '#2c3e50',
              borderColor: 'rgba(52, 152, 219, 0.5)',
              borderWidth: 2,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed} materijala`;
                }
              }
            }
          },
          scales: {
            r: {
              min: 0,
              angleLines: { 
                color: 'rgba(52, 152, 219, 0.2)',
                lineWidth: 1
              },
              grid: { 
                color: 'rgba(52, 152, 219, 0.15)',
                lineWidth: 1
              },
              pointLabels: { 
                color: '#2c3e50', 
                font: { size: 12, weight: '500' },
                padding: 8
              },
              ticks: { 
                color: '#7f8c8d', 
                backdropColor: 'rgba(255, 255, 255, 0.8)',
                backdropPadding: 4,
                font: { size: 11 },
                stepSize: 1
              }
            }
          },
          layout: {
            padding: {
              top: 20,
              bottom: 10
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '320px',
        color: '#7f8c8d',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Nema podataka za prikazivanje
      </div>
    );
  }

  return <canvas ref={chartRef} style={{ maxHeight: '320px' }}></canvas>;
};

const LineChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (window.Chart && chartRef.current && data && data.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Sort data chronologically
      const sortedData = [...data].sort((a, b) => {
        const aTime = a._id.year * 10000 + (a._id.month || 0) * 100 + (a._id.day || 0) + (a._id.hour || 0) * 0.01;
        const bTime = b._id.year * 10000 + (b._id.month || 0) * 100 + (b._id.day || 0) + (b._id.hour || 0) * 0.01;
        return aTime - bTime;
      });

      const labels = sortedData.map(item => {
        const id = item._id;
        if (id.hour !== undefined) {
          return `${String(id.day).padStart(2, '0')}.${String(id.month).padStart(2, '0')} ${String(id.hour).padStart(2, '0')}:00`;
        } else if (id.day !== undefined) {
          return `${String(id.day).padStart(2, '0')}.${String(id.month).padStart(2, '0')}.${id.year}`;
        } else if (id.week !== undefined) {
          return `${id.year} W${id.week}`;
        } else {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
          return `${monthNames[id.month - 1]} ${id.year}`;
        }
      });

      const maxValue = Math.max(...sortedData.map(item => item.count));
      const minValue = Math.min(...sortedData.map(item => item.count));

      chartInstance.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Broj aktivnosti',
            data: sortedData.map(item => item.count),
            backgroundColor: 'rgba(52, 152, 219, 0.15)',
            borderColor: 'rgba(52, 152, 219, 0.8)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgba(52, 152, 219, 0.9)',
            pointBorderColor: 'rgba(255, 255, 255, 0.8)',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: 'rgba(52, 152, 219, 1)',
            pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
            pointHoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { 
                color: '#2c3e50', 
                font: { size: 14, weight: '500' },
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#2c3e50',
              bodyColor: '#2c3e50',
              borderColor: 'rgba(52, 152, 219, 0.5)',
              borderWidth: 2,
              cornerRadius: 8,
              displayColors: true,
              titleFont: { size: 13, weight: '600' },
              bodyFont: { size: 12 },
              callbacks: {
                title: function(context) {
                  return `Vreme: ${context[0].label}`;
                },
                label: function(context) {
                  return `Aktivnosti: ${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              min: Math.max(0, minValue - Math.ceil(maxValue * 0.1)),
              max: maxValue + Math.ceil(maxValue * 0.1),
              ticks: { 
                color: '#2c3e50',
                font: { size: 12 },
                callback: function(value) {
                  return Number.isInteger(value) ? value : '';
                }
              },
              grid: { 
                color: 'rgba(52, 152, 219, 0.1)',
                lineWidth: 1
              },
              title: {
                display: true,
                text: 'Broj aktivnosti',
                color: '#2c3e50',
                font: { size: 12, weight: '500' }
              }
            },
            x: {
              ticks: { 
                color: '#2c3e50', 
                maxRotation: 45,
                font: { size: 11 }
              },
              grid: { 
                color: 'rgba(52, 152, 219, 0.1)',
                lineWidth: 1
              },
              title: {
                display: true,
                text: 'Vreme',
                color: '#2c3e50',
                font: { size: 12, weight: '500' }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '350px',
        color: '#7f8c8d',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Nema podataka za prikazivanje aktivnosti kroz vreme
      </div>
    );
  }

  return <canvas ref={chartRef} style={{ maxHeight: '350px' }}></canvas>;
};

// Table Components
const TopTechniciansTable = ({ data }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>#</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Tehničar</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Ukupno</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Završeni RN</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Materijali</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Oprema</th>
        </tr>
      </thead>
      <tbody>
        {data.map((tech, index) => (
          <tr key={tech._id}>
            <td style={{ 
              padding: '12px', 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: index < 3 ? 'linear-gradient(135deg, #f39c12, #e74c3c)' : 'rgba(52, 152, 219, 0.1)',
                color: index < 3 ? 'white' : '#2c3e50',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {index + 1}
              </span>
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '14px', 
              fontWeight: '600',
              color: '#2c3e50'
            }}>{tech._id}</td>
            <td style={{ 
              padding: '12px', 
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(52, 152, 219, 0.1)',
                color: '#2c3e50',
                fontWeight: '600'
              }}>
                {tech.totalActions}
              </span>
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(46, 204, 113, 0.1)',
                color: '#27ae60',
                fontWeight: '600'
              }}>
                {tech.completedWorkOrders}
              </span>
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(155, 89, 182, 0.1)',
                color: '#8e44ad',
                fontWeight: '600'
              }}>
                {tech.materialsAdded}
              </span>
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(230, 126, 34, 0.1)',
                color: '#d35400',
                fontWeight: '600'
              }}>
                {tech.equipmentAdded}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RecentActionsTable = ({ data, actionLabels }) => (
  <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ position: 'sticky', top: 0 }}>
        <tr>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Vreme</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Akcija</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Tehničar</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Opis</th>
        </tr>
      </thead>
      <tbody>
        {data.map((log, index) => (
          <tr key={log._id}>
            <td style={{ 
              padding: '12px', 
              fontSize: '12px',
              color: '#7f8c8d',
              fontWeight: '500'
            }}>
              {log.formattedTimestamp}
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '13px'
            }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                background: getActionBadgeColor(log.action),
                color: 'white',
                fontSize: '12px',
                fontWeight: '500',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                {actionLabels[log.action] || log.action}
              </span>
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '13px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>{log.performedByName}</td>
            <td style={{ 
              padding: '12px', 
              fontSize: '13px',
              color: '#34495e',
              lineHeight: '1.4'
            }}>
              {log.description.length > 45 ? `${log.description.substring(0, 45)}...` : log.description}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Helper function for action badge colors
const getActionBadgeColor = (action) => {
  switch (action) {
    case 'material_added':
    case 'equipment_added':
    case 'workorder_finished':
      return 'rgba(46, 204, 113, 0.9)';
    case 'material_removed':
    case 'equipment_removed':
      return 'rgba(231, 76, 60, 0.9)';
    case 'workorder_cancelled':
      return 'rgba(192, 57, 43, 0.9)';
    case 'workorder_postponed':
      return 'rgba(241, 196, 15, 0.9)';
    case 'comment_added':
    case 'image_added':
      return 'rgba(52, 152, 219, 0.9)';
    case 'workorder_created':
    case 'workorder_assigned':
      return 'rgba(155, 89, 182, 0.9)';
    default:
      return 'rgba(149, 165, 166, 0.9)';
  }
};

const ProblematicWorkOrdersTable = ({ data }) => (
  <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ position: 'sticky', top: 0 }}>
        <tr>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Korisnik</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'left', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Adresa</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Status</th>
          <th style={{ 
            padding: '14px 12px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '600'
          }}>Vreme</th>
        </tr>
      </thead>
      <tbody>
        {data.map((wo, index) => (
          <tr key={wo._id}>
            <td style={{ 
              padding: '12px', 
              fontSize: '13px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              {wo.workOrderInfo?.userName || 'N/A'}
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '13px',
              color: '#34495e',
              lineHeight: '1.4'
            }}>
              <span style={{
                display: 'block',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }} title={wo.workOrderInfo?.address || 'N/A'}>
                {wo.workOrderInfo?.address || 'N/A'}
              </span>
              {wo.workOrderInfo?.municipality && (
                <span style={{
                  fontSize: '11px',
                  color: '#7f8c8d',
                  fontStyle: 'italic'
                }}>
                  {wo.workOrderInfo.municipality}
                </span>
              )}
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '13px',
              textAlign: 'center'
            }}>
              <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: wo.lastAction === 'workorder_cancelled' 
                  ? 'linear-gradient(135deg, #e74c3c, #c0392b)' 
                  : 'linear-gradient(135deg, #f39c12, #e67e22)',
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {wo.lastAction === 'workorder_cancelled' ? 'Otkazan' : 'Odložen'}
              </span>
            </td>
            <td style={{ 
              padding: '12px', 
              fontSize: '12px',
              color: '#7f8c8d',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>{new Date(wo.lastTimestamp).toLocaleDateString('sr-RS')}</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>
                  {new Date(wo.lastTimestamp).toLocaleTimeString('sr-RS', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Material Validation Section Component
const MaterialValidationSection = ({ materialValidationData, showMaterialValidation, setShowMaterialValidation }) => {
  const { averages, anomalies, loading } = materialValidationData;
  
  const navigateToWorkOrder = (workOrderId) => {
    if (!workOrderId) {
      toast.error('ID radnog naloga nije dostupan');
      return;
    }
    // Navigate to work order detail page - adjust path based on your routing structure
    const workOrderPath = `/work-orders/${workOrderId}`;
    window.open(workOrderPath, '_blank');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#e74c3c';
      case 'medium':
        return '#f39c12';
      default:
        return '#3498db';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'high':
        return 'VISOKA';
      case 'medium':
        return 'SREDNJA';
      default:
        return 'NISKA';
    }
  };

  return (
    <div className="material-validation-section">
      <div className="material-validation-header">
        <div className="section-info">
          <MaterialIcon size={24} />
          <div>
            <h3>Validacija korišćenja materijala</h3>
            <p>Praćenje neobičnih količina materijala unesenih od strane tehničara</p>
          </div>
        </div>
        <button 
          className={`toggle-validation-btn ${showMaterialValidation ? 'active' : ''}`}
          onClick={() => setShowMaterialValidation(!showMaterialValidation)}
        >
          {showMaterialValidation ? 'Sakrij' : 'Prikaži'} validaciju
        </button>
      </div>

      {showMaterialValidation && (
        <div className="material-validation-content">
          {loading ? (
            <div className="validation-loading">
              <div className="loading-spinner"></div>
              <p>Analiziram podatke o materijalima...</p>
            </div>
          ) : (
            <>
              {/* Material Usage Averages */}
              <div className="material-averages">
                <h4>Prosečno korišćenje materijala</h4>
                <div className="averages-grid">
                  {Object.entries(averages).map(([materialType, data]) => (
                    <div key={materialType} className="average-card">
                      <div className="average-header">
                        <MaterialIcon size={16} />
                        <span className="material-type">{materialType}</span>
                      </div>
                      <div className="average-stats">
                        <div className="stat">
                          <span className="stat-label">Prosek:</span>
                          <span className="stat-value">{data.average.toFixed(1)}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Prag upozorenja:</span>
                          <span className="stat-value">{data.threshold.toFixed(1)}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Ukupno korišćenja:</span>
                          <span className="stat-value">{data.totalUsages}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anomaly Alerts */}
              <div className="material-anomalies">
                <h4>
                  Upozorenja o neobičnom korišćenju 
                  {anomalies.length > 0 && (
                    <span className="anomaly-count">{anomalies.length}</span>
                  )}
                </h4>
                
                {anomalies.length === 0 ? (
                  <div className="no-anomalies">
                    <CheckIcon size={24} />
                    <p>Nema neobičnih korišćenja materijala u poslednjih 30 dana</p>
                  </div>
                ) : (
                  <div className="anomalies-list">
                    {anomalies.map((anomaly) => (
                      <div key={anomaly._id} className={`anomaly-card severity-${anomaly.severity}`}>
                        <div className="anomaly-header">
                          <div className="anomaly-icon">
                            <MaterialIcon size={20} />
                          </div>
                          <div className="anomaly-info">
                            <div className="anomaly-title">
                              <span className="material-name">{anomaly.materialDetails.materialType}</span>
                              <span 
                                className="severity-badge"
                                style={{ backgroundColor: getSeverityColor(anomaly.severity) }}
                              >
                                {getSeverityLabel(anomaly.severity)} PRIORITET
                              </span>
                            </div>
                            <div className="anomaly-meta">
                              <span className="technician-name">
                                <HardHatIcon size={14} />
                                {anomaly.performedByName}
                              </span>
                              <span className="anomaly-time">
                                <ClockIcon size={14} />
                                {anomaly.formattedTimestamp}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="anomaly-details">
                          <div className="usage-comparison">
                            <div className="usage-item">
                              <span className="usage-label">Unešeno:</span>
                              <span className="usage-value actual">{anomaly.materialDetails.quantity}</span>
                            </div>
                            <div className="usage-item">
                              <span className="usage-label">Očekivano:</span>
                              <span className="usage-value expected">{anomaly.expectedRange}</span>
                            </div>
                            <div className="usage-item">
                              <span className="usage-label">Prag upozorenja:</span>
                              <span className="usage-value threshold">{anomaly.threshold}</span>
                            </div>
                          </div>
                          
                          {anomaly.workOrderInfo && (
                            <div className="work-order-info">
                              <div className="work-order-details">
                                <h5>Detalji radnog naloga:</h5>
                                <p><strong>Korisnik:</strong> {anomaly.workOrderInfo.userName}</p>
                                <p><strong>Adresa:</strong> {anomaly.workOrderInfo.address}</p>
                                <p><strong>Opština:</strong> {anomaly.workOrderInfo.municipality}</p>
                                {anomaly.workOrderInfo.tisId && (
                                  <p><strong>TIS ID:</strong> {anomaly.workOrderInfo.tisId}</p>
                                )}
                              </div>
                              <button 
                                className={`view-work-order-btn ${!anomaly.workOrderInfo.workOrderId ? 'disabled' : ''}`}
                                onClick={() => anomaly.workOrderInfo.workOrderId && navigateToWorkOrder(anomaly.workOrderInfo.workOrderId)}
                                disabled={!anomaly.workOrderInfo.workOrderId}
                              >
                                {anomaly.workOrderInfo.workOrderId ? 'Prikaži radni nalog' : 'RN ID nije dostupan'}
                              </button>
                            </div>
                          )}
                          
                          <div className="anomaly-description">
                            <CommentIcon size={14} />
                            <span>{anomaly.description}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Logs; 