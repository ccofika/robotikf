import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, ToolsIcon, PlusIcon, MinusIcon, UserIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { techniciansAPI, materialsAPI } from '../../services/api';
import './AssignMaterial.css';

const AssignMaterial = () => {
  const [technician, setTechnician] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [technicianMaterials, setTechnicianMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' ili 'return'
  const { id } = useParams();
  
  useEffect(() => {
    fetchData();
  }, [id]);
  
    const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [techResponse, materialsResponse] = await Promise.all([
        techniciansAPI.getOne(id),
        materialsAPI.getAll()
      ]);
      
      setTechnician(techResponse.data);
      setMaterials(materialsResponse.data);
      setTechnicianMaterials(techResponse.data.materials || []);
      
      // Postavi prvi materijal kao selektovan
      if (materialsResponse.data.length > 0 && activeTab === 'assign') {
        setSelectedMaterial(materialsResponse.data[0]._id);
      } else if (techResponse.data.materials?.length > 0 && activeTab === 'return') {
        setSelectedMaterial(techResponse.data.materials[0].id || techResponse.data.materials[0]._id);
      }
      
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Došlo je do greške pri učitavanju podataka.');
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignMaterial = async () => {
    if (!selectedMaterial) {
      toast.warning('Niste odabrali materijal!');
      return;
    }
    
    if (quantity <= 0) {
      toast.warning('Količina mora biti veća od 0!');
      return;
    }
    
    setLoading(true);
    
    try {
      await techniciansAPI.assignMaterial(id, { 
        materialId: selectedMaterial, 
        quantity: parseInt(quantity, 10)
      });
      toast.success(`Uspešno ste zadužili materijal tehničaru!`);
      fetchData();
      setQuantity(1);
    } catch (error) {
      console.error('Greška pri zaduživanju materijala:', error);
      toast.error(error.response?.data?.error || 'Greška pri zaduživanju materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReturnMaterial = async () => {
    if (!selectedMaterial) {
      toast.warning('Niste odabrali materijal!');
      return;
    }
    
    if (quantity <= 0) {
      toast.warning('Količina mora biti veća od 0!');
      return;
    }
    
    // Provera da li tehničar ima dovoljno materijala
    const techMaterial = technicianMaterials.find(m => m._id === selectedMaterial || m.id === selectedMaterial);
    if (!techMaterial || techMaterial.quantity < quantity) {
      toast.error(`Tehničar nema dovoljno materijala za razduženje. Dostupno: ${techMaterial?.quantity || 0}`);
      return;
    }
    
    setLoading(true);
    
    try {
      await techniciansAPI.returnMaterial(id, { 
        materialId: selectedMaterial, 
        quantity: parseInt(quantity, 10)
      });
      toast.success(`Uspešno ste razdužili materijal!`);
      fetchData();
      setQuantity(1);
    } catch (error) {
      console.error('Greška pri razduživanju materijala:', error);
      toast.error(error.response?.data?.error || 'Greška pri razduživanju materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedMaterial('');  // Reset selekcije
    setQuantity(1);
  };
  
  if (loading && !technician) {
    return <div className="loading-container">Učitavanje...</div>;
  }
  
  // Filtriranje materijala zavisno od aktivnog taba
  const availableMaterials = materials.filter(m => m.quantity > 0);
  
  return (
    <div className="assign-material fade-in">
      <div className="page-header">
        <h1 className="page-title">Zaduženje/Razduženje materijala</h1>
        <Link to={`/technicians/${id}`} className="btn btn-sm">
          <BackIcon /> Nazad na detalje
        </Link>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {technician && (
        <div className="technician-brief">
          <div className="technician-avatar">
            <UserIcon />
          </div>
          <div className="technician-info">
            <h2>{technician.name}</h2>
          </div>
        </div>
      )}
      
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'assign' ? 'active' : ''}`} 
          onClick={() => handleTabChange('assign')}
        >
          <PlusIcon /> Zaduži materijal
        </button>
        <button 
          className={`tab-button ${activeTab === 'return' ? 'active' : ''}`} 
          onClick={() => handleTabChange('return')}
          disabled={technicianMaterials.length === 0}
        >
          <MinusIcon /> Razduži materijal
        </button>
      </div>
      
      <div className="card">
        <h3 className="form-title">
          {activeTab === 'assign' ? 
            <><ToolsIcon /> Zaduženje materijala</> : 
            <><ToolsIcon /> Razduženje materijala</>
          }
        </h3>
        
        <div className="assign-material-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="material">Materijal:</label>
              <select
                id="material"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                disabled={loading || (activeTab === 'assign' && availableMaterials.length === 0) || (activeTab === 'return' && technicianMaterials.length === 0)}
              >
                <option value="">Izaberite materijal</option>
                {activeTab === 'assign' ? (
                  availableMaterials.map(material => (
                    <option key={material._id} value={material._id}>
                      {material.type} (Dostupno: {material.quantity})
                    </option>
                  ))
                ) : (
                  technicianMaterials.map(material => (
                    <option key={material.id || material._id} value={material.id || material._id}>
                      {material.type} (Zaduženo: {material.quantity})
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="quantity">Količina:</label>
              <input
                type="number"
                id="quantity"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={loading || !selectedMaterial}
              />
            </div>
          </div>
          
          <div className="form-actions">
            {activeTab === 'assign' ? (
              <>
                {availableMaterials.length === 0 ? (
                  <p className="no-materials-message">Nema dostupnih materijala u magacinu</p>
                ) : (
                                    <button 
                    className="btn btn-primary"
                    onClick={handleAssignMaterial}
                    disabled={loading || !selectedMaterial || quantity <= 0}
                  >
                    <PlusIcon /> Zaduži materijal
                  </button>
                )}
              </>
            ) : (
              <>
                {technicianMaterials.length === 0 ? (
                  <p className="no-materials-message">Tehničar nema zadužen nijedan materijal</p>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={handleReturnMaterial}
                    disabled={loading || !selectedMaterial || quantity <= 0}
                  >
                    <MinusIcon /> Razduži materijal
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="card material-summary">
        <h3 className="section-title">
          <ToolsIcon /> Pregled stanja materijala
        </h3>
        
        <div className="table-container">
          <table className="materials-table">
            <thead>
              <tr>
                <th>Vrsta</th>
                <th>U magacinu</th>
                <th>Zaduženo</th>
                <th>Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(material => {
                const techAssigned = technicianMaterials.find(m => m._id === material._id || m.id === material._id)?.quantity || 0;
                return (
                  <tr key={material._id}>
                    <td>{material.type}</td>
                    <td>
                      <span className={`quantity ${material.quantity <= 0 ? 'out-of-stock' : material.quantity < 5 ? 'low-stock' : 'in-stock'}`}>
                        {material.quantity}
                      </span>
                    </td>
                    <td>
                      <span className={`quantity ${techAssigned > 0 ? 'assigned' : ''}`}>
                        {techAssigned}
                      </span>
                    </td>
                    <td>{material.quantity + techAssigned}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssignMaterial;