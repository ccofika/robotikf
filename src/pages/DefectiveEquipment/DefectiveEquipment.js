import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, RotateCcw, Undo2, User } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Stat } from '../../security/sx/layout';
import { Select, SearchField } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { Pager, Loading } from '../../montaza/ui';
import './DefectiveEquipment.mx.css';

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
      const response = await api.get('/api/defective-equipment?statsOnly=true');
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

      const response = await api.get(`/api/defective-equipment?${params.toString()}`);

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
  }, [debouncedSearchTerm, categoryFilter, pagination.currentPage, pagination.limit]);

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
        tone: 'bad'
      },
      'available': {
        label: 'Dostupno',
        tone: 'idle'
      },
      'assigned': {
        label: 'Dodeljeno',
        tone: 'info'
      },
      'installed': {
        label: 'Instalirano',
        tone: 'ok'
      }
    };

    const config = statusConfig[status] || {
      label: status,
      tone: 'idle'
    };
    return <Sign tone={config.tone}>{config.label}</Sign>;
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

    const confirmRestore = await confirm({
      title: `Da li ste sigurni da želite da vratite opremu "${equipmentInfo.category} - ${equipmentInfo.description}" (${equipmentInfo.serialNumber}) u magacin?`,
      confirmLabel: 'Vrati'
    });

    if (!confirmRestore) return;

    setRestoringEquipmentId(equipmentId);

    try {
      const response = await api.put(
        `/api/defective-equipment/${equipmentId}/restore`,
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

  return (
    <div className="sx-page" data-testid="page-defective-equipment">
      <PageHead
        eyebrow="Montaža · Inventar"
        title="Neispravna oprema"
        lead="Pregled sve opreme označene kao neispravna sa detaljima o uklanjanju"
      />

      {stats && (
        <div className="sx-stats">
          <Stat label="Ukupno neispravnih" value={stats.total} tone={stats.total ? 'bad' : null} />
          <Stat label="Kategorija" value={Object.keys(stats.byCategory || {}).length} />
          <Stat label="Filtrirana oprema" value={pagination.totalCount} />
        </div>
      )}

      <Toolbar>
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži po serijskom broju, opisu, kategoriji..." />
        <Select size="sm" aria-label="Kategorija" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Sve kategorije</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
        <div className="sx-toolbar__end">
          {performance.queryTime > 0 && <span className="mx-de-time">{performance.queryTime}ms</span>}
          <Btn size="sm" icon={RotateCcw} onClick={handleReset}>Resetuj</Btn>
          <Btn size="sm" icon={RefreshCw} onClick={handleRefresh}>Osveži</Btn>
        </div>
      </Toolbar>

      <Panel pad={false}>
        {loading ? (
          <Loading text="Učitava neispravnu opremu..." />
        ) : error ? (
          <div className="sx-empty-block">
            <b>Greška</b>
            <span>{error}</span>
            <Btn variant="primary" onClick={() => fetchDefectiveEquipment(1)}>Pokušaj ponovo</Btn>
          </div>
        ) : equipment.length === 0 ? (
          <div className="sx-empty-block">
            <b>Nema neispravne opreme</b>
            <span>
              {pagination.totalCount === 0 && !debouncedSearchTerm && !categoryFilter
                ? 'Trenutno nema opreme označene kao neispravna.'
                : 'Nema opreme koja odgovara trenutnim filterima.'
              }
            </span>
          </div>
        ) : (
          <>
            {/* 8 kolona: na srednjoj širini tabela se pomera unutar panela, na uskoj su kartice */}
            <div className="mx-scroll">
            <div className="sx-tablewrap">
              <table className="sx-table mx-de-table" data-testid="defective-table">
                <thead>
                  <tr>
                    <th>Oprema</th>
                    <th>Serijski broj</th>
                    <th>Status</th>
                    <th>Uklonio tehničar</th>
                    <th>Work Order</th>
                    <th>Datum uklanjanja</th>
                    <th>Razlog</th>
                    <th className="is-end">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item, index) => (
                    <tr key={item._id} style={{ '--i': index }}>
                      <td className="is-head">
                        <div className="sx-cell">
                          <b>{item.category}</b>
                          <span>{item.description}</span>
                        </div>
                      </td>

                      <td data-label="Serijski broj"><span className="sx-mono">{item.serialNumber}</span></td>

                      <td data-label="Status">{getStatusBadge(item.status)}</td>

                      <td data-label="Uklonio tehničar">
                        {item.removalInfo ? (
                          <span className="mx-de-who"><User size={14} strokeWidth={1.8} aria-hidden="true" />{item.removalInfo.removedByName}</span>
                        ) : (
                          <span className="sx-faint">N/A</span>
                        )}
                      </td>

                      <td data-label="Work Order" className="is-wide mx-de-wo">
                        {item.removalInfo?.workOrder ? (
                          <div className="sx-cell">
                            <b>TIS: {item.removalInfo.workOrder.tisId}</b>
                            <span>{item.removalInfo.workOrder.userName}</span>
                            <span>{item.removalInfo.workOrder.address}</span>
                          </div>
                        ) : (
                          <span className="sx-faint">N/A</span>
                        )}
                      </td>

                      <td data-label="Datum uklanjanja"><span className="sx-mono">{formatDate(item.removalInfo?.removalDate || item.removedAt)}</span></td>

                      <td data-label="Razlog">
                        <span className="mx-de-reason">
                          {item.removalInfo?.reason || 'Neispravno'}
                          {item.removalInfo?.isWorking === false && <span className="sx-tag is-bad">Ne radi</span>}
                        </span>
                      </td>

                      <td className="is-actions is-end">
                        <div className="sx-rowacts">
                          <Btn
                            size="sm"
                            variant="ghost"
                            icon={Undo2}
                            onClick={() => handleRestoreEquipment(item._id, {
                              category: item.category,
                              description: item.description,
                              serialNumber: item.serialNumber
                            })}
                            disabled={restoringEquipmentId !== null}
                            busy={restoringEquipmentId === item._id}
                          >
                            {restoringEquipmentId === item._id ? 'Vraćanje...' : 'Vrati u opremu'}
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            <Pager page={pagination.currentPage} total={pagination.totalCount} perPage={pagination.limit} onPage={handlePageChange} label="stavki" />
          </>
        )}
      </Panel>
    </div>
  );
};

export default DefectiveEquipment;
