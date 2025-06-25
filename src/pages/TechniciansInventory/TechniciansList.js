import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, ViewIcon, DeleteIcon, BoxIcon, ToolsIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI } from '../../services/api';
import './TechniciansList.css';

const TechniciansList = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchTechnicians();
  }, []);
  
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
  
  const handleDelete = async (id, name) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete tehničara "${name}"?`)) {
      setLoading(true);
      
      try {
        await techniciansAPI.delete(id);
        toast.success('Tehničar je uspešno obrisan!');
        fetchTechnicians();
      } catch (error) {
        console.error('Greška pri brisanju tehničara:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju tehničara.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Filtriranje tehničara
  const filteredTechnicians = technicians.filter(technician =>
    technician.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="technicians-list fade-in">
      <div className="page-header">
        <h1 className="page-title">Pregled tehničara</h1>
        <Link to="/technicians/add" className="btn btn-primary">
          <PlusIcon /> Dodaj tehničara
        </Link>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card">
        <div className="table-controls">
          <div className="search-filter">
            <div className="search-box">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Pretraga po imenu tehničara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            className="btn"
            onClick={fetchTechnicians}
            disabled={loading}
            title="Osveži listu"
          >
            <RefreshIcon /> {loading ? 'Učitavanje...' : 'Osveži'}
          </button>
        </div>
        
        {loading ? (
          <div className="loading-text">
            <div className="loading-spinner"></div>
            Učitavanje tehničara...
          </div>
        ) : (
          <div className="table-container">
            <table className="technicians-table">
              <thead>
                <tr>
                  <th>Ime</th>
                  <th>Datum kreiranja</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center">
                      {searchTerm ? 
                        `Nema rezultata za "${searchTerm}"` : 
                        'Nema tehničara za prikazivanje'
                      }
                    </td>
                  </tr>
                ) : (
                  filteredTechnicians.map((technician) => (
                    <tr key={technician._id} className="slide-in">
                      <td>
                        <div className="technician-info">
                          <span className="technician-name">{technician.name}</span>
                          <span className="technician-id">ID: {technician._id}</span>
                        </div>
                      </td>
                      <td>
                        <span className="date-display">
                          {new Date(technician.createdAt).toLocaleDateString('sr-RS')}
                        </span>
                      </td>
                      <td className="actions-column">
                        <Link 
                          to={`/technicians/${technician._id}/assign-equipment`} 
                          className="btn action-btn equipment-btn"
                          title="Zaduži/razduži opremu"
                        >
                          <BoxIcon /> Oprema
                        </Link>
                        <Link 
                          to={`/technicians/${technician._id}/assign-material`} 
                          className="btn action-btn material-btn"
                          title="Zaduži/razduži materijal"
                        >
                          <ToolsIcon /> Materijal
                        </Link>
                        <Link 
                          to={`/technicians/${technician._id}`} 
                          className="btn action-btn view-btn"
                          title="Detalji tehničara"
                        >
                          <ViewIcon /> Detalji
                        </Link>
                        <button 
                          className="btn action-btn delete-btn"
                          onClick={() => handleDelete(technician._id, technician.name)}
                          disabled={loading}
                          title="Obriši tehničara"
                        >
                          <DeleteIcon /> Obriši
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredTechnicians.length > 0 && (
          <div className="table-footer">
            <div className="results-info">
              Prikazano {filteredTechnicians.length} od {technicians.length} tehničara
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechniciansList;