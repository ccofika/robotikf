import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackIcon, SaveIcon, EditIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { equipmentAPI, techniciansAPI } from '../../services/api';
import { cn } from '../../utils/cn';

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
  
  // Optimizovano učitavanje podataka o opremi
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        console.log('EditEquipment: Starting optimized data fetch...');
        const startTime = Date.now();

        // OPTIMIZACIJA: Paralelni pozivi umesto sekvencijalnih
        const [equipmentResponse, techniciansResponse, categoriesResponse] = await Promise.all([
          equipmentAPI.getOne(id),
          techniciansAPI.getAll(),
          equipmentAPI.getCategories()
        ]);

        const equipmentData = equipmentResponse.data;
        const techniciansData = techniciansResponse.data;

        setTechnicians(techniciansData);
        setCategories(categoriesResponse.data); // Direktno koristi optimizovane kategorije

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

        const endTime = Date.now();
        console.log(`EditEquipment: Data loaded in ${endTime - startTime}ms`);

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
          updateData.location = `tehnicar-${technicianId}`;
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3 text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Učitavanje opreme...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <EditIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Izmena opreme</h1>
              <p className="text-slate-600 mt-1">Uredite detalje o opremi</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/equipment">
              <Button
                type="secondary"
                size="medium"
                prefix={<BackIcon size={16} />}
              >
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Modern Form Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Row - Category and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-slate-700">
                  Kategorija
                </label>
                <select
                  id="category"
                  name="category"
                  value={equipment.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                >
                  <option value="" disabled>Izaberite kategoriju</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Opis
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={equipment.description}
                  onChange={handleInputChange}
                  placeholder="Unesite opis opreme"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                />
              </div>
            </div>

            {/* Second Row - Serial Number and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="serialNumber" className="block text-sm font-medium text-slate-700">
                  Serijski broj
                </label>
                <input
                  type="text"
                  id="serialNumber"
                  name="serialNumber"
                  value={equipment.serialNumber}
                  onChange={handleInputChange}
                  placeholder="Unesite serijski broj"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium text-slate-700">
                  Lokacija
                </label>
                <select
                  id="location"
                  name="location"
                  value={equipment.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                >
                  {renderLocationOptions()}
                </select>
              </div>
            </div>

            {/* Third Row - Status */}
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={equipment.status}
                onChange={handleInputChange}
                required
                className="w-full md:w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
              >
                <option value="available">Dostupno</option>
                <option value="assigned">Zaduženo</option>
                <option value="defective">Neispravno</option>
              </select>

              {/* Defective Status Warning */}
              {equipment.status === 'defective' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-amber-600 text-lg">⚠️</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-2">Napomena o neispravnoj opremi</h4>
                      <p className="text-sm text-amber-700 mb-2">
                        Kada označite opremu kao neispravnu, ona će automatski biti:
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
                        <li>Premeštena u lokaciju "defective"</li>
                        <li>Uklonjena iz dodele tehničaru/korisniku</li>
                        <li>Dostupna u listi neispravne opreme</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
              <Link to="/equipment">
                <Button
                  type="tertiary"
                  size="medium"
                >
                  Otkaži
                </Button>
              </Link>
              <Button
                type="primary"
                size="medium"
                prefix={<SaveIcon size={16} />}
                onClick={handleSubmit}
              >
                Sačuvaj izmene
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEquipment;