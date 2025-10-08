import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UploadIcon, SearchIcon, FilterIcon, EditIcon, BoxIcon, PlusIcon, EyeIcon, SettingsIcon, RefreshIcon, CloseIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { equipmentAPI, techniciansAPI } from '../../services/api';
import { cn } from '../../utils/cn';

const EquipmentList = () => {
  // Server-side pagination state
  const [equipment, setEquipment] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });
  const [dashboardStats, setDashboardStats] = useState({ total: 0, inWarehouse: 0, assigned: 0 });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [allLocations, setAllLocations] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI states
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    serialNumber: true,
    location: true,
    actions: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [technicians, setTechnicians] = useState([]);
  const [equipmentByDescription, setEquipmentByDescription] = useState([]);

  // Modalni prozor za dodavanje pojedinačne opreme
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    category: '',
    description: '',
    serialNumber: '',
    isNewCategory: false,
    newCategoryName: ''
  });
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when pagination, search, or filters change
  useEffect(() => {
    fetchEquipment();
    fetchDashboardStats(selectedCategory); // Update dashboard stats for new category

    // Fetch equipment grouped by description if technician or warehouse is selected
    if (locationFilter && (locationFilter.startsWith('tehnicar-') || locationFilter === 'magacin')) {
      fetchEquipmentByDescription(locationFilter);
    } else {
      setEquipmentByDescription([]);
    }
  }, [pagination.currentPage, debouncedSearchTerm, locationFilter, selectedCategory]);

  // Initial load
  useEffect(() => {
    fetchDashboardStats('all'); // Start with all categories
    fetchCategories();
    fetchTechnicians();
    fetchAllLocations(); // Load all possible locations
    fetchEquipment();
  }, []);
  
  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnMenu && !event.target.closest('.relative')) {
        setShowColumnMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnMenu]);
  
  // Fetch dashboard stats for current category
  const fetchDashboardStats = async (category = selectedCategory) => {
    setDashboardLoading(true);
    try {
      const params = {
        statsOnly: 'true'
      };
      if (category && category !== 'all') {
        params.category = category;
      }

      const response = await equipmentAPI.getDisplay(params);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch categories with counts
  const fetchCategories = async () => {
    try {
      const [categoriesResponse, countsResponse] = await Promise.all([
        equipmentAPI.getCategories(),
        equipmentAPI.getCategories({ withCounts: 'true' })
      ]);

      setAvailableCategories(categoriesResponse.data);
      setCategoryCounts(countsResponse.data);
    } catch (error) {
      console.error('Greška pri učitavanju kategorija:', error);
    }
  };

  // Main fetch function with server-side pagination
  const fetchEquipment = async (page = pagination.currentPage) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearchTerm,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        location: locationFilter
      };

      const response = await equipmentAPI.getDisplay(params);
      const { data: equipmentData, pagination: paginationData, performance: performanceData } = response.data;

      setEquipment(equipmentData);
      setPagination(paginationData);
      setPerformance(performanceData);

      // Update current page in state if different
      if (paginationData.currentPage !== pagination.currentPage) {
        setPagination(prev => ({ ...prev, currentPage: paginationData.currentPage }));
      }

    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje opreme!');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
    }
  };

  // Fetch all possible locations for filter dropdown
  const fetchAllLocations = async () => {
    try {
      const response = await equipmentAPI.getLocations();
      setAllLocations(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju lokacija:', error);
    }
  };

  // Fetch equipment grouped by description for selected technician
  const fetchEquipmentByDescription = async (location) => {
    try {
      const params = {
        location: location,
        groupBy: 'description'
      };

      const response = await equipmentAPI.getGrouped(params);
      setEquipmentByDescription(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju grupisane opreme:', error);
      setEquipmentByDescription([]);
    }
  };

  
  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [pagination.totalPages]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardStats(selectedCategory),
      fetchCategories(),
      fetchAllLocations(),
      fetchEquipment(pagination.currentPage)
    ]);
    setIsRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  // Reset filters and search
  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setLocationFilter('');
    setSelectedCategory('all');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search
  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };
  
  // Categories for filters
  const categories = availableCategories;

  // Get category count from backend data
  const getCategoryCount = (category) => {
    if (category === 'all') {
      return categoryCounts.all || dashboardStats.total || pagination.totalCount;
    }
    return categoryCounts[category] || 0;
  };
  
  // All locations for filter dropdown (magacin + all technicians)
  const locationOptions = useMemo(() => {
    return [
      { value: '', label: 'Sve lokacije' },
      ...allLocations
    ];
  }, [allLocations]);
  
  // Lokalizacija lokacije
  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    if (location.startsWith('tehnicar-')) {
      const techId = location.split('-')[1];
      // Pronađi tehničara po ID-u
      const technician = technicians.find(tech => tech._id === techId || tech.id === techId);
      return technician ? `Tehničar: ${technician.name}` : `Tehničar ID: ${techId}`;
    }
    return location;
  };
  
  // Formatiranje naziva kategorija
  const formatCategoryName = (category) => {
    const categoryNames = {
      'cam': 'CAM',
      'modem': 'Modem',
      'stb': 'STB',
      'fiksni telefon': 'Fiksni telefon',
      'mini nod': 'Mini nod',
      'hybrid': 'Hybrid'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  // Handling za dodavanje pojedinačne opreme
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEquipment(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setNewEquipment(prev => ({ ...prev, isNewCategory: true, category: '' }));
    } else {
      setNewEquipment(prev => ({ 
        ...prev, 
        isNewCategory: false, 
        category: value,
        newCategoryName: ''
      }));
    }
  };
  
  const handleAddEquipment = async (e) => {
    e.preventDefault();
    
    // Validacije
    if ((newEquipment.isNewCategory && !newEquipment.newCategoryName) || 
        (!newEquipment.isNewCategory && !newEquipment.category) || 
        !newEquipment.description || 
        !newEquipment.serialNumber) {
      toast.error('Sva polja su obavezna!');
      return;
    }
    
    try {
      const equipmentToAdd = {
        category: newEquipment.isNewCategory ? newEquipment.newCategoryName : newEquipment.category,
        description: newEquipment.description,
        serialNumber: newEquipment.serialNumber
      };

      await equipmentAPI.create(equipmentToAdd);
      toast.success('Oprema uspešno dodata!');
      setShowAddModal(false);
      
      // Reset forme
      setNewEquipment({
        category: '',
        description: '',
        serialNumber: '',
        isNewCategory: false,
        newCategoryName: ''
      });
      
      // Osvežavanje liste opreme i kategorija
      await Promise.all([
        handleRefresh(),
        fetchCategories() // Ponovo učitaj kategorije jer se možda dodala nova
      ]);
    } catch (error) {
      console.error('Greška pri dodavanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju opreme!');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <BoxIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pregled opreme</h1>
              <p className="text-slate-600 mt-1">Server-side pagination - {pagination.totalCount} komada opreme</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              type="secondary"
              size="medium"
              onClick={handleRefresh}
              disabled={isRefreshing || dashboardLoading || loading}
              prefix={<RefreshIcon size={16} className={(isRefreshing || dashboardLoading || loading) ? 'animate-spin' : ''} />}
            >
              Osveži
            </Button>
            <Button
              type="secondary"
              size="medium"
              onClick={() => setShowAddModal(true)}
              prefix={<PlusIcon size={16} />}
            >
              Dodaj opremu
            </Button>
            <Link to="/equipment/upload">
              <Button
                type="primary"
                size="medium"
                prefix={<UploadIcon size={16} />}
              >
                Dodaj iz Excel-a
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Modern Category Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-6 bg-slate-100 rounded-lg p-4">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              selectedCategory === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <span>Sve kategorije</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {getCategoryCount('all')}
            </span>
          </button>
          {categories.map(category => (
            <button 
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                "hover:bg-white hover:text-slate-900",
                selectedCategory === category ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              )}
            >
              <span>{formatCategoryName(category)}</span>
              <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
                {getCategoryCount(category)}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BoxIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {selectedCategory === 'all' ? 'Ukupno opreme' : `${formatCategoryName(selectedCategory)}`}
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardLoading ? (
                    <span className="animate-pulse bg-slate-200 rounded w-8 h-6 inline-block"></span>
                  ) : (
                    dashboardStats.total
                  )}
                </h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg font-bold">
                {dashboardLoading ? (
                  <span className="animate-pulse bg-slate-200 rounded w-6 h-6 inline-block"></span>
                ) : (
                  dashboardStats.inWarehouse
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">U magacinu</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardLoading ? (
                    <span className="animate-pulse bg-slate-200 rounded w-8 h-6 inline-block"></span>
                  ) : (
                    dashboardStats.total > 0 ?
                      Math.round(dashboardStats.inWarehouse / dashboardStats.total * 100) : 0
                  )}%
                </h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-lg font-bold">
                {dashboardLoading ? (
                  <span className="animate-pulse bg-slate-200 rounded w-6 h-6 inline-block"></span>
                ) : (
                  dashboardStats.assigned
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Zaduženo</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardLoading ? (
                    <span className="animate-pulse bg-slate-200 rounded w-8 h-6 inline-block"></span>
                  ) : (
                    dashboardStats.total > 0 ?
                      Math.round(dashboardStats.assigned / dashboardStats.total * 100) : 0
                  )}%
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment by Description Table - shown when technician or warehouse is selected */}
      {locationFilter && (locationFilter.startsWith('tehnicar-') || locationFilter === 'magacin') && equipmentByDescription.length > 0 && (
        <div className="mb-6 bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Oprema po tipu</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[35%]">
                    Opis opreme
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-[15%]">
                    Broj
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[35%]">
                    Opis opreme
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-[15%]">
                    Broj
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {equipmentByDescription.reduce((rows, item, index) => {
                  if (index % 2 === 0) {
                    rows.push([item]);
                  } else {
                    rows[rows.length - 1].push(item);
                  }
                  return rows;
                }, []).map((row, rowIndex) => (
                  <tr key={rowIndex} className={`hover:bg-slate-50 transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {row[0]?.description}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right font-semibold">
                      {row[0]?.count}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {row[1]?.description || ''}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right font-semibold">
                      {row[1]?.count || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modern Table Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* Table Controls */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Pretraži po serijskom broju ili opisu..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="h-9 w-full pl-10 pr-4 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDebouncedSearchTerm('');
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
              
              {/* Location Filter */}
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                >
                  {locationOptions.map((location, idx) => (
                    <option key={idx} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Clear Filters */}
              {(searchTerm || locationFilter || selectedCategory !== 'all') && (
                <Button
                  type="tertiary"
                  size="small"
                  onClick={clearAllFilters}
                >
                  Obriši filtere
                </Button>
              )}

              {/* Column Visibility Toggle */}
              <div className="relative">
                <Button
                  type="tertiary"
                  size="medium"
                  prefix={<EyeIcon size={16} />}
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                >
                  Kolone
                </Button>
                
                {/* Column Visibility Dropdown */}
                {showColumnMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-md shadow-md z-50">
                    <div className="p-1">
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Prikaži kolone</div>
                      {Object.entries({
                        description: 'Opis',
                        serialNumber: 'Serijski broj',
                        location: 'Lokacija',
                        actions: 'Akcije'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns[key]}
                            onChange={(e) => setVisibleColumns(prev => ({...prev, [key]: e.target.checked}))}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center space-x-3 text-slate-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Učitavanje opreme...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.description && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Opis
                      </th>
                    )}
                    {visibleColumns.serialNumber && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Serijski broj
                      </th>
                    )}
                    {visibleColumns.location && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Lokacija
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Akcije
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {equipment.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <BoxIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema rezultata za prikazivanje</p>
                          {(searchTerm || locationFilter || selectedCategory !== 'all') && (
                            <Button
                              type="tertiary"
                              size="small"
                              onClick={clearAllFilters}
                              className="mt-3"
                            >
                              Obriši filtere
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    equipment.map((item, index) => (
                      <tr key={item._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                        {visibleColumns.description && (
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {item.description}
                          </td>
                        )}
                        {visibleColumns.serialNumber && (
                          <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                            {item.serialNumber}
                          </td>
                        )}
                        {visibleColumns.location && (
                          <td className="px-6 py-4">
                            <Button
                              type={item.location === 'magacin' ? 'primary' : 'secondary'}
                              size="small"
                              className="text-xs"
                            >
                              {translateLocation(item.location)}
                            </Button>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 text-right space-x-2">
                            <Link to={`/equipment/edit/${item._id}`}>
                              <Button
                                type="tertiary"
                                size="small"
                                prefix={<EditIcon size={14} />}
                              >
                                Izmeni
                              </Button>
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Server-side Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Prikazano {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} od {pagination.totalCount} rezultata
                    {performance.queryTime && (
                      <span className="ml-2 text-slate-400">({performance.queryTime}ms)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.hasPreviousPage}
                    >
                      &laquo;
                    </Button>
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPreviousPage}
                    >
                      &lsaquo;
                    </Button>

                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(number => {
                        return (
                          number === 1 ||
                          number === pagination.totalPages ||
                          Math.abs(number - pagination.currentPage) <= 1
                        );
                      })
                      .map(number => (
                        <Button
                          key={number}
                          type={pagination.currentPage === number ? "primary" : "tertiary"}
                          size="small"
                          onClick={() => handlePageChange(number)}
                        >
                          {number}
                        </Button>
                      ))}

                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      &rsaquo;
                    </Button>
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={!pagination.hasNextPage}
                    >
                      &raquo;
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
      </div>
      
      {/* Modern Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Dodaj novu opremu</h2>
              <Button
                type="tertiary"
                size="small"
                onClick={() => setShowAddModal(false)}
                className="!p-2"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddEquipment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Kategorija:</label>
                  <select 
                    onChange={handleCategoryChange}
                    defaultValue=""
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" disabled>Izaberite kategoriju</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{formatCategoryName(category)}</option>
                    ))}
                    <option value="new">Nova kategorija...</option>
                  </select>
                </div>
                
                {newEquipment.isNewCategory && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Naziv nove kategorije:</label>
                    <input 
                      type="text" 
                      name="newCategoryName"
                      value={newEquipment.newCategoryName}
                      onChange={handleInputChange}
                      placeholder="Unesite naziv nove kategorije"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Opis:</label>
                  <input 
                    type="text" 
                    name="description"
                    value={newEquipment.description}
                    onChange={handleInputChange}
                    placeholder="Unesite opis opreme"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Serijski broj:</label>
                  <input 
                    type="text" 
                    name="serialNumber"
                    value={newEquipment.serialNumber}
                    onChange={handleInputChange}
                    placeholder="Unesite serijski broj"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button 
                    type="secondary"
                    size="medium"
                    onClick={() => setShowAddModal(false)}
                  >
                    Otkaži
                  </Button>
                  <Button 
                    type="primary"
                    size="medium"
                    onClick={handleAddEquipment}
                  >
                    Dodaj opremu
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(EquipmentList);