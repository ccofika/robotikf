import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, RefreshIcon, ClipboardIcon, BarChartIcon, PhoneIcon, MapPinIcon, CalendarIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './TechnicianWorkOrders.css';

const TechnicianWorkOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [refreshing, setRefreshing] = useState(false);
  
  // Touch gestures
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const activeOrderRef = useRef(null);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 8 : 10;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Function to check if work order date/time hasn't passed yet
  const isWorkOrderNew = (order) => {
    if (order.status !== 'nezavrsen') return false;
    
    try {
      const now = new Date();
      
      // Handle different date formats
      let orderDate;
      if (order.date instanceof Date) {
        orderDate = order.date;
      } else if (typeof order.date === 'string') {
        // If it's already in YYYY-MM-DD format or ISO string
        orderDate = new Date(order.date);
      } else {
        console.warn('Invalid date format for order:', order);
        return false;
      }
      
      // Create datetime with time
      const orderTime = order.time || '09:00';
      const [hours, minutes] = orderTime.split(':');
      const orderDateTime = new Date(orderDate);
      orderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Debug logging (can be removed later)
      const isNew = orderDateTime > now;
      console.log('Checking order:', {
        id: order._id,
        status: order.status,
        date: order.date,
        time: order.time,
        orderDateTime: orderDateTime.toISOString(),
        orderDateTimeLocal: orderDateTime.toLocaleString('sr-RS'),
        now: now.toISOString(),
        nowLocal: now.toLocaleString('sr-RS'),
        isNew: isNew,
        timeDiffMinutes: Math.round((orderDateTime - now) / (1000 * 60))
      });
      
      return orderDateTime > now;
    } catch (error) {
      console.error('Error checking if order is new:', error, order);
      return false;
    }
  };

  // Function to get display status and CSS class
  const getDisplayStatus = (order) => {
    if (order.status === 'zavrsen') return { text: 'Završen', cssClass: 'zavrsen' };
    if (order.status === 'odlozen') return { text: 'Odložen', cssClass: 'odlozen' };
    if (order.status === 'otkazan') return { text: 'Otkazan', cssClass: 'otkazan' };
    
    // For 'nezavrsen' status, check if it's new (date/time hasn't passed)
    if (order.status === 'nezavrsen') {
      const isNew = isWorkOrderNew(order);
      
      // Debug logging
      console.log('Display status for order:', {
        id: order._id,
        status: order.status,
        isNew: isNew,
        willShow: isNew ? 'Nov' : 'Nezavršen'
      });
      
      if (isNew) {
        return { text: 'Nov', cssClass: 'nov' };
      } else {
        return { text: 'Nezavršen', cssClass: 'nezavrsen' };
      }
    }
    
    return { text: 'Nezavršen', cssClass: 'nezavrsen' };
  };
  
  useEffect(() => {
    fetchWorkOrders();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?._id]);
  
  const fetchWorkOrders = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${apiUrl}/api/workorders/technician/${user._id}`);
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje radnih naloga!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile
  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchWorkOrders();
    setTimeout(() => setRefreshing(false), 800); // Visual feedback
  };
  
  // Touch gesture handlers
  const handleTouchStart = (e, orderId) => {
    e.preventDefault();
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    activeOrderRef.current = orderId;
    
    console.log('Touch start - Order ID:', orderId); // Debug log
  };
  
  const handleTouchMove = (e) => {
    if (!activeOrderRef.current) return;
    
    touchEndX.current = e.touches[0].clientX;
    
    const orderCard = document.getElementById(`order-${activeOrderRef.current}`);
    if (!orderCard) return;
    
    const diff = touchEndX.current - touchStartX.current;
    
    // Only allow swiping left (negative diff)
    if (diff < 0 && diff > -100) {
      orderCard.style.transform = `translateX(${diff}px)`;
    }
  };
  
  const handleTouchEnd = () => {
    if (!activeOrderRef.current) {
      console.log('Touch end - No active order ID'); // Debug log
      return;
    }
    
    const orderId = activeOrderRef.current; // Store ID before resetting
    const orderCard = document.getElementById(`order-${orderId}`);
    
    console.log('Touch end - Order ID:', orderId); // Debug log
    
    if (!orderCard) {
      console.log('Touch end - Order card not found for ID:', orderId); // Debug log
      activeOrderRef.current = null;
      return;
    }
    
    const diff = touchEndX.current - touchStartX.current;
    
    if (diff < -80) {
      // Swiped far enough to trigger action
      orderCard.classList.add('swiped');
      setTimeout(() => {
        orderCard.classList.remove('swiped');
        orderCard.style.transform = 'translateX(0)';
        
        // Navigate to details using the stored ID
        console.log('Navigating to order:', orderId); // Debug log
        navigate(`/my-work-orders/${orderId}`);
      }, 300);
    } else {
      // Reset position with animation
      orderCard.style.transition = 'transform 0.3s ease';
      orderCard.style.transform = 'translateX(0)';
      setTimeout(() => {
        orderCard.style.transition = '';
      }, 300);
    }
    
    // Reset only after using the ID
    activeOrderRef.current = null;
  };
  
  // Filtriranje radnih naloga
  const filteredWorkOrders = workOrders.filter(order => {
    const searchMatch = searchTerm === '' || 
                       order.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (order.comment && order.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    // Ako nema filtera, ne prikazuj završene radne naloge
    const defaultHideCompleted = statusFilter === '' && searchTerm === '' ? order.status !== 'zavrsen' : true;
    
    return searchMatch && statusMatch && defaultHideCompleted;
  });
  
  // Sortiranje po datumu i vremenu
  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    // Prvo stavljamo nezavršene (uključujući "nove")
    const aIsIncomplete = a.status === 'nezavrsen';
    const bIsIncomplete = b.status === 'nezavrsen';
    
    if (aIsIncomplete && !bIsIncomplete) return -1;
    if (!aIsIncomplete && bIsIncomplete) return 1;
    
    // Zatim sortiramo po datumu i vremenu - najnoviji na vrhu
    const aDateTime = new Date(`${a.date}T${a.time || '09:00'}:00`);
    const bDateTime = new Date(`${b.date}T${b.time || '09:00'}:00`);
    
    return bDateTime - aDateTime;
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedWorkOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(sortedWorkOrders.length / itemsPerPage);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Statistike
  const stats = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter(o => o.status === 'zavrsen').length;
    const pending = workOrders.filter(o => o.status === 'nezavrsen').length;
    const postponed = workOrders.filter(o => o.status === 'odlozen').length;
    const canceled = workOrders.filter(o => o.status === 'otkazan').length;
    
    // Calculate "new" orders for testing
    const newOrders = workOrders.filter(o => o.status === 'nezavrsen' && isWorkOrderNew(o)).length;
    const actualPending = pending - newOrders;
    
    console.log('Stats calculation:', {
      total,
      pending,
      newOrders,
      actualPending,
      workOrdersWithNezavrsen: workOrders.filter(o => o.status === 'nezavrsen').map(o => ({
        id: o._id,
        date: o.date,
        time: o.time,
        isNew: isWorkOrderNew(o)
      }))
    });
    
    return {
      total,
      completed,
      pending: actualPending,
      newOrders, // Add this for debugging
      postponed,
      canceled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [workOrders]);

  // Format date for mobile display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
      return `Danas, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Juče, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise return full date
    return date.toLocaleDateString('sr-RS');
  };
  
  return (
    <div className={`technician-work-orders fade-in ${refreshing ? 'refreshing' : ''}`}>
      {/* Pull to refresh indicator for mobile */}
      {isMobile && (
        <div className="pull-refresh-indicator">
          <RefreshIcon className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Osvežavanje...' : 'Povucite dole za osvežavanje'}</span>
        </div>
      )}
      
      {/* Page Header - Mobile Optimized */}
      <div className="page-header">
        <h1 className="page-title">
          <ClipboardIcon />
          Moji radni nalozi
        </h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary refresh-btn"
            onClick={fetchWorkOrders}
            disabled={loading}
            aria-label="Osvežite listu radnih naloga"
          >
            <RefreshIcon className={loading ? 'spin' : ''} />
            {!isMobile && <span>Osveži</span>}
          </button>
          {isMobile && (
            <button 
              className={`btn btn-secondary filter-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Prikaži filtere"
            >
              <FilterIcon />
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="alert alert-danger">
          <strong>Greška:</strong> {error}
        </div>
      )}
      
      {/* Statistics Cards - Swipeable on Mobile */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <BarChartIcon />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Ukupno</p>
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
        
        <div className="stat-card">
          <div className="stat-icon canceled">
            <span>{stats.canceled}</span>
          </div>
          <div className="stat-content">
            <h3>{stats.canceled}</h3>
            <p>Otkazano</p>
          </div>
        </div>
        
        {/* DEBUG: Temporary card to show "new" orders count */}
        <div className="stat-card" style={{}}>
          <div className="stat-icon" style={{backgroundColor: '#8e44ad', color: 'white'}}>
            <span>{stats.newOrders || 0}</span>
          </div>
          <div className="stat-content">
            <h3>{stats.newOrders || 0}</h3>
            <p>Novi</p>
          </div>
        </div>
      </div>
      
      {/* Main Content Card - Mobile Optimized */}
      <div className="card main-card">
        {/* Mobile Filter Panel - Toggleable */}
        {isMobile && (
          <div className={`mobile-filters ${showFilters ? 'show' : ''}`}>
            <div className="filter-header">
              <h3>Filteri</h3>
              <button 
                className="close-filters-btn" 
                onClick={() => setShowFilters(false)}
                aria-label="Zatvori filtere"
              >
                &times;
              </button>
            </div>
            <div className="mobile-search-box">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Pretraga..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search-btn" 
                  onClick={() => setSearchTerm('')}
                  aria-label="Obriši pretragu"
                >
                  &times;
                </button>
              )}
            </div>
            
            <div className="mobile-filter-options">
              <h4>Status naloga</h4>
              <div className="status-filter-buttons">
                <button 
                  className={`status-filter-btn ${statusFilter === '' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('')}
                >
                  Svi
                </button>
                <button 
                  className={`status-filter-btn ${statusFilter === 'nezavrsen' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('nezavrsen')}
                >
                  Nezavršeni
                </button>
                <button 
                  className={`status-filter-btn ${statusFilter === 'zavrsen' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('zavrsen')}
                >
                  Završeni
                </button>
                <button 
                  className={`status-filter-btn ${statusFilter === 'odlozen' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('odlozen')}
                >
                  Odloženi
                </button>
              </div>
              
              <div className="filter-actions">
                <button 
                  className="btn btn-primary apply-filters-btn"
                  onClick={() => setShowFilters(false)}
                >
                  Primeni filtere
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="card-header">
          <h2>Radni nalozi</h2>
          <div className="results-count">
            {filteredWorkOrders.length} od {workOrders.length} naloga
          </div>
        </div>
        
        {/* Desktop Table Controls */}
        {!isMobile && (
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
                {searchTerm && (
                  <button 
                    className="clear-search-btn" 
                    onClick={() => setSearchTerm('')}
                    aria-label="Obriši pretragu"
                  >
                    &times;
                  </button>
                )}
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
                  <option value="otkazan">Otkazani</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Content - Table for Desktop, Cards for Mobile */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Učitavanje radnih naloga...</p>
          </div>
        ) : (
          <>
            {isMobile ? (
              // Mobile Card View
              <div className="mobile-orders-list">
                {currentItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-message">
                      <ClipboardIcon className="empty-icon" />
                      <p>
                        {searchTerm || statusFilter 
                          ? 'Nema rezultata za zadatu pretragu' 
                          : 'Nemate dodeljenih radnih naloga'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  currentItems.map((order, index) => {
                    const displayStatus = getDisplayStatus(order);
                    return (
                    <div 
                      key={order._id} 
                      id={`order-${order._id}`}
                      className={`mobile-order-card status-${displayStatus.cssClass}`}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        handleTouchStart(e, order._id);
                      }}
                      onTouchMove={(e) => {
                        e.stopPropagation();
                        handleTouchMove(e);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        handleTouchEnd(e);
                      }}
                    >
                      <div className="order-card-content">
                        <div className="order-card-header">
                          <span className={`status-badge status-${displayStatus.cssClass}`}>
                            {displayStatus.text}
                          </span>
                          <div className="order-date">
                            <CalendarIcon />
                            <span>{formatDate(order.date)}</span>
                          </div>
                        </div>
                        
                        <div className="order-card-body">
                          <div className="order-location">
                            <MapPinIcon />
                            <div>
                              <div className="order-municipality">{order.municipality}</div>
                              <div className="order-address">{order.address}</div>
                            </div>
                          </div>
                          
                          <div className="order-type">
                            <strong>Tip:</strong> {order.type}
                          </div>
                          
                          {order.userPhone && (
                            <a href={`tel:${order.userPhone}`} className="order-phone">
                              <PhoneIcon />
                              <span>{order.userPhone}</span>
                            </a>
                          )}
                        </div>
                        
                        <div className="order-card-footer">
                          <Link 
                            to={`/my-work-orders/${order._id}`} 
                            className="btn btn-sm action-btn view-btn"
                          >
                            <ViewIcon /> Detalji
                          </Link>
                          <div className="swipe-hint">
                            <span>Prevucite levo za detalje</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="table-container">
                <table className="work-orders-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Vreme</th>
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
                        <td colSpan="7" className="empty-state">
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
                      currentItems.map((order, index) => {
                        const displayStatus = getDisplayStatus(order);
                        return (
                        <tr key={order._id} className={`slide-in status-row-${displayStatus.cssClass}`} style={{animationDelay: `${index * 0.1}s`}}>
                          <td>{new Date(order.date).toLocaleDateString('sr-RS')}</td>
                          <td>{order.time || '09:00'}</td>
                          <td>{order.municipality}</td>
                          <td>{order.address}</td>
                          <td>{order.type}</td>
                          <td>
                            <span className={`status-badge status-${displayStatus.cssClass}`}>
                              {displayStatus.text}
                            </span>
                          </td>
                          <td className="actions-column">
                            <Link 
                              to={`/my-work-orders/${order._id}`} 
                              className="btn btn-sm action-btn view-btn"
                            >
                              <ViewIcon /> Detalji
                            </Link>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination - Mobile Optimized */}
            {sortedWorkOrders.length > itemsPerPage && (
              <div className="pagination-container">
                {isMobile ? (
                  // Mobile Pagination
                  <div className="mobile-pagination">
                    <button 
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-btn prev-btn"
                      aria-label="Prethodna stranica"
                    >
                      &lsaquo;
                    </button>
                    
                    <div className="pagination-info">
                      Stranica {currentPage} od {totalPages}
                    </div>
                    
                    <button 
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="pagination-btn next-btn"
                      aria-label="Sledeća stranica"
                    >
                      &rsaquo;
                    </button>
                  </div>
                ) : (
                  // Desktop Pagination
                  <>
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
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TechnicianWorkOrders;