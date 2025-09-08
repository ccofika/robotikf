import React, { useState, useEffect, useContext, useRef } from 'react';
import { SearchIcon, FilterIcon, RefreshIcon, BoxIcon, ToolsIcon, BarChartIcon, CalendarIcon, PlusIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

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
  }, [user?._id]);
  
  const fetchMaterials = async () => {
    if (!user?._id) return;
    
    console.log('=== FETCHING MATERIALS ===');
    console.log('User object:', user);
    console.log('User ID:', user._id);
    console.log('User ID type:', typeof user._id);
    console.log('User ID length:', user._id?.length);
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Calling techniciansAPI.getMaterials with ID:', user._id);
      const response = await techniciansAPI.getMaterials(user._id);
      console.log('Materials response:', response.data);
      setMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje materijala!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile - only at top of page
  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchMaterials();
    setTimeout(() => setRefreshing(false), 800); // Visual feedback
  };
  
  // Touch gesture handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) { // Only capture when at top
      touchStartY.current = e.touches[0].clientY;
    }
  };
  
  const handleTouchMove = (e) => {
    if (window.scrollY === 0) { // Only process when at top
      touchEndY.current = e.touches[0].clientY;
      
      // If user is at the top of the page and pulling down significantly
      const pullDistance = touchEndY.current - touchStartY.current;
      if (pullDistance > 100 && !refreshing) {
        handlePullToRefresh();
        // Reset to prevent multiple triggers
        touchStartY.current = 0;
        touchEndY.current = 0;
      }
    }
  };
  
  useEffect(() => {
    if (isMobile) {
      // Use passive listeners for better performance
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isMobile, refreshing]);
  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      {/* Pull to refresh indicator for mobile */}
      {isMobile && (
        <div className={cn(
          "fixed top-0 left-0 right-0 transition-transform duration-300 z-10 flex items-center justify-center h-16 bg-white/80 backdrop-blur-sm",
          refreshing ? "translate-y-0" : "-translate-y-full"
        )}>
          <RefreshIcon className={cn('w-6 h-6 text-blue-600', refreshing && 'animate-spin')} />
          <span className="ml-2 text-sm text-slate-600">{refreshing ? 'Osvežavanje...' : 'Povucite dole za osvežavanje'}</span>
        </div>
      )}
      
      {/* Page Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-blue-50 rounded-xl">
              <ToolsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Moji materijali</h1>
              <p className="text-slate-600 text-sm mt-1 hidden sm:block">Pregled dodeljenih materijala</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              type="secondary"
              size="medium"
              onClick={fetchMaterials}
              loading={loading}
              disabled={loading}
              className={cn(
                "min-w-[44px] h-11",
                isMobile && "px-0 w-11"
              )}
            >
              <RefreshIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
              {!isMobile && <span className="ml-1">Osveži</span>}
            </Button>
            {isMobile && (
              <Button
                type={showFilters ? "primary" : "secondary"}
                size="medium"
                onClick={() => setShowFilters(!showFilters)}
                className="min-w-[44px] h-11 px-0 w-11"
              >
                <FilterIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong>Greška:</strong> {error}
        </div>
      )}
      
      {/* Statistics Cards - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Types */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <BarChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Tipova</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</h3>
              </div>
            </div>
          </div>
          
          {/* Total Quantity */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                <BoxIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.totalQuantity}</h3>
              </div>
            </div>
          </div>
          
          {/* Category cards - limit to top 2 on mobile */}
          {Object.entries(stats.byType).slice(0, 2).map(([type, data], index) => (
            <div key={type} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className={`p-2 ${index === 0 ? 'bg-purple-50' : 'bg-orange-50'} rounded-lg flex-shrink-0`}>
                  <ToolsIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${index === 0 ? 'text-purple-600' : 'text-orange-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider break-words leading-tight" title={type}>{type}</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">{data.quantity}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* Mobile Filter Panel - Toggleable */}
        {isMobile && showFilters && (
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Filteri</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <span className="text-xl leading-none text-slate-600">&times;</span>
              </button>
            </div>
            
            {/* Mobile Search */}
            <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Pretraga po tipu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              )}
            </div>
            
            {/* Mobile Filter Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Tip materijala</h4>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setTypeFilter('')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                    typeFilter === '' 
                      ? "bg-blue-500 text-white" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Svi
                </button>
                {types.map(type => (
                  <button 
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-colors break-words text-center min-w-0 max-w-[140px]",
                      typeFilter === type 
                        ? "bg-blue-500 text-white" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                    title={type}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Card Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Lista materijala</h2>
              <p className="text-sm font-medium text-slate-700 mt-1">
                {filteredMaterials.length} od {materials.length} tipova
              </p>
            </div>
          </div>
        </div>
        
        {/* Desktop Search Controls */}
        {!isMobile && (
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Pretraga po tipu materijala..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                />
              </div>
              
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                >
                  <option value="">Svi tipovi</option>
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center space-x-3 text-slate-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Učitavanje materijala...</span>
            </div>
          </div>
        ) : (
          <>
            {isMobile ? (
              // Mobile Card View
              <div className="p-4">
                {currentItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <ToolsIcon size={48} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        {searchTerm || typeFilter 
                          ? 'Nema rezultata za zadatu pretragu' 
                          : 'Nemate zadužene materijale'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentItems.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                              <ToolsIcon size={18} className="text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 break-words leading-tight pr-2" title={item.type}>
                                {item.type}
                              </p>
                              <p className="text-xs font-medium text-slate-600">Material</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-xl font-bold text-slate-900">{item.quantity}</span>
                            <p className="text-xs font-medium text-slate-600">kom</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Tip materijala
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Količina
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <ToolsIcon size={48} className="text-slate-300" />
                            <p className="text-sm font-medium text-slate-500">
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
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {item.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            <span className="font-semibold">{item.quantity}</span> kom
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Mobile Pagination */}
            {sortedMaterials.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-slate-200">
                {isMobile ? (
                  <div className="flex items-center justify-between">
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ‹ Prethodna
                    </Button>
                    
                    <span className="text-sm text-slate-600">
                      {currentPage} od {totalPages}
                    </span>
                    
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Sledeća ›
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Stranica {currentPage} od {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(1)}
                        disabled={currentPage === 1}
                      >
                        &laquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        &lsaquo;
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(number => {
                          return (
                            number === 1 || 
                            number === totalPages ||
                            Math.abs(number - currentPage) <= 1
                          );
                        })
                        .map(number => (
                          <Button
                            key={number}
                            type={currentPage === number ? "primary" : "tertiary"}
                            size="small"
                            onClick={() => paginate(number)}
                          >
                            {number}
                          </Button>
                        ))}
                        
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        &rsaquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        &raquo;
                      </Button>
                    </div>
                  </div>
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