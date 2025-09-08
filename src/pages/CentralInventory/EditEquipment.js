import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackIcon, SaveIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from '../../utils/toast';
import { equipmentAPI } from '../../services/api';

const EditEquipment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [equipment, setEquipment] = useState({
    category: '',
    description: '',
    serialNumber: '',
    location: '',
    status: ''
  });
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState(['magacin']);
  const [technicians, setTechnicians] = useState([]);
  
  // Učitavanje podataka o opremi
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const equipmentResponse = await equipmentAPI.getOne(id);
        const equipmentData = equipmentResponse.data;
        
        // Dohvati tehničare
        const techniciansResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/technicians`);
        const techniciansData = techniciansResponse.data;
        setTechnicians(techniciansData);
        
        // Pripremi lokaciju za prikaz
        let displayLocation = equipmentData.location;
        
        // Ako je oprema kod tehničara preko assignedTo polja, postavi lokaciju na tehnicar-{id}
        if (equipmentData.assignedTo && (!equipmentData.location || equipmentData.location === 'tehnicar')) {
          displayLocation = `tehnicar-${equipmentData.assignedTo}`;
        }
        // Ako lokacija već sadrži tehnicar- ali nije validna, postavi na magacin
        else if (equipmentData.location && equipmentData.location.startsWith('tehnicar-')) {
          const technicianId = equipmentData.location.replace('tehnicar-', '');
          const technicianExists = techniciansData.find(tech => tech._id === technicianId);
          if (!technicianExists) {
            displayLocation = 'magacin';
          }
        }
        
        setEquipment({
          ...equipmentData,
          location: displayLocation
        });
        
        // Učitaj sve kategorije
        const allEquipmentResponse = await equipmentAPI.getAll();
        const allEquipment = allEquipmentResponse.data;
        
        // Izdvoji jedinstvene kategorije
        const uniqueCategories = [...new Set(allEquipment.map(item => item.category))];
        setCategories(uniqueCategories);
        
        setLoading(false);
      } catch (error) {
        console.error('Greška pri učitavanju opreme:', error);
        setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
        setLoading(false);
        toast.error('Neuspešno učitavanje opreme!');
      }
    };
    
    fetchEquipment();
  }, [id]);

  const renderLocationOptions = () => {
    return (
      <>
        <option value="magacin">Magacin</option>
        {technicians.map(tech => (
          <option key={tech._id} value={`tehnicar-${tech._id}`}>
            Tehničar: {tech.name}
          </option>
        ))}
      </>
    );
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEquipment(prev => ({ ...prev, [name]: value }));
    
    // Upozorenje kada se status menja na "defective"
    if (name === 'status' && value === 'defective') {
      toast.warning('⚠️ Oprema će biti automatski premeštena u listu neispravne opreme!', {
        autoClose: 5000
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Pripremi podatke za slanje
      const updateData = { ...equipment };
      
      // Logika za upravljanje lokacijom i assignedTo poljem
      if (equipment.location && equipment.location.startsWith('tehnicar-')) {
        const technicianId = equipment.location.replace('tehnicar-', '');
        // Validiraj da tehničar postoji
        const technicianExists = technicians.find(tech => tech._id === technicianId);
        if (technicianExists) {
          updateData.assignedTo = technicianId;
          updateData.status = 'assigned';
        } else {
          throw new Error('Izabrani tehničar ne postoji');
        }
      } else if (equipment.location === 'magacin') {
        updateData.assignedTo = null;
        updateData.assignedToUser = null;
        if (equipment.status === 'assigned') {
          updateData.status = 'available';
        }
      }
      
      // Ako je status promenjen na "defective", automatski postavi potrebne vrednosti
      if (equipment.status === 'defective') {
        updateData.location = 'defective';
        updateData.removedAt = new Date().toISOString();
        updateData.assignedTo = null;
        updateData.assignedToUser = null;
        
        console.log('🔧 Equipment marked as defective - automatic transition applied');
        console.log('📅 Removed at:', updateData.removedAt);
      }
      
      await equipmentAPI.update(id, updateData);
      toast.success('Oprema uspešno izmenjena!');
      
      // Ako je oprema označena kao neispravna, obavesti korisnika
      if (equipment.status === 'defective') {
        toast.info('Oprema je automatski premeštena u defektivnu opremu i dostupna je u listi neispravne opreme.');
      }
      
      navigate('/equipment');
    } catch (error) {
      console.error('Greška pri izmeni opreme:', error);
      toast.error('Neuspešna izmena opreme!');
      setError(error.response?.data?.error || 'Greška pri izmeni opreme. Pokušajte ponovo.');
    }
  };
  
  if (loading) {
    return (
      <div className="equipment-edit">
        <div className="loading-text">Učitavanje opreme...</div>
      </div>
    );
  }
  
  return (
    <div className="equipment-edit fade-in">
      <div className="page-header">
        <h1 className="page-title">Izmena opreme</h1>
        <Link to="/equipment" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card">
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Kategorija:</label>
              <select 
                id="category" 
                name="category" 
                value={equipment.category} 
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Izaberite kategoriju</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Opis:</label>
              <input 
                type="text"
                id="description"
                name="description"
                value={equipment.description}
                onChange={handleInputChange}
                placeholder="Unesite opis opreme"
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serialNumber">Serijski broj:</label>
              <input 
                type="text"
                id="serialNumber"
                name="serialNumber"
                value={equipment.serialNumber}
                onChange={handleInputChange}
                placeholder="Unesite serijski broj"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="location">Lokacija:</label>
              <select 
                id="location" 
                name="location" 
                value={equipment.location} 
                onChange={handleInputChange}
                required
              >
                {renderLocationOptions()}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status:</label>
              <select 
                id="status" 
                name="status" 
                value={equipment.status} 
                onChange={handleInputChange}
                required
              >
                <option value="available">Dostupno</option>
                <option value="assigned">Zaduženo</option>
                <option value="defective">Neispravno</option>
              </select>
              {equipment.status === 'defective' && (
                <div className="info-message defective-warning">
                  <strong>⚠️ Napomena:</strong> Kada označite opremu kao neispravnu, ona će automatski biti:
                  <ul>
                    <li>Premeštena u lokaciju "defective"</li>
                    <li>Uklonjena iz dodele tehničaru/korisniku</li>
                    <li>Dostupna u listi neispravne opreme</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <SaveIcon /> Sačuvaj izmene
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEquipment;