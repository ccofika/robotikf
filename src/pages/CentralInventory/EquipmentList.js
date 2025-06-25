import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UploadIcon, SearchIcon, FilterIcon, EditIcon, BoxIcon, PlusIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from 'react-toastify';
import { equipmentAPI } from '../../services/api';
import './EquipmentList.css';

const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [technicians, setTechnicians] = useState([]);

  // Modalni prozor za dodavanje pojedinačne opreme
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    category: '',
    description: '',
    serialNumber: '',
    isNewCategory: false,
    newCategoryName: ''
  });
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchEquipment();
    fetchTechnicians();
  }, []);
  
  const fetchEquipment = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await equipmentAPI.getDisplay();
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje opreme!');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/technicians`);
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
    }
  };
  
  // Filtriranje i pretraga opreme
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const categoryMatch = selectedCategory === '' || item.category === selectedCategory;
      const searchMatch = searchTerm === '' || 
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const locationMatch = locationFilter === '' || item.location === locationFilter;
      
      return categoryMatch && searchMatch && locationMatch;
    });
  }, [equipment, searchTerm, locationFilter, selectedCategory]);
  
  // Dobijanje jedinstvenih vrednosti za filtere
  const categories = useMemo(() => {
    return [...new Set(equipment.map(item => item.category))];
  }, [equipment]);
  
  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(equipment.map(item => item.location))];
    return ['', ...locations];
  }, [equipment]);
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Lokalizacija lokacije
  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    if (location.startsWith('tehnicar-')) {
      const techId = location.split('-')[1];
      // Pronađi tehničara po ID-u
      const technician = technicians.find(tech => tech.id === techId);
      return technician ? `Tehničar: ${technician.name}` : `Tehničar ID: ${techId}`;
    }
    return location;
  };
  
  // Formatiranje naziva kategorija
  const formatCategoryName = (category) => {
    const categoryNames = {
      'cam': 'CAM',
      'modem': 'Modem',
      'stb': 'STB',
      'fiksni telefon': 'Fiksni telefon',
      'mini nod': 'Mini nod',
      'hybrid': 'Hybrid'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  // Handling za dodavanje pojedinačne opreme
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEquipment(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setNewEquipment(prev => ({ ...prev, isNewCategory: true, category: '' }));
    } else {
      setNewEquipment(prev => ({ 
        ...prev, 
        isNewCategory: false, 
        category: value,
        newCategoryName: ''
      }));
    }
  };
  
  const handleAddEquipment = async (e) => {
    e.preventDefault();
    
    // Validacije
    if ((newEquipment.isNewCategory && !newEquipment.newCategoryName) || 
        (!newEquipment.isNewCategory && !newEquipment.category) || 
        !newEquipment.description || 
        !newEquipment.serialNumber) {
      toast.error('Sva polja su obavezna!');
      return;
    }
    
    try {
      const equipmentToAdd = {
        category: newEquipment.isNewCategory ? newEquipment.newCategoryName : newEquipment.category,
        description: newEquipment.description,
        serialNumber: newEquipment.serialNumber
      };
      
      await axios.post(`${apiUrl}/api/equipment`, equipmentToAdd);
      toast.success('Oprema uspešno dodata!');
      setShowAddModal(false);
      
      // Reset forme
      setNewEquipment({
        category: '',
        description: '',
        serialNumber: '',
        isNewCategory: false,
        newCategoryName: ''
      });
      
      // Osvežavanje liste opreme
      fetchEquipment();
    } catch (error) {
      console.error('Greška pri dodavanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju opreme!');
    }
  };
  
  return (
    <div className="equipment-list-equipment fade-in">
      <div className="page-header">
        <h1 className="page-title">Pregled opreme</h1>
        <div className="header-buttons">
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowAddModal(true)}
          >
            <PlusIcon /> Dodaj opremu
          </button>
          <Link to="/equipment/upload" className="btn btn-primary">
            <UploadIcon /> Dodaj iz Excel-a
          </Link>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Kategorije opreme */}
      <div className="categories-tabs">
        <button 
          className={`category-tab ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          Sve kategorije
        </button>
        {categories.map(category => (
          <button 
            key={category}
            className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {formatCategoryName(category)}
          </button>
        ))}
      </div>
      
      <div className="card">
        <div className="table-controls">
          <div className="search-filter">
            <div className="search-box">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Pretraga po serijskom broju, opisu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-box">
              <FilterIcon className="filter-icon" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="">Sve lokacije</option>
                {uniqueLocations.filter(loc => loc).map((location, idx) => (
                  <option key={idx} value={location}>
                    {translateLocation(location)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <button 
              className="btn btn-sm"
              onClick={fetchEquipment}
              disabled={loading}
            >
              Osveži
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-text">Učitavanje opreme...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Opis</th>
                    <th>Serijski broj</th>
                    <th>Lokacija</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center">
                        Nema rezultata za prikazivanje
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr key={item.id} className="slide-in">
                        <td>{item.description}</td>
                        <td>{item.serialNumber}</td>
                        <td>
                          <span className={`badge location-badge ${item.location === 'magacin' ? 'in-stock' : 'assigned'}`}>
                            {translateLocation(item.location)}
                          </span>
                        </td>
                        <td>
                          <Link to={`/equipment/edit/${item._id}`} className="btn btn-sm action-btn">
                            <EditIcon /> Izmeni
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredEquipment.length > itemsPerPage && (
                <div className="pagination-container">
                  {filteredEquipment.length > itemsPerPage && (
                    <div className="pagination">
                      <button
                        onClick={() => paginate(1)}
                        disabled={currentPage === 1}
                      >
                        &laquo;
                      </button>

                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        &lsaquo;
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(number => {
                          return (
                            number === 1 ||
                            number === totalPages ||
                            Math.abs(number - currentPage) <= 1
                          );
                        })
                        .map(number => (
                          <button
                            key={number}
                            onClick={() => paginate(number)}
                            className={currentPage === number ? 'active' : ''}
                          >
                            {number}
                          </button>
                        ))}

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        &rsaquo;
                      </button>

                      <button
                        onClick={() => paginate(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        &raquo;
                      </button>
                    </div>
                  )}
                </div>
            )}
          </>
        )}
        
        <div className="stats-grid">
          <div className="stat-card">
            <BoxIcon className="stat-icon" />
            <div>
              <p>Ukupno opreme u kategoriji</p>
              <h3>{filteredEquipment.length}</h3>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon-circle green">
              <span>{filteredEquipment.filter(item => item.location === 'magacin').length}</span>
            </div>
            <div>
              <p>Dostupno u magacinu</p>
              <h3>
                {filteredEquipment.length ? 
                  Math.round(filteredEquipment.filter(item => item.location === 'magacin').length / filteredEquipment.length * 100) : 0}%
              </h3>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon-circle blue">
              <span>{filteredEquipment.filter(item => item.location !== 'magacin').length}</span>
            </div>
            <div>
              <p>Zaduženo</p>
              <h3>
                {filteredEquipment.length ? 
                  Math.round(filteredEquipment.filter(item => item.location !== 'magacin').length / filteredEquipment.length * 100) : 0}%
              </h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modalni prozor za dodavanje pojedinačne opreme */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Dodaj novu opremu</h2>
              <button 
                className="close-button" 
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddEquipment}>
                <div className="form-group">
                  <label>Kategorija:</label>
                  <select 
                    onChange={handleCategoryChange}
                    defaultValue=""
                  >
                    <option value="" disabled>Izaberite kategoriju</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{formatCategoryName(category)}</option>
                    ))}
                    <option value="new">Nova kategorija...</option>
                  </select>
                </div>
                
                {newEquipment.isNewCategory && (
                  <div className="form-group">
                    <label>Naziv nove kategorije:</label>
                    <input 
                      type="text" 
                      name="newCategoryName"
                      value={newEquipment.newCategoryName}
                      onChange={handleInputChange}
                      placeholder="Unesite naziv nove kategorije"
                    />
                  </div>
                )}
                
                <div className="form-group">
                  <label>Opis:</label>
                  <input 
                    type="text" 
                    name="description"
                    value={newEquipment.description}
                    onChange={handleInputChange}
                    placeholder="Unesite opis opreme"
                  />
                </div>
                
                <div className="form-group">
                  <label>Serijski broj:</label>
                  <input 
                    type="text" 
                    name="serialNumber"
                    value={newEquipment.serialNumber}
                    onChange={handleInputChange}
                    placeholder="Unesite serijski broj"
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Otkaži
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Dodaj opremu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;