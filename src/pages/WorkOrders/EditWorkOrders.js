import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { workOrdersAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { RefreshCw, MapPin, CalendarDays, Clock, UserRound, Filter, TriangleAlert } from 'lucide-react';
import { getTimRowStyle } from '../../utils/tim';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Stat } from '../../security/sx/layout';
import { Field, Select, SearchField } from '../../security/sx/forms';
import { Pager, Loading } from '../../montaza/ui';
import './EditWorkOrders.mx.css';

// Ton znaka statusa (završen ok, nezavršen warn, odložen info, otkazan bad)
const STATUS_TONE = { zavrsen: 'ok', nezavrsen: 'warn', odlozen: 'info', otkazan: 'bad' };

const EditWorkOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Server-side pagination state
  const [workOrders, setWorkOrders] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 24,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to page 1 when search changes
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when pagination, search, or filters change
  useEffect(() => {
    fetchWorkOrders();
  }, [pagination.currentPage, debouncedSearchTerm, statusFilter, municipalityFilter, technicianFilter]);

  // Initial load - fetch filters
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await api.get('/api/workorders/edit-filters');
      setMunicipalities(response.data.municipalities || []);
      setTechnicians(response.data.technicians || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchWorkOrders = async (page = pagination.currentPage) => {
    setLoading(true);

    try {
      // Build query params for server-side filtering and pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearchTerm,
        status: statusFilter,
        municipality: municipalityFilter,
        technician: technicianFilter
      });

      const response = await api.get(`/api/workorders?${params.toString()}`);

      // Handle response - check if it has pagination data
      if (response.data.workOrders) {
        // Server returned paginated data
        setWorkOrders(response.data.workOrders);
        setPagination(response.data.pagination);
        setPerformance(response.data.performance || { queryTime: 0, resultsPerPage: response.data.workOrders.length });
      } else {
        // Server returned all data - do client-side pagination
        let filteredData = response.data.filter(wo => {
          const matchesSearch = !debouncedSearchTerm ||
            wo.tisId?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            wo.userName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            wo.address?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            wo.municipality?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

          const matchesStatus = !statusFilter || wo.status === statusFilter;
          const matchesMunicipality = !municipalityFilter || wo.municipality === municipalityFilter;
          const matchesTechnician = !technicianFilter ||
            wo.technicianId?._id === technicianFilter ||
            wo.technician2Id?._id === technicianFilter;

          return matchesSearch && matchesStatus && matchesMunicipality && matchesTechnician;
        });

        // Client-side pagination
        const startIndex = (page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        setWorkOrders(paginatedData);
        setPagination({
          currentPage: page,
          totalPages: Math.ceil(filteredData.length / pagination.limit),
          totalCount: filteredData.length,
          limit: pagination.limit,
          hasNextPage: endIndex < filteredData.length,
          hasPreviousPage: page > 1
        });
        setPerformance({ queryTime: 0, resultsPerPage: paginatedData.length });
      }

    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error('Greška pri učitavanju radnih naloga');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'zavrsen':
        return 'Završen';
      case 'nezavrsen':
        return 'Nezavršen';
      case 'otkazan':
        return 'Otkazan';
      case 'odlozen':
        return 'Odložen';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && pagination.currentPage === 1) {
    return (
      <div className="sx-page" data-testid="page-edit-work-orders">
        <Loading text="Učitavanje..." rows={6} />
      </div>
    );
  }

  const resetPage = () => setPagination(prev => ({ ...prev, currentPage: 1 }));

  return (
    <div className="sx-page" data-testid="page-edit-work-orders">
      <PageHead
        eyebrow="Montaža · Edit"
        title="Edituj radne naloge"
        lead="Dodaj opremu i materijal u radne naloge"
        actions={<Btn icon={RefreshCw} onClick={() => fetchWorkOrders(pagination.currentPage)} disabled={loading}>Osveži</Btn>}
      />

      {/* Stats Card */}
      <div className="sx-stats">
        <Stat label="Ukupno radnih naloga" value={pagination.totalCount} />
        <Stat label="Trenutna stranica" value={`${pagination.currentPage} / ${pagination.totalPages}`} />
        <Stat label="Rezultata po stranici" value={performance.resultsPerPage} />
      </div>

      {/* Filters Card */}
      <Panel title={<span className="sx-panel__title-row"><Filter size={17} strokeWidth={1.9} aria-hidden="true" />Filteri i pretraga</span>} className="mx-woe__filters">
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži po TIS ID, korisniku, adresi..." />
        <div className="sx-form mx-woe__selects">
          <Field label="Status:" htmlFor="woe-status">
            <Select id="woe-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
              <option value="">Svi statusi</option>
              <option value="nezavrsen">Nezavršen</option>
              <option value="zavrsen">Završen</option>
              <option value="odlozen">Odložen</option>
              <option value="otkazan">Otkazan</option>
            </Select>
          </Field>
          <Field label="Opština:" htmlFor="woe-municipality">
            <Select id="woe-municipality" value={municipalityFilter} onChange={(e) => { setMunicipalityFilter(e.target.value); resetPage(); }}>
              <option value="">Sve opštine</option>
              {municipalities.map(municipality => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tehničar:" htmlFor="woe-technician">
            <Select id="woe-technician" value={technicianFilter} onChange={(e) => { setTechnicianFilter(e.target.value); resetPage(); }}>
              <option value="">Svi tehničari</option>
              {technicians.map(tech => (
                <option key={tech._id} value={tech._id}>
                  {tech.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      {/* Work Orders Grid */}
      {workOrders.length === 0 ? (
        <Panel>
          <div className="mx-woe__empty">
            <TriangleAlert size={44} strokeWidth={1.4} aria-hidden="true" />
            <b>Nema radnih naloga</b>
            <span>Nema radnih naloga koji odgovaraju filterima</span>
          </div>
        </Panel>
      ) : (
        <>
          <div className="mx-woe__grid" data-testid="edit-work-orders-list">
            {workOrders.map((workOrder, i) => (
              <div
                key={workOrder._id}
                role="link"
                tabIndex={0}
                className="sx-card mx-woe__card"
                style={{ '--i': i, ...getTimRowStyle(workOrder.tim) }}
                onClick={() => navigate(`/edit-work-orders/${workOrder._id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/edit-work-orders/${workOrder._id}`); }}
                data-testid="edit-work-order"
              >
                <div className="mx-woe__card-head">
                  <div className="mx-woe__card-title">
                    <h3>{workOrder.tisId || 'N/A'}</h3>
                    <p>{workOrder.userName || 'N/A'}</p>
                  </div>
                  <Sign tone={STATUS_TONE[workOrder.status] || 'idle'}>{getStatusText(workOrder.status)}</Sign>
                </div>

                <div className="mx-woe__card-body">
                  <div className="mx-woe__row">
                    <MapPin aria-hidden="true" strokeWidth={1.8} />
                    <span>{workOrder.address || 'N/A'}, {workOrder.municipality || 'N/A'}</span>
                  </div>
                  <div className="mx-woe__row">
                    <span className="mx-woe__pair"><CalendarDays aria-hidden="true" strokeWidth={1.8} /><span className="sx-mono">{formatDate(workOrder.date)}</span></span>
                    <span className="mx-woe__pair"><Clock aria-hidden="true" strokeWidth={1.8} /><span className="sx-mono">{workOrder.time}</span></span>
                  </div>
                  <div className="mx-woe__row">
                    <UserRound aria-hidden="true" strokeWidth={1.8} />
                    <span className="mx-woe__techs">
                      {workOrder.technicianId?.name}
                      {workOrder.technician2Id && `, ${workOrder.technician2Id.name}`}
                    </span>
                  </div>

                  {workOrder.type && (
                    <div className="mx-woe__type">
                      <span className="sx-tag">{workOrder.type}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="sx-card mx-woe__pager">
              <Pager page={pagination.currentPage} total={pagination.totalCount} perPage={pagination.limit} onPage={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditWorkOrders;
