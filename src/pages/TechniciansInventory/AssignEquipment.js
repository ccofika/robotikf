import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI, equipmentAPI } from '../../services/api';
import { describeAssignment } from '../../utils/equipmentAssignment';
import { cx, Btn, Sign, Count } from '../../security/sx/ui';
import { PageHead, Panel, Note, Tabs } from '../../security/sx/layout';
import { SearchField, Checkbox } from '../../security/sx/forms';
import { Pager, Loading, LinkBtn } from '../../montaza/ui';
import './AssignEquipment.mx.css';

const AssignEquipment = () => {
  const [technician, setTechnician] = useState(null);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [assignedEquipment, setAssignedEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' ili 'return'
  const [technicians, setTechnicians] = useState([]);
  // Dodajemo state za pretragu
  const [searchTerm, setSearchTerm] = useState('');
  const { id } = useParams();
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
    fetchTechnicians();
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [techResponse, equipmentResponse] = await Promise.all([
        techniciansAPI.getOne(id),
        equipmentAPI.getAll()
      ]);

      setTechnician(techResponse.data);

      // Razdvajanje opreme na onu koja je dostupna i onu koja je već zadužena kod tehničara
      const available = equipmentResponse.data.filter(item => item.location === 'magacin');
      const assigned = equipmentResponse.data.filter(item => item.location === `tehnicar-${id}`);

      setAvailableEquipment(available);
      setAssignedEquipment(assigned);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Došlo je do greške pri učitavanju podataka.');
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
    }
  };

  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    if (location.startsWith('tehnicar-')) {
      const techId = location.split('-')[1];
      // Pronađi tehničara po ID-u
      const tech = technicians.find(t => t._id === techId);
      return tech ? `Tehničar: ${tech.username || tech.name}` : `Tehničar ID: ${techId}`;
    }
    return location;
  };

  const toggleSelectEquipment = (serialNumber) => {
    setSelectedEquipment(prev => {
      if (prev.includes(serialNumber)) {
        return prev.filter(sn => sn !== serialNumber);
      } else {
        return [...prev, serialNumber];
      }
    });
  };

  const handleAssignEquipment = async () => {
    if (selectedEquipment.length === 0) {
      toast.warning('Niste odabrali nijedan komad opreme!');
      return;
    }

    // OPTIMISTIC UPDATE - immediately move equipment from available to assigned
    const originalAvailable = [...availableEquipment];
    const originalAssigned = [...assignedEquipment];

    // Find selected equipment items and move them
    const equipmentToMove = availableEquipment.filter(item =>
      selectedEquipment.includes(item.serialNumber)
    );

    setAvailableEquipment(prev =>
      prev.filter(item => !selectedEquipment.includes(item.serialNumber))
    );

    // `assignedAt` se pečatira i na backendu (routes/technicians.js) - postavljamo ga
    // i ovde da tek zadužena oprema ne bi u koloni "Zaduženo" ispala kao stara
    // oprema bez pečata dok se lista ne osveži.
    const assignedAtStamp = new Date().toISOString();

    setAssignedEquipment(prev => [
      ...prev,
      ...equipmentToMove.map(item => ({
        ...item,
        location: `tehnicar-${id}`,
        assignedAt: assignedAtStamp
      }))
    ]);

    try {
      await techniciansAPI.assignEquipment(id, { serialNumbers: selectedEquipment });
      toast.success(`Uspešno ste zadužili ${selectedEquipment.length} komada opreme tehničaru!`);
      setSelectedEquipment([]);
      // Success - optimistic update already done
    } catch (error) {
      console.error('Greška pri zaduživanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri zaduživanju opreme!');

      // ROLLBACK - restore original data on error
      setAvailableEquipment(originalAvailable);
      setAssignedEquipment(originalAssigned);
    }
  };

  const handleReturnEquipment = async () => {
    if (selectedEquipment.length === 0) {
      toast.warning('Niste odabrali nijedan komad opreme!');
      return;
    }

    // OPTIMISTIC UPDATE - immediately move equipment from assigned back to available
    const originalAvailable = [...availableEquipment];
    const originalAssigned = [...assignedEquipment];

    // Find selected equipment items and move them back
    const equipmentToReturn = assignedEquipment.filter(item =>
      selectedEquipment.includes(item.serialNumber)
    );

    setAssignedEquipment(prev =>
      prev.filter(item => !selectedEquipment.includes(item.serialNumber))
    );

    setAvailableEquipment(prev => [
      ...prev,
      ...equipmentToReturn.map(item => ({
        ...item,
        location: 'magacin',
        assignedAt: null
      }))
    ]);

    try {
      await techniciansAPI.returnEquipment(id, { serialNumbers: selectedEquipment });
      toast.success(`Uspešno ste razdužili ${selectedEquipment.length} komada opreme!`);
      setSelectedEquipment([]);
      // Success - optimistic update already done
    } catch (error) {
      console.error('Greška pri razduživanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri razduživanju opreme!');

      // ROLLBACK - restore original data on error
      setAvailableEquipment(originalAvailable);
      setAssignedEquipment(originalAssigned);
    }
  };

  const selectAll = () => {
    if (activeTab === 'assign') {
      setSelectedEquipment(filteredAvailableEquipment.map(item => item.serialNumber));
    } else {
      setSelectedEquipment(filteredAssignedEquipment.map(item => item.serialNumber));
    }
  };

  const deselectAll = () => {
    setSelectedEquipment([]);
  };

  // Funkcija za filtriranje opreme prema searchTerm-u
  const filteredAvailableEquipment = availableEquipment.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });

  const filteredAssignedEquipment = assignedEquipment.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });

  // Paginacija - trenutni elementi za prikaz
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAvailableItems = filteredAvailableEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const currentAssignedItems = filteredAssignedEquipment.slice(indexOfFirstItem, indexOfLastItem);

  // Funkcija za promenu stranice
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading && !technician) {
    return (
      <div className="sx-page" data-testid="page-technician-assign-equipment">
        <Loading text="Učitavanje..." />
      </div>
    );
  }

  const isAssign = activeTab === 'assign';
  const filteredItems = isAssign ? filteredAvailableEquipment : filteredAssignedEquipment;
  const currentItems = isAssign ? currentAvailableItems : currentAssignedItems;
  const emptyText = searchTerm ? 'Nema rezultata za pretragu' : isAssign ? 'Nema dostupne opreme u magacinu' : 'Tehničar nema zaduženu opremu';

  return (
    <div className="sx-page" data-testid="page-technician-assign-equipment">
      <PageHead
        eyebrow="Montaža · Tehničari"
        title="Zaduženje/Razduženje opreme"
        lead="Upravljanje opremom tehničara"
        actions={<LinkBtn to={`/technicians/${id}`} icon={ArrowLeft}>Nazad na detalje</LinkBtn>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      {technician && <Panel title={technician.name} sub="Tehničar" className="mx-mb" />}

      {/* tabovi na sredini, kao ranije */}
      <Tabs
        className="justify-center"
        items={[{ key: 'assign', label: 'Zaduži opremu', icon: Plus }, { key: 'return', label: 'Razduži opremu', icon: Minus }]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <Panel
        pad={false}
        footer={<>
          <span className="mx-ae-count mx-ae-count--foot">Odabrano: <b>{selectedEquipment.length}</b> stavka</span>
          {isAssign ? (
            <Btn variant="primary" icon={Plus} onClick={handleAssignEquipment} disabled={loading || selectedEquipment.length === 0}>
              Zaduži opremu
            </Btn>
          ) : (
            <Btn variant="primary" icon={Minus} onClick={handleReturnEquipment} disabled={loading || selectedEquipment.length === 0}>
              Razduži opremu
            </Btn>
          )}
        </>}
      >
        {/* kao ranije: naslov sa brojem i pretraga u vrhu kartice, ispod traka za izbor */}
        <div className="mx-panelbar">
          <div className="mx-ae-title">
            <h2 className="sx-card__title">{isAssign ? 'Oprema dostupna za zaduženje' : 'Oprema za razduženje'}</h2>
            <Count>{filteredItems.length}</Count>
          </div>
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži opremu..." />
        </div>
        <div className="mx-panelbar mx-ae-selbar">
          <Btn size="sm" onClick={selectAll}>Označi sve</Btn>
          <Btn size="sm" onClick={deselectAll}>Poništi</Btn>
          <span className="mx-ae-count">Odabrano: <b>{selectedEquipment.length}</b></span>
        </div>
        {filteredItems.length === 0 ? (
          <div className="sx-empty-block"><b>{emptyText}</b></div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table mx-ae-table">
              <thead>
                <tr>
                  <th className="mx-ae-pick">Odaberi</th>
                  <th>Opis</th>
                  <th>Serijski broj</th>
                  <th>Lokacija</th>
                  {!isAssign && <th>Zaduženo</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => {
                  const on = selectedEquipment.includes(item.serialNumber);
                  const toggle = () => toggleSelectEquipment(item.serialNumber);
                  const assignment = !isAssign && describeAssignment(item, { assumeAssigned: true });
                  return (
                    <tr key={item.id || item.serialNumber} style={{ '--i': index }} className={cx('is-click', on && 'mx-ae-on')} tabIndex={0}
                      onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter') toggle(); }}>
                      <td className="mx-ae-pick">
                        {/* kućica menja izbor sama; klik ne ide do reda (inače bi se izbor promenio dvaput) */}
                        <span onClick={(e) => e.stopPropagation()}><Checkbox checked={on} onChange={toggle} /></span>
                      </td>
                      <td className="is-head"><b className="mx-strong">{item.description}</b></td>
                      <td data-label="Serijski broj"><span className="sx-mono">{item.serialNumber}</span></td>
                      <td data-label="Lokacija">
                        <Sign tone={item.location === 'magacin' ? 'idle' : 'info'}>{translateLocation(item.location)}</Sign>
                      </td>
                      {!isAssign && (
                        <td data-label="Zaduženo">
                          <span className={assignment.variant === 'stamped' ? 'sx-mono sx-nowrap' : 'sx-faint'}>{assignment.text}</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={currentPage} total={filteredItems.length} perPage={itemsPerPage} onPage={paginate} />
      </Panel>
    </div>
  );
};

export default AssignEquipment;
