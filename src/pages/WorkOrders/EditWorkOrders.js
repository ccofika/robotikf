import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { workOrdersAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { RefreshCw, MapPin, CalendarDays, Clock, UserRound, ClipboardList } from 'lucide-react';
import { getTimRowStyle } from '../../utils/tim';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Stat } from '../../security/sx/layout';
import { Select, SearchField } from '../../security/sx/forms';
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

      <div className="sx-stats">
        <Stat label="Ukupno radnih naloga" value={pagination.totalCount} />
        <Stat label="Trenutna stranica" value={`${pagination.currentPage} / ${pagination.totalPages}`} />
        <Stat label="Rezultata po stranici" value={performance.resultsPerPage} />
      </div>

      <Toolbar>
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži po TIS ID, korisniku, adresi..." />
        <Select size="sm" aria-label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
          <option value="">Svi statusi</option>
          <option value="nezavrsen">Nezavršen</option>
          <option value="zavrsen">Završen</option>
          <option value="odlozen">Odložen</option>
          <option value="otkazan">Otkazan</option>
        </Select>
        <Select size="sm" aria-label="Opština" value={municipalityFilter} onChange={(e) => { setMunicipalityFilter(e.target.value); resetPage(); }}>
          <option value="">Sve opštine</option>
          {municipalities.map(municipality => (
            <option key={municipality} value={municipality}>
              {municipality}
            </option>
          ))}
        </Select>
        <Select size="sm" aria-label="Tehničar" value={technicianFilter} onChange={(e) => { setTechnicianFilter(e.target.value); resetPage(); }}>
          <option value="">Svi tehničari</option>
          {technicians.map(tech => (
            <option key={tech._id} value={tech._id}>
              {tech.name}
            </option>
          ))}
        </Select>
      </Toolbar>

      <Panel pad={false}>
        {workOrders.length === 0 ? (
          <div className="sx-empty-block">
            <b>Nema radnih naloga</b>
            <span>Nema radnih naloga koji odgovaraju filterima</span>
          </div>
        ) : (
          <>
            <div className="sx-list mx-woe__list" data-testid="edit-work-orders-list">
              {workOrders.map((workOrder, i) => (
                <div
                  key={workOrder._id}
                  role="link"
                  tabIndex={0}
                  className="sx-item is-click mx-woe__item"
                  style={{ '--i': i, ...getTimRowStyle(workOrder.tim) }}
                  onClick={() => navigate(`/edit-work-orders/${workOrder._id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/edit-work-orders/${workOrder._id}`); }}
                  data-testid="edit-work-order"
                >
                  <span className="sx-item__icon"><ClipboardList size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <div className="sx-item__main">
                    <b>{workOrder.tisId || 'N/A'}</b>
                    <span>{workOrder.userName || 'N/A'}</span>
                    <div className="mx-woe__meta">
                      <span><MapPin aria-hidden="true" strokeWidth={1.8} />{workOrder.address || 'N/A'}, {workOrder.municipality || 'N/A'}</span>
                      <span><CalendarDays aria-hidden="true" strokeWidth={1.8} /><span className="sx-mono">{formatDate(workOrder.date)}</span></span>
                      <span><Clock aria-hidden="true" strokeWidth={1.8} /><span className="sx-mono">{workOrder.time}</span></span>
                      <span className="mx-woe__techs">
                        <UserRound aria-hidden="true" strokeWidth={1.8} />
                        {workOrder.technicianId?.name}
                        {workOrder.technician2Id && `, ${workOrder.technician2Id.name}`}
                      </span>
                    </div>
                  </div>
                  <div className="sx-item__side">
                    {workOrder.type && <span className="sx-tag">{workOrder.type}</span>}
                    <Sign tone={STATUS_TONE[workOrder.status] || 'idle'}>{getStatusText(workOrder.status)}</Sign>
                  </div>
                </div>
              ))}
            </div>
            <Pager page={pagination.currentPage} total={pagination.totalCount} perPage={pagination.limit} onPage={handlePageChange} />
          </>
        )}
      </Panel>
    </div>
  );
};

export default EditWorkOrders;
