import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ZapIcon,
  RefreshIcon,
  CalendarIcon,
  FilterIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  BrainIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Input } from '../../components/ui/input';
import { toast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import AIAnalysisSection from './components/AIAnalysisSection';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BackendLogs = () => {
  const location = useLocation();

  // Check for tab query parameter
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'activities'); // activities | errors | performance | ai-analysis
  const [loading, setLoading] = useState(false);

  // State za Admin Activities
  const [activities, setActivities] = useState([]);
  const [activityStats, setActivityStats] = useState(null);

  // State za Errors
  const [errors, setErrors] = useState([]);
  const [errorStats, setErrorStats] = useState(null);

  // State za Performance
  const [performanceLogs, setPerformanceLogs] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('all');
  const [action, setAction] = useState('all');

  // Bulk details modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDetails, setBulkDetails] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchActivities();
    } else if (activeTab === 'errors') {
      fetchErrors();
    } else if (activeTab === 'performance') {
      fetchPerformance();
    }
  }, [activeTab, dateFrom, dateTo, category, action]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/backend-logs/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (category !== 'all') params.append('category', category);
      if (action !== 'all') params.append('action', action);
      params.append('limit', 50);

      const response = await axios.get(
        `${API_URL}/api/backend-logs/activities?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📥 [Frontend] Fetched activities:', {
        count: response.data.activities?.length,
        firstActivityWithBulk: response.data.activities?.find(a => a.details?.action === 'bulk_assigned'),
        sampleActivity: response.data.activities?.[0]
      });

      setActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('limit', 50);

      const response = await axios.get(
        `${API_URL}/api/backend-logs/errors?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setErrors(response.data.errors);
    } catch (error) {
      console.error('Error fetching errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('limit', 50);

      const response = await axios.get(
        `${API_URL}/api/backend-logs/performance?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPerformanceLogs(response.data.performanceLogs);
    } catch (error) {
      console.error('Error fetching performance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('sr-RS', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/50">
            <ActivityIcon size={28} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Backend Logs</h1>
            <p className="text-slate-600 mt-1">Praćenje admin aktivnosti, grešaka i performansi</p>
          </div>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {/* Total Activities Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ActivityIcon size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-blue-800 mb-1">Ukupno Aktivnosti</div>
            <div className="text-2xl font-bold text-blue-900">
              {dashboardStats.totalActivities}
            </div>
          </div>

          {/* Unresolved Errors Card */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangleIcon size={20} className="text-red-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-red-800 mb-1">Nerazrešene Greške</div>
            <div className="text-2xl font-bold text-red-900">
              {dashboardStats.unresolvedErrors}
            </div>
          </div>

          {/* Slow Requests Card */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon size={20} className="text-amber-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-amber-800 mb-1">Spori Zahtevi</div>
            <div className="text-2xl font-bold text-amber-900">
              {dashboardStats.slowRequests}
            </div>
          </div>

          {/* Average Response Time Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <ZapIcon size={20} className="text-green-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-green-800 mb-1">Prosečno Vreme</div>
            <div className="text-2xl font-bold text-green-900">
              {Math.round(dashboardStats.avgResponseTime)}ms
            </div>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <FilterIcon size={20} className="text-slate-600" />
              <span>Filteri</span>
            </CardTitle>
            <Button
              type="secondary"
              size="small"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setCategory('all');
                setAction('all');
              }}
              prefix={<XIcon size={16} />}
            >
              Resetuj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Od:</label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Do:</label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
              />
            </div>
            {activeTab === 'activities' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Kategorija:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                >
                  <option value="all">Sve</option>
                  <option value="equipment">Oprema</option>
                  <option value="materials">Materijali</option>
                  <option value="technicians">Tehničari</option>
                  <option value="workorders">Radni Nalozi</option>
                  <option value="users">Korisnici</option>
                  <option value="settings">Podešavanja</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="activities" className="flex items-center space-x-2">
            <ActivityIcon size={16} />
            <span>Admin Aktivnosti</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center space-x-2">
            <AlertTriangleIcon size={16} />
            <span>Greške</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <ZapIcon size={16} />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center space-x-2">
            <BrainIcon size={16} />
            <span>AI Analiza</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center space-x-3 text-slate-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-sm font-medium">Učitavanje...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Admin Activities Tab */}
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Admin Aktivnosti ({activities.length})
                    </CardTitle>
                    <Button
                      type="secondary"
                      size="small"
                      onClick={fetchActivities}
                      prefix={<RefreshIcon size={16} />}
                    >
                      Osveži
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ActivityIcon size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-sm font-medium">Nema podataka za prikaz</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vreme</TableHead>
                            <TableHead>Korisnik</TableHead>
                            <TableHead>Akcija</TableHead>
                            <TableHead>Kategorija</TableHead>
                            <TableHead>Entitet</TableHead>
                            <TableHead>Detalji</TableHead>
                            <TableHead className="text-right">Trajanje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activities.map((activity, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-xs text-slate-600">
                                {formatTimestamp(activity.timestamp)}
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {activity.userName}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {activity.action}
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  activity.category === 'equipment' && "bg-blue-100 text-blue-800",
                                  activity.category === 'materials' && "bg-green-100 text-green-800",
                                  activity.category === 'technicians' && "bg-purple-100 text-purple-800",
                                  activity.category === 'workorders' && "bg-orange-100 text-orange-800",
                                  activity.category === 'users' && "bg-pink-100 text-pink-800",
                                  activity.category === 'settings' && "bg-gray-100 text-gray-800"
                                )}>
                                  {activity.category}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-700 font-semibold">
                                {activity.entityName || '-'}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 max-w-xs">
                                {/* Bulk upload summary */}
                                {activity.details?.action === 'bulk_created' && activity.details?.summary && (
                                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                    <div className="font-semibold text-blue-700 mb-1">Bulk Upload:</div>
                                    <div className="text-xs space-y-0.5">
                                      <div>✅ Dodato: {activity.details.summary.addedCount}</div>
                                      <div>⚠️ Duplikati: {activity.details.summary.duplicatesCount}</div>
                                      <div>❌ Greške: {activity.details.summary.errorsCount}</div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setBulkDetails(activity.details);
                                        setShowBulkModal(true);
                                      }}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                      Prikaži sve stavke →
                                    </button>
                                  </div>
                                )}

                                {/* Bulk equipment assignment */}
                                {activity.details?.action === 'bulk_assigned' && activity.details?.summary && (
                                  <div className="bg-green-50 p-2 rounded border border-green-200">
                                    <div className="font-semibold text-green-700 mb-1">Bulk Assignment:</div>
                                    <div className="text-xs space-y-0.5">
                                      <div>✅ Dodeljeno: {activity.details.summary.assignedCount} opreme</div>
                                      <div>👤 Tehničar: {activity.details.summary.technicianName}</div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        console.log('🔍 [Frontend] Opening bulk modal with details:', {
                                          action: activity.details?.action,
                                          summaryAssignedCount: activity.details?.summary?.assignedCount,
                                          assignedItemsLength: activity.details?.assignedItems?.length,
                                          fullDetails: activity.details
                                        });
                                        setBulkDetails(activity.details);
                                        setShowBulkModal(true);
                                      }}
                                      className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
                                    >
                                      Prikaži sve stavke →
                                    </button>
                                  </div>
                                )}

                                {/* Bulk equipment unassignment */}
                                {activity.details?.action === 'bulk_unassigned' && activity.details?.summary && (
                                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                                    <div className="font-semibold text-orange-700 mb-1">Bulk Unassignment:</div>
                                    <div className="text-xs space-y-0.5">
                                      <div>↩️ Vraćeno: {activity.details.summary.unassignedCount} opreme</div>
                                      <div>👤 Od tehničara: {activity.details.summary.technicianName}</div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        console.log('🔍 [Frontend] Opening unassign modal with details:', {
                                          action: activity.details?.action,
                                          summaryUnassignedCount: activity.details?.summary?.unassignedCount,
                                          assignedItemsLength: activity.details?.assignedItems?.length,
                                          fullDetails: activity.details
                                        });
                                        setBulkDetails(activity.details);
                                        setShowBulkModal(true);
                                      }}
                                      className="mt-2 text-xs text-orange-600 hover:text-orange-800 underline"
                                    >
                                      Prikaži sve stavke →
                                    </button>
                                  </div>
                                )}

                                {/* Single item delete */}
                                {activity.details?.before && !['bulk_created', 'bulk_assigned', 'bulk_unassigned'].includes(activity.details?.action) && (
                                  <div className="bg-red-50 p-2 rounded border border-red-200">
                                    <span className="font-semibold text-red-700">Obrisano: </span>
                                    {/* Materials */}
                                    {activity.details.before.type && <span>Tip: {activity.details.before.type}, </span>}
                                    {activity.details.before.quantity !== undefined && <span>Količina: {activity.details.before.quantity}</span>}
                                    {/* Equipment */}
                                    {activity.details.before.category && <span>Kategorija: {activity.details.before.category}, </span>}
                                    {activity.details.before.serialNumber && <span>SN: {activity.details.before.serialNumber}, </span>}
                                    {activity.details.before.description && <span>Opis: {activity.details.before.description}, </span>}
                                    {activity.details.before.location && <span>Lokacija: {activity.details.before.location}, </span>}
                                    {activity.details.before.status && <span>Status: {activity.details.before.status}</span>}
                                    {/* WorkOrders */}
                                    {activity.details.before.tisJobId && <span>TIS Job ID: {activity.details.before.tisJobId}, </span>}
                                    {activity.details.before.address && <span>Adresa: {activity.details.before.address}, </span>}
                                    {activity.details.before.municipality && <span>Opština: {activity.details.before.municipality}, </span>}
                                    {activity.details.before.date && <span>Datum: {new Date(activity.details.before.date).toLocaleDateString('sr-RS')}</span>}
                                  </div>
                                )}

                                {/* Single item add/edit */}
                                {activity.details?.after && !['bulk_created', 'bulk_assigned', 'bulk_unassigned'].includes(activity.details?.action) && (
                                  <div className="bg-green-50 p-2 rounded border border-green-200">
                                    <span className="font-semibold text-green-700">
                                      {activity.details.action === 'created' ? 'Dodato: ' : 'Izmenjeno: '}
                                    </span>
                                    {/* Materials */}
                                    {activity.details.after.type && <span>Tip: {activity.details.after.type}, </span>}
                                    {activity.details.after.quantity !== undefined && <span>Količina: {activity.details.after.quantity}</span>}
                                    {/* Equipment */}
                                    {activity.details.after.category && <span>Kategorija: {activity.details.after.category}, </span>}
                                    {activity.details.after.serialNumber && <span>SN: {activity.details.after.serialNumber}, </span>}
                                    {activity.details.after.description && <span>Opis: {activity.details.after.description}, </span>}
                                    {activity.details.after.location && <span>Lokacija: {activity.details.after.location}, </span>}
                                    {activity.details.after.status && <span>Status: {activity.details.after.status}</span>}
                                    {/* WorkOrders */}
                                    {activity.details.after.tisJobId && <span>TIS Job ID: {activity.details.after.tisJobId}, </span>}
                                    {activity.details.after.address && <span>Adresa: {activity.details.after.address}, </span>}
                                    {activity.details.after.municipality && <span>Opština: {activity.details.after.municipality}, </span>}
                                    {activity.details.after.date && <span>Datum: {new Date(activity.details.after.date).toLocaleDateString('sr-RS')}</span>}
                                  </div>
                                )}

                                {!activity.details?.before && !activity.details?.after && !activity.details?.summary && '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">
                                {activity.metadata?.requestDuration ? `${activity.metadata.requestDuration}ms` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Errors Tab */}
            <TabsContent value="errors">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Greške ({errors.length})
                    </CardTitle>
                    <Button
                      type="secondary"
                      size="small"
                      onClick={fetchErrors}
                      prefix={<RefreshIcon size={16} />}
                    >
                      Osveži
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {errors.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <CheckIcon size={48} className="mx-auto mb-4 text-green-300" />
                      <p className="text-sm font-medium">Nema grešaka za prikaz</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vreme</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Poruka</TableHead>
                            <TableHead>Ruta</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-xs text-slate-600">
                                {formatTimestamp(error.timestamp)}
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {error.errorType}
                              </TableCell>
                              <TableCell className="max-w-md truncate text-slate-700">
                                {error.errorMessage}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-600">
                                {error.route}
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  error.severity === 'low' && "bg-blue-100 text-blue-800",
                                  error.severity === 'medium' && "bg-yellow-100 text-yellow-800",
                                  error.severity === 'high' && "bg-orange-100 text-orange-800",
                                  error.severity === 'critical' && "bg-red-100 text-red-800"
                                )}>
                                  {error.severity}
                                </span>
                              </TableCell>
                              <TableCell>
                                {error.resolved ? (
                                  <span className="inline-flex items-center space-x-1 text-green-700">
                                    <CheckIcon size={16} />
                                    <span className="text-sm">Rešeno</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 text-amber-700">
                                    <AlertTriangleIcon size={16} />
                                    <span className="text-sm">Pending</span>
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Performance Logs ({performanceLogs.length})
                    </CardTitle>
                    <Button
                      type="secondary"
                      size="small"
                      onClick={fetchPerformance}
                      prefix={<RefreshIcon size={16} />}
                    >
                      Osveži
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {performanceLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ZapIcon size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-sm font-medium">Nema podataka za prikaz</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vreme</TableHead>
                            <TableHead>Ruta</TableHead>
                            <TableHead>Metoda</TableHead>
                            <TableHead className="text-right">Trajanje</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Korisnik</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceLogs.map((log, index) => (
                            <TableRow key={index} className={log.isSlow ? 'bg-red-50' : ''}>
                              <TableCell className="font-mono text-xs text-slate-600">
                                {formatTimestamp(log.timestamp)}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-700">
                                {log.route}
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  log.method === 'GET' && "bg-blue-100 text-blue-800",
                                  log.method === 'POST' && "bg-green-100 text-green-800",
                                  log.method === 'PUT' && "bg-yellow-100 text-yellow-800",
                                  log.method === 'DELETE' && "bg-red-100 text-red-800"
                                )}>
                                  {log.method}
                                </span>
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-mono text-sm font-semibold",
                                log.isSlow ? "text-red-700" : "text-slate-600"
                              )}>
                                {log.duration}ms
                                {log.isSlow && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    Spor
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  log.statusCode >= 200 && log.statusCode < 300 && "bg-green-100 text-green-800",
                                  log.statusCode >= 300 && log.statusCode < 400 && "bg-blue-100 text-blue-800",
                                  log.statusCode >= 400 && log.statusCode < 500 && "bg-yellow-100 text-yellow-800",
                                  log.statusCode >= 500 && "bg-red-100 text-red-800"
                                )}>
                                  {log.statusCode}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {log.userName || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Analysis Tab */}
            <TabsContent value="ai-analysis">
              <AIAnalysisSection />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Bulk Upload Details Modal */}
      {showBulkModal && bulkDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {bulkDetails.action === 'bulk_created' && 'Bulk Upload Detalji'}
                    {bulkDetails.action === 'bulk_assigned' && 'Bulk Assignment Detalji'}
                    {bulkDetails.action === 'bulk_unassigned' && 'Bulk Unassignment Detalji'}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    Ukupno obrađeno: {bulkDetails.summary?.totalProcessed || 0} stavki
                    {bulkDetails.summary?.technicianName && ` • Tehničar: ${bulkDetails.summary.technicianName}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkDetails(null);
                  }}
                  className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <XIcon size={24} />
                </button>
              </div>
            </div>

            {/* Modal Stats */}
            {bulkDetails.action === 'bulk_created' && (
              <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 border-b">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-700">{bulkDetails.summary?.addedCount || 0}</div>
                  <div className="text-sm text-green-600 mt-1">✅ Uspešno dodato</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-3xl font-bold text-amber-700">{bulkDetails.summary?.duplicatesCount || 0}</div>
                  <div className="text-sm text-amber-600 mt-1">⚠️ Duplikati</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-3xl font-bold text-red-700">{bulkDetails.summary?.errorsCount || 0}</div>
                  <div className="text-sm text-red-600 mt-1">❌ Greške</div>
                </div>
              </div>
            )}

            {bulkDetails.action === 'bulk_assigned' && (
              <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 border-b">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-700">{bulkDetails.summary?.assignedCount || 0}</div>
                  <div className="text-sm text-green-600 mt-1">✅ Dodeljeno opreme</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xl font-bold text-blue-700">{bulkDetails.summary?.technicianName || '-'}</div>
                  <div className="text-sm text-blue-600 mt-1">👤 Tehničar</div>
                </div>
              </div>
            )}

            {bulkDetails.action === 'bulk_unassigned' && (
              <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 border-b">
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-700">{bulkDetails.summary?.unassignedCount || 0}</div>
                  <div className="text-sm text-orange-600 mt-1">↩️ Vraćeno opreme</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xl font-bold text-blue-700">{bulkDetails.summary?.technicianName || '-'}</div>
                  <div className="text-sm text-blue-600 mt-1">👤 Od tehničara</div>
                </div>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="added" className="w-full">
                <TabsList>
                  <TabsTrigger value="added">
                    {bulkDetails.action === 'bulk_created' && `Dodato (${bulkDetails.addedItems?.length || 0})`}
                    {bulkDetails.action === 'bulk_assigned' && `Dodeljeno (${bulkDetails.assignedItems?.length || 0})`}
                    {bulkDetails.action === 'bulk_unassigned' && `Vraćeno (${bulkDetails.assignedItems?.length || 0})`}
                  </TabsTrigger>
                  {bulkDetails.action === 'bulk_created' && (
                    <>
                      <TabsTrigger value="duplicates">
                        Duplikati ({bulkDetails.duplicates?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="errors">
                        Greške ({bulkDetails.errors?.length || 0})
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                {/* Added/Assigned Items Tab */}
                <TabsContent value="added">
                  {((bulkDetails.addedItems && bulkDetails.addedItems.length > 0) ||
                    (bulkDetails.assignedItems && bulkDetails.assignedItems.length > 0)) ? (
                    <div className="overflow-x-auto mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {/* Get the items array based on action type */}
                            {(() => {
                              const items = bulkDetails.addedItems || bulkDetails.assignedItems || [];
                              const firstItem = items[0] || {};
                              return (
                                <>
                                  {/* Equipment columns */}
                                  {firstItem.category && <TableHead>Kategorija</TableHead>}
                                  {firstItem.description && <TableHead>Opis</TableHead>}
                                  {firstItem.serialNumber && <TableHead>Serijski Broj</TableHead>}
                                  {firstItem.location && <TableHead>Lokacija</TableHead>}
                                  {/* WorkOrder columns */}
                                  {firstItem.tisJobId && <TableHead>TIS Job ID</TableHead>}
                                  {firstItem.address && <TableHead>Adresa</TableHead>}
                                  {firstItem.municipality && <TableHead>Opština</TableHead>}
                                  {firstItem.type && !firstItem.category && <TableHead>Tip</TableHead>}
                                  {firstItem.date && <TableHead>Datum</TableHead>}
                                  {firstItem.time && <TableHead>Vreme</TableHead>}
                                  <TableHead>Status</TableHead>
                                </>
                              );
                            })()}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(bulkDetails.addedItems || bulkDetails.assignedItems || []).map((item, index) => (
                            <TableRow key={index}>
                              {/* Equipment cells */}
                              {item.category && <TableCell className="font-medium">{item.category}</TableCell>}
                              {item.description && <TableCell>{item.description}</TableCell>}
                              {item.serialNumber && <TableCell className="font-mono text-sm">{item.serialNumber}</TableCell>}
                              {item.location && <TableCell>{item.location}</TableCell>}
                              {/* WorkOrder cells */}
                              {item.tisJobId && <TableCell className="font-mono text-sm">{item.tisJobId}</TableCell>}
                              {item.address && <TableCell>{item.address}</TableCell>}
                              {item.municipality && <TableCell>{item.municipality}</TableCell>}
                              {item.type && !item.category && <TableCell>{item.type}</TableCell>}
                              {item.date && <TableCell className="text-sm">{new Date(item.date).toLocaleDateString('sr-RS')}</TableCell>}
                              {item.time && <TableCell className="text-sm">{item.time}</TableCell>}
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {item.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>
                        {bulkDetails.action === 'bulk_created' && 'Nema dodatih stavki'}
                        {bulkDetails.action === 'bulk_assigned' && 'Nema dodeljene opreme'}
                        {bulkDetails.action === 'bulk_unassigned' && 'Nema vraćene opreme'}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Duplicates Tab */}
                <TabsContent value="duplicates">
                  {bulkDetails.duplicates && bulkDetails.duplicates.length > 0 ? (
                    <div className="overflow-x-auto mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategorija</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Serijski Broj</TableHead>
                            <TableHead>Razlog</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkDetails.duplicates.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.category}</TableCell>
                              <TableCell>{item.model}</TableCell>
                              <TableCell className="font-mono text-sm">{item.serialNumber}</TableCell>
                              <TableCell className="text-amber-700 text-sm">{item.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Nema duplikata</p>
                    </div>
                  )}
                </TabsContent>

                {/* Errors Tab */}
                <TabsContent value="errors">
                  {bulkDetails.errors && bulkDetails.errors.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {bulkDetails.errors.map((error, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-700 font-mono">{error}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Nema grešaka</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <Button
                type="secondary"
                size="medium"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkDetails(null);
                }}
              >
                Zatvori
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendLogs;
