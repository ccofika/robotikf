import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '../../utils/toast';
import { equipmentAPI, techniciansAPI } from '../../services/api';
import { Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note } from '../../security/sx/layout';
import { Field, Input, Select } from '../../security/sx/forms';
import { LinkBtn, Loading } from '../../montaza/ui';
import './EditEquipment.mx.css';

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
        {technicians.filter(tech => !tech.deletedAt || equipment.location === `tehnicar-${tech._id}`).map(tech => (
          <option key={tech._id} value={`tehnicar-${tech._id}`}>
            Tehničar: {tech.name}{tech.deletedAt ? ' (obrisan)' : ''}
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
  
  const head = (
    <PageHead
      eyebrow="Montaža · Inventar"
      title="Izmena opreme"
      lead="Uredite detalje o opremi"
      actions={<LinkBtn to="/equipment" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
    />
  );

  if (loading) {
    return (
      <div className="sx-page" data-testid="page-equipment-edit">
        {head}
        <Panel pad={false}><Loading text="Učitavanje opreme..." /></Panel>
      </div>
    );
  }
  
  return (
    <div className="sx-page" data-testid="page-equipment-edit">
      {head}

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      {/* Sačuvaj je kao ranije "submit" dugme forme sa onClick (handleSubmit sprečava dupli poziv) */}
      <form onSubmit={handleSubmit}>
        <Panel
          footer={<>
            <LinkBtn to="/equipment" variant="ghost">Otkaži</LinkBtn>
            <Btn type="submit" variant="primary" icon={Save} onClick={handleSubmit}>Sačuvaj izmene</Btn>
          </>}
        >
          <div className="sx-form">
            <Field label="Kategorija" htmlFor="category">
              <Select id="category" name="category" value={equipment.category} onChange={handleInputChange} required>
                <option value="" disabled>Izaberite kategoriju</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </Field>

            <Field label="Opis" htmlFor="description">
              <Input type="text" id="description" name="description" value={equipment.description} onChange={handleInputChange} placeholder="Unesite opis opreme" required />
            </Field>

            <Field label="Serijski broj" htmlFor="serialNumber">
              <Input type="text" id="serialNumber" name="serialNumber" value={equipment.serialNumber} onChange={handleInputChange} placeholder="Unesite serijski broj" required mono />
            </Field>

            <Field label="Lokacija" htmlFor="location">
              <Select id="location" name="location" value={equipment.location} onChange={handleInputChange} required>
                {renderLocationOptions()}
              </Select>
            </Field>

            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" value={equipment.status} onChange={handleInputChange} required>
                <option value="available">Dostupno</option>
                <option value="assigned">Zaduženo</option>
                <option value="defective">Neispravno</option>
              </Select>
            </Field>

            {equipment.status === 'defective' && (
              <Note tone="warn" className="is-wide">
                <b>Napomena o neispravnoj opremi</b>
                <p className="mx-ee-p">Kada označite opremu kao neispravnu, ona će automatski biti:</p>
                <ul className="mx-ee-list">
                  <li>Premeštena u lokaciju "defective"</li>
                  <li>Uklonjena iz dodele tehničaru/korisniku</li>
                  <li>Dostupna u listi neispravne opreme</li>
                </ul>
              </Note>
            )}
          </div>
        </Panel>
      </form>
    </div>
  );
};

export default EditEquipment;