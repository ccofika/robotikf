import React, { useState, useEffect, useContext, useRef } from 'react';
import { SearchIcon, FilterIcon, RefreshIcon, BoxIcon, ToolsIcon, BarChartIcon, CalendarIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './TechnicianEquipment.css';

const TechnicianEquipment = () => {
  const { user } = useContext(AuthContext);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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
    fetchEquipment();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?.id]);
  
  const fetchEquipment = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getEquipment(user.id);
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje opreme!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile
  const handlePullToRefresh = () => {
    if (window.scrollY === 0) {
      setRefreshing(true);
      fetchEquipment().then(() => {
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
  
  // Filtriranje opreme
  const filteredEquipment = equipment.filter(item => {
    const searchMatch = searchTerm === '' || 
                       item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const categoryMatch = categoryFilter === '' || item.category === categoryFilter;
    
    return searchMatch && categoryMatch;
  });
  
  // Sortiranje po kategoriji
  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    // Prvo sortiramo po kategoriji
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    
    // Zatim po serijskom broju
    return a.serialNumber.localeCompare(b.serialNumber);
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedEquipment.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(sortedEquipment.length / itemsPerPage);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Kategorije opreme za filter
  const categories = [...new Set(equipment.map(item => item.category))];
  
  // Statistike
  const stats = {
    total: equipment.length,
    byCategory: categories.reduce((acc, category) => {
      acc[category] = equipment.filter(item => item.category === category).length;
      return acc;
    }, {})
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };
  
  return (
    <div className={`technician-equipment fade-in ${refreshing ? 'refreshing' : ''}`}>
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
          <BoxIcon />
          Moja oprema
        </h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary refresh-btn"
            onClick={fetchEquipment}
            disabled={loading}
            aria-label="Osvežite listu opreme"
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
            <p>Ukupno opreme</p>
          </div>
        </div>
        
        {Object.entries(stats.byCategory).slice(0, 3).map(([category, count]) => (
          <div className="stat-card" key={category}>
            <div className="stat-icon category">
              <ToolsIcon />
            </div>
            <div className="stat-content">
              <h3>{count}</h3>
              <p>{category}</p>
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
              <h4>Kategorija opreme</h4>
              <div className="category-filter-buttons">
                <button 
                  className={`category-filter-btn ${categoryFilter === '' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('')}
                >
                  Sve
                </button>
                {categories.map(category => (
                  <button 
                    key={category}
                    className={`category-filter-btn ${categoryFilter === category ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
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
          <h2>Lista opreme</h2>
          <div className="results-count">
            {filteredEquipment.length} od {equipment.length} komada
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
                  placeholder="Pretraga po serijskom broju, opisu..."
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Sve kategorije</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
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
            <p>Učitavanje opreme...</p>
          </div>
        ) : (
          <>
            {isMobile ? (
              // Mobile Card View
              <div className="mobile-equipment-list">
                {currentItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-message">
                      <BoxIcon className="empty-icon" />
                      <p>
                        {searchTerm || categoryFilter 
                          ? 'Nema rezultata za zadatu pretragu' 
                          : 'Nemate zadužene opreme'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  currentItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="mobile-equipment-card"
                    >
                      <div className="equipment-card-content">
                        <div className="equipment-card-header">
                          <span className="category-badge">
                            {item.category}
                          </span>
                          <div className="equipment-date">
                            <CalendarIcon />
                            <span>Zaduženo: {formatDate(item.assignedAt)}</span>
                          </div>
                        </div>
                        
                        <div className="equipment-card-body">
                          <div className="equipment-description">
                            {item.description}
                          </div>
                          
                          <div className="equipment-serial">
                            <strong>S/N:</strong> {item.serialNumber}
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
                <table className="equipment-table">
                  <thead>
                    <tr>
                      <th>Kategorija</th>
                      <th>Opis</th>
                      <th>Serijski broj</th>
                      <th>Datum zaduženja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-state">
                          <div className="empty-message">
                            <BoxIcon className="empty-icon" />
                            <p>
                              {searchTerm || categoryFilter 
                                ? 'Nema rezultata za zadatu pretragu' 
                                : 'Nemate zadužene opreme'
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item, index) => (
                        <tr key={item.id} className="slide-in" style={{animationDelay: `${index * 0.1}s`}}>
                          <td>
                            <span className="category-badge">
                              {item.category}
                            </span>
                          </td>
                          <td>{item.description}</td>
                          <td className="serial-number-cell">{item.serialNumber}</td>
                          <td>{formatDate(item.assignedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination - Mobile Optimized */}
            {sortedEquipment.length > itemsPerPage && (
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

export default TechnicianEquipment; 