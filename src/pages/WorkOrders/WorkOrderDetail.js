import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, CheckIcon, ClockIcon, BanIcon, UserIcon, AlertIcon, HistoryIcon, ImageIcon, DeleteIcon, MaterialIcon, EquipmentIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { workOrdersAPI, techniciansAPI, userEquipmentAPI } from '../../services/api';
import axios from 'axios';
import './WorkOrderDetailModern.css';

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
    technician2Id: '',
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
  const [images, setImages] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showFullImage, setShowFullImage] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [workOrderRes, techniciansRes] = await Promise.all([
          workOrdersAPI.getOne(id),
          techniciansAPI.getAll()
        ]);
        
        setWorkOrder(workOrderRes.data);
        setFormData({
          date: workOrderRes.data.date ? new Date(workOrderRes.data.date).toISOString().split('T')[0] : '',
          time: workOrderRes.data.time || '09:00',
          municipality: workOrderRes.data.municipality,
          address: workOrderRes.data.address,
          type: workOrderRes.data.type,
          technicianId: workOrderRes.data.technicianId?._id || workOrderRes.data.technicianId || '',
          technician2Id: workOrderRes.data.technician2Id?._id || workOrderRes.data.technician2Id || '',
          details: workOrderRes.data.details || '',
          comment: workOrderRes.data.comment || '',
          status: workOrderRes.data.status || 'nezavrsen'
        });
        setTechnicians(techniciansRes.data);
        
        // Postavi slike i materijale
        setImages(workOrderRes.data.images || []);
        setMaterials(workOrderRes.data.materials || []);

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
    
    setSaving(true);
    setError('');
    
    try {
      const updatedData = {
        ...formData,
        technicianId: formData.technicianId || null,
        technician2Id: formData.technician2Id || null
      };

      const response = await workOrdersAPI.update(id, updatedData);
      setWorkOrder(response.data);
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
    setError('');
    
    try {
      // Priprema podataka za slanje, konvertuj prazan string u null za technicianId
      const updatedData = { 
        ...formData,
        status,
        technicianId: formData.technicianId || null // konvertuj prazan string u null
      };
      
      console.log('Sending data:', updatedData);
      const response = await workOrdersAPI.update(id, updatedData);
      console.log('Response:', response);
      
      setWorkOrder(response.data);
      setFormData(prev => ({ ...prev, status }));
      toast.success(`Status radnog naloga je promenjen na "${status === 'zavrsen' ? 'Završen' : 
        status === 'odlozen' ? 'Odložen' : 
        status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}"!`);
    } catch (error) {
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || 'Greška pri promeni statusa. Pokušajte ponovo.');
      toast.error('Neuspešna promena statusa!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUnassign = (field) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  // Funkcija za brisanje slike
  const handleImageDelete = async (imageUrl) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu sliku?')) {
      return;
    }

    setDeletingImage(true);
    try {
      await axios.delete(`${apiUrl}/api/workorders/${id}/images`, {
        data: { imageUrl }
      });

      toast.success('Slika je uspešno obrisana!');
      
      // Ukloni sliku iz lokalne liste
      setImages(images.filter(img => img !== imageUrl));
      
      // Refresh work order data
      const updatedWorkOrder = await workOrdersAPI.getOne(id);
      setImages(updatedWorkOrder.data.images || []);
    } catch (error) {
      console.error('Greška pri brisanju slike:', error);
      toast.error('Greška pri brisanju slike. Pokušajte ponovo.');
    } finally {
      setDeletingImage(false);
    }
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
             formData.status === 'odlozen' ? 'Odložen' : 
             formData.status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}
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
            <button
              className={`btn btn-sm ${formData.status === 'otkazan' ? 'btn-active' : ''}`}
              onClick={() => handleStatusChange('otkazan')}
              disabled={saving || formData.status === 'otkazan'}
            >
              <BanIcon /> Otkazan
            </button>
          </div>
        </div>

        {/* Sekcija za slike */}
        <div className="card images-section">
          <div className="card-header">
            <h3><ImageIcon size={20} /> Slike radnog naloga</h3>
          </div>
          <div className="card-body">
            {images.length === 0 ? (
              <p className="no-images-message">Nema upload-ovanih slika za ovaj radni nalog</p>
            ) : (
              <div className="admin-images-grid">
                {images.map((imageItem, index) => {
                  // Podrška za stari i novi format
                  const imageUrl = typeof imageItem === 'object' ? imageItem.url : imageItem;
                  const originalName = typeof imageItem === 'object' ? imageItem.originalName : null;
                  
                  return (
                    <div key={index} className="admin-gallery-image-item">
                      <img 
                        src={imageUrl} 
                        alt={originalName || `Slika ${index + 1}`} 
                        className="admin-gallery-image" 
                        onClick={() => setShowFullImage(imageUrl)}
                      />
                      {originalName && (
                        <div className="image-filename-overlay">
                          {originalName}
                        </div>
                      )}
                      <button
                        className="admin-delete-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageDelete(imageUrl);
                        }}
                        title="Obriši sliku"
                        disabled={deletingImage}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sekcija za materijale */}
        <div className="card materials-section">
          <div className="card-header">
            <h3><MaterialIcon size={20} /> Utrošeni materijali</h3>
          </div>
          <div className="card-body">
            {materials.length === 0 ? (
              <p className="no-materials-message">Nema utrošenih materijala za ovaj radni nalog</p>
            ) : (
              <div className="admin-materials-grid">
                {materials.map((materialItem, index) => (
                  <div key={index} className="admin-material-item">
                    <div className="material-header">
                      <h4 className="material-name">
                        {materialItem.material?.type || 'Nepoznat materijal'}
                      </h4>
                      <span className="material-quantity">Količina: {materialItem.quantity}</span>
                    </div>
                    <div className="material-details">
                      <p><strong>Tip:</strong> {materialItem.material?.type || 'N/A'}</p>
                      {materialItem.material?._id && (
                        <p><strong>ID:</strong> {materialItem.material._id}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card equipment-section">
          <div className="card-header">
            <h3><EquipmentIcon size={20} /> Oprema korisnika</h3>
          </div>
          <div className="card-body">
  
  {loadingEquipment ? (
    <p className="loading-text">Učitavanje opreme...</p>
  ) : (
    <>
      {userEquipment.length > 0 ? (
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
                  <td data-label="Tip">{eq.equipmentType}</td>
                  <td data-label="Opis">{eq.equipmentDescription}</td>
                  <td data-label="Serijski broj">{eq.serialNumber}</td>
                  <td data-label="Datum instalacije">{new Date(eq.installedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Korisnik trenutno nema instaliranu opremu.</p>
      )}
      
      {/* Prikaži dugme za istoriju ako ima bilo kakve istorije opreme */}
      {userEquipmentHistory.length > 0 && (
        <button
          type="button"
          className="btn btn-sm btn-info history-btn"
          onClick={() => setShowHistoryModal(true)}
        >
          <HistoryIcon /> Prikaži istoriju opreme
        </button>
      )}
    </>
  )}
          </div>
        </div>

{/* Modal za prikaz istorije opreme */}
        {showHistoryModal && (
          <div className="modal-overlay">
            <div className="modal-content equipment-history-modal">
              <h3>Istorija opreme korisnika</h3>

              <div className="modal-body">
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
                          <td data-label="Tip">{eq.equipmentType}</td>
                          <td data-label="Opis">{eq.equipmentDescription}</td>
                          <td data-label="Serijski broj">{eq.serialNumber}</td>
                          <td data-label="Status">
                            <span className={`status-badge ${eq.status === 'active' ? 'status-active' : 'status-removed'}`}>
                              {eq.status === 'active' ? 'Aktivno' : 'Uklonjeno'}
                            </span>
                          </td>
                          <td data-label="Datum instalacije">{eq.installedAt ? new Date(eq.installedAt).toLocaleDateString() : '-'}</td>
                          <td data-label="Datum uklanjanja">{eq.removedAt ? new Date(eq.removedAt).toLocaleDateString() : '-'}</td>
                          <td data-label="Stanje">
                            {!eq.condition && '-'}
                            {eq.condition === 'working' && <span className="condition-badge condition-working">Ispravno</span>}
                            {eq.condition === 'defective' && <span className="condition-badge condition-defective">Neispravno</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Nema istorije opreme za ovog korisnika.</p>
                )}
              </div>

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

        {/* Dodatne informacije o radnom nalogu */}
        <div className="card work-order-info">
          <div className="card-header">
            <h3>Dodatne informacije</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              {workOrder?.tisId && (
                <div className="info-item">
                  <label>TIS ID:</label>
                  <p>{workOrder.tisId}</p>
                </div>
              )}
              {workOrder?.userName && (
                <div className="info-item">
                  <label>Ime korisnika:</label>
                  <p>{workOrder.userName}</p>
                </div>
              )}
              {workOrder?.userPhone && (
                <div className="info-item">
                  <label>Telefon korisnika:</label>
                  <p>{workOrder.userPhone}</p>
                </div>
              )}
              {workOrder?.tisJobId && (
                <div className="info-item">
                  <label>TIS Job ID:</label>
                  <p>{workOrder.tisJobId}</p>
                </div>
              )}
              {workOrder?.technology && (
                <div className="info-item">
                  <label>Tehnologija:</label>
                  <p>{workOrder.technology}</p>
                </div>
              )}
              {workOrder?.additionalJobs && (
                <div className="info-item">
                  <label>Dodatni poslovi:</label>
                  <p>{workOrder.additionalJobs}</p>
                </div>
              )}
              <div className="info-item">
                <label>Kreiran:</label>
                <p>{workOrder?.createdAt ? new Date(workOrder.createdAt).toLocaleString('sr-RS') : 'N/A'}</p>
              </div>
              <div className="info-item">
                <label>Poslednja izmena:</label>
                <p>{workOrder?.updatedAt ? new Date(workOrder.updatedAt).toLocaleString('sr-RS') : 'N/A'}</p>
              </div>
              <div className="info-item">
                <label>Verifikovan:</label>
                <p className={`verification-status ${workOrder?.verified ? 'verified' : 'not-verified'}`}>
                  {workOrder?.verified ? 'Da' : 'Ne'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
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
                className="form-control"
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
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-row">
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
                className="form-control"
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
                className="form-control"
              />
            </div>
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
              className="form-control"
            />
          </div>
          
          <div className="form-group technician-field">
            <label htmlFor="technicianId">Prvi tehničar:</label>
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
                  <option key={tech._id} value={tech._id}>{tech.name}</option>
                ))}
              </select>
              {formData.technicianId && (
                <button 
                  type="button"
                  className="btn btn-sm btn-danger remove-btn"
                  onClick={() => handleUnassign('technicianId')}
                  disabled={saving}
                >
                  <BanIcon /> Poništi
                </button>
              )}
            </div>
          </div>

          <div className="form-group technician-field">
            <label htmlFor="technician2Id">Drugi tehničar:</label>
            <div className="technician-select-group">
              <select
                id="technician2Id"
                name="technician2Id"
                value={formData.technician2Id}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">-- Izaberite tehničara --</option>
                {technicians
                  .filter(tech => tech._id !== formData.technicianId)
                  .map(tech => (
                    <option key={tech._id} value={tech._id}>{tech.name}</option>
                  ))}
              </select>
              {formData.technician2Id && (
                <button 
                  type="button"
                  className="btn btn-sm btn-danger remove-btn"
                  onClick={() => handleUnassign('technician2Id')}
                  disabled={saving}
                >
                  <BanIcon /> Poništi
                </button>
              )}
            </div>
          </div>
          
          <div className="form-row">
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
                className="form-control"
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
                className="form-control"
              ></textarea>
            </div>
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

      {/* Modal za pregled slike u punoj veličini */}
      {showFullImage && (
        <div className="modal-overlay image-viewer-overlay" onClick={() => setShowFullImage(null)}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <img src={showFullImage} alt="Slika u punoj veličini" className="full-size-image" />
            <button className="close-image-btn fixed-close-btn" onClick={() => setShowFullImage(null)}>
              <DeleteIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderDetail;