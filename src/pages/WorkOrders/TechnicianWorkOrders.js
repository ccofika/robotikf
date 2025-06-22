import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, RefreshIcon, ClipboardIcon, BarChartIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './TechnicianWorkOrders.css';

const TechnicianWorkOrders = () => {
  const { user } = useContext(AuthContext);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchWorkOrders();
  }, [user?.id]);
  
  const fetchWorkOrders = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${apiUrl}/api/workorders/technician/${user.id}`);
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje radnih naloga!');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtriranje radnih naloga
  const filteredWorkOrders = workOrders.filter(order => {
    const searchMatch = searchTerm === '' || 
                       order.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (order.comment && order.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    return searchMatch && statusMatch;
  });
  
  // Sortiranje po datumu
  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    // Prvo stavljamo nezavršene
    if (a.status === 'nezavrsen' && b.status !== 'nezavrsen') return -1;
    if (a.status !== 'nezavrsen' && b.status === 'nezavrsen') return 1;
    
    // Zatim sortiramo po datumu
    return new Date(a.date) - new Date(b.date);
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedWorkOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(sortedWorkOrders.length / itemsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Statistike
  const stats = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter(o => o.status === 'zavrsen').length;
    const pending = workOrders.filter(o => o.status === 'nezavrsen').length;
    const postponed = workOrders.filter(o => o.status === 'odlozen').length;
    
    return {
      total,
      completed,
      pending,
      postponed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [workOrders]);
  
  return (
    <div className="technician-work-orders fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <ClipboardIcon />
          Moji radni nalozi
        </h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={fetchWorkOrders}
            disabled={loading}
          >
            <RefreshIcon className={loading ? 'spin' : ''} />
            Osveži
          </button>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-danger">
          <strong>Greška:</strong> {error}
        </div>
      )}
      
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <BarChartIcon />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Ukupno naloga</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon completed">
            <span>{stats.completionRate}%</span>
          </div>
          <div className="stat-content">
            <h3>{stats.completed}</h3>
            <p>Završeno</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon pending">
            <span>{stats.pending}</span>
          </div>
          <div className="stat-content">
            <h3>{stats.pending}</h3>
            <p>Nezavršeno</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon postponed">
            <span>{stats.postponed}</span>
          </div>
          <div className="stat-content">
            <h3>{stats.postponed}</h3>
            <p>Odloženo</p>
          </div>
        </div>
      </div>
      
      {/* Main Content Card */}
      <div className="card">
        <div className="card-header">
          <h2>Radni nalozi</h2>
          <div className="results-count">
            {filteredWorkOrders.length} od {workOrders.length} naloga
          </div>
        </div>
        
        {/* Table Controls */}
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
          </div>
        </div>
        
        {/* Table Content */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Učitavanje radnih naloga...</p>
          </div>
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
                    <th>Status</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <div className="empty-message">
                          <ClipboardIcon className="empty-icon" />
                          <p>
                            {searchTerm || statusFilter 
                              ? 'Nema rezultata za zadatu pretragu' 
                              : 'Nemate dodeljenih radnih naloga'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((order, index) => (
                      <tr key={order.id} className={`slide-in status-row-${order.status}`} style={{animationDelay: `${index * 0.1}s`}}>
                        <td>{new Date(order.date).toLocaleDateString('sr-RS')}</td>
                        <td>{order.municipality}</td>
                        <td>{order.address}</td>
                        <td>{order.type}</td>
                        <td>
                          <span className={`status-badge status-${order.status}`}>
                            {order.status === 'zavrsen' ? 'Završen' : 
                             order.status === 'odlozen' ? 'Odložen' : 'Nezavršen'}
                          </span>
                        </td>
                        <td className="actions-column">
                          <Link 
                            to={`/my-work-orders/${order.id}`} 
                            className="btn btn-sm action-btn view-btn"
                          >
                            <ViewIcon /> Detalji
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {sortedWorkOrders.length > itemsPerPage && (
              <div className="pagination-container">
                <div className="pagination">
                  <button 
                    onClick={() => paginate(1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    &laquo;
                  </button>
                  
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    &lsaquo;
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(number => {
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
                        className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                      >
                        {number}
                      </button>
                    ))}
                  
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    &rsaquo;
                  </button>
                  
                  <button 
                    onClick={() => paginate(totalPages)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    &raquo;
                  </button>
                </div>
                
                <div className="pagination-info">
                  Stranica {currentPage} od {totalPages}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TechnicianWorkOrders;