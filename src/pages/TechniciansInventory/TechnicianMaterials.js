import React, { useState, useEffect, useContext, useRef } from 'react';
import { SearchIcon, FilterIcon, RefreshIcon, BoxIcon, ToolsIcon, BarChartIcon, CalendarIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './TechnicianMaterials.css';

const TechnicianMaterials = () => {
  const { user } = useContext(AuthContext);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [refreshing, setRefreshing] = useState(false);
  
  // Touch gestures
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 8 : 10;
  
  useEffect(() => {
    fetchMaterials();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?.id]);
  
  const fetchMaterials = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getMaterials(user.id);
      setMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje materijala!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile
  const handlePullToRefresh = () => {
    if (window.scrollY === 0) {
      setRefreshing(true);
      fetchMaterials().then(() => {
        setTimeout(() => setRefreshing(false), 800); // Visual feedback
      });
    }
  };
  
  // Touch gesture handlers
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
    
    // If user is at the top of the page and pulling down
    if (window.scrollY === 0 && touchEndY.current - touchStartY.current > 70) {
      handlePullToRefresh();
    }
  };
  
  useEffect(() => {
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isMobile]);
  
  // Filtriranje materijala
  const filteredMaterials = materials.filter(item => {
    const searchMatch = searchTerm === '' || 
                       item.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const typeMatch = typeFilter === '' || item.type === typeFilter;
    
    return searchMatch && typeMatch;
  });
  
  // Sortiranje po tipu
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    // Prvo sortiramo po tipu
    if (a.type < b.type) return -1;
    if (a.type > b.type) return 1;
    
    return 0;
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedMaterials.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Tipovi materijala za filter
  const types = [...new Set(materials.map(item => item.type))];
  
  // Statistike
  const stats = {
    total: materials.length,
    totalQuantity: materials.reduce((sum, item) => sum + item.quantity, 0),
    byType: types.reduce((acc, type) => {
      const typeItems = materials.filter(item => item.type === type);
      acc[type] = {
        count: typeItems.length,
        quantity: typeItems.reduce((sum, item) => sum + item.quantity, 0)
      };
      return acc;
    }, {})
  };
  
  return (
    <div className={`technician-materials fade-in ${refreshing ? 'refreshing' : ''}`}>
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
          <ToolsIcon />
          Moji materijali
        </h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary refresh-btn"
            onClick={fetchMaterials}
            disabled={loading}
            aria-label="Osvežite listu materijala"
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
            <p>Tipova materijala</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon quantity">
            <BoxIcon />
          </div>
          <div className="stat-content">
            <h3>{stats.totalQuantity}</h3>
            <p>Ukupno komada</p>
          </div>
        </div>
        
        {Object.entries(stats.byType).slice(0, 2).map(([type, data]) => (
          <div className="stat-card" key={type}>
            <div className="stat-icon type">
              <ToolsIcon />
            </div>
            <div className="stat-content">
              <h3>{data.quantity}</h3>
              <p>{type}</p>
            </div>
          </div>
        ))}
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
              <h4>Tip materijala</h4>
              <div className="type-filter-buttons">
                <button 
                  className={`type-filter-btn ${typeFilter === '' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('')}
                >
                  Svi
                </button>
                {types.map(type => (
                  <button 
                    key={type}
                    className={`type-filter-btn ${typeFilter === type ? 'active' : ''}`}
                    onClick={() => setTypeFilter(type)}
                  >
                    {type}
                  </button>
                ))}
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
          <h2>Lista materijala</h2>
          <div className="results-count">
            {filteredMaterials.length} od {materials.length} tipova
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
                  placeholder="Pretraga po tipu materijala..."
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">Svi tipovi</option>
                  {types.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Content - Table for Desktop, Cards for Mobile */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Učitavanje materijala...</p>
          </div>
        ) : (
          <>
            {isMobile ? (
              // Mobile Card View
              <div className="mobile-materials-list">
                {currentItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-message">
                      <ToolsIcon className="empty-icon" />
                      <p>
                        {searchTerm || typeFilter 
                          ? 'Nema rezultata za zadatu pretragu' 
                          : 'Nemate zadužene materijale'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  currentItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="mobile-material-card"
                    >
                      <div className="material-card-content">
                        <div className="material-card-header">
                          <span className="type-badge">
                            {item.type}
                          </span>
                          <div className="material-quantity">
                            <strong>{item.quantity}</strong> kom
                          </div>
                        </div>
                        
                        <div className="material-card-body">
                          <div className="material-type">
                            {item.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="table-container">
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>Tip materijala</th>
                      <th>Količina</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="empty-state">
                          <div className="empty-message">
                            <ToolsIcon className="empty-icon" />
                            <p>
                              {searchTerm || typeFilter 
                                ? 'Nema rezultata za zadatu pretragu' 
                                : 'Nemate zadužene materijale'
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item, index) => (
                        <tr key={item.id} className="slide-in" style={{animationDelay: `${index * 0.1}s`}}>
                          <td>
                            <span className="type-badge">
                              {item.type}
                            </span>
                          </td>
                          <td className="quantity-cell">
                            <span className="quantity-value">{item.quantity}</span> kom
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination - Mobile Optimized */}
            {sortedMaterials.length > itemsPerPage && (
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

export default TechnicianMaterials; 