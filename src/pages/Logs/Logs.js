import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  SearchIcon, 
  HardHatIcon, 
  UsersIcon,
  FilterIcon,
  ClockIcon,
  ChartIcon,
  MaterialIcon,
  EquipmentIcon,
  CommentIcon,
  ImageIcon,
  CheckIcon,
  CloseIcon,
  RefreshIcon,
  CalendarIcon
} from '../../components/icons/SvgIcons';
import './Logs.css';

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

  // Dashboard specific state
  const [dashboardData, setDashboardData] = useState({
    kpi: null,
    charts: null,
    tables: null,
    mapData: null,
    travelAnalytics: null
  });
  const [dashboardFilters, setDashboardFilters] = useState({
    period: 'nedelja',
    technician: 'all',
    municipality: 'all',
    action: 'all',
    startDate: null,
    endDate: null,
    dateRangeMode: false
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
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
  const loadDashboardFilters = useCallback(async () => {
    try {
      const response = await logsAPI.getDashboardFilters();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opcija filtera:', error);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const params = {
        period: dashboardFilters.dateRangeMode ? undefined : dashboardFilters.period,
        startDate: dashboardFilters.dateRangeMode ? dashboardFilters.startDate : undefined,
        endDate: dashboardFilters.dateRangeMode ? dashboardFilters.endDate : undefined,
        technician: dashboardFilters.technician === 'all' ? '' : dashboardFilters.technician,
        municipality: dashboardFilters.municipality === 'all' ? '' : dashboardFilters.municipality,
        action: dashboardFilters.action === 'all' ? '' : dashboardFilters.action
      };

      const [kpiResponse, chartsResponse, tablesResponse, mapResponse, travelResponse] = await Promise.all([
        logsAPI.getDashboardKPI(params),
        logsAPI.getDashboardCharts(params),
        logsAPI.getDashboardTables(params),
        logsAPI.getMapData(params),
        logsAPI.getTravelAnalytics(params)
      ]);

      setDashboardData({
        kpi: kpiResponse.data,
        charts: chartsResponse.data,
        tables: tablesResponse.data,
        mapData: mapResponse.data,
        travelAnalytics: travelResponse.data
      });
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      toast.error('Greška pri učitavanju dashboard podataka');
    } finally {
      setDashboardLoading(false);
    }
  }, [dashboardFilters]);

  const handleDashboardFilterChange = (filterType, value) => {
    setDashboardFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleDateRangeModeToggle = () => {
    setDashboardFilters(prev => ({
      ...prev,
      dateRangeMode: !prev.dateRangeMode,
      period: !prev.dateRangeMode ? 'all' : 'nedelja',
      startDate: !prev.dateRangeMode ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null,
      endDate: !prev.dateRangeMode ? new Date() : null
    }));
  };

  const resetDashboardFilters = () => {
    setDashboardFilters({
      period: 'nedelja',
      technician: 'all',
      municipality: 'all',
      action: 'all',
      startDate: null,
      endDate: null,
      dateRangeMode: false
    });
  };

  useEffect(() => {
    loadActions();
    loadStatistics();
    loadDashboardFilters();
  }, [loadActions, loadStatistics, loadDashboardFilters]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'technicians') {
      loadTechnicianLogs();
      loadMaterialValidationData();
    } else {
      loadUserLogs();
    }
  }, [activeTab, loadTechnicianLogs, loadUserLogs, loadDashboardData, loadMaterialValidationData]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    }
  }, [dashboardFilters, loadDashboardData, activeTab]);

  // Search and filter handlers
  const handleSearch = () => {
    if (activeTab === 'technicians') {
      loadTechnicianLogs(1);
    } else {
      loadUserLogs(1);
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedAction('all');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => {
      if (activeTab === 'technicians') {
        loadTechnicianLogs(1);
      } else {
        loadUserLogs(1);
      }
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
    <div className="logs-page">
      <div className="logs-header">
        <div className="logs-title-section">
          <h1 className="logs-title">
            <ChartIcon size={24} />
            Logovi aktivnosti
          </h1>
          <p className="logs-subtitle">
            Praćenje svih aktivnosti tehničara i radnih naloga
          </p>
        </div>

        {statistics && (
          <div className="logs-stats">
            <div className="stat-item">
              <span className="stat-value">{statistics.totalLogs}</span>
              <span className="stat-label">Ukupno logova</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{statistics.todayLogs}</span>
              <span className="stat-label">Danas</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="logs-tabs">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <ChartIcon size={20} />
          <span>Dashboard</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'technicians' ? 'active' : ''}`}
          onClick={() => setActiveTab('technicians')}
        >
          <HardHatIcon size={20} />
          <span>Tehničari</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UsersIcon size={20} />
          <span>Korisnici</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="logs-controls">
        <div className="search-section">
          <div className="search-input-container">
            <SearchIcon size={18} />
            <input
              type="text"
              placeholder={`Pretraži ${activeTab === 'technicians' ? 'po tehničaru, opisu, korisniku...' : 'po korisniku, adresi, tehničaru...'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
          </div>
          <button onClick={handleSearch} className="search-btn">
            <SearchIcon size={16} />
          </button>
        </div>

        <button 
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterIcon size={16} />
          Filteri
        </button>

        <button onClick={handleReset} className="reset-btn">
          <RefreshIcon size={16} />
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Akcija:</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="filter-select"
              >
                <option value="all">Sve akcije</option>
                {availableActions.map(action => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Od datuma:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="filter-date"
              />
            </div>

            <div className="filter-group">
              <label>Do datuma:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="filter-date"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="logs-content">
        {activeTab === 'dashboard' ? (
          <DashboardSection 
            dashboardData={dashboardData} 
            dashboardFilters={dashboardFilters}
            handleDashboardFilterChange={handleDashboardFilterChange}
            handleDateRangeModeToggle={handleDateRangeModeToggle}
            resetDashboardFilters={resetDashboardFilters}
            filterOptions={filterOptions}
            loading={dashboardLoading}
          />
        ) : loading ? (
          <div className="logs-loading">
            <div className="loading-spinner"></div>
            <p>Učitava logove...</p>
          </div>
        ) : (
          <>
            {activeTab === 'technicians' ? (
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

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="logs-pagination">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => {
                    const newPage = pagination.page - 1;
                    if (activeTab === 'technicians') {
                      loadTechnicianLogs(newPage);
                    } else {
                      loadUserLogs(newPage);
                    }
                  }}
                  className="pagination-btn"
                >
                  Prethodna
                </button>
                
                <span className="pagination-info">
                  Strana {pagination.page} od {pagination.pages}
                  ({pagination.total} ukupno)
                </span>

                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => {
                    const newPage = pagination.page + 1;
                    if (activeTab === 'technicians') {
                      loadTechnicianLogs(newPage);
                    } else {
                      loadUserLogs(newPage);
                    }
                  }}
                  className="pagination-btn"
                >
                  Sledeća
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Technician Logs Section Component
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
  const mapRef = useRef(null);
  
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
  
  // Generate routes for visible technicians
  const generateRoutes = () => {
    const routes = [];
    mapData
      .filter(item => visibleTechnicians.has(item.technician))
      .forEach((techData, techIndex) => {
        const color = technicianColors[techIndex % technicianColors.length];
        const locations = techData.locations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
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
            const routePoints = dayLocations.map(loc => [loc.coordinates.lat, loc.coordinates.lng]);
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
  
  return (
    <div className="map-component">
      {/* Map Controls */}
      <div className="map-controls">
        <div className="technician-toggles">
          <h4>Prikaži tehnićare:</h4>
          <div className="technician-chips">
            {mapData.map((item, index) => (
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
                {item.technician} ({item.locations.length})
              </label>
            ))}
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
          {mapData
            .filter(item => visibleTechnicians.has(item.technician))
            .map((techData, techIndex) => {
              const color = technicianColors[techIndex % technicianColors.length];
              return techData.locations.map((location, locIndex) => (
                <Marker
                  key={`${techData.technician}-${locIndex}`}
                  position={[location.coordinates.lat, location.coordinates.lng]}
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
                    </div>
                  </Popup>
                </Marker>
              ));
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
          <span>Ukupno lokacija: {mapData.reduce((sum, item) => sum + (visibleTechnicians.has(item.technician) ? item.locations.length : 0), 0)}</span>
          <span>Aktivnih tehnićara: {Array.from(visibleTechnicians).length}</span>
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
  
  const toggleExpanded = (techName) => {
    const newExpanded = new Set(expandedTechnicians);
    if (newExpanded.has(techName)) {
      newExpanded.delete(techName);
    } else {
      newExpanded.add(techName);
    }
    setExpandedTechnicians(newExpanded);
  };
  
  const sortedData = [...analyticsData].sort((a, b) => {
    switch (sortBy) {
      case 'routes':
        return b.totalRoutes - a.totalRoutes;
      case 'travelTime':
        return parseInt(a.averageTravelTime) - parseInt(b.averageTravelTime);
      case 'completionTime':
        return parseFloat(a.averageCompletionTime) - parseFloat(b.averageCompletionTime);
      case 'name':
        return a.technician.localeCompare(b.technician);
      default:
        return 0;
    }
  });
  
  const getTravelTimeColor = (travelTime) => {
    const minutes = parseInt(travelTime);
    if (minutes <= 15) return '#4ECDC4'; // Green - fast
    if (minutes <= 30) return '#FECA57'; // Yellow - normal
    return '#FF6B6B'; // Red - slow
  };
  
  return (
    <div className="travel-analytics">
      {/* Analytics Controls */}
      <div className="analytics-controls">
        <div className="sort-controls">
          <label>Sortiraj po:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="routes">Broj ruta</option>
            <option value="travelTime">Prosečno vreme putovanja</option>
            <option value="completionTime">Prosečno vreme završetka</option>
            <option value="name">Ime (A-Z)</option>
          </select>
        </div>
        
        <div className="analytics-summary">
          <p>Ukupno tehnića: {analyticsData.length} | 
             Ukupno ruta: {analyticsData.reduce((sum, item) => sum + item.totalRoutes, 0)}</p>
        </div>
      </div>
      
      {/* Technician Cards */}
      <div className="technician-analytics-grid">
        {sortedData.map((techData, index) => (
          <div key={techData.technician} className="technician-analytics-card">
            <div className="card-header" onClick={() => toggleExpanded(techData.technician)}>
              <div className="technician-info">
                <h4>{techData.technician}</h4>
                <div className="technician-stats">
                  <span className="stat-badge">
                    <ClockIcon className="icon-xs" />
                    {techData.averageTravelTime}
                  </span>
                  <span className="stat-badge">
                    <CheckIcon className="icon-xs" />
                    {techData.averageCompletionTime}
                  </span>
                  <span className="stat-badge">
                    {techData.totalRoutes} ruta
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
                  {techData.routes.length > 0 ? (
                    techData.routes.map((route, routeIndex) => (
                      <div key={routeIndex} className="route-item">
                        <div className="route-path">
                          <div className="location-from">
                            <strong>{route.from.address}</strong>
                            <small>{route.from.time}</small>
                          </div>
                          <div className="route-arrow">→</div>
                          <div className="location-to">
                            <strong>{route.to.address}</strong>
                            <small>{route.to.time}</small>
                          </div>
                        </div>
                        <div 
                          className="travel-time-badge"
                          style={{ backgroundColor: getTravelTimeColor(route.travelTime) }}
                        >
                          {route.travelTime}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-routes">Nema dostupnih ruta za izabrani period</p>
                  )}
                </div>
                
                <div className="technician-summary">
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Prosečno vreme između lokacija:</span>
                      <span className="summary-value">{techData.averageTravelTime}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Prosečno vreme završavanja naloga:</span>
                      <span className="summary-value">{techData.averageCompletionTime}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Ukupno radnih naloga:</span>
                      <span className="summary-value">{techData.totalWorkOrders}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {analyticsData.length === 0 && (
        <div className="no-data-message">
          <p>Nema dostupnih podataka o putovanju za izabrani period i filtere.</p>
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