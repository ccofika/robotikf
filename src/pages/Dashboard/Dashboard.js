import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BoxIcon,
  ToolsIcon,
  UsersIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ClockIcon,
  BarChartIcon,
  PlusIcon,
  RefreshIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  CalendarIcon,
  HistoryIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { cn } from '../../utils/cn';
import { AuthContext } from '../../context/AuthContext';
import AIAnalysisCard from '../../components/dashboard/AIAnalysisCard';

// Helper functions for log icon and color mapping
const getIconForAction = (action) => {
  const iconMap = {
    'workorder_completed': CheckCircleIcon,
    'equipment_added': BoxIcon,
    'material_added': ToolsIcon,
    'technician_added': UsersIcon,
    'vehicle_added': CalendarIcon,
    'default': HistoryIcon
  };
  return iconMap[action] || iconMap.default;
};

const getColorForAction = (action) => {
  const colorMap = {
    'workorder_completed': 'green',
    'equipment_added': 'blue',
    'material_added': 'green',
    'technician_added': 'purple',
    'vehicle_added': 'cyan',
    'default': 'slate'
  };
  return colorMap[action] || colorMap.default;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'superadmin';
  const [stats, setStats] = useState({
    equipment: 0,
    materials: 0,
    technicians: 0,
    workOrders: {
      total: 0,
      completed: 0,
      pending: 0,
      postponed: 0,
      avgCompletionTime: 0
    }
  });

  // Extended stats
  const [vehicleStats, setVehicleStats] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      console.log('Dashboard: Fetching optimized data...');
      const startTime = Date.now();

      // Optimizovano - samo osnovni statsOnly pozivi sa MongoDB projekcijama
      const apiCalls = [
        axios.get(`${apiUrl}/api/equipment?statsOnly=true`),
        axios.get(`${apiUrl}/api/materials?statsOnly=true`),
        axios.get(`${apiUrl}/api/technicians`),
        axios.get(`${apiUrl}/api/workorders/statistics/summary`),
        axios.get(`${apiUrl}/api/vehicles/stats/overview`).catch(() => ({ data: null })),
        axios.get(`${apiUrl}/api/logs/statistics`).catch(() => ({ data: null })),
        axios.get(`${apiUrl}/api/logs/technicians?limit=10`).catch(() => ({ data: { results: [] } }))
      ];

      // Add financial API calls only for superadmin
      if (isSuperAdmin) {
        apiCalls.push(
          axios.get(`${apiUrl}/api/finances/reports?statsOnly=true`).catch(() => ({ data: null })),
          axios.get(`${apiUrl}/api/finances/failed-transactions`).catch(() => ({ data: [] }))
        );
      }

      const responses = await Promise.all(apiCalls);

      const [
        equipment,
        materials,
        techniciansRes,
        workOrderStats,
        vehicleStatsRes,
        logsStatsRes,
        logsRes,
        financialReportsRes,
        failedTransactionsRes
      ] = isSuperAdmin
        ? responses
        : [...responses, { data: null }, { data: [] }];

      const endTime = Date.now();
      console.log(`Dashboard: Data fetched in ${endTime - startTime}ms`);

      setStats({
        equipment: equipment.data.total || equipment.data.length || 0,
        materials: materials.data.total || materials.data.length || 0,
        technicians: techniciansRes.data.total || techniciansRes.data.length || 0,
        workOrders: {
          total: workOrderStats.data.total || 0,
          completed: workOrderStats.data.completed || 0,
          pending: workOrderStats.data.pending || 0,
          postponed: workOrderStats.data.postponed || 0,
          avgCompletionTime: workOrderStats.data.avgCompletionTime || 0
        }
      });

      setVehicleStats(vehicleStatsRes.data);
      setFinancialStats(financialReportsRes.data?.summary || null);
      setActivityStats(logsStatsRes.data);
      setFailedTransactions(failedTransactionsRes.data || []);

      // Process Recent Activity from logs
      const logsData = logsRes.data?.results || logsRes.data?.data || [];
      console.log('logsData before processing:', logsData);

      // Extract individual logs from grouped results
      const allLogs = [];
      if (Array.isArray(logsData)) {
        logsData.forEach(group => {
          if (group.logs && Array.isArray(group.logs)) {
            group.logs.forEach(log => {
              allLogs.push({
                ...log,
                technicianName: group.technicianName || group.userName || 'Nepoznat'
              });
            });
          }
        });
      }

      const recentLogs = allLogs
        .sort((a, b) => {
          const dateA = new Date(a.timestamp || a.createdAt || 0);
          const dateB = new Date(b.timestamp || b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 3)
        .map(log => ({
          type: log.action || 'activity',
          message: log.description || log.action || 'Aktivnost',
          timestamp: log.timestamp || log.createdAt,
          icon: getIconForAction(log.action),
          color: getColorForAction(log.action),
          technicianName: log.technicianName
        }));

      console.log('recentLogs after processing:', recentLogs);
      setRecentActivity(recentLogs);

    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const navigateToWorkOrders = (status) => {
    if (status === 'zavrsen') {
      navigate('/work-orders?tab=all&status=zavrsen');
    } else if (status === 'nezavrsen') {
      navigate('/work-orders?tab=all&status=nezavrsen');
    } else if (status === 'odlozen') {
      navigate('/work-orders?tab=all&status=odlozen');
    } else {
      navigate('/work-orders?tab=all');
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `pre ${diffMins} min`;
    if (diffHours < 24) return `pre ${diffHours}h`;
    return `pre ${Math.floor(diffMs / 86400000)} dana`;
  };

  const getTotalAlerts = () => {
    let count = 0;
    if (failedTransactions.length > 0) count++;
    if (vehicleStats?.expiringRegistrations > 0) count++;
    if (stats.workOrders.postponed > 0) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 font-medium">Učitavanje...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <BarChartIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-600">Pregled sistema</p>
            </div>
          </div>
          <Button
            type="secondary"
            size="small"
            prefix={<RefreshIcon size={16} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchDashboardData}
            disabled={loading}
          >
            Osveži
          </Button>
        </div>
      </div>

      {/* Critical Alerts - Compact */}
      {getTotalAlerts() > 0 && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon size={20} className="text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 text-sm">
                    Upozorenja ({getTotalAlerts()})
                  </h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {failedTransactions.length > 0 && (
                  <button
                    onClick={() => navigate('/finances')}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <DollarSignIcon size={14} />
                    {failedTransactions.length} finansijskih
                  </button>
                )}
                {vehicleStats?.expiringRegistrations > 0 && (
                  <button
                    onClick={() => navigate('/vehicles')}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <CalendarIcon size={14} />
                    {vehicleStats.expiringRegistrations} registracija
                  </button>
                )}
                {stats.workOrders.postponed > 0 && (
                  <button
                    onClick={() => navigateToWorkOrders('odlozen')}
                    className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <ClockIcon size={14} />
                    {stats.workOrders.postponed} odloženih
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid - 8 cards in 4x2 layout */}
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Row 1 - Core Resources */}
          <Link
            to="/equipment"
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <BoxIcon size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Oprema</p>
                <p className="text-2xl font-bold text-slate-900">{stats.equipment}</p>
              </div>
            </div>
          </Link>

          <Link
            to="/materials"
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                <ToolsIcon size={20} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Materijali</p>
                <p className="text-2xl font-bold text-slate-900">{stats.materials}</p>
              </div>
            </div>
          </Link>

          <Link
            to="/technicians"
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <UsersIcon size={20} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Tehničari</p>
                <p className="text-2xl font-bold text-slate-900">{stats.technicians}</p>
              </div>
            </div>
          </Link>

          <Link
            to="/work-orders"
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                <ClipboardIcon size={20} className="text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Radni nalozi</p>
                <p className="text-2xl font-bold text-slate-900">{stats.workOrders.total}</p>
              </div>
            </div>
          </Link>

          {/* Row 2 - Extended Stats */}
          <Link
            to="/vehicles"
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
                <CalendarIcon size={20} className="text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Vozila</p>
                <p className="text-2xl font-bold text-slate-900">{vehicleStats?.totalVehicles || 0}</p>
                {vehicleStats?.expiringRegistrations > 0 && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon size={10} />
                    {vehicleStats.expiringRegistrations} ističe
                  </p>
                )}
              </div>
            </div>
          </Link>

          {isSuperAdmin && financialStats && (
            <Link
              to="/finances"
              className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                  <DollarSignIcon size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 uppercase font-medium">Profit (mesec)</p>
                  <p className="text-xl font-bold text-emerald-900">
                    {((financialStats.totalProfit || 0) / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            </Link>
          )}

          <Link
            to="/logs"
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <HistoryIcon size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Aktivnosti</p>
                <p className="text-2xl font-bold text-slate-900">{activityStats?.todayLogs || 0}</p>
              </div>
            </div>
          </Link>

          {/* 8th Card - Completion Rate */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 rounded-lg">
                <CheckCircleIcon size={20} className="text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 uppercase font-medium">Stopa završavanja</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.workOrders.total > 0
                    ? Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Orders Status - Prominent Section */}
      <div className="mb-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardIcon size={18} className="text-orange-600" />
              Status radnih naloga
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => navigateToWorkOrders('zavrsen')}
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon size={20} className="text-green-600" />
                    <span className="font-medium text-slate-900">Završeni</span>
                  </div>
                  {stats.workOrders.total > 0 && (
                    <span className="text-sm font-semibold text-green-600">
                      {Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.workOrders.completed}</p>
              </div>

              <div
                onClick={() => navigateToWorkOrders('nezavrsen')}
                className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ClockIcon size={20} className="text-blue-600" />
                    <span className="font-medium text-slate-900">U toku</span>
                  </div>
                  {stats.workOrders.total > 0 && (
                    <span className="text-sm font-semibold text-blue-600">
                      {Math.round((stats.workOrders.pending / stats.workOrders.total) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.workOrders.pending}</p>
              </div>

              <div
                onClick={() => navigateToWorkOrders('odlozen')}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ClockIcon size={20} className="text-yellow-600" />
                    <span className="font-medium text-slate-900">Odloženi</span>
                  </div>
                  {stats.workOrders.total > 0 && (
                    <span className="text-sm font-semibold text-yellow-600">
                      {Math.round((stats.workOrders.postponed / stats.workOrders.total) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-yellow-600">{stats.workOrders.postponed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview - Half Width - Only for Superadmin */}
      {isSuperAdmin && financialStats && (
        <div className="mb-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSignIcon size={18} className="text-emerald-600" />
                Finansije (ovaj mesec)
              </h2>
              <Link to="/finances" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                Detalji →
              </Link>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Prihod</p>
                  <p className="text-lg font-bold text-green-600">
                    {((financialStats.totalRevenue || 0) / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Troškovi</p>
                  <p className="text-lg font-bold text-red-600">
                    {((financialStats.totalPayouts || 0) / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Profit</p>
                  <p className="text-lg font-bold text-blue-600">
                    {((financialStats.totalProfit || 0) / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
              {failedTransactions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangleIcon size={12} />
                      {failedTransactions.length} neuspešnih transakcija
                    </span>
                    <Link to="/finances" className="text-red-600 hover:text-red-700">
                      Reši →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics - Vozni park + Performanse sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Vehicle Fleet Overview */}
        {vehicleStats && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarIcon size={18} className="text-cyan-600" />
                Vozni park
              </h2>
              <Link to="/vehicles" className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                Detalji →
              </Link>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-2">Ukupno vozila</p>
                  <p className="text-2xl font-bold text-slate-900">{vehicleStats.totalVehicles || 0}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-2">Aktivna</p>
                  <p className="text-2xl font-bold text-green-600">{vehicleStats.activeVehicles || 0}</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-2">Registracije ističu</p>
                  <p className="text-2xl font-bold text-yellow-600">{vehicleStats.expiringRegistrations || 0}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-2">Servisni troškovi</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {((vehicleStats.totalServiceCosts || 0) / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Performance */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <BarChartIcon size={18} className="text-blue-600" />
              Performanse sistema
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Prosečno vreme završavanja</p>
                  <p className="text-xs text-slate-600">Radnih naloga</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.workOrders.avgCompletionTime || 2.5}d
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Prosek po tehničaru</p>
                  <p className="text-xs text-slate-600">Radnih naloga</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.technicians > 0 ? Math.round(stats.workOrders.total / stats.technicians) : 0}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Efikasnost sistema</p>
                  <p className="text-xs text-slate-600">Stopa uspešnosti</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.workOrders.total > 0
                    ? Math.round(((stats.workOrders.completed / stats.workOrders.total) * 100))
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <HistoryIcon size={18} className="text-indigo-600" />
              Nedavna aktivnost
            </h2>
            <Link to="/logs" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Svi logovi →
            </Link>
          </div>
          <div className="p-4">
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      activity.color === 'green' && "bg-green-100",
                      activity.color === 'blue' && "bg-blue-100",
                      activity.color === 'purple' && "bg-purple-100",
                      activity.color === 'cyan' && "bg-cyan-100",
                      activity.color === 'slate' && "bg-slate-100"
                    )}>
                      <IconComponent size={14} className={cn(
                        activity.color === 'green' && "text-green-600",
                        activity.color === 'blue' && "text-blue-600",
                        activity.color === 'purple' && "text-purple-600",
                        activity.color === 'cyan' && "text-cyan-600",
                        activity.color === 'slate' && "text-slate-600"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-500">{formatTimeAgo(activity.timestamp)}</p>
                        {activity.technicianName && (
                          <>
                            <span className="text-xs text-slate-400">•</span>
                            <p className="text-xs text-slate-600 font-medium">{activity.technicianName}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">Nema nedavnih aktivnosti</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <PlusIcon size={18} className="text-slate-600" />
              Brze akcije
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/work-orders/add"
                className="flex items-center gap-2 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors group"
              >
                <div className="p-1.5 bg-orange-100 group-hover:bg-orange-200 rounded-lg transition-colors">
                  <ClipboardIcon size={16} className="text-orange-600" />
                </div>
                <span className="text-sm font-medium text-slate-900">Novi nalog</span>
              </Link>

              <Link
                to="/equipment/upload"
                className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors group"
              >
                <div className="p-1.5 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                  <BoxIcon size={16} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-900">Dodaj opremu</span>
              </Link>

              <Link
                to="/materials/add"
                className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors group"
              >
                <div className="p-1.5 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                  <ToolsIcon size={16} className="text-green-600" />
                </div>
                <span className="text-sm font-medium text-slate-900">Dodaj materijal</span>
              </Link>

              <Link
                to="/technicians/add"
                className="flex items-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors group"
              >
                <div className="p-1.5 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                  <UsersIcon size={16} className="text-purple-600" />
                </div>
                <span className="text-sm font-medium text-slate-900">Dodaj tehničara</span>
              </Link>

              {isSuperAdmin && (
                <Link
                  to="/finances"
                  className="flex items-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors group"
                >
                  <div className="p-1.5 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors">
                    <DollarSignIcon size={16} className="text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">Finansije</span>
                </Link>
              )}

              <Link
                to="/vehicles"
                className="flex items-center gap-2 p-3 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition-colors group"
              >
                <div className="p-1.5 bg-cyan-100 group-hover:bg-cyan-200 rounded-lg transition-colors">
                  <CalendarIcon size={16} className="text-cyan-600" />
                </div>
                <span className="text-sm font-medium text-slate-900">Vozni park</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Section - Only for admin/supervisor - AT THE BOTTOM */}
      {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'supervisor') && (
        <div className="mt-4">
          <AIAnalysisCard />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
