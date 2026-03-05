import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { PlusIcon, UploadIcon, SearchIcon, FilterIcon, ViewIcon, DeleteIcon, ClipboardIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { toast } from '../../utils/toast';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import { useWorkOrderModal } from '../../context/WorkOrderModalContext';
import './WorkOrdersModern.css';

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
    if (window.confirm(`Da li ste sigurni da želite da obrišete radni nalog za adresu "${address}"?`)) {
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
  
  // Stilizacija statusa
  const getStatusClass = (status) => {
    switch (status) {
      case 'zavrsen': return 'status-completed';
      case 'nezavrsen': return 'status-pending';
      case 'odlozen': return 'status-postponed';
      default: return '';
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
  
  return (
    <div className="work-orders-list fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <ClipboardIcon />
          Pregled radnih naloga
        </h1>
        <div className="Work-orders-header-actions">
          <button
            onClick={fetchData}
            className="btn btn-secondary"
            disabled={loading}
            title="Osveži podatke"
          >
            <RefreshIcon /> {loading ? 'Osvežava...' : 'Osveži'}
          </button>
          <Link to="/work-orders/add" className="btn btn-primary">
            <PlusIcon /> Novi nalog
          </Link>
          <Link to="/work-orders/upload" className="btn btn-success">
            <UploadIcon /> Import
          </Link>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card">
        <div className="table-controls">
          <div className="search-filter">
            <div className="search-box">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Pretraga po opštini, adresi, tipu..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            
            <div className="filter-box">
              <FilterIcon className="filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Svi statusi</option>
                <option value="zavrsen">Završeni</option>
                <option value="nezavrsen">Nezavršeni</option>
                <option value="odlozen">Odloženi</option>
              </select>
            </div>
            
            <div className="filter-box">
              <select
                value={technicianFilter}
                onChange={(e) => { setTechnicianFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Svi tehničari</option>
                <option value="unassigned">Nedodeljeni</option>
                {technicians.map(tech => (
                  <option key={tech._id} value={tech._id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <button 
              className="btn btn-sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshIcon className={loading ? 'spin' : ''} />
              Osveži
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-text">Učitavanje radnih naloga...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="work-orders-table">
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
                  {displayedWorkOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">
                        Nema rezultata za prikazivanje
                      </td>
                    </tr>
                  ) : (
                    displayedWorkOrders.map((order) => (
                      <tr key={order._id} className="slide-in">
                        <td>{new Date(order.date).toLocaleDateString('sr-RS')}</td>
                        <td>{order.municipality}</td>
                        <td>{order.address}</td>
                        <td>{order.type}</td>
                        <td>
                          <span className={`technician-badge ${(!order.technicianId && !order.technician2Id) ? 'unassigned' : ''}`}>
                            {getTechnicianNames(order)}
                            {order.statusChangedBy && (
                              <small className="status-changed-by">
                                (Status: {getTechnicianName(order.statusChangedBy)})
                              </small>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="actions-column">
                          <Link
                            to={`/work-orders/${order._id}`}
                            state={{ backgroundLocation: location }}
                            className="btn btn-sm action-btn view-btn"
                          >
                            <ViewIcon /> Detalji
                          </Link>
                          <button 
                            className="btn btn-sm action-btn delete-btn"
                            onClick={() => handleDelete(order._id, order.address)}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                >
                  &laquo;
                </button>
                
                <button 
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lsaquo;
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(number => {
                    // Prikaži samo nekoliko stranica oko trenutno aktivne
                    return (
                                            number === 1 || 
                      number === totalPages ||
                      Math.abs(number - currentPage) <= 2
                    );
                  })
                  .map(number => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={currentPage === number ? 'active' : ''}
                    >
                      {number}
                    </button>
                  ))}
                
                <button 
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  &rsaquo;
                </button>
                
                <button 
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  &raquo;
                </button>
              </div>
            )}
          </>
        )}
        
        <div className="work-orders-stats">
          <div className="stat">
            <div className="stat-icon-circle">
              <ClipboardIcon />
            </div>
            <div>
              <p>Ukupno</p>
              <h3>{totalCount}</h3>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon-circle green">
              <span>{statusCounts.zavrsen}</span>
            </div>
            <div>
              <p>Završeni</p>
              <h3>{totalCount ? Math.round(statusCounts.zavrsen / totalCount * 100) : 0}%</h3>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon-circle yellow">
              <span>{statusCounts.nezavrsen}</span>
            </div>
            <div>
              <p>Nezavršeni</p>
              <h3>{totalCount ? Math.round(statusCounts.nezavrsen / totalCount * 100) : 0}%</h3>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon-circle blue">
              <span>{statusCounts.odlozen}</span>
            </div>
            <div>
              <p>Odloženi</p>
              <h3>{totalCount ? Math.round(statusCounts.odlozen / totalCount * 100) : 0}%</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WorkOrdersList);