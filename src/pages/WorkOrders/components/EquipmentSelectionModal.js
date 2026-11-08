import React from 'react';
import { Router, Plus } from 'lucide-react';
import { Btn } from '../../../security/sx/ui';
import { SearchField } from '../../../security/sx/forms';
import Dialog from '../../../security/sx/Dialog';
import '../TechnicianWorkOrderDetail.mx.css';

// Izbor opreme iz zaduženja (radni nalog tehničara i Edit naloga): dijalog, na telefonu list odozdo.
// Props su isti kao ranije; pretraga i dalje šalje događaj (handleSearchChange(e)).
const EquipmentSelectionModal = React.memo(({
  showEquipmentModal,
  closeModal,
  stableEquipment,
  getFilteredEquipment,
  searchTerm,
  searchInputRef,
  handleSearchChange,
  clearSearch,
  isSearching,
  selectEquipment
}) => {
  if (!showEquipmentModal) return null;

  console.log('=== RENDERING EQUIPMENT MODAL ===');

  // Get filtered results only when rendering, not during typing
  const filteredResults = getFilteredEquipment();
  const hasAvailableEquipment = stableEquipment && stableEquipment.length > 0;

  console.log('Modal rendering state:', {
    stableEquipmentLength: stableEquipment?.length || 0,
    hasAvailableEquipment,
    filteredResultsLength: filteredResults?.length || 0,
    searchTerm
  });

  console.log('Stable equipment in modal:', stableEquipment);
  console.log('Filtered results in modal:', filteredResults);

  return (
    <Dialog
      onClose={closeModal}
      title="Izbor opreme"
      size="lg"
      className="mx-tnalog-dlg"
      testId="equipment-modal"
      footer={hasAvailableEquipment && (
        <>
          <span className="mx-tnalog-dlg__count">{filteredResults.length} od {stableEquipment.length} stavki</span>
          <Btn variant="ghost" onClick={closeModal}>Zatvori</Btn>
        </>
      )}
    >
      {hasAvailableEquipment && (
        <SearchField
          ref={searchInputRef}
          value={searchTerm}
          onChange={(v) => handleSearchChange({ target: { value: v } })}
          placeholder="Pretraži opremu..."
          autoFocus
          className="mx-tnalog-dlg__search"
        />
      )}

      {!hasAvailableEquipment ? (
        <div className="sx-empty">
          <b>Nema dostupne opreme</b>
          <span>
            Trenutno nemate dostupnu opremu za instalaciju.
            Molimo vas da prvo preuzmete opremu iz magacina.
          </span>
          <Btn size="sm" onClick={closeModal}>Zatvori</Btn>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="sx-list mx-tnalog-dlg__list">
          {filteredResults.map((equipment) => (
            <div
              key={`equipment-${equipment._id}-${equipment.serialNumber}`}
              className="sx-item is-click"
              onClick={() => selectEquipment(equipment._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectEquipment(equipment._id);
                }
              }}
            >
              <span className="sx-item__icon"><Router size={17} strokeWidth={1.9} aria-hidden="true" /></span>
              <div className="sx-item__main">
                <b>{equipment.description}</b>
                <span>S/N: <span className="sx-mono">{equipment.serialNumber}</span></span>
              </div>
              <div className="sx-item__side">
                <span className="sx-tag is-info">{equipment.category}</span>
                <Plus size={16} strokeWidth={1.9} aria-hidden="true" className="sx-faint" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sx-empty">
          <b>Nema rezultata</b>
          <span>
            {searchTerm
              ? `Nema opreme koja odgovara pretrazi "${searchTerm}"`
              : 'Nemate dostupnu opremu u inventaru'
            }
          </span>
          {searchTerm && (
            <Btn size="sm" onClick={clearSearch}>Obriši pretragu</Btn>
          )}
        </div>
      )}
    </Dialog>
  );
});

EquipmentSelectionModal.displayName = 'EquipmentSelectionModal';

export default EquipmentSelectionModal;
