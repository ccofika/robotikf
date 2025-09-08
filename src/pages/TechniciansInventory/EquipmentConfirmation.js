import React, { useState, useEffect, useContext } from 'react';
import { CheckIcon, CrossIcon, AlertTriangleIcon, BoxIcon, ClockIcon } from '../../components/icons/SvgIcons';
import { toast } from '../../utils/toast';
import { AuthContext } from '../../context/AuthContext';
import { techniciansAPI } from '../../services/api';
import './EquipmentConfirmation.css';

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
      <div className="equipment-confirmation loading">
        <div className="loading-content">
          <ClockIcon className="loading-icon spin" />
          <p>Učitavanje opreme...</p>
        </div>
      </div>
    );
  }

  if (pendingEquipment.length === 0) {
    return null; // No equipment to confirm
  }

  const currentEquipment = pendingEquipment[currentIndex];

  return (
    <div className="equipment-confirmation">
      <div className="confirmation-overlay">
        <div className="confirmation-container">
          {/* Header */}
          <div className="confirmation-header">
            <div className="header-icon">
              <AlertTriangleIcon />
            </div>
            <h2>Potvrda opreme</h2>
            <p>Potrebno je da potvrdite zaduženu opremu</p>
          </div>

          {/* Progress */}
          <div className="confirmation-progress">
            <div className="progress-text">
              {currentIndex + 1} od {pendingEquipment.length}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentIndex + 1) / pendingEquipment.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Equipment Card */}
          <div className="equipment-card">
            <div className="equipment-icon">
              <BoxIcon />
            </div>
            <div className="equipment-details">
              <h3>{currentEquipment.description}</h3>
              <div className="equipment-info">
                <div className="info-item">
                  <span className="label">Kategorija:</span>
                  <span className="value">{currentEquipment.category}</span>
                </div>
                <div className="info-item">
                  <span className="label">Serijski broj:</span>
                  <span className="value">{currentEquipment.serialNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          {pendingEquipment.length > 1 && (
            <div className="equipment-navigation">
              <button 
                className="nav-btn" 
                onClick={prevEquipment}
                disabled={currentIndex === 0}
              >
                ← Prethodno
              </button>
              <button 
                className="nav-btn" 
                onClick={nextEquipment}
                disabled={currentIndex === pendingEquipment.length - 1}
              >
                Sledeće →
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="confirmation-actions">
            <button 
              className="btn btn-success confirm-btn"
              onClick={handleConfirm}
              disabled={processing}
            >
              <CheckIcon />
              Potvrdi
            </button>
            <button 
              className="btn btn-danger reject-btn"
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
            >
              <CrossIcon />
              Odbij
            </button>
          </div>

          {/* Rejection Modal */}
          {showRejectModal && (
            <div className="reject-modal-overlay">
              <div className="reject-modal">
                <h3>Odbijanje opreme</h3>
                <p>Molimo unesite razlog zašto odbijate ovu opremu:</p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Unesite razlog odbijanja..."
                  rows={4}
                  className="rejection-textarea"
                />
                <div className="modal-actions">
                  <button 
                    className="btn btn-danger"
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                  >
                    Odbij opremu
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                    }}
                    disabled={processing}
                  >
                    Odustani
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentConfirmation; 