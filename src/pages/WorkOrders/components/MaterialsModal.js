import React, { useState, useEffect } from 'react';
import { Btn } from '../../../security/sx/ui';
import { Field, Input, Select } from '../../../security/sx/forms';
import Dialog from '../../../security/sx/Dialog';
import '../TechnicianWorkOrderDetail.mx.css';

// Dodavanje materijala (radni nalog tehničara i Edit naloga): Security dijalog (na telefonu odozdo), isti sadržaj i
// redosled kao ranije (Materijal, Količina, Otkaži i Dodaj materijal iste širine). Props su isti.
const MaterialsModalContent = React.memo(({
  selectedMaterialRef,
  materialQuantityRef,
  availableMaterials,
  closeMaterialsModal,
  addMaterial,
  loadingMaterials
}) => {
  const [localSelectedMaterial, setLocalSelectedMaterial] = useState(selectedMaterialRef.current);
  const [localMaterialQuantity, setLocalMaterialQuantity] = useState(materialQuantityRef.current);

  // Update ref-ove kad se lokalni state promeni
  useEffect(() => {
    selectedMaterialRef.current = localSelectedMaterial;
  }, [localSelectedMaterial, selectedMaterialRef]);

  useEffect(() => {
    materialQuantityRef.current = localMaterialQuantity;
  }, [localMaterialQuantity, materialQuantityRef]);

  // Kalkuliši maksimalnu količinu
  const selectedMaterialData = localSelectedMaterial ? availableMaterials.find(mat => mat._id === localSelectedMaterial) : null;
  const maxQuantity = selectedMaterialData?.quantity || 1;

  const handleMaterialSelectionChange = (e) => {
    const newValue = e.target.value;
    setLocalSelectedMaterial(newValue);
    setLocalMaterialQuantity(''); // Reset količine na prazno
  };

  const handleMaterialQuantityChange = (e) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      setLocalMaterialQuantity('');
      return;
    }

    const numValue = parseInt(inputValue);

    if (isNaN(numValue) || numValue < 0) {
      setLocalMaterialQuantity('');
      return;
    }

    if (localSelectedMaterial) {
      setLocalMaterialQuantity(Math.min(numValue, maxQuantity));
    } else {
      setLocalMaterialQuantity(numValue);
    }
  };

  const isAddDisabled = !localSelectedMaterial || !localMaterialQuantity || localMaterialQuantity === '' || localMaterialQuantity <= 0 || loadingMaterials;

  return (
    <Dialog
      onClose={closeMaterialsModal}
      title="Dodaj materijal"
      size="sm"
      className="mx-tnalog-dlg"
      testId="materials-modal"
      footer={
        <div className="mx-tnalog-dlg__pair">
          <Btn onClick={closeMaterialsModal}>Otkaži</Btn>
          <Btn variant="primary" onClick={addMaterial} disabled={isAddDisabled} busy={loadingMaterials}>
            {loadingMaterials ? 'Dodavanje...' : 'Dodaj materijal'}
          </Btn>
        </div>
      }
    >
      <Field label="Materijal:" htmlFor="material-select">
        <Select id="material-select" value={localSelectedMaterial} onChange={handleMaterialSelectionChange}>
          <option value="">-- Izaberite materijal --</option>
          {availableMaterials.map(material => (
            <option key={material._id} value={material._id}>
              {material.type} (dostupno: {material.quantity})
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Količina:"
        htmlFor="material-quantity"
        hint={localSelectedMaterial ? `Maksimalno dostupno: ${maxQuantity}` : undefined}
      >
        <Input
          type="number"
          id="material-quantity"
          inputMode="numeric"
          min="0"
          max={maxQuantity}
          value={localMaterialQuantity}
          onChange={handleMaterialQuantityChange}
          placeholder="Unesite količinu"
          autoComplete="off"
        />
      </Field>
    </Dialog>
  );
});

const MaterialsModal = React.memo(({
  showMaterialsModal,
  materialModalKey,
  selectedMaterialRef,
  materialQuantityRef,
  availableMaterials,
  closeMaterialsModal,
  addMaterial,
  loadingMaterials
}) => {
  if (!showMaterialsModal) return null;

  return (
    <MaterialsModalContent
      key={materialModalKey}
      selectedMaterialRef={selectedMaterialRef}
      materialQuantityRef={materialQuantityRef}
      availableMaterials={availableMaterials}
      closeMaterialsModal={closeMaterialsModal}
      addMaterial={addMaterial}
      loadingMaterials={loadingMaterials}
    />
  );
});

MaterialsModal.displayName = 'MaterialsModal';
MaterialsModalContent.displayName = 'MaterialsModalContent';

export default MaterialsModal;
