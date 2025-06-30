import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, ClipboardIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import './WorkOrdersModern.css';

const AddWorkOrder = () => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Današnji datum
    time: '09:00',
    municipality: '',
    address: '',
    type: '',
    technicianId: '',
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
    <div className="add-work-order fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <ClipboardIcon />
          Dodaj novi radni nalog
        </h1>
        <Link to="/work-orders" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="work-order-form">
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Datum:</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="time">Vreme:</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="municipality">Opština:</label>
            <input
              type="text"
              id="municipality"
              name="municipality"
              value={formData.municipality}
              onChange={handleChange}
              placeholder="Unesite opštinu"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="address">Adresa:</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Unesite adresu"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Tip instalacije:</label>
            <input
              type="text"
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="Internet, IPTV, Telefon..."
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="technology">Tehnologija:</label>
              <select
                id="technology"
                name="technology"
                value={formData.technology}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">-- Izaberite tehnologiju --</option>
                <option value="HFC">HFC</option>
                <option value="GPON">GPON</option>
                <option value="VDSL">VDSL</option>
                <option value="ADSL">ADSL</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="technicianId">Tehničar:</label>
              <select
                id="technicianId"
                name="technicianId"
                value={formData.technicianId}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">-- Izaberite tehničara --</option>
                {technicians.map(tech => (
                  <option key={tech._id} value={tech._id}>{tech.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tisId">TIS ID korisnika:</label>
              <input
                type="text"
                id="tisId"
                name="tisId"
                value={formData.tisId}
                onChange={handleChange}
                placeholder="ID korisnika u TIS sistemu"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="tisJobId">TIS ID posla:</label>
              <input
                type="text"
                id="tisJobId"
                name="tisJobId"
                value={formData.tisJobId}
                onChange={handleChange}
                placeholder="ID posla u TIS sistemu"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userName">Ime korisnika:</label>
              <input
                type="text"
                id="userName"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                placeholder="Ime i prezime korisnika"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="userPhone">Telefon korisnika:</label>
              <input
                type="text"
                id="userPhone"
                name="userPhone"
                value={formData.userPhone}
                onChange={handleChange}
                placeholder="Broj telefona korisnika"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalJobs">Dodatni poslovi:</label>
            <input
              type="text"
              id="additionalJobs"
              name="additionalJobs"
              value={formData.additionalJobs}
              onChange={handleChange}
              placeholder="Format: ID,Opis/ID,Opis;..."
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="details">Detalji:</label>
            <textarea
              id="details"
              name="details"
              value={formData.details}
              onChange={handleChange}
              placeholder="Detalji za tehničara"
              disabled={loading}
              rows="3"
            ></textarea>
          </div>
          
          <div className="form-group">
            <label htmlFor="comment">Komentar:</label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              placeholder="Dodatne napomene"
              disabled={loading}
              rows="3"
            ></textarea>
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit" 
              className="btn btn-primary save-btn"
              disabled={loading}
            >
              <SaveIcon /> {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
            <Link to="/work-orders" className="btn btn-cancel">Odustani</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWorkOrder;