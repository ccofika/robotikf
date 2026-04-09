import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  ChartIcon,
  CheckCircleIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';

const DefectiveEquipment = () => {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const initialSearch = urlParams.get('search') || '';

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);

  // Server-side pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });

  // Restore equipment state
  const [restoringEquipmentId, setRestoringEquipmentId] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch when filters or page change
  useEffect(() => {
    fetchDefectiveEquipment(1);
  }, [debouncedSearchTerm, categoryFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/defective-equipment?statsOnly=true`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDefectiveEquipment = useCallback(async (page = pagination.currentPage) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearchTerm,
        category: categoryFilter
      });

      const response = await axios.get(`${apiUrl}/api/defective-equipment?${params.toString()}`);

      if (response.data.success) {
        setEquipment(response.data.data);
        setPagination(response.data.pagination);
        setPerformance(response.data.performance);
        if (response.data.categories) {
          setCategories(response.data.categories);
        }
        // Update stats total from pagination
        setStats(prev => prev ? { ...prev, total: response.data.pagination.totalCount } : prev);
      }
    } catch (err) {
      console.error('Error fetching defective equipment:', err);
      setError('Greška pri učitavanju neispravne opreme. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, debouncedSearchTerm, categoryFilter, pagination.currentPage, pagination.limit]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDefectiveEquipment(newPage);
    }
  }, [pagination.totalPages, fetchDefectiveEquipment]);

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
    setDebouncedSearchTerm('');
    setCategoryFilter('');
  };

  const handleRefresh = () => {
    fetchStats();
    fetchDefectiveEquipment(pagination.currentPage);
  };

  const handleRestoreEquipment = async (equipmentId, equipmentInfo) => {
    if (restoringEquipmentId) return;

    const confirmRestore = window.confirm(
      `Da li ste sigurni da želite da vratite opremu "${equipmentInfo.category} - ${equipmentInfo.description}" (${equipmentInfo.serialNumber}) u magacin?`
    );

    if (!confirmRestore) return;

    setRestoringEquipmentId(equipmentId);

    try {
      const response = await axios.put(
        `${apiUrl}/api/defective-equipment/${equipmentId}/restore`,
        { performedByName: 'Admin' }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Oprema je uspešno vraćena u magacin');
        fetchStats();
        fetchDefectiveEquipment(pagination.currentPage);
      } else {
        toast.error(response.data.message || 'Greška pri vraćanju opreme');
      }
    } catch (error) {
      console.error('Error restoring equipment:', error);
      const errorMessage = error.response?.data?.message || 'Greška pri vraćanju opreme';
      toast.error(errorMessage);
    } finally {
      setRestoringEquipmentId(null);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const { currentPage, totalPages } = pagination;
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
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
                  <h3 className="text-lg font-bold text-slate-900">{Object.keys(stats.byCategory || {}).length}</h3>
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
                  <h3 className="text-lg font-bold text-slate-900">{pagination.totalCount}</h3>
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
                  placeholder="Pretraži po serijskom broju, opisu, kategoriji..."
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
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              {performance.queryTime > 0 && (
                <span className="text-xs text-slate-400">
                  {performance.queryTime}ms
                </span>
              )}
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
                onClick={handleRefresh}
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
                onClick={() => fetchDefectiveEquipment(1)}
              >
                Pokušaj ponovo
              </Button>
            </div>
          </div>
        ) : equipment.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-slate-50 rounded-xl mb-4">
                <EquipmentIcon size={64} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema neispravne opreme</h3>
              <p className="text-slate-600">
                {pagination.totalCount === 0 && !debouncedSearchTerm && !categoryFilter
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
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Akcije
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {equipment.map((item) => (
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

                        <td className="px-6 py-4 text-center">
                          <Button
                            type="primary"
                            size="small"
                            prefix={restoringEquipmentId === item._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <CheckCircleIcon size={14} />
                            )}
                            onClick={() => handleRestoreEquipment(item._id, {
                              category: item.category,
                              description: item.description,
                              serialNumber: item.serialNumber
                            })}
                            disabled={restoringEquipmentId !== null}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {restoringEquipmentId === item._id ? 'Vraćanje...' : 'Vrati u opremu'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600">
                  Prikazuje se <span className="font-medium text-slate-900">
                    {((pagination.currentPage - 1) * pagination.limit) + 1}-{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
                  </span> od <span className="font-medium text-slate-900">{pagination.totalCount}</span> stavki
                </div>

                <div className="flex items-center space-x-1">
                  <Button
                    type="secondary"
                    size="small"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => handlePageChange(1)}
                  >
                    &laquo;
                  </Button>
                  <Button
                    type="secondary"
                    size="small"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    Prethodna
                  </Button>

                  {getPageNumbers().map(pageNum => (
                    <Button
                      key={pageNum}
                      type={pageNum === pagination.currentPage ? "primary" : "secondary"}
                      size="small"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}

                  <Button
                    type="secondary"
                    size="small"
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    Sledeća
                  </Button>
                  <Button
                    type="secondary"
                    size="small"
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(pagination.totalPages)}
                  >
                    &raquo;
                  </Button>
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
