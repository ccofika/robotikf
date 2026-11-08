// Edit Work Order Detail - For Admin/SuperAdmin/Supervisor to add equipment/materials
// This is a NEW page separate from technician flow
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrdersAPI, techniciansAPI, userEquipmentAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { ArrowLeft, Plus, Trash2, Package, Cable, MapPin, CalendarDays, Clock, UserRound } from 'lucide-react';
import { getTimLabel } from '../../utils/tim';
import { cx, Btn, Sign, Avatar } from '../../security/sx/ui';
import { PageHead, Panel } from '../../security/sx/layout';
import { SheetSection } from '../../security/sx/Sheet';
import { Loading } from '../../montaza/ui';
import './EditWorkOrderDetail.mx.css';
import EquipmentSelectionModal from './components/EquipmentSelectionModal';
import MaterialsModal from './components/MaterialsModal';

// Ton znaka statusa (završen ok, nezavršen warn, odložen info, otkazan bad); natpis ostaje sirov status kao ranije
const STATUS_TONE = { zavrsen: 'ok', nezavrsen: 'warn', odlozen: 'info', otkazan: 'bad' };

const EditWorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Equipment and Materials state
  const [technicianEquipment, setTechnicianEquipment] = useState([]);
  const [technician2Equipment, setTechnician2Equipment] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [available2Materials, setAvailable2Materials] = useState([]);
  const [usedMaterials, setUsedMaterials] = useState([]);
  const [userEquipment, setUserEquipment] = useState([]);
  const [removedEquipment, setRemovedEquipment] = useState([]);

  // Modal states
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [selectedTechnicianForAction, setSelectedTechnicianForAction] = useState(null);

  // Equipment modal search state
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const equipmentSearchInputRef = useRef(null);

  // Materials modal state
  const selectedMaterialRef = useRef('');
  const materialQuantityRef = useRef('');
  const [materialModalKey, setMaterialModalKey] = useState(0);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await workOrdersAPI.getOne(id);
      setWorkOrder(response.data);
      setUsedMaterials(response.data.materials || []);

      // Fetch equipment and materials for assigned technicians
      const technicianId = response.data.technicianId?._id || response.data.technicianId;
      const technician2Id = response.data.technician2Id?._id || response.data.technician2Id;

      // Fetch first technician's equipment and materials
      if (technicianId) {
        const techEqResponse = await techniciansAPI.getEquipment(technicianId);
        setTechnicianEquipment(techEqResponse.data);

        const techMatResponse = await techniciansAPI.getMaterials(technicianId);
        setAvailableMaterials(techMatResponse.data);
      }

      // Fetch second technician's equipment and materials if exists
      if (technician2Id) {
        const tech2EqResponse = await techniciansAPI.getEquipment(technician2Id);
        setTechnician2Equipment(tech2EqResponse.data);

        const tech2MatResponse = await techniciansAPI.getMaterials(technician2Id);
        setAvailable2Materials(tech2MatResponse.data);
      }

      // Fetch user equipment
      const userEqResponse = await workOrdersAPI.getUserEquipment(id);
      setUserEquipment(userEqResponse.data);

      // Fetch removed equipment
      const removedEqResponse = await userEquipmentAPI.getRemovedForWorkOrder(id);
      setRemovedEquipment(removedEqResponse.data);

    } catch (err) {
      console.error('Error fetching work order:', err);
      setError('Greška pri učitavanju radnog naloga');
      toast.error('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async (equipmentId) => {
    try {
      // Use userEquipmentAPI to add equipment (same as technician flow)
      // IMPORTANT: Always use tisId, not MongoDB _id
      const userId = workOrder.tisId;

      const response = await userEquipmentAPI.add({
        userId,
        equipmentId,
        workOrderId: id,
        technicianId: selectedTechnicianForAction
      });

      toast.success('Oprema uspešno dodata');
      setShowEquipmentModal(false);
      setSelectedTechnicianForAction(null);
      setEquipmentSearchTerm('');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju opreme');
    }
  };

  const handleRemoveEquipment = async (equipmentId, technicianId) => {
    try {
      await userEquipmentAPI.remove(equipmentId, {
        workOrderId: id,
        technicianId: technicianId,
        isWorking: true,
        removalReason: 'Uklonjeno preko Edit stranice'
      });

      toast.success('Oprema uspešno uklonjena');
      fetchData();
    } catch (error) {
      console.error('Error removing equipment:', error);
      toast.error('Greška pri uklanjanju opreme');
    }
  };

  const handleAddMaterial = async () => {
    const materialId = selectedMaterialRef.current;
    const quantity = parseInt(materialQuantityRef.current);

    if (!materialId || !quantity || quantity <= 0) {
      toast.error('Molimo izaberite materijal i unesite validnu količinu');
      return;
    }

    setLoadingMaterials(true);

    try {
      // Get current used materials for this work order
      const currentMaterials = usedMaterials || [];

      // Find if this material already exists
      const existingMaterial = currentMaterials.find(
        m => (m.material?._id || m.material) === materialId
      );

      let updatedMaterials;
      if (existingMaterial) {
        // Update quantity
        updatedMaterials = currentMaterials.map(m => {
          if ((m.material?._id || m.material) === materialId) {
            return {
              material: materialId,
              quantity: m.quantity + quantity
            };
          }
          return {
            material: m.material._id || m.material,
            quantity: m.quantity
          };
        });
      } else {
        // Add new material
        updatedMaterials = [
          ...currentMaterials.map(m => ({
            material: m.material._id || m.material,
            quantity: m.quantity
          })),
          { material: materialId, quantity }
        ];
      }

      await workOrdersAPI.updateUsedMaterials(id, {
        materials: updatedMaterials,
        technicianId: selectedTechnicianForAction
      });

      toast.success('Materijal uspešno dodat');
      setShowMaterialsModal(false);
      setSelectedTechnicianForAction(null);

      // Reset material modal state
      selectedMaterialRef.current = '';
      materialQuantityRef.current = '';
      setMaterialModalKey(prev => prev + 1);

      fetchData();
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju materijala');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleRemoveMaterial = async (materialId, technicianId) => {
    try {
      const updatedMaterials = usedMaterials
        .filter(m => (m.material._id || m.material) !== materialId)
        .map(m => ({
          material: m.material._id || m.material,
          quantity: m.quantity,
          technicianId: m.technicianId?._id || m.technicianId
        }));

      await workOrdersAPI.updateUsedMaterials(id, {
        materials: updatedMaterials,
        technicianId: technicianId
      });

      toast.success('Materijal uspešno uklonjen');
      fetchData();
    } catch (error) {
      console.error('Error removing material:', error);
      toast.error('Greška pri uklanjanju materijala');
    }
  };

  const closeMaterialsModal = () => {
    setShowMaterialsModal(false);
    setSelectedTechnicianForAction(null);
    selectedMaterialRef.current = '';
    materialQuantityRef.current = '';
    setMaterialModalKey(prev => prev + 1);
  };

  // Equipment modal helpers
  const getFilteredEquipment = useCallback(() => {
    const equipment = selectedTechnicianForAction === workOrder?.technicianId?._id
      ? technicianEquipment
      : technician2Equipment;

    if (!equipmentSearchTerm) return equipment;

    return equipment.filter(eq =>
      eq.category?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
      eq.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
      eq.serialNumber?.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
    );
  }, [selectedTechnicianForAction, workOrder, technicianEquipment, technician2Equipment, equipmentSearchTerm]);

  const handleEquipmentSearchChange = (e) => {
    setEquipmentSearchTerm(e.target.value);
  };

  const clearEquipmentSearch = () => {
    setEquipmentSearchTerm('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="sx-page" data-testid="page-edit-work-order-detail">
        <Loading text="Učitavanje..." rows={6} />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="sx-page" data-testid="page-edit-work-order-detail">
        <Panel>
          <div className="sx-empty-block">
            <b className="mx-woed__error">{error || 'Radni nalog nije pronađen'}</b>
            <Btn icon={ArrowLeft} onClick={() => navigate('/edit-work-orders')}>Nazad</Btn>
          </div>
        </Panel>
      </div>
    );
  }

  const technician1 = workOrder.technicianId;
  const technician2 = workOrder.technician2Id;

  // Filter equipment for each technician
  // Note: userEquipment comes from workOrder.installedEquipment which has technicianId field
  const tech1Equipment = userEquipment.filter(eq => {
    return eq.technicianId && eq.technicianId.toString() === technician1?._id?.toString();
  });

  const tech2Equipment = userEquipment.filter(eq => {
    return eq.technicianId && eq.technicianId.toString() === technician2?._id?.toString();
  });

  // Filter materials for each technician
  // If material has no technicianId (old materials), show it for tech1 only
  const tech1Materials = usedMaterials.filter(mat => {
    const matTechId = mat.technicianId?._id || mat.technicianId;
    // Show if: no technicianId (old materials) OR technicianId matches tech1
    return !matTechId || matTechId.toString() === technician1?._id?.toString();
  });

  const tech2Materials = usedMaterials.filter(mat => {
    const matTechId = mat.technicianId?._id || mat.technicianId;
    // Show only if technicianId explicitly matches tech2
    return matTechId && matTechId.toString() === technician2?._id?.toString();
  });

  // Panel jednog tehničara: oprema i materijali (isti handleri za oba tehničara, kao ranije)
  const renderTechnician = (technician, label, equipmentList, materialsList) => (
    <Panel
      title={<span className="sx-panel__title-row"><Avatar name={technician.name || label} />{technician.name || label}</span>}
      sub={label}
      testId="edit-wo-technician"
    >
      <SheetSection
        title="Oprema"
        aside={<Btn size="sm" icon={Plus} onClick={() => { setSelectedTechnicianForAction(technician._id); setShowEquipmentModal(true); }}>Dodaj opremu</Btn>}
      >
        {equipmentList.length > 0 ? (
          <div className="sx-list mx-woed__list">
            {equipmentList.map((equipment) => (
              <div key={equipment._id} className="sx-item">
                <span className="sx-item__icon"><Package size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                <div className="sx-item__main">
                  <b>{equipment.category} - {equipment.description}</b>
                  <span className="sx-mono">S/N: {equipment.serialNumber}</span>
                </div>
                <div className="sx-item__side">
                  <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" aria-label="Ukloni"
                    onClick={() => handleRemoveEquipment(equipment.id, equipment.technicianId)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mx-woed__empty">Nema instalirane opreme</p>
        )}
      </SheetSection>

      <SheetSection
        title="Materijali"
        aside={<Btn size="sm" icon={Plus} onClick={() => { setSelectedTechnicianForAction(technician._id); setShowMaterialsModal(true); }}>Dodaj materijal</Btn>}
      >
        {materialsList.length > 0 ? (
          <div className="sx-list mx-woed__list">
            {materialsList.map((item, index) => (
              <div key={index} className="sx-item">
                <span className="sx-item__icon"><Cable size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                <div className="sx-item__main">
                  <b>{item.material?.type || item.material}</b>
                  <span>Količina: <span className="sx-mono">{item.quantity}</span></span>
                </div>
                <div className="sx-item__side">
                  <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" aria-label="Ukloni"
                    onClick={() => handleRemoveMaterial(item.material?._id || item.material, item.technicianId?._id || item.technicianId || technician._id)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mx-woed__empty">Nema dodanih materijala</p>
        )}
      </SheetSection>
    </Panel>
  );

  return (
    <div className="sx-page" data-testid="page-edit-work-order-detail">
      <PageHead
        back={{ label: 'Nazad', onClick: () => navigate('/edit-work-orders') }}
        eyebrow="Montaža · Edit"
        title="Edituj radni nalog"
        lead="Dodaj ili ukloni opremu i materijal za dodeljene tehničare"
      />

      <div className="sx-stack">
        {/* Work Order Info */}
        <Panel
          title={workOrder.tisId || 'N/A'}
          sub={workOrder.userName || 'N/A'}
          actions={<Sign tone={STATUS_TONE[workOrder.status] || 'idle'}>{workOrder.status}</Sign>}
          testId="edit-wo-info"
        >
          <div className="mx-woed__facts">
            <div className="mx-woed__fact">
              <MapPin aria-hidden="true" strokeWidth={1.8} />
              <div><span>Adresa</span><b>{workOrder.address}, {workOrder.municipality}</b></div>
            </div>
            <div className="mx-woed__fact">
              <CalendarDays aria-hidden="true" strokeWidth={1.8} />
              <div><span>Datum i vreme</span><b className="sx-mono">{formatDate(workOrder.date)} {workOrder.time}</b></div>
            </div>
            {workOrder.type && (
              <div className="mx-woed__fact">
                <Clock aria-hidden="true" strokeWidth={1.8} />
                <div><span>Tip</span><b>{workOrder.type}</b></div>
              </div>
            )}
            <div className="mx-woed__fact">
              <UserRound aria-hidden="true" strokeWidth={1.8} />
              <div><span>Tim</span><b><span className={cx('sx-tag', workOrder.tim === 'robotik' && 'is-info', workOrder.tim === 'mtel' && 'is-bad')}>{getTimLabel(workOrder.tim)}</span></b></div>
            </div>
          </div>
        </Panel>

        {/* Technicians Section */}
        <section className="sx-stack mx-woed__techs">
          <h2 className="sx-card__title mx-woed__h2">Dodeljeni tehničari</h2>
          {technician1 && renderTechnician(technician1, 'Tehničar 1', tech1Equipment, tech1Materials)}
          {technician2 && renderTechnician(technician2, 'Tehničar 2', tech2Equipment, tech2Materials)}
        </section>
      </div>

      {/* Equipment Selection Modal */}
      {showEquipmentModal && (
        <EquipmentSelectionModal
          showEquipmentModal={showEquipmentModal}
          closeModal={() => {
            setShowEquipmentModal(false);
            setSelectedTechnicianForAction(null);
            setEquipmentSearchTerm('');
          }}
          stableEquipment={
            selectedTechnicianForAction === technician1?._id
              ? technicianEquipment
              : technician2Equipment
          }
          getFilteredEquipment={getFilteredEquipment}
          searchTerm={equipmentSearchTerm}
          searchInputRef={equipmentSearchInputRef}
          handleSearchChange={handleEquipmentSearchChange}
          clearSearch={clearEquipmentSearch}
          isSearching={false}
          selectEquipment={handleAddEquipment}
        />
      )}

      {/* Materials Selection Modal */}
      {showMaterialsModal && (
        <MaterialsModal
          showMaterialsModal={showMaterialsModal}
          materialModalKey={materialModalKey}
          selectedMaterialRef={selectedMaterialRef}
          materialQuantityRef={materialQuantityRef}
          availableMaterials={
            selectedTechnicianForAction === technician1?._id
              ? availableMaterials
              : available2Materials
          }
          closeMaterialsModal={closeMaterialsModal}
          addMaterial={handleAddMaterial}
          loadingMaterials={loadingMaterials}
        />
      )}
    </div>
  );
};

export default EditWorkOrderDetail;
