import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Activity, TriangleAlert, Zap, RefreshCw, Brain, HardHat, X, FileDown, ArrowRight } from 'lucide-react';
import { toast } from '../../components/ui/toast';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Note, Tabs, Stat } from '../../security/sx/layout';
import { Field, Input, Select } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { Pager, Loading } from '../../montaza/ui';
import AIAnalysisSection from './components/AIAnalysisSection';
import AITechnicianAnalysisSection from './components/AITechnicianAnalysisSection';
import DateTimePicker from '../../components/ui/DateTimePicker';
import './BackendLogs.mx.css';
import { localYmd } from '../../utils/localDate';

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
      link.setAttribute('download', `admin-aktivnosti-${localYmd()}.xlsx`);
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


  // Detalji aktivnosti (otvaranje stavki bulk akcije)
  const openBulk = (details) => {
    setBulkDetails(details);
    setShowBulkModal(true);
  };

  return (
    <div className="sx-page" data-testid="page-backend-logs">
      <PageHead
        eyebrow="Montaža · Backend Logs"
        title="Backend Logs"
        lead="Praćenje admin aktivnosti, grešaka i performansi"
      />

      {/* Dashboard Stats Cards */}
      {dashboardStats && (
        <div className="sx-stats">
          <Stat label="Ukupno Aktivnosti" value={dashboardStats.totalActivities} />
          <Stat label="Nerazrešene Greške" value={dashboardStats.unresolvedErrors} tone={dashboardStats.unresolvedErrors ? 'bad' : null} />
          <Stat label="Spori Zahtevi" value={dashboardStats.slowRequests} tone={dashboardStats.slowRequests ? 'warn' : null} />
          <Stat label="Prosečno Vreme" value={Math.round(dashboardStats.avgResponseTime)} small="ms" />
        </div>
      )}

      {/* Filters Card */}
      <Panel title="Filteri" className="mx-bl-filters" actions={<Btn size="sm" icon={X} onClick={resetFilters}>Resetuj</Btn>}>
        <div className="sx-form mx-bl-form">
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
            <Field label="Kategorija:" htmlFor="mx-bl-category">
              <Select id="mx-bl-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">Sve</option>
                <option value="equipment">Oprema</option>
                <option value="materials">Materijali</option>
                <option value="technicians">Tehničari</option>
                <option value="workorders">Radni Nalozi</option>
                <option value="users">Korisnici</option>
                <option value="settings">Podešavanja</option>
                <option value="edit">Edit (Admin)</option>
              </Select>
            </Field>
          )}
        </div>
      </Panel>

      {/* Tabs */}
      <Tabs items={TABS} value={activeTab} onChange={setActiveTab} ariaLabel="Backend Logs" layoutId="mx-bl-tabs" />

      {/* Tab Content */}
      {loading ? (
        <Panel pad={false}><Loading text="Učitavanje..." /></Panel>
      ) : (
        <>
          {/* Admin Activities Tab */}
          {activeTab === 'activities' && (
            <Panel
              pad={false}
              title={`Admin Aktivnosti (${activitiesPagination.totalCount})`}
              actions={<>
                <Btn size="sm" variant="primary" icon={FileDown} onClick={() => setShowExportModal(true)}>Export u Excel</Btn>
                <Btn size="sm" icon={RefreshCw} onClick={fetchActivities}>Osveži</Btn>
              </>}
            >
              {activities.length === 0 ? (
                <div className="sx-empty-block"><b>Nema podataka za prikaz</b></div>
              ) : (
                <div className="sx-tablewrap">
                  <table className="sx-table mx-bl-acts" data-testid="activities-table">
                    <thead>
                      <tr>
                        <th>Vreme</th>
                        <th>Korisnik</th>
                        <th>Akcija</th>
                        <th>Kategorija</th>
                        <th>Entitet</th>
                        <th className="mx-bl-details">Detalji</th>
                        <th className="is-num">Trajanje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((activity, index) => (
                        <tr key={index} style={{ '--i': index }}>
                          <td className="is-head"><span className="sx-mono">{formatTimestamp(activity.timestamp)}</span></td>
                          <td data-label="Korisnik"><b className="mx-strong">{activity.userName}</b></td>
                          <td data-label="Akcija"><span className="sx-mono">{breakable(activity.action)}</span></td>
                          <td data-label="Kategorija"><span className="sx-tag">{activity.category}</span></td>
                          <td data-label="Entitet"><b className="mx-strong">{activity.entityName || '-'}</b></td>
                          <td data-label="Detalji" className="is-wide mx-bl-details">
                            {/* Bulk upload summary */}
                            {activity.details?.action === 'bulk_created' && activity.details?.summary && (
                              <Note tone="info" className="mx-bl-note">
                                <b>Bulk Upload:</b>
                                <span>Dodato: {activity.details.summary.addedCount}</span>
                                <span>Duplikati: {activity.details.summary.duplicatesCount}</span>
                                <span>Greške: {activity.details.summary.errorsCount}</span>
                                <Btn size="sm" variant="ghost" iconRight={ArrowRight} onClick={() => openBulk(activity.details)}>Prikaži sve stavke</Btn>
                              </Note>
                            )}

                            {/* Bulk equipment assignment */}
                            {activity.details?.action === 'bulk_assigned' && activity.details?.summary && (
                              <Note tone="ok" className="mx-bl-note">
                                <b>Bulk Assignment:</b>
                                <span>Dodeljeno: {activity.details.summary.assignedCount} opreme</span>
                                <span>Tehničar: {activity.details.summary.technicianName}</span>
                                <Btn size="sm" variant="ghost" iconRight={ArrowRight}
                                  onClick={() => {
                                    console.log('🔍 [Frontend] Opening bulk modal with details:', {
                                      action: activity.details?.action,
                                      summaryAssignedCount: activity.details?.summary?.assignedCount,
                                      assignedItemsLength: activity.details?.assignedItems?.length,
                                      fullDetails: activity.details
                                    });
                                    openBulk(activity.details);
                                  }}
                                >
                                  Prikaži sve stavke
                                </Btn>
                              </Note>
                            )}

                            {/* Bulk equipment unassignment */}
                            {activity.details?.action === 'bulk_unassigned' && activity.details?.summary && (
                              <Note tone="warn" className="mx-bl-note">
                                <b>Bulk Unassignment:</b>
                                <span>Vraćeno: {activity.details.summary.unassignedCount} opreme</span>
                                <span>Od tehničara: {activity.details.summary.technicianName}</span>
                                <Btn size="sm" variant="ghost" iconRight={ArrowRight}
                                  onClick={() => {
                                    console.log('🔍 [Frontend] Opening unassign modal with details:', {
                                      action: activity.details?.action,
                                      summaryUnassignedCount: activity.details?.summary?.unassignedCount,
                                      assignedItemsLength: activity.details?.assignedItems?.length,
                                      fullDetails: activity.details
                                    });
                                    openBulk(activity.details);
                                  }}
                                >
                                  Prikaži sve stavke
                                </Btn>
                              </Note>
                            )}

                            {/* Single item delete */}
                            {activity.details?.before && !['bulk_created', 'bulk_assigned', 'bulk_unassigned'].includes(activity.details?.action) && (
                              <Note tone="bad" className="mx-bl-note">
                                <p>
                                  <b>Obrisano: </b>
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
                                </p>
                              </Note>
                            )}

                            {/* Updated item with changes list */}
                            {activity.details?.action === 'updated' && activity.details?.changes && activity.details.changes.length > 0 && (
                              <Note tone="info" className="mx-bl-note">
                                <b>Promene ({activity.details.changeCount}):</b>
                                <ul className="mx-bl-changes">
                                  {activity.details.changes.map((change, idx) => (
                                    <li key={idx}>{change}</li>
                                  ))}
                                </ul>
                              </Note>
                            )}

                            {/* Single item add/edit (fallback for old logs without changes) */}
                            {activity.details?.after && !['bulk_created', 'bulk_assigned', 'bulk_unassigned', 'updated', 'added', 'removed'].includes(activity.details?.action) && (
                              <Note tone="ok" className="mx-bl-note">
                                <p>
                                  <b>{activity.details.action === 'created' ? 'Dodato: ' : 'Izmenjeno: '}</b>
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
                                </p>
                              </Note>
                            )}

                            {/* Edit actions - Equipment added/removed */}
                            {activity.category === 'edit' && (activity.action === 'edit_equipment_add' || activity.action === 'edit_equipment_remove') && (
                              <Note tone={activity.action === 'edit_equipment_add' ? 'ok' : 'bad'} className="mx-bl-note">
                                <b>Oprema {activity.action === 'edit_equipment_add' ? 'dodata' : 'uklonjena'}:</b>
                                {activity.details?.equipment ? (
                                  <>
                                    <span><span className="sx-muted">Kategorija:</span> {activity.details.equipment.category}</span>
                                    <span><span className="sx-muted">Opis:</span> {activity.details.equipment.description}</span>
                                    <span><span className="sx-muted">S/N:</span> {activity.details.equipment.serialNumber}</span>
                                  </>
                                ) : (
                                  <span className="mx-bl-missing">Podaci o opremi nisu dostupni</span>
                                )}
                                {activity.details?.workOrder && (
                                  <span className="mx-bl-wo"><span className="sx-muted">Radni nalog:</span> {activity.details.workOrder.tisId}</span>
                                )}
                              </Note>
                            )}

                            {/* Edit actions - Material added/removed */}
                            {activity.category === 'edit' && (activity.action === 'edit_material_add' || activity.action === 'edit_material_remove') && (
                              <Note tone={activity.action === 'edit_material_add' ? 'ok' : 'bad'} className="mx-bl-note">
                                <b>Materijal {activity.action === 'edit_material_add' ? 'dodat' : 'uklonjen'}:</b>
                                {activity.details?.material ? (
                                  <>
                                    <span><span className="sx-muted">Tip:</span> {activity.details.material.type}</span>
                                    <span><span className="sx-muted">Količina:</span> {activity.details.material.quantity}</span>
                                  </>
                                ) : (
                                  <span className="mx-bl-missing">Podaci o materijalu nisu dostupni</span>
                                )}
                                {activity.details?.workOrder && (
                                  <span className="mx-bl-wo"><span className="sx-muted">Radni nalog:</span> {activity.details.workOrder.tisId}</span>
                                )}
                              </Note>
                            )}

                            {!activity.details?.before && !activity.details?.after && !activity.details?.summary && !activity.details?.changes && !activity.details?.equipment && !activity.details?.material && activity.category !== 'edit' && <span className="sx-faint">-</span>}
                            {activity.category === 'edit' && !activity.details?.equipment && !activity.details?.material && (
                              <span className="mx-bl-debug">
                                Debug: Edit activity bez detalja (action: {activity.action})
                              </span>
                            )}
                          </td>
                          <td data-label="Trajanje" className="is-num">
                            {activity.metadata?.requestDuration ? `${activity.metadata.requestDuration}ms` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Activities Pagination */}
              <Pager page={activitiesPagination.currentPage} total={activitiesPagination.totalCount} perPage={activitiesPagination.limit} onPage={handleActivitiesPageChange} />
            </Panel>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <Panel
              pad={false}
              title={`Greške (${errorsPagination.totalCount})`}
              actions={<Btn size="sm" icon={RefreshCw} onClick={fetchErrors}>Osveži</Btn>}
            >
              {errors.length === 0 ? (
                <div className="sx-empty-block"><b>Nema grešaka za prikaz</b></div>
              ) : (
                <div className="sx-tablewrap">
                  <table className="sx-table" data-testid="errors-table">
                    <thead>
                      <tr>
                        <th>Vreme</th>
                        <th>Tip</th>
                        <th>Poruka</th>
                        <th>Ruta</th>
                        <th>Severity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((error, index) => (
                        <tr key={index} style={{ '--i': index }}>
                          <td className="is-head"><span className="sx-mono">{formatTimestamp(error.timestamp)}</span></td>
                          <td data-label="Tip"><b className="mx-strong">{error.errorType}</b></td>
                          <td data-label="Poruka" className="is-wide"><span className="sx-cell__clip mx-bl-msg" title={error.errorMessage}>{error.errorMessage}</span></td>
                          <td data-label="Ruta"><span className="sx-mono mx-bl-code">{breakable(error.route)}</span></td>
                          <td data-label="Severity"><Sign tone={SEVERITY_TONE[error.severity] || 'idle'}>{error.severity}</Sign></td>
                          <td data-label="Status">
                            {error.resolved ? (
                              <Sign tone="ok">Rešeno</Sign>
                            ) : (
                              <Sign tone="warn">Pending</Sign>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Errors Pagination */}
              <Pager page={errorsPagination.currentPage} total={errorsPagination.totalCount} perPage={errorsPagination.limit} onPage={handleErrorsPageChange} />
            </Panel>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <Panel
              pad={false}
              title={`Performance Logs (${performancePagination.totalCount})`}
              actions={<Btn size="sm" icon={RefreshCw} onClick={fetchPerformance}>Osveži</Btn>}
            >
              {performanceLogs.length === 0 ? (
                <div className="sx-empty-block"><b>Nema podataka za prikaz</b></div>
              ) : (
                <div className="sx-tablewrap">
                  <table className="sx-table" data-testid="performance-table">
                    <thead>
                      <tr>
                        <th>Vreme</th>
                        <th>Ruta</th>
                        <th>Metoda</th>
                        <th className="is-num">Trajanje</th>
                        <th>Status</th>
                        <th>Korisnik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceLogs.map((log, index) => (
                        <tr key={index} style={{ '--i': index }} className={log.isSlow ? 'mx-bl-slow' : undefined}>
                          <td className="is-head"><span className="sx-mono">{formatTimestamp(log.timestamp)}</span></td>
                          <td data-label="Ruta"><span className="sx-mono mx-bl-code">{breakable(log.route)}</span></td>
                          <td data-label="Metoda"><span className="sx-tag sx-mono">{log.method}</span></td>
                          <td data-label="Trajanje" className="is-num">
                            {log.isSlow ? <Sign tone="bad">{log.duration}ms</Sign> : `${log.duration}ms`}
                            {log.isSlow && (
                              <span className="sx-tag is-bad mx-bl-slowtag">
                                Spor
                              </span>
                            )}
                          </td>
                          <td data-label="Status"><Sign tone={statusTone(log.statusCode)}>{log.statusCode}</Sign></td>
                          <td data-label="Korisnik">{log.userName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Performance Pagination */}
              <Pager page={performancePagination.currentPage} total={performancePagination.totalCount} perPage={performancePagination.limit} onPage={handlePerformancePageChange} />
            </Panel>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'ai-analysis' && <AIAnalysisSection />}

          {/* AI Technician Analysis Tab */}
          {activeTab === 'tech-analysis' && <AITechnicianAnalysisSection />}
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <Dialog
          onClose={() => setShowExportModal(false)}
          busy={exportLoading}
          size="xl"
          eyebrow="Backend Logs"
          title="Export Admin Aktivnosti"
          description="Izaberite filtere za export u Excel format"
          testId="export-modal"
          footer={<>
            <Btn variant="ghost" onClick={() => setShowExportModal(false)} disabled={exportLoading}>Otkaži</Btn>
            <Btn variant="primary" icon={FileDown} onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? 'Exportovanje...' : 'Export u Excel'}
            </Btn>
          </>}
        >
          <div className="sx-form mx-bl-form">
            {/* Date Range */}
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

            {/* Category */}
            <Field label="Kategorija" htmlFor="mx-bl-exp-category" wide>
              <Select
                id="mx-bl-exp-category"
                value={exportFilters.category}
                onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value, subcategory: 'all', entityFilter: '' })}
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
              </Select>
            </Field>

            {/* Subcategory */}
            {exportFilters.category !== 'all' && (
              <Field label="Podkategorija" htmlFor="mx-bl-exp-sub" wide>
                <Select
                  id="mx-bl-exp-sub"
                  value={exportFilters.subcategory}
                  onChange={(e) => setExportFilters({ ...exportFilters, subcategory: e.target.value, entityFilter: '' })}
                >
                  {getSubcategories().map(sub => (
                    <option key={sub.value} value={sub.value}>{sub.label}</option>
                  ))}
                </Select>
              </Field>
            )}

            {/* Entity Filter */}
            {shouldShowEntityFilter() === 'technician' && (
              <Field label="Tehničar (opciono)" htmlFor="mx-bl-exp-entity" wide>
                <Select
                  id="mx-bl-exp-entity"
                  value={exportFilters.entityFilter}
                  onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                >
                  <option value="">Svi tehničari</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech.name}>{tech.name}</option>
                  ))}
                </Select>
              </Field>
            )}

            {shouldShowEntityFilter() === 'serialNumber' && (
              <Field label="Serijski Broj (opciono)" htmlFor="mx-bl-exp-entity" wide>
                <Input
                  id="mx-bl-exp-entity"
                  type="text"
                  mono
                  value={exportFilters.entityFilter}
                  onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                  placeholder="Unesite serijski broj..."
                />
              </Field>
            )}

            {shouldShowEntityFilter() === 'materialType' && (
              <Field label="Tip Materijala (opciono):" htmlFor="mx-bl-exp-entity" wide>
                <Input
                  id="mx-bl-exp-entity"
                  type="text"
                  value={exportFilters.entityFilter}
                  onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                  placeholder="Unesite tip materijala..."
                />
              </Field>
            )}

            {shouldShowEntityFilter() === 'technicianName' && (
              <Field label="Ime Tehničara (opciono):" htmlFor="mx-bl-exp-entity" wide>
                <Input
                  id="mx-bl-exp-entity"
                  type="text"
                  value={exportFilters.entityFilter}
                  onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                  placeholder="Unesite ime tehničara..."
                />
              </Field>
            )}

            {shouldShowEntityFilter() === 'tisJobId' && (
              <Field label="TIS Job ID (opciono):" htmlFor="mx-bl-exp-entity" wide>
                <Input
                  id="mx-bl-exp-entity"
                  type="text"
                  mono
                  value={exportFilters.entityFilter}
                  onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                  placeholder="Unesite TIS Job ID..."
                />
              </Field>
            )}

            {shouldShowEntityFilter() === 'userName' && (
              <Field label="Ime Korisnika (opciono):" htmlFor="mx-bl-exp-entity" wide>
                <Input
                  id="mx-bl-exp-entity"
                  type="text"
                  value={exportFilters.entityFilter}
                  onChange={(e) => setExportFilters({ ...exportFilters, entityFilter: e.target.value })}
                  placeholder="Unesite ime korisnika..."
                />
              </Field>
            )}
          </div>

          {/* Info Message */}
          <Note tone="info" className="mx-bl-exportnote">
            <b>Napomena o exportu</b>
            <p>Excel fajl će sadržati svaki komad opreme u posebnom redu za lakše filtriranje i analizu podataka.</p>
          </Note>
        </Dialog>
      )}

      {/* Bulk Upload Details Modal */}
      {showBulkModal && bulkDetails && (
        <BulkDetailsDialog
          bulkDetails={bulkDetails}
          onClose={() => {
            setShowBulkModal(false);
            setBulkDetails(null);
          }}
        />
      )}
    </div>
  );
};

const TABS = [
  { key: 'activities', label: 'Admin Aktivnosti', icon: Activity },
  { key: 'errors', label: 'Greške', icon: TriangleAlert },
  { key: 'performance', label: 'Performance', icon: Zap },
  { key: 'ai-analysis', label: 'AI Analiza', icon: Brain },
  { key: 'tech-analysis', label: 'AI Tehničari', icon: HardHat }
];

// Dug naziv akcije ili rute (equipment_assign_to_tech, /api/logs/...) sme da se prelomi posle _ / ? &
const breakable = (s) => String(s || '').split(/([_/?&])/).map((p, i) => (i % 2 ? <React.Fragment key={i}>{p}<wbr /></React.Fragment> : p));

// Ton znaka: ozbiljnost greške i HTTP status
const SEVERITY_TONE = { low: 'info', medium: 'warn', high: 'bad', critical: 'bad' };
const statusTone = (code) => (code >= 500 ? 'bad' : code >= 400 ? 'warn' : code >= 300 ? 'info' : code >= 200 ? 'ok' : 'idle');

const BULK_TITLE = { bulk_created: 'Bulk Upload Detalji', bulk_assigned: 'Bulk Assignment Detalji', bulk_unassigned: 'Bulk Unassignment Detalji' };
const BULK_EMPTY = { bulk_created: 'Nema dodatih stavki', bulk_assigned: 'Nema dodeljene opreme', bulk_unassigned: 'Nema vraćene opreme' };

// Stavke bulk akcije (dodato / dodeljeno / vraćeno, duplikati, greške)
function BulkDetailsDialog({ bulkDetails, onClose }) {
  const [tab, setTab] = useState('added');
  const items = bulkDetails.addedItems || bulkDetails.assignedItems || [];
  const firstItem = items[0] || {};
  const addedLabel = {
    bulk_created: `Dodato (${bulkDetails.addedItems?.length || 0})`,
    bulk_assigned: `Dodeljeno (${bulkDetails.assignedItems?.length || 0})`,
    bulk_unassigned: `Vraćeno (${bulkDetails.assignedItems?.length || 0})`
  }[bulkDetails.action];
  const tabs = [
    { key: 'added', label: addedLabel },
    ...(bulkDetails.action === 'bulk_created' ? [
      { key: 'duplicates', label: `Duplikati (${bulkDetails.duplicates?.length || 0})` },
      { key: 'errors', label: `Greške (${bulkDetails.errors?.length || 0})` }
    ] : [])
  ];
  const summary = bulkDetails.summary || {};

  return (
    <Dialog
      onClose={onClose}
      size="xl"
      eyebrow="Admin Aktivnosti"
      title={BULK_TITLE[bulkDetails.action]}
      description={`Ukupno obrađeno: ${bulkDetails.summary?.totalProcessed || 0} stavki${bulkDetails.summary?.technicianName ? ` • Tehničar: ${bulkDetails.summary.technicianName}` : ''}`}
      testId="bulk-modal"
      footer={<Btn onClick={onClose}>Zatvori</Btn>}
    >
      {/* Modal Stats */}
      {bulkDetails.action === 'bulk_created' && (
        <div className="sx-stats mx-bl-bulkstats">
          <Stat label="Uspešno dodato" value={summary.addedCount || 0} tone={summary.addedCount ? 'ok' : null} />
          <Stat label="Duplikati" value={summary.duplicatesCount || 0} tone={summary.duplicatesCount ? 'warn' : null} />
          <Stat label="Greške" value={summary.errorsCount || 0} tone={summary.errorsCount ? 'bad' : null} />
        </div>
      )}

      {bulkDetails.action === 'bulk_assigned' && (
        <div className="sx-stats mx-bl-bulkstats">
          <Stat label="Dodeljeno opreme" value={summary.assignedCount || 0} tone={summary.assignedCount ? 'ok' : null} />
          <div className="sx-stat"><span className="sx-label">Tehničar</span><b className="mx-bl-statname">{summary.technicianName || '-'}</b></div>
        </div>
      )}

      {bulkDetails.action === 'bulk_unassigned' && (
        <div className="sx-stats mx-bl-bulkstats">
          <Stat label="Vraćeno opreme" value={summary.unassignedCount || 0} tone={summary.unassignedCount ? 'warn' : null} />
          <div className="sx-stat"><span className="sx-label">Od tehničara</span><b className="mx-bl-statname">{summary.technicianName || '-'}</b></div>
        </div>
      )}

      {/* Modal Tabs */}
      <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Stavke" layoutId="mx-bl-bulk-tabs" />

      {/* Added/Assigned Items Tab */}
      {tab === 'added' && (
        ((bulkDetails.addedItems && bulkDetails.addedItems.length > 0) ||
          (bulkDetails.assignedItems && bulkDetails.assignedItems.length > 0)) ? (
          <Panel pad={false}>
            <div className="sx-tablewrap">
              <table className="sx-table" data-testid="bulk-items-table">
                <thead>
                  <tr>
                    {/* Equipment columns */}
                    {firstItem.category && <th>Kategorija</th>}
                    {firstItem.description && <th>Opis</th>}
                    {firstItem.serialNumber && <th>Serijski Broj</th>}
                    {firstItem.location && <th>Lokacija</th>}
                    {/* WorkOrder columns */}
                    {firstItem.tisJobId && <th>TIS Job ID</th>}
                    {firstItem.address && <th>Adresa</th>}
                    {firstItem.municipality && <th>Opština</th>}
                    {firstItem.type && !firstItem.category && <th>Tip</th>}
                    {firstItem.date && <th>Datum</th>}
                    {firstItem.time && <th>Vreme</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ '--i': index }}>
                      {/* Equipment cells */}
                      {item.category && <td data-label="Kategorija"><b className="mx-strong">{item.category}</b></td>}
                      {item.description && <td data-label="Opis">{item.description}</td>}
                      {item.serialNumber && <td data-label="Serijski Broj"><span className="sx-mono">{item.serialNumber}</span></td>}
                      {item.location && <td data-label="Lokacija">{item.location}</td>}
                      {/* WorkOrder cells */}
                      {item.tisJobId && <td data-label="TIS Job ID"><span className="sx-mono sx-nowrap">{item.tisJobId}</span></td>}
                      {item.address && <td data-label="Adresa">{item.address}</td>}
                      {item.municipality && <td data-label="Opština">{item.municipality}</td>}
                      {item.type && !item.category && <td data-label="Tip">{item.type}</td>}
                      {item.date && <td data-label="Datum"><span className="sx-mono sx-nowrap">{new Date(item.date).toLocaleDateString('sr-RS')}</span></td>}
                      {item.time && <td data-label="Vreme"><span className="sx-mono">{item.time}</span></td>}
                      <td data-label="Status"><Sign tone="ok">{item.status}</Sign></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <div className="sx-empty-block"><b>{BULK_EMPTY[bulkDetails.action]}</b></div>
        )
      )}

      {/* Duplicates Tab */}
      {tab === 'duplicates' && (
        bulkDetails.duplicates && bulkDetails.duplicates.length > 0 ? (
          <Panel pad={false}>
            <div className="sx-tablewrap">
              <table className="sx-table" data-testid="bulk-duplicates-table">
                <thead>
                  <tr>
                    <th>Kategorija</th>
                    <th>Model</th>
                    <th>Serijski Broj</th>
                    <th>Razlog</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkDetails.duplicates.map((item, index) => (
                    <tr key={index} style={{ '--i': index }}>
                      <td className="is-head"><b className="mx-strong">{item.category}</b></td>
                      <td data-label="Model">{item.model}</td>
                      <td data-label="Serijski Broj"><span className="sx-mono">{item.serialNumber}</span></td>
                      <td data-label="Razlog" className="is-wide mx-bl-reason">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <div className="sx-empty-block"><b>Nema duplikata</b></div>
        )
      )}

      {/* Errors Tab */}
      {tab === 'errors' && (
        bulkDetails.errors && bulkDetails.errors.length > 0 ? (
          <div className="mx-gap">
            {bulkDetails.errors.map((error, index) => (
              <Note key={index} tone="bad"><span className="sx-mono">{error}</span></Note>
            ))}
          </div>
        ) : (
          <div className="sx-empty-block"><b>Nema grešaka</b></div>
        )
      )}
    </Dialog>
  );
}

export default BackendLogs;
