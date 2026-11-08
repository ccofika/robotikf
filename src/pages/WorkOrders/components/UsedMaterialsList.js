import React from 'react';
import { Trash2 } from 'lucide-react';
import { Btn, Empty } from '../../../security/sx/ui';
import { Panel, Note } from '../../../security/sx/layout';

// Kartica "Korišćeni materijali" na radnom nalogu tehničara: ista struktura kao ranije, izgled Security dela
const UsedMaterialsList = ({
  usedMaterials,
  openMaterialsModal,
  removeMaterial,
  loadingMaterials,
  isWorkOrderCompleted
}) => {
  return (
    <Panel
      title="Korišćeni materijali"
      actions={
        <Btn size="sm" variant="primary" onClick={openMaterialsModal} disabled={isWorkOrderCompleted}>
          + Dodaj materijal
        </Btn>
      }
    >
      {usedMaterials.length > 0 ? (
        <div className="mx-tnalog-list">
          {usedMaterials.map((item, index) => (
            <div key={index} className="mx-tnalog-li">
              <div className="mx-tnalog-li__main">
                <b>{item.material?.type || item.material}</b>
                <span>Količina: <span className="sx-mono">{item.quantity}</span></span>
              </div>
              <Btn
                size="sm"
                icon={Trash2}
                onClick={() => removeMaterial(item.material?._id || item.material)}
                disabled={loadingMaterials || isWorkOrderCompleted}
                aria-label="Ukloni"
              >
                <span className="mx-tnalog-wide">Ukloni</span>
              </Btn>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nema dodanih materijala" />
      )}

      {isWorkOrderCompleted && (
        <Note tone="idle" className="mx-tnalog-foot">Radni nalog je završen - uređivanje materijala nije moguće.</Note>
      )}
    </Panel>
  );
};

export default UsedMaterialsList;
