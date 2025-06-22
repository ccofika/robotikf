import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, EditIcon, DeleteIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MaterialsList.css';

const MaterialsList = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchMaterials();
  }, []);
  
  const fetchMaterials = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${apiUrl}/api/materials`);
      setMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id, type) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete materijal "${type}"?`)) {
      setLoading(true);
      
      try {
        await axios.delete(`${apiUrl}/api/materials/${id}`);
        toast.success('Materijal je uspešno obrisan!');
        fetchMaterials();
      } catch (error) {
        console.error('Greška pri brisanju materijala:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju materijala.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Filtriranje materijala
  const filteredMaterials = useMemo(() => {
    return materials.filter(material =>
      material.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  return (
    <div className="materials-list fade-in">
      <div className="page-header">
        <h1 className="page-title">Pregled materijala</h1>
        <Link to="/materials/add" className="btn btn-primary">
          <PlusIcon size={16} /> Dodaj materijal
        </Link>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card">
        <div className="table-controls">
          <div className="search-filter">
            <div className="search-box">
              <SearchIcon className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Pretraga po nazivu materijala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <button 
              className="btn btn-sm"
              onClick={fetchMaterials}
              disabled={loading}
            >
              <RefreshIcon size={16} /> Osveži
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-text">Učitavanje materijala...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vrsta materijala</th>
                    <th>Količina</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center">
                        Nema rezultata za prikazivanje
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((material) => (
                      <tr key={material.id} className="slide-in">
                        <td>{material.type}</td>
                        <td>
                          <span className={`badge quantity-badge ${material.quantity === 0 ? 'out-of-stock' : material.quantity < 5 ? 'low-stock' : 'in-stock'}`}>
                            {material.quantity}
                          </span>
                        </td>
                        <td className="actions-column">
                          <Link 
                            to={`/materials/edit/${material.id}`} 
                            className="action-btn edit-btn"
                          >
                            <EditIcon size={16} /> Izmeni
                          </Link>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(material.id, material.type)}
                            disabled={loading}
                          >
                            <DeleteIcon size={16} /> Obriši
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredMaterials.length > itemsPerPage && (
              <div className="pagination-container">
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MaterialsList;