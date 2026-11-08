import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Plus, Upload, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { toast } from '../../utils/toast';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import { getTimRowStyle } from '../../utils/tim';
import { useWorkOrderModal } from '../../context/WorkOrderModalContext';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { Select, SearchField } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { LinkBtn, Pager, Loading } from '../../montaza/ui';
import './WorkOrdersList.mx.css';

// Ikonica koja se okreće dok traje učitavanje
const Spin = (p) => <RefreshCw {...p} className="mx-spin" />;

const WorkOrdersList = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [technicianFilter, setTechnicianFilter] = useState('');

  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ zavrsen: 0, nezavrsen: 0, odlozen: 0 });

  const { refreshCounter } = useWorkOrderModal();

  // Fetch technicians once
  useEffect(() => {
    techniciansAPI.getAll().then(res => setTechnicians(res.data)).catch(() => {});
  }, []);

  // Fetch work orders when filters/page change
  useEffect(() => {
    fetchWorkOrders();
  }, [currentPage, searchTerm, statusFilter, technicianFilter]);

  // Refresh data when modal signals changes
  useEffect(() => {
    if (refreshCounter > 0) {
      fetchWorkOrders();
    }
  }, [refreshCounter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (technicianFilter && technicianFilter !== 'unassigned') params.technician = technicianFilter;

      const response = await workOrdersAPI.getAll(params);
      const data = response.data;

      if (data.workOrders) {
        setWorkOrders(data.workOrders);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        if (data.statusCounts) setStatusCounts(data.statusCounts);
      } else {
        // Backward compat if backend hasn't been deployed yet
        setWorkOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje radnih naloga!');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = fetchWorkOrders;
  
  const handleDelete = async (id, address) => {
    if (await confirm({ title: `Da li ste sigurni da želite da obrišete radni nalog za adresu "${address}"?`, tone: 'danger', confirmLabel: 'Obriši' })) {
      try {
        await workOrdersAPI.delete(id);
        toast.success('Radni nalog je uspešno obrisan!');
        fetchWorkOrders();
      } catch (error) {
        console.error('Greška pri brisanju radnog naloga:', error);
        toast.error('Greška pri brisanju radnog naloga!');
      }
    }
  };
  
    // Client-side filter only for unassigned (not supported by backend filter)
  const displayedWorkOrders = useMemo(() => {
    if (technicianFilter === 'unassigned') {
      return workOrders.filter(order => !order.technicianId && !order.technician2Id);
    }
    return workOrders;
  }, [workOrders, technicianFilter]);
  
  // Dobavljanje imena tehničara po ID-u
  const getTechnicianName = (technicianId) => {
    if (!technicianId) return 'Nedodeljen';

    // Handle both populated object and string ID
    if (typeof technicianId === 'object' && technicianId.name) {
      return technicianId.name;
    }

    const actualId = technicianId._id || technicianId;
    const technician = technicians.find(t => t._id === actualId);
    return technician ? technician.name : 'Nepoznat';
  };

  // Funkcija za formatiranje prikaza tehničara
  const getTechnicianNames = (workOrder) => {
    const tech1 = getTechnicianName(workOrder.technicianId);
    const tech2 = getTechnicianName(workOrder.technician2Id);
    
    if (tech1 === 'Nedodeljen' && tech2 === 'Nedodeljen') {
      return 'Nedodeljen';
    }
    
    const names = [];
    if (tech1 !== 'Nedodeljen') names.push(tech1);
    if (tech2 !== 'Nedodeljen') names.push(tech2);
    
    return names.join(', ');
  };
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Ton znaka statusa (završen ok, nezavršen warn, odložen info, otkazan bad)
  const getStatusTone = (status) => {
    switch (status) {
      case 'zavrsen': return 'ok';
      case 'nezavrsen': return 'warn';
      case 'odlozen': return 'info';
      case 'otkazan': return 'bad';
      default: return 'idle';
    }
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'zavrsen': return 'Završen';
      case 'nezavrsen': return 'Nezavršen';
      case 'odlozen': return 'Odložen';
      default: return status;
    }
  };
  
  const pct = (n) => (totalCount ? Math.round(n / totalCount * 100) : 0);

  return (
    <div className="sx-page" data-testid="page-work-orders-list">
      <PageHead
        eyebrow="Montaža · Radni nalozi"
        title="Pregled radnih naloga"
        actions={<>
          <Btn icon={loading ? Spin : RefreshCw} onClick={fetchData} disabled={loading} title="Osveži podatke">{loading ? 'Osvežava...' : 'Osveži'}</Btn>
          <LinkBtn to="/work-orders/add" variant="primary" icon={Plus}>Novi nalog</LinkBtn>
          <LinkBtn to="/work-orders/upload" icon={Upload}>Import</LinkBtn>
        </>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      <Panel pad={false}>
        <div className="mx-wol__controls">
          <div className="mx-wol__filters">
            <SearchField value={searchInput} onChange={setSearchInput} placeholder="Pretraga po opštini, adresi, tipu..." />
            <Select size="sm" aria-label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="">Svi statusi</option>
              <option value="zavrsen">Završeni</option>
              <option value="nezavrsen">Nezavršeni</option>
              <option value="odlozen">Odloženi</option>
            </Select>
            <Select size="sm" aria-label="Tehničar" value={technicianFilter} onChange={(e) => { setTechnicianFilter(e.target.value); setCurrentPage(1); }}>
              <option value="">Svi tehničari</option>
              <option value="unassigned">Nedodeljeni</option>
              {technicians.filter(tech => !tech.deletedAt).map(tech => (
                <option key={tech._id} value={tech._id}>
                  {tech.name}
                </option>
              ))}
            </Select>
          </div>
          <Btn size="sm" icon={loading ? Spin : RefreshCw} onClick={fetchData} disabled={loading}>Osveži</Btn>
        </div>

        {loading ? (
          <Loading text="Učitavanje radnih naloga..." />
        ) : (
          <>
            {displayedWorkOrders.length === 0 ? (
              <div className="sx-empty-block">
                <b>Nema rezultata za prikazivanje</b>
              </div>
            ) : (
              <div className="sx-tablewrap">
                <table className="sx-table mx-wol__table" data-testid="work-orders-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Opština</th>
                      <th>Adresa</th>
                      <th>Tip</th>
                      <th>Tehničar</th>
                      <th>Status</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedWorkOrders.map((order, i) => (
                      <tr key={order._id} style={{ '--i': i, ...getTimRowStyle(order.tim) }}>
                        <td className="is-head"><span className="sx-mono mx-strong">{new Date(order.date).toLocaleDateString('sr-RS')}</span></td>
                        <td data-label="Opština">{order.municipality}</td>
                        <td data-label="Adresa" className="is-wide">{order.address}</td>
                        <td data-label="Tip">{order.type}</td>
                        <td data-label="Tehničar">
                          <span className={(!order.technicianId && !order.technician2Id) ? 'sx-faint' : undefined}>{getTechnicianNames(order)}</span>
                          {order.statusChangedBy && (
                            <small className="mx-wol__by">
                              (Status: {getTechnicianName(order.statusChangedBy)})
                            </small>
                          )}
                        </td>
                        <td data-label="Status">
                          <Sign tone={getStatusTone(order.status)}>{getStatusLabel(order.status)}</Sign>
                        </td>
                        <td className="is-actions">
                          <div className="sx-rowacts mx-wol__acts">
                            <LinkBtn size="sm" variant="ghost" icon={Eye} to={`/work-orders/${order._id}`} state={{ backgroundLocation: location }}>Detalji</LinkBtn>
                            <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" aria-label="Obriši" onClick={() => handleDelete(order._id, order.address)} disabled={loading} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalPages > 1 && <Pager page={currentPage} total={totalCount} perPage={itemsPerPage} onPage={paginate} />}
          </>
        )}

        <div className="sx-stats mx-wol__stats">
          <Stat label="Ukupno" value={totalCount} />
          <Stat label="Završeni" value={statusCounts.zavrsen} small={`${pct(statusCounts.zavrsen)}%`} />
          <Stat label="Nezavršeni" value={statusCounts.nezavrsen} small={`${pct(statusCounts.nezavrsen)}%`} />
          <Stat label="Odloženi" value={statusCounts.odlozen} small={`${pct(statusCounts.odlozen)}%`} />
        </div>
      </Panel>
    </div>
  );
};

export default React.memo(WorkOrdersList);
