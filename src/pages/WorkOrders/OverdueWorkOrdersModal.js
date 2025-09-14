import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, ClockIcon, CalendarIcon, FileIcon, CheckIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { AuthContext } from '../../context/AuthContext';
import { workOrdersAPI } from '../../services/api';

const OverdueWorkOrdersModal = ({ onModalComplete }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverdueOrders();
  }, [user?._id]);

  const fetchOverdueOrders = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await workOrdersAPI.getTechnicianOverdueWorkOrders(user._id);
      setOverdueOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju overdue radnih naloga:', error);
      setError('Greška pri učitavanju radnih naloga!');
      toast.error('Greška pri učitavanju radnih naloga!');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderClick = (workOrderId) => {
    navigate(`/my-work-orders/${workOrderId}`);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Nepoznato vreme';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS') + ' ' + date.toLocaleTimeString('sr-RS', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getOverdueHours = (appointmentDateTime) => {
    if (!appointmentDateTime) return 0;
    const now = new Date();
    const appointment = new Date(appointmentDateTime);
    const diffMs = now.getTime() - appointment.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <ClockIcon className="animate-spin text-red-600" size={32} />
          <p className="text-slate-600 text-lg">Učitavanje radnih naloga...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 text-center">
            <div className="p-3 bg-red-50 rounded-xl inline-flex mb-4">
              <AlertTriangleIcon size={24} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Greška</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button
              type="primary"
              size="medium"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Osvežiti stranicu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (overdueOrders.length === 0) {
    return null; // No overdue orders
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-50 flex flex-col p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
        {/* Header Section - Limited to 12% of screen height */}
        <div className="flex-none max-h-[12vh] text-center mb-3 flex flex-col justify-start py-2">
          <h2 className="text-sm sm:text-lg font-bold text-slate-900 mb-2 leading-tight">Potrebno je završiti stare radne naloge</h2>
          <p className="text-xs text-slate-600 px-4 leading-relaxed">Da biste nastavili sa daljim radom, potrebno je da završite sledeće radne naloge koji su trebali biti završeni pre više od 24 sata:</p>
        </div>

        {/* Overdue count indicator - Limited to 5% of screen height */}
        <div className="flex-none max-h-[5vh] bg-red-50 border border-red-200 rounded-lg p-1 mb-2 flex items-center justify-center">
          <div className="flex items-center justify-center space-x-1">
            <ClockIcon size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-red-800 font-semibold text-xs leading-tight text-center">
              {overdueOrders.length} {overdueOrders.length === 1 ? 'radni nalog' : overdueOrders.length < 5 ? 'radnih naloga' : 'radnih naloga'} koji čeka{overdueOrders.length === 1 ? '' : 'ju'} na završetak
            </span>
          </div>
        </div>

        {/* Work Orders List - Takes remaining 60% of screen height */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2 min-h-0">
          {overdueOrders.map((workOrder, index) => (
            <div 
              key={workOrder._id} 
              className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => handleWorkOrderClick(workOrder._id)}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-50 rounded-xl flex-shrink-0">
                  <FileIcon size={20} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 break-words">{workOrder.address}</h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon size={14} className="text-slate-500 flex-shrink-0" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <span className="text-xs sm:text-sm font-medium text-slate-600">Zakazan za:</span>
                        <span className="text-xs sm:text-sm text-slate-900 font-semibold">
                          {formatDateTime(workOrder.appointmentDateTime)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ClockIcon size={14} className="text-red-500 flex-shrink-0" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <span className="text-xs sm:text-sm font-medium text-slate-600">Kasni:</span>
                        <span className="text-xs sm:text-sm text-red-600 font-bold">
                          {getOverdueHours(workOrder.appointmentDateTime)} {getOverdueHours(workOrder.appointmentDateTime) === 1 ? 'sat' : getOverdueHours(workOrder.appointmentDateTime) < 5 ? 'sata' : 'sati'}
                        </span>
                      </div>
                    </div>

                    {workOrder.type && (
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="text-xs sm:text-sm font-medium text-slate-600">Tip:</span>
                        <span className="text-xs sm:text-sm text-slate-900 font-semibold">{workOrder.type}</span>
                      </div>
                    )}
                  </div>
                  
                  {workOrder.comment && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs sm:text-sm text-slate-700 break-words line-clamp-2">{workOrder.comment}</p>
                    </div>
                  )}

                  {/* Admin comment for returned work orders */}
                  {workOrder.adminComment && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs sm:text-sm font-medium text-red-800 mb-1">Razlog vraćanja:</div>
                      <p className="text-xs sm:text-sm text-red-700 break-words">{workOrder.adminComment}</p>
                    </div>
                  )}
                  
                  {/* Click indicator */}
                  <div className="mt-2 flex items-center justify-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-xs sm:text-sm font-medium text-blue-700">Kliknite da otvorite radni nalog</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Information footer - Limited to 10% of screen height */}
        <div className="flex-none max-h-[10vh] bg-blue-50 border border-blue-200 rounded-lg p-2 text-center flex flex-col justify-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <CheckIcon size={12} className="text-blue-600 flex-shrink-0" />
            <span className="text-blue-800 font-medium text-xs leading-tight">
              Kada završite sve overdue radne naloge, moći ćete normalno da koristite aplikaciju
            </span>
          </div>
          <p className="text-xs text-blue-600 leading-tight px-2">
            Neće biti moguće pristupiti drugim stranicama dok se svi radni nalozi ne završe
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverdueWorkOrdersModal;