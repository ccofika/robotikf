import React, { useState, useEffect, useContext } from 'react';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '../../utils/toast';
import { AuthContext } from '../../context/AuthContext';
import { techniciansAPI } from '../../services/api';
import { Btn } from '../../security/sx/ui';
import { KV } from '../../security/sx/layout';
import { Textarea } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { Loading } from '../../montaza/ui';
import './TechnicianInventory.mx.css';

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

  if (!loading && pendingEquipment.length === 0) {
    return null; // No equipment to confirm
  }

  const currentEquipment = pendingEquipment[currentIndex];
  const closeReject = () => {
    setShowRejectModal(false);
    setRejectionReason('');
  };

  // Dijalog bez zatvaranja (nema X, Escape ni klika van): blokira aplikaciju dok se sva oprema ne potvrdi ili odbije
  return (
    <>
      <Dialog
        eyebrow="Montaža · Oprema"
        title="Potvrda opreme"
        description="Potrebno je da potvrdite zaduženu opremu"
        testId="equipment-confirmation"
        footer={loading ? null : (
          <>
            <Btn variant="danger" icon={X} onClick={() => setShowRejectModal(true)} disabled={processing}>Odbij opremu</Btn>
            <Btn variant="primary" icon={Check} onClick={handleConfirm} disabled={processing}>{processing ? 'Potvrđujem...' : 'Potvrdi opremu'}</Btn>
          </>
        )}
      >
        {loading ? (
          <Loading rows={2} text="Učitavanje opreme..." />
        ) : (
          <div className="mx-econf">
            {/* koja je stavka po redu */}
            <div className="mx-econf__progress">
              <span className="sx-label">{currentIndex + 1} od {pendingEquipment.length}</span>
              <div className="mx-econf__bar"><span style={{ width: `${((currentIndex + 1) / pendingEquipment.length) * 100}%` }} /></div>
            </div>

            <div className="sx-subject" data-tone="warn">
              <b>{currentEquipment.description}</b>
              <KV items={[
                { k: 'Kategorija', v: currentEquipment.category },
                { k: 'Serijski broj', v: currentEquipment.serialNumber, mono: true }
              ]} />
            </div>

            {/* Navigation - Only show if multiple items */}
            {pendingEquipment.length > 1 && (
              <div className="mx-econf__nav">
                <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={prevEquipment} disabled={currentIndex === 0}>Prethodno</Btn>
                <Btn size="sm" variant="ghost" iconRight={ChevronRight} onClick={nextEquipment} disabled={currentIndex === pendingEquipment.length - 1}>Sledeće</Btn>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Rejection Modal */}
      <Dialog
        open={showRejectModal}
        onClose={closeReject}
        busy={processing}
        size="sm"
        eyebrow="Montaža · Oprema"
        title="Odbijanje opreme"
        description="Molimo unesite razlog zašto odbijate ovu opremu:"
        testId="equipment-reject"
        footer={
          <>
            <Btn variant="ghost" onClick={closeReject} disabled={processing}>Odustani</Btn>
            <Btn variant="danger" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>{processing ? 'Odbijam...' : 'Odbij opremu'}</Btn>
          </>
        }
      >
        <Textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Unesite razlog odbijanja..."
          rows={4}
          autoFocus
        />
      </Dialog>
    </>
  );
};

export default EquipmentConfirmation;
