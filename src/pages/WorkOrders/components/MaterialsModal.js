import React, { useState, useEffect } from 'react';
import { CloseIcon } from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeMaterialsModal}>
      <div className="bg-white/95 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Dodaj materijal</h3>
          <Button
            type="secondary"
            size="small"
            onClick={closeMaterialsModal}
            prefix={<CloseIcon size={16} />}
            className="!p-2"
          >
            <span className="sr-only">Zatvori modal</span>
          </Button>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="material-select" className="block text-sm font-medium text-slate-700 mb-2">
                Materijal:
              </label>
              <select
                id="material-select"
                value={localSelectedMaterial}
                onChange={handleMaterialSelectionChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">-- Izaberite materijal --</option>
                {availableMaterials.map(material => (
                  <option key={material._id} value={material._id}>
                    {material.type} (dostupno: {material.quantity})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="material-quantity" className="block text-sm font-medium text-slate-700 mb-2">
                Količina:
              </label>
              <input
                type="number"
                id="material-quantity"
                min="0"
                max={maxQuantity}
                value={localMaterialQuantity}
                onChange={handleMaterialQuantityChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Unesite količinu"
                autoComplete="off"
              />
              {localSelectedMaterial && (
                <p className="text-xs text-slate-500 mt-1">
                  Maksimalno dostupno: {maxQuantity}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
          <Button 
            type="secondary"
            size="medium"
            onClick={closeMaterialsModal}
            className="flex-1"
          >
            Otkaži
          </Button>
          <Button 
            type="primary"
            size="medium"
            onClick={addMaterial}
            disabled={isAddDisabled}
            loading={loadingMaterials}
            className="flex-1"
          >
            {loadingMaterials ? 'Dodavanje...' : 'Dodaj materijal'}
          </Button>
        </div>
      </div>
    </div>
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