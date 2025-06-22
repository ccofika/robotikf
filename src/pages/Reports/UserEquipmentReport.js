// Fajl za: frontend/src/pages/Reports/UserEquipmentReport.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BackIcon, DownloadIcon, FilterIcon, SearchIcon, CloseIcon, RefreshIcon, TableIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import './ExportSpecificationModern.css';
import './UserEquipmentReport.css';

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
      const response = await axios.get(`${apiUrl}/api/user-equipment`);
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
      saveAs(blob, `oprema-korisnika-${new Date().toISOString().slice(0,10)}.xlsx`);
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
    <div className="export-container fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <TableIcon className="title-icon" />
          Izveštaj o opremi korisnika
        </h1>
        <p className="page-subtitle">
          Pregled i export podataka o opremi dodeljene korisnicima
        </p>
        <div className="header-buttons">
          <Link to="/reports" className="btn btn-sm">
            <BackIcon /> Nazad
          </Link>
          <button 
            onClick={handleRefresh}
            className="refresh-btn"
            disabled={isRefreshing}
            title="Osvežiti podatke"
          >
            <RefreshIcon className={`icon ${isRefreshing ? 'spinning' : ''}`} />
          </button>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="export-specification">
        <div className="export-card">
          <div className="card-header">
            <h2>
              <SearchIcon />
              Pretraga i filteri
            </h2>
            <p>Koristite pretragu i filtere za pronalaženje specifične opreme</p>
          </div>

          <div className="filters-toolbar">
            <div className="search-bar">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Pretraži po ID-u, tipu, opisu ili serijskom broju..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="date-picker"
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <CloseIcon />
                </button>
              )}
            </div>
            
            <div className="filter-controls">
              <button
                className={`export-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                <FilterIcon /> Filteri
              </button>
              
              <span className="results-count">
                {filteredEquipment.length} rezultata
              </span>
            </div>
          </div>
          
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Status opreme:</label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="date-picker"
                  >
                    <option value="all">Svi statusi</option>
                    <option value="active">Aktivna</option>
                    <option value="removed">Uklonjena</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Tip opreme:</label>
                  <select
                    name="equipmentType"
                    value={filters.equipmentType}
                    onChange={handleFilterChange}
                    className="date-picker"
                  >
                    <option value="all">Svi tipovi</option>
                    {equipmentTypes.filter(type => type !== 'all').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Stanje:</label>
                  <select
                    name="condition"
                    value={filters.condition}
                    onChange={handleFilterChange}
                    className="date-picker"
                  >
                    <option value="all">Sva stanja</option>
                    <option value="working">Ispravno</option>
                    <option value="defective">Neispravno</option>
                  </select>
                </div>
              </div>
              
              <div className="filter-actions">
                <button className="export-btn" onClick={resetFilters} style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                  <CloseIcon /> Resetuj filtere
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="export-card">
          <div className="card-header">
            <h2>Pregled opreme</h2>
            <p>Tabela sa svom opremom dodeljenom korisnicima</p>
          </div>

          <div className="export-actions">
            <button
              className="export-btn"
              onClick={downloadReport}
              disabled={loading || filteredEquipment.length === 0}
            >
              <DownloadIcon /> Preuzmi Excel izveštaj
            </button>
          </div>

          <div className="equipment-table-container">
            {loading ? (
              <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>Učitavanje podataka o opremi...</p>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="no-results">
                <p>Nema opreme koja odgovara kriterijumima pretrage</p>
              </div>
            ) : (
              <table className="equipment-table">
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
                    <tr key={index}>
                      <td>{eq.userId}</td>
                      <td>{eq.equipmentType}</td>
                      <td>{eq.equipmentDescription}</td>
                      <td>{eq.serialNumber}</td>
                      <td>
                        <span className={`status-badge ${eq.status === 'active' ? 'status-completed' : 'status-canceled'}`}>
                          {eq.status === 'active' ? 'Aktivna' : 'Uklonjena'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${eq.condition === 'working' ? 'status-completed' : 'status-pending'}`}>
                          {eq.condition === 'working' ? 'Ispravno' : 'Neispravno'}
                        </span>
                      </td>
                      <td>{new Date(eq.assignmentDate).toLocaleDateString('sr-RS')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserEquipmentReport;