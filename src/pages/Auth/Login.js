import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { UserIcon, LockIcon, LogoutIcon, AlertIcon } from '../../components/icons/SvgIcons';
import './Login.css';
import axios from 'axios';

const Login = () => {
  const { login } = useContext(AuthContext);
  
  // DODAJ OVO - Debug i API URL konfiguracija
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  console.log('Final apiUrl:', apiUrl);
  
  const [formData, setFormData] = useState({
    name: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.password) {
      setError('Korisničko ime i lozinka su obavezni');
      return;
    }
    
    setLoading(true);
    
    try {
      // PROMENI OVO - koristi apiUrl umesto hardcode localhost
      console.log('Making request to:', `${apiUrl}/api/auth/login`);
      
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        name: formData.name,
        password: formData.password
      });
      
      // Ako je prijava uspešna, spremite korisnika i token
      if (response.data && response.data.user) {
        login(response.data.user, response.data.token);
        toast.success('Uspešno ste se prijavili!');
      } else {
        setError('Neuspešna prijava. Proverite vaše podatke.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 'Greška pri prijavljivanju, pokušajte ponovo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-background"></div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="company-logo">
            <div className="logo-icon">
              <LogoutIcon size={32} />
            </div>
          </div>
          <h1 className="company-title">TelCo Inventory</h1>
          <p className="login-subtitle">Profesionalni sistem upravljanja inventarom</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="error-message">
              <AlertIcon size={16} />
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name" className="form-label">Korisničko ime</label>
            <div className="input-wrapper">
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Unesite korisničko ime"
              disabled={loading}
                className="form-input"
                autoComplete="username"
                required
            />
              <UserIcon className="input-icon" size={18} />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">Lozinka</label>
            <div className="input-wrapper">
            <input
                type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Unesite lozinku"
              disabled={loading}
                className="form-input"
                autoComplete="current-password"
                required
              />
              <LockIcon className="input-icon" size={18} />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Prijavljivanje...</span>
              </>
            ) : (
              <span>Prijavi se</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-credentials">
            <h4>Demo pristup:</h4>
            <div className="credential-item">
              <span className="credential-label">Admin:</span>
              <span className="credential-value">admin / admin</span>
            </div>
          </div>
          
          <div className="system-info">
            <p>&copy; 2024 TelCo Inventory System</p>
            <p>Verzija 1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;