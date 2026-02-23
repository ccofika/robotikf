import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, ViewIcon, DeleteIcon, BoxIcon, ToolsIcon, RefreshIcon, EyeIcon, UserIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { techniciansAPI, reviewsAPI } from '../../services/api';
import { cn } from '../../utils/cn';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './TechniciansList.css';

const TechniciansList = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    status: true,
    createdAt: true,
    employedUntil: true,
    actions: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingDateId, setEditingDateId] = useState(null);

  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Review stats za sve tehničare
  const [reviewStatsMap, setReviewStatsMap] = useState({});

  // Ref za date picker portal
  const datePickerPortalRef = useRef(null);

  useEffect(() => {
    // Preuzmi trenutnog korisnika iz localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    fetchTechnicians();
    fetchAllReviewStats();
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

  const fetchTechnicians = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
      setError('Greška pri učitavanju tehničara. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje tehničara!');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReviewStats = async () => {
    try {
      const response = await reviewsAPI.getAllStats();
      setReviewStatsMap(response.data);
    } catch (error) {
      console.error('[Reviews] Greška pri učitavanju statistike:', error);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete tehničara "${name}"?`)) {
      // OPTIMISTIC UPDATE - immediately remove from UI
      const originalTechnicians = [...technicians];
      setTechnicians(prev => prev.filter(tech => tech._id !== id));

      try {
        await techniciansAPI.delete(id);
        toast.success('Tehničar je uspešno obrisan!');
        // Success - optimistic update already done
      } catch (error) {
        console.error('Greška pri brisanju tehničara:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju tehničara.';
        toast.error(errorMessage);

        // ROLLBACK - restore original data on error
        setTechnicians(originalTechnicians);
      }
    }
  };

  const handleToggleStatus = async (id, name, currentIsActive) => {
    const newIsActive = !currentIsActive;

    // OPTIMISTIC UPDATE
    const originalTechnicians = [...technicians];
    setTechnicians(prev => prev.map(tech =>
      tech._id === id ? { ...tech, isActive: newIsActive } : tech
    ));

    try {
      const response = await techniciansAPI.toggleStatus(id);
      // Sync sa serverovim odgovorom za sigurnost
      setTechnicians(prev => prev.map(tech =>
        tech._id === id ? { ...tech, isActive: response.data.isActive } : tech
      ));
      toast.success(`${name} je sada ${response.data.isActive ? 'aktivan' : 'neaktivan'}`);
    } catch (error) {
      console.error('Greška pri promeni statusa:', error);
      toast.error('Greška pri promeni statusa tehničara.');
      setTechnicians(originalTechnicians);
    }
  };

  const handleEmployedUntilChange = async (id, date) => {
    const originalTechnicians = [...technicians];
    setTechnicians(prev => prev.map(tech =>
      tech._id === id ? { ...tech, employedUntil: date ? date.toISOString() : null } : tech
    ));
    setEditingDateId(null);

    try {
      await techniciansAPI.update(id, { employedUntil: date ? date.toISOString() : null });
      toast.success('Datum zaposlenja ažuriran');
    } catch (error) {
      console.error('Greška pri ažuriranju datuma:', error);
      toast.error('Greška pri ažuriranju datuma.');
      setTechnicians(originalTechnicians);
    }
  };

  // Helper za proveru da li ugovor ističe uskoro (30 dana)
  const getContractStatus = (employedUntil) => {
    if (!employedUntil) return null;
    const now = new Date();
    const expiry = new Date(employedUntil);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'ok';
  };

  // Helper funkcije za proveru role-a
  const isAdminRole = (role) => ['admin', 'superadmin', 'supervisor'].includes(role);
  const isSupervisorLike = (role) => ['superadmin', 'supervisor'].includes(role);

  // Separisanje korisnika na adminske i tehničare
  const { adminUsers, technicianUsers } = useMemo(() => {
    const admins = [];
    const techs = [];

    technicians.forEach(tech => {
      if (isAdminRole(tech.role)) {
        admins.push(tech);
      } else {
        techs.push(tech);
      }
    });

    return { adminUsers: admins, technicianUsers: techs };
  }, [technicians]);

  // Filtriranje tehničara za tabelu
  const filteredTechnicians = useMemo(() => {
    return technicianUsers.filter(technician => {
      const searchMatch = searchTerm === '' ||
                         technician.name.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = statusFilter === 'all' ||
                         (statusFilter === 'active' && technician.isActive !== false) ||
                         (statusFilter === 'inactive' && technician.isActive === false);

      return searchMatch && statusMatch;
    });
  }, [technicianUsers, searchTerm, statusFilter]);

  // Filtriranje admin korisnika - vidljivi samo za superadmin i supervisor
  const visibleAdminUsers = useMemo(() => {
    if (!currentUser) return [];
    if (isSupervisorLike(currentUser.role)) {
      return adminUsers.filter(admin =>
        searchTerm === '' || admin.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return [];
  }, [adminUsers, currentUser, searchTerm]);

  // Statistike
  const activeCount = useMemo(() => technicianUsers.filter(t => t.isActive !== false).length, [technicianUsers]);
  const inactiveCount = useMemo(() => technicianUsers.filter(t => t.isActive === false).length, [technicianUsers]);

  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTechnicians.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredTechnicians.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Kolone za column visibility dropdown
  const columnLabels = {
    name: 'Ime',
    status: 'Status',
    createdAt: 'Datum kreiranja',
    employedUntil: 'Zaposlen do',
    actions: 'Akcije'
  };

  // Računamo ukupan broj vidljivih kolona za colspan
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Date picker portal - van svih overflow containera */}
      <div ref={datePickerPortalRef} id="datepicker-portal" style={{ position: 'fixed', zIndex: 9999 }} />

      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UserIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pregled tehničara</h1>
              <p className="text-slate-600 mt-1">Upravljanje listom tehničara</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/technicians/gps">
              <Button
                type="secondary"
                size="medium"
                prefix={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>}
              >
                GPS Lokacije
              </Button>
            </Link>
            <Link to="/technicians/add">
              <Button
                type="primary"
                size="medium"
                prefix={<PlusIcon size={16} />}
              >
                Dodaj tehničara
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

      {/* Stats Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter('all')}
            className={cn(
              "bg-white/80 backdrop-blur-sm rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md",
              statusFilter === 'all' ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno tehničara</p>
                <h3 className="text-lg font-bold text-slate-900">{technicianUsers.length}</h3>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('active')}
            className={cn(
              "bg-white/80 backdrop-blur-sm rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md",
              statusFilter === 'active' ? "border-green-400 ring-2 ring-green-100" : "border-slate-200"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg font-bold">
                {activeCount}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Aktivni</p>
                <h3 className="text-lg font-bold text-green-700">{activeCount}</h3>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('inactive')}
            className={cn(
              "bg-white/80 backdrop-blur-sm rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md",
              statusFilter === 'inactive' ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-lg font-bold">
                {inactiveCount}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Neaktivni</p>
                <h3 className="text-lg font-bold text-red-700">{inactiveCount}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 text-purple-700 rounded-lg font-bold">
                {visibleAdminUsers.length}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Administratori</p>
                <h3 className="text-lg font-bold text-slate-900">{visibleAdminUsers.length}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users Cards - Visible only for superadmin and supervisor */}
      {visibleAdminUsers.length > 0 && (
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Administratorski nalozi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleAdminUsers.map((admin) => (
                <div
                  key={admin._id}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <UserIcon size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{admin.name}</h3>
                        <span className={cn(
                          "inline-block text-xs font-medium px-2 py-1 rounded-full",
                          admin.role === 'superadmin'
                            ? "bg-red-100 text-red-700"
                            : admin.role === 'supervisor'
                            ? "bg-orange-100 text-orange-700"
                            : "bg-purple-100 text-purple-700"
                        )}>
                          {admin.role === 'superadmin' ? 'Super Admin' :
                           admin.role === 'supervisor' ? 'Supervisor' : 'Admin'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">ID:</span> {admin._id}
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Kreiran:</span> {new Date(admin.createdAt).toLocaleDateString('sr-RS')}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Link to={`/technicians/${admin._id}`}>
                      <Button
                        type="tertiary"
                        size="small"
                        prefix={<ViewIcon size={14} />}
                        title="Detalji korisnika"
                      >
                        Detalji
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
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
                  placeholder="Pretraži po imenu tehničara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                />
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
                      {Object.entries(columnLabels).map(([key, label]) => (
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
                onClick={fetchTechnicians}
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
              <span className="text-sm font-medium">Učitavanje tehničara...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Table */}
            <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.name && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Ime
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    {visibleColumns.createdAt && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Datum kreiranja
                      </th>
                    )}
                    {visibleColumns.employedUntil && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Zaposlen do
                      </th>
                    )}
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Ocena
                    </th>
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
                      <td colSpan={visibleColumnCount} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <UserIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">
                            {searchTerm ?
                              `Nema rezultata za "${searchTerm}"` :
                              'Nema tehničara za prikazivanje'
                            }
                          </p>
                          <p className="text-xs">Promenite filtere ili dodajte novog tehničara</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((technician, index) => {
                      const isInactive = technician.isActive === false;
                      const contractStatus = getContractStatus(technician.employedUntil);

                      return (
                        <tr
                          key={technician._id}
                          className={cn(
                            'transition-colors',
                            isInactive
                              ? 'bg-red-50 hover:bg-red-100'
                              : contractStatus === 'expired'
                              ? 'bg-red-50/50 hover:bg-red-100/50'
                              : contractStatus === 'warning'
                              ? 'bg-amber-50/50 hover:bg-amber-100/50'
                              : index % 2 === 0
                              ? 'bg-white hover:bg-slate-50'
                              : 'bg-slate-25 hover:bg-slate-50'
                          )}
                        >
                          {visibleColumns.name && (
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex flex-col">
                                  <span className={cn("text-sm font-medium", isInactive ? "text-red-700 line-through" : "text-slate-900")}>
                                    {technician.name}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono">ID: {technician._id}</span>
                                </div>
                              </div>
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleToggleStatus(technician._id, technician.name, technician.isActive !== false)}
                                className={cn(
                                  "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                                  isInactive
                                    ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                                    : "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                                )}
                                title={isInactive ? "Kliknite za aktiviranje" : "Kliknite za deaktiviranje"}
                              >
                                <span className={cn(
                                  "w-2 h-2 rounded-full mr-2",
                                  isInactive ? "bg-red-500" : "bg-green-500"
                                )} />
                                {isInactive ? 'Neaktivan' : 'Aktivan'}
                              </button>
                            </td>
                          )}
                          {visibleColumns.createdAt && (
                            <td className="px-6 py-4 text-sm text-slate-700">
                              {new Date(technician.createdAt).toLocaleDateString('sr-RS')}
                            </td>
                          )}
                          {visibleColumns.employedUntil && (
                            <td className="px-6 py-4">
                              {editingDateId === technician._id ? (
                                <div className="relative" style={{ zIndex: 100 }}>
                                  <DatePicker
                                    selected={technician.employedUntil ? new Date(technician.employedUntil) : null}
                                    onChange={(date) => handleEmployedUntilChange(technician._id, date)}
                                    dateFormat="dd.MM.yyyy"
                                    className="h-9 w-36 px-3 bg-white border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholderText="Izaberi datum"
                                    isClearable
                                    autoFocus
                                    onClickOutside={() => setEditingDateId(null)}
                                    popperPlacement="bottom-start"
                                    portalId="datepicker-portal"
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingDateId(technician._id)}
                                  className={cn(
                                    "text-sm px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm",
                                    !technician.employedUntil
                                      ? "text-slate-400 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600"
                                      : contractStatus === 'expired'
                                      ? "text-red-700 bg-red-50 border-red-200 font-medium"
                                      : contractStatus === 'warning'
                                      ? "text-amber-700 bg-amber-50 border-amber-200 font-medium"
                                      : "text-slate-700 border-slate-200 hover:border-blue-400"
                                  )}
                                  title="Kliknite za izmenu datuma"
                                >
                                  {technician.employedUntil ? (
                                    <span className="flex items-center space-x-1.5">
                                      <span>{new Date(technician.employedUntil).toLocaleDateString('sr-RS')}</span>
                                      {contractStatus === 'expired' && (
                                        <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-bold">ISTEKAO</span>
                                      )}
                                      {contractStatus === 'warning' && (
                                        <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                          {Math.ceil((new Date(technician.employedUntil) - new Date()) / (1000 * 60 * 60 * 24))}d
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="flex items-center space-x-1">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                                        <line x1="16" x2="16" y1="2" y2="6"></line>
                                        <line x1="8" x2="8" y1="2" y2="6"></line>
                                        <line x1="3" x2="21" y1="10" y2="10"></line>
                                      </svg>
                                      <span>Postavi datum</span>
                                    </span>
                                  )}
                                </button>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 text-center">
                            {reviewStatsMap[technician._id] ? (
                              <div className="flex items-center justify-center gap-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                <span className="text-sm font-semibold text-amber-700">
                                  {reviewStatsMap[technician._id].avgProfessionalism}
                                </span>
                                <span className="text-xs text-slate-400">
                                  ({reviewStatsMap[technician._id].totalReviews})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          {visibleColumns.actions && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-1 flex-wrap gap-1">
                                <Link to={`/technicians/${technician._id}/assign-equipment`}>
                                  <Button
                                    type="tertiary"
                                    size="small"
                                    prefix={<BoxIcon size={14} />}
                                    title="Zaduži/razduži opremu"
                                  >
                                    Oprema
                                  </Button>
                                </Link>
                                <Link to={`/technicians/${technician._id}/assign-material`}>
                                  <Button
                                    type="tertiary"
                                    size="small"
                                    prefix={<ToolsIcon size={14} />}
                                    title="Zaduži/razduži materijal"
                                  >
                                    Materijal
                                  </Button>
                                </Link>
                                <Link to={`/technicians/${technician._id}`}>
                                  <Button
                                    type="tertiary"
                                    size="small"
                                    prefix={<ViewIcon size={14} />}
                                    title="Detalji tehničara"
                                  >
                                    Detalji
                                  </Button>
                                </Link>
                                <Button
                                  type="error"
                                  size="small"
                                  prefix={<DeleteIcon size={14} />}
                                  onClick={() => handleDelete(technician._id, technician.name)}
                                  disabled={loading}
                                  title="Obriši tehničara"
                                >
                                  Obriši
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modern Pagination */}
            {filteredTechnicians.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Prikazano {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTechnicians.length)} od {filteredTechnicians.length} rezultata
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
    </div>
  );
};

export default TechniciansList;
