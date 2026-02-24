import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  BoxIcon,
  ToolsIcon,
  UsersIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  RefreshIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  CalendarIcon,
  HistoryIcon,
  StarIcon,
  ChevronRightIcon,
  SearchIcon
} from '../../components/icons/SvgIcons';
import { cn } from '../../utils/cn';
import { AuthContext } from '../../context/AuthContext';
import api, { reviewsAPI } from '../../services/api';
import GlobalSearch from '../../components/GlobalSearch';

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

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'supervisor';

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

  const [vehicleStats, setVehicleStats] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const apiCalls = [
        api.get('/api/equipment?statsOnly=true'),
        api.get('/api/materials?statsOnly=true'),
        api.get('/api/technicians'),
        api.get('/api/workorders/statistics/summary'),
        api.get('/api/vehicles/stats/overview').catch(() => ({ data: null })),
        api.get('/api/logs/statistics').catch(() => ({ data: null })),
        api.get('/api/logs/technicians?limit=5').catch(() => ({ data: { results: [] } })),
        reviewsAPI.getDashboardSummary().catch(() => ({ data: null }))
      ];

      if (isSuperAdmin) {
        apiCalls.push(
          api.get('/api/finances/reports?statsOnly=true').catch(() => ({ data: null })),
          api.get('/api/finances/failed-transactions').catch(() => ({ data: [] }))
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
        reviewsRes,
        financialReportsRes,
        failedTransactionsRes
      ] = isSuperAdmin
        ? responses
        : [...responses, { data: null }, { data: [] }];

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
      setFinancialStats(financialReportsRes?.data?.summary || null);
      setActivityStats(logsStatsRes.data);
      setFailedTransactions(failedTransactionsRes?.data || []);
      setReviewData(reviewsRes?.data || null);

      const logsData = logsRes.data?.results || logsRes.data?.data || [];
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
        .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
        .slice(0, 5)
        .map(log => ({
          type: log.action || 'activity',
          message: log.description || log.action || 'Aktivnost',
          timestamp: log.timestamp || log.createdAt,
          icon: getIconForAction(log.action),
          color: getColorForAction(log.action),
          technicianName: log.technicianName
        }));

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

  const renderStars = (rating, max = 5) => {
    const stars = [];
    const rounded = Math.round(rating);
    for (let i = 1; i <= max; i++) {
      stars.push(
        <StarIcon
          key={i}
          size={12}
          className={i <= rounded ? 'text-amber-400' : 'text-slate-200'}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Učitavanje...</p>
        </div>
      </div>
    );
  }

  const completionRate = stats.workOrders.total > 0
    ? Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)
    : 0;

  return (
    <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 pb-6">
          <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${searchFocused ? 'w-0 opacity-0' : 'opacity-100'}`}>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">Dashboard</h1>
            <p className="text-sm text-slate-500">Dobrodošli, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3 ml-auto flex-1 justify-end">
            <GlobalSearch onFocusChange={setSearchFocused} expanded={searchFocused} />
            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-900 flex-shrink-0"
              title="Osveži podatke"
            >
              <RefreshIcon size={18} />
            </button>
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-slate-900 text-white text-sm font-medium">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Alerts Banner */}
        {getTotalAlerts() > 0 && (
          <Card className="border border-red-200 bg-white">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-50 rounded-lg">
                    <AlertTriangleIcon size={16} className="text-red-600" />
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">
                    Upozorenja ({getTotalAlerts()})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {failedTransactions.length > 0 && (
                    <button
                      onClick={() => navigate('/finances')}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <DollarSignIcon size={12} />
                      {failedTransactions.length} finansijskih
                    </button>
                  )}
                  {vehicleStats?.expiringRegistrations > 0 && (
                    <button
                      onClick={() => navigate('/vehicles')}
                      className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <CalendarIcon size={12} />
                      {vehicleStats.expiringRegistrations} registracija
                    </button>
                  )}
                  {stats.workOrders.postponed > 0 && (
                    <button
                      onClick={() => navigateToWorkOrders('odlozen')}
                      className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <ClockIcon size={12} />
                      {stats.workOrders.postponed} odloženih
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Stats Grid - 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/work-orders">
            <Card className="bg-slate-900 text-white border-0 hover:bg-slate-800 transition-all cursor-pointer overflow-hidden">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <ClipboardIcon size={20} className="text-white" />
                  </div>
                  <span className="text-xs text-slate-400">Ukupno</span>
                </div>
                <p className="text-sm text-slate-400 mb-1">Radni nalozi</p>
                <p className="text-3xl font-bold mb-2">{stats.workOrders.total.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <span>↑ {completionRate}%</span>
                  <span className="text-slate-500">završeno</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/equipment">
            <Card className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BoxIcon size={20} className="text-blue-600" />
                  </div>
                  <span className="text-xs text-slate-400">Aktivna</span>
                </div>
                <p className="text-sm text-slate-500 mb-1">Oprema</p>
                <p className="text-3xl font-bold text-slate-900 mb-2">{stats.equipment.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <BoxIcon size={10} className="text-slate-400" />
                  <span className="text-slate-400">ukupno uređaja</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/technicians">
            <Card className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-violet-50 rounded-lg">
                    <UsersIcon size={20} className="text-violet-600" />
                  </div>
                  <span className="text-xs text-slate-400">Tim</span>
                </div>
                <p className="text-sm text-slate-500 mb-1">Tehničari</p>
                <p className="text-3xl font-bold text-slate-900 mb-2">{stats.technicians.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>~{stats.technicians > 0 ? Math.round(stats.workOrders.total / stats.technicians) : 0}</span>
                  <span className="text-slate-400">naloga/tehničar</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/materials">
            <Card className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <ToolsIcon size={20} className="text-amber-600" />
                  </div>
                  <span className="text-xs text-slate-400">Stanje</span>
                </div>
                <p className="text-sm text-slate-500 mb-1">Materijali</p>
                <p className="text-3xl font-bold text-slate-900 mb-2">{stats.materials.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ToolsIcon size={10} className="text-slate-400" />
                  <span className="text-slate-400">na lageru</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Middle Section - Chart + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Work Orders Overview Chart */}
          <Card className="lg:col-span-8 bg-white border border-slate-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Pregled radnih naloga</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">Raspodela po statusu</p>
                </div>
                <Link to="/work-orders" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                  Svi nalozi →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56 flex items-end justify-between gap-6 px-4">
                {[
                  { label: 'Završeni', value: stats.workOrders.completed, color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600', status: 'zavrsen' },
                  { label: 'U toku', value: stats.workOrders.pending, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', status: 'nezavrsen' },
                  { label: 'Odloženi', value: stats.workOrders.postponed, color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600', status: 'odlozen' }
                ].map((item) => {
                  const maxVal = Math.max(stats.workOrders.completed, stats.workOrders.pending, stats.workOrders.postponed, 1);
                  const heightPct = Math.max((item.value / maxVal) * 85, 5);
                  return (
                    <div
                      key={item.status}
                      className="flex-1 flex flex-col items-center gap-3 cursor-pointer group"
                      onClick={() => navigateToWorkOrders(item.status)}
                    >
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                      <div className="w-full flex items-end" style={{ height: '170px' }}>
                        <div
                          className={`w-full rounded-t-xl transition-all ${item.color} ${item.hoverColor} group-hover:opacity-90`}
                          style={{ height: `${heightPct}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-slate-900 font-medium transition-colors">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats - Completed & In Progress */}
          <div className="lg:col-span-4 space-y-4">
            <Card
              className="bg-blue-50 border-0 cursor-pointer hover:bg-blue-100/80 transition-colors"
              onClick={() => navigateToWorkOrders('zavrsen')}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 mb-1">Završeni</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.workOrders.completed}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl">
                    <CheckCircleIcon size={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Stopa uspešnosti</span>
                    <span className="text-slate-900 font-semibold">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${completionRate}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-violet-50 border-0 cursor-pointer hover:bg-violet-100/80 transition-colors"
              onClick={() => navigateToWorkOrders('nezavrsen')}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-600 mb-1">U toku</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.workOrders.pending}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl">
                    <ClockIcon size={24} className="text-violet-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-violet-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Prosečno vreme</span>
                    <span className="text-slate-900 font-semibold">{stats.workOrders.avgCompletionTime || 2.5}d</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Grid - Status Breakdown + Recent Activity + Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Status Breakdown */}
          <Card className="lg:col-span-5 bg-white border border-slate-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Status radnih naloga</CardTitle>
                <Link to="/work-orders" className="text-xs text-slate-500 hover:text-slate-900">Svi →</Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y divide-slate-50">
                {[
                  { label: 'Završeni', value: stats.workOrders.completed, color: 'bg-emerald-500', status: 'zavrsen' },
                  { label: 'U toku', value: stats.workOrders.pending, color: 'bg-blue-500', status: 'nezavrsen' },
                  { label: 'Odloženi', value: stats.workOrders.postponed, color: 'bg-amber-500', status: 'odlozen' }
                ].map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 -mx-6 px-6 transition-colors group"
                    onClick={() => navigateToWorkOrders(item.status)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                      <span className="text-sm text-slate-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {stats.workOrders.total > 0 ? Math.round((item.value / stats.workOrders.total) * 100) : 0}%
                      </span>
                      <span className="text-sm font-semibold text-slate-900 w-12 text-right">{item.value}</span>
                      <ChevronRightIcon size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Resources summary */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-3">Resursi</p>
                <div className="grid grid-cols-3 gap-3">
                  <Link to="/equipment" className="text-center hover:bg-slate-50 rounded-lg p-2 transition-colors">
                    <p className="text-xs text-slate-500 mb-1">Oprema</p>
                    <p className="text-lg font-semibold text-slate-900">{stats.equipment}</p>
                  </Link>
                  <Link to="/materials" className="text-center hover:bg-slate-50 rounded-lg p-2 transition-colors">
                    <p className="text-xs text-slate-500 mb-1">Materijali</p>
                    <p className="text-lg font-semibold text-slate-900">{stats.materials}</p>
                  </Link>
                  <Link to="/technicians" className="text-center hover:bg-slate-50 rounded-lg p-2 transition-colors">
                    <p className="text-xs text-slate-500 mb-1">Tehničari</p>
                    <p className="text-lg font-semibold text-slate-900">{stats.technicians}</p>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-4 bg-white border border-slate-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Nedavna aktivnost</CardTitle>
                <Link to="/logs" className="text-xs text-slate-500 hover:text-slate-900">Svi logovi →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-0 divide-y divide-slate-50">
                  {recentActivity.slice(0, 5).map((activity, index) => {
                    const IconComponent = activity.icon;
                    return (
                      <div key={index} className="flex items-start gap-3 py-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          activity.color === 'green' && "bg-green-50",
                          activity.color === 'blue' && "bg-blue-50",
                          activity.color === 'purple' && "bg-purple-50",
                          activity.color === 'cyan' && "bg-cyan-50",
                          activity.color === 'slate' && "bg-slate-50",
                          !activity.color && "bg-slate-50"
                        )}>
                          <IconComponent size={14} className={cn(
                            activity.color === 'green' && "text-green-600",
                            activity.color === 'blue' && "text-blue-600",
                            activity.color === 'purple' && "text-purple-600",
                            activity.color === 'cyan' && "text-cyan-600",
                            activity.color === 'slate' && "text-slate-600",
                            !activity.color && "text-slate-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate">{activity.message}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-400">{formatTimeAgo(activity.timestamp)}</p>
                            {activity.technicianName && (
                              <>
                                <span className="text-xs text-slate-300">·</span>
                                <p className="text-xs text-slate-500 font-medium truncate">{activity.technicianName}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">Nema aktivnosti</p>
              )}
            </CardContent>
          </Card>

          {/* Reviews Card */}
          <Card className="lg:col-span-3 bg-white border border-slate-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Ocene</CardTitle>
                <Link to="/technicians" className="text-xs text-slate-500 hover:text-slate-900">Tehničari →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {reviewData && reviewData.totalReviews > 0 ? (
                <div>
                  {/* Overall Rating */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <StarIcon size={24} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{reviewData.overallRating}</p>
                      <div className="flex items-center gap-1">
                        {renderStars(reviewData.overallRating)}
                        <span className="text-xs text-slate-400 ml-1">/ 5</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Stats */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Profesionalnost</span>
                        <span className="text-xs font-semibold text-slate-900">{reviewData.avgProfessionalism}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-slate-900 h-1.5 rounded-full transition-all" style={{ width: `${(reviewData.avgProfessionalism / 5) * 100}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Kvalitet usluge</span>
                        <span className="text-xs font-semibold text-slate-900">{reviewData.avgServiceQuality}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${(reviewData.avgServiceQuality / 5) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Total reviews count */}
                  <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b border-slate-100">
                    <span className="text-slate-500">Ukupno ocena</span>
                    <span className="font-semibold text-slate-900">{reviewData.totalReviews}</span>
                  </div>

                  {/* Recent Reviews */}
                  {reviewData.recentReviews && reviewData.recentReviews.length > 0 && (
                    <div className="space-y-2.5">
                      {reviewData.recentReviews.map((review, i) => (
                        <div key={review._id || i} className="flex items-start gap-2.5">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {review.technicianName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-slate-900 truncate">{review.technicianName}</p>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {renderStars(Math.round((review.professionalism + review.serviceQuality) / 2))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="p-3 bg-slate-50 rounded-xl inline-block mb-2">
                    <StarIcon size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500">Nema ocena</p>
                  <p className="text-xs text-slate-400 mt-1">Ocene će se pojaviti nakon što korisnici ocene tehničare</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Stats - za superadmin i supervisor */}
        {isSuperAdmin && financialStats && (
          <Card className="bg-emerald-50 border-0">
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-emerald-700 mb-1">Mesečni prihod</p>
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {((financialStats.totalRevenue || 0) / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-slate-600">Ukupan prihod</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Troškovi</p>
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {((financialStats.totalPayouts || 0) / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-slate-600">Isplate tehničarima</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 mb-1">Neto profit</p>
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {((financialStats.totalProfit || 0) / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-slate-600">Ovaj mesec</p>
                </div>
                <div className="flex items-center justify-center">
                  <Link to="/finances">
                    <button className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                      Detalji →
                    </button>
                  </Link>
                </div>
              </div>
              {failedTransactions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-emerald-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangleIcon size={12} />
                      {failedTransactions.length} neuspešnih transakcija
                    </span>
                    <Link to="/finances" className="text-red-600 hover:text-red-700 font-medium">
                      Reši →
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vehicle Fleet + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Vehicle Fleet */}
          {vehicleStats && (
            <Card className="bg-white border border-slate-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-cyan-600" />
                    Vozni park
                  </CardTitle>
                  <Link to="/vehicles" className="text-xs text-slate-500 hover:text-slate-900">Detalji →</Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Ukupno</p>
                    <p className="text-xl font-bold text-slate-900">{vehicleStats.totalVehicles || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Aktivna</p>
                    <p className="text-xl font-bold text-green-600">{vehicleStats.activeVehicles || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Ističe reg.</p>
                    <p className="text-xl font-bold text-amber-600">{vehicleStats.expiringRegistrations || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Troškovi serv.</p>
                    <p className="text-xl font-bold text-blue-600">
                      {((vehicleStats.totalServiceCosts || 0) / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="bg-white border border-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <PlusIcon size={16} className="text-slate-600" />
                Brze akcije
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/work-orders/add"
                  className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <ClipboardIcon size={14} className="text-slate-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Novi nalog</span>
                </Link>

                <Link
                  to="/equipment/upload"
                  className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <BoxIcon size={14} className="text-slate-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Dodaj opremu</span>
                </Link>

                <Link
                  to="/materials/add"
                  className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <ToolsIcon size={14} className="text-slate-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Dodaj materijal</span>
                </Link>

                <Link
                  to="/technicians/add"
                  className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <UsersIcon size={14} className="text-slate-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Dodaj tehničara</span>
                </Link>

                {isSuperAdmin && (
                  <Link
                    to="/finances"
                    className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                  >
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <DollarSignIcon size={14} className="text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Finansije</span>
                  </Link>
                )}

                <Link
                  to="/vehicles"
                  className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <CalendarIcon size={14} className="text-slate-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Vozni park</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

    </div>
  );
};

export default Dashboard;
