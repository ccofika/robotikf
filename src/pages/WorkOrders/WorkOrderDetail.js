// Detalj radnog naloga (admin, i kao prozor preko liste naloga): podaci sa izmenom na olovku, oprema, materijal,
// slike, istorije (vraćanja, reklamacije, odlaganja, otkazivanja), pozivi i traka sa radnjama na dnu.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Download, History, ImageIcon, MapPin,
  Pencil, Phone, Save, Sparkles, Trash2, Undo2, UserCheck, UserRound, X
} from 'lucide-react';
import { toast } from '../../utils/toast';
import api, { workOrdersAPI, techniciansAPI, userEquipmentAPI, supportCallsAPI } from '../../services/api';
import { supportTypeLabel, supportTypeStyle, callSourceLabel, EVENT_TYPE_BADGES } from '../../utils/supportCalls';
import { getTimLabel, getTimBadgeClasses } from '../../utils/tim';
import jsPDF from 'jspdf';
// eslint-disable-next-line no-unused-vars
import html2canvas from 'html2canvas';
import AIVerificationModal from '../../components/AIVerificationModal';
import ReturnWorkOrderModal from '../../components/ReturnWorkOrderModal';
import ComplaintModal from '../../components/ComplaintModal';
import PenaltyAdjustModal from '../../components/PenaltyAdjustModal';
import { getPenaltyInfo, formatRsd } from '../../utils/rejectionPenalty';
import { useWorkOrderModal } from '../../context/WorkOrderModalContext';
import { localYmd } from '../../utils/localDate';
import { cx, Btn, Led, State, Sign, Skeleton } from '../../security/sx/ui';
import { PageHead, Panel, Note } from '../../security/sx/layout';
import { Input, Select, Textarea } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { confirm } from '../../security/sx/confirm';
import { useLayer } from '../../security/sx/layer';
import { Loading } from '../../montaza/ui';
import './WorkOrderDetail.mx.css';

// Ton stanja naloga (znak + tekst)
const STATUS_TONE = { zavrsen: 'ok', nezavrsen: 'warn', odlozen: 'info', otkazan: 'bad' };
const STATUS_OPTIONS = [
  { status: 'zavrsen', label: 'Završen' },
  { status: 'nezavrsen', label: 'Nezavršen' },
  { status: 'odlozen', label: 'Odložen' },
  { status: 'otkazan', label: 'Otkazan' }
];
const CUSTOMER_STATUSES = [
  'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
  'Priključenje korisnika na HFC KDS mreža u privatnim kućama sa instalacijom CPE opreme (izrada instalacije od PM-a do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
  'Priključenje korisnika na GPON mrežu u privatnim kućama (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
  'Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
  'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji sa montažnim radovima sa isporukom materijala',
  'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji bez montažnih radova sa isporukom materijala',
  'Priključenje novog korisnika WiFi tehnologijom (postavljanje nosača antene, postavljanje i usmeravanje antene ka baznoj stanici sa postavljanjem napajanja za antenu, postavljanje rutera i jednog uređaja za televiziju) - ASTRA TELEKOM',
  'Dodavanje drugog uređaja ili dorada - ASTRA TELEKOM',
  'Demontaža postojeće opreme kod korisnika (po korisniku) - ASTRA TELEKOM',
  'Intervencija kod korisnika - ASTRA TELEKOM',
  'Priključenje korisnika GPON tehnologijom (povezivanje svih uređaja u okviru paketa) - ASTRA TELEKOM'
];
const imageUrlOf = (img) => (typeof img === 'object' ? img.url : img);
const shortDate = (d) => new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' });

// Polje sa olovkom (van roditelja, da se ne pravi iznova pri svakom crtanju i kursor ne skače).
// Prozor za izmenu ide u Portal (Radix), pa ostaje na ekranu i uz desnu ivicu.
const EditableField = ({ field, value, displayValue, type = 'text', options, placeholder, rows, isEditing, editVal, onEditValChange, onStartEdit, onConfirm, onCancel, editRefProp }) => {
  return (
    <Popover.Root open={isEditing}>
      <Popover.Anchor asChild>
        <span className="mx-wod-edit">
          <span className="mx-wod-edit__val">
            {displayValue || value || <span className="mx-wod-none">Nije unet</span>}
          </span>
          <button type="button" className="mx-wod-edit__btn" onClick={() => onStartEdit(field, value)} title="Izmeni">
            <Pencil size={13} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content ref={editRefProp} className="sx-portal sx-popover mx-wod-pop" align="start" sideOffset={6} collisionPadding={12}>
          {type === 'select' ? (
            <Select value={editVal} onChange={(e) => onEditValChange(e.target.value)} autoFocus>
              {options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          ) : type === 'textarea' ? (
            <Textarea
              value={editVal}
              onChange={(e) => onEditValChange(e.target.value)}
              rows={rows || 3}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel();
              }}
            />
          ) : (
            <Input
              type={type}
              value={editVal}
              onChange={(e) => onEditValChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onCancel();
              }}
            />
          )}
          <div className="mx-wod-pop__acts">
            <Btn size="sm" variant="primary" onClick={onConfirm}>OK</Btn>
            <Btn size="sm" onClick={onCancel}>Otkaži</Btn>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

// Polja forme za izmenu naloga iz podataka sa servera
const buildFormData = (data) => ({
  date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
  time: data.time || '09:00',
  municipality: data.municipality,
  address: data.address,
  type: data.type,
  technicianId: data.technicianId?._id || data.technicianId || '',
  technician2Id: data.technician2Id?._id || data.technician2Id || '',
  details: data.details || '',
  comment: data.comment || '',
  status: data.status || 'nezavrsen',
  customerEmail: data.customerEmail || '',
  tim: data.tim || ''
});

const WorkOrderDetail = ({ isModal = false, onCloseModal, modalWorkOrderId }) => {
  // Visina fiksne trake sa radnjama: stranica dobija toliko prostora ispod, da traka ništa ne prekrije
  const [barH, setBarH] = useState(0);
  const barObserver = useRef(null);
  const barRef = useCallback((el) => {
    if (barObserver.current) { barObserver.current.disconnect(); barObserver.current = null; }
    if (!el || typeof ResizeObserver === 'undefined') return;
    barObserver.current = new ResizeObserver(() => setBarH(el.offsetHeight));
    barObserver.current.observe(el);
  }, []);
  const params = useParams();
  const id = modalWorkOrderId || params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const { signalDataChanged } = useWorkOrderModal();
  const [workOrder, setWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    municipality: '',
    address: '',
    type: '',
    technicianId: '',
    technician2Id: '',
    details: '',
    comment: '',
    status: '',
    customerEmail: '',
    tim: ''
  });
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userEquipment, setUserEquipment] = useState([]);
  const [userEquipmentHistory, setUserEquipmentHistory] = useState([]);
  const [removedEquipment, setRemovedEquipment] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [images, setImages] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showFullImage, setShowFullImage] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [voiceRecordings, setVoiceRecordings] = useState([]);
  const [supportCalls, setSupportCalls] = useState([]);
  const [sameAddressOrders, setSameAddressOrders] = useState([]);
  const [verifying, setVerifying] = useState(false);
  // Potvrda vraćanja (ručno ili posle AI preporuke) sa checkbox-om za umanjenje zarade
  const [returnModal, setReturnModal] = useState({ isOpen: false, initialComment: '', source: 'manual' });
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState({});
  const [customerStatusModal, setCustomerStatusModal] = useState({ isOpen: false, orderId: null });

  // AI Verification states
  const [loadingAIVerification, setLoadingAIVerification] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiVerificationResult, setAIVerificationResult] = useState(null);

  // Verification navigation states
  const [verificationOrderIds, setVerificationOrderIds] = useState([]);
  const isFromVerification = new URLSearchParams(location.search).get('fromVerification') === 'true';

  // Status dropdown in sticky bar
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Inline edit states
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef(null);
  const statusDropdownRef = useRef(null);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [workOrderRes, techniciansRes] = await Promise.all([
          workOrdersAPI.getOne(id),
          techniciansAPI.getAll()
        ]);

        setWorkOrder(workOrderRes.data);
        setFormData(buildFormData(workOrderRes.data));
        setTechnicians(techniciansRes.data);

        // Postavi slike i materijale
        setImages(workOrderRes.data.images || []);
        setMaterials(workOrderRes.data.materials || []);
        setVoiceRecordings(workOrderRes.data.voiceRecordings || []);

        // Pozivi podršci - zaseban fetch da njegov neuspeh ne obori stranicu
        supportCallsAPI.getByWorkOrder(id)
          .then(res => setSupportCalls(Array.isArray(res.data) ? res.data : []))
          .catch(err => {
            console.error('Greška pri učitavanju poziva podrške:', err);
            setSupportCalls([]);
          });

        // Nalozi na istoj adresi - zaseban fetch, neuspeh ne obara stranicu
        workOrdersAPI.getSameAddress(id)
          .then(res => setSameAddressOrders(Array.isArray(res.data) ? res.data : []))
          .catch(err => {
            console.error('Greška pri učitavanju naloga na istoj adresi:', err);
            setSameAddressOrders([]);
          });

        // Load customer status if this is a finished work order that needs verification
        if (workOrderRes.data.status === 'zavrsen' && !workOrderRes.data.verified && workOrderRes.data.technicianId) {
          loadCustomerStatus(workOrderRes.data._id);
        }

        const fetchUserEquipment = async () => {
          if (!workOrderRes.data.tisId) return;

          setLoadingEquipment(true);
          try {
            // Dohvati trenutno instaliranu opremu
            const userEqResponse = await userEquipmentAPI.getForUser(workOrderRes.data.tisId);
            setUserEquipment(userEqResponse.data);

            // Dohvati istoriju opreme
            const historyResponse = await userEquipmentAPI.getUserHistory(workOrderRes.data.tisId);
            setUserEquipmentHistory(historyResponse.data);

            // Dohvati uklonjenu opremu za ovaj radni nalog
            const removedEqResponse = await userEquipmentAPI.getRemovedForWorkOrder(workOrderRes.data._id);
            setRemovedEquipment(removedEqResponse.data);
          } catch (err) {
            console.error('Error fetching user equipment:', err);
          } finally {
            setLoadingEquipment(false);
          }
        };

        fetchUserEquipment();
      } catch (err) {
        console.error('Greška pri učitavanju podataka:', err);
        setError('Greška pri učitavanju podataka. Pokušajte ponovo.');
        toast.error('Neuspešno učitavanje podataka!');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch verification order list for prev/next navigation
  useEffect(() => {
    if (!isFromVerification) return;

    const fetchVerificationList = async () => {
      try {
        const response = await workOrdersAPI.getVerification();
        const orders = response.data || [];
        // Sort by date descending (same as sortByDate in WorkOrdersByTechnician)
        const sorted = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
        setVerificationOrderIds(sorted.map(o => o._id));
      } catch (err) {
        console.error('Error fetching verification list:', err);
      }
    };

    fetchVerificationList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFromVerification]);

  // Click outside to close edit popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editRef.current && !editRef.current.contains(e.target)) {
        cancelEdit();
      }
    };
    if (editingField) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingField]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close status dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setShowStatusDropdown(false);
      }
    };
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown]);

  // Pregled slike je sloj: Escape ga zatvara, a stranica ispod se ne pomera
  useLayer(!!showFullImage, () => setShowFullImage(null));

  // Verification navigation helpers
  const currentVerificationIndex = verificationOrderIds.indexOf(id);
  const hasPrevVerification = isFromVerification && currentVerificationIndex > 0;
  const hasNextVerification = isFromVerification && currentVerificationIndex >= 0 && currentVerificationIndex < verificationOrderIds.length - 1;

  const goToPrevVerification = () => {
    if (hasPrevVerification) {
      const prevId = verificationOrderIds[currentVerificationIndex - 1];
      window.location.href = `/work-orders/${prevId}?fromVerification=true`;
    }
  };

  const goToNextVerification = () => {
    if (hasNextVerification) {
      const nextId = verificationOrderIds[currentVerificationIndex + 1];
      window.location.href = `/work-orders/${nextId}?fromVerification=true`;
    }
  };

  // Centralized back navigation
  const goBack = () => {
    if (isModal && onCloseModal) {
      onCloseModal();
    } else if (location.state?.fromUsersList) {
      navigate(location.state.previousPath || '/users', {
        state: {
          fromWorkOrderDetail: true,
          selectedUserId: location.state.selectedUserId
        }
      });
    } else {
      navigate('/work-orders');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    setSaving(true);
    setError('');

    try {
      const updatedData = {
        ...formData,
        technicianId: formData.technicianId || null,
        technician2Id: formData.technician2Id || null
      };

      const response = await workOrdersAPI.update(id, updatedData);
      setWorkOrder(response.data);

      signalDataChanged();
      toast.success('Radni nalog je uspešno ažuriran!');
    } catch (error) {
      console.error('Greška pri ažuriranju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje radnog naloga!');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    setSaving(true);
    setError('');

    try {
      // Priprema podataka za slanje, konvertuj prazan string u null za oba technicianId polja
      const updatedData = {
        ...formData,
        status,
        technicianId: formData.technicianId || null, // konvertuj prazan string u null
        technician2Id: formData.technician2Id || null // konvertuj prazan string u null
      };

      console.log('Sending data:', updatedData);
      const response = await workOrdersAPI.update(id, updatedData);
      console.log('Response:', response);

      setWorkOrder(response.data);
      setFormData(prev => ({ ...prev, status }));

      signalDataChanged();
      toast.success(`Status radnog naloga je promenjen na "${status === 'zavrsen' ? 'Završen' :
        status === 'odlozen' ? 'Odložen' :
        status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}"!`);
    } catch (error) {
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || 'Greška pri promeni statusa. Pokušajte ponovo.');
      toast.error('Neuspešna promena statusa!');
    } finally {
      setSaving(false);
    }
  };

  // Function to check if work order needs verification
  const needsVerification = () => {
    return workOrder &&
           workOrder.status === 'zavrsen' &&
           !workOrder.verified &&
           workOrder.technicianId;
  };

  // Load customer status for verification
  const loadCustomerStatus = async (orderId) => {
    try {
      const response = await api.get(`/api/workorders/${orderId}/evidence`);
      const status = response.data.customerStatus || null;
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    } catch (error) {
      console.error(`Failed to load status for order ${orderId}:`, error);
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: null
      }));
      return null;
    }
  };

  // Handle verification
  const handleVerifyOrder = async () => {
    if (!workOrder) return;

    try {
      setVerifying(true);

      let currentStatus = orderStatuses[workOrder._id];
      if (!currentStatus) {
        currentStatus = await loadCustomerStatus(workOrder._id);
      }

      if (!currentStatus) {
        toast.error('Potrebno je prvo postaviti status korisnika pre verifikacije!');
        return;
      }

      await workOrdersAPI.verify(workOrder._id);
      toast.success('Radni nalog je uspešno verifikovan!');

      const response = await workOrdersAPI.getOne(id);
      setWorkOrder(response.data);
      signalDataChanged();

    } catch (error) {
      console.error('Greška pri verifikaciji:', error);
      toast.error('Neuspešna verifikacija radnog naloga!');
    } finally {
      setVerifying(false);
    }
  };

  // Ponovo učitaj nalog posle vraćanja/reklamacije (menjaju status, tehničare, termin i istoriju)
  const reloadWorkOrder = async () => {
    const response = await workOrdersAPI.getOne(id);
    setWorkOrder(response.data);
    setFormData(buildFormData(response.data));
    setImages(response.data.images || []);
    signalDataChanged();
  };

  // Posle potvrde u modalu za vraćanje naloga
  const handleReturned = async () => {
    setReturnModal({ isOpen: false, initialComment: '', source: 'manual' });
    try {
      await reloadWorkOrder();
    } catch (error) {
      console.error('Greška pri osvežavanju radnog naloga:', error);
    }
  };

  // Posle evidentirane reklamacije
  const handleComplaintFiled = async () => {
    setShowComplaintModal(false);
    try {
      await reloadWorkOrder();
    } catch (error) {
      console.error('Greška pri osvežavanju radnog naloga:', error);
    }
  };

  // Posle promene minusa (superadmin)
  const handlePenaltyAdjusted = async () => {
    setShowPenaltyModal(false);
    try {
      await reloadWorkOrder();
    } catch (error) {
      console.error('Greška pri osvežavanju radnog naloga:', error);
    }
  };

  // Open customer status modal (skrol stranice zaključava sam dijalog, sloj iz security/sx/layer)
  const openCustomerStatusModal = async (orderId) => {
    if (!orderStatuses[orderId]) {
      await loadCustomerStatus(orderId);
    }
    setCustomerStatusModal({ isOpen: true, orderId });
  };

  // Close customer status modal
  const closeCustomerStatusModal = () => {
    setCustomerStatusModal({ isOpen: false, orderId: null });
  };

  // Handle customer status change
  const handleCustomerStatusChange = async (orderId, newStatus) => {
    try {
      await workOrdersAPI.updateCustomerStatus(orderId, {
        customerStatus: newStatus
      });

      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: newStatus
      }));

      toast.success('Status korisnika je uspešno ažuriran!');
      closeCustomerStatusModal();
    } catch (error) {
      console.error('Error updating customer status:', error);
      toast.error('Greška pri ažuriranju statusa korisnika!');
    }
  };

  // Get customer status color
  const getCustomerStatusColor = (status) => {
    if (status?.includes('HFC KDS')) return 'bg-blue-100 text-blue-800';
    if (status?.includes('GPON tehnologijom')) return 'bg-teal-100 text-teal-800';
    if (status?.includes('GPON')) return 'bg-green-100 text-green-800';
    if (status?.includes('montažnim radovima')) return 'bg-yellow-100 text-yellow-800';
    if (status?.includes('bez montažnih radova')) return 'bg-purple-100 text-purple-800';
    if (status?.includes('WiFi')) return 'bg-cyan-100 text-cyan-800';
    if (status?.includes('Dodavanje')) return 'bg-orange-100 text-orange-800';
    if (status?.includes('Demontaža')) return 'bg-red-100 text-red-800';
    if (status?.includes('Intervencija')) return 'bg-pink-100 text-pink-800';
    if (status?.includes('ASTRA')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  // AI Verification handler
  const handleAIVerify = async () => {
    if (!workOrder) return;

    setLoadingAIVerification(true);
    setAIVerificationResult(null);
    setShowAIModal(true);

    try {
      console.log('Starting AI analysis for order:', workOrder._id);

      const result = await api.post(`/api/workorders/${workOrder._id}/ai-verify`);

      console.log('AI analysis result:', result.data);

      setAIVerificationResult({
        orderId: workOrder._id,
        verified: result.data.verified,
        customerStatus: result.data.customerStatus,
        reason: result.data.reason,
        checkedItems: result.data.checkedItems,
        confidence: result.data.confidence
      });

    } catch (error) {
      console.error('Error during AI analysis:', error);
      setShowAIModal(false);
      toast.error(error.response?.data?.error || 'Greška pri AI analizi');
    } finally {
      setLoadingAIVerification(false);
    }
  };

  // Accept AI recommendation (verify work order)
  const handleAcceptAI = async () => {
    if (!aiVerificationResult) return;

    try {
      const orderId = aiVerificationResult.orderId;

      await workOrdersAPI.updateCustomerStatus(orderId, {
        customerStatus: aiVerificationResult.customerStatus
      });

      await workOrdersAPI.verify(orderId);

      toast.success('Radni nalog je uspešno verifikovan!');

      const response = await workOrdersAPI.getOne(id);
      setWorkOrder(response.data);

      setShowAIModal(false);
      setAIVerificationResult(null);

    } catch (error) {
      console.error('Error accepting AI recommendation:', error);
      toast.error('Greška pri verifikaciji radnog naloga');
    }
  };

  // Reject AI recommendation (return to technician) - ista potvrda sa umanjenjem kao ručno vraćanje
  const handleRejectAI = () => {
    if (!aiVerificationResult) return;

    const reason = aiVerificationResult.reason;
    setShowAIModal(false);
    setAIVerificationResult(null);
    setReturnModal({
      isOpen: true,
      initialComment: `AI VERIFIKACIJA:\n\n${reason}`,
      source: 'ai'
    });
  };

  // Funkcija za generisanje PDF-a
  const generatePDF = async () => {
    if (!workOrder) {
      toast.error('Podaci o radnom nalogu nisu dostupni!');
      return;
    }

    setGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let currentY = margin;

      const normalizeText = (text) => {
        if (!text) return 'N/A';

        let normalized = text.toString();

        const replacements = {
          'š': 's', 'Š': 'S',
          'đ': 'dj', 'Đ': 'Dj',
          'č': 'c', 'Č': 'C',
          'ć': 'c', 'Ć': 'C',
          'ž': 'z', 'Ž': 'Z',
          'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ā': 'a', 'ã': 'a',
          'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e',
          'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i',
          'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'ō': 'o', 'õ': 'o',
          'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ū': 'u',
          'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ā': 'A', 'Ã': 'A',
          'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E', 'Ē': 'E',
          'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I', 'Ī': 'I',
          'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Ō': 'O', 'Õ': 'O',
          'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'Ū': 'U'
        };

        for (const [original, replacement] of Object.entries(replacements)) {
          normalized = normalized.replace(new RegExp(original, 'g'), replacement);
        }

        // eslint-disable-next-line no-control-regex
        normalized = normalized.replace(/[^\x00-\x7F]/g, '');
        normalized = normalized.replace(/\s+/g, ' ').trim();

        return normalized;
      };

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RADNI NALOG', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const statusText = formData.status === 'zavrsen' ? 'Zavrsen' :
                        formData.status === 'odlozen' ? 'Odlozen' :
                        formData.status === 'otkazan' ? 'Otkazan' : 'Nezavrsen';
      pdf.text(`Status: ${statusText}`, margin, currentY);
      currentY += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.text('OSNOVNI PODACI', margin, currentY);
      currentY += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const basicData = [
        ['Datum:', formData.date ? new Date(formData.date).toLocaleDateString('sr-RS') : 'N/A'],
        ['Vreme:', normalizeText(formData.time) || 'N/A'],
        ['Opstina:', normalizeText(formData.municipality) || 'N/A'],
        ['Adresa:', normalizeText(formData.address) || 'N/A'],
        ['Tip instalacije:', normalizeText(formData.type) || 'N/A'],
        ['Prvi tehnicar:', normalizeText(technicians.find(t => t._id === formData.technicianId)?.name) || 'Nije dodeljen'],
        ['Drugi tehnicar:', normalizeText(technicians.find(t => t._id === formData.technician2Id)?.name) || 'Nije dodeljen'],
        ['Tim:', normalizeText(getTimLabel(formData.tim))]
      ];

      basicData.forEach(([label, value]) => {
        pdf.text(normalizeText(label), margin, currentY);
        pdf.text(value, margin + 40, currentY);
        currentY += 6;
      });

      currentY += 5;

      if (formData.details) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('DETALJI:', margin, currentY);
        currentY += 6;
        pdf.setFont('helvetica', 'normal');
        const detailsLines = pdf.splitTextToSize(normalizeText(formData.details), contentWidth);
        detailsLines.forEach(line => {
          pdf.text(line, margin, currentY);
          currentY += 5;
        });
        currentY += 3;
      }

      if (formData.comment) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('KOMENTAR:', margin, currentY);
        currentY += 6;
        pdf.setFont('helvetica', 'normal');
        const commentLines = pdf.splitTextToSize(normalizeText(formData.comment), contentWidth);
        commentLines.forEach(line => {
          pdf.text(line, margin, currentY);
          currentY += 5;
        });
        currentY += 3;
      }

      const additionalInfo = [];
      if (workOrder.tisId) additionalInfo.push(['TIS ID:', normalizeText(workOrder.tisId)]);
      if (workOrder.userName) additionalInfo.push(['Ime korisnika:', normalizeText(workOrder.userName)]);
      if (workOrder.userPhone) additionalInfo.push(['Telefon:', normalizeText(workOrder.userPhone)]);
      if (workOrder.customerEmail) additionalInfo.push(['Email:', normalizeText(workOrder.customerEmail)]);
      if (workOrder.tisJobId) additionalInfo.push(['TIS Job ID:', normalizeText(workOrder.tisJobId)]);
      if (workOrder.technology) additionalInfo.push(['Tehnologija:', normalizeText(workOrder.technology)]);
      if (workOrder.additionalJobs) additionalInfo.push(['Dodatni poslovi:', normalizeText(workOrder.additionalJobs)]);

      if (additionalInfo.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('DODATNE INFORMACIJE:', margin, currentY);
        currentY += 8;
        pdf.setFont('helvetica', 'normal');

        additionalInfo.forEach(([label, value]) => {
          pdf.text(normalizeText(label), margin, currentY);
          pdf.text(value, margin + 40, currentY);
          currentY += 6;
        });
        currentY += 5;
      }

      if (userEquipment.length > 0) {
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text('OPREMA KORISNIKA:', margin, currentY);
        currentY += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        userEquipment.forEach(eq => {
          pdf.text(`• ${normalizeText(eq.equipmentType)}: ${normalizeText(eq.equipmentDescription)}`, margin, currentY);
          currentY += 5;
          pdf.text(`  Serijski broj: ${normalizeText(eq.serialNumber)}`, margin + 5, currentY);
          currentY += 5;
          pdf.text(`  Instaliran: ${new Date(eq.installedAt).toLocaleDateString('sr-RS')}`, margin + 5, currentY);
          currentY += 8;
        });
      }

      if (materials.length > 0) {
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('UTROSENI MATERIJALI:', margin, currentY);
        currentY += 8;
        pdf.setFont('helvetica', 'normal');

        materials.forEach(materialItem => {
          pdf.text(`• ${normalizeText(materialItem.material?.type || 'Nepoznat materijal')} - Kolicina: ${materialItem.quantity}`, margin, currentY);
          currentY += 6;
        });
        currentY += 5;
      }

      if (images.length > 0) {
        pdf.addPage();
        currentY = margin;

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SLIKE RADNOG NALOGA', margin, currentY);
        currentY += 15;

        const loadImage = (src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };

        for (let i = 0; i < images.length; i++) {
          try {
            const imageUrl = typeof images[i] === 'object' ? images[i].url : images[i];
            const img = await loadImage(imageUrl);

            const imgAspectRatio = img.naturalHeight / img.naturalWidth;
            const fullImageWidth = contentWidth;
            const fullImageHeight = fullImageWidth * imgAspectRatio;

            const maxImageHeight = pageHeight - (2 * margin);
            const finalImageHeight = Math.min(fullImageHeight, maxImageHeight);
            const finalImageWidth = fullImageHeight > maxImageHeight
              ? finalImageHeight / imgAspectRatio
              : fullImageWidth;

            if (currentY + finalImageHeight > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const resizedImageData = canvas.toDataURL('image/jpeg', 0.85);

            pdf.addImage(resizedImageData, 'JPEG', margin, currentY, finalImageWidth, finalImageHeight);
            currentY += finalImageHeight + 10;

          } catch (error) {
            console.error('Greška pri učitavanju slike:', error);
          }
        }
      }

      const fileName = `Radni_Nalog_${workOrder.tisId || workOrder._id}_${localYmd()}.pdf`;
      pdf.save(fileName);

      toast.success('PDF je uspesno generisan i downloadovan!');

    } catch (error) {
      console.error('Greska pri generisanju PDF-a:', error);
      toast.error('Greska pri generisanju PDF-a. Pokusajte ponovo.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Funkcija za brisanje slike
  const handleImageDelete = async (imageUrl) => {
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete ovu sliku?', tone: 'danger', confirmLabel: 'Obriši' }))) {
      return;
    }

    setDeletingImage(true);
    try {
      await api.delete(`/api/workorders/${id}/images`, {
        data: { imageUrl }
      });

      toast.success('Slika je uspešno obrisana!');

      setImages(images.filter(img => img !== imageUrl));

      const updatedWorkOrder = await workOrdersAPI.getOne(id);
      setImages(updatedWorkOrder.data.images || []);
    } catch (error) {
      console.error('Greška pri brisanju slike:', error);
      toast.error('Greška pri brisanju slike. Pokušajte ponovo.');
    } finally {
      setDeletingImage(false);
    }
  };

  // ─── Inline Edit Helpers ───────────────────────────────────
  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const confirmEdit = () => {
    if (!editingField) return;

    // Email format validacija (samo za customerEmail polje)
    if (editingField === 'customerEmail') {
      const trimmed = (editValue || '').trim();
      if (trimmed !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          toast.error('Email nije u ispravnom formatu (npr. ime@domen.com)');
          return; // Ne zatvaraj edit popover, neka korisnik ispravi
        }
      }
      setFormData(prev => ({ ...prev, [editingField]: trimmed }));
    } else {
      setFormData(prev => ({ ...prev, [editingField]: editValue }));
    }

    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Helper to generate shared EditableField props
  const editProps = (field) => ({
    isEditing: editingField === field,
    editVal: editValue,
    onEditValChange: setEditValue,
    onStartEdit: startEdit,
    onConfirm: confirmEdit,
    onCancel: cancelEdit,
    editRefProp: editRef
  });

  // ─── Status Config Helper ─────────────────────────────────
  const getStatusConfig = (status) => {
    switch (status) {
      case 'zavrsen':
        return { label: 'Završen', tone: STATUS_TONE.zavrsen };
      case 'odlozen':
        return { label: 'Odložen', tone: STATUS_TONE.odlozen };
      case 'otkazan':
        return { label: 'Otkazan', tone: STATUS_TONE.otkazan };
      default:
        return { label: 'Nezavršen', tone: STATUS_TONE.nezavrsen };
    }
  };

  // ─── Role Helpers ──────────────────────────────────────────
  const storedUser = localStorage.getItem('user');
  const currentUserRole = storedUser ? JSON.parse(storedUser).role : null;
  const canViewRecordings = currentUserRole === 'supervisor' || currentUserRole === 'superadmin';
  const canViewEditLog = currentUserRole === 'superadmin';
  const canAdjustPenalty = currentUserRole === 'superadmin';


  // Učitavanje
  if (loading) {
    return (
      <div className="sx-page" aria-busy="true" data-testid="page-work-order-detail">
        <span className="sx-sr">Učitavanje...</span>
        <Skeleton h={14} w={180} />
        <Skeleton h={44} w="min(420px, 80%)" style={{ marginTop: 16 }} />
        <Skeleton h={150} r={18} style={{ marginTop: 26 }} />
        <Skeleton h={320} r={18} style={{ marginTop: 20 }} />
      </div>
    );
  }

  if (error && !workOrder) {
    return (
      <div className="sx-page" data-testid="page-work-order-detail">
        <PageHead
          eyebrow="Montaža · Radni nalozi"
          title="Detalji radnog naloga"
          actions={<Btn icon={ArrowLeft} onClick={goBack}>Povratak na listu</Btn>}
        />
        <Note tone="bad">{error}</Note>
      </div>
    );
  }

  const statusConfig = getStatusConfig(formData.status);
  const penaltyInfo = getPenaltyInfo(workOrder);
  const hasAssignedTechnician = !!(workOrder?.technicianId || workOrder?.technician2Id);
  const techName = technicians.find(t => t._id === formData.technicianId)?.name;
  const tech2Name = technicians.find(t => t._id === formData.technician2Id)?.name;
  const fullImageIndex = showFullImage ? images.findIndex(img => imageUrlOf(img) === showFullImage) : -1;

  // Glavni prikaz
  return (
    <>
    <div className="sx-page mx-wod" data-testid="page-work-order-detail" style={barH ? { paddingBottom: barH + 36 } : undefined}>
      {error && <Note tone="bad" className="mx-wod-block">{error}</Note>}

      {/* Povratak na nalog sa kog se došlo (klik iz sekcije "Nalozi na istoj adresi") */}
      {location.state?.backTo && (
        <div className="mx-wod-block mx-wod-backs">
          <Btn size="sm" variant="ghost" icon={ArrowLeft} onClick={() => navigate(`/work-orders/${location.state.backTo.id}`)}>
            Nazad na nalog {location.state.backTo.tis ? `TIS ${location.state.backTo.tis}` : ''}
          </Btn>
        </div>
      )}

      {/* Upozorenje: na ovoj adresi postoji ranije otkazan nalog (flag sa importa) */}
      {workOrder?.duplicateAddressFlagged && (
        <Note tone="warn" className="mx-wod-block">
          Na ovoj adresi {workOrder.duplicateAddressCanceledCount === 1
            ? 'postoji ranije otkazan radni nalog'
            : `postoje ${workOrder.duplicateAddressCanceledCount || ''} ranije otkazana radna naloga`} - pogledaj sekciju "Nalozi na istoj adresi" ispod.
        </Note>
      )}

      {/* Osnovni podaci (izmena na olovku) i oznake naloga */}
      <Panel
        pad={false}
        className="mx-wod-block mx-wod-facts"
        testId="wod-facts"
        footer={
          <div className="mx-wod-ids">
            {workOrder?.tisId && (
              <span className="mx-wod-id"><span className="sx-label">TIS</span><span className="mx-wod-code">{workOrder.tisId}</span></span>
            )}
            {workOrder?.tisJobId && (
              <span className="mx-wod-id"><span className="sx-label">Job</span><span className="mx-wod-code">{workOrder.tisJobId}</span></span>
            )}
            {workOrder?.technology && (
              <span className="mx-wod-id"><span className="sx-label">Tehnologija</span><span className="sx-mono">{workOrder.technology}</span></span>
            )}
            <span className="mx-wod-id">
              <span className="sx-label">Tim</span>
              <EditableField
                field="tim"
                {...editProps("tim")}
                value={formData.tim}
                displayValue={<span className={cx('mx-wod-tim', getTimBadgeClasses(formData.tim))}>{getTimLabel(formData.tim)}</span>}
                type="select"
                options={[
                  { value: '', label: 'Nije definisan' },
                  { value: 'robotik', label: 'Robotik' },
                  { value: 'mtel', label: 'mtel' }
                ]}
              />
            </span>
            <span className="mx-wod-id">
              <span className="sx-label">Email</span>
              {workOrder?.verified ? (
                // Verifikovan radni nalog - read-only (email se ne može menjati posle verifikacije)
                <span>{workOrder?.customerEmail || <span className="mx-wod-none">Nije unet</span>}</span>
              ) : (
                // Pre verifikacije - editovati slobodno
                <EditableField
                  field="customerEmail"
                  {...editProps("customerEmail")}
                  value={formData.customerEmail}
                  displayValue={formData.customerEmail ? formData.customerEmail : <span className="mx-wod-none">Nije unet</span>}
                  type="email"
                  placeholder="ime@domen.com"
                />
              )}
            </span>
          </div>
        }
      >
        <div className="mx-wod-facts__grid">
          {/* Datum / Tip */}
          <div className="mx-wod-fact">
            <span className="sx-label mx-wod-fact__label"><CalendarDays aria-hidden="true" strokeWidth={1.9} />Datum / Tip</span>
            <div className="mx-wod-fact__main">
              <EditableField
                field="date"
                {...editProps("date")}
                value={formData.date}
                displayValue={formData.date ? new Date(formData.date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                type="date"
              />
            </div>
            <div className="mx-wod-fact__sub">
              <EditableField
                field="type"
                {...editProps("type")}
                value={formData.type}
                displayValue={formData.type || '-'}
                type="text"
                placeholder="Tip instalacije"
              />
              <span aria-hidden="true">·</span>
              <EditableField
                field="time"
                {...editProps("time")}
                value={formData.time}
                displayValue={formData.time || '-'}
                type="time"
              />
            </div>
          </div>

          {/* Lokacija */}
          <div className="mx-wod-fact">
            <span className="sx-label mx-wod-fact__label"><MapPin aria-hidden="true" strokeWidth={1.9} />Lokacija</span>
            <div className="mx-wod-fact__main">
              <EditableField
                field="municipality"
                {...editProps("municipality")}
                value={formData.municipality}
                type="text"
                placeholder="Opština"
              />
            </div>
            <div className="mx-wod-fact__sub">
              <EditableField
                field="address"
                {...editProps("address")}
                value={formData.address}
                displayValue={formData.address || '-'}
                type="text"
                placeholder="Adresa"
              />
            </div>
          </div>

          {/* Tehničar */}
          <div className="mx-wod-fact">
            <span className="sx-label mx-wod-fact__label"><UserRound aria-hidden="true" strokeWidth={1.9} />Tehničar</span>
            <div className="mx-wod-fact__main">
              <EditableField
                field="technicianId"
                {...editProps("technicianId")}
                value={formData.technicianId}
                displayValue={techName || <span className="mx-wod-none">Nije dodeljen</span>}
                type="select"
                options={[
                  { value: '', label: 'Odaberite tehničara' },
                  ...technicians.filter(t => !t.deletedAt || t._id === formData.technicianId).map(t => ({ value: t._id, label: t.deletedAt ? `${t.name} (obrisan)` : t.name }))
                ]}
              />
            </div>
            <div className="mx-wod-fact__sub">
              <EditableField
                field="technician2Id"
                {...editProps("technician2Id")}
                value={formData.technician2Id}
                displayValue={
                  tech2Name
                    ? <>+ {tech2Name} <span className="mx-wod-faint">(pomoćni)</span></>
                    : <span className="mx-wod-none">Bez pomoćnog</span>
                }
                type="select"
                options={[
                  { value: '', label: 'Nema pomoćnog' },
                  ...technicians.filter(t => t._id !== formData.technicianId && (!t.deletedAt || t._id === formData.technician2Id)).map(t => ({ value: t._id, label: t.deletedAt ? `${t.name} (obrisan)` : t.name }))
                ]}
              />
            </div>
          </div>

          {/* Korisnik (read-only) */}
          <div className="mx-wod-fact">
            <span className="sx-label mx-wod-fact__label"><Phone aria-hidden="true" strokeWidth={1.9} />Korisnik</span>
            <p className="mx-wod-fact__main">{workOrder?.userName || <span className="mx-wod-faint">-</span>}</p>
            <p className="mx-wod-fact__sub">{workOrder?.userPhone || '-'}</p>
          </div>
        </div>
      </Panel>

      <div className="sx-cols sx-cols--wide mx-wod-block">
        {/* Levo: posao, oprema, materijal i slike */}
        <div className="sx-stack">
          {/* Detalji posla i komentar tehničara: jedan blok sa dve polovine, kao ranije */}
          <Panel pad={false} testId="wod-details-comment">
            <div className="mx-wod-split">
              <div className="mx-wod-split__half" data-testid="wod-details">
                <h2 className="sx-card__title">Detalji posla</h2>
                <EditableField
                  field="details"
                  {...editProps("details")}
                  value={formData.details}
                  displayValue={formData.details ? <span className="mx-wod-text">{formData.details}</span> : null}
                  type="textarea"
                  rows={4}
                  placeholder="Opišite detalje posla..."
                />
              </div>
              <div className="mx-wod-split__half" data-testid="wod-comment">
                <h2 className="sx-card__title">Komentar tehničara</h2>
                <EditableField
                  field="comment"
                  {...editProps("comment")}
                  value={formData.comment}
                  displayValue={formData.comment ? <span className="mx-wod-text">{formData.comment}</span> : null}
                  type="textarea"
                  rows={formData.comment ? 4 : 3}
                  placeholder="Komentar..."
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Oprema korisnika"
            actions={<span className="sx-tag is-ink">{userEquipment.length}</span>}
            testId="wod-equipment"
          >
            {loadingEquipment ? (
              <Loading rows={2} h={36} />
            ) : userEquipment.length > 0 ? (
              <div className="mx-wod-tbl">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Tip</th>
                      <th>Opis</th>
                      <th>Serijski br.</th>
                      <th className="is-end">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEquipment.map((eq, i) => (
                      <tr key={eq.id} style={{ '--i': i }}>
                        <td className="is-head"><span className="sx-tag is-ink">{eq.equipmentType?.slice(0, 3)?.toUpperCase() || '-'}</span></td>
                        <td data-label="Opis"><b className="mx-wod-strong">{eq.equipmentDescription || '-'}</b></td>
                        <td data-label="Serijski br." className="sx-mono">{eq.serialNumber}</td>
                        <td data-label="Datum" className="is-end sx-nowrap">{eq.installedAt ? shortDate(eq.installedAt) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mx-wod-empty">Nema instalirane opreme</p>
            )}

            {userEquipmentHistory.length > 0 && (
              <Btn size="sm" variant="ghost" icon={History} className="mx-wod-histbtn" onClick={() => setShowHistoryModal(true)}>Istorija opreme</Btn>
            )}
          </Panel>

          {/* Uklonjena oprema (samo kad je ima) */}
          {removedEquipment.length > 0 && (
            <Panel tone="bad" title="Uklonjena oprema" actions={<span className="sx-tag is-bad">{removedEquipment.length}</span>} testId="wod-removed">
              <div className="mx-wod-tbl">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Tip</th>
                      <th>Serijski br.</th>
                      <th>Stanje</th>
                      <th className="is-end">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {removedEquipment.map((eq, i) => (
                      <tr key={eq.id} style={{ '--i': i }}>
                        <td className="is-head"><span className="sx-tag is-bad">{eq.equipmentType?.slice(0, 3)?.toUpperCase() || '-'}</span></td>
                        <td data-label="Serijski br." className="sx-mono">{eq.serialNumber}</td>
                        <td data-label="Stanje">
                          {eq.condition === 'ispravna' ? <Sign tone="ok">Ispravna</Sign> : <Sign tone="bad">Neispravna</Sign>}
                        </td>
                        <td data-label="Datum" className="is-end sx-nowrap">{eq.removedAt ? shortDate(eq.removedAt) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {/* Utrošeni materijali i slike: jedan blok sa dve polovine, kao ranije */}
          <Panel pad={false} testId="wod-materials-images">
            <div className="mx-wod-split">
              <div className="mx-wod-split__half" data-testid="wod-materials">
                <h2 className="sx-card__title">Utrošeni materijali</h2>
                {materials.length === 0 ? (
                  <p className="mx-wod-empty">Nema materijala</p>
                ) : (
                  <ul className="mx-wod-rows">
                    {materials.map((materialItem, index) => (
                      <li key={index} className="mx-wod-row">
                        <span>{materialItem.material?.type || 'Nepoznat'}</span>
                        <span className="mx-wod-qty">×{materialItem.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mx-wod-split__half" data-testid="wod-images">
                <h2 className="sx-card__title sx-panel__title-row">Slike <span className="sx-count">{images.length}</span></h2>
                {workOrder?.missingPhotosComment && (
                  <Note tone="warn" className="mx-wod-note">
                    <b>Razlog za nedostajuće slike</b>
                    <span className="mx-wod-text mx-wod-note__text">{workOrder.missingPhotosComment}</span>
                  </Note>
                )}
                {images.length === 0 ? (
                  <p className="mx-wod-empty">Nema slika</p>
                ) : (
                  <div className="mx-wod-thumbs">
                    {images.map((imageItem, index) => {
                      const imageUrl = imageUrlOf(imageItem);
                      const originalName = typeof imageItem === 'object' ? imageItem.originalName : null;

                      return (
                        <div key={index} className="mx-wod-thumb">
                          <img
                            src={imageUrl}
                            alt={originalName || `Slika ${index + 1}`}
                            onClick={() => setShowFullImage(imageUrl)}
                          />
                          <button
                            type="button"
                            className="mx-wod-thumb__del"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDelete(imageUrl);
                            }}
                            title="Obriši sliku"
                            disabled={deletingImage}
                          >
                            <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Desno: pregled, pozivi, istorije i verifikacija */}
        <div className="sx-stack">
          <Panel title="Pregled" testId="wod-summary">
            <div className="mx-wod-counts">
              {[
                { label: 'Oprema', value: userEquipment.length.toString() },
                { label: 'Materijali', value: materials.length.toString() },
                { label: 'Slike', value: images.length.toString() },
                { label: 'Snimci', value: voiceRecordings.length.toString() },
              ].map((s, i) => (
                <div key={i} className="mx-wod-counts__item">
                  <b className="sx-num">{s.value}</b>
                  <span className="sx-label">{s.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          {workOrder?.additionalJobs && (
            <Panel title="Dodatni poslovi">
              <p className="mx-wod-text">{workOrder.additionalJobs}</p>
            </Panel>
          )}

          {/* Izmene opreme (samo superadmin) */}
          {canViewEditLog && workOrder?.adminEditLog && workOrder.adminEditLog.length > 0 && (
            <Panel title="Izmene opreme (Admin)" testId="wod-edit-log">
              <ol className="mx-wod-log mx-wod-scroll">
                {workOrder.adminEditLog.map((log, index) => {
                  const isAdd = log.action === 'added' || log.action === 'material_added';
                  const isMaterial = log.action === 'material_added' || log.action === 'material_removed';

                  return (
                    <li key={index} className="mx-wod-entry">
                      <p className="mx-wod-entry__title">
                        <Led tone={isAdd ? 'ok' : 'bad'} />
                        <span>
                          {isAdd ? 'Dodao' : 'Uklonio'} - {log.technicianName}
                          {isMaterial ? (
                            <> · {log.materialType} (kol: {log.materialQuantity})</>
                          ) : (
                            <> · {log.equipmentCategory} - {log.equipmentSerialNumber}</>
                          )}
                        </span>
                      </p>
                      <p className="mx-wod-entry__meta">
                        {log.adminName} · {new Date(log.timestamp).toLocaleDateString('sr-RS')} {new Date(log.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          {/* Snimci poziva (supervisor i superadmin) */}
          {canViewRecordings && (
            <Panel title="Snimci poziva" testId="wod-recordings">
              {voiceRecordings.length === 0 ? (
                <p className="mx-wod-empty">Nema snimaka</p>
              ) : (
                <ol className="mx-wod-log mx-wod-scroll">
                  {voiceRecordings.map((recording, index) => (
                    <li key={recording._id || index} className="mx-wod-entry">
                      <div className="mx-wod-entry__top">
                        <span className="mx-wod-entry__title"><Phone size={14} strokeWidth={1.9} aria-hidden="true" />{recording.phoneNumber}</span>
                        {recording.duration && (
                          <span className="sx-tag sx-mono">
                            {Math.floor(recording.duration / 60)}:{String(recording.duration % 60).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <p className="mx-wod-entry__meta">{new Date(recording.recordedAt).toLocaleString('sr-RS')}</p>
                      <audio controls className="mx-wod-audio" preload="metadata">
                        <source src={recording.url} type="audio/mpeg" />
                        <source src={recording.url} type="audio/mp4" />
                        Vaš pretraživač ne podržava audio reprodukciju.
                      </audio>
                      <p className="mx-wod-entry__meta mx-wod-entry__split">
                        <span className="mx-wod-clip">{recording.fileName}</span>
                        {recording.fileSize && (
                          <span>{(recording.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          )}

          {/* Pozivi i kontakti (objedinjeni timeline: podrška + korisnik + podsetnici + alerti) */}
          {supportCalls.length > 0 && (
            <Panel title="Pozivi i kontakti" testId="wod-calls">
              <ol className="mx-wod-log mx-wod-scroll">
                {supportCalls.map((event, index) => {
                  // Znak po tipu događaja
                  const tone = event.eventType === 'uncontacted_alert' ? 'bad'
                    : event.eventType === 'reminder_sent' ? 'info'
                    : event.eventType === 'customer_call' ? 'ok'
                    : 'idle';

                  const title = event.eventType === 'customer_call'
                    ? <>Poziv korisniku{event.source && (
                        <span className="mx-wod-faint"> ({callSourceLabel(event.source)})</span>
                      )}</>
                    : event.eventType === 'reminder_sent'
                    ? 'Podsetnik tehničaru (30 min pre termina)'
                    : event.eventType === 'uncontacted_alert'
                    ? 'Alert adminima - korisnik nije kontaktiran'
                    : <>{supportTypeLabel(event.supportType)}{event.phoneNumber && (
                        <span className="mx-wod-faint"> ({event.phoneNumber})</span>
                      )}</>;

                  // Za pozive iz aplikacije prikaži konkretan tip (Superpodrška, Marko, Ana...),
                  // a ne genericnu oznaku, inače Marko/Ana ispadaju kao "Podrška"
                  const badgeLabel = event.eventType === 'support_call'
                    ? supportTypeLabel(event.supportType)
                    : EVENT_TYPE_BADGES[event.eventType] || 'Poziv';

                  return (
                    <li key={event._id || index} className="mx-wod-entry">
                      <div className="mx-wod-entry__top">
                        <span className="mx-wod-entry__title"><Led tone={tone} /><span>{title}</span></span>
                        <span className={event.eventType === 'support_call' ? cx('mx-wod-badge', supportTypeStyle(event.supportType).badge) : cx('sx-tag', tone !== 'idle' && `is-${tone}`)}>
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="mx-wod-entry__meta">
                        {new Date(event.at || event.calledAt).toLocaleString('sr-RS')}
                        {(event.technicianName || event.technicianId?.name) && (
                          <span> &middot; {event.technicianName || event.technicianId?.name}</span>
                        )}
                        {event.backfilled && <span> &middot; istorijski zapis</span>}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          {/* Nalozi na istoj adresi (svi statusi; otkazani su okidač za flag pri importu) */}
          {sameAddressOrders.length > 0 && (
            <Panel title={`Nalozi na istoj adresi (${sameAddressOrders.length})`} testId="wod-same-address">
              <div className="sx-list mx-wod-scroll">
                {sameAddressOrders.map((o) => {
                  const st = o.status === 'zavrsen'
                    ? { label: 'Završen', tone: 'ok' }
                    : o.status === 'otkazan'
                    ? { label: 'Otkazan', tone: 'bad' }
                    : o.status === 'odlozen'
                    ? { label: 'Odložen', tone: 'info' }
                    : { label: 'Nezavršen', tone: 'warn' };
                  const techNames = [o.technicianId?.name, o.technician2Id?.name].filter(Boolean).join(', ');
                  return (
                    <button
                      type="button"
                      key={o._id}
                      onClick={() => navigate(`/work-orders/${o._id}`, {
                        state: { backTo: { id, tis: workOrder?.tisId || formData?.tisId || '' } }
                      })}
                      className="sx-item is-click mx-wod-sameaddr"
                    >
                      <span className="sx-item__main">
                        <b>
                          {o.tisId ? `TIS ${o.tisId}` : (o.tisJobId ? `JOB ${o.tisJobId}` : 'Nalog')}
                          {o.type && <span className="mx-wod-faint"> · {o.type}</span>}
                        </b>
                        <span>
                          {o.date ? new Date(o.date).toLocaleDateString('sr-RS') : ''}
                          {o.time && ` u ${o.time}`}
                          {techNames && <span> &middot; {techNames}</span>}
                        </span>
                      </span>
                      <span className="sx-item__side"><Sign tone={st.tone}>{st.label}</Sign></span>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Vraćanja naloga na ispravku i umanjenje zarade */}
          {workOrder?.rejectionHistory && workOrder.rejectionHistory.length > 0 && (
            <Panel
              title="Vraćanja naloga"
              testId="wod-rejections"
              actions={<>
                <span className={cx('sx-tag', penaltyInfo.current > 0 && 'is-bad')}>Trenutni minus: {penaltyInfo.current}%</span>
                {canAdjustPenalty && (
                  <Btn size="sm" onClick={() => setShowPenaltyModal(true)} title="Poništi ili promeni minus (i na već verifikovanom nalogu)">
                    Promeni minus
                  </Btn>
                )}
              </>}
            >
              <ol className="mx-wod-log mx-wod-scroll">
                {[
                  ...workOrder.rejectionHistory.map(item => ({ kind: 'rejection', at: item.rejectedAt, item })),
                  ...(workOrder.penaltyAdjustments || []).map(item => ({ kind: 'adjustment', at: item.adjustedAt, item }))
                ].sort((a, b) => new Date(b.at) - new Date(a.at)).map(({ kind, item }, index) => {
                  if (kind === 'adjustment') {
                    const isOldAdjustmentCycle = (item.cycle || 0) !== (workOrder.penaltyCycle || 0);
                    return (
                      <li key={item._id || `adj-${index}`} className={cx('mx-wod-entry', isOldAdjustmentCycle && 'is-dim')}>
                        <div className="mx-wod-entry__top">
                          <span className="mx-wod-entry__at">{new Date(item.adjustedAt).toLocaleString('sr-RS')}</span>
                          <span className="sx-tag is-warn">Minus promenjen · {item.percentBefore}% → {item.percentAfter}%</span>
                        </div>
                        {item.reason && <p className="mx-wod-entry__text">{item.reason}</p>}
                        <p className="mx-wod-entry__meta">
                          {item.adjustedByName || 'Superadmin'}
                          {item.financeUpdated ? ' · isplata preračunata' : ' · primenjuje se pri verifikaciji'}
                          {isOldAdjustmentCycle && ' · pre reklamacije'}
                        </p>
                      </li>
                    );
                  }
                  const rejection = item;
                  const cycleNumber = rejection.cycle || 0;
                  const numberInCycle = workOrder.rejectionHistory
                    .filter(r => (r.cycle || 0) === cycleNumber)
                    .findIndex(r => r._id === rejection._id) + 1;
                  const isOldCycle = cycleNumber !== (workOrder.penaltyCycle || 0);
                  return (
                    <li key={rejection._id || index} className={cx('mx-wod-entry', isOldCycle && 'is-dim')}>
                      <div className="mx-wod-entry__top">
                        <span className="mx-wod-entry__at">{new Date(rejection.rejectedAt).toLocaleString('sr-RS')}</span>
                        <span className={cx('sx-tag', rejection.penaltyApplied && 'is-bad')}>
                          Vraćanje #{numberInCycle} · {rejection.penaltyApplied ? `minus ${rejection.penaltyPercentAfter}%` : 'bez umanjenja'}
                        </span>
                      </div>
                      <p className="mx-wod-entry__text">{rejection.comment}</p>
                      <p className="mx-wod-entry__meta">
                        {rejection.rejectedByName || 'Admin'}
                        {rejection.source === 'ai' && ' · AI verifikacija'}
                        {rejection.technicianNames?.length > 0 && ` · ${rejection.technicianNames.join(', ')}`}
                        {isOldCycle && ' · pre reklamacije'}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          {/* Reklamacije */}
          {workOrder?.complaints && workOrder.complaints.length > 0 && (
            <Panel title="Reklamacije" tone="bad" testId="wod-complaints">
              <ol className="mx-wod-log mx-wod-scroll">
                {[...workOrder.complaints].reverse().map((complaint, index) => (
                  <li key={complaint._id || index} className="mx-wod-entry">
                    <div className="mx-wod-entry__top">
                      <span className="mx-wod-entry__at">{new Date(complaint.createdAt).toLocaleString('sr-RS')}</span>
                      <span className="sx-tag is-bad">{complaint.createdByName || 'Admin'}</span>
                    </div>
                    {complaint.reason && (
                      <p className="mx-wod-entry__text">{complaint.reason}</p>
                    )}
                    <div className="mx-wod-entry__more">
                      {complaint.removedTechnicians?.map((t, i) => (
                        <div key={i}>
                          <p>
                            <b>Sklonjen: {t.name}</b>
                            {t.deductionAmount > 0
                              ? <span className="mx-wod-bad"> · ukupan odbitak {formatRsd(t.deductionAmount)}</span>
                              : <span className="mx-wod-warn"> · bez odbitka</span>}
                          </p>
                          {t.orderDeductionAmount > 0 && (
                            <p className="mx-wod-entry__sub">Ovaj nalog se ne plaća: -{formatRsd(t.orderDeductionAmount)}</p>
                          )}
                          {t.extraDeductionKind === 'complaint_extra' && t.extraDeductionAmount > 0 && (
                            <p className="mx-wod-entry__sub">
                              Skinut i poslednji nalog iste kategorije: <b>{t.extraTisJobId || t.extraTisId}</b>
                              {t.extraAddress && ` · ${t.extraAddress}`}: -{formatRsd(t.extraDeductionAmount)}
                            </p>
                          )}
                          {t.extraDeductionKind === 'complaint_extra_fallback' && t.extraDeductionAmount > 0 && (
                            <p className="mx-wod-entry__sub">
                              Dodatni odbitak (nema drugog naloga iste kategorije): -{formatRsd(t.extraDeductionAmount)}
                            </p>
                          )}
                          {!t.extraDeductionKind && t.note && <p className="mx-wod-entry__meta">{t.note}</p>}
                        </div>
                      ))}
                      <p>
                        <b>Ispravlja: {complaint.newTechnicianName}</b>
                        {complaint.fixDate && (
                          <span> · termin {new Date(complaint.fixDate).toLocaleDateString('sr-RS')} {complaint.fixTime || ''}</span>
                        )}
                      </p>
                      <p className="mx-wod-entry__meta">
                        {complaint.fixStatus === 'paid' && `Ispravka plaćena: ${formatRsd(complaint.fixAmount)}`}
                        {complaint.fixStatus === 'pending' && 'Isplata za ispravku čeka verifikaciju naloga'}
                        {complaint.fixStatus === 'included' && 'Ispravka ulazi u redovan obračun naloga pri verifikaciji'}
                        {complaint.fixStatus === 'not_applicable' && (complaint.fixNote || 'Isplata za ispravku nije kreirana')}
                        {complaint.fixStatus === 'paid' && complaint.fixNote && ` · ${complaint.fixNote}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {/* Istorija odlaganja */}
          {workOrder?.postponeHistory && workOrder.postponeHistory.length > 0 && (
            <Panel title="Istorija odlaganja" testId="wod-postpones">
              <ol className="mx-wod-log mx-wod-scroll">
                {workOrder.postponeHistory.map((postponement, index) => (
                  <li key={index} className="mx-wod-entry">
                    <div className="mx-wod-entry__top">
                      <span className="mx-wod-entry__at">{new Date(postponement.postponedAt).toLocaleString('sr-RS')}</span>
                      <span className="sx-tag is-warn">Odlaganje #{index + 1}</span>
                    </div>
                    <p className="mx-wod-entry__text">{postponement.comment}</p>
                    <p className="mx-wod-entry__meta sx-mono">
                      <span>{new Date(postponement.fromDate).toLocaleDateString('sr-RS')} {postponement.fromTime}</span>
                      <span className="mx-wod-faint"> → </span>
                      <span>{new Date(postponement.toDate).toLocaleDateString('sr-RS')} {postponement.toTime}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {/* Istorija otkazivanja */}
          {workOrder?.cancelHistory && workOrder.cancelHistory.length > 0 && (
            <Panel title="Istorija otkazivanja" testId="wod-cancels">
              <ol className="mx-wod-log mx-wod-scroll">
                {workOrder.cancelHistory.map((cancellation, index) => (
                  <li key={index} className="mx-wod-entry">
                    <div className="mx-wod-entry__top">
                      <span className="mx-wod-entry__at">{new Date(cancellation.canceledAt).toLocaleString('sr-RS')}</span>
                      <span className="sx-tag is-bad">Otkazivanje #{index + 1}</span>
                    </div>
                    <p className="mx-wod-entry__text">{cancellation.comment}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {/* Status korisnika (pre verifikacije) */}
          {needsVerification() && (
            <Panel title="Status korisnika" testId="wod-customer-status">
              {orderStatuses[workOrder._id] ? (
                <Note tone="ok">{orderStatuses[workOrder._id]}</Note>
              ) : (
                <button type="button" className="mx-wod-pick" onClick={() => openCustomerStatusModal(workOrder._id)}>
                  Kliknite da postavite status korisnika
                </button>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>

      {/* Traka sa radnjama: uvek fiksirana uz dno ekrana, na istom mestu (van .sx-page, jer njen kontejner vezuje fixed za sebe) */}
      <div className="mx-wod-bar" ref={barRef} data-testid="wod-actions">
        <div className="mx-wod-bar__in">
        <div className="mx-wod-bar__group">
          <State tone={statusConfig.tone} testId="wod-status">{statusConfig.label}</State>

          {workOrder?.verified && <State tone="ok">Verifikovan</State>}

          {penaltyInfo.current > 0 && (
            <span
              className="sx-tag is-bad"
              title={`Nalog vraćen ${penaltyInfo.rejectionsInCycle} ${penaltyInfo.rejectionsInCycle === 1 ? 'put' : 'puta'} - umanjenje zarade tehničaru`}
            >
              Minus {penaltyInfo.current}%
            </span>
          )}

          <Btn size="sm" icon={ArrowLeft} onClick={goBack} data-testid="wod-back">
            <span className="mx-wod-lbl-sm">Nazad</span>
          </Btn>

          <span className="mx-wod-bar__sep" aria-hidden="true" />

          {/* Promena statusa */}
          <div className="mx-wod-menuwrap" ref={statusDropdownRef}>
            <Btn size="sm" iconRight={ChevronDown} onClick={() => setShowStatusDropdown(!showStatusDropdown)} disabled={saving} aria-expanded={showStatusDropdown} className={cx('mx-wod-menubtn', showStatusDropdown && 'is-open')} data-testid="wod-status-menu">
              Promeni status
            </Btn>
            {showStatusDropdown && (
              <div className="mx-wod-menu" role="menu">
                {STATUS_OPTIONS.map(s => (
                  <button
                    type="button"
                    role="menuitem"
                    key={s.status}
                    onClick={() => {
                      handleStatusChange(s.status);
                      setShowStatusDropdown(false);
                    }}
                    disabled={saving || formData.status === s.status}
                    className={cx('mx-wod-menu__item', formData.status === s.status && 'is-current')}
                  >
                    <Led tone={STATUS_TONE[s.status]} />
                    {s.label}
                    {formData.status === s.status && (
                      <span className="mx-wod-menu__cur">trenutni</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Strelice kroz naloge za verifikaciju */}
          {isFromVerification && verificationOrderIds.length > 0 && (
            <div className="mx-wod-nav">
              <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={goToPrevVerification} disabled={!hasPrevVerification} title="Prethodni nalog" />
              <span className="mx-wod-nav__pos sx-mono">
                {currentVerificationIndex + 1}/{verificationOrderIds.length}
              </span>
              <Btn size="sm" variant="ghost" icon={ChevronRight} onClick={goToNextVerification} disabled={!hasNextVerification} title="Sledeći nalog" />
            </div>
          )}
        </div>

        <div className="mx-wod-bar__group mx-wod-bar__end">
          {/* Verifikacija (završen, a nije verifikovan) */}
          {needsVerification() && (
            <>
              <Btn size="sm" icon={UserCheck} onClick={() => openCustomerStatusModal(workOrder._id)} disabled={verifying} title="Status korisnika">
                <span className="mx-wod-lbl-lg">Status</span>
              </Btn>
              <Btn
                size="sm"
                icon={Check}
                onClick={handleVerifyOrder}
                disabled={verifying || !orderStatuses.hasOwnProperty(workOrder._id) || !orderStatuses[workOrder._id]}
                title={!orderStatuses[workOrder._id] ? 'Prvo postavite status korisnika' : 'Verifikuj'}
                data-testid="wod-verify"
              >
                <span className="mx-wod-lbl-lg">{verifying ? 'Verifikuje...' : 'Verifikuj'}</span>
              </Btn>
              <Btn size="sm" icon={Undo2} onClick={() => setReturnModal({ isOpen: true, initialComment: '', source: 'manual' })} disabled={verifying} title="Vrati nalog" data-testid="wod-return">
                <span className="mx-wod-lbl-lg">Vrati</span>
              </Btn>
              <Btn size="sm" icon={Sparkles} onClick={handleAIVerify} busy={loadingAIVerification} disabled={verifying} title="AI Verifikacija" data-testid="wod-ai">
                <span className="mx-wod-lbl-lg">AI</span>
              </Btn>
              <span className="mx-wod-bar__sep" aria-hidden="true" />
            </>
          )}

          {/* Reklamacija: dostupna na svakom nalogu koji ima tehničara */}
          {hasAssignedTechnician && (
            <Btn size="sm" icon={UserCheck} className="mx-danger" onClick={() => setShowComplaintModal(true)} disabled={saving} title="Reklamacija - dodeli nalog drugom tehničaru" data-testid="wod-complaint">
              <span className="mx-wod-lbl-sm">Reklamacija</span>
            </Btn>
          )}

          <Btn size="sm" icon={Download} onClick={generatePDF} busy={generatingPDF} disabled={saving} title="Generiši PDF">
            <span className="mx-wod-lbl-sm">PDF</span>
          </Btn>

          <Btn size="sm" variant="primary" icon={Save} onClick={handleSubmit} disabled={saving} data-testid="wod-save">
            {saving ? 'Čuva...' : 'Sačuvaj'}
          </Btn>
        </div>
        </div>
      </div>

      {/* Prozori */}

      {/* Istorija opreme korisnika */}
      <Dialog
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        size="xl"
        title="Istorija opreme korisnika"
        description={`TIS: ${workOrder?.tisId || '-'} · ${userEquipmentHistory.length} stavki`}
        testId="wod-history"
        footer={<Btn onClick={() => setShowHistoryModal(false)}>Zatvori</Btn>}
      >
        {userEquipmentHistory.length > 0 ? (
          <div className="sx-tablewrap mx-wod-histtbl">
            <table className="sx-table">
              <thead>
                <tr>
                  <th>Tip</th>
                  <th>Opis</th>
                  <th>Serijski br.</th>
                  <th>Status</th>
                  <th>Instalirano</th>
                  <th>Uklonjeno</th>
                  <th>Stanje</th>
                </tr>
              </thead>
              <tbody>
                {userEquipmentHistory.map((eq, i) => (
                  <tr key={eq.id} style={{ '--i': i }}>
                    <td className="is-head"><span className={cx('sx-tag', eq.status === 'active' ? 'is-ink' : 'is-bad')}>{eq.equipmentType?.slice(0, 3)?.toUpperCase() || '-'}</span></td>
                    <td data-label="Opis"><b className="mx-wod-strong">{eq.equipmentDescription || '-'}</b></td>
                    <td data-label="Serijski br." className="sx-mono">{eq.serialNumber}</td>
                    <td data-label="Status">
                      {eq.status === 'active' ? <Sign tone="ok">Aktivno</Sign> : <Sign tone="bad">Uklonjeno</Sign>}
                    </td>
                    <td data-label="Instalirano" className="sx-mono sx-nowrap">{eq.installedAt ? shortDate(eq.installedAt) : '-'}</td>
                    <td data-label="Uklonjeno" className="sx-mono sx-nowrap">{eq.removedAt ? shortDate(eq.removedAt) : '-'}</td>
                    <td data-label="Stanje">
                      {!eq.condition && <span className="mx-wod-faint">-</span>}
                      {eq.condition === 'working' && <Sign tone="ok">Ispravno</Sign>}
                      {eq.condition === 'defective' && <Sign tone="bad">Neispravno</Sign>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mx-wod-empty">Nema istorije opreme za ovog korisnika.</p>
        )}
      </Dialog>

      {/* Pregled slike preko celog ekrana */}
      {showFullImage && createPortal(
        <div className="sx-portal mx-wod-lb" onClick={() => setShowFullImage(null)} data-testid="wod-lightbox">
          <div className="mx-wod-lb__top">
            <span className="mx-wod-lb__count">
              <ImageIcon size={14} strokeWidth={1.9} aria-hidden="true" />
              {fullImageIndex >= 0 ? `${fullImageIndex + 1} / ${images.length}` : ''}
            </span>
            <button
              type="button"
              className="mx-wod-lb__btn"
              onClick={(e) => { e.stopPropagation(); setShowFullImage(null); }}
              title="Zatvori"
            >
              <X size={18} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>

          <div className="mx-wod-lb__stage" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && fullImageIndex > 0 && (
              <button
                type="button"
                className="mx-wod-lb__btn mx-wod-lb__nav is-prev"
                aria-label="Prethodna slika"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullImage(imageUrlOf(images[fullImageIndex - 1]));
                }}
              >
                <ChevronLeft size={20} strokeWidth={1.9} aria-hidden="true" />
              </button>
            )}
            {images.length > 1 && fullImageIndex >= 0 && fullImageIndex < images.length - 1 && (
              <button
                type="button"
                className="mx-wod-lb__btn mx-wod-lb__nav is-next"
                aria-label="Sledeća slika"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullImage(imageUrlOf(images[fullImageIndex + 1]));
                }}
              >
                <ChevronRight size={20} strokeWidth={1.9} aria-hidden="true" />
              </button>
            )}
            <img src={showFullImage} alt="Slika u punoj veličini" className="mx-wod-lb__img" onClick={(e) => e.stopPropagation()} />
          </div>

          <div className="mx-wod-lb__bottom">
            <button
              type="button"
              className="mx-wod-lb__btn mx-wod-lb__del"
              onClick={(e) => {
                e.stopPropagation();
                handleImageDelete(showFullImage);
                setShowFullImage(null);
              }}
              disabled={deletingImage}
            >
              <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
              Obriši sliku
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Vraćanje naloga: potvrda sa štikliranjem umanjenja zarade */}
      <ReturnWorkOrderModal
        isOpen={returnModal.isOpen}
        workOrderId={workOrder?._id}
        workOrder={workOrder}
        initialComment={returnModal.initialComment}
        source={returnModal.source}
        onClose={() => setReturnModal({ isOpen: false, initialComment: '', source: 'manual' })}
        onReturned={handleReturned}
      />

      {/* Reklamacija: sklanjanje tehničara i dodela ispravke drugom tehničaru */}
      <ComplaintModal
        isOpen={showComplaintModal}
        workOrder={workOrder}
        technicians={technicians}
        onClose={() => setShowComplaintModal(false)}
        onFiled={handleComplaintFiled}
      />

      {/* Promena minusa: samo superadmin (poništavanje ili drugi procenat) */}
      {canAdjustPenalty && (
        <PenaltyAdjustModal
          isOpen={showPenaltyModal}
          workOrderId={workOrder?._id}
          onClose={() => setShowPenaltyModal(false)}
          onAdjusted={handlePenaltyAdjusted}
        />
      )}

      {/* Status korisnika */}
      <Dialog
        open={customerStatusModal.isOpen}
        onClose={closeCustomerStatusModal}
        size="lg"
        title="Status korisnika"
        description="Izaberite status korisnika za ovaj radni nalog"
        testId="wod-customer-status-dialog"
        footer={<Btn onClick={closeCustomerStatusModal}>Zatvori</Btn>}
      >
        <div className="mx-wod-opts">
          {CUSTOMER_STATUSES.map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => handleCustomerStatusChange(customerStatusModal.orderId, status)}
              className={cx('mx-wod-opt', orderStatuses[customerStatusModal.orderId] === status && 'is-on')}
              aria-pressed={orderStatuses[customerStatusModal.orderId] === status}
            >
              <span>{status}</span>
              {orderStatuses[customerStatusModal.orderId] === status && (
                <Check size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </Dialog>

      {/* AI verifikacija */}
      <AIVerificationModal
        isOpen={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAIVerificationResult(null);
        }}
        result={aiVerificationResult}
        loading={loadingAIVerification}
        onAccept={handleAcceptAI}
        onReject={handleRejectAI}
      />
    </>
  );
};

export default WorkOrderDetail;
