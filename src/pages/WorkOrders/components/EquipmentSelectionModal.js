import React from 'react';
import { CloseIcon, SearchIcon, CheckIcon, AlertIcon } from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';

const EquipmentSelectionModal = React.memo(({ 
  showEquipmentModal, 
  closeModal, 
  stableEquipment,
  getFilteredEquipment,
  searchTermRef,
  searchInputRef,
  handleSearchChange,
  performSearch,
  clearSearch,
  isSearching,
  selectEquipment
}) => {
  if (!showEquipmentModal) return null;
  
  console.log('=== RENDERING EQUIPMENT MODAL ===');
  
  // Get filtered results only when rendering, not during typing
  const filteredResults = getFilteredEquipment();
  const searchTerm = searchTermRef.current;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
      <div className="bg-white/95 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Izbor opreme</h3>
          <Button
            type="secondary"
            size="small"
            onClick={closeModal}
            prefix={<CloseIcon size={16} />}
            className="!p-2"
          >
            <span className="sr-only">Zatvori modal</span>
          </Button>
        </div>
          
        {hasAvailableEquipment && (
          <div className="px-4 sm:px-6 pb-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Pretraži opremu..."
                  defaultValue=""
                  onChange={handleSearchChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      performSearch();
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoComplete="off"
                  autoFocus
                />
                {searchTermRef.current && (
                  <button 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={clearSearch}
                    type="button"
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
              
              <Button 
                type="primary"
                size="medium"
                onClick={performSearch}
                disabled={isSearching}
                loading={isSearching}
                className="w-full sm:w-auto"
              >
                {isSearching ? 'Pretražujem...' : 'Pretraži'}
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {!hasAvailableEquipment ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-yellow-50 rounded-full mb-4">
                  <AlertIcon size={24} className="text-yellow-600" />
                </div>
                <h4 className="text-base font-semibold text-slate-900 mb-2">Nema dostupne opreme</h4>
                <p className="text-sm text-slate-600 mb-6 max-w-sm">
                  Trenutno nemate dostupnu opremu za instalaciju. 
                  Molimo vas da prvo preuzmete opremu iz magacina.
                </p>
                <Button 
                  type="secondary"
                  size="medium"
                  onClick={closeModal}
                >
                  Zatvori
                </Button>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredResults.map((equipment) => (
                  <div
                    key={`equipment-${equipment._id}-${equipment.serialNumber}`}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-blue-300 transition-all cursor-pointer group"
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
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {equipment.category}
                      </div>
                      <CheckIcon className="text-slate-400 group-hover:text-blue-600 transition-colors" size={16} />
                    </div>
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      {equipment.description}
                    </div>
                    <div className="text-xs text-slate-600">
                      S/N: {equipment.serialNumber}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-slate-50 rounded-full mb-4">
                  <SearchIcon size={24} className="text-slate-400" />
                </div>
                <h4 className="text-base font-semibold text-slate-900 mb-2">Nema rezultata</h4>
                <p className="text-sm text-slate-600 mb-6 max-w-sm">
                  {searchTerm 
                    ? `Nema opreme koja odgovara pretrazi "${searchTerm}"`
                    : 'Nemate dostupnu opremu u inventaru'
                  }
                </p>
                {searchTerm && (
                  <Button 
                    type="secondary"
                    size="medium"
                    onClick={clearSearch}
                  >
                    Obriši pretragu
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        {hasAvailableEquipment && (
          <div className="p-4 sm:p-6 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {filteredResults.length} od {stableEquipment.length} stavki
            </div>
            <Button 
              type="secondary"
              size="medium"
              onClick={closeModal}
            >
              Zatvori
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

EquipmentSelectionModal.displayName = 'EquipmentSelectionModal';

export default EquipmentSelectionModal;