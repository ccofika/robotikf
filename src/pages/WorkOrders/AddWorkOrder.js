import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, ClipboardIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import { cn } from '../../utils/cn';

const AddWorkOrder = () => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Današnji datum
    time: '09:00',
    municipality: '',
    address: '',
    type: '',
    technicianId: '',
    technician2Id: '',
    details: '',
    comment: '',
    // Dodati novi atributi iz workorders.json
    technology: '',
    tisId: '',
    userName: '',
    userPhone: '',
    tisJobId: '',
    additionalJobs: ''
  });
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    // Učitavanje liste tehničara
    const fetchTechnicians = async () => {
      try {
        const response = await techniciansAPI.getAll();
        setTechnicians(response.data);
      } catch (err) {
        console.error('Greška pri učitavanju tehničara:', err);
        toast.error('Neuspešno učitavanje tehničara!');
      }
    };
    
    fetchTechnicians();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validacija
    if (!formData.municipality || !formData.address || !formData.type) {
      setError('Opština, adresa i tip instalacije su obavezni!');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Dodavanje administratorskih podataka za logovanje
      const dataToSend = {
        ...formData,
        adminId: 'admin-system', // Placeholder za admin ID
        adminName: 'Sistem Administrator'
      };
      
      await workOrdersAPI.create(dataToSend);
      toast.success('Radni nalog je uspešno dodat!');
      navigate('/work-orders');
    } catch (error) {
      console.error('Greška pri dodavanju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno dodavanje radnog naloga!');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <ClipboardIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dodaj novi radni nalog</h1>
              <p className="text-slate-600 mt-1">Kreiranje novog radnog naloga za tehničare</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/work-orders">
              <Button type="secondary" size="medium" prefix={<BackIcon size={16} />}>
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Content Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium text-slate-700">Datum</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="time" className="block text-sm font-medium text-slate-700">Vreme</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Municipality */}
            <div className="space-y-2">
              <label htmlFor="municipality" className="block text-sm font-medium text-slate-700">Opština</label>
              <input
                type="text"
                id="municipality"
                name="municipality"
                value={formData.municipality}
                onChange={handleChange}
                placeholder="Unesite opštinu"
                disabled={loading}
                required
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
            
            {/* Address */}
            <div className="space-y-2">
              <label htmlFor="address" className="block text-sm font-medium text-slate-700">Adresa</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Unesite adresu"
                disabled={loading}
                required
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
            
            {/* Installation Type */}
            <div className="space-y-2">
              <label htmlFor="type" className="block text-sm font-medium text-slate-700">Tip instalacije</label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Internet, IPTV, Telefon..."
                disabled={loading}
                required
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
            
            {/* Technology */}
            <div className="space-y-2">
              <label htmlFor="technology" className="block text-sm font-medium text-slate-700">Tehnologija</label>
              <select
                id="technology"
                name="technology"
                value={formData.technology}
                onChange={handleChange}
                disabled={loading}
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
              >
                <option value="">-- Izaberite tehnologiju --</option>
                <option value="HFC">HFC</option>
                <option value="GPON">GPON</option>
                <option value="VDSL">VDSL</option>
                <option value="ADSL">ADSL</option>
              </select>
            </div>
            
            {/* Technicians */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="technicianId" className="block text-sm font-medium text-slate-700">Prvi tehničar</label>
                <select
                  id="technicianId"
                  name="technicianId"
                  value={formData.technicianId}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
                >
                  <option value="">-- Izaberite prvog tehničara --</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech._id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="technician2Id" className="block text-sm font-medium text-slate-700">Drugi tehničar (opciono)</label>
                <select
                  id="technician2Id"
                  name="technician2Id"
                  value={formData.technician2Id}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
                >
                  <option value="">-- Izaberite drugog tehničara --</option>
                  {technicians
                    .filter(tech => tech._id !== formData.technicianId)
                    .map(tech => (
                      <option key={tech._id} value={tech._id}>{tech.name}</option>
                    ))}
                </select>
              </div>
            </div>
            
            {/* TIS IDs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="tisId" className="block text-sm font-medium text-slate-700">TIS ID korisnika</label>
                <input
                  type="text"
                  id="tisId"
                  name="tisId"
                  value={formData.tisId}
                  onChange={handleChange}
                  placeholder="ID korisnika u TIS sistemu"
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="tisJobId" className="block text-sm font-medium text-slate-700">TIS ID posla</label>
                <input
                  type="text"
                  id="tisJobId"
                  name="tisJobId"
                  value={formData.tisJobId}
                  onChange={handleChange}
                  placeholder="ID posla u TIS sistemu"
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="userName" className="block text-sm font-medium text-slate-700">Ime korisnika</label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={formData.userName}
                  onChange={handleChange}
                  placeholder="Ime i prezime korisnika"
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="userPhone" className="block text-sm font-medium text-slate-700">Telefon korisnika</label>
                <input
                  type="text"
                  id="userPhone"
                  name="userPhone"
                  value={formData.userPhone}
                  onChange={handleChange}
                  placeholder="Broj telefona korisnika"
                  disabled={loading}
                  className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Additional Jobs */}
            <div className="space-y-2">
              <label htmlFor="additionalJobs" className="block text-sm font-medium text-slate-700">Dodatni poslovi</label>
              <input
                type="text"
                id="additionalJobs"
                name="additionalJobs"
                value={formData.additionalJobs}
                onChange={handleChange}
                placeholder="Format: ID,Opis/ID,Opis;..."
                disabled={loading}
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
            
            {/* Details */}
            <div className="space-y-2">
              <label htmlFor="details" className="block text-sm font-medium text-slate-700">Detalji</label>
              <textarea
                id="details"
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="Detalji za tehničara"
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              />
            </div>
            
            {/* Comment */}
            <div className="space-y-2">
              <label htmlFor="comment" className="block text-sm font-medium text-slate-700">Komentar</label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                placeholder="Dodatne napomene"
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              />
            </div>
            
            {/* Form Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-6">
              <Link to="/work-orders">
                <Button type="secondary" size="medium">
                  Odustani
                </Button>
              </Link>
              <Button 
                type="primary" 
                size="medium"
                prefix={<SaveIcon size={16} />}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Čuvanje...' : 'Sačuvaj'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddWorkOrder;