import React from 'react';
import { 
  HardHatIcon,
  ChevronRightIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  MaterialIcon,
  EquipmentIcon,
  CommentIcon,
  ImageIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { cn } from '../../../utils/cn';

const TechnicianLogsSection = ({ 
  logs, 
  expandedGroups, 
  toggleGroup, 
  getActionIcon, 
  getActionColor,
  materialValidationData,
  showMaterialValidation,
  setShowMaterialValidation,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange 
}) => {

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-slate-50 rounded-xl mb-4">
            <HardHatIcon size={64} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema logova tehničara</h3>
          <p className="text-slate-600">Trenutno nema aktivnosti tehničara za prikazivanje.</p>
        </div>
      </div>
    );
  }

  // Collect all individual logs with their technician info first
  const allLogs = [];
  logs.forEach((technicianGroup) => {
    technicianGroup.logs.forEach((log) => {
      allLogs.push({
        ...log,
        technicianName: technicianGroup.technicianName
      });
    });
  });
  
  // Now group by work order ID
  const groupedLogs = {};
  allLogs.forEach((log) => {
    const workOrderId = log.workOrderId && typeof log.workOrderId === 'object' 
      ? log.workOrderId._id 
      : log.workOrderId || 'general';
    
    if (!groupedLogs[workOrderId]) {
      groupedLogs[workOrderId] = {
        workOrderId: workOrderId,
        workOrderInfo: log.workOrderId && typeof log.workOrderId === 'object' ? log.workOrderId : null,
        technician: log.technicianName, // Use the technician from this specific log
        date: new Date(log.timestamp).toDateString(),
        logs: []
      };
    }
    
    groupedLogs[workOrderId].logs.push(log);
  });
  
  // Apply frontend pagination to grouped logs
  const groupedLogsArray = Object.entries(groupedLogs);
  const totalGroups = groupedLogsArray.length;
  const totalPages = Math.ceil(totalGroups / itemsPerPage);
  const indexOfLastGroup = currentPage * itemsPerPage;
  const indexOfFirstGroup = indexOfLastGroup - itemsPerPage;
  const currentGroups = groupedLogsArray.slice(indexOfFirstGroup, indexOfLastGroup);

  return (
    <div className="space-y-4">
      {/* Material Validation Toggle */}
      {materialValidationData && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-white/20 to-transparent">
            <Button
              type={showMaterialValidation ? "primary" : "secondary"}
              size="medium"
              onClick={() => setShowMaterialValidation(!showMaterialValidation)}
              prefix={<MaterialIcon size={16} />}
            >
              {showMaterialValidation ? 'Sakrij' : 'Prikaži'} validaciju materijala
            </Button>
          </div>
          
          {showMaterialValidation && (
            <div className="border-t border-white/30 p-5 bg-white/40 backdrop-blur-sm max-h-[80vh] overflow-hidden flex flex-col">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                <MaterialIcon size={16} className="mr-2 text-blue-600" />
                Validacija materijala
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Proseci
                  </h5>
                  <div className="space-y-2 text-sm">
                    {Object.entries(materialValidationData.averages || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-white/40 rounded-lg">
                        <span className="text-slate-600 font-medium">{key}:</span>
                        <span className="font-bold text-slate-900 bg-white/60 px-2 py-1 rounded-full">
                          {typeof value === 'object' ? Math.round(value.average || 0) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    Anomalije
                  </h5>
                  
                  {materialValidationData.anomalies?.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckIcon size={24} className="text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Nema neobičnih korišćenja materijala</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {materialValidationData.anomalies?.map((anomaly, index) => (
                        <div key={index} className={`p-3 rounded-lg border-l-4 ${
                          anomaly.severity === 'high' 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-yellow-500 bg-yellow-50'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <MaterialIcon size={14} className="text-slate-600" />
                              <span className="font-semibold text-sm text-slate-900">
                                {anomaly.materialDetails?.materialType || 'N/A'}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                anomaly.severity === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {anomaly.severity === 'high' ? 'VISOK' : 'UMEREN'} PRIORITET
                              </span>
                            </div>
                            
                            {/* Open Work Order Button for anomaly */}
                            {anomaly.workOrderId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const workOrderId = typeof anomaly.workOrderId === 'object' 
                                    ? anomaly.workOrderId._id 
                                    : anomaly.workOrderId;
                                  window.open(`/work-orders/${workOrderId}`, '_blank');
                                }}
                                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded-full transition-colors"
                              >
                                WO
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <HardHatIcon size={12} />
                              <span>{anomaly.performedByName || 'Nepoznat'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ClockIcon size={12} />
                              <span>{new Date(anomaly.timestamp).toLocaleDateString('sr-RS')}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Korišćeno:</span>
                              <span className="font-bold text-slate-900">{anomaly.materialDetails?.quantity || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Očekivano:</span>
                              <span className="text-slate-600">{anomaly.expectedRange || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-center mt-3 pt-3 border-t border-slate-200">
                    <div className="text-lg font-bold text-red-600 mb-1">
                      {materialValidationData.anomalies?.length || 0}
                    </div>
                    <div className="text-sm text-slate-600">ukupno detektovano</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logs by Groups */}
      {currentGroups.map(([groupKey, group]) => {
        // Calculate total logs across all dates for this technician
        const totalLogs = group.logs.length;
        const latestLogDate = group.logs.length > 0 
          ? new Date(Math.max(...group.logs.map(log => new Date(log.timestamp)))).toDateString()
          : new Date().toDateString();
          
        return (
          <div key={groupKey} className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl overflow-hidden">
            {/* Group Header */}
            <div 
              className="p-5 border-b border-white/30 cursor-pointer hover:bg-white/20 transition-colors bg-gradient-to-r from-white/10 to-transparent"
              onClick={() => toggleGroup(groupKey)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
                    <CheckIcon size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">
                      {group.workOrderInfo 
                        ? `${group.technician}${group.workOrderInfo.tisJobId ? ` (${group.workOrderInfo.tisJobId})` : ''}` 
                        : `${group.technician} - Opšte aktivnosti`}
                    </h3>
                    <p className="text-sm text-slate-600 flex items-center">
                      <ClockIcon size={12} className="mr-1" />
                      {latestLogDate} • {totalLogs} {totalLogs === 1 ? 'aktivnost' : 'aktivnosti'}
                      {group.workOrderInfo?.userName && (
                        <span className="ml-2">• {group.workOrderInfo.userName}</span>
                      )}
                    </p>
                  </div>
                  
                  {/* Open Work Order Button */}
                  {group.workOrderInfo && (
                    <Button
                      type="secondary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/work-orders/${group.workOrderInfo._id}`, '_blank');
                      }}
                      className="mr-4"
                    >
                      Otvori WO
                    </Button>
                  )}
                </div>
                <div className={cn(
                  "p-2 bg-white/50 rounded-lg transition-all duration-200",
                  expandedGroups?.has(groupKey) ? "rotate-90 bg-white/70" : ""
                )}>
                  <ChevronRightIcon size={20} className="text-slate-600" />
                </div>
              </div>
            </div>

            {/* Group Content */}
            {expandedGroups?.has(groupKey) && (
              <div className="divide-y divide-white/20">
                {group.logs.map((log, index) => (
                <div key={index} className="p-5 hover:bg-white/30 transition-colors bg-white/10 backdrop-blur-sm">
                  <div className="flex items-start space-x-4">
                    {/* Action Icon */}
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      getActionColor(log.action) === 'success' && "bg-green-50",
                      getActionColor(log.action) === 'info' && "bg-blue-50", 
                      getActionColor(log.action) === 'warning' && "bg-yellow-50",
                      getActionColor(log.action) === 'danger' && "bg-red-50",
                      getActionColor(log.action) === 'neutral' && "bg-slate-50"
                    )}>
                      {getActionIcon(log.action)}
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{log.description || 'Aktivnost'}</h4>
                        <div className="flex items-center text-sm text-slate-500">
                          <ClockIcon size={14} className="mr-1" />
                          {new Date(log.timestamp).toLocaleTimeString('sr-RS')}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-slate-600">
                          <HardHatIcon size={14} className="mr-2 text-slate-400" />
                          <span>{log.technicianName}</span>
                        </div>
                        
                        {log.userInfo && (
                          <div className="flex items-center text-slate-600">
                            <UserIcon size={14} className="mr-2 text-slate-400" />
                            <span>{typeof log.userInfo === 'object' ? (log.userInfo.name || 'Nepoznat korisnik') : log.userInfo}</span>
                            {log.userInfo.tisId && <span className="ml-1 text-slate-400">({log.userInfo.tisId})</span>}
                          </div>
                        )}

                        {log.address && (
                          <div className="flex items-center text-slate-600">
                            <MapPinIcon size={14} className="mr-2 text-slate-400" />
                            <span className="truncate">{log.address}</span>
                          </div>
                        )}

                        {log.workOrderId && (
                          <div className="flex items-center text-slate-600">
                            <CheckIcon size={14} className="mr-2 text-slate-400" />
                            <span>WO: {typeof log.workOrderId === 'object' ? (log.workOrderId._id || log.workOrderId) : log.workOrderId}</span>
                          </div>
                        )}
                        
                        {/* Work Order Details */}
                        {log.workOrderId && typeof log.workOrderId === 'object' && (
                          <>
                            {log.workOrderId.municipality && (
                              <div className="flex items-center text-slate-600">
                                <MapPinIcon size={14} className="mr-2 text-slate-400" />
                                <span className="truncate">{log.workOrderId.municipality}</span>
                              </div>
                            )}
                            {log.workOrderId.address && (
                              <div className="flex items-center text-slate-600">
                                <MapPinIcon size={14} className="mr-2 text-slate-400" />
                                <span className="truncate">{log.workOrderId.address}</span>
                              </div>
                            )}
                            {log.workOrderId.userName && (
                              <div className="flex items-center text-slate-600">
                                <UserIcon size={14} className="mr-2 text-slate-400" />
                                <span>{log.workOrderId.userName}</span>
                                {log.workOrderId.tisId && <span className="ml-1 text-slate-400">({log.workOrderId.tisId})</span>}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Materials & Equipment */}
                      {(log.materials || log.equipment) && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {log.materials && log.materials.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-slate-700 uppercase tracking-wider mb-2">
                                <MaterialIcon size={12} className="inline mr-1" />
                                Materijali
                              </h5>
                              <div className="space-y-1">
                                {log.materials.map((material, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">{material.description}</span>
                                    <span className="font-medium text-slate-900">{material.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {log.equipment && log.equipment.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-slate-700 uppercase tracking-wider mb-2">
                                <EquipmentIcon size={12} className="inline mr-1" />
                                Oprema
                              </h5>
                              <div className="space-y-1">
                                {log.equipment.map((item, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="text-slate-600">{item.description}</span>
                                    {item.serialNumber && (
                                      <span className="ml-2 font-mono text-xs text-slate-500">#{item.serialNumber}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Comments & Images */}
                      {(log.comment || log.images) && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          {log.comment && (
                            <div className="flex items-start space-x-2 mb-3">
                              <CommentIcon size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-slate-700">{log.comment}</p>
                            </div>
                          )}
                          
                          {log.images && log.images.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <ImageIcon size={14} className="text-slate-400" />
                              <span className="text-sm text-slate-600">{log.images.length} slika(e)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Frontend Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mt-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Prikazano {indexOfFirstGroup + 1} - {Math.min(indexOfLastGroup, totalGroups)} od {totalGroups} radnih naloga
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &lsaquo;
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(number => {
                    return (
                      number === 1 ||
                      number === totalPages ||
                      Math.abs(number - currentPage) <= 1
                    );
                  })
                  .map(number => (
                    <button
                      key={number}
                      onClick={() => onPageChange(number)}
                      className={`px-3 py-1 text-sm rounded-lg border ${
                        currentPage === number
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {number}
                    </button>
                  ))}
                  
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianLogsSection;