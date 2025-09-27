import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangleIcon, 
  SearchIcon, 
  FilterIcon, 
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  ClipboardIcon,
  RefreshIcon,
  EquipmentIcon,
  ChartIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';
// import './DefectiveEquipment.css';

const DefectiveEquipment = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState(null);
  
  // User equipment section states
  const [userEquipment, setUserEquipment] = useState([]);
  const [userEquipmentLoading, setUserEquipmentLoading] = useState(false);
  const [userEquipmentError, setUserEquipmentError] = useState('');
  const [userEquipmentSearchTerm, setUserEquipmentSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  
  // Paginacija za defektivnu opremu
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Paginacija za korisničku opremu
  const [userEquipmentCurrentPage, setUserEquipmentCurrentPage] = useState(1);
  const userEquipmentItemsPerPage = 15;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Optimized initial data loading - use statsOnly for performance
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('DefectiveEquipment: Fetching optimized initial data...');
      const startTime = Date.now();

      // Load in parallel with performance optimization
      const [defectiveRes, usersRes, userEquipmentRes] = await Promise.all([
        // Use statsOnly for initial dashboard-like overview
        axios.get(`${apiUrl}/api/defective-equipment?statsOnly=true`),
        axios.get(`${apiUrl}/api/users?statsOnly=true`),
        axios.get(`${apiUrl}/api/user-equipment?statsOnly=true`)
      ]);

      const endTime = Date.now();
      console.log(`DefectiveEquipment: Initial stats fetched in ${endTime - startTime}ms`);

      // Set the stats for dashboard view
      if (defectiveRes.data.success) {
        setStats(defectiveRes.data.stats);
      }

      // Load full data only when needed
      fetchFullDefectiveEquipment();
      fetchUsers();
    } catch (error) {
      console.error('❌ Error fetching initial data:', error);
      toast.error('Greška pri učitavanju početnih podataka');
    } finally {
      setLoading(false);
    }
  };

  // Full defective equipment data loading
  const fetchFullDefectiveEquipment = async () => {
    try {
      console.log('🔄 Fetching full defective equipment data...');
      const startTime = Date.now();
      const response = await axios.get(`${apiUrl}/api/defective-equipment`);

      if (response.data.success) {
        setEquipment(response.data.data);
        setStats(response.data.stats);
        const endTime = Date.now();
        console.log(`✅ Full defective equipment loaded in ${endTime - startTime}ms:`, response.data.data.length);
      }
    } catch (error) {
      console.error('❌ Error fetching full defective equipment:', error);
      setError('Greška pri učitavanju neispravne opreme. Pokušajte ponovo.');
    }
  };

  // When users are loaded, create a map for faster lookups
  useEffect(() => {
    if (users.length > 0) {
      const map = {};
      users.forEach(user => {
        map[user._id] = user;
      });
      setUsersMap(map);
      
      // Fetch user equipment after users are loaded
      fetchUserEquipment();
    }
  }, [users]);
  
  // Fetch all users
  const fetchUsers = async () => {
    try {
      console.log('🔄 Fetching users...');
      const response = await axios.get(`${apiUrl}/api/users`);
      console.log('✅ Users loaded:', response.data.length);
      setUsers(response.data);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast.error('Neuspešno učitavanje korisnika!');
    }
  };
  
  // Fetch equipment for a specific user
  const fetchUserEquipment = async (userId = '') => {
    setUserEquipmentLoading(true);
    setUserEquipmentError('');
    
    try {
      console.log('🔄 Fetching user equipment...');
      console.log('User ID:', userId);
      let response;
      
      if (userId) {
        response = await axios.get(`${apiUrl}/api/user-equipment/user/${userId}`);
      } else {
        response = await axios.get(`${apiUrl}/api/user-equipment`);
      }
      
      console.log('✅ User equipment loaded:', response.data.length);
      console.log('Equipment data sample:', response.data.length > 0 ? response.data[0] : 'No data');
      setUserEquipment(response.data);
    } catch (error) {
      console.error('❌ Error fetching user equipment:', error);
      setUserEquipmentError('Greška pri učitavanju korisničke opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje korisničke opreme!');
    } finally {
      setUserEquipmentLoading(false);
    }
  };
  
  // Handle user filter change
  const handleUserFilterChange = (e) => {
    const selectedUserId = e.target.value;
    console.log('Selected user ID:', selectedUserId);
    setUserFilter(selectedUserId);
    
    if (selectedUserId) {
      // Ako je izabran korisnik, pronaći njegov tisId
      const selectedUser = users.find(user => user._id === selectedUserId);
      if (selectedUser) {
        console.log('Selected user:', selectedUser.name, 'with tisId:', selectedUser.tisId);
        fetchUserEquipment(selectedUserId); // Prosleđujemo MongoDB ID
      } else {
        console.log('User not found with ID:', selectedUserId);
        fetchUserEquipment(selectedUserId);
      }
    } else {
      fetchUserEquipment();
    }
  };
  
  // Handle search by serial number for user equipment
  const handleUserEquipmentSearch = async () => {
    if (!userEquipmentSearchTerm) {
      if (userFilter) {
        fetchUserEquipment(userFilter);
      } else {
        fetchUserEquipment();
      }
      return;
    }
    
    setUserEquipmentLoading(true);
    setUserEquipmentError('');
    
    try {
      // First try to find equipment by serial number
      console.log('🔍 Searching for equipment with serial number:', userEquipmentSearchTerm);
      const response = await axios.get(`${apiUrl}/api/equipment/serial/${userEquipmentSearchTerm}`);
      console.log('Equipment search result:', response.data);
      
      if (response.data && response.data.location && response.data.location.startsWith('user-')) {
        // Extract TIS ID from location (format: "user-TISID")
        const userTisId = response.data.location.substring(5);
        console.log('Found equipment installed at user with TIS ID:', userTisId);
        
        // Find user by TIS ID
        const user = users.find(u => u.tisId === userTisId);
        if (user) {
          console.log('Found user:', user.name, 'with ID:', user._id);
          // If found, set the user filter and fetch all equipment for that user
          setUserFilter(user._id);
          fetchUserEquipment(user._id);
        } else {
          console.log('User not found with TIS ID:', userTisId);
          // Try to fetch equipment directly with TIS ID
          setUserFilter(userTisId);
          fetchUserEquipment(userTisId);
        }
      } else {
        // If not found or not installed at a user, show message
        console.log('Equipment not found or not installed at a user');
        setUserEquipment([]);
        setUserEquipmentError('Oprema sa unetim serijskim brojem nije pronađena kod korisnika.');
        setUserEquipmentLoading(false);
      }
    } catch (error) {
      console.error('❌ Error searching equipment by serial number:', error);
      setUserEquipmentError('Greška pri pretraživanju opreme. Pokušajte ponovo.');
      setUserEquipmentLoading(false);
    }
  };
  
  // Reset user equipment filters
  const handleUserEquipmentReset = () => {
    setUserEquipmentSearchTerm('');
    setUserFilter('');
    fetchUserEquipment();
    setUserEquipmentCurrentPage(1);
  };
  
  // Filtriranje i pretraga opreme
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const categoryMatch = categoryFilter === '' || item.category === categoryFilter;
      const searchMatch = searchTerm === '' || 
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.removalInfo?.workOrder?.tisId && 
                          item.removalInfo.workOrder.tisId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.removalInfo?.removedByName && 
                          item.removalInfo.removedByName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const dateMatch = dateFilter === '' || 
                       (item.removalInfo?.removalDate && 
                        new Date(item.removalInfo.removalDate).toISOString().split('T')[0] === dateFilter);
      
      return categoryMatch && searchMatch && dateMatch;
    });
  }, [equipment, searchTerm, categoryFilter, dateFilter]);
  
  // Filtriranje korisničke opreme
  const filteredUserEquipment = useMemo(() => {
    return userEquipment.filter(item => {
      const searchMatch = userEquipmentSearchTerm === '' || 
                         item.serialNumber.toLowerCase().includes(userEquipmentSearchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(userEquipmentSearchTerm.toLowerCase())) ||
                         (item.equipmentDescription && item.equipmentDescription.toLowerCase().includes(userEquipmentSearchTerm.toLowerCase()));
      
      return searchMatch;
    });
  }, [userEquipment, userEquipmentSearchTerm]);
  
  // Dobijanje jedinstvenih vrednosti za filtere
  const categories = useMemo(() => {
    return [...new Set(equipment.map(item => item.category))].sort();
  }, [equipment]);
  
  // Paginacija za defektivnu opremu
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const currentEquipment = filteredEquipment.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Paginacija za korisničku opremu
  const userEquipmentTotalPages = Math.ceil(filteredUserEquipment.length / userEquipmentItemsPerPage);
  const currentUserEquipment = filteredUserEquipment.slice(
    (userEquipmentCurrentPage - 1) * userEquipmentItemsPerPage,
    userEquipmentCurrentPage * userEquipmentItemsPerPage
  );
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      'defective': { 
        label: 'Neispravno', 
        className: 'bg-red-50 text-red-700 border border-red-200' 
      },
      'available': { 
        label: 'Dostupno', 
        className: 'bg-green-50 text-green-700 border border-green-200' 
      },
      'assigned': { 
        label: 'Dodeljeno', 
        className: 'bg-blue-50 text-blue-700 border border-blue-200' 
      },
      'installed': { 
        label: 'Instalirano', 
        className: 'bg-purple-50 text-purple-700 border border-purple-200' 
      }
    };
    
    const config = statusConfig[status] || { 
      label: status, 
      className: 'bg-gray-50 text-gray-700 border border-gray-200' 
    };
    return (
      <span className={cn(
        "inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium",
        config.className
      )}>
        {config.label}
      </span>
    );
  };
  
  const handleReset = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  // Find user name by ID using the users map for better performance
  const getUserNameById = (userId) => {
    if (!userId) return 'Nepoznato';
    return usersMap[userId]?.name || 'Nepoznato';
  };

  // Extract user TIS ID from location field (format: "user-TISID")
  const extractUserTisIdFromLocation = (location) => {
    if (!location || typeof location !== 'string') return null;
    if (location.startsWith('user-')) {
      return location.substring(5);
    }
    return null;
  };
  
  // Find user by TIS ID
  const getUserByTisId = (tisId) => {
    if (!tisId) return null;
    return users.find(user => user.tisId === tisId);
  };
  
  // Get user name for display
  const getUserNameForDisplay = (item) => {
    // If item already has userName from API, use it
    if (item.userName) return item.userName;
    
    // If item has userId, try to get name from usersMap
    if (item.userId) {
      const userName = getUserNameById(item.userId);
      if (userName !== 'Nepoznato') return userName;
    }
    
    // Try to find user by TIS ID from item or from location
    const tisId = item.userTisId || extractUserTisIdFromLocation(item.location);
    if (tisId) {
      const user = getUserByTisId(tisId);
      if (user) return user.name;
    }
    
    return 'Nepoznato';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <AlertTriangleIcon size={24} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Neispravna oprema</h1>
            <p className="text-slate-600 mt-1">
              Pregled sve opreme označene kao neispravna sa detaljima o uklanjanju
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <AlertTriangleIcon size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno neispravnih</p>
                  <h3 className="text-lg font-bold text-slate-900">{stats.total}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ChartIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Kategorija</p>
                  <h3 className="text-lg font-bold text-slate-900">{Object.keys(stats.byCategory).length}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <EquipmentIcon size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Filtrirana oprema</p>
                  <h3 className="text-lg font-bold text-slate-900">{filteredEquipment.length}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Pretraži po serijskom broju, opisu, tehničaru..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-10 pr-4 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-slate-50"
                />
              </div>
              
              {/* Category Filter */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                >
                  <option value="">Sve kategorije</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-slate-50"
                />
                <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              <Button 
                type="secondary" 
                size="medium" 
                prefix={<RefreshIcon size={16} />}
                onClick={handleReset}
              >
                Resetuj
              </Button>
              <Button 
                type="primary" 
                size="medium" 
                prefix={<RefreshIcon size={16} />}
                onClick={fetchFullDefectiveEquipment}
              >
                Osveži
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
              <p className="text-slate-600 font-medium">Učitava neispravnu opremu...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-50 rounded-xl mb-4">
                <AlertTriangleIcon size={48} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Greška</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <Button 
                type="primary" 
                size="medium" 
                onClick={fetchFullDefectiveEquipment}
              >
                Pokušaj ponovo
              </Button>
            </div>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-slate-50 rounded-xl mb-4">
                <EquipmentIcon size={64} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema neispravne opreme</h3>
              <p className="text-slate-600">
                {equipment.length === 0 
                  ? 'Trenutno nema opreme označene kao neispravna.'
                  : 'Nema opreme koja odgovara trenutnim filterima.'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Oprema
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Serijski broj
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Lokacija
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Uklonio tehničar
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Work Order
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Datum uklanjanja
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Razlog
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentEquipment.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.category}</div>
                            <div className="text-sm text-slate-500">{item.description}</div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{item.serialNumber}</span>
                        </td>
                        
                        <td className="px-6 py-4">
                          {getStatusBadge(item.status)}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-slate-700">
                            <MapPinIcon size={14} className="mr-1 text-slate-400" />
                            {item.location}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          {item.removalInfo ? (
                            <div className="flex items-center text-sm text-slate-700">
                              <UserIcon size={14} className="mr-1 text-slate-400" />
                              <span>{item.removalInfo.removedByName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">N/A</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          {item.removalInfo?.workOrder ? (
                            <div className="flex items-start text-sm">
                              <ClipboardIcon size={14} className="mr-1 mt-0.5 text-slate-400 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-slate-900">TIS: {item.removalInfo.workOrder.tisId}</div>
                                <div className="text-slate-600">{item.removalInfo.workOrder.userName}</div>
                                <div className="text-slate-500 text-xs">{item.removalInfo.workOrder.address}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">N/A</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-slate-700">
                            <CalendarIcon size={14} className="mr-1 text-slate-400" />
                            {formatDate(item.removalInfo?.removalDate || item.removedAt)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-700">
                            {item.removalInfo?.reason || 'Neispravno'}
                            {item.removalInfo?.isWorking === false && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                                Ne radi
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600">
                  Prikazuje se <span className="font-medium text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredEquipment.length)}</span> od <span className="font-medium text-slate-900">{filteredEquipment.length}</span> stavki
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    type="secondary"
                    size="small"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Prethodna
                  </Button>
                  
                  <span className="px-3 py-1 text-sm font-medium text-slate-700">
                    {currentPage} od {totalPages}
                  </span>
                  
                  <Button
                    type="secondary"
                    size="small"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Sledeća
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* USER EQUIPMENT SECTION - COMMENTED OUT AS REQUESTED */}
      {/*
      <div className="section-divider">
        <h2 className="section-title">
          <UserIcon size={24} />
          Oprema instalirana kod korisnika
        </h2>
        <p className="section-subtitle">
          Pregled sve opreme instalirane kod korisnika sa detaljima
        </p>
      </div>

      <div className="controls-section">
        <div className="search-section">
          <div className="search-input-container">
            <SearchIcon size={20} />
            <input
              type="text"
              placeholder="Pretraži po serijskom broju opreme..."
              value={userEquipmentSearchTerm}
              onChange={(e) => setUserEquipmentSearchTerm(e.target.value)}
              className="search-input"
            />
            <button onClick={handleUserEquipmentSearch} className="search-btn">
              <SearchIcon size={16} />
              Pretraži
            </button>
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>
              <UserIcon size={16} />
              Korisnik:
            </label>
            <select
              value={userFilter}
              onChange={handleUserFilterChange}
              className="filter-select"
            >
              <option value="">Svi korisnici</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} - {user.tisId}
                </option>
              ))}
            </select>
          </div>

          <div className="action-buttons">
            <button onClick={handleUserEquipmentReset} className="reset-btn">
              <RefreshIcon size={16} />
              Resetuj
            </button>
            
            <button onClick={() => userFilter ? fetchUserEquipment(userFilter) : fetchUserEquipment()} className="refresh-btn">
              <RefreshIcon size={16} />
              Osveži
            </button>
          </div>
        </div>
      </div>

      <div className="content-section">
        {userEquipmentLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Učitava korisničku opremu...</p>
          </div>
        ) : userEquipmentError ? (
          <div className="error-state">
            <AlertTriangleIcon size={48} />
            <h3>Greška</h3>
            <p>{userEquipmentError}</p>
            <button onClick={() => userFilter ? fetchUserEquipment(userFilter) : fetchUserEquipment()} className="retry-btn">
              Pokušaj ponovo
            </button>
          </div>
        ) : filteredUserEquipment.length === 0 ? (
          <div className="empty-state">
            <EquipmentIcon size={64} />
            <h3>Nema korisničke opreme</h3>
            <p>
              {userEquipment.length === 0 
                ? 'Trenutno nema opreme instalirane kod korisnika.'
                : 'Nema opreme koja odgovara trenutnim filterima.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="defective-table">
                <thead>
                  <tr>
                    <th>Oprema</th>
                    <th>Serijski broj</th>
                    <th>Status</th>
                    <th>Korisnik</th>
                    <th>Lokacija</th>
                    <th>Datum instalacije</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUserEquipment.map((item) => (
                    <tr key={item._id || item.id}>
                      <td>
                        <div className="equipment-info">
                          <div className="equipment-category">{item.category || item.equipmentType}</div>
                          <div className="equipment-description">{item.description || item.equipmentDescription}</div>
                        </div>
                      </td>
                      
                      <td>
                        <span className="serial-number">{item.serialNumber}</span>
                      </td>
                      
                      <td>
                        {getStatusBadge(item.status)}
                      </td>
                      
                      <td>
                        <div className="user-info">
                          <UserIcon size={14} />
                          <span>
                            {getUserNameForDisplay(item)}
                            {item.userTisId && <span className="user-tisid"> (TIS: {item.userTisId})</span>}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div className="location-info">
                          <MapPinIcon size={14} />
                          {item.location}
                        </div>
                      </td>
                      
                      <td>
                        <div className="date-info">
                          <CalendarIcon size={14} />
                          {formatDate(item.installedAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {userEquipmentTotalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <span>
                    Prikazuje se {((userEquipmentCurrentPage - 1) * userEquipmentItemsPerPage) + 1}-{Math.min(userEquipmentCurrentPage * userEquipmentItemsPerPage, filteredUserEquipment.length)} od {filteredUserEquipment.length} stavki
                  </span>
                </div>
                
                <div className="pagination-controls">
                  <button
                    disabled={userEquipmentCurrentPage === 1}
                    onClick={() => setUserEquipmentCurrentPage(prev => prev - 1)}
                    className="pagination-btn"
                  >
                    Prethodna
                  </button>
                  
                  <span className="page-info">
                    Strana {userEquipmentCurrentPage} od {userEquipmentTotalPages}
                  </span>
                  
                  <button
                    disabled={userEquipmentCurrentPage === userEquipmentTotalPages}
                    onClick={() => setUserEquipmentCurrentPage(prev => prev + 1)}
                    className="pagination-btn"
                  >
                    Sledeća
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      */}
    </div>
  );
};

export default DefectiveEquipment;