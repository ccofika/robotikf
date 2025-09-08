import React from 'react';
import { DeleteIcon } from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';

const InstalledEquipmentList = ({ 
  userEquipment,
  openRemoveEquipmentDialog,
  isWorkOrderCompleted
}) => {
  return (
    <div>
      <h4 className="text-base font-semibold text-slate-900 mb-4">Instalirana oprema:</h4>
      {userEquipment.length > 0 ? (
        <div className="space-y-3">
          {userEquipment.map((equipment) => (
            <div key={equipment._id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{equipment.category} - {equipment.description}</div>
                <div className="text-xs text-slate-600 mt-1">S/N: {equipment.serialNumber}</div>
              </div>
              <Button
                type="secondary"
                size="small"
                onClick={() => openRemoveEquipmentDialog(equipment)}
                disabled={isWorkOrderCompleted}
                prefix={<DeleteIcon size={14} />}
                className="ml-3"
              >
                <span className="hidden sm:inline">Ukloni</span>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500">Nema instalirane opreme</p>
        </div>
      )}
    </div>
  );
};

export default InstalledEquipmentList;