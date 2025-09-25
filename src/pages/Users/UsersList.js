import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import axios from 'axios';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/button-1';
import { SearchIcon, UserIcon, PhoneIcon, MapPinIcon, ClipboardIcon, CloseIcon, RefreshIcon, EquipmentIcon, CalendarIcon, FilterIcon, EyeIcon, SettingsIcon, CheckIcon } from '../../components/icons/SvgIcons';

const UsersList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Server-side pagination state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });
  const [dashboardStats, setDashboardStats] = useState({ total: 0, withWorkOrders: 0, withEquipment: 0 });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userWorkOrders, setUserWorkOrders] = useState([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [userEquipment, setUserEquipment] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Improved filters
  const [hasWorkOrdersFilter, setHasWorkOrdersFilter] = useState('');
  const [hasEquipmentFilter, setHasEquipmentFilter] = useState('');

  // Column visibility
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    user: true,
    contact: true,
    location: true,
    tisId: true,
    workOrders: true,
    equipment: true,
    actions: true
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when pagination, search, or filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.currentPage, debouncedSearchTerm, hasWorkOrdersFilter, hasEquipmentFilter, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    fetchDashboardStats();
    fetchUsers();
  }, []);

  // Restore modal state from navigation if coming back from work order detail
  useEffect(() => {
    if (location.state?.selectedUserId && location.state?.fromWorkOrderDetail && users.length > 0) {
      const userId = location.state.selectedUserId;
      const user = users.find(u => u._id === userId);
      if (user && !selectedUser) {
        handleUserSelect(user);
      }
    }
  }, [users, location.state, selectedUser]);

  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest('.relative')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnDropdown]);

  // Fetch dashboard stats (lightweight call)
  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/users?statsOnly=true`);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Main fetch function with server-side pagination
  const fetchUsers = async (page = pagination.currentPage) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearchTerm,
        hasWorkOrders: hasWorkOrdersFilter,
        hasEquipment: hasEquipmentFilter,
        sortBy,
        sortOrder
      });

      const response = await axios.get(`${apiUrl}/api/users?${params.toString()}`);
      const { users: userData, pagination: paginationData, performance: performanceData } = response.data;

      setUsers(userData);
      setPagination(paginationData);
      setPerformance(performanceData);

      // Update current page in state if different
      if (paginationData.currentPage !== pagination.currentPage) {
        setPagination(prev => ({ ...prev, currentPage: paginationData.currentPage }));
      }

    } catch (error) {
      console.error('Greška pri učitavanju korisnika:', error);
      setError('Greška pri učitavanju korisnika. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje korisnika!');
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [pagination.totalPages]);

  // Handle sort change
  const handleSortChange = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [sortBy]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardStats(),
      fetchUsers(pagination.currentPage)
    ]);
    if (selectedUser) {
      await fetchUserWorkOrders(selectedUser._id);
      await fetchUserEquipment(selectedUser._id);
    }
    setIsRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  // Reset filters and search
  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setHasWorkOrdersFilter('');
    setHasEquipmentFilter('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setSortBy('name');
    setSortOrder('asc');
  };

  const fetchUserWorkOrders = async (userId) => {
    setLoadingWorkOrders(true);
    try {
      const response = await axios.get(`${apiUrl}/api/users/${userId}/workorders`);
      setUserWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga korisnika:', error);
      toast.error('Neuspešno učitavanje radnih naloga korisnika!');
    } finally {
      setLoadingWorkOrders(false);
    }
  };

  const fetchUserEquipment = async (userId) => {
    setLoadingEquipment(true);
    try {
      const response = await axios.get(`${apiUrl}/api/user-equipment/user/${userId}`);
      setUserEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opreme korisnika:', error);
      toast.error('Neuspešno učitavanje opreme korisnika!');
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleUserSelect = (user) => {
    if (selectedUser && selectedUser._id === user._id) {
      setSelectedUser(null);
      setUserWorkOrders([]);
      setUserEquipment([]);
      // Clear navigation state
      navigate(location.pathname, { replace: true });
    } else {
      setSelectedUser(user);
      fetchUserWorkOrders(user._id);
      fetchUserEquipment(user._id);
    }
  };

  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Helper function to check if user was found by equipment search
  const isFoundByEquipment = (user) => {
    if (!debouncedSearchTerm || !user.installedEquipment) return false;
    return user.installedEquipment.some(eq =>
      eq.serialNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      eq.category?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      eq.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  };

  // Calculate stats - use dashboard stats if available, otherwise calculate from current data
  const stats = dashboardStats.total ? dashboardStats : {
    total: pagination.totalCount,
    withWorkOrders: users.filter(user => (user.workOrdersCount || 0) > 0).length,
    withEquipment: users.filter(user => user.equipmentCount > 0).length
  };

  // Formatiranje datuma
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };

  // Formatiranje statusa
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

  const getLastWorkOrderStatus = (user) => {
    // For list view, we don't have detailed work orders, only count
    // We'll need to fetch work orders details if we want to show status
    if (!user.workOrders || user.workOrders.length === 0) {
      return null;
    }

    // Sort by date and get the most recent work order
    const sortedOrders = [...user.workOrders].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sortedOrders[0]?.status;
  };

  const getRowBackgroundClass = (user) => {
    const lastStatus = getLastWorkOrderStatus(user);
    if (!lastStatus) return 'bg-white';

    switch (lastStatus) {
      case 'zavrsen': return 'bg-green-50 hover:bg-green-100';
      case 'nezavrsen': return 'bg-red-50 hover:bg-red-100';
      case 'odlozen': return 'bg-yellow-50 hover:bg-yellow-100';
      case 'otkazan': return 'bg-gray-50 hover:bg-gray-100';
      default: return 'bg-white';
    }
  };

  // Pagination component
  const PaginationComponent = () => {
    if (pagination.totalPages <= 1) return null;

    const getVisiblePages = () => {
      const current = pagination.currentPage;
      const total = pagination.totalPages;
      const delta = 2;

      let pages = [];

      // Always show first page
      if (current > delta + 1) {
        pages.push(1);
        if (current > delta + 2) pages.push('...');
      }

      // Show pages around current
      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        pages.push(i);
      }

      // Always show last page
      if (current < total - delta) {
        if (current < total - delta - 1) pages.push('...');
        pages.push(total);
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
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

          {getVisiblePages().map((page, index) => (
            <Button
              key={index}
              type={page === pagination.currentPage ? "primary" : "tertiary"}
              size="small"
              onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
              disabled={page === '...'}
              className={page === pagination.currentPage ?
                "!bg-blue-600 !text-white !hover:bg-blue-700" :
                "hover:bg-gray-100"
              }
            >
              {page}
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
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UserIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Korisnici</h1>
              <p className="text-slate-600 mt-1">Server-side pagination - {pagination.totalCount} korisnika</p>
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
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno korisnika</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardLoading ? (
                    <span className="animate-pulse bg-slate-200 rounded w-8 h-6 inline-block"></span>
                  ) : (
                    stats.total
                  )}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ClipboardIcon size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Sa radnim nalozima</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardLoading ? (
                    <span className="animate-pulse bg-slate-200 rounded w-8 h-6 inline-block"></span>
                  ) : (
                    stats.withWorkOrders
                  )}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <EquipmentIcon size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Sa opremom</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardLoading ? (
                    <span className="animate-pulse bg-slate-200 rounded w-8 h-6 inline-block"></span>
                  ) : (
                    stats.withEquipment
                  )}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* Table Controls */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Pretraga po imenu, adresi, telefonu, TIS ID-u..."
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

              {/* Has Work Orders Filter */}
              <div className="relative">
                <select
                  value={hasWorkOrdersFilter}
                  onChange={(e) => {
                    setHasWorkOrdersFilter(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                >
                  <option value="">Svi korisnici</option>
                  <option value="has">Sa radnim nalozima</option>
                  <option value="no">Bez radnih naloga</option>
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>

              {/* Has Equipment Filter */}
              <div className="relative">
                <select
                  value={hasEquipmentFilter}
                  onChange={(e) => {
                    setHasEquipmentFilter(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                >
                  <option value="">Sva oprema</option>
                  <option value="has">Sa opremom</option>
                  <option value="no">Bez opreme</option>
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              {/* Clear Filters */}
              {(searchTerm || hasWorkOrdersFilter || hasEquipmentFilter || sortBy !== 'name') && (
                <Button
                  type="tertiary"
                  size="small"
                  onClick={clearAllFilters}
                >
                  Obriši filtere
                </Button>
              )}

              {/* Column Visibility */}
              <div className="relative">
                <Button
                  type="tertiary"
                  size="medium"
                  prefix={<EyeIcon size={16} />}
                  onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                >
                  Kolone
                </Button>

                {showColumnDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-md shadow-md z-50">
                    <div className="p-1">
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Prikaži kolone</div>
                      {Object.entries({
                        user: 'Korisnik',
                        contact: 'Kontakt',
                        location: 'Lokacija',
                        tisId: 'TIS ID',
                        workOrders: 'Radni nalozi',
                        equipment: 'Oprema',
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-6 mt-6 rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-slate-600">Učitavanje korisnika...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Nema pronađenih korisnika</p>
              {(searchTerm || hasWorkOrdersFilter || hasEquipmentFilter) && (
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
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.user && (
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSortChange('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Korisnik</span>
                          {sortBy === 'name' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    )}
                    {visibleColumns.contact && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Kontakt
                      </th>
                    )}
                    {visibleColumns.location && (
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSortChange('address')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Lokacija</span>
                          {sortBy === 'address' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    )}
                    {visibleColumns.tisId && (
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSortChange('tisId')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>TIS ID</span>
                          {sortBy === 'tisId' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    )}
                    {visibleColumns.workOrders && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Radni nalozi
                      </th>
                    )}
                    {visibleColumns.equipment && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Oprema
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Akcije
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map(user => (
                    <tr
                      key={user._id}
                      onClick={() => handleUserSelect(user)}
                      className={`${getRowBackgroundClass(user)} transition-colors cursor-pointer`}
                    >
                      {visibleColumns.user && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <UserIcon size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                {isFoundByEquipment(user) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    <EquipmentIcon size={12} className="mr-1" />
                                    Oprema
                                  </span>
                                )}
                              </div>
                              {user.role && <div className="text-xs text-slate-500">{user.role}</div>}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.contact && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <PhoneIcon size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-900">{user.phone || 'Nije dostupan'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.location && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <MapPinIcon size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-900">{user.address}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.tisId && (
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.tisId}
                          </span>
                        </td>
                      )}
                      {visibleColumns.workOrders && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <ClipboardIcon size={14} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{user.workOrdersCount || 0}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.equipment && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <EquipmentIcon size={14} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{user.equipmentCount || 0}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4">
                          <Button
                            type="tertiary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserSelect(user);
                            }}
                            prefix={<EyeIcon size={14} />}
                          >
                            Detalji
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Server-side Pagination */}
        <PaginationComponent />
      </div>

      {/* Modal - unchanged */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => { setSelectedUser(null); setUserWorkOrders([]); setUserEquipment([]); navigate(location.pathname, { replace: true }); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <UserIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Detalji korisnika: {selectedUser.name}</h2>
                  <p className="text-slate-600">TIS ID: {selectedUser.tisId}</p>
                </div>
              </div>
              <Button
                type="tertiary"
                size="medium"
                onClick={() => {
                  setSelectedUser(null);
                  setUserWorkOrders([]);
                  setUserEquipment([]);
                  navigate(location.pathname, { replace: true });
                }}
                svgOnly
              >
                <CloseIcon size={20} />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Equipment Section */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <EquipmentIcon size={20} className="text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Instalirana oprema</h3>
                </div>

                {loadingEquipment ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <p className="ml-3 text-slate-600">Učitavanje opreme...</p>
                  </div>
                ) : userEquipment.length === 0 ? (
                  <div className="text-center py-8">
                    <EquipmentIcon size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nema instalirane opreme kod ovog korisnika</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Oprema</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serijski broj</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum instalacije</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {userEquipment.map(equipment => (
                          <tr key={equipment._id || equipment.id} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{equipment.category || equipment.equipmentType}</div>
                                <div className="text-xs text-slate-500">{equipment.description || equipment.equipmentDescription}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono text-slate-900">{equipment.serialNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Instalirano
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <CalendarIcon size={14} className="text-slate-400" />
                                <span className="text-sm text-slate-900">{formatDate(equipment.installedAt)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Work Orders Section */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <ClipboardIcon size={20} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Radni nalozi</h3>
                </div>

                {loadingWorkOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    <p className="ml-3 text-slate-600">Učitavanje radnih naloga...</p>
                  </div>
                ) : userWorkOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardIcon size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nema radnih naloga za ovog korisnika</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tehničar</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {userWorkOrders.map(order => (
                          <tr key={order._id} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <CalendarIcon size={14} className="text-slate-400" />
                                <span className="text-sm text-slate-900">{formatDate(order.date)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-slate-900">{order.type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-slate-900">{order.technicianId?.name || 'Nedodeljen'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                order.status === 'zavrsen' && "bg-green-100 text-green-800",
                                order.status === 'nezavrsen' && "bg-yellow-100 text-yellow-800",
                                order.status === 'odlozen' && "bg-orange-100 text-orange-800",
                                order.status === 'otkazan' && "bg-red-100 text-red-800"
                              )}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                to={`/work-orders/${order._id}`}
                                state={{
                                  fromUsersList: true,
                                  selectedUserId: selectedUser._id,
                                  previousPath: location.pathname
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Detalji
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersList;