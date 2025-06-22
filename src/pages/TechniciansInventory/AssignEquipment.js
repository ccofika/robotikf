import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BoxIcon, PlusIcon, MinusIcon, UserIcon, SearchIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI, equipmentAPI } from '../../services/api';
import './AssignEquipment.css';

const AssignEquipment = () => {
  const [technician, setTechnician] = useState(null);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [assignedEquipment, setAssignedEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' ili 'return'
  const [technicians, setTechnicians] = useState([]);
  // Dodajemo state za pretragu
  const [searchTerm, setSearchTerm] = useState('');
  const { id } = useParams();
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  useEffect(() => {
    fetchData();
    fetchTechnicians();
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [techResponse, equipmentResponse] = await Promise.all([
        techniciansAPI.getOne(id),
        equipmentAPI.getAll()
      ]);
      
      setTechnician(techResponse.data);
      
      // Razdvajanje opreme na onu koja je dostupna i onu koja je već zadužena kod tehničara
      const available = equipmentResponse.data.filter(item => item.location === 'magacin');
      const assigned = equipmentResponse.data.filter(item => item.location === `tehnicar-${id}`);
      
      setAvailableEquipment(available);
      setAssignedEquipment(assigned);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Došlo je do greške pri učitavanju podataka.');
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTechnicians = async () => {
    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
    }
  };
  
  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    if (location.startsWith('tehnicar-')) {
      const techId = location.split('-')[1];
      // Pronađi tehničara po ID-u
      const tech = technicians.find(t => t.id === techId);
      return tech ? `Tehničar: ${tech.username || tech.name}` : `Tehničar ID: ${techId}`;
    }
    return location;
  };
  
  const toggleSelectEquipment = (serialNumber) => {
    setSelectedEquipment(prev => {
      if (prev.includes(serialNumber)) {
        return prev.filter(sn => sn !== serialNumber);
      } else {
        return [...prev, serialNumber];
      }
    });
  };
  
  const handleAssignEquipment = async () => {
    if (selectedEquipment.length === 0) {
      toast.warning('Niste odabrali nijedan komad opreme!');
      return;
    }
    
    setLoading(true);
    
    try {
      await techniciansAPI.assignEquipment(id, { serialNumbers: selectedEquipment });
      toast.success(`Uspešno ste zadužili ${selectedEquipment.length} komada opreme tehničaru!`);
      setSelectedEquipment([]);
      fetchData();
    } catch (error) {
      console.error('Greška pri zaduživanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri zaduživanju opreme!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReturnEquipment = async () => {
    if (selectedEquipment.length === 0) {
      toast.warning('Niste odabrali nijedan komad opreme!');
      return;
    }
    
    setLoading(true);
    
    try {
      await techniciansAPI.returnEquipment(id, { serialNumbers: selectedEquipment });
      toast.success(`Uspešno ste razdužili ${selectedEquipment.length} komada opreme!`);
      setSelectedEquipment([]);
      fetchData();
    } catch (error) {
      console.error('Greška pri razduživanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri razduživanju opreme!');
    } finally {
      setLoading(false);
    }
  };
  
  const selectAll = () => {
    if (activeTab === 'assign') {
      setSelectedEquipment(filteredAvailableEquipment.map(item => item.serialNumber));
    } else {
      setSelectedEquipment(filteredAssignedEquipment.map(item => item.serialNumber));
    }
  };
  
  const deselectAll = () => {
    setSelectedEquipment([]);
  };
  
  // Funkcija za filtriranje opreme prema searchTerm-u
  const filteredAvailableEquipment = availableEquipment.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });
  
  const filteredAssignedEquipment = assignedEquipment.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });

  // Paginacija - trenutni elementi za prikaz
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAvailableItems = filteredAvailableEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const currentAssignedItems = filteredAssignedEquipment.slice(indexOfFirstItem, indexOfLastItem);

  // Ukupan broj stranica
  const totalAvailablePages = Math.ceil(filteredAvailableEquipment.length / itemsPerPage);
  const totalAssignedPages = Math.ceil(filteredAssignedEquipment.length / itemsPerPage);
  const totalPages = activeTab === 'assign' ? totalAvailablePages : totalAssignedPages;

  // Funkcija za promenu stranice
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  if (loading && !technician) {
    return <div className="loading-container">Učitavanje...</div>;
  }
  
  return (
    <div className="assign-equipment fade-in">
      <div className="page-header">
        <h1 className="page-title">Zaduženje/Razduženje opreme</h1>
        <Link to={`/technicians/${id}`} className="btn btn-sm">
          <BackIcon /> Nazad na detalje
        </Link>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {technician && (
        <div className="technician-brief">
          <div className="technician-avatar">
            <UserIcon />
          </div>
          <div className="technician-info">
            <h2>{technician.name}</h2>
          </div>
        </div>
      )}
      
      <div className="tab-navigation">
                <button 
          className={`tab-button ${activeTab === 'assign' ? 'active' : ''}`} 
          onClick={() => setActiveTab('assign')}
        >
          <PlusIcon /> Zaduži opremu
        </button>
        <button 
          className={`tab-button ${activeTab === 'return' ? 'active' : ''}`} 
          onClick={() => setActiveTab('return')}
        >
          <MinusIcon /> Razduži opremu
        </button>
      </div>
      
      <div className="card section-card">
        <div className="equipment-controls">
          <div className="equipment-title">
            <h3>
              {activeTab === 'assign' ? 
                <><BoxIcon /> Oprema dostupna za zaduženje</> : 
                <><BoxIcon /> Oprema za razduženje</>
              }
            </h3>
            <div className="count-badge">
              {activeTab === 'assign' ? filteredAvailableEquipment.length : filteredAssignedEquipment.length}
            </div>
          </div>

          <div className="search-filter">
            <div className="search-box">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Pretraži opremu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="selection-controls">
          <button className="btn btn-sm" onClick={selectAll}>Označi sve</button>
          <button className="btn btn-sm" onClick={deselectAll}>Poništi</button>
        </div>
        
        <div className="table-container">
          <table className="equipment-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Odaberi</th>
                <th>Opis</th>
                <th>Serijski broj</th>
                <th>Lokacija</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'assign' ? (
                filteredAvailableEquipment.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      {searchTerm ? 'Nema rezultata za pretragu' : 'Nema dostupne opreme u magacinu'}
                    </td>
                  </tr>
                ) : (
                  currentAvailableItems.map((item) => (
                    <tr key={item.id || item.serialNumber}
                      className={`selectable-row ${selectedEquipment.includes(item.serialNumber) ? 'selected' : ''}`}
                      onClick={() => toggleSelectEquipment(item.serialNumber)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(item.serialNumber)}
                          onChange={() => { }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{item.description}</td>
                      <td>{item.serialNumber}</td>
                      <td>
                        <span className={`location-badge ${item.location === 'magacin' ? 'in-stock' : 'assigned'}`}>
                          {translateLocation(item.location)}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredAssignedEquipment.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      {searchTerm ? 'Nema rezultata za pretragu' : 'Tehničar nema zaduženu opremu'}
                    </td>
                  </tr>
                ) : (
                  currentAssignedItems.map((item) => (
                    <tr key={item.id || item.serialNumber}
                      className={`selectable-row ${selectedEquipment.includes(item.serialNumber) ? 'selected' : ''}`}
                      onClick={() => toggleSelectEquipment(item.serialNumber)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(item.serialNumber)}
                          onChange={() => { }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{item.description}</td>
                      <td>{item.serialNumber}</td>
                      <td>
                        <span className={`location-badge ${item.location === 'magacin' ? 'in-stock' : 'assigned'}`}>
                          {translateLocation(item.location)}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
        
        <div className="pagination-container">
          {(activeTab === 'assign' && filteredAvailableEquipment.length > itemsPerPage) ||
            (activeTab === 'return' && filteredAssignedEquipment.length > itemsPerPage) ? (
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
          ) : null}
        </div>

        <div className="action-footer">
          <div className="selected-count">
            Odabrano: <strong>{selectedEquipment.length}</strong>
          </div>
          <div className="action-buttons">
            {activeTab === 'assign' ? (
              <button 
                className="btn btn-primary assign-btn" 
                onClick={handleAssignEquipment}
                disabled={loading || selectedEquipment.length === 0}
              >
                <PlusIcon /> Zaduži opremu
              </button>
            ) : (
              <button 
                className="btn btn-primary return-btn" 
                onClick={handleReturnEquipment}
                disabled={loading || selectedEquipment.length === 0}
              >
                <MinusIcon /> Razduži opremu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignEquipment;