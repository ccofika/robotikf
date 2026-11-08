import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, Search, X, Eye, Package, ArrowUpRight, UserRound } from 'lucide-react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { getTimRowStyle } from '../../utils/tim';
import { useWorkOrderModal } from '../../context/WorkOrderModalContext';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { Select } from '../../security/sx/forms';
import { SheetSection } from '../../security/sx/Sheet';
import { ColumnMenu, Loading, LinkBtn } from '../../montaza/ui';
import './UsersList.mx.css';

// Tonovi statusa naloga (isti kao u ostatku Montaže)
const STATUS_TONE = { zavrsen: 'ok', nezavrsen: 'warn', odlozen: 'info', otkazan: 'bad' };

const UsersList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshCounter } = useWorkOrderModal();

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

  // Search and filter states - read initial search from URL if present
  const urlSearch = new URLSearchParams(location.search).get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(urlSearch);
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
  const [visibleColumns, setVisibleColumns] = useState({
    user: true,
    contact: true,
    location: true,
    tisId: true,
    workOrders: true,
    equipment: true,
    actions: true
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
    fetchUsers();
  }, [pagination.currentPage, debouncedSearchTerm, hasWorkOrdersFilter, hasEquipmentFilter, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    fetchDashboardStats();
    fetchUsers();
  }, []);

  // Refresh data when modal signals changes
  useEffect(() => {
    if (refreshCounter > 0) {
      fetchUsers();
      fetchDashboardStats();
    }
  }, [refreshCounter]);

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

  // Fetch dashboard stats (lightweight call)
  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const response = await api.get('/api/users?statsOnly=true');
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

      const response = await api.get(`/api/users?${params.toString()}`);
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
      const response = await api.get(`/api/users/${userId}/workorders`);
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
      const response = await api.get(`/api/user-equipment/user/${userId}`);
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

  const closeUserDetails = () => {
    setSelectedUser(null);
    setUserWorkOrders([]);
    setUserEquipment([]);
    navigate(location.pathname, { replace: true });
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

  // Blaga boja reda po statusu poslednjeg naloga (tonovi iz tokena, UsersList.mx.css)
  const getRowBackgroundClass = (user) => {
    const lastStatus = getLastWorkOrderStatus(user);
    return lastStatus && STATUS_TONE[lastStatus] ? `mx-users-row--${STATUS_TONE[lastStatus]}` : '';
  };

  // Zaglavlje kolone koja se sortira (klik menja smer, strelica pokazuje trenutni)
  const sortHead = (field, label) => (
    <button type="button" className="mx-users-sort" onClick={() => handleSortChange(field)}>
      <span>{label}</span>
      {sortBy === field && <span className="mx-users-sort__dir">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
  const ariaSort = (field) => (sortBy === field ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined);
  const statValue = (n) => (dashboardLoading ? <span className="sx-skeleton mx-users-sk" aria-hidden="true" /> : n);

  // Pagination component (ista logika kao ranije: ±2 strane oko trenutne, prva i poslednja, '...')
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
      <nav className="mx-pager" aria-label="Stranice">
        <span className="mx-pager__text">
          Prikazano {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} od {pagination.totalCount} rezultata
          {performance.queryTime && (
            <span className="mx-users-ms">({performance.queryTime}ms)</span>
          )}
        </span>
        <span className="mx-pager__btns">
          <Btn size="sm" variant="ghost" className="mx-pager__num" onClick={() => handlePageChange(1)} disabled={!pagination.hasPreviousPage}>
            &laquo;
          </Btn>
          <Btn size="sm" variant="ghost" className="mx-pager__num" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPreviousPage}>
            &lsaquo;
          </Btn>

          {getVisiblePages().map((page, index) => (
            <Btn
              key={index}
              size="sm"
              variant={page === pagination.currentPage ? 'primary' : 'ghost'}
              className="mx-pager__num"
              onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
              disabled={page === '...'}
              aria-current={page === pagination.currentPage ? 'page' : undefined}
            >
              {page}
            </Btn>
          ))}

          <Btn size="sm" variant="ghost" className="mx-pager__num" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>
            &rsaquo;
          </Btn>
          <Btn size="sm" variant="ghost" className="mx-pager__num" onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>
            &raquo;
          </Btn>
        </span>
      </nav>
    );
  };

  return (
    <div className="sx-page" data-testid="page-users">
      <PageHead
        eyebrow="Montaža · Korisnici"
        title="Korisnici"
        lead={`Server-side pagination - ${pagination.totalCount} korisnika`}
        actions={(
          <Btn icon={RefreshCw} onClick={handleRefresh} busy={isRefreshing || dashboardLoading || loading}>
            Osveži
          </Btn>
        )}
      />

      <div className="sx-stats mx-users-stats">
        <Stat label="Ukupno korisnika" value={statValue(stats.total)} />
        <Stat label="Sa radnim nalozima" value={statValue(stats.withWorkOrders)} />
        <Stat label="Sa opremom" value={statValue(stats.withEquipment)} />
      </div>

      <Panel pad={false} className="mx-users-card">
        <div className="mx-users-bar">
          <div className={cx('sx-search', searchTerm && 'has-value')}>
            <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
            <input
              type="text"
              placeholder="Pretraga po imenu, adresi, telefonu, TIS ID-u..."
              aria-label="Pretraga po imenu, adresi, telefonu, TIS ID-u..."
              value={searchTerm}
              onChange={handleSearch}
              data-testid="users-search"
            />
            {searchTerm && (
              <button
                type="button"
                className="sx-search__clear"
                aria-label="Obriši pretragu"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearchTerm('');
                }}
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          <Select
            size="sm"
            aria-label="Radni nalozi"
            value={hasWorkOrdersFilter}
            onChange={(e) => {
              setHasWorkOrdersFilter(e.target.value);
              setPagination(prev => ({ ...prev, currentPage: 1 }));
            }}
            data-testid="users-filter-workorders"
          >
            <option value="">Svi korisnici</option>
            <option value="has">Sa radnim nalozima</option>
            <option value="no">Bez radnih naloga</option>
          </Select>

          <Select
            size="sm"
            aria-label="Oprema"
            value={hasEquipmentFilter}
            onChange={(e) => {
              setHasEquipmentFilter(e.target.value);
              setPagination(prev => ({ ...prev, currentPage: 1 }));
            }}
            data-testid="users-filter-equipment"
          >
            <option value="">Sva oprema</option>
            <option value="has">Sa opremom</option>
            <option value="no">Bez opreme</option>
          </Select>

          <div className="mx-users-bar__end">
            {(searchTerm || hasWorkOrdersFilter || hasEquipmentFilter || sortBy !== 'name') && (
              <Btn size="sm" variant="ghost" onClick={clearAllFilters}>Obriši filtere</Btn>
            )}
            <ColumnMenu
              columns={{
                user: 'Korisnik',
                contact: 'Kontakt',
                location: 'Lokacija',
                tisId: 'TIS ID',
                workOrders: 'Radni nalozi',
                equipment: 'Oprema',
                actions: 'Akcije'
              }}
              visible={visibleColumns}
              onChange={(key, v) => setVisibleColumns(prev => ({ ...prev, [key]: v }))}
            />
          </div>
        </div>

        {error && <div className="mx-users-err"><Note tone="bad">{error}</Note></div>}

        {loading ? (
          <Loading text="Učitavanje korisnika..." />
        ) : users.length === 0 ? (
          <div className="sx-empty-block">
            <b>Nema pronađenih korisnika</b>
            {(searchTerm || hasWorkOrdersFilter || hasEquipmentFilter) && (
              <Btn size="sm" onClick={clearAllFilters}>Obriši filtere</Btn>
            )}
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="users-table">
              <thead>
                <tr>
                  {visibleColumns.user && <th aria-sort={ariaSort('name')}>{sortHead('name', 'Korisnik')}</th>}
                  {visibleColumns.contact && <th>Kontakt</th>}
                  {visibleColumns.location && <th aria-sort={ariaSort('address')}>{sortHead('address', 'Lokacija')}</th>}
                  {visibleColumns.tisId && <th aria-sort={ariaSort('tisId')}>{sortHead('tisId', 'TIS ID')}</th>}
                  {visibleColumns.workOrders && <th className="is-num">Radni nalozi</th>}
                  {visibleColumns.equipment && <th className="is-num">Oprema</th>}
                  {visibleColumns.actions && <th className="is-end">Akcije</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr
                    key={user._id}
                    style={{ '--i': i }}
                    className={cx('is-click', getRowBackgroundClass(user))}
                    tabIndex={0}
                    onClick={() => handleUserSelect(user)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUserSelect(user); }}
                    data-testid="user-row"
                  >
                    {visibleColumns.user && (
                      <td className="is-head">
                        <div className="sx-cell sx-cell--who mx-users-who">
                          <span className="mx-users-ico" aria-hidden="true"><UserRound size={16} strokeWidth={1.8} /></span>
                          <b>{user.name}</b>
                          {(user.role || isFoundByEquipment(user)) && (
                            <span className="mx-users-sub">
                              {user.role}
                              {isFoundByEquipment(user) && (
                                <span className="sx-tag is-warn"><Package aria-hidden="true" strokeWidth={2} />Oprema</span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.contact && (
                      <td data-label="Kontakt">
                        {user.phone ? <span className="sx-mono sx-nowrap">{user.phone}</span> : <span className="sx-faint">Nije dostupan</span>}
                      </td>
                    )}
                    {visibleColumns.location && <td data-label="Lokacija" className="is-wide">{user.address}</td>}
                    {visibleColumns.tisId && <td data-label="TIS ID"><span className="sx-uid sx-nowrap">{user.tisId}</span></td>}
                    {visibleColumns.workOrders && <td data-label="Radni nalozi" className="is-num">{user.workOrdersCount || 0}</td>}
                    {visibleColumns.equipment && <td data-label="Oprema" className="is-num">{user.equipmentCount || 0}</td>}
                    {visibleColumns.actions && (
                      <td className="is-actions is-end">
                        <div className="sx-rowacts">
                          <Btn
                            size="sm"
                            variant="ghost"
                            icon={Eye}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserSelect(user);
                            }}
                          >
                            Detalji
                          </Btn>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination */}
        <PaginationComponent />
      </Panel>

      {/* Detalji korisnika: sx dijalog u portalu, ispod sloja detalja naloga (WorkOrderModal, z 9999) koji se otvara iz njega */}
      {selectedUser && createPortal(
        <div className="sx-portal">
          <div className="sx-dialog-backdrop mx-users-backdrop" onClick={closeUserDetails}>
            <div
              className="sx-dialog sx-dialog--xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mx-users-detail-title"
              onClick={(e) => e.stopPropagation()}
              data-testid="user-details"
            >
              <div className="sx-dialog__head">
                <div className="sx-dialog__titles">
                  <span className="sx-eyebrow sx-dialog__eyebrow">Korisnici</span>
                  <h2 id="mx-users-detail-title" className="sx-dialog__title">Detalji korisnika: {selectedUser.name}</h2>
                  <p className="sx-dialog__desc">TIS ID: {selectedUser.tisId}</p>
                </div>
                <button type="button" className="sx-dialog__close" onClick={closeUserDetails} aria-label="Zatvori" data-testid="user-details-close">
                  <X size={18} strokeWidth={1.8} />
                </button>
              </div>

              <div className="sx-dialog__body">
                <SheetSection title="Instalirana oprema">
                  {loadingEquipment ? (
                    <Loading rows={2} text="Učitavanje opreme..." />
                  ) : userEquipment.length === 0 ? (
                    <div className="sx-empty"><span>Nema instalirane opreme kod ovog korisnika</span></div>
                  ) : (
                    <div className="sx-tablewrap">
                      <table className="sx-table">
                        <thead>
                          <tr>
                            <th>Oprema</th>
                            <th>Serijski broj</th>
                            <th>Status</th>
                            <th>Datum instalacije</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userEquipment.map((equipment, i) => (
                            <tr key={equipment._id || equipment.id} style={{ '--i': i }}>
                              <td className="is-head">
                                <div className="sx-cell">
                                  <b>{equipment.category || equipment.equipmentType}</b>
                                  <span>{equipment.description || equipment.equipmentDescription}</span>
                                </div>
                              </td>
                              <td data-label="Serijski broj"><span className="sx-mono">{equipment.serialNumber}</span></td>
                              <td data-label="Status"><Sign tone="ok">Instalirano</Sign></td>
                              <td data-label="Datum instalacije"><span className="sx-mono">{formatDate(equipment.installedAt)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SheetSection>

                <SheetSection title="Radni nalozi">
                  {loadingWorkOrders ? (
                    <Loading rows={2} text="Učitavanje radnih naloga..." />
                  ) : userWorkOrders.length === 0 ? (
                    <div className="sx-empty"><span>Nema radnih naloga za ovog korisnika</span></div>
                  ) : (
                    <div className="sx-tablewrap">
                      <table className="sx-table">
                        <thead>
                          <tr>
                            <th>Datum</th>
                            <th>Tip</th>
                            <th>Tehničar</th>
                            <th>Status</th>
                            <th className="is-end">Akcije</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userWorkOrders.map((order, i) => (
                            <tr key={order._id} style={{ '--i': i, ...getTimRowStyle(order.tim) }}>
                              <td className="is-head"><span className="sx-mono">{formatDate(order.date)}</span></td>
                              <td data-label="Tip" className="is-wide"><b className="mx-strong">{order.type}</b></td>
                              <td data-label="Tehničar">{order.technicianId?.name || 'Nedodeljen'}</td>
                              <td data-label="Status"><Sign tone={STATUS_TONE[order.status] || 'idle'}>{getStatusLabel(order.status)}</Sign></td>
                              <td className="is-actions is-end">
                                <div className="sx-rowacts">
                                  <LinkBtn
                                    size="sm"
                                    variant="ghost"
                                    iconRight={ArrowUpRight}
                                    to={`/work-orders/${order._id}`}
                                    state={{
                                      backgroundLocation: location,
                                      fromUsersList: true,
                                      selectedUserId: selectedUser._id,
                                      previousPath: location.pathname
                                    }}
                                  >
                                    Detalji
                                  </LinkBtn>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SheetSection>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UsersList;
