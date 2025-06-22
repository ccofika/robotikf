import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AddMaterial.css';

const AddMaterial = () => {
  const [formData, setFormData] = useState({
    type: '',
    quantity: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
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
      await axios.post(`${apiUrl}/api/materials`, formData);
      toast.success('Materijal je uspešno dodat!');
      navigate('/materials');
    } catch (error) {
      console.error('Greška pri dodavanju materijala:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno dodavanje materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="add-material fade-in">
      <div className="page-header">
        <h1 className="page-title">Dodaj novi materijal</h1>
        <Link to="/materials" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="material-form">
          {error && <div className="alert alert-danger">{error}</div>}
          
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
              <SaveIcon /> {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
            <Link to="/materials" className="btn btn-secondary">Odustani</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial;