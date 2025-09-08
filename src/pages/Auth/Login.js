import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { UserIcon, LockIcon, LogoutIcon, AlertIcon, EyeIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { cn } from '../../utils/cn';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-400/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <LogoutIcon size={32} className="text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">TelCo Inventory</h1>
            <p className="text-slate-600">Profesionalni sistem upravljanja inventarom</p>
          </div>
        
          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertIcon size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Korisničko ime
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Unesite korisničko ime"
                  disabled={loading}
                  className="h-11 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="username"
                  required
                />
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Lozinka
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Unesite lozinku"
                  disabled={loading}
                  className="h-11 w-full pl-10 pr-10 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="current-password"
                  required
                />
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <EyeIcon size={16} />
                  ) : (
                    <EyeIcon size={16} className="opacity-60" />
                  )}
                </button>
              </div>
            </div>
            
            <Button 
              type="primary" 
              size="large"
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Prijavljivanje...</span>
                </div>
              ) : (
                <span>Prijavi se</span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-1">
            <p className="text-xs text-slate-500">&copy; 2024 TelCo Inventory System</p>
            <p className="text-xs text-slate-400">Verzija 1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;