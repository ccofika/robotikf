import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BoxIcon, ToolsIcon, UserIcon, LockIcon, CheckIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI } from '../../services/api';
import './TechnicianDetail.css';

const TechnicianDetail = () => {
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const { id } = useParams();
  
  useEffect(() => {
    fetchTechnicianData();
  }, [id]);
  
  const fetchTechnicianData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getOne(id);
      setTechnician(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
      setError('Tehničar nije pronađen ili je došlo do greške pri učitavanju.');
      toast.error('Greška pri učitavanju tehničara!');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validacija
    if (newPassword !== confirmedPassword) {
      toast.error('Lozinke se ne podudaraju!');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 karaktera!');
      return;
    }
    
    try {
      // Poziv API-ja za promenu lozinke
      await techniciansAPI.changePassword(id, { password: newPassword });
      toast.success('Lozinka je uspešno promenjena!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmedPassword('');
    } catch (error) {
      console.error('Greška pri promeni lozinke:', error);
      toast.error('Neuspešna promena lozinke. Pokušajte ponovo.');
    }
  };
  
  if (loading) {
    return <div className="loading-container">Učitavanje...</div>;
  }
  
    if (error) {
    return (
      <div className="technician-detail">
        <div className="page-header">
          <h1 className="page-title">Detalji tehničara</h1>
          <Link to="/technicians" className="btn btn-sm">
            <BackIcon /> Povratak na listu
          </Link>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="technician-detail fade-in">
      <div className="page-header">
        <h1 className="page-title">Detalji tehničara</h1>
        <Link to="/technicians" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        <div className="technician-profile">
          <div className="technician-avatar">
            <UserIcon />
          </div>
          <div className="technician-info">
            <h2>{technician.name}</h2>
            <p>ID: {technician.id}</p>
            <p>Dodat: {new Date(technician.createdAt).toLocaleDateString('sr-RS')}</p>
            
            {/* Dugme za promenu lozinke */}
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="btn btn-sm change-password-btn"
            >
              <LockIcon /> Promeni lozinku
            </button>
          </div>
        </div>
      </div>
      
      <div className="technician-inventory">
        <div className="card section-card">
          <h2><BoxIcon /> Zadužena oprema</h2>
          
          <div className="table-container">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Tip</th>
                  <th>Model</th>
                  <th>Serijski broj</th>
                  <th>Stanje</th>
                </tr>
              </thead>
              <tbody>
                {technician.equipment?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      Nema zadužene opreme
                    </td>
                  </tr>
                ) : (
                  technician.equipment?.map((item) => (
                    <tr key={item.serialNumber} className="slide-in">
                      <td>{item.type}</td>
                      <td>{item.model}</td>
                      <td>{item.serialNumber}</td>
                      <td>
                        <span className={`badge ${item.condition === 'novo' ? 'badge-success' : 'badge-info'}`}>
                          {item.condition === 'novo' ? 'Novo' : 'Polovno'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="section-actions">
            <Link to={`/technicians/${id}/assign-equipment`} className="btn btn-primary">
              <BoxIcon /> Zaduži/razduži opremu
            </Link>
          </div>
        </div>
        
        <div className="card section-card">
          <h2><ToolsIcon /> Zaduženi materijali</h2>
          
          <div className="table-container">
            <table className="materials-table">
              <thead>
                <tr>
                  <th>Vrsta</th>
                  <th>Količina</th>
                </tr>
              </thead>
              <tbody>
                {technician.materials?.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center">
                      Nema zaduženih materijala
                    </td>
                  </tr>
                ) : (
                  technician.materials?.map((item, index) => (
                    <tr key={index} className="slide-in">
                      <td>{item.type}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="section-actions">
            <Link to={`/technicians/${id}/assign-material`} className="btn btn-primary">
              <ToolsIcon /> Zaduži/razduži materijal
            </Link>
          </div>
        </div>
      </div>
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="password-modal">
            <h3>Promeni lozinku za {technician.name}</h3>
            
            <div className="form-group">
              <label htmlFor="newPassword">Nova lozinka:</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Unesite novu lozinku"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmedPassword">Potvrdite lozinku:</label>
              <input
                type="password"
                id="confirmedPassword"
                value={confirmedPassword}
                onChange={(e) => setConfirmedPassword(e.target.value)}
                placeholder="Potvrdite novu lozinku"
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary" 
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmedPassword}
              >
                <CheckIcon /> Sačuvaj
              </button>
              <button 
                className="btn btn-cancel" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmedPassword('');
                }}
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDetail;