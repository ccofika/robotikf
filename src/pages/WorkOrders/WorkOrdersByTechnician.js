// Kreirati u direktorijumu: src/pages/WorkOrders/WorkOrdersByTechnician.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, DeleteIcon, UserIcon, UserSlashIcon, ToolsIcon, CheckIcon, AlertIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import axios from 'axios';
import './WorkOrdersModern.css';

const WorkOrdersByTechnician = () => {
  const [technicians, setTechnicians] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [verificationOrders, setVerificationOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('technicians');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  
  // Paginacija
  const [currentPageUnassigned, setCurrentPageUnassigned] = useState(1);
  const [currentPageVerification, setCurrentPageVerification] = useState(1);
  const [technicianCurrentPages, setTechnicianCurrentPages] = useState({});
  const itemsPerPage = 20;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
    useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [techniciansResponse, workOrdersResponse, unassignedResponse, verificationResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/technicians`),
        axios.get(`${apiUrl}/api/workorders`),
        axios.get(`${apiUrl}/api/workorders/unassigned`),
        axios.get(`${apiUrl}/api/workorders/verification`)
      ]);
      
      setTechnicians(techniciansResponse.data);
      setWorkOrders(workOrdersResponse.data);
      setUnassignedOrders(unassignedResponse.data);
      setVerificationOrders(verificationResponse.data);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje podataka!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOrder = async (orderId) => {
    try {
      await axios.put(`${apiUrl}/api/workorders/${orderId}/verify`);
      toast.success('Radni nalog je uspešno verifikovan!');
      
      // Ažuriranje liste nakon verifikacije
      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));
      
      // Osvežavamo glavnu listu radnih naloga
      const updatedWorkOrders = [...workOrders];
      const updatedIndex = updatedWorkOrders.findIndex(order => order._id === orderId);
      
      if (updatedIndex !== -1) {
        updatedWorkOrders[updatedIndex] = {
          ...updatedWorkOrders[updatedIndex],
          verified: true,
          verifiedAt: new Date().toISOString()
        };
        
        setWorkOrders(updatedWorkOrders);
      }
      
    } catch (error) {
      console.error('Greška pri verifikaciji:', error);
      toast.error('Neuspešna verifikacija radnog naloga!');
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Da li ste sigurni da želite da obrišete ovaj radni nalog?')) {
      try {
        await axios.delete(`${apiUrl}/api/workorders/${id}`);
        toast.success('Radni nalog je uspešno obrisan!');
        
        // Ažuriranje listi nakon brisanja
        setWorkOrders(prev => prev.filter(order => order._id !== id));
        setUnassignedOrders(prev => prev.filter(order => order._id !== id));
        setVerificationOrders(prev => prev.filter(order => order._id !== id));
        
      } catch (error) {
        console.error('Greška pri brisanju:', error);
        toast.error('Neuspešno brisanje radnog naloga!');
      }
    }
  };
  
  const groupWorkOrdersByTechnician = () => {
    const techWorkOrders = {};
    
    // Inicijalizacija objekata za sve tehničare
    technicians.forEach(tech => {
      techWorkOrders[tech._id] = {
        technicianInfo: tech,
        workOrders: []
      };
    });
    
    // Dodavanje radnih naloga za svakog tehničara
    workOrders.forEach(order => {
      // Provera da li je technicianId string ili objekat
      const techId = order.technicianId?._id || order.technicianId;
      if (techId && techWorkOrders[techId]) {
        techWorkOrders[techId].workOrders.push(order);
      }
    });
    
    return techWorkOrders;
  };
  
  const technicianWorkOrders = groupWorkOrdersByTechnician();
  
  // Filtriranje po statusu i pretrazi
  const filterOrders = (orders) => {
    return orders.filter(order => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesSearch = !searchTerm || 
        order.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tisId?.toString().includes(searchTerm) ||
        order.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.userName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  };
  
  // Filtrirani podaci sa paginacijom
  const filteredUnassigned = useMemo(() => filterOrders(unassignedOrders), [unassignedOrders, statusFilter, searchTerm]);
  const filteredVerification = useMemo(() => filterOrders(verificationOrders), [verificationOrders, statusFilter, searchTerm]);
  
  // Paginacija za nedodeljene naloge
  const indexOfLastUnassigned = currentPageUnassigned * itemsPerPage;
  const indexOfFirstUnassigned = indexOfLastUnassigned - itemsPerPage;
  const currentUnassignedItems = filteredUnassigned.slice(indexOfFirstUnassigned, indexOfLastUnassigned);
  const totalPagesUnassigned = Math.ceil(filteredUnassigned.length / itemsPerPage);
  
  // Paginacija za verifikaciju
  const indexOfLastVerification = currentPageVerification * itemsPerPage;
  const indexOfFirstVerification = indexOfLastVerification - itemsPerPage;
  const currentVerificationItems = filteredVerification.slice(indexOfFirstVerification, indexOfLastVerification);
  const totalPagesVerification = Math.ceil(filteredVerification.length / itemsPerPage);
  
  // Funkcije za paginaciju
  const paginateUnassigned = (pageNumber) => setCurrentPageUnassigned(pageNumber);
  const paginateVerification = (pageNumber) => setCurrentPageVerification(pageNumber);
  const paginateTechnician = (techId, pageNumber) => {
    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: pageNumber
    }));
  };
  
  // Sortiranje po datumu
  const sortByDate = (orders) => {
    return [...orders].sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'zavrsen': return 'Završen';
      case 'nezavrsen': return 'Nezavršen';
      case 'odlozen': return 'Odložen';
      case 'otkazan': return 'Otkazan';
      default: return status;
    }
  };
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'zavrsen': return 'status-completed';
      case 'nezavrsen': return 'status-pending';
      case 'odlozen': return 'status-postponed';
      case 'otkazan': return 'status-canceled';
      default: return '';
    }
  };
  
  // Komponenta za paginaciju
  const PaginationComponent = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="pagination-container">
        <div className="pagination">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            &laquo;
          </button>
          
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &lsaquo;
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(number => {
              return (
                number === 1 ||
                number === totalPages ||
                Math.abs(number - currentPage) <= 1
              );
            })
            .map(number => (
              <button
                key={number}
                onClick={() => onPageChange(number)}
                className={currentPage === number ? 'active' : ''}
              >
                {number}
              </button>
            ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &rsaquo;
          </button>
          
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            &raquo;
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="work-orders-by-technician fade-in">
      <div className="page-header">
        <h1 className="page-title">Radni nalozi po tehničarima</h1>
        <div className="header-actions">
          <Link to="/work-orders/add" className="btn btn-primary">
            Novi nalog
          </Link>
          <Link to="/work-orders/upload" className="btn btn-success">
            Import
          </Link>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => setActiveTab('technicians')}
          >
            <UserIcon /> Tehničari
            <span className="tab-badge">{Object.keys(technicianWorkOrders).length}</span>
          </button>
          <button 
            className={`tab ${activeTab === 'unassigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('unassigned')}
          >
            <UserSlashIcon /> Nedodeljeni
            <span className="tab-badge">{unassignedOrders.length}</span>
          </button>
          <button 
            className={`tab ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            <CheckIcon /> Za verifikaciju
            <span className="tab-badge">{verificationOrders.length}</span>
          </button>
        </div>
        
        <div className="filter-container">
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Pretraga po adresi, tipu, korisniku..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Reset pagination when search changes
                setCurrentPageUnassigned(1);
                setCurrentPageVerification(1);
                setTechnicianCurrentPages({});
              }}
            />
          </div>
          
          <div className="filter-box">
            <FilterIcon className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                // Reset pagination when filter changes
                setCurrentPageUnassigned(1);
                setCurrentPageVerification(1);
                setTechnicianCurrentPages({});
              }}
            >
              <option value="">Svi statusi</option>
              <option value="zavrsen">Završeni</option>
              <option value="nezavrsen">Nezavršeni</option>
              <option value="odlozen">Odloženi</option>
              <option value="otkazan">Otkazani</option>
            </select>
          </div>
          
          <button className="btn btn-sm refresh-btn" onClick={fetchData} disabled={loading}>
            <RefreshIcon className={loading ? 'spin' : ''} />
            Osveži
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Učitavanje podataka...</p>
        </div>
      ) : (
        <div className="tab-content">
          {/* Tab za tehničare */}
          {activeTab === 'technicians' && (
            <div className="technicians-tab">
              {Object.keys(technicianWorkOrders).length === 0 ? (
                <div className="empty-message">
                  <UserIcon className="empty-icon" />
                  <p>Nema tehničara u sistemu</p>
                </div>
              ) : (
                <div className="technician-cards">
                  {Object.entries(technicianWorkOrders).map(([techId, techData]) => {
                    // Filtriranje radnih naloga za tehničara
                    const filteredTechOrders = filterOrders(techData.workOrders);
                    
                    // Paginacija za ovog tehničara
                    const currentPageTech = technicianCurrentPages[techId] || 1;
                    const indexOfLastTech = currentPageTech * itemsPerPage;
                    const indexOfFirstTech = indexOfLastTech - itemsPerPage;
                    const currentTechItems = filteredTechOrders.slice(indexOfFirstTech, indexOfLastTech);
                    const totalPagesTech = Math.ceil(filteredTechOrders.length / itemsPerPage);
                    
                    return (
                      <div 
                        key={techId} 
                        className={`technician-card ${selectedTechnicianId === techId ? 'expanded' : ''}`}
                        onClick={() => setSelectedTechnicianId(prevId => prevId === techId ? '' : techId)}
                      >
                        <div className="technician-card-header">
                          <div className="technician-info">
                            <div className="technician-avatar">
                              <UserIcon />
                            </div>
                            <div className="technician-details">
                              <h3>{techData.technicianInfo.name}</h3>
                              <p>{techData.technicianInfo.phone}</p>
                            </div>
                          </div>
                          <div className="technician-stats">
                            <div className="stat">
                              <span className="stat-value">{techData.workOrders.length}</span>
                              <span className="stat-label">Ukupno</span>
                            </div>
                            <div className="stat">
                              <span className="stat-value pending">
                                {techData.workOrders.filter(o => o.status === 'nezavrsen').length}
                              </span>
                              <span className="stat-label">Nezavršeni</span>
                            </div>
                            <div className="stat">
                              <span className="stat-value completed">
                                {techData.workOrders.filter(o => o.status === 'zavrsen').length}
                              </span>
                              <span className="stat-label">Završeni</span>
                            </div>
                          </div>
                        </div>
                        
                        {selectedTechnicianId === techId && (
                          <div className="technician-workorders">
                            {filteredTechOrders.length === 0 ? (
                              <div className="no-results">
                                <p>Nema radnih naloga koji odgovaraju pretrazi</p>
                              </div>
                            ) : (
                              <>
                                <table className="workorders-table">
                                  <thead>
                                    <tr>
                                      <th>Datum</th>
                                      <th>Opština</th>
                                      <th>Adresa</th>
                                      <th>Korisnik</th>
                                      <th>Tip</th>
                                      <th>Status</th>
                                      <th>Akcije</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortByDate(currentTechItems).map((order) => (
                                      <tr key={order._id}>
                                        <td>{formatDate(order.date)}</td>
                                        <td>{order.municipality}</td>
                                        <td>{order.address}</td>
                                        <td>{order.userName || 'Nepoznat'}</td>
                                        <td>{order.type}</td>
                                        <td>
                                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                          </span>
                                          {order.status === 'zavrsen' && order.verified && (
                                            <span className="verified-badge" title="Verifikovano">
                                              <CheckIcon />
                                            </span>
                                          )}
                                        </td>
                                        <td className="actions-column">
                                          <Link 
                                            to={`/work-orders/${order._id}`} 
                                            className="btn btn-sm action-btn view-btn"
                                          >
                                            <ViewIcon /> Detalji
                                          </Link>
                                          <button 
                                            className="btn btn-sm action-btn delete-btn"
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              handleDelete(order._id); 
                                            }}
                                          >
                                            <DeleteIcon />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                
                                <PaginationComponent 
                                  currentPage={currentPageTech}
                                  totalPages={totalPagesTech}
                                  onPageChange={(page) => paginateTechnician(techId, page)}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Tab za nedodeljene naloge */}
          {activeTab === 'unassigned' && (
            <div className="unassigned-tab">
              <div className="card">
                <div className="card-header">
                  <h2>
                    <UserSlashIcon /> Nedodeljeni radni nalozi 
                    <span className="count-badge">{filteredUnassigned.length}</span>
                  </h2>
                </div>
                
                <div className="card-body">
                  {filteredUnassigned.length === 0 ? (
                    <div className="empty-message">
                      <p>Nema nedodeljenih radnih naloga</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="workorders-table">
                        <thead>
                          <tr>
                            <th>Datum</th>
                            <th>Opština</th>
                            <th>Adresa</th>
                            <th>Korisnik</th>
                            <th>Tip</th>
                            <th>Status</th>
                            <th>Akcije</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortByDate(currentUnassignedItems).map((order) => (
                            <tr key={order._id}>
                              <td>{formatDate(order.date)}</td>
                              <td>{order.municipality}</td>
                              <td>{order.address}</td>
                              <td>{order.userName || 'Nepoznat'}</td>
                              <td>{order.type}</td>
                              <td>
                                <span className={`status-badge ${getStatusClass(order.status)}`}>
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td className="actions-column">
                                <Link 
                                  to={`/work-orders/${order._id}`} 
                                  className="btn btn-sm action-btn view-btn"
                                >
                                  <ViewIcon /> Detalji
                                </Link>
                                <button 
                                  className="btn btn-sm action-btn delete-btn"
                                  onClick={() => handleDelete(order._id)}
                                >
                                  <DeleteIcon />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <PaginationComponent 
                        currentPage={currentPageUnassigned}
                        totalPages={totalPagesUnassigned}
                        onPageChange={paginateUnassigned}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Tab za verifikaciju radnih naloga */}
          {activeTab === 'verification' && (
            <div className="verification-tab">
              <div className="card">
                <div className="card-header">
                  <h2>
                    <AlertIcon /> Radni nalozi za verifikaciju 
                    <span className="count-badge">{filteredVerification.length}</span>
                  </h2>
                </div>
                
                <div className="card-body">
                  {filteredVerification.length === 0 ? (
                    <div className="empty-message">
                      <p>Nema radnih naloga za verifikaciju</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="workorders-table">
                        <thead>
                          <tr>
                            <th>Datum</th>
                            <th>Opština</th>
                            <th>Adresa</th>
                            <th>Korisnik</th>
                            <th>Tip</th>
                            <th>Tehničar</th>
                            <th>Akcije</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortByDate(currentVerificationItems).map((order) => {
                            const technician = technicians.find(tech => tech._id === order.technicianId);
                            return (
                              <tr key={order._id}>
                                <td>{formatDate(order.date)}</td>
                                <td>{order.municipality}</td>
                                <td>{order.address}</td>
                                <td>{order.userName || 'Nepoznat'}</td>
                                <td>{order.type}</td>
                                <td>{technician ? technician.name : 'Nepoznat'}</td>
                                <td className="actions-column">
                                  <Link 
                                    to={`/work-orders/${order._id}`} 
                                    className="btn btn-sm action-btn view-btn"
                                  >
                                    <ViewIcon /> Detalji
                                  </Link>
                                  <button 
                                    className="btn btn-sm action-btn verify-btn"
                                    onClick={() => handleVerifyOrder(order._id)}
                                  >
                                    <CheckIcon /> Verifikuj
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      <PaginationComponent 
                        currentPage={currentPageVerification}
                        totalPages={totalPagesVerification}
                        onPageChange={paginateVerification}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkOrdersByTechnician;