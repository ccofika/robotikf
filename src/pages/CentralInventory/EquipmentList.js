import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UploadIcon, SearchIcon, FilterIcon, EditIcon, BoxIcon, PlusIcon, EyeIcon, SettingsIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { toast } from '../../utils/toast';
import { equipmentAPI } from '../../services/api';
import { cn } from '../../utils/cn';

const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [recentEquipment, setRecentEquipment] = useState([]); // Najskorije dodata oprema
  const [olderEquipment, setOlderEquipment] = useState([]); // Starija oprema
  const [dashboardStats, setDashboardStats] = useState(null); // Dashboard statistike
  const [availableCategories, setAvailableCategories] = useState([]); // Kategorije

  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(true);

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    serialNumber: true,
    location: true,
    actions: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [technicians, setTechnicians] = useState([]);

  // Modalni prozor za dodavanje pojedinačne opreme
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    category: '',
    description: '',
    serialNumber: '',
    isNewCategory: false,
    newCategoryName: ''
  });
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Prioritetno učitavanje podataka
  useEffect(() => {
    // Prvo prioritet: Dashboard statistike i kategorije
    fetchDashboardAndCategories();

    // Tehničare učitavamo odmah jer nisu kritični za UI
    fetchTechnicians();

    // Drugi prioritet: Najskorija oprema (poslednja 2 dana)
    setTimeout(() => {
      fetchRecentEquipment();
    }, 500); // Kratka pauza da dashboard statistike stignu prve

    // Treći prioritet: Starija oprema u pozadini
    setTimeout(() => {
      fetchOlderEquipment();
    }, 2000); // Učitava tek nakon što se sve ostalo učita
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
  
  // PRIORITET 1: Dashboard statistike i kategorije (najbrže učitavanje)
  const fetchDashboardAndCategories = async () => {
    setDashboardLoading(true);
    try {
      const response = await equipmentAPI.getDisplay();
      const filteredData = response.data.filter(item =>
        item.location === 'magacin' ||
        (item.location && item.location.startsWith('tehnicar-'))
      );

      // Izvlačimo samo kategorije za dashboard
      const categories = [...new Set(filteredData.map(item => item.category))];
      setAvailableCategories(categories);

      // Osnovne statistike za dashboard
      const stats = {
        total: filteredData.length,
        inWarehouse: filteredData.filter(item => item.location === 'magacin').length,
        assigned: filteredData.filter(item => item.location !== 'magacin').length
      };
      setDashboardStats(stats);

    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      setError('Greška pri učitavanju osnovnih podataka.');
    } finally {
      setDashboardLoading(false);
    }
  };

  // PRIORITET 2: Najskorije dodata oprema (poslednja 2 dana)
  const fetchRecentEquipment = async () => {
    setRecentLoading(true);
    try {
      const response = await equipmentAPI.getDisplay();
      const filteredData = response.data.filter(item =>
        item.location === 'magacin' ||
        (item.location && item.location.startsWith('tehnicar-'))
      );

      // Filtriramo opremu dodatu u poslednja 2 dana
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const recentData = filteredData.filter(item => {
        if (item.createdAt) {
          const createdDate = new Date(item.createdAt);
          return createdDate >= twoDaysAgo;
        }
        // Ako nema createdAt, uzimamo poslednje dodane po ID-u
        return false;
      });

      // Ako nema podataka o datumu kreiranja, uzimamo poslednje dodane
      const sortedRecent = recentData.length > 0 ? recentData : filteredData.slice(-20);

      setRecentEquipment(sortedRecent);

      // Odmah kombinujemo sa dashboard podacima za osnovni prikaz
      setEquipment(sortedRecent);

    } catch (error) {
      console.error('Greška pri učitavanju najskorije opreme:', error);
    } finally {
      setRecentLoading(false);
    }
  };

  // PRIORITET 3: Starija oprema (učitava u pozadini)
  const fetchOlderEquipment = async () => {
    setOlderLoading(true);
    try {
      const response = await equipmentAPI.getDisplay();
      const filteredData = response.data.filter(item =>
        item.location === 'magacin' ||
        (item.location && item.location.startsWith('tehnicar-'))
      );

      // Filtriramo stariju opremu (stariju od 2 dana)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const olderData = filteredData.filter(item => {
        if (item.createdAt) {
          const createdDate = new Date(item.createdAt);
          return createdDate < twoDaysAgo;
        }
        // Ako nema createdAt, uzimamo sve osim poslednih 20
        return true;
      });

      setOlderEquipment(olderData);

      // Sada kombinujemo svu opremu (najskorija + starija)
      setEquipment([...recentEquipment, ...olderData]);

    } catch (error) {
      console.error('Greška pri učitavanju starije opreme:', error);
    } finally {
      setOlderLoading(false);
    }
  };

  // Zadržavam staru funkciju za refresh dugme
  const fetchEquipment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await equipmentAPI.getDisplay();
      const filteredData = response.data.filter(item =>
        item.location === 'magacin' ||
        (item.location && item.location.startsWith('tehnicar-'))
      );
      setEquipment(filteredData);
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
      const response = await axios.get(`${apiUrl}/api/technicians`);
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
    }
  };

  
  // Filtriranje i pretraga opreme
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const searchMatch = searchTerm === '' || 
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const locationMatch = locationFilter === '' || item.location === locationFilter;
      
      return categoryMatch && searchMatch && locationMatch;
    });
  }, [equipment, searchTerm, locationFilter, selectedCategory]);
  
  // Dobijanje jedinstvenih vrednosti za filtere - koristi dashboard podatke kad su dostupni
  const categories = useMemo(() => {
    if (availableCategories.length > 0) {
      return availableCategories;
    }
    return [...new Set(equipment.map(item => item.category))];
  }, [equipment, availableCategories]);
  
  // Dobijanje broja elemenata po kategoriji
  const getCategoryCount = (category) => {
    if (category === 'all') {
      return equipment.length;
    }
    return equipment.filter(item => item.category === category).length;
  };
  
  const uniqueLocations = useMemo(() => {
    // Filtriramo lokacije da prikažemo samo magacin i tehničare
    const locations = [...new Set(equipment.map(item => item.location))]
      .filter(location => 
        location === 'magacin' || 
        (location && location.startsWith('tehnicar-'))
      );
    return ['', ...locations];
  }, [equipment]);
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
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
      
      await axios.post(`${apiUrl}/api/equipment`, equipmentToAdd);
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
      
      // Osvežavanje liste opreme
      fetchEquipment();
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
              <p className="text-slate-600 mt-1">Upravljanje inventarom opreme</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno u kategoriji</p>
                <h3 className="text-lg font-bold text-slate-900">{filteredEquipment.length}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg font-bold">
                {filteredEquipment.filter(item => item.location === 'magacin').length}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">U magacinu</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {filteredEquipment.length ? 
                    Math.round(filteredEquipment.filter(item => item.location === 'magacin').length / filteredEquipment.length * 100) : 0}%
                </h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-lg font-bold">
                {filteredEquipment.filter(item => item.location !== 'magacin').length}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Zaduženo</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {filteredEquipment.length ? 
                    Math.round(filteredEquipment.filter(item => item.location !== 'magacin').length / filteredEquipment.length * 100) : 0}%
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                />
              </div>
              
              {/* Location Filter */}
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                >
                  <option value="">Sve lokacije</option>
                  {uniqueLocations.filter(loc => loc).map((location, idx) => (
                    <option key={idx} value={location}>
                      {translateLocation(location)}
                    </option>
                  ))}
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
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
              
              {/* Refresh Button */}
              <Button
                type="secondary"
                size="medium"
                onClick={fetchEquipment}
                loading={loading}
                prefix={<RefreshIcon size={16} />}
              >
                Osveži
              </Button>
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
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <BoxIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema rezultata za prikazivanje</p>
                          <p className="text-xs">Promenite filtere za pristup opremi</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
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
            
            {/* Modern Pagination */}
            {filteredEquipment.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Prikazano {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredEquipment.length)} od {filteredEquipment.length} rezultata
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