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
import axios from 'axios';
import { toast } from 'react-toastify';
import './DefectiveEquipment.css';

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
    fetchDefectiveEquipment();
    fetchUsers();
  }, []);

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
  
  const fetchDefectiveEquipment = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Fetching defective equipment...');
      const response = await axios.get(`${apiUrl}/api/defective-equipment`);
      
      if (response.data.success) {
        setEquipment(response.data.data);
        setStats(response.data.stats);
        console.log('✅ Defective equipment loaded:', response.data.data.length);
      } else {
        throw new Error(response.data.message || 'Greška pri učitavanju');
      }
    } catch (error) {
      console.error('❌ Error fetching defective equipment:', error);
      setError('Greška pri učitavanju neispravne opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje neispravne opreme!');
    } finally {
      setLoading(false);
    }
  };
  
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
      'defective': { label: 'Neispravno', className: 'status-defective' },
      'available': { label: 'Dostupno', className: 'status-available' },
      'assigned': { label: 'Dodeljeno', className: 'status-assigned' },
      'installed': { label: 'Instalirano', className: 'status-installed' }
    };
    
    const config = statusConfig[status] || { label: status, className: 'status-unknown' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
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
    <div className="defective-equipment-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <div className="page-title-section">
            <h1 className="defective-page-title">
              <AlertTriangleIcon size={28} />
              Neispravna oprema
            </h1>
            <p className="page-subtitle">
              Pregled sve opreme označene kao neispravna sa detaljima o uklanjanju
            </p>
          </div>
        </div>
        
        <div className="header-stats">
          {stats && (
            <>
              <div className="stat-card">
                <div className="defective-stat-icon">
                  <AlertTriangleIcon size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">{stats.total}</span>
                  <span className="stat-label">Ukupno neispravnih</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="defective-stat-icon success">
                  <ChartIcon size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">{Object.keys(stats.byCategory).length}</span>
                  <span className="stat-label">Kategorija</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="search-section">
          <div className="search-input-container">
            <SearchIcon size={20} />
            <input
              type="text"
              placeholder="Pretraži po serijskom broju, opisu, tehničaru ili TIS ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>
              <FilterIcon size={16} />
              Kategorija:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Sve kategorije</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <CalendarIcon size={16} />
              Datum uklanjanja:
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-date"
            />
          </div>

          <div className="action-buttons">
            <button onClick={handleReset} className="reset-btn">
              <RefreshIcon size={16} />
              Resetuj
            </button>
            
            <button onClick={fetchDefectiveEquipment} className="refresh-btn">
              <RefreshIcon size={16} />
              Osveži
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Učitava neispravnu opremu...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertTriangleIcon size={48} />
            <h3>Greška</h3>
            <p>{error}</p>
            <button onClick={fetchDefectiveEquipment} className="retry-btn">
              Pokušaj ponovo
            </button>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="empty-state">
            <EquipmentIcon size={64} />
            <h3>Nema neispravne opreme</h3>
            <p>
              {equipment.length === 0 
                ? 'Trenutno nema opreme označene kao neispravna.'
                : 'Nema opreme koja odgovara trenutnim filterima.'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="table-container">
              <table className="defective-table">
                <thead>
                  <tr>
                    <th>Oprema</th>
                    <th>Serijski broj</th>
                    <th>Status</th>
                    <th>Lokacija</th>
                    <th>Uklonio tehničar</th>
                    <th>Work Order</th>
                    <th>Datum uklanjanja</th>
                    <th>Razlog</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEquipment.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="equipment-info">
                          <div className="equipment-category">{item.category}</div>
                          <div className="equipment-description">{item.description}</div>
                        </div>
                      </td>
                      
                      <td>
                        <span className="serial-number">{item.serialNumber}</span>
                      </td>
                      
                      <td>
                        {getStatusBadge(item.status)}
                      </td>
                      
                      <td>
                        <div className="location-info">
                          <MapPinIcon size={14} />
                          {item.location}
                        </div>
                      </td>
                      
                      <td>
                        {item.removalInfo ? (
                          <div className="technician-info">
                            <UserIcon size={14} />
                            <span>{item.removalInfo.removedByName}</span>
                          </div>
                        ) : (
                          <span className="no-info">N/A</span>
                        )}
                      </td>
                      
                      <td>
                        {item.removalInfo?.workOrder ? (
                          <div className="workorder-info">
                            <ClipboardIcon size={14} />
                            <div>
                              <div className="tis-id">TIS: {item.removalInfo.workOrder.tisId}</div>
                              <div className="user-name">{item.removalInfo.workOrder.userName}</div>
                              <div className="address">{item.removalInfo.workOrder.address}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="no-info">N/A</span>
                        )}
                      </td>
                      
                      <td>
                        <div className="date-info">
                          <CalendarIcon size={14} />
                          {formatDate(item.removalInfo?.removalDate || item.removedAt)}
                        </div>
                      </td>
                      
                      <td>
                        <div className="reason-info">
                          {item.removalInfo?.reason || 'Neispravno'}
                          {item.removalInfo?.isWorking === false && (
                            <span className="not-working-badge">Ne radi</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <span>
                    Prikazuje se {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredEquipment.length)} od {filteredEquipment.length} stavki
                  </span>
                </div>
                
                <div className="pagination-controls">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="pagination-btn"
                  >
                    Prethodna
                  </button>
                  
                  <span className="page-info">
                    Strana {currentPage} od {totalPages}
                  </span>
                  
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
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

      {/* User Equipment Section */}
      <div className="section-divider">
        <h2 className="section-title">
          <UserIcon size={24} />
          Oprema instalirana kod korisnika
        </h2>
        <p className="section-subtitle">
          Pregled sve opreme instalirane kod korisnika sa detaljima
        </p>
      </div>

      {/* User Equipment Controls */}
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

      {/* User Equipment Content */}
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
            {/* User Equipment Table */}
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

            {/* User Equipment Pagination */}
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
    </div>
  );
};

export default DefectiveEquipment;