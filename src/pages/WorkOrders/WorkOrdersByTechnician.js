// Enhanced WorkOrdersByTechnician.js with All Work Orders tab and advanced filtering
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, DeleteIcon, UserIcon, UserSlashIcon, ToolsIcon, CheckIcon, AlertIcon, RefreshIcon, ClipboardIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import axios from 'axios';
import './WorkOrdersByTechnician.css';

const WorkOrdersByTechnician = () => {
  const [technicians, setTechnicians] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [verificationOrders, setVerificationOrders] = useState([]);
  const [allWorkOrders, setAllWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [activeTab, setActiveTab] = useState('technicians');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const navigate = useNavigate();
  
  // Paginacija
  const [currentPageUnassigned, setCurrentPageUnassigned] = useState(1);
  const [currentPageVerification, setCurrentPageVerification] = useState(1);
  const [currentPageAllOrders, setCurrentPageAllOrders] = useState(1);
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
      
      const workOrdersData = workOrdersResponse.data;
      
      setTechnicians(techniciansResponse.data);
      setWorkOrders(workOrdersData);
      setUnassignedOrders(unassignedResponse.data);
      setVerificationOrders(verificationResponse.data);
      setAllWorkOrders(workOrdersData);
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
      await axios.put(`${apiUrl}/api/workorders/${orderId}/verify`, {});
      toast.success('Radni nalog je uspešno verifikovan!');
      
      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));
      
      const updatedWorkOrders = [...workOrders];
      const updatedIndex = updatedWorkOrders.findIndex(order => order._id === orderId);
      
      if (updatedIndex !== -1) {
        updatedWorkOrders[updatedIndex] = {
          ...updatedWorkOrders[updatedIndex],
          verified: true,
          verifiedAt: new Date().toISOString()
        };
        
        setWorkOrders(updatedWorkOrders);
        setAllWorkOrders(updatedWorkOrders);
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
        
        setWorkOrders(prev => prev.filter(order => order._id !== id));
        setUnassignedOrders(prev => prev.filter(order => order._id !== id));
        setVerificationOrders(prev => prev.filter(order => order._id !== id));
        setAllWorkOrders(prev => prev.filter(order => order._id !== id));
        
      } catch (error) {
        console.error('Greška pri brisanju:', error);
        toast.error('Neuspešno brisanje radnog naloga!');
      }
    }
  };
  
  const groupWorkOrdersByTechnician = () => {
    const techWorkOrders = {};
    
    technicians.forEach(tech => {
      techWorkOrders[tech._id] = {
        technicianInfo: tech,
        workOrders: []
      };
    });
    
    workOrders.forEach(order => {
      const techId = order.technicianId?._id || order.technicianId;
      const tech2Id = order.technician2Id?._id || order.technician2Id;
      if (techId && techWorkOrders[techId]) {
        techWorkOrders[techId].workOrders.push(order);
      }
      if (tech2Id && techWorkOrders[tech2Id]) {
        techWorkOrders[tech2Id].workOrders.push(order);
      }
    });
    
    return techWorkOrders;
  };
  
  const technicianWorkOrders = groupWorkOrdersByTechnician();
  
  // Enhanced filtering function with deep search
  const filterOrders = (orders) => {
    return orders.filter(order => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesTechnician = !technicianFilter || 
        order.technicianId?._id === technicianFilter || 
        order.technicianId === technicianFilter ||
        order.technician2Id?._id === technicianFilter || 
        order.technician2Id === technicianFilter;
      
      let matchesSearch = true;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        matchesSearch = 
          order.municipality?.toLowerCase().includes(searchLower) ||
          order.address?.toLowerCase().includes(searchLower) ||
          order.tisId?.toString().includes(searchTerm) ||
          order.type?.toLowerCase().includes(searchLower) ||
          order.userName?.toLowerCase().includes(searchLower) ||
          order.description?.toLowerCase().includes(searchLower) ||
          order.notes?.toLowerCase().includes(searchLower) ||
          // Search by technician name
          order.technicianId?.name?.toLowerCase().includes(searchLower) ||
          order.technician2Id?.name?.toLowerCase().includes(searchLower) ||
          // Search by equipment serial numbers (last 4 digits or full)
          order.equipment?.some(eq => 
            eq.serialNumber?.toLowerCase().includes(searchLower) ||
            eq.serialNumber?.slice(-4).includes(searchTerm)
          ) ||
          // Search by material names
          order.materials?.some(mat => 
            mat.name?.toLowerCase().includes(searchLower)
          );
      }
      
      return matchesStatus && matchesTechnician && matchesSearch;
    });
  };
  
  // Filtrirani podaci sa paginacijom
  const filteredUnassigned = useMemo(() => filterOrders(unassignedOrders), [unassignedOrders, statusFilter, technicianFilter, searchTerm]);
  const filteredVerification = useMemo(() => filterOrders(verificationOrders), [verificationOrders, statusFilter, technicianFilter, searchTerm]);
  const filteredAllOrders = useMemo(() => filterOrders(allWorkOrders), [allWorkOrders, statusFilter, technicianFilter, searchTerm]);
  
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
  
  // Paginacija za sve radne naloge
  const indexOfLastAllOrders = currentPageAllOrders * itemsPerPage;
  const indexOfFirstAllOrders = indexOfLastAllOrders - itemsPerPage;
  const currentAllOrdersItems = filteredAllOrders.slice(indexOfFirstAllOrders, indexOfLastAllOrders);
  const totalPagesAllOrders = Math.ceil(filteredAllOrders.length / itemsPerPage);
  
  // Funkcije za paginaciju
  const paginateUnassigned = (pageNumber) => setCurrentPageUnassigned(pageNumber);
  const paginateVerification = (pageNumber) => setCurrentPageVerification(pageNumber);
  const paginateAllOrders = (pageNumber) => setCurrentPageAllOrders(pageNumber);
  const paginateTechnician = (techId, pageNumber, event) => {
    if (event) {
      event.stopPropagation();
    }
    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: pageNumber
    }));
  };
  
  // Sortiranje po datumu (najnoviji na vrhu)
  const sortByDate = (orders) => {
    return [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
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
  
  const getTechnicianName = (order) => {
    if (order.technicianId?.name) return order.technicianId.name;
    if (order.technicianId) {
      const tech = technicians.find(t => t._id === order.technicianId);
      return tech?.name || 'Nepoznat';
    }
    return 'Nedodeljen';
  };
  
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTechnicianFilter('');
    setCurrentPageUnassigned(1);
    setCurrentPageVerification(1);
    setCurrentPageAllOrders(1);
    setTechnicianCurrentPages({});
  };
  
  // Komponenta za paginaciju
  const PaginationComponent = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="workorders-pagination-container">
        <div className="workorders-pagination">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(1, e);
            }}
            disabled={currentPage === 1}
            className="workorders-pagination-btn"
          >
            &laquo;
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(currentPage - 1, e);
            }}
            disabled={currentPage === 1}
            className="workorders-pagination-btn"
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
                onClick={(e) => {
                  e.stopPropagation();
                  onPageChange(number, e);
                }}
                className={`workorders-pagination-btn ${currentPage === number ? 'active' : ''}`}
              >
                {number}
              </button>
            ))}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(currentPage + 1, e);
            }}
            disabled={currentPage === totalPages}
            className="workorders-pagination-btn"
          >
            &rsaquo;
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(totalPages, e);
            }}
            disabled={currentPage === totalPages}
            className="workorders-pagination-btn"
          >
            &raquo;
          </button>
        </div>
      </div>
    );
  };

  // Funkcija za navigaciju na detalje radnog naloga
  const navigateToOrderDetails = (orderId, event) => {
    if (event.target.closest('.workorders-delete-btn') || event.target.closest('.workorders-verify-btn')) {
      return;
    }
    
    navigate(`/work-orders/${orderId}`);
  };
  
  return (
    <div className="workorders-by-technician-container">
      <div className="workorders-page-header">
        <h1 className="workorders-page-title">
          <ToolsIcon className="workorders-title-icon" />
          Radni nalozi po tehničarima
        </h1>
        <div className="workorders-header-actions">
          <Link to="/work-orders/add" className="workorders-btn workorders-btn-primary">
            <ClipboardIcon size={16} />
            Novi nalog
          </Link>
          <Link to="/work-orders/upload" className="workorders-btn workorders-btn-success">
            Import
          </Link>
        </div>
      </div>
      
      {error && <div className="workorders-alert workorders-alert-danger">{error}</div>}
      
      <div className="workorders-tabs-container">
        <div className="workorders-tabs">
          <button 
            className={`workorders-tab ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => setActiveTab('technicians')}
          >
            <UserIcon size={16} /> Tehničari
            <span className="workorders-tab-badge">{Object.keys(technicianWorkOrders).length}</span>
          </button>
          <button 
            className={`workorders-tab ${activeTab === 'unassigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('unassigned')}
          >
            <UserSlashIcon size={16} /> Nedodeljeni
            <span className="workorders-tab-badge">{unassignedOrders.length}</span>
          </button>
          <button 
            className={`workorders-tab ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            <CheckIcon size={16} /> Za verifikaciju
            <span className="workorders-tab-badge">{verificationOrders.length}</span>
          </button>
          <button 
            className={`workorders-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <ClipboardIcon size={16} /> Svi radni nalozi
            <span className="workorders-tab-badge">{allWorkOrders.length}</span>
          </button>
        </div>
        
        <div className="workorders-filter-container">
          <div className="workorders-search-box">
            <SearchIcon size={16} className="workorders-search-icon" />
            <input
              type="text"
              placeholder="Pretraga po adresi, korisniku, serijskom broju, tehničaru..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPageUnassigned(1);
                setCurrentPageVerification(1);
                setCurrentPageAllOrders(1);
                setTechnicianCurrentPages({});
              }}
              className="workorders-search-input"
            />
          </div>
          
          <div className="workorders-filter-group">
            <div className="workorders-filter-box">
              <FilterIcon size={16} className="workorders-filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPageUnassigned(1);
                  setCurrentPageVerification(1);
                  setCurrentPageAllOrders(1);
                  setTechnicianCurrentPages({});
                }}
                className="workorders-filter-select"
              >
                <option value="">Svi statusi</option>
                <option value="zavrsen">Završeni</option>
                <option value="nezavrsen">Nezavršeni</option>
                <option value="odlozen">Odloženi</option>
                <option value="otkazan">Otkazani</option>
              </select>
            </div>
            
            {(activeTab === 'all' || activeTab === 'verification') && (
              <div className="workorders-filter-box">
                <UserIcon size={16} className="workorders-filter-icon" />
                <select
                  value={technicianFilter}
                  onChange={(e) => {
                    setTechnicianFilter(e.target.value);
                    setCurrentPageUnassigned(1);
                    setCurrentPageVerification(1);
                    setCurrentPageAllOrders(1);
                    setTechnicianCurrentPages({});
                  }}
                  className="workorders-filter-select"
                >
                  <option value="">Svi tehničari</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech._id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="workorders-action-buttons">
            <button 
              className="workorders-btn workorders-btn-secondary workorders-reset-btn" 
              onClick={resetFilters}
            >
              <RefreshIcon size={16} />
              Resetuj
            </button>
            <button 
              className="workorders-btn workorders-btn-secondary workorders-refresh-btn" 
              onClick={fetchData} 
              disabled={loading}
            >
              <RefreshIcon size={16} className={loading ? 'workorders-spin' : ''} />
              Osveži
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="workorders-loading-container">
          <div className="workorders-loading-spinner"></div>
          <p>Učitavanje podataka...</p>
        </div>
      ) : (
        <div className="workorders-tab-content">
          {/* Tab za tehničare */}
          {activeTab === 'technicians' && (
            <div className="workorders-technicians-tab">
              {Object.keys(technicianWorkOrders).length === 0 ? (
                <div className="workorders-empty-message">
                  <UserIcon size={48} className="workorders-empty-icon" />
                  <p>Nema tehničara u sistemu</p>
                </div>
              ) : (
                <div className="workorders-technician-cards">
                  {Object.entries(technicianWorkOrders).map(([techId, techData]) => {
                    const filteredTechOrders = filterOrders(techData.workOrders);
                    
                    const currentPageTech = technicianCurrentPages[techId] || 1;
                    const indexOfLastTech = currentPageTech * itemsPerPage;
                    const indexOfFirstTech = indexOfLastTech - itemsPerPage;
                    const currentTechItems = filteredTechOrders.slice(indexOfFirstTech, indexOfLastTech);
                    const totalPagesTech = Math.ceil(filteredTechOrders.length / itemsPerPage);
                    
                    return (
                      <div 
                        key={techId} 
                        className={`workorders-technician-card ${selectedTechnicianId === techId ? 'expanded' : ''}`}
                        onClick={() => setSelectedTechnicianId(prevId => prevId === techId ? '' : techId)}
                      >
                        <div className="workorders-technician-card-header">
                          <div className="workorders-technician-info">
                            <div className="workorders-technician-avatar">
                              <UserIcon size={20} />
                            </div>
                            <div className="workorders-technician-details">
                              <h3>{techData.technicianInfo.name}</h3>
                              <p>{techData.technicianInfo.phone}</p>
                            </div>
                          </div>
                          <div className="workorders-technician-stats">
                            <div className="workorders-stat">
                              <span className="workorders-stat-value">{techData.workOrders.length}</span>
                              <span className="workorders-stat-label">Ukupno</span>
                            </div>
                            <div className="workorders-stat">
                              <span className="workorders-stat-value workorders-pending">
                                {techData.workOrders.filter(o => o.status === 'nezavrsen').length}
                              </span>
                              <span className="workorders-stat-label">Nezavršeni</span>
                            </div>
                            <div className="workorders-stat">
                              <span className="workorders-stat-value workorders-completed">
                                {techData.workOrders.filter(o => o.status === 'zavrsen').length}
                              </span>
                              <span className="workorders-stat-label">Završeni</span>
                            </div>
                            <div className="workorders-stat">
                              <span className="workorders-stat-value workorders-postponed">
                                {techData.workOrders.filter(o => o.status === 'odlozen').length}
                              </span>
                              <span className="workorders-stat-label">Odloženi</span>
                            </div>
                            <div className="workorders-stat">
                              <span className="workorders-stat-value workorders-canceled">
                                {techData.workOrders.filter(o => o.status === 'otkazan').length}
                              </span>
                              <span className="workorders-stat-label">Otkazani</span>
                            </div>
                          </div>
                        </div>
                        
                        {selectedTechnicianId === techId && (
                          <div className="workorders-technician-workorders">
                            {filteredTechOrders.length === 0 ? (
                              <div className="workorders-no-results">
                                <p>Nema radnih naloga koji odgovaraju pretrazi</p>
                              </div>
                            ) : (
                              <>
                                <div className="workorders-admin-table-container">
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
                                        <tr 
                                          key={order._id} 
                                          onClick={(e) => navigateToOrderDetails(order._id, e)}
                                          className="workorders-clickable-row"
                                        >
                                          <td data-label="Datum">{formatDate(order.date)}</td>
                                          <td data-label="Opština">{order.municipality}</td>
                                          <td data-label="Adresa">{order.address}</td>
                                          <td data-label="Korisnik">{order.userName || 'Nepoznat'}</td>
                                          <td data-label="Tip">{order.type}</td>
                                          <td data-label="Status">
                                            <span className={`workorders-status-badge ${getStatusClass(order.status)}`}>
                                              {getStatusLabel(order.status)}
                                            </span>
                                            {order.status === 'zavrsen' && order.verified && (
                                              <span className="workorders-verified-badge" title="Verifikovano">
                                                <CheckIcon size={14} />
                                              </span>
                                            )}
                                          </td>
                                          <td className="workorders-actions-column" data-label="Akcije">
                                            <Link 
                                              to={`/work-orders/${order._id}`} 
                                              className="workorders-btn workorders-btn-sm workorders-action-btn workorders-view-btn"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <ViewIcon size={14} /> Detalji
                                            </Link>
                                            <button 
                                              className="workorders-btn workorders-btn-sm workorders-action-btn workorders-delete-btn"
                                              onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleDelete(order._id); 
                                              }}
                                            >
                                              <DeleteIcon size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                
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
            <div className="workorders-unassigned-tab">
              <div className="workorders-card">
                <div className="workorders-card-header">
                  <h2>
                    <UserSlashIcon size={20} /> Nedodeljeni radni nalozi 
                    <span className="workorders-count-badge">{filteredUnassigned.length}</span>
                  </h2>
                </div>
                
                <div className="workorders-card-body">
                  {filteredUnassigned.length === 0 ? (
                    <div className="workorders-empty-message">
                      <p>Nema nedodeljenih radnih naloga</p>
                    </div>
                  ) : (
                    <>
                      <div className="workorders-table-responsive">
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
                              <tr 
                                key={order._id} 
                                onClick={(e) => navigateToOrderDetails(order._id, e)}
                                className="workorders-clickable-row"
                              >
                                <td data-label="Datum">{formatDate(order.date)}</td>
                                <td data-label="Opština">{order.municipality}</td>
                                <td data-label="Adresa">{order.address}</td>
                                <td data-label="Korisnik">{order.userName || 'Nepoznat'}</td>
                                <td data-label="Tip">{order.type}</td>
                                <td data-label="Status">
                                  <span className={`workorders-status-badge ${getStatusClass(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                  </span>
                                </td>
                                <td className="workorders-actions-column" data-label="Akcije">
                                  <Link 
                                    to={`/work-orders/${order._id}`} 
                                    className="workorders-btn workorders-btn-sm workorders-action-btn workorders-view-btn"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ViewIcon size={14} /> Detalji
                                  </Link>
                                  <button 
                                    className="workorders-btn workorders-btn-sm workorders-action-btn workorders-delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(order._id);
                                    }}
                                  >
                                    <DeleteIcon size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <PaginationComponent 
                        currentPage={currentPageUnassigned}
                        totalPages={totalPagesUnassigned}
                        onPageChange={paginateUnassigned}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Tab za verifikaciju radnih naloga */}
          {activeTab === 'verification' && (
            <div className="workorders-verification-tab">
              <div className="workorders-card">
                <div className="workorders-card-header">
                  <h2>
                    <AlertIcon size={20} /> Radni nalozi za verifikaciju 
                    <span className="workorders-count-badge">{filteredVerification.length}</span>
                  </h2>
                </div>
                
                <div className="workorders-card-body">
                  {filteredVerification.length === 0 ? (
                    <div className="workorders-empty-message">
                      <p>Nema radnih naloga za verifikaciju</p>
                    </div>
                  ) : (
                    <>
                      <div className="workorders-table-responsive">
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
                                <tr 
                                  key={order._id}
                                  onClick={(e) => navigateToOrderDetails(order._id, e)}
                                  className="workorders-clickable-row"
                                >
                                  <td data-label="Datum">{formatDate(order.date)}</td>
                                  <td data-label="Opština">{order.municipality}</td>
                                  <td data-label="Adresa">{order.address}</td>
                                  <td data-label="Korisnik">{order.userName || 'Nepoznat'}</td>
                                  <td data-label="Tip">{order.type}</td>
                                  <td data-label="Tehničar">{technician ? technician.name : 'Nepoznat'}</td>
                                  <td className="workorders-actions-column" data-label="Akcije">
                                    <Link 
                                      to={`/work-orders/${order._id}`} 
                                      className="workorders-btn workorders-btn-sm workorders-action-btn workorders-view-btn"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ViewIcon size={14} /> Detalji
                                    </Link>
                                    <button 
                                      className="workorders-btn workorders-btn-sm workorders-action-btn workorders-verify-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVerifyOrder(order._id);
                                      }}
                                    >
                                      <CheckIcon size={14} /> Verifikuj
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <PaginationComponent 
                        currentPage={currentPageVerification}
                        totalPages={totalPagesVerification}
                        onPageChange={paginateVerification}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Tab za sve radne naloge */}
          {activeTab === 'all' && (
            <div className="workorders-all-tab">
              <div className="workorders-card">
                <div className="workorders-card-header">
                  <h2>
                    <ClipboardIcon size={20} /> Svi radni nalozi 
                    <span className="workorders-count-badge">{filteredAllOrders.length}</span>
                  </h2>
                </div>
                
                <div className="workorders-card-body">
                  {filteredAllOrders.length === 0 ? (
                    <div className="workorders-empty-message">
                      <p>Nema radnih naloga koji odgovaraju filterima</p>
                    </div>
                  ) : (
                    <>
                      <div className="workorders-table-responsive">
                        <table className="workorders-table">
                          <thead>
                            <tr>
                              <th>Datum</th>
                              <th>Opština</th>
                              <th>Adresa</th>
                              <th>Korisnik</th>
                              <th>Tip</th>
                              <th>Tehničar</th>
                              <th>Status</th>
                              <th>Akcije</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortByDate(currentAllOrdersItems).map((order) => (
                              <tr 
                                key={order._id}
                                onClick={(e) => navigateToOrderDetails(order._id, e)}
                                className="workorders-clickable-row"
                              >
                                <td data-label="Datum">{formatDate(order.date)}</td>
                                <td data-label="Opština">{order.municipality}</td>
                                <td data-label="Adresa">{order.address}</td>
                                <td data-label="Korisnik">{order.userName || 'Nepoznat'}</td>
                                <td data-label="Tip">{order.type}</td>
                                <td data-label="Tehničar">{getTechnicianName(order)}</td>
                                <td data-label="Status">
                                  <span className={`workorders-status-badge ${getStatusClass(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                  </span>
                                  {order.status === 'zavrsen' && order.verified && (
                                    <span className="workorders-verified-badge" title="Verifikovano">
                                      <CheckIcon size={14} />
                                    </span>
                                  )}
                                </td>
                                <td className="workorders-actions-column" data-label="Akcije">
                                  <Link 
                                    to={`/work-orders/${order._id}`} 
                                    className="workorders-btn workorders-btn-sm workorders-action-btn workorders-view-btn"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ViewIcon size={14} /> Detalji
                                  </Link>
                                  <button 
                                    className="workorders-btn workorders-btn-sm workorders-action-btn workorders-delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(order._id);
                                    }}
                                  >
                                    <DeleteIcon size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <PaginationComponent 
                        currentPage={currentPageAllOrders}
                        totalPages={totalPagesAllOrders}
                        onPageChange={paginateAllOrders}
                      />
                    </>
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