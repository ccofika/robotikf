// Kompletna zamena za fajl: src/pages/WorkOrders/TechnicianWorkOrderDetail.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, CheckIcon, ClockIcon, AlertIcon, CloseIcon, CalendarIcon, ImageIcon, DeleteIcon, SearchIcon, PhoneIcon, MapPinIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { userEquipmentAPI } from '../../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './TechnicianWorkOrderDetail.css';

const TechnicianWorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [workOrder, setWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    comment: '',
    status: '',
    postponeDate: null,
    postponeTime: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [images, setImages] = useState([]);
  const [showPostponeForm, setShowPostponeForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [userEquipment, setUserEquipment] = useState([]);
  const [technicianEquipment, setTechnicianEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [equipmentOperation, setEquipmentOperation] = useState('add'); // 'add' ili 'remove'
  const [isEquipmentWorking, setIsEquipmentWorking] = useState(true);
  const [removalReason, setRemovalReason] = useState('');
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [equipmentToRemove, setEquipmentToRemove] = useState(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showStatusActions, setShowStatusActions] = useState(false);
  const [showFullImage, setShowFullImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const mainRef = useRef(null);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Dodajemo pull-to-refresh funkcionalnost
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e) => {
      touchEndY.current = e.touches[0].clientY;
      
      // Ako je korisnik na vrhu stranice i povlači prema dole
      if (window.scrollY === 0 && touchEndY.current - touchStartY.current > 70) {
        setRefreshing(true);
      }
    };
    
    const handleTouchEnd = () => {
      if (refreshing) {
        // Osvežavanje podataka
        fetchData();
        
        // Resetovanje stanja nakon 1s
        setTimeout(() => {
          setRefreshing(false);
        }, 1000);
      }
      
      touchStartY.current = 0;
      touchEndY.current = 0;
    };
    
    const mainElement = mainRef.current;
    if (mainElement && isMobile) {
      mainElement.addEventListener('touchstart', handleTouchStart);
      mainElement.addEventListener('touchmove', handleTouchMove);
      mainElement.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        mainElement.removeEventListener('touchstart', handleTouchStart);
        mainElement.removeEventListener('touchmove', handleTouchMove);
        mainElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [refreshing, isMobile]);
  
  const fetchData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
      
      // Proveriti da li radni nalog pripada ovom tehničaru
      if (response.data.technicianId !== user.id) {
        setError('Nemate pristup ovom radnom nalogu');
        setLoading(false);
        return;
      }
      
      setWorkOrder(response.data);
      setFormData({
        comment: response.data.comment || '',
        status: response.data.status || 'nezavrsen',
        postponeDate: response.data.date ? new Date(response.data.date) : new Date(),
        postponeTime: response.data.time || '09:00'
      });
      
      setImages(response.data.images || []);

      const fetchUserEquipment = async () => {
        try {
          // Dohvati opremu trenutno instaliranu kod korisnika
          const userEqResponse = await axios.get(`${apiUrl}/api/workorders/${id}/user-equipment`);
          setUserEquipment(userEqResponse.data);

          // Dohvati opremu tehničara
          if (user?.id) {
            const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user.id}/equipment`);
            setTechnicianEquipment(techEqResponse.data);
            setFilteredEquipment(techEqResponse.data);
          }
        } catch (err) {
          console.error('Greška pri dohvatanju opreme:', err);
          toast.error('Greška pri učitavanju opreme');
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
  
  useEffect(() => {
    fetchData();
  }, [id, user?.id]);

  const handleAddEquipment = async () => {
    if (!selectedEquipment) {
      toast.error('Morate odabrati opremu za dodavanje');
      return;
    }
    
    setLoadingEquipment(true);
    
    try {
      const response = await userEquipmentAPI.add({
        userId: workOrder.tisId,
        equipmentId: selectedEquipment,
        workOrderId: id,
        technicianId: user.id
      });
      
      toast.success('Oprema je uspešno dodata korisniku!');
      
      // Ažuriraj prikaz opreme
      const userEqResponse = await axios.get(`${apiUrl}/api/workorders/${id}/user-equipment`);
      setUserEquipment(userEqResponse.data);
      
      // Ažuriraj opremu tehničara
      const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user.id}/equipment`);
      setTechnicianEquipment(techEqResponse.data);
      setFilteredEquipment(techEqResponse.data);
      
      // Reset forme
      setSelectedEquipment('');
    } catch (error) {
      console.error('Greška pri dodavanju opreme:', error);
      
      // Poboljšana poruka o grešci
      const errorMessage = error.response?.data?.error || 'Neuspešno dodavanje opreme. Pokušajte ponovo.';
      toast.error(errorMessage);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const filterEquipment = (searchTerm) => {
    if (!technicianEquipment || technicianEquipment.length === 0) return [];

    if (!searchTerm.trim()) {
      return technicianEquipment;
    }

    const term = searchTerm.toLowerCase();
    return technicianEquipment.filter(eq =>
      eq.serialNumber.toLowerCase().includes(term) ||
      eq.description.toLowerCase().includes(term) ||
      eq.category.toLowerCase().includes(term)
    );
  };

  useEffect(() => {
    setFilteredEquipment(filterEquipment(equipmentSearchTerm));
  }, [equipmentSearchTerm, technicianEquipment]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dodati funkciju za otvaranje modala za izbor opreme:
  const openEquipmentModal = () => {
    setEquipmentSearchTerm('');
    setFilteredEquipment(technicianEquipment);
    setShowEquipmentModal(true);
  };

  // Dodati funkciju za izbor opreme iz modala:
  const selectEquipment = (equipmentId) => {
    setSelectedEquipment(equipmentId);
    setShowEquipmentModal(false);
  };

  const openRemoveEquipmentDialog = (equipment) => {
    setEquipmentToRemove(equipment);
    setIsEquipmentWorking(true);
    setRemovalReason('');
  };

  const handleRemoveEquipment = async () => {
    if (!equipmentToRemove) {
      return;
    }

    setLoadingEquipment(true);

    try {
      const response = await userEquipmentAPI.remove(equipmentToRemove.id, {
        workOrderId: id,
        technicianId: user.id,
        isWorking: isEquipmentWorking,
        removalReason: removalReason
      });

      toast.success('Oprema je uspešno uklonjena od korisnika!');

      // Ažuriraj prikaz opreme
      const userEqResponse = await axios.get(`${apiUrl}/api/workorders/${id}/user-equipment`);
      setUserEquipment(userEqResponse.data);

      // Ažuriraj opremu tehničara ako je oprema ispravna
      if (isEquipmentWorking) {
        const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user.id}/equipment`);
        setTechnicianEquipment(techEqResponse.data);
        setFilteredEquipment(techEqResponse.data);
      }

      // Reset forme
      setEquipmentToRemove(null);
      setRemovalReason('');
    } catch (error) {
      console.error('Greška pri uklanjanju opreme:', error);
      toast.error(error.response?.data?.error || 'Neuspešno uklanjanje opreme. Pokušajte ponovo.');
    } finally {
      setLoadingEquipment(false);
    }
  };

  const cancelRemoveEquipment = () => {
    setEquipmentToRemove(null);
    setIsEquipmentWorking(true);
    setRemovalReason('');
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, postponeDate: date }));
  };

  const handleDatePickerOpen = () => {
    if (isMobile) {
      const portal = document.getElementById('mobile-datepicker-portal');
      if (portal) {
        portal.classList.add('active');
      }
    }
  };

  const handleDatePickerClose = () => {
    if (isMobile) {
      const portal = document.getElementById('mobile-datepicker-portal');
      if (portal) {
        portal.classList.remove('active');
      }
    }
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validacija tipa fajla i veličine
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      toast.error('Dozvoljeni su samo JPG i PNG formati slika');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error('Slika ne sme biti veća od 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Prikaz preview-a slike
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    setError('');
    
    try {
      // Ako je status odložen, dodajemo datum i vreme odlaganja
      const updatedData = { ...formData };
      
      if (updatedData.status === 'odlozen' && updatedData.postponeDate) {
        const formattedDate = updatedData.postponeDate.toISOString().split('T')[0];
        updatedData.postponeDate = formattedDate;
      }
      
      const response = await axios.put(`${apiUrl}/api/workorders/${id}/technician-update`, updatedData);
      setWorkOrder(response.data);
      toast.success('Radni nalog je uspešno ažuriran!');
      
      // Reset postpone forme ako nije potrebna
      if (updatedData.status !== 'odlozen') {
        setShowPostponeForm(false);
      }
    } catch (error) {
      console.error('Greška pri ažuriranju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje radnog naloga!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = (status) => {
    setFormData(prev => ({ ...prev, status }));
    
    if (status === 'odlozen') {
      setShowPostponeForm(true);
    } else {
      setShowPostponeForm(false);
    }
    
    // Zatvaramo status akcije na mobilnim uređajima
    if (isMobile) {
      setShowStatusActions(false);
    }
  };
  
  const handleImageUpload = async () => {
    if (!imageFile) {
      toast.error('Molimo izaberite sliku');
      return;
    }
    
    setUploadingImage(true);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const response = await axios.post(`${apiUrl}/api/workorders/${id}/images`, formData);
      toast.success('Slika je uspešno dodata!');
      
      // Ažuriranje liste slika
      setImages(response.data.workOrder.images || []);
      
      // Reset polja za sliku
      setImageFile(null);
      setImagePreview('');
      document.getElementById('image-upload').value = '';
    } catch (error) {
      console.error('Greška pri upload-u slike:', error);
      toast.error('Neuspešan upload slike. Pokušajte ponovo.');
    } finally {
      setUploadingImage(false);
    }
  };
  
  const resetImageUpload = () => {
    setImageFile(null);
    setImagePreview('');
    document.getElementById('image-upload').value = '';
  };
  
  // Funkcija za poziv korisnika
  const callUser = () => {
    if (workOrder?.userPhone) {
      window.location.href = `tel:${workOrder.userPhone}`;
    }
  };
  
  // Funkcija za otvaranje lokacije u mapi
  const openInMaps = () => {
    if (workOrder?.address && workOrder?.municipality) {
      const address = `${workOrder.address}, ${workOrder.municipality}`;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank');
    }
  };
  
  if (loading) {
    return (
      <div className="technician-work-order-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Učitavanje radnog naloga...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="technician-work-order-detail fade-in">
        <div className="page-header">
          <h1 className="page-title">Detalji radnog naloga</h1>
          <Link to="/my-work-orders" className="btn btn-sm">
            <BackIcon /> Nazad
          </Link>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="technician-work-order-detail fade-in" ref={mainRef}>
      {/* Pull-to-refresh indikator */}
      <div className={`pull-refresh-indicator ${refreshing ? 'active' : ''}`}>
        <div className={`refresh-icon ${refreshing ? 'spin' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 21h5v-5"></path>
          </svg>
        </div>
        <span>Povucite za osvežavanje</span>
      </div>

      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Radni nalog</h1>
          <div className={`status-indicator status-${formData.status}`}>
            {formData.status === 'zavrsen' ? 'Završen' : 
             formData.status === 'odlozen' ? 'Odložen' :
             formData.status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`status-toggle-btn ${showStatusActions ? 'active' : ''}`}
            onClick={() => setShowStatusActions(!showStatusActions)}
          >
            Status
          </button>
          <Link to="/my-work-orders" className="btn btn-sm btn-back">
            <BackIcon />
          </Link>
        </div>
      </div>
      
      {/* Mobilni status panel */}
      {isMobile && (
        <div className={`mobile-status-panel ${showStatusActions ? 'show' : ''}`}>
          <div className="status-actions">
            <button
              className={`status-btn ${formData.status === 'zavrsen' ? 'active' : ''}`}
              onClick={() => handleStatusChange('zavrsen')}
              disabled={saving}
            >
              <CheckIcon /> Završen
            </button>
            <button
              className={`status-btn ${formData.status === 'nezavrsen' ? 'active' : ''}`}
              onClick={() => handleStatusChange('nezavrsen')}
              disabled={saving}
            >
              <ClockIcon /> Nezavršen
            </button>
            <button
              className={`status-btn ${formData.status === 'odlozen' ? 'active' : ''}`}
              onClick={() => handleStatusChange('odlozen')}
              disabled={saving}
            >
              <AlertIcon /> Odložen
            </button>
            <button
              className={`status-btn ${formData.status === 'otkazan' ? 'active' : ''}`}
              onClick={() => handleStatusChange('otkazan')}
              disabled={saving}
            >
              <CloseIcon /> Otkazan
            </button>
          </div>
        </div>
      )}
      
      <div className="work-order-layout">
        <div className="work-order-main">
          <div className="card user-info-card">
            <div className="card-header">
              <h2>Informacije o korisniku</h2>
            </div>
            <div className="user-contact-actions">
              {workOrder?.userPhone && (
                <button className="contact-action-btn call-btn" onClick={callUser}>
                  <PhoneIcon /> Pozovi
                </button>
              )}
              <button className="contact-action-btn map-btn" onClick={openInMaps}>
                <MapPinIcon /> Mapa
              </button>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <label>Korisnik:</label>
                <p>{workOrder?.userName || 'Nije dostupno'}</p>
              </div>
              <div className="detail-item">
                <label>Telefon:</label>
                <p>{workOrder?.userPhone || 'Nije dostupno'}</p>
              </div>
              <div className="detail-item">
                <label>TIS ID:</label>
                <p>{workOrder?.tisId || 'Nije dostupno'}</p>
              </div>
            </div>
          </div>
          
          <div className="card location-card">
            <div className="card-header">
              <h2>Lokacija</h2>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <label>Opština:</label>
                <p>{workOrder?.municipality}</p>
              </div>
              <div className="detail-item">
                <label>Adresa:</label>
                <p>{workOrder?.address}</p>
              </div>
              <div className="detail-item">
                <label>Datum:</label>
                <p>{new Date(workOrder?.date).toLocaleDateString('sr-RS')}</p>
              </div>
              <div className="detail-item">
                <label>Vreme:</label>
                <p>{workOrder?.time || '09:00'}</p>
              </div>
            </div>
          </div>
          
          <div className="card installation-card">
            <div className="card-header">
              <h2>Detalji instalacije</h2>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <label>Tip instalacije:</label>
                <p>{workOrder?.type}</p>
              </div>
              <div className="detail-item">
                <label>Tehnologija:</label>
                <p>{workOrder?.technology || 'Nije definisana'}</p>
              </div>
              {workOrder?.details && (
                <div className="detail-item full-width">
                  <label>Detalji:</label>
                  <p className="details-text">{workOrder?.details}</p>
                </div>
              )}
            </div>
          </div>
          
          {!isMobile && (
            <div className="card status-card">
              <div className="card-header">
                <h2>Status radnog naloga</h2>
              </div>
              <div className="status-actions">
                <button
                  className={`status-btn ${formData.status === 'zavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('zavrsen')}
                  disabled={saving}
                >
                  <CheckIcon /> Završen
                </button>
                <button
                  className={`status-btn ${formData.status === 'nezavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('nezavrsen')}
                  disabled={saving}
                >
                  <ClockIcon /> Nezavršen
                </button>
                <button
                  className={`status-btn ${formData.status === 'odlozen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('odlozen')}
                  disabled={saving}
                >
                  <AlertIcon /> Odložen
                </button>
                <button
                  className={`status-btn ${formData.status === 'otkazan' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('otkazan')}
                  disabled={saving}
                >
                  <CloseIcon /> Otkazan
                </button>
              </div>
            </div>
          )}
          
          {showPostponeForm && (
            <div className="card postpone-card">
              <div className="card-header">
                <h2>Odlaganje termina</h2>
              </div>
              <div className="postpone-form">
                <div className="form-group">
                  <label htmlFor="postponeDate">Novi datum:</label>
                  <div className="date-picker-container">
                    <DatePicker
                      id="postponeDate"
                      selected={formData.postponeDate}
                      onChange={handleDateChange}
                      dateFormat="dd.MM.yyyy"
                      minDate={new Date()}
                      className="date-picker mobile-optimized"
                      calendarClassName="mobile-calendar"
                      wrapperClassName="date-picker-wrapper"
                      popperClassName="date-picker-popper"
                      withPortal={isMobile}
                      portalId="mobile-datepicker-portal"
                      popperPlacement={isMobile ? "bottom" : "bottom-start"}
                      popperModifiers={isMobile ? [] : [
                        {
                          name: 'preventOverflow',
                          options: {
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        }
                      ]}
                      onCalendarOpen={handleDatePickerOpen}
                      onCalendarClose={handleDatePickerClose}
                      fixedHeight
                    />
                    <CalendarIcon className="date-picker-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="postponeTime">Novo vreme:</label>
                  <input
                    type="time"
                    id="postponeTime"
                    name="postponeTime"
                    value={formData.postponeTime}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="card comments-card">
            <div className="card-header">
              <h2>Komentar tehničara</h2>
            </div>
            <form onSubmit={handleSubmit} className="technician-comments-form">
              <div className="form-group">
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  placeholder="Unesite komentar o izvršenom poslu"
                  disabled={saving}
                  rows="4"
                ></textarea>
              </div>
              
              <div className="form-buttons">
                <button 
                  type="submit" 
                  className="btn btn-primary save-btn"
                  disabled={saving}
                >
                  <SaveIcon /> {saving ? 'Čuvanje...' : 'Sačuvaj'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="card equipment-card">
            <div className="card-header">
              <h2>Oprema korisnika</h2>
            </div>
            
            {userEquipment.length > 0 ? (
              <div className="user-equipment-list">
                <h3>Instalirana oprema:</h3>
                <ul className="equipment-items">
                  {userEquipment.map(eq => (
                    <li key={eq.id} className="equipment-item">
                      <div className="equipment-info">
                        <strong>{eq.equipmentType}:</strong> {eq.equipmentDescription}
                        <span className="serial-number">S/N: {eq.serialNumber}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => openRemoveEquipmentDialog(eq)}
                        disabled={loadingEquipment}
                      >
                        <DeleteIcon /> Ukloni
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="no-equipment-message">Korisnik trenutno nema instaliranu opremu.</p>
            )}

<div className="equipment-form">
              <h3>Dodaj novu opremu:</h3>

              <div className="equipment-selection">
                <button
                  type="button"
                  className="btn btn-secondary select-equipment-btn"
                  onClick={openEquipmentModal}
                  disabled={loadingEquipment || technicianEquipment.length === 0}
                >
                  <SearchIcon /> Izaberi opremu
                </button>
                
                {selectedEquipment && (
                  <div className="selected-equipment-info">
                    {technicianEquipment.find(eq => eq.id === selectedEquipment)?.description} - 
                    S/N: {technicianEquipment.find(eq => eq.id === selectedEquipment)?.serialNumber}
                  </div>
                )}
                
                <button
                  type="button"
                  className="btn btn-primary add-equipment-btn"
                  onClick={handleAddEquipment}
                  disabled={!selectedEquipment || loadingEquipment}
                >
                  {loadingEquipment ? 'Dodavanje...' : 'Dodaj opremu'}
                </button>
              </div>

              {technicianEquipment.length === 0 && (
                <p className="warning-message">
                  Nemate dostupnu opremu u vašem inventaru.
                </p>
              )}
            </div>
          </div>
          
          <div className="card images-card">
            <div className="card-header">
              <h2><ImageIcon /> Slike</h2>
            </div>
            <div className="card-body">
              <div className="image-upload-section">
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="image-upload"
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png"
                    disabled={uploadingImage}
                    className="hidden-upload"
                  />
                  <label htmlFor="image-upload" className="upload-label">
                    <ImageIcon />
                    <span>Fotografiši ili izaberi sliku</span>
                  </label>
                </div>
                
                {imagePreview && (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-cancel"
                        onClick={resetImageUpload}
                      >
                        <CloseIcon /> Ukloni
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-primary"
                        onClick={handleImageUpload}
                        disabled={uploadingImage}
                      >
                        <SaveIcon /> {uploadingImage ? 'Slanje...' : 'Sačuvaj sliku'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="images-gallery">
                {images.length === 0 ? (
                  <p className="no-images-message">Nema dodatih slika</p>
                ) : (
                  <div className="images-grid">
                    {images.map((imageUrl, index) => (
                      <div key={index} className="gallery-image-item">
                        <img 
                          src={`${apiUrl}${imageUrl}`} 
                          alt={`Slika ${index + 1}`} 
                          className="gallery-image" 
                          onClick={() => setShowFullImage(`${apiUrl}${imageUrl}`)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal za pregled slike u punoj veličini */}
      {showFullImage && (
        <div className="modal-overlay image-viewer-overlay" onClick={() => setShowFullImage(null)}>
          <div className="image-viewer-container">
            <img src={showFullImage} alt="Slika u punoj veličini" className="full-size-image" />
            <button className="close-image-btn" onClick={() => setShowFullImage(null)}>
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
      
      {/* Modal za izbor opreme */}
      {showEquipmentModal && (
        <div className="modal-overlay">
          <div className="modal-content equipment-selection-modal">
            <h3>Izbor opreme</h3>
            
            <div className="search-container">
              <input
                type="text"
                placeholder="Pretraži opremu po serijskom broju, opisu ili tipu..."
                value={equipmentSearchTerm}
                onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                className="equipment-search-input"
              />
              <SearchIcon className="search-icon" />
            </div>
            
            <div className="equipment-list">
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map(eq => (
                  <div 
                    key={eq.id} 
                    className="equipment-list-item" 
                    onClick={() => selectEquipment(eq.id)}
                  >
                    <div className="equipment-list-item-info">
                      <div className="equipment-type">{eq.category}</div>
                      <div className="equipment-description">{eq.description}</div>
                      <div className="equipment-serial">SN: {eq.serialNumber}</div>
                    </div>
                    <CheckIcon className="select-icon" />
                  </div>
                ))
              ) : (
                <div className="no-equipment-found">
                  {equipmentSearchTerm 
                    ? 'Nema rezultata za vašu pretragu' 
                    : 'Nemate dostupnu opremu u inventaru'}
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => setShowEquipmentModal(false)}
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal za uklanjanje opreme */}
      {equipmentToRemove && (
        <div className="modal-overlay">
          <div className="modal-content equipment-removal-modal">
            <h3>Uklanjanje opreme</h3>
            <p>Uklanjate: <strong>{equipmentToRemove.equipmentType} - {equipmentToRemove.equipmentDescription}</strong></p>
            <p>Serijski broj: <strong>{equipmentToRemove.serialNumber}</strong></p>

            <div className="form-group">
              <label>Stanje opreme:</label>
              <div className="radio-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="equipmentCondition"
                    checked={isEquipmentWorking}
                    onChange={() => setIsEquipmentWorking(true)}
                  />
                  Ispravna
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="equipmentCondition"
                    checked={!isEquipmentWorking}
                    onChange={() => setIsEquipmentWorking(false)}
                  />
                  Neispravna
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="removalReason">Razlog uklanjanja:</label>
              <textarea
                id="removalReason"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="Unesite razlog uklanjanja opreme"
                rows="3"
              ></textarea>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRemoveEquipment}
                disabled={loadingEquipment}
              >
                {loadingEquipment ? 'Uklanjanje...' : 'Potvrdi uklanjanje'}
              </button>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={cancelRemoveEquipment}
                disabled={loadingEquipment}
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Portal za DatePicker na mobilnim uređajima */}
      <div id="mobile-datepicker-portal"></div>
    </div>
  );
};

export default TechnicianWorkOrderDetail;