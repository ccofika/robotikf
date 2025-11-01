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
  BrainIcon,
  HardHatIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Input } from '../../components/ui/input';
import { toast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import AIAnalysisSection from './components/AIAnalysisSection';
import AITechnicianAnalysisSection from './components/AITechnicianAnalysisSection';
import DateTimePicker from '../../components/ui/DateTimePicker';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BackendLogs = () => {
  const location = useLocation();

  // Check for tab query parameter
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'activities'); // activities | errors | performance | ai-analysis | tech-analysis
  const [loading, setLoading] = useState(false);

  // State za Admin Activities
  const [activities, setActivities] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [activitiesPagination, setActivitiesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // State za Errors
  const [errors, setErrors] = useState([]);
  const [errorStats, setErrorStats] = useState(null);
  const [errorsPagination, setErrorsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // State za Performance
  const [performanceLogs, setPerformanceLogs] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [performancePagination, setPerformancePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });

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

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: 'all',
    subcategory: 'all',
    entityFilter: ''
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicians(response.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setActivitiesPagination(prev => ({ ...prev, currentPage: 1 }));
    setErrorsPagination(prev => ({ ...prev, currentPage: 1 }));
    setPerformancePagination(prev => ({ ...prev, currentPage: 1 }));
  }, [dateFrom, dateTo, category, action]);

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchActivities();
    } else if (activeTab === 'errors') {
      fetchErrors();
    } else if (activeTab === 'performance') {
      fetchPerformance();
    }
  }, [activeTab, activitiesPagination.currentPage, errorsPagination.currentPage, performancePagination.currentPage, dateFrom, dateTo, category, action]);

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
      params.append('page', activitiesPagination.currentPage);
      params.append('limit', activitiesPagination.limit);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (category !== 'all') params.append('category', category);
      if (action !== 'all') params.append('action', action);

      const response = await axios.get(
        `${API_URL}/api/backend-logs/activities?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📥 [Frontend] Fetched activities:', {
        count: response.data.activities?.length,
        pagination: response.data.pagination,
        firstActivityWithBulk: response.data.activities?.find(a => a.details?.action === 'bulk_assigned'),
        sampleActivity: response.data.activities?.[0]
      });

      // Debug edit activities
      const editActivities = response.data.activities?.filter(a => a.category === 'edit');
      if (editActivities && editActivities.length > 0) {
        console.log('✏️ [Frontend] Found edit activities:', editActivities.map(a => ({
          action: a.action,
          category: a.category,
          hasEquipment: !!a.details?.equipment,
          hasMaterial: !!a.details?.material,
          equipment: a.details?.equipment,
          material: a.details?.material,
          details: a.details
        })));
      }

      setActivities(response.data.activities);
      setActivitiesPagination(response.data.pagination);
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
      params.append('page', errorsPagination.currentPage);
      params.append('limit', errorsPagination.limit);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await axios.get(
        `${API_URL}/api/backend-logs/errors?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setErrors(response.data.errors);
      setErrorsPagination(response.data.pagination);
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
      params.append('page', performancePagination.currentPage);
      params.append('limit', performancePagination.limit);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await axios.get(
        `${API_URL}/api/backend-logs/performance?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPerformanceLogs(response.data.performanceLogs);
      setPerformancePagination(response.data.pagination);
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

  // Pagination handlers
  const handleActivitiesPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= activitiesPagination.totalPages) {
      setActivitiesPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleErrorsPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= errorsPagination.totalPages) {
      setErrorsPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handlePerformancePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= performancePagination.totalPages) {
      setPerformancePagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // Reset filters and pagination
  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCategory('all');
    setAction('all');
    setActivitiesPagination(prev => ({ ...prev, currentPage: 1 }));
    setErrorsPagination(prev => ({ ...prev, currentPage: 1 }));
    setPerformancePagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Mapiranje kategorija na podkategorije (akcije)
  // VAŽNO: equipment_assign_to_tech i equipment_unassign_from_tech imaju category='technicians' u bazi!
  const subcategoryMap = {
    equipment: [
      { value: 'all', label: 'Sve' },
      { value: 'equipment_add', label: 'Dodavanje opreme (pojedinačno)' },
      { value: 'equipment_bulk_add', label: 'Dodavanje opreme (bulk)' },
      { value: 'equipment_edit', label: 'Izmena opreme' },
      { value: 'equipment_delete', label: 'Brisanje opreme' },
      { value: 'basic_equipment_add', label: 'Dodavanje osnovne opreme' },
      { value: 'basic_equipment_edit', label: 'Izmena osnovne opreme' },
      { value: 'basic_equipment_delete', label: 'Brisanje osnovne opreme' }
    ],
    materials: [
      { value: 'all', label: 'Sve' },
      { value: 'material_add', label: 'Dodavanje materijala' },
      { value: 'material_assign_to_tech', label: 'Zaduženje materijala' },
      { value: 'material_edit', label: 'Izmena materijala' },
      { value: 'material_delete', label: 'Brisanje materijala' }
    ],
    technicians: [
      { value: 'all', label: 'Sve' },
      { value: 'equipment_assign_to_tech', label: 'Zaduženje opreme' },
      { value: 'equipment_unassign_from_tech', label: 'Razduženje opreme' },
      { value: 'material_assign_to_tech', label: 'Zaduženje materijala' },
      { value: 'basic_equipment_assign_to_tech', label: 'Zaduženje osnovne opreme' },
      { value: 'technician_add', label: 'Dodavanje tehničara' },
      { value: 'technician_edit', label: 'Izmena tehničara' },
      { value: 'technician_delete', label: 'Brisanje tehničara' }
    ],
    workorders: [
      { value: 'all', label: 'Sve' },
      { value: 'workorder_add', label: 'Dodavanje radnog naloga' },
      { value: 'workorder_bulk_add', label: 'Bulk dodavanje radnih naloga' },
      { value: 'workorder_edit', label: 'Izmena radnog naloga' },
      { value: 'workorder_delete', label: 'Brisanje radnog naloga' }
    ],
    users: [
      { value: 'all', label: 'Sve' },
      { value: 'user_add', label: 'Dodavanje korisnika' },
      { value: 'user_edit', label: 'Izmena korisnika' },
      { value: 'user_delete', label: 'Brisanje korisnika' }
    ],
    vehicles: [
      { value: 'all', label: 'Sve' },
      { value: 'vehicle_add', label: 'Dodavanje vozila' },
      { value: 'vehicle_edit', label: 'Izmena vozila' },
      { value: 'vehicle_delete', label: 'Brisanje vozila' }
    ],
    settings: [
      { value: 'all', label: 'Sve' },
      { value: 'finance_settings_update', label: 'Izmena finansijskih postavki' },
      { value: 'technician_payment_settings_update', label: 'Izmena postavki plata tehničara' }
    ],
    edit: [
      { value: 'all', label: 'Sve' },
      { value: 'edit_equipment_add', label: 'Dodavanje opreme (Edit)' },
      { value: 'edit_equipment_remove', label: 'Uklanjanje opreme (Edit)' },
      { value: 'edit_material_add', label: 'Dodavanje materijala (Edit)' },
      { value: 'edit_material_remove', label: 'Uklanjanje materijala (Edit)' }
    ]
  };

  // Get subcategories based on selected category
  const getSubcategories = () => {
    if (exportFilters.category === 'all') {
      return [{ value: 'all', label: 'Sve' }];
    }
    return subcategoryMap[exportFilters.category] || [{ value: 'all', label: 'Sve' }];
  };

  // Check if entity filter should be shown
  const shouldShowEntityFilter = () => {
    const { category, subcategory } = exportFilters;

    // Za zaduženje/razduženje opreme i materijala (category=technicians) - prikaži dropdown sa tehničarima
    if (category === 'technicians' && (subcategory === 'equipment_assign_to_tech' || subcategory === 'equipment_unassign_from_tech' || subcategory === 'material_assign_to_tech' || subcategory === 'basic_equipment_assign_to_tech')) {
      return 'technician';
    }
    // Za opremu - dodavanje/izmena/brisanje - prikaži input za serijski broj
    if (category === 'equipment' && (subcategory === 'equipment_add' || subcategory === 'equipment_edit' || subcategory === 'equipment_delete' || subcategory === 'equipment_bulk_add' || subcategory === 'all')) {
      return 'serialNumber';
    }
    // Za materijale - prikaži input za tip materijala
    if (category === 'materials' && (subcategory === 'material_add' || subcategory === 'material_edit' || subcategory === 'material_delete' || subcategory === 'all')) {
      return 'materialType';
    }
    // Za tehničare - samo CRUD operacije - prikaži input za ime tehničara
    if (category === 'technicians' && (subcategory === 'technician_add' || subcategory === 'technician_edit' || subcategory === 'technician_delete')) {
      return 'technicianName';
    }
    // Za radne naloge - prikaži input za TIS Job ID
    if (category === 'workorders') {
      return 'tisJobId';
    }
    // Za korisnike - prikaži input za ime korisnika
    if (category === 'users') {
      return 'userName';
    }

    return null;
  };

  // Handle export
  const handleExport = async () => {
    try {
      setExportLoading(true);

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (exportFilters.dateFrom) params.append('dateFrom', exportFilters.dateFrom);
      if (exportFilters.dateTo) params.append('dateTo', exportFilters.dateTo);
      if (exportFilters.category !== 'all') params.append('category', exportFilters.category);
      if (exportFilters.subcategory !== 'all') params.append('subcategory', exportFilters.subcategory);
      if (exportFilters.entityFilter) params.append('entityFilter', exportFilters.entityFilter);

      console.log('📊 [Frontend] Export params:', {
        dateFrom: exportFilters.dateFrom,
        dateTo: exportFilters.dateTo,
        category: exportFilters.category,
        subcategory: exportFilters.subcategory,
        entityFilter: exportFilters.entityFilter,
        url: `${API_URL}/api/backend-logs/export-activities?${params.toString()}`
      });

      const response = await axios.get(
        `${API_URL}/api/backend-logs/export-activities?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob' // Važno za preuzimanje fajla
        }
      );

      // Kreiranje blob URL-a i automatsko preuzimanje
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admin-aktivnosti-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Excel fajl je uspešno preuzet!');

      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting activities:', error);
      toast.error('Greška pri exportovanju aktivnosti.');
    } finally {
      setExportLoading(false);
    }
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
              onClick={resetFilters}
              prefix={<XIcon size={16} />}
            >
              Resetuj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DateTimePicker
              label="Od:"
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DateTimePicker
              label="Do:"
              value={dateTo}
              onChange={setDateTo}
            />
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
                  <option value="edit">Edit (Admin)</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
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
          <TabsTrigger value="tech-analysis" className="flex items-center space-x-2">
            <HardHatIcon size={16} />
            <span>AI Tehničari</span>
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
                      Admin Aktivnosti ({activitiesPagination.totalCount})
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export u Excel
                      </button>
                      <Button
                        type="secondary"
                        size="small"
                        onClick={fetchActivities}
                        prefix={<RefreshIcon size={16} />}
                      >
                        Osveži
                      </Button>
                    </div>
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
                                  activity.category === 'settings' && "bg-gray-100 text-gray-800",
                                  activity.category === 'edit' && "bg-yellow-100 text-yellow-800"
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

                                {/* Updated item with changes list */}
                                {activity.details?.action === 'updated' && activity.details?.changes && activity.details.changes.length > 0 && (
                                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                    <div className="font-semibold text-blue-700 mb-1">Promene ({activity.details.changeCount}):</div>
                                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                                      {activity.details.changes.map((change, idx) => (
                                        <li key={idx} className="text-blue-800">{change}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Single item add/edit (fallback for old logs without changes) */}
                                {activity.details?.after && !['bulk_created', 'bulk_assigned', 'bulk_unassigned', 'updated', 'added', 'removed'].includes(activity.details?.action) && (
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

                                {/* Edit actions - Equipment added/removed */}
                                {activity.category === 'edit' && (activity.action === 'edit_equipment_add' || activity.action === 'edit_equipment_remove') && (
                                  <div className={cn(
                                    "p-2 rounded border",
                                    activity.action === 'edit_equipment_add' ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                                  )}>
                                    <div className={cn(
                                      "font-semibold mb-1",
                                      activity.action === 'edit_equipment_add' ? "text-green-700" : "text-red-700"
                                    )}>
                                      Oprema {activity.action === 'edit_equipment_add' ? 'dodata' : 'uklonjena'}:
                                    </div>
                                    <div className="text-xs space-y-0.5">
                                      {activity.details?.equipment ? (
                                        <>
                                          <div><strong>Kategorija:</strong> {activity.details.equipment.category}</div>
                                          <div><strong>Opis:</strong> {activity.details.equipment.description}</div>
                                          <div><strong>S/N:</strong> {activity.details.equipment.serialNumber}</div>
                                        </>
                                      ) : (
                                        <div className="text-red-500">Podaci o opremi nisu dostupni</div>
                                      )}
                                      {activity.details?.workOrder && (
                                        <div className="mt-1 pt-1 border-t border-gray-200">
                                          <strong>Radni nalog:</strong> {activity.details.workOrder.tisId}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Edit actions - Material added/removed */}
                                {activity.category === 'edit' && (activity.action === 'edit_material_add' || activity.action === 'edit_material_remove') && (
                                  <div className={cn(
                                    "p-2 rounded border",
                                    activity.action === 'edit_material_add' ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                                  )}>
                                    <div className={cn(
                                      "font-semibold mb-1",
                                      activity.action === 'edit_material_add' ? "text-green-700" : "text-red-700"
                                    )}>
                                      Materijal {activity.action === 'edit_material_add' ? 'dodat' : 'uklonjen'}:
                                    </div>
                                    <div className="text-xs space-y-0.5">
                                      {activity.details?.material ? (
                                        <>
                                          <div><strong>Tip:</strong> {activity.details.material.type}</div>
                                          <div><strong>Količina:</strong> {activity.details.material.quantity}</div>
                                        </>
                                      ) : (
                                        <div className="text-red-500">Podaci o materijalu nisu dostupni</div>
                                      )}
                                      {activity.details?.workOrder && (
                                        <div className="mt-1 pt-1 border-t border-gray-200">
                                          <strong>Radni nalog:</strong> {activity.details.workOrder.tisId}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {!activity.details?.before && !activity.details?.after && !activity.details?.summary && !activity.details?.changes && !activity.details?.equipment && !activity.details?.material && activity.category !== 'edit' && '-'}
                                {activity.category === 'edit' && !activity.details?.equipment && !activity.details?.material && (
                                  <div className="text-orange-600 text-xs">
                                    Debug: Edit activity bez detalja (action: {activity.action})
                                  </div>
                                )}
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

                  {/* Activities Pagination */}
                  {activitiesPagination.totalPages > 1 && (
                    <div className="mt-6 px-6 py-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Prikazano {((activitiesPagination.currentPage - 1) * activitiesPagination.limit) + 1} - {Math.min(activitiesPagination.currentPage * activitiesPagination.limit, activitiesPagination.totalCount)} od {activitiesPagination.totalCount} rezultata
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleActivitiesPageChange(1)}
                            disabled={!activitiesPagination.hasPreviousPage}
                          >
                            &laquo;
                          </Button>
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleActivitiesPageChange(activitiesPagination.currentPage - 1)}
                            disabled={!activitiesPagination.hasPreviousPage}
                          >
                            &lsaquo;
                          </Button>

                          {Array.from({ length: activitiesPagination.totalPages }, (_, i) => i + 1)
                            .filter(number => {
                              return (
                                number === 1 ||
                                number === activitiesPagination.totalPages ||
                                Math.abs(number - activitiesPagination.currentPage) <= 1
                              );
                            })
                            .map(number => (
                              <Button
                                key={number}
                                type={activitiesPagination.currentPage === number ? "primary" : "tertiary"}
                                size="small"
                                onClick={() => handleActivitiesPageChange(number)}
                              >
                                {number}
                              </Button>
                            ))}

                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleActivitiesPageChange(activitiesPagination.currentPage + 1)}
                            disabled={!activitiesPagination.hasNextPage}
                          >
                            &rsaquo;
                          </Button>
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleActivitiesPageChange(activitiesPagination.totalPages)}
                            disabled={!activitiesPagination.hasNextPage}
                          >
                            &raquo;
                          </Button>
                        </div>
                      </div>
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
                      Greške ({errorsPagination.totalCount})
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

                  {/* Errors Pagination */}
                  {errorsPagination.totalPages > 1 && (
                    <div className="mt-6 px-6 py-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Prikazano {((errorsPagination.currentPage - 1) * errorsPagination.limit) + 1} - {Math.min(errorsPagination.currentPage * errorsPagination.limit, errorsPagination.totalCount)} od {errorsPagination.totalCount} rezultata
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleErrorsPageChange(1)}
                            disabled={!errorsPagination.hasPreviousPage}
                          >
                            &laquo;
                          </Button>
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleErrorsPageChange(errorsPagination.currentPage - 1)}
                            disabled={!errorsPagination.hasPreviousPage}
                          >
                            &lsaquo;
                          </Button>

                          {Array.from({ length: errorsPagination.totalPages }, (_, i) => i + 1)
                            .filter(number => {
                              return (
                                number === 1 ||
                                number === errorsPagination.totalPages ||
                                Math.abs(number - errorsPagination.currentPage) <= 1
                              );
                            })
                            .map(number => (
                              <Button
                                key={number}
                                type={errorsPagination.currentPage === number ? "primary" : "tertiary"}
                                size="small"
                                onClick={() => handleErrorsPageChange(number)}
                              >
                                {number}
                              </Button>
                            ))}

                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleErrorsPageChange(errorsPagination.currentPage + 1)}
                            disabled={!errorsPagination.hasNextPage}
                          >
                            &rsaquo;
                          </Button>
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handleErrorsPageChange(errorsPagination.totalPages)}
                            disabled={!errorsPagination.hasNextPage}
                          >
                            &raquo;
                          </Button>
                        </div>
                      </div>
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
                      Performance Logs ({performancePagination.totalCount})
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

                  {/* Performance Pagination */}
                  {performancePagination.totalPages > 1 && (
                    <div className="mt-6 px-6 py-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Prikazano {((performancePagination.currentPage - 1) * performancePagination.limit) + 1} - {Math.min(performancePagination.currentPage * performancePagination.limit, performancePagination.totalCount)} od {performancePagination.totalCount} rezultata
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handlePerformancePageChange(1)}
                            disabled={!performancePagination.hasPreviousPage}
                          >
                            &laquo;
                          </Button>
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handlePerformancePageChange(performancePagination.currentPage - 1)}
                            disabled={!performancePagination.hasPreviousPage}
                          >
                            &lsaquo;
                          </Button>

                          {Array.from({ length: performancePagination.totalPages }, (_, i) => i + 1)
                            .filter(number => {
                              return (
                                number === 1 ||
                                number === performancePagination.totalPages ||
                                Math.abs(number - performancePagination.currentPage) <= 1
                              );
                            })
                            .map(number => (
                              <Button
                                key={number}
                                type={performancePagination.currentPage === number ? "primary" : "tertiary"}
                                size="small"
                                onClick={() => handlePerformancePageChange(number)}
                              >
                                {number}
                              </Button>
                            ))}

                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handlePerformancePageChange(performancePagination.currentPage + 1)}
                            disabled={!performancePagination.hasNextPage}
                          >
                            &rsaquo;
                          </Button>
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={() => handlePerformancePageChange(performancePagination.totalPages)}
                            disabled={!performancePagination.hasNextPage}
                          >
                            &raquo;
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Analysis Tab */}
            <TabsContent value="ai-analysis">
              <AIAnalysisSection />
            </TabsContent>

            {/* AI Technician Analysis Tab */}
            <TabsContent value="tech-analysis">
              <AITechnicianAnalysisSection />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="border-b border-slate-200 p-6 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Export Admin Aktivnosti</h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Izaberite filtere za export u Excel format
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <DateTimePicker
                    label="Datum od:"
                    value={exportFilters.dateFrom}
                    onChange={(value) => setExportFilters({ ...exportFilters, dateFrom: value })}
                  />
                  <DateTimePicker
                    label="Datum do:"
                    value={exportFilters.dateTo}
                    onChange={(value) => setExportFilters({ ...exportFilters, dateTo: value })}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Kategorija
                  </label>
                  <select
                    value={exportFilters.category}
                    onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value, subcategory: 'all', entityFilter: '' })}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all hover:border-slate-400"
                  >
                    <option value="all">Sve kategorije</option>
                    <option value="equipment">📦 Oprema</option>
                    <option value="materials">🔧 Materijali</option>
                    <option value="technicians">👷 Tehničari</option>
                    <option value="workorders">📋 Radni Nalozi</option>
                    <option value="users">👤 Korisnici</option>
                    <option value="vehicles">🚗 Vozila</option>
                    <option value="settings">⚙️ Podešavanja</option>
                    <option value="edit">✏️ Edit (Admin)</option>
                  </select>
                </div>

                {/* Subcategory */}
                {exportFilters.category !== 'all' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Podkategorija
                    </label>
                    <select
                      value={exportFilters.subcategory}
                      onChange={(e) => setExportFilters({ ...exportFilters, subcategory: e.target.value, entityFilter: '' })}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all hover:border-slate-400"
                    >
                      {getSubcategories().map(sub => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Entity Filter */}
                {shouldShowEntityFilter() === 'technician' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Tehničar (opciono)
                    </label>
                    <select
                      value={exportFilters.entityFilter}
                      onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all hover:border-slate-400"
                    >
                      <option value="">Svi tehničari</option>
                      {technicians.map(tech => (
                        <option key={tech._id} value={tech.name}>{tech.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {shouldShowEntityFilter() === 'serialNumber' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      Serijski Broj (opciono)
                    </label>
                    <input
                      type="text"
                      value={exportFilters.entityFilter}
                      onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                      placeholder="Unesite serijski broj..."
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all hover:border-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                )}

                {shouldShowEntityFilter() === 'materialType' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tip Materijala (opciono):</label>
                    <input
                      type="text"
                      value={exportFilters.entityFilter}
                      onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                      placeholder="Unesite tip materijala..."
                      className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {shouldShowEntityFilter() === 'technicianName' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ime Tehničara (opciono):</label>
                    <input
                      type="text"
                      value={exportFilters.entityFilter}
                      onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                      placeholder="Unesite ime tehničara..."
                      className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {shouldShowEntityFilter() === 'tisJobId' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">TIS Job ID (opciono):</label>
                    <input
                      type="text"
                      value={exportFilters.entityFilter}
                      onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                      placeholder="Unesite TIS Job ID..."
                      className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {shouldShowEntityFilter() === 'userName' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ime Korisnika (opciono):</label>
                    <input
                      type="text"
                      value={exportFilters.entityFilter}
                      onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                      placeholder="Unesite ime korisnika..."
                      className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {/* Info Message */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Napomena o exportu</p>
                      <p className="text-sm text-blue-700">
                        Excel fajl će sadržati svaki komad opreme u posebnom redu za lakše filtriranje i analizu podataka.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium h-10 px-6 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Otkaži
              </button>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium h-10 px-6 bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportovanje...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export u Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
