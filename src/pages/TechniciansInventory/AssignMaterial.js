import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, ToolsIcon, PlusIcon, MinusIcon, UserIcon, BoxIcon } from '../../components/icons/SvgIcons';
import { toast } from '../../utils/toast';
import { techniciansAPI, materialsAPI } from '../../services/api';
import { Button } from '../../components/ui/button-1';
import { cn } from '../../utils/cn';

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg font-medium text-slate-600">Učitavanje...</div>
      </div>
    );
  }
  
  // Filtriranje materijala zavisno od aktivnog taba
  const availableMaterials = materials.filter(m => m.quantity > 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <ToolsIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Zaduženje/Razduženje materijala</h1>
              <p className="text-slate-600 mt-1">Upravljanje materijalima tehničara</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button type="secondary" size="medium" prefix={<BackIcon size={16} />} asChild>
              <Link to={`/technicians/${id}`}>
                Nazad na detalje
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {technician && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <UserIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{technician.name}</h2>
              <p className="text-slate-600">Tehničar</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-6 bg-slate-100 rounded-lg p-4">
          <button 
            onClick={() => handleTabChange('assign')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'assign' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <PlusIcon size={16} />
            <span>Zaduži materijal</span>
          </button>
          <button 
            onClick={() => handleTabChange('return')}
            disabled={technicianMaterials.length === 0}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed",
              activeTab === 'return' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <MinusIcon size={16} />
            <span>Razduži materijal</span>
          </button>
        </div>
      </div>
      
      {/* Main Assignment Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <ToolsIcon size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              {activeTab === 'assign' ? 'Zaduženje materijala' : 'Razduženje materijala'}
            </h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="material" className="text-sm font-medium text-slate-700">Materijal:</label>
              <select
                id="material"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                disabled={loading || (activeTab === 'assign' && availableMaterials.length === 0) || (activeTab === 'return' && technicianMaterials.length === 0)}
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
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
            
            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium text-slate-700">Količina:</label>
              <input
                type="number"
                id="quantity"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={loading || !selectedMaterial}
                className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            {activeTab === 'assign' ? (
              <>
                {availableMaterials.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">
                    Nema dostupnih materijala u magacinu
                  </div>
                ) : (
                  <Button 
                    type="primary" 
                    size="medium"
                    prefix={<PlusIcon size={16} />}
                    onClick={handleAssignMaterial}
                    disabled={loading || !selectedMaterial || quantity <= 0}
                  >
                    Zaduži materijal
                  </Button>
                )}
              </>
            ) : (
              <>
                {technicianMaterials.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">
                    Tehničar nema zadužen nijedan materijal
                  </div>
                ) : (
                  <Button 
                    type="primary" 
                    size="medium"
                    prefix={<MinusIcon size={16} />}
                    onClick={handleReturnMaterial}
                    disabled={loading || !selectedMaterial || quantity <= 0}
                  >
                    Razduži materijal
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Materials Overview Table */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <BoxIcon size={20} className="text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Pregled stanja materijala</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vrsta</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">U magacinu</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Zaduženo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Ukupno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {materials.map(material => {
                const techAssigned = technicianMaterials.find(m => m._id === material._id || m.id === material._id)?.quantity || 0;
                return (
                  <tr key={material._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{material.type}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        material.quantity <= 0 
                          ? "bg-red-100 text-red-800" 
                          : material.quantity < 5 
                            ? "bg-yellow-100 text-yellow-800" 
                            : "bg-green-100 text-green-800"
                      )}>
                        {material.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        techAssigned > 0 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-gray-100 text-gray-800"
                      )}>
                        {techAssigned}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{material.quantity + techAssigned}</td>
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