import React, { useState, useEffect, useContext, useRef } from 'react';
import { SearchIcon, FilterIcon, RefreshIcon, BoxIcon, ToolsIcon, BarChartIcon, CalendarIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

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
  const itemsPerPage = isMobile ? 12 : 10;
  
  useEffect(() => {
    fetchEquipment();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?._id]);
  
  const fetchEquipment = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getEquipment(user._id);
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje opreme!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile - only at top of page
  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchEquipment();
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
              <BoxIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Moja oprema</h1>
              <p className="text-slate-600 text-sm mt-1 hidden sm:block">Pregled zadužene opreme</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              type="secondary"
              size="medium"
              onClick={fetchEquipment}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <BarChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Ukupno</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</h3>
              </div>
            </div>
          </div>
          
          {/* Category cards - limit to 5 on mobile */}
          {Object.entries(stats.byCategory).slice(0, isMobile ? 5 : 3).map(([category, count]) => (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm" key={category}>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                  <ToolsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">{category}</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">{count}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content Card - Mobile Optimized */}
      <Card className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* Mobile Filter Panel - Toggleable */}
        {isMobile && (
          <div className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-all duration-300",
            showFilters ? "opacity-100 visible" : "opacity-0 invisible"
          )}>
            <div className={cn(
              "absolute bottom-0 left-0 right-0 bg-white rounded-t-xl transition-transform duration-300",
              showFilters ? "translate-y-0" : "translate-y-full"
            )}>
              <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Filteri</h3>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setShowFilters(false)}
                  className="w-8 h-8 p-0"
                >
                  <span className="text-xl leading-none">&times;</span>
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Pretraga..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 h-12"
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 flex items-center justify-center"
                      onClick={() => setSearchTerm('')}
                    >
                      &times;
                    </button>
                  )}
                </div>
                
                {/* Category Filter */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Kategorija opreme</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={cn(
                        "px-4 py-3 text-sm font-medium rounded-lg border transition-all min-h-[48px]",
                        categoryFilter === ''
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
                      )}
                      onClick={() => setCategoryFilter('')}
                    >
                      Sve
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        className={cn(
                          "px-4 py-3 text-sm font-medium rounded-lg border transition-all min-h-[48px]",
                          categoryFilter === category
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
                        )}
                        onClick={() => setCategoryFilter(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Apply Button */}
                <div className="pt-4">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setShowFilters(false)}
                    className="w-full h-12"
                  >
                    Primeni filtere
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <CardHeader className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl text-slate-900">Lista opreme</CardTitle>
            <div className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              {filteredEquipment.length} od {equipment.length} komada
            </div>
          </div>
        </CardHeader>
        
        {/* Desktop Table Controls */}
        {!isMobile && (
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-4 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Pretraga po serijskom broju, opisu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 flex items-center justify-center hover:text-slate-600"
                      onClick={() => setSearchTerm('')}
                    >
                      &times;
                    </button>
                  )}
                </div>
                
                {/* Category Filter Select */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                  >
                    <option value="">Sve kategorije</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Content - Table for Desktop, Cards for Mobile */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-slate-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Učitavanje opreme...</span>
              </div>
            </div>
          ) : (
          <>
            {isMobile ? (
              // Mobile Card View
              <div className="p-3 space-y-2">
                {currentItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <BoxIcon className="w-12 h-12 text-slate-300" />
                      <p className="text-sm text-slate-500">
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
                      className="bg-white border border-slate-200 rounded-lg overflow-hidden border-l-4 border-l-green-500 transition-transform duration-200"
                    >
                      <div className="p-3">
                        {/* Header - Kompaktan */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md border bg-green-100 text-green-700 border-green-200">
                            {item.category}
                          </span>
                          <div className="flex items-center text-xs text-slate-500">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            <span>{formatDate(item.assignedAt)}</span>
                          </div>
                        </div>
                        
                        {/* Body - Kompaktan */}
                        <div className="space-y-1.5">
                          <div className="font-semibold text-slate-900 text-sm">
                            {item.description}
                          </div>
                          
                          <div className="text-xs text-slate-600">
                            <strong>S/N:</strong> <span className="font-mono">{item.serialNumber}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Kategorija</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opis</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serijski broj</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum zaduženja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center space-y-2">
                            <BoxIcon className="w-12 h-12 text-slate-300" />
                            <p className="text-sm font-medium">
                              {searchTerm || categoryFilter 
                                ? 'Nema rezultata za zadatu pretragu' 
                                : 'Nemate zadužene opreme'
                              }
                            </p>
                            <p className="text-xs">Promenite filtere za pristup opremi</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border bg-green-100 text-green-700 border-green-200">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-mono">{item.serialNumber}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{formatDate(item.assignedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination - Mobile Optimized */}
            {sortedEquipment.length > itemsPerPage && (
              <div className="px-4 sm:px-6 py-4 border-t border-slate-200">
                {isMobile ? (
                  // Mobile Pagination
                  <div className="flex items-center justify-between max-w-xs mx-auto">
                    <Button
                      type="secondary"
                      size="medium"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-11 h-11 p-0"
                    >
                      &lsaquo;
                    </Button>
                    
                    <div className="text-sm font-medium text-slate-600">
                      Stranica {currentPage} od {totalPages}
                    </div>
                    
                    <Button
                      type="secondary"
                      size="medium"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-11 h-11 p-0"
                    >
                      &rsaquo;
                    </Button>
                  </div>
                ) : (
                  // Desktop Pagination
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Prikazano {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedEquipment.length)} od {sortedEquipment.length} rezultata
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 p-0"
                      >
                        &laquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 p-0"
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
                            className="w-8 h-8 p-0"
                          >
                            {number}
                          </Button>
                        ))}
                        
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 p-0"
                      >
                        &rsaquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(totalPages)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 p-0"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianEquipment; 