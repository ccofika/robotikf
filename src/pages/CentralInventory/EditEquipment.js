import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackIcon, SaveIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from 'react-toastify';
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
        setEquipment(equipmentResponse.data);
        
        // Dohvati tehničare
        const techniciansResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/technicians`);
        setTechnicians(techniciansResponse.data);
        
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
          <option key={tech.id} value={`tehnicar-${tech.id}`}>
            Tehničar: {tech.name}
          </option>
        ))}
      </>
    );
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEquipment(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await equipmentAPI.update(id, equipment);
      toast.success('Oprema uspešno izmenjena!');
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