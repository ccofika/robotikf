import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, UploadIcon, SearchIcon, FilterIcon, ViewIcon, DeleteIcon, ClipboardIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import './WorkOrdersModern.css';

const WorkOrdersList = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [workOrdersResponse, techniciansResponse] = await Promise.all([
        workOrdersAPI.getAll(),
        techniciansAPI.getAll()
      ]);
      
      setWorkOrders(workOrdersResponse.data);
      setTechnicians(techniciansResponse.data);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje radnih naloga!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id, address) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete radni nalog za adresu "${address}"?`)) {
      setLoading(true);
      
      try {
        await workOrdersAPI.delete(id);
        toast.success('Radni nalog je uspešno obrisan!');
        fetchData();
      } catch (error) {
        console.error('Greška pri brisanju radnog naloga:', error);
        toast.error('Greška pri brisanju radnog naloga!');
      } finally {
        setLoading(false);
      }
    }
  };
  
    // Filtriranje radnih naloga
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(order => {
      const searchMatch = searchTerm === '' || 
                         order.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.comment && order.comment.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const statusMatch = statusFilter === '' || order.status === statusFilter;
      const technicianMatch = technicianFilter === '' || order.technicianId === technicianFilter;
      
      return searchMatch && statusMatch && technicianMatch;
    });
  }, [workOrders, searchTerm, statusFilter, technicianFilter]);
  
  // Dobavljanje imena tehničara po ID-u
  const getTechnicianName = (technicianId) => {
    if (!technicianId) return 'Nedodeljen';
    const technician = technicians.find(t => t.id === technicianId);
    return technician ? technician.name : 'Nepoznat';
  };
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredWorkOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage);
  
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
        <div className="header-actions">
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-box">
              <FilterIcon className="filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                onChange={(e) => setTechnicianFilter(e.target.value)}
              >
                <option value="">Svi tehničari</option>
                <option value="">Nedodeljeni</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
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
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">
                        Nema rezultata za prikazivanje
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((order) => (
                      <tr key={order.id} className="slide-in">
                        <td>{new Date(order.date).toLocaleDateString('sr-RS')}</td>
                        <td>{order.municipality}</td>
                        <td>{order.address}</td>
                        <td>{order.type}</td>
                        <td>
                          <span className={`technician-badge ${!order.technicianId ? 'unassigned' : ''}`}>
                            {getTechnicianName(order.technicianId)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="actions-column">
                          <Link 
                            to={`/work-orders/${order.id}`} 
                            className="btn btn-sm action-btn view-btn"
                          >
                            <ViewIcon /> Detalji
                          </Link>
                          <button 
                            className="btn btn-sm action-btn delete-btn"
                            onClick={() => handleDelete(order.id, order.address)}
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
            
            {filteredWorkOrders.length > itemsPerPage && (
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
              <h3>{filteredWorkOrders.length}</h3>
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-icon-circle green">
              <span>{filteredWorkOrders.filter(order => order.status === 'zavrsen').length}</span>
            </div>
            <div>
              <p>Završeni</p>
              <h3>{Math.round(filteredWorkOrders.filter(order => order.status === 'zavrsen').length / filteredWorkOrders.length * 100) || 0}%</h3>
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-icon-circle yellow">
              <span>{filteredWorkOrders.filter(order => order.status === 'nezavrsen').length}</span>
            </div>
            <div>
              <p>Nezavršeni</p>
              <h3>{Math.round(filteredWorkOrders.filter(order => order.status === 'nezavrsen').length / filteredWorkOrders.length * 100) || 0}%</h3>
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-icon-circle blue">
              <span>{filteredWorkOrders.filter(order => order.status === 'odlozen').length}</span>
            </div>
            <div>
              <p>Odloženi</p>
              <h3>{Math.round(filteredWorkOrders.filter(order => order.status === 'odlozen').length / filteredWorkOrders.length * 100) || 0}%</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkOrdersList;