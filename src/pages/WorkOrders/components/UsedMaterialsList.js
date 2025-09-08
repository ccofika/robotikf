import React from 'react';
import { DeleteIcon } from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';

const UsedMaterialsList = ({ 
  usedMaterials,
  openMaterialsModal,
  removeMaterial,
  loadingMaterials,
  isWorkOrderCompleted
}) => {
  return (
    <div>
      <div className="p-2 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm sm:text-xl font-semibold text-slate-900">Korišćeni materijali</h3>
        <Button 
          type="primary"
          size="small"
          onClick={openMaterialsModal}
          disabled={isWorkOrderCompleted}
        >
          + Dodaj materijal
        </Button>
      </div>
      
      <div className="p-2 sm:p-6">
        {usedMaterials.length > 0 ? (
          <div className="space-y-1">
            {usedMaterials.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded">
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-900">
                    {item.material?.type || item.material}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Količina: {item.quantity}
                  </div>
                </div>
                <Button
                  type="secondary"
                  size="small"
                  onClick={() => removeMaterial(item.material?._id || item.material)}
                  disabled={loadingMaterials || isWorkOrderCompleted}
                  prefix={<DeleteIcon size={10} />}
                  className="ml-2"
                >
                  <span className="hidden sm:inline text-xs">Ukloni</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500">Nema dodanih materijala</p>
          </div>
        )}
      </div>
      
      {isWorkOrderCompleted && (
        <div className="p-2 sm:p-6 border-t border-slate-200">
          <div className="flex items-center space-x-2 p-2 bg-gray-50 border border-gray-200 rounded">
            <span className="text-xs text-gray-700">Radni nalog je završen - uređivanje materijala nije moguće.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsedMaterialsList;