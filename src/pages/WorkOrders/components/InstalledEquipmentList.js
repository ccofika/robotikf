import React from 'react';
import { Router, Trash2 } from 'lucide-react';
import { Btn, Empty } from '../../../security/sx/ui';

// Oprema instalirana kod korisnika (deo panela "Oprema korisnika" na radnom nalogu tehničara)
const InstalledEquipmentList = ({
  userEquipment,
  openRemoveEquipmentDialog,
  isWorkOrderCompleted
}) => {
  return (
    <div>
      <h4 className="mx-tnalog-sub">Instalirana oprema:</h4>
      {userEquipment.length > 0 ? (
        <div className="sx-list">
          {userEquipment.map((equipment) => (
            <div key={equipment._id} className="sx-item">
              <span className="sx-item__icon"><Router size={17} strokeWidth={1.9} aria-hidden="true" /></span>
              <div className="sx-item__main">
                <b>{equipment.category} - {equipment.description}</b>
                <span>S/N: <span className="sx-mono">{equipment.serialNumber}</span></span>
              </div>
              <div className="sx-item__side">
                <Btn
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  className="mx-danger"
                  onClick={() => openRemoveEquipmentDialog(equipment)}
                  disabled={isWorkOrderCompleted}
                >
                  Ukloni
                </Btn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nema instalirane opreme" />
      )}
    </div>
  );
};

export default InstalledEquipmentList;
