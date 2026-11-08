// Fajl za: frontend/src/pages/Reports/UserEquipmentReport.js
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Download, Filter, RefreshCw, Search, X, Table2 } from 'lucide-react';
import axios from 'axios';
import api from '../../services/api';
import { saveAs } from 'file-saver';
import { toast } from '../../utils/toast';
import { localYmd } from '../../utils/localDate';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { Panel, Note } from '../../security/sx/layout';
import { Field, Select } from '../../security/sx/forms';
import { LinkBtn, Loading } from '../../montaza/ui';
import './UserEquipmentReport.mx.css';

const UserEquipmentReport = () => {
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'active', 'removed'
    equipmentType: 'all',
    condition: 'all', // 'all', 'working', 'defective'
  });
  const [showFilters, setShowFilters] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, equipment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user-equipment');
      setEquipment(response.data);
      setFilteredEquipment(response.data);
    } catch (err) {
      console.error('Error fetching equipment data:', err);
      setError('Došlo je do greške pri učitavanju podataka o opremi.');
      toast.error('Greška pri učitavanju podataka o opremi!');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  const applyFilters = () => {
    let filtered = [...equipment];

    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(eq =>
        eq.userId.toString().toLowerCase().includes(searchLower) ||
        eq.equipmentType.toLowerCase().includes(searchLower) ||
        eq.equipmentDescription.toLowerCase().includes(searchLower) ||
        eq.serialNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(eq => eq.status === filters.status);
    }

    // Apply equipment type filter
    if (filters.equipmentType !== 'all') {
      filtered = filtered.filter(eq => eq.equipmentType === filters.equipmentType);
    }

    // Apply condition filter
    if (filters.condition !== 'all') {
      filtered = filtered.filter(eq => eq.condition === filters.condition);
    }

    setFilteredEquipment(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      equipmentType: 'all',
      condition: 'all',
    });
    setSearchTerm('');
  };

  const downloadReport = async () => {
    try {
      const response = await axios({
        url: `${apiUrl}/api/export/user-equipment`,
        method: 'POST',
        responseType: 'blob',
        data: {
          equipment: filteredEquipment
        }
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `oprema-korisnika-${localYmd()}.xlsx`);
      toast.success('Izveštaj je uspešno preuzet!');
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Došlo je do greške pri generisanju izveštaja.');
      toast.error('Greška pri generisanju izveštaja!');
    }
  };

  // Get unique equipment types
  const equipmentTypes = ['all', ...new Set(equipment.map(eq => eq.equipmentType))];

  return (
    <div className="sx-page mx-ueq" data-testid="page-user-equipment-report">
      {/* Zaglavlje u jednom redu (kao ranije): naslov, opis, Nazad i osvežavanje */}
      <header className="mx-ueq-head">
        <div className="mx-ueq-head__title">
          <span className="sx-eyebrow">Montaža · Izveštaji</span>
          <h1 className="sx-title mx-ueq-head__h1" data-testid="page-heading">
            <Table2 size={26} strokeWidth={1.8} aria-hidden="true" />
            Izveštaj o opremi korisnika
          </h1>
        </div>
        <p className="mx-ueq-head__lead">Pregled i export podataka o opremi dodeljene korisnicima</p>
        <div className="mx-ueq-head__actions">
          <LinkBtn to="/reports" variant="ghost" icon={ChevronLeft}>Nazad</LinkBtn>
          <Btn icon={RefreshCw} onClick={handleRefresh} busy={isRefreshing} title="Osvežiti podatke" aria-label="Osvežiti podatke" />
        </div>
      </header>

      {error && <Note tone="bad">{error}</Note>}

      {/* Kartice u užoj koloni na sredini (kao ranije) */}
      <div className="mx-ueq-col">
        <Panel
          className="mx-ueq-card"
          title={<span className="sx-panel__title-row"><Search size={18} strokeWidth={1.9} aria-hidden="true" />Pretraga i filteri</span>}
          sub="Koristite pretragu i filtere za pronalaženje specifične opreme"
        >
          <div className="mx-ueq-bar">
            <div className={cx('sx-search', searchTerm && 'has-value')}>
              <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
              <input
                type="text"
                placeholder="Pretraži po ID-u, tipu, opisu ili serijskom broju..."
                aria-label="Pretraži po ID-u, tipu, opisu ili serijskom broju..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" className="sx-search__clear" onClick={() => setSearchTerm('')} aria-label="Obriši pretragu">
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="mx-ueq-ctrl">
              <Btn
                size="sm"
                icon={Filter}
                variant={showFilters ? 'primary' : 'secondary'}
                aria-pressed={showFilters}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filteri
              </Btn>

              <span className="mx-ueq-count">{filteredEquipment.length} rezultata</span>
            </div>
          </div>

          {showFilters && (
            <div className="mx-ueq-filters">
              <div className="mx-ueq-filters__grid">
                <Field label="Status opreme:" htmlFor="ueq-status">
                  <Select id="ueq-status" name="status" value={filters.status} onChange={handleFilterChange}>
                    <option value="all">Svi statusi</option>
                    <option value="active">Aktivna</option>
                    <option value="removed">Uklonjena</option>
                  </Select>
                </Field>

                <Field label="Tip opreme:" htmlFor="ueq-type">
                  <Select id="ueq-type" name="equipmentType" value={filters.equipmentType} onChange={handleFilterChange}>
                    <option value="all">Svi tipovi</option>
                    {equipmentTypes.filter(type => type !== 'all').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Stanje:" htmlFor="ueq-condition">
                  <Select id="ueq-condition" name="condition" value={filters.condition} onChange={handleFilterChange}>
                    <option value="all">Sva stanja</option>
                    <option value="working">Ispravno</option>
                    <option value="defective">Neispravno</option>
                  </Select>
                </Field>
              </div>

              <div className="mx-ueq-filters__actions">
                <Btn size="sm" icon={X} onClick={resetFilters}>Resetuj filtere</Btn>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          pad={false}
          className="mx-ueq-card mx-ueq-list"
          title="Pregled opreme"
          sub="Tabela sa svom opremom dodeljenom korisnicima"
        >
          <div className="mx-ueq-export">
            <Btn variant="primary" size="lg" icon={Download} onClick={downloadReport} disabled={loading || filteredEquipment.length === 0}>
              Preuzmi Excel izveštaj
            </Btn>
          </div>

          {loading ? (
            <Loading text="Učitavanje podataka o opremi..." />
          ) : filteredEquipment.length === 0 ? (
            <div className="sx-empty-block">
              <b>Nema opreme koja odgovara kriterijumima pretrage</b>
            </div>
          ) : (
            <div className="sx-tablewrap">
              <table className="sx-table" data-testid="user-equipment-table">
                <thead>
                  <tr>
                    <th>Korisnik ID</th>
                    <th>Tip opreme</th>
                    <th>Opis</th>
                    <th>Serijski broj</th>
                    <th>Status</th>
                    <th>Stanje</th>
                    <th>Datum dodele</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((eq, index) => (
                    <tr key={index} style={{ '--i': index }}>
                      <td className="is-head"><span className="sx-uid">{eq.userId}</span></td>
                      <td data-label="Tip opreme"><b className="mx-strong">{eq.equipmentType}</b></td>
                      <td data-label="Opis" className="is-wide">{eq.equipmentDescription}</td>
                      <td data-label="Serijski broj"><span className="sx-mono">{eq.serialNumber}</span></td>
                      <td data-label="Status">
                        <Sign tone={eq.status === 'active' ? 'ok' : 'idle'}>{eq.status === 'active' ? 'Aktivna' : 'Uklonjena'}</Sign>
                      </td>
                      <td data-label="Stanje">
                        <Sign tone={eq.condition === 'working' ? 'ok' : 'bad'}>{eq.condition === 'working' ? 'Ispravno' : 'Neispravno'}</Sign>
                      </td>
                      <td data-label="Datum dodele"><span className="sx-mono">{new Date(eq.assignmentDate).toLocaleDateString('sr-RS')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default UserEquipmentReport;
