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
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchDefectiveEquipment();
  }, []);
  
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
  
  // Dobijanje jedinstvenih vrednosti za filtere
  const categories = useMemo(() => {
    return [...new Set(equipment.map(item => item.category))].sort();
  }, [equipment]);
  
  // Paginacija
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const currentEquipment = filteredEquipment.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
    </div>
  );
};

export default DefectiveEquipment;