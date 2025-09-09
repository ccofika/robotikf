import React, { useState, useEffect, useContext } from 'react';
import { CheckIcon, CrossIcon, AlertTriangleIcon, BoxIcon, ClockIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { AuthContext } from '../../context/AuthContext';
import { techniciansAPI } from '../../services/api';

const EquipmentConfirmation = ({ onConfirmationComplete }) => {
  const { user } = useContext(AuthContext);
  const [pendingEquipment, setPendingEquipment] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingEquipment();
  }, [user?._id]);

  const fetchPendingEquipment = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const response = await techniciansAPI.getPendingEquipment(user._id);
      setPendingEquipment(response.data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Greška pri učitavanju opreme koja čeka potvrdu:', error);
      toast.error('Greška pri učitavanju opreme!');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (currentIndex >= pendingEquipment.length) return;
    
    setProcessing(true);
    const equipment = pendingEquipment[currentIndex];
    
    try {
      await techniciansAPI.confirmEquipment(user._id, { equipmentId: equipment._id });
      toast.success(`Oprema "${equipment.description}" je potvrđena!`);
      
      // Ukloni opremu iz liste
      const updatedEquipment = [...pendingEquipment];
      updatedEquipment.splice(currentIndex, 1);
      setPendingEquipment(updatedEquipment);
      
      // Adjust current index if needed
      if (currentIndex >= updatedEquipment.length && updatedEquipment.length > 0) {
        setCurrentIndex(updatedEquipment.length - 1);
      }
      
      // Ako nema više opreme, završi
      if (updatedEquipment.length === 0) {
        onConfirmationComplete();
      }
    } catch (error) {
      console.error('Greška pri potvrđivanju opreme:', error);
      toast.error('Greška pri potvrđivanju opreme!');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Morate uneti razlog odbijanja!');
      return;
    }
    
    setProcessing(true);
    const equipment = pendingEquipment[currentIndex];
    
    try {
      await techniciansAPI.rejectEquipment(user._id, { 
        equipmentId: equipment._id,
        reason: rejectionReason.trim()
      });
      toast.success(`Oprema "${equipment.description}" je odbijena!`);
      
      // Ukloni opremu iz liste
      const updatedEquipment = [...pendingEquipment];
      updatedEquipment.splice(currentIndex, 1);
      setPendingEquipment(updatedEquipment);
      
      // Reset rejection modal
      setShowRejectModal(false);
      setRejectionReason('');
      
      // Adjust current index if needed
      if (currentIndex >= updatedEquipment.length && updatedEquipment.length > 0) {
        setCurrentIndex(updatedEquipment.length - 1);
      }
      
      // Ako nema više opreme, završi
      if (updatedEquipment.length === 0) {
        onConfirmationComplete();
      }
    } catch (error) {
      console.error('Greška pri odbijanju opreme:', error);
      toast.error('Greška pri odbijanju opreme!');
    } finally {
      setProcessing(false);
    }
  };

  const nextEquipment = () => {
    if (currentIndex < pendingEquipment.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevEquipment = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <ClockIcon className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-600 text-lg">Učitavanje opreme...</p>
        </div>
      </div>
    );
  }

  if (pendingEquipment.length === 0) {
    return null; // No equipment to confirm
  }

  const currentEquipment = pendingEquipment[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      {/* Fixed Container for Mobile */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-40 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-orange-50 rounded-xl">
                <AlertTriangleIcon size={24} className="text-orange-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Potvrda opreme</h2>
            <p className="text-slate-600">Potrebno je da potvrdite zaduženu opremu</p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="text-center mb-3">
              <span className="text-sm font-medium text-slate-600">
                {currentIndex + 1} od {pendingEquipment.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${((currentIndex + 1) / pendingEquipment.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Equipment Card */}
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                <BoxIcon size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 mb-3 break-words">{currentEquipment.description}</h3>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-sm font-medium text-slate-600">Kategorija:</span>
                    <span className="text-sm text-slate-900 font-semibold">{currentEquipment.category}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-sm font-medium text-slate-600">Serijski broj:</span>
                    <span className="text-sm text-slate-900 font-mono font-semibold break-all">{currentEquipment.serialNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation - Only show if multiple items */}
          {pendingEquipment.length > 1 && (
            <div className="flex justify-between mb-6">
              <Button
                type="secondary"
                size="medium"
                onClick={prevEquipment}
                disabled={currentIndex === 0}
                className="flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>← Prethodno</span>
              </Button>
              <Button
                type="secondary"
                size="medium"
                onClick={nextEquipment}
                disabled={currentIndex === pendingEquipment.length - 1}
                className="flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Sledeće →</span>
              </Button>
            </div>
          )}

          {/* Action Buttons - Mobile First */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Button
              type="primary"
              size="large"
              onClick={handleConfirm}
              disabled={processing}
              className="w-full sm:flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              prefix={<CheckIcon size={16} />}
            >
              {processing ? 'Potvrđujem...' : 'Potvrdi opremu'}
            </Button>
            <Button
              type="error"
              size="large"
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              className="w-full sm:flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              prefix={<CrossIcon size={16} />}
            >
              Odbij opremu
            </Button>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center mb-6">
              <div className="p-3 bg-red-50 rounded-xl inline-flex mb-4">
                <CrossIcon size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Odbijanje opreme</h3>
              <p className="text-slate-600">Molimo unesite razlog zašto odbijate ovu opremu:</p>
            </div>
            
            <div className="mb-6">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Unesite razlog odbijanja..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                autoFocus
              />
            </div>
            
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              <Button
                type="error"
                size="medium"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Odbijam...' : 'Odbij opremu'}
              </Button>
              <Button
                type="secondary"
                size="medium"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Odustani
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentConfirmation; 