import React from 'react';
import { 
  UserIcon,
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  PhoneIcon,
  TableIcon,
  CommentIcon,
  ImageIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { cn } from '../../../utils/cn';

const UserLogsSection = ({ 
  logs, 
  expandedGroups, 
  toggleGroup, 
  getActionIcon, 
  getActionColor,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange 
}) => {

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-slate-50 rounded-xl mb-4">
            <UserIcon size={64} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema logova korisnika</h3>
          <p className="text-slate-600">Trenutno nema aktivnosti korisnika za prikazivanje.</p>
        </div>
      </div>
    );
  }

  // The logs are already grouped by the backend API
  // Each log item is a user group with {userName, logs: [...]} structure
  const groupedLogs = {};
  logs.forEach((userGroup, index) => {
    // Use userId as key if available, otherwise use index
    const key = userGroup.userId || `user-${index}`;
    groupedLogs[key] = {
      user: userGroup.userName || userGroup.user || 'Nepoznat korisnik',
      date: new Date().toDateString(), // Will be overridden by individual log dates
      logs: userGroup.logs || []
    };
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
      {currentGroups.map(([groupKey, group]) => {
        // Calculate total logs across all dates for this user
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
                    <UserIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{group.user}</h3>
                    <p className="text-sm text-slate-600 flex items-center">
                      <ClockIcon size={12} className="mr-1" />
                      Poslednja aktivnost: {latestLogDate} • {totalLogs} {totalLogs === 1 ? 'aktivnost' : 'aktivnosti'}
                    </p>
                  </div>
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

                        {log.phone && (
                          <div className="flex items-center text-slate-600">
                            <PhoneIcon size={14} className="mr-2 text-slate-400" />
                            <span>{log.phone}</span>
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
                                <span className="truncate">Opština: {log.workOrderId.municipality}</span>
                              </div>
                            )}
                            {log.workOrderId.address && (
                              <div className="flex items-center text-slate-600">
                                <MapPinIcon size={14} className="mr-2 text-slate-400" />
                                <span className="truncate">Adresa: {log.workOrderId.address}</span>
                              </div>
                            )}
                            {log.workOrderId.userName && (
                              <div className="flex items-center text-slate-600">
                                <UserIcon size={14} className="mr-2 text-slate-400" />
                                <span>Korisnik: {log.workOrderId.userName}</span>
                                {log.workOrderId.tisId && <span className="ml-1 text-slate-400">({log.workOrderId.tisId})</span>}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Service Info */}
                      {log.serviceInfo && (
                        <div className="mt-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30">
                          <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center">
                            <TableIcon size={14} className="mr-2 text-blue-600" />
                            Informacije o usluzi
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {log.serviceInfo.type && (
                              <div className="p-2 bg-white/40 rounded-lg">
                                <span className="text-slate-500 font-medium">Tip:</span>
                                <span className="ml-2 font-medium text-slate-900">{log.serviceInfo.type}</span>
                              </div>
                            )}
                            {log.serviceInfo.status && (
                              <div>
                                <span className="text-slate-500">Status:</span>
                                <span className="ml-2 font-medium text-slate-900">{log.serviceInfo.status}</span>
                              </div>
                            )}
                            {log.serviceInfo.speed && (
                              <div>
                                <span className="text-slate-500">Brzina:</span>
                                <span className="ml-2 font-medium text-slate-900">{log.serviceInfo.speed}</span>
                              </div>
                            )}
                            {log.serviceInfo.package && (
                              <div>
                                <span className="text-slate-500">Paket:</span>
                                <span className="ml-2 font-medium text-slate-900">{log.serviceInfo.package}</span>
                              </div>
                            )}
                          </div>
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
                Prikazano {indexOfFirstGroup + 1} - {Math.min(indexOfLastGroup, totalGroups)} od {totalGroups} korisnika
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

export default UserLogsSection;