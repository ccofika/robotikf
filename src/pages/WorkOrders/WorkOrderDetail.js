import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, CheckIcon, ClockIcon, BanIcon, UserIcon, AlertIcon, HistoryIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import axios from 'axios';
import './WorkOrderDetailModern.css';
import { userEquipmentAPI } from '../../services/api';

const WorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    municipality: '',
    address: '',
    type: '',
    technicianId: '',
    details: '',
    comment: '',
    status: ''
  });
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userEquipment, setUserEquipment] = useState([]);
  const [userEquipmentHistory, setUserEquipmentHistory] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [workOrderRes, techniciansRes] = await Promise.all([
          axios.get(`${apiUrl}/api/workorders/${id}`),
          axios.get(`${apiUrl}/api/technicians`)
        ]);
        
        setWorkOrder(workOrderRes.data);
        setFormData({
          date: workOrderRes.data.date,
          time: workOrderRes.data.time || '09:00',
          municipality: workOrderRes.data.municipality,
          address: workOrderRes.data.address,
          type: workOrderRes.data.type,
          technicianId: workOrderRes.data.technicianId || '',
          details: workOrderRes.data.details || '',
          comment: workOrderRes.data.comment || '',
          status: workOrderRes.data.status || 'nezavrsen'
        });
        setTechnicians(techniciansRes.data);

        const fetchUserEquipment = async () => {
          if (!workOrderRes.data.tisId) return;

          setLoadingEquipment(true);
          try {
            // Dohvati trenutno instaliranu opremu
            const userEqResponse = await userEquipmentAPI.getForUser(workOrderRes.data.tisId);
            setUserEquipment(userEqResponse.data);

            // Dohvati istoriju opreme
            const historyResponse = await userEquipmentAPI.getUserHistory(workOrderRes.data.tisId);
            setUserEquipmentHistory(historyResponse.data);
          } catch (err) {
            console.error('Error fetching user equipment:', err);
          } finally {
            setLoadingEquipment(false);
          }
        };

        fetchUserEquipment();
      } catch (err) {
        console.error('Greška pri učitavanju podataka:', err);
        setError('Greška pri učitavanju podataka. Pokušajte ponovo.');
        toast.error('Neuspešno učitavanje podataka!');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
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
    
    setSaving(true);
    setError('');
    
    try {
      const updatedWorkOrder = await axios.put(`${apiUrl}/api/workorders/${id}`, formData);
      setWorkOrder(updatedWorkOrder.data);
      toast.success('Radni nalog je uspešno ažuriran!');
    } catch (error) {
      console.error('Greška pri ažuriranju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje radnog naloga!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = async (status) => {
    setSaving(true);
    
    try {
      const updatedData = { ...formData, status };
      const updatedWorkOrder = await axios.put(`${apiUrl}/api/workorders/${id}`, updatedData);
      setWorkOrder(updatedWorkOrder.data);
      setFormData(prev => ({ ...prev, status }));
      toast.success(`Status radnog naloga je promenjen na "${status === 'zavrsen' ? 'Završen' : status === 'odlozen' ? 'Odložen' : 'Nezavršen'}"!`);
    } catch (error) {
      console.error('Greška pri promeni statusa:', error);
      toast.error('Neuspešna promena statusa!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUnassign = () => {
    setFormData(prev => ({ ...prev, technicianId: '' }));
  };
  
  if (loading) {
    return <div className="loading-container">Učitavanje...</div>;
  }
  
  if (error && !workOrder) {
    return (
      <div className="work-order-detail">
        <div className="page-header">
          <h1 className="page-title">Detalji radnog naloga</h1>
          <Link to="/work-orders" className="btn btn-sm">
            <BackIcon /> Povratak na listu
          </Link>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="work-order-detail fade-in">
      <div className="page-header">
        <h1 className="page-title">Detalji radnog naloga</h1>
        <Link to="/work-orders" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        <div className="work-order-header">
          <div className={`status-indicator status-${formData.status}`}>
            {formData.status === 'zavrsen' ? 'Završen' : 
             formData.status === 'odlozen' ? 'Odložen' : 'Nezavršen'}
          </div>
          <div className="work-order-actions">
            <button
              className={`btn btn-sm ${formData.status === 'zavrsen' ? 'btn-active' : ''}`}
              onClick={() => handleStatusChange('zavrsen')}
              disabled={saving || formData.status === 'zavrsen'}
            >
              <CheckIcon /> Završen
            </button>
            <button
              className={`btn btn-sm ${formData.status === 'nezavrsen' ? 'btn-active' : ''}`}
              onClick={() => handleStatusChange('nezavrsen')}
              disabled={saving || formData.status === 'nezavrsen'}
            >
              <ClockIcon /> Nezavršen
            </button>
            <button
              className={`btn btn-sm ${formData.status === 'odlozen' ? 'btn-active' : ''}`}
              onClick={() => handleStatusChange('odlozen')}
              disabled={saving || formData.status === 'odlozen'}
            >
              <AlertIcon /> Odložen
            </button>
          </div>
        </div>


<div className="equipment-section">
  <h3>Oprema korisnika</h3>
  
  {loadingEquipment ? (
    <p className="loading-text">Učitavanje opreme...</p>
  ) : userEquipment.length > 0 ? (
    <div className="user-equipment-list">
      <h4>Trenutno instalirana oprema:</h4>
      <table className="equipment-table">
        <thead>
          <tr>
            <th>Tip</th>
            <th>Opis</th>
            <th>Serijski broj</th>
            <th>Datum instalacije</th>
          </tr>
        </thead>
        <tbody>
          {userEquipment.map(eq => (
            <tr key={eq.id}>
              <td>{eq.equipmentType}</td>
              <td>{eq.equipmentDescription}</td>
              <td>{eq.serialNumber}</td>
              <td>{new Date(eq.installedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button
        type="button"
        className="btn btn-sm btn-info history-btn"
        onClick={() => setShowHistoryModal(true)}
      >
        <HistoryIcon /> Prikaži istoriju opreme
      </button>
    </div>
  ) : (
    <p>Korisnik trenutno nema instaliranu opremu.</p>
  )}
</div>

{/* Modal za prikaz istorije opreme */}
        {showHistoryModal && (
          <div className="modal-overlay">
            <div className="modal-content equipment-history-modal">
              <h3>Istorija opreme korisnika</h3>

              {userEquipmentHistory.length > 0 ? (
                <table className="equipment-history-table">
                  <thead>
                    <tr>
                      <th>Tip</th>
                      <th>Opis</th>
                      <th>Serijski broj</th>
                      <th>Status</th>
                      <th>Datum instalacije</th>
                      <th>Datum uklanjanja</th>
                      <th>Stanje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEquipmentHistory.map(eq => (
                      <tr key={eq.id} className={eq.status === 'removed' ? 'removed-equipment' : ''}>
                        <td>{eq.equipmentType}</td>
                        <td>{eq.equipmentDescription}</td>
                        <td>{eq.serialNumber}</td>
                        <td>{eq.status === 'active' ? 'Aktivno' : 'Uklonjeno'}</td>
                        <td>{new Date(eq.installedAt).toLocaleDateString()}</td>
                        <td>{eq.removedAt ? new Date(eq.removedAt).toLocaleDateString() : '-'}</td>
                        <td>
                          {!eq.condition && '-'}
                          {eq.condition === 'working' && 'Ispravno'}
                          {eq.condition === 'defective' && 'Neispravno'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nema istorije opreme za ovog korisnika.</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Zatvori
                </button>
              </div>
            </div>
          </div>
        )}
        
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
                disabled={saving}
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
                disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
              required
            />
          </div>
          
          <div className="form-group technician-field">
            <label htmlFor="technicianId">Tehničar:</label>
            <div className="technician-select-group">
              <select
                id="technicianId"
                name="technicianId"
                value={formData.technicianId}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">-- Izaberite tehničara --</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
              {formData.technicianId && (
                <button 
                  type="button"
                  className="btn btn-sm btn-danger remove-btn"
                  onClick={handleUnassign}
                  disabled={saving}
                >
                  <BanIcon /> Poništi
                </button>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="details">Detalji:</label>
            <textarea
              id="details"
              name="details"
              value={formData.details}
              onChange={handleChange}
              placeholder="Detalji za tehničara"
              disabled={saving}
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
              disabled={saving}
              rows="3"
            ></textarea>
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit" 
              className="btn btn-primary save-btn"
              disabled={saving}
            >
              <SaveIcon /> {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
            </button>
            <Link to="/work-orders" className="btn btn-cancel">Odustani</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderDetail;