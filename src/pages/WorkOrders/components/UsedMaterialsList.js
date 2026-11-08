import React from 'react';
import { Cable, Plus, Trash2 } from 'lucide-react';
import { Btn, Empty } from '../../../security/sx/ui';
import { Panel, Note } from '../../../security/sx/layout';

// Panel "Korišćeni materijali" na radnom nalogu tehničara
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
        <Btn size="sm" variant="primary" icon={Plus} onClick={openMaterialsModal} disabled={isWorkOrderCompleted}>
          Dodaj materijal
        </Btn>
      }
    >
      {usedMaterials.length > 0 ? (
        <div className="sx-list">
          {usedMaterials.map((item, index) => (
            <div key={index} className="sx-item">
              <span className="sx-item__icon"><Cable size={17} strokeWidth={1.9} aria-hidden="true" /></span>
              <div className="sx-item__main">
                <b>{item.material?.type || item.material}</b>
                <span>Količina: <span className="sx-mono">{item.quantity}</span></span>
              </div>
              <div className="sx-item__side">
                <Btn
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  className="mx-danger"
                  onClick={() => removeMaterial(item.material?._id || item.material)}
                  disabled={loadingMaterials || isWorkOrderCompleted}
                >
                  Ukloni
                </Btn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nema dodanih materijala" />
      )}

      {isWorkOrderCompleted && (
        <Note tone="idle" className="mx-mt">Radni nalog je završen - uređivanje materijala nije moguće.</Note>
      )}
    </Panel>
  );
};

export default UsedMaterialsList;
