import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, SaveIcon, DeleteIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from 'react-toastify';
import './EditMaterial.css';

const EditMaterial = () => {
  const [formData, setFormData] = useState({
    type: '',
    quantity: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchMaterialData();
  }, [id]);
  
  const fetchMaterialData = async () => {
    setLoading(true);
    
    try {
      const response = await axios.get(`${apiUrl}/api/materials/${id}`);
      setFormData({
        type: response.data.type,
        quantity: response.data.quantity
      });
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      setError('Materijal nije pronađen ili je došlo do greške pri učitavanju.');
      toast.error('Greška pri učitavanju materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: name === 'quantity' ? parseInt(value, 10) : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validacija
    if (!formData.type.trim()) {
      setError('Naziv materijala je obavezan!');
      return;
    }
    
    if (formData.quantity < 0) {
      setError('Količina ne može biti negativna!');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await axios.put(`${apiUrl}/api/materials/${id}`, formData);
      toast.success('Materijal je uspešno ažuriran!');
      navigate('/materials');
    } catch (error) {
      console.error('Greška pri ažuriranju materijala:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete materijal "${formData.type}"?`)) {
      setLoading(true);
      
      try {
        await axios.delete(`${apiUrl}/api/materials/${id}`);
        toast.success('Materijal je uspešno obrisan!');
        navigate('/materials');
      } catch (error) {
        console.error('Greška pri brisanju materijala:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju materijala.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (loading && formData.type === '') {
    return <div className="loading-container">Učitavanje...</div>;
  }
  
  return (
    <div className="edit-material fade-in">
      <div className="page-header">
        <h1 className="page-title">Izmeni materijal</h1>
        <Link to="/materials" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit} className="material-form">
          <div className="form-group">
            <label htmlFor="type">Vrsta materijala:</label>
            <input
              type="text"
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="Unesite vrstu materijala"
              disabled={loading}
              autoFocus
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="quantity">Količina:</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit" 
              className="btn btn-primary save-btn"
              disabled={loading}
            >
              <SaveIcon /> {loading ? 'Čuvanje...' : 'Sačuvaj izmene'}
            </button>
            <Link to="/materials" className="btn btn-secondary">Odustani</Link>
            <button 
              type="button" 
              className="btn btn-danger delete-btn"
              onClick={handleDelete}
              disabled={loading}
            >
              <DeleteIcon /> Obriši
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial;