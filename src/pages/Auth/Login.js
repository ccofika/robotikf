import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import BrandMark from '../../security/sx/BrandMark';
import { Btn } from '../../security/sx/ui';
import { Note } from '../../security/sx/layout';
import { Field, Input } from '../../security/sx/forms';
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
        login(response.data.user, response.data.token); // poruku o uspešnoj prijavi prikazuje login() u App.js
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
  
  // Izgled Security dela: znak, natpis, naslov, polja i jedno glavno dugme
  return (
    <div className="mx-login" data-testid="page-login">
      <div className="mx-login__card sx-card">
        <div className="mx-login__head">
          <BrandMark size={40} />
          <span className="sx-eyebrow">Robotik</span>
          <h1 className="sx-title mx-login__title">TelCo Inventory</h1>
          <p className="mx-login__lead">Profesionalni sistem upravljanja inventarom</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mx-login__form">
          {error && <Note tone="bad">{error}</Note>}

          <Field label="Korisničko ime" htmlFor="name">
            <span className="mx-login__in">
              <User size={17} strokeWidth={1.8} aria-hidden="true" />
              <Input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Unesite korisničko ime"
                disabled={loading} autoComplete="username" required />
            </span>
          </Field>

          <Field label="Lozinka" htmlFor="password">
            <span className="mx-login__in">
              <Lock size={17} strokeWidth={1.8} aria-hidden="true" />
              <Input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange}
                placeholder="Unesite lozinku" disabled={loading} autoComplete="current-password" required />
              <button type="button" className="mx-login__eye" onClick={() => setShowPassword(!showPassword)} disabled={loading} tabIndex="-1"
                aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}>
                {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </span>
          </Field>

          <Btn type="submit" variant="primary" size="lg" className="mx-login__submit" busy={loading} aria-label={loading ? 'Prijavljivanje...' : 'Prijavi se'}>
            {loading ? 'Prijavljivanje...' : 'Prijavi se'}
          </Btn>
        </form>

        <div className="mx-login__foot">
          <span>&copy; 2024 TelCo Inventory System</span>
          <span>Verzija 1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Login;