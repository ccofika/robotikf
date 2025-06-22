import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, UserIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI } from '../../services/api';
import './AddTechnician.css';

const AddTechnician = () => {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Ime je obavezno polje';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Ime mora imati najmanje 2 karaktera';
    }
    
    if (!formData.password) {
      errors.password = 'Lozinka je obavezna';
    } else if (formData.password.length < 6) {
      errors.password = 'Lozinka mora imati najmanje 6 karaktera';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Potvrda lozinke je obavezna';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Lozinke se ne podudaraju';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const data = {
        name: formData.name.trim(),
        password: formData.password
      };
      
      await techniciansAPI.create(data);
      toast.success(`Tehničar "${formData.name}" je uspešno dodat!`);
      navigate('/technicians');
    } catch (error) {
      console.error('Greška pri dodavanju tehničara:', error);
      const errorMessage = error.response?.data?.error || 'Greška pri dodavanju tehničara. Pokušajte ponovo.';
      setError(errorMessage);
      toast.error('Neuspešno dodavanje tehničara!');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="add-technician fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <UserIcon />
          Dodaj novog tehničara
        </h1>
        <Link to="/technicians" className="btn">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit} className="technician-form">
          <div className="form-group">
            <label htmlFor="name">
              Ime tehničara <span style={{ color: 'var(--red-500)' }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Unesite ime tehničara"
              disabled={loading}
              autoFocus
              required
              className={validationErrors.name ? 'error' : ''}
            />
            {validationErrors.name && (
              <span className="validation-error">{validationErrors.name}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              Lozinka <span style={{ color: 'var(--red-500)' }}>*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Unesite lozinku (min. 6 karaktera)"
              disabled={loading}
              required
              className={validationErrors.password ? 'error' : ''}
            />
            {validationErrors.password && (
              <span className="validation-error">{validationErrors.password}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">
              Potvrda lozinke <span style={{ color: 'var(--red-500)' }}>*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Potvrdite lozinku"
              disabled={loading}
              required
              className={validationErrors.confirmPassword ? 'error' : ''}
            />
            {validationErrors.confirmPassword && (
              <span className="validation-error">{validationErrors.confirmPassword}</span>
            )}
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              <SaveIcon /> 
              {loading ? 'Čuvanje...' : 'Sačuvaj tehničara'}
            </button>
            <Link 
              to="/technicians" 
              className="btn btn-cancel"
              onClick={(e) => {
                if (loading) {
                  e.preventDefault();
                }
              }}
            >
              Odustani
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTechnician;