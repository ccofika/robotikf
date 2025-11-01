// Edit Work Order Detail - For Admin/SuperAdmin/Supervisor to add equipment/materials
// This is a NEW page separate from technician flow
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrdersAPI, techniciansAPI, userEquipmentAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import {
  BackIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  BoxIcon,
  ToolsIcon,
  PlusIcon,
  DeleteIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/card';
import { cn } from '../../utils/cn';
import EquipmentSelectionModal from './components/EquipmentSelectionModal';
import MaterialsModal from './components/MaterialsModal';

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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'zavrsen':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'nezavrsen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'otkazan':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'odlozen':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-destructive mb-4">
              {error || 'Radni nalog nije pronađen'}
            </p>
            <Button onClick={() => navigate('/edit-work-orders')} variant="outline">
              <BackIcon size={20} />
              Nazad
            </Button>
          </CardContent>
        </Card>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/edit-work-orders')}
        >
          <BackIcon size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Edituj radni nalog</h1>
          <p className="text-muted-foreground">
            Dodaj ili ukloni opremu i materijal za dodeljene tehničare
          </p>
        </div>
      </div>

      {/* Work Order Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{workOrder.tisId || 'N/A'}</CardTitle>
              <CardDescription className="text-base mt-1">
                {workOrder.userName || 'N/A'}
              </CardDescription>
            </div>
            <span className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium",
              getStatusBadgeClass(workOrder.status)
            )}>
              {workOrder.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <MapPinIcon size={20} className="text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Adresa</p>
                <p className="font-medium">{workOrder.address}, {workOrder.municipality}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarIcon size={20} className="text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Datum i vreme</p>
                <p className="font-medium">{formatDate(workOrder.date)} {workOrder.time}</p>
              </div>
            </div>

            {workOrder.type && (
              <div className="flex items-start gap-3">
                <ClockIcon size={20} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Tip</p>
                  <p className="font-medium">{workOrder.type}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Technicians Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dodeljeni tehničari</h2>

        {/* Technician 1 */}
        {technician1 && (
          <Card>
            <CardHeader className="bg-secondary/20">
              <CardTitle className="flex items-center gap-2">
                <UserIcon size={24} />
                {technician1.name || 'Tehničar 1'}
              </CardTitle>
              <CardDescription>Tehničar 1</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Equipment Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BoxIcon size={20} />
                    Oprema
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTechnicianForAction(technician1._id);
                      setShowEquipmentModal(true);
                    }}
                  >
                    <PlusIcon size={16} />
                    Dodaj opremu
                  </Button>
                </div>

                {/* Equipment List */}
                {tech1Equipment.length > 0 ? (
                  <div className="space-y-2">
                    {tech1Equipment.map((equipment) => (
                      <div key={equipment._id} className="flex items-center justify-between p-3 bg-secondary/10 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{equipment.category} - {equipment.description}</div>
                          <div className="text-sm text-muted-foreground mt-1">S/N: {equipment.serialNumber}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEquipment(equipment.id, equipment.technicianId)}
                        >
                          <DeleteIcon size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>Nema instalirane opreme</p>
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* Materials Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ToolsIcon size={20} />
                    Materijali
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTechnicianForAction(technician1._id);
                      setShowMaterialsModal(true);
                    }}
                  >
                    <PlusIcon size={16} />
                    Dodaj materijal
                  </Button>
                </div>

                {/* Materials List */}
                {tech1Materials.length > 0 ? (
                  <div className="space-y-2">
                    {tech1Materials.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary/10 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.material?.type || item.material}</div>
                          <div className="text-sm text-muted-foreground mt-1">Količina: {item.quantity}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMaterial(item.material?._id || item.material, item.technicianId?._id || item.technicianId || technician1._id)}
                        >
                          <DeleteIcon size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>Nema dodanih materijala</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technician 2 - Only show if exists */}
        {technician2 && (
          <Card>
            <CardHeader className="bg-secondary/20">
              <CardTitle className="flex items-center gap-2">
                <UserIcon size={24} />
                {technician2.name || 'Tehničar 2'}
              </CardTitle>
              <CardDescription>Tehničar 2</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Equipment Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BoxIcon size={20} />
                    Oprema
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTechnicianForAction(technician2._id);
                      setShowEquipmentModal(true);
                    }}
                  >
                    <PlusIcon size={16} />
                    Dodaj opremu
                  </Button>
                </div>

                {/* Equipment List */}
                {tech2Equipment.length > 0 ? (
                  <div className="space-y-2">
                    {tech2Equipment.map((equipment) => (
                      <div key={equipment._id} className="flex items-center justify-between p-3 bg-secondary/10 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{equipment.category} - {equipment.description}</div>
                          <div className="text-sm text-muted-foreground mt-1">S/N: {equipment.serialNumber}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEquipment(equipment.id, equipment.technicianId)}
                        >
                          <DeleteIcon size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>Nema instalirane opreme</p>
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* Materials Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ToolsIcon size={20} />
                    Materijali
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTechnicianForAction(technician2._id);
                      setShowMaterialsModal(true);
                    }}
                  >
                    <PlusIcon size={16} />
                    Dodaj materijal
                  </Button>
                </div>

                {/* Materials List */}
                {tech2Materials.length > 0 ? (
                  <div className="space-y-2">
                    {tech2Materials.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary/10 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.material?.type || item.material}</div>
                          <div className="text-sm text-muted-foreground mt-1">Količina: {item.quantity}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMaterial(item.material?._id || item.material, item.technicianId?._id || item.technicianId || technician2._id)}
                        >
                          <DeleteIcon size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>Nema dodanih materijala</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
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
