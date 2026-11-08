import React from 'react';
import { Trash2 } from 'lucide-react';
import { Btn, Empty } from '../../../security/sx/ui';

// Oprema instalirana kod korisnika (deo kartice "Oprema korisnika"): ista struktura kao ranije, izgled Security dela
const InstalledEquipmentList = ({
  userEquipment,
  openRemoveEquipmentDialog,
  isWorkOrderCompleted
}) => {
  return (
    <div>
      <h4 className="mx-tnalog-sub">Instalirana oprema:</h4>
      {userEquipment.length > 0 ? (
        <div className="mx-tnalog-list">
          {userEquipment.map((equipment) => (
            <div key={equipment._id} className="mx-tnalog-li">
              <div className="mx-tnalog-li__main">
                <b>{equipment.category} - {equipment.description}</b>
                <span>S/N: <span className="sx-mono">{equipment.serialNumber}</span></span>
              </div>
              <Btn
                size="sm"
                icon={Trash2}
                onClick={() => openRemoveEquipmentDialog(equipment)}
                disabled={isWorkOrderCompleted}
                aria-label="Ukloni"
              >
                <span className="mx-tnalog-wide">Ukloni</span>
              </Btn>
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
