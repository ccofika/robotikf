import React, { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { BackIcon, SaveIcon, CheckIcon, ClockIcon, BanIcon, UserIcon, AlertIcon, HistoryIcon, ImageIcon, DeleteIcon, MaterialIcon, EquipmentIcon, FileIcon, DownloadIcon, UserCheckIcon, XIcon, PhoneIcon, ChevronLeftIcon, ChevronRightIcon, BoxIcon, ToolsIcon, CalendarIcon, MapPinIcon, CommentIcon, CheckCircleIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { workOrdersAPI, techniciansAPI, userEquipmentAPI } from '../../services/api';
import { cn } from '../../utils/cn';
import axios from 'axios';
import jsPDF from 'jspdf';
// eslint-disable-next-line no-unused-vars
import html2canvas from 'html2canvas';
import AIVerificationModal from '../../components/AIVerificationModal';

const WorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
    status: ''
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
  const [verifying, setVerifying] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [adminComment, setAdminComment] = useState('');
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

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [workOrderRes, techniciansRes] = await Promise.all([
          workOrdersAPI.getOne(id),
          techniciansAPI.getAll()
        ]);

        setWorkOrder(workOrderRes.data);
        setFormData({
          date: workOrderRes.data.date ? new Date(workOrderRes.data.date).toISOString().split('T')[0] : '',
          time: workOrderRes.data.time || '09:00',
          municipality: workOrderRes.data.municipality,
          address: workOrderRes.data.address,
          type: workOrderRes.data.type,
          technicianId: workOrderRes.data.technicianId?._id || workOrderRes.data.technicianId || '',
          technician2Id: workOrderRes.data.technician2Id?._id || workOrderRes.data.technician2Id || '',
          details: workOrderRes.data.details || '',
          comment: workOrderRes.data.comment || '',
          status: workOrderRes.data.status || 'nezavrsen'
        });
        setTechnicians(techniciansRes.data);

        // Postavi slike i materijale
        setImages(workOrderRes.data.images || []);
        setMaterials(workOrderRes.data.materials || []);
        setVoiceRecordings(workOrderRes.data.voiceRecordings || []);

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
      const response = await axios.get(`${apiUrl}/api/workorders/${orderId}/evidence`);
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

    } catch (error) {
      console.error('Greška pri verifikaciji:', error);
      toast.error('Neuspešna verifikacija radnog naloga!');
    } finally {
      setVerifying(false);
    }
  };

  // Handle return as incorrect
  const handleReturnIncorrect = async () => {
    if (!workOrder || !adminComment.trim()) return;

    try {
      setVerifying(true);

      await workOrdersAPI.returnIncorrect(workOrder._id, {
        adminComment: adminComment.trim()
      });

      toast.success('Radni nalog je vraćen tehničaru!');
      setShowReturnModal(false);
      setAdminComment('');

      const response = await workOrdersAPI.getOne(id);
      setWorkOrder(response.data);
      setFormData(prev => ({ ...prev, status: response.data.status }));

    } catch (error) {
      console.error('Greška pri vraćanju radnog naloga:', error);
      toast.error('Neuspešno vraćanje radnog naloga!');
    } finally {
      setVerifying(false);
    }
  };

  // Open customer status modal
  const openCustomerStatusModal = async (orderId) => {
    if (!orderStatuses[orderId]) {
      await loadCustomerStatus(orderId);
    }
    document.body.style.overflow = 'hidden';
    setCustomerStatusModal({ isOpen: true, orderId });
  };

  // Close customer status modal
  const closeCustomerStatusModal = () => {
    document.body.style.overflow = '';
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

      const result = await axios.post(`${apiUrl}/api/workorders/${workOrder._id}/ai-verify`);

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

  // Reject AI recommendation (return to technician)
  const handleRejectAI = async () => {
    if (!aiVerificationResult) return;

    try {
      const orderId = aiVerificationResult.orderId;

      await axios.put(`${apiUrl}/api/workorders/${orderId}/return-incorrect`, {
        adminComment: `AI VERIFIKACIJA:\n\n${aiVerificationResult.reason}`
      });

      toast.info('Radni nalog je vraćen tehničaru');

      const response = await workOrdersAPI.getOne(id);
      setWorkOrder(response.data);
      setFormData(prev => ({ ...prev, status: response.data.status }));

      setShowAIModal(false);
      setAIVerificationResult(null);

    } catch (error) {
      console.error('Error rejecting AI recommendation:', error);
      toast.error('Greška pri vraćanju radnog naloga');
    }
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
        ['Drugi tehnicar:', normalizeText(technicians.find(t => t._id === formData.technician2Id)?.name) || 'Nije dodeljen']
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

      const fileName = `Radni_Nalog_${workOrder.tisId || workOrder._id}_${new Date().toISOString().split('T')[0]}.pdf`;
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
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu sliku?')) {
      return;
    }

    setDeletingImage(true);
    try {
      await axios.delete(`${apiUrl}/api/workorders/${id}/images`, {
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
    if (editingField) {
      setFormData(prev => ({ ...prev, [editingField]: editValue }));
      setEditingField(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // ─── Status Config Helper ─────────────────────────────────
  const getStatusConfig = (status) => {
    switch (status) {
      case 'zavrsen':
        return { label: 'Završen', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/15' };
      case 'odlozen':
        return { label: 'Odložen', dotColor: 'bg-amber-400', textColor: 'text-amber-400', bgColor: 'bg-amber-500/15' };
      case 'otkazan':
        return { label: 'Otkazan', dotColor: 'bg-red-400', textColor: 'text-red-400', bgColor: 'bg-red-500/15' };
      default:
        return { label: 'Nezavršen', dotColor: 'bg-blue-400', textColor: 'text-blue-400', bgColor: 'bg-blue-500/15' };
    }
  };

  // ─── Editable Field Sub-Component ─────────────────────────
  const EditableField = ({ field, value, displayValue, type = 'text', options, placeholder, rows }) => {
    const isEditing = editingField === field;

    return (
      <div className="relative group">
        <div className="flex items-start gap-1">
          <span className="text-sm text-slate-900 font-semibold leading-snug">
            {displayValue || value || <span className="text-slate-400 italic font-normal text-xs">Nije unet</span>}
          </span>
          <button
            onClick={() => startEdit(field, value)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 rounded flex-shrink-0 mt-0.5"
            title="Izmeni"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {isEditing && (
          <div ref={editRef} className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 min-w-[220px]">
            {type === 'select' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              >
                {options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
                rows={rows || 3}
                placeholder={placeholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={placeholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                onClick={confirmEdit}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                OK
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Otkaži
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Role Helpers ──────────────────────────────────────────
  const storedUser = localStorage.getItem('user');
  const currentUserRole = storedUser ? JSON.parse(storedUser).role : null;
  const canViewRecordings = currentUserRole === 'supervisor' || currentUserRole === 'superadmin';
  const canViewEditLog = currentUserRole === 'superadmin';

  // ─── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error && !workOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
        <div className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Detalji radnog naloga</h1>
            <Button
              type="secondary"
              size="small"
              prefix={<BackIcon size={16} />}
              onClick={() => {
                if (location.state?.fromUsersList) {
                  navigate(location.state.previousPath || '/users', {
                    state: {
                      fromWorkOrderDetail: true,
                      selectedUserId: location.state.selectedUserId
                    }
                  });
                } else {
                  navigate('/work-orders');
                }
              }}
            >
              Povratak na listu
            </Button>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(formData.status);
  const techName = technicians.find(t => t._id === formData.technicianId)?.name;
  const tech2Name = technicians.find(t => t._id === formData.technician2Id)?.name;

  // ─── Main Return ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white -m-6 pb-16">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm m-4 rounded-lg">{error}</div>
      )}

      {/* ── Core Info Grid (4 columns, editable) ─────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Datum / Tip */}
          <div className="px-5 sm:px-6 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarIcon size={13} className="text-slate-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Datum / Tip</span>
            </div>
            <EditableField
              field="date"
              value={formData.date}
              displayValue={formData.date ? new Date(formData.date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
              type="date"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <EditableField
                field="type"
                value={formData.type}
                displayValue={
                  <span className="text-xs text-slate-500 font-normal">{formData.type || '—'}</span>
                }
                type="text"
                placeholder="Tip instalacije"
              />
              <span className="text-xs text-slate-400">·</span>
              <EditableField
                field="time"
                value={formData.time}
                displayValue={
                  <span className="text-xs text-slate-500 font-normal">{formData.time || '—'}</span>
                }
                type="time"
              />
            </div>
          </div>

          {/* Lokacija */}
          <div className="px-5 sm:px-6 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPinIcon size={13} className="text-slate-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Lokacija</span>
            </div>
            <EditableField
              field="municipality"
              value={formData.municipality}
              type="text"
              placeholder="Opština"
            />
            <div className="mt-1">
              <EditableField
                field="address"
                value={formData.address}
                displayValue={
                  <span className="text-xs text-slate-500 font-normal">{formData.address || '—'}</span>
                }
                type="text"
                placeholder="Adresa"
              />
            </div>
          </div>

          {/* Tehničar */}
          <div className="px-5 sm:px-6 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <UserIcon size={13} className="text-slate-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Tehničar</span>
            </div>
            <EditableField
              field="technicianId"
              value={formData.technicianId}
              displayValue={techName || <span className="text-slate-400 italic text-xs font-normal">Nije dodeljen</span>}
              type="select"
              options={[
                { value: '', label: 'Odaberite tehničara' },
                ...technicians.map(t => ({ value: t._id, label: t.name }))
              ]}
            />
            <div className="mt-1">
              <EditableField
                field="technician2Id"
                value={formData.technician2Id}
                displayValue={
                  tech2Name
                    ? <span className="text-xs text-slate-500 font-normal">+ {tech2Name} <span className="text-slate-400">(pomoćni)</span></span>
                    : <span className="text-xs text-slate-400 italic font-normal">Bez pomoćnog</span>
                }
                type="select"
                options={[
                  { value: '', label: 'Nema pomoćnog' },
                  ...technicians.filter(t => t._id !== formData.technicianId).map(t => ({ value: t._id, label: t.name }))
                ]}
              />
            </div>
          </div>

          {/* Korisnik (read-only) */}
          <div className="px-5 sm:px-6 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <PhoneIcon size={13} className="text-slate-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Korisnik</span>
            </div>
            <p className="text-sm text-slate-900 font-semibold leading-snug">
              {workOrder?.userName || <span className="text-slate-400 italic font-normal">—</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1">{workOrder?.userPhone || '—'}</p>
          </div>
        </div>
      </div>

      {/* ── IDs Strip ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200">
          {workOrder?.tisId && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 uppercase font-medium">TIS</span>
                <span className="text-xs font-mono font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{workOrder.tisId}</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-slate-200" />
            </>
          )}
          {workOrder?.tisJobId && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 uppercase font-medium">Job</span>
                <span className="text-xs font-mono font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{workOrder.tisJobId}</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-slate-200" />
            </>
          )}
          {workOrder?.technology && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 uppercase font-medium">Tehnologija</span>
                <span className="text-xs font-mono text-slate-600">{workOrder.technology}</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-slate-200" />
            </>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 uppercase font-medium">Email</span>
            <span className="text-xs text-slate-600">{workOrder?.customerEmail || <span className="italic text-slate-400">Nije unet</span>}</span>
          </div>
        </div>

      {/* ── Main Content (7:5 grid) ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white">

        {/* ── LEFT COLUMN (7/12) ─────────────────────────── */}
        <div className="lg:col-span-7 lg:border-r border-slate-200">

            {/* Details + Comment */}
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2.5 flex items-center gap-1.5">
                    <CommentIcon size={13} className="text-slate-400" />
                    Detalji posla
                  </p>
                  <EditableField
                    field="details"
                    value={formData.details}
                    displayValue={
                      formData.details
                        ? <span className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">{formData.details}</span>
                        : null
                    }
                    type="textarea"
                    rows={4}
                    placeholder="Opišite detalje posla..."
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2.5">Komentar tehničara</p>
                  {formData.comment ? (
                    <div className="border-l-2 border-emerald-400 pl-3 bg-emerald-50/50 py-2.5 pr-2 rounded-r">
                      <EditableField
                        field="comment"
                        value={formData.comment}
                        displayValue={
                          <span className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">{formData.comment}</span>
                        }
                        type="textarea"
                        rows={4}
                        placeholder="Komentar..."
                      />
                    </div>
                  ) : (
                    <EditableField
                      field="comment"
                      value={formData.comment}
                      displayValue={null}
                      type="textarea"
                      rows={3}
                      placeholder="Komentar..."
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Equipment Table */}
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1.5">
                  <BoxIcon size={13} className="text-slate-400" />
                  Oprema korisnika
                </p>
                <span className="text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-medium">
                  {userEquipment.length}
                </span>
              </div>

              {loadingEquipment ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : userEquipment.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 w-16">Tip</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3">Opis</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3">Serijski br.</th>
                        <th className="text-right font-medium text-slate-500 pb-2.5 w-20">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userEquipment.map((eq) => (
                        <tr key={eq.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5 pr-3">
                            <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide">
                              {eq.equipmentType?.slice(0, 3)?.toUpperCase() || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-900 font-medium">{eq.equipmentDescription || '—'}</td>
                          <td className="py-2.5 pr-3 font-mono text-slate-500 text-xs">{eq.serialNumber}</td>
                          <td className="py-2.5 text-right text-slate-400 text-xs">
                            {eq.installedAt ? new Date(eq.installedAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Nema instalirane opreme</p>
              )}

              {userEquipmentHistory.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  <HistoryIcon size={14} />
                  Istorija opreme
                </button>
              )}
            </div>

            {/* Removed Equipment (red-themed, conditional) */}
            {removedEquipment.length > 0 && (
              <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider text-red-500 font-medium flex items-center gap-1.5">
                    <DeleteIcon size={13} className="text-red-500" />
                    Uklonjena oprema
                  </p>
                  <span className="text-xs bg-red-600 text-white px-2.5 py-0.5 rounded-full font-medium">
                    {removedEquipment.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-200">
                        <th className="text-left font-medium text-red-600 pb-2.5 pr-3 w-16">Tip</th>
                        <th className="text-left font-medium text-red-600 pb-2.5 pr-3">Serijski br.</th>
                        <th className="text-left font-medium text-red-600 pb-2.5 pr-3">Stanje</th>
                        <th className="text-right font-medium text-red-600 pb-2.5 w-20">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {removedEquipment.map((eq) => (
                        <tr key={eq.id} className="border-b border-red-50 last:border-0 bg-red-50/30">
                          <td className="py-2.5 pr-3">
                            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide">
                              {eq.equipmentType?.slice(0, 3)?.toUpperCase() || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-slate-600 text-xs">{eq.serialNumber}</td>
                          <td className="py-2.5 pr-3">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase",
                              eq.condition === 'ispravna' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}>
                              {eq.condition === 'ispravna' ? 'Ispravna' : 'Neispravna'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-400 text-xs">
                            {eq.removedAt ? new Date(eq.removedAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Materials + Images (side by side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-slate-100">
              {/* Materials */}
              <div className="px-5 sm:px-6 py-5 border-b md:border-b-0 border-slate-100">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3 flex items-center gap-1.5">
                  <ToolsIcon size={13} className="text-slate-400" />
                  Utrošeni materijali
                </p>
                {materials.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nema materijala</p>
                ) : (
                  <div className="space-y-1">
                    {materials.map((materialItem, index) => (
                      <div key={index} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-slate-600">{materialItem.material?.type || 'Nepoznat'}</span>
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                          ×{materialItem.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="px-5 sm:px-6 py-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-slate-400" />
                  Slike
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 rounded-full ml-0.5">{images.length}</span>
                </p>
                {images.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nema slika</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {images.map((imageItem, index) => {
                      const imageUrl = typeof imageItem === 'object' ? imageItem.url : imageItem;
                      const originalName = typeof imageItem === 'object' ? imageItem.originalName : null;

                      return (
                        <div key={index} className="aspect-square rounded-md bg-slate-100 overflow-hidden cursor-pointer group relative">
                          <img
                            src={imageUrl}
                            alt={originalName || `Slika ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                            onClick={() => setShowFullImage(imageUrl)}
                          />
                          <button
                            className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDelete(imageUrl);
                            }}
                            title="Obriši sliku"
                            disabled={deletingImage}
                          >
                            <DeleteIcon size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* ── RIGHT COLUMN (5/12) ────────────────────────── */}
        <div className="lg:col-span-5 border-t lg:border-t-0 border-slate-200">

            {/* Summary Counters */}
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3">Pregled</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Oprema', value: userEquipment.length.toString() },
                  { label: 'Materijali', value: materials.length.toString() },
                  { label: 'Slike', value: images.length.toString() },
                  { label: 'Snimci', value: voiceRecordings.length.toString() },
                ].map((s, i) => (
                  <div key={i} className="text-center py-2.5 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-slate-900 leading-none">{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Jobs */}
            {workOrder?.additionalJobs && (
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1.5">Dodatni poslovi</p>
                <p className="text-sm text-slate-700">{workOrder.additionalJobs}</p>
              </div>
            )}

            {/* Admin Edit Log (superadmin only) */}
            {canViewEditLog && workOrder?.adminEditLog && workOrder.adminEditLog.length > 0 && (
              <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <p className="text-xs uppercase tracking-wider text-amber-600 font-medium mb-3 flex items-center gap-1.5">
                  <HistoryIcon size={13} className="text-amber-500" />
                  Izmene opreme (Admin)
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {workOrder.adminEditLog.map((log, index) => {
                    const isAdd = log.action === 'added' || log.action === 'material_added';
                    const isMaterial = log.action === 'material_added' || log.action === 'material_removed';

                    return (
                      <div key={index} className={cn(
                        "rounded-lg p-3 border text-xs",
                        isAdd ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                      )}>
                        <div className="flex items-start gap-2">
                          <span className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold mt-0.5",
                            isAdd ? "bg-green-500" : "bg-red-500"
                          )}>
                            {isAdd ? '+' : '−'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-slate-900 font-medium">
                              {isAdd ? 'Dodao' : 'Uklonio'} — {log.technicianName}
                              {isMaterial ? (
                                <> · {log.materialType} (kol: {log.materialQuantity})</>
                              ) : (
                                <> · {log.equipmentCategory} - {log.equipmentSerialNumber}</>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {log.adminName} · {new Date(log.timestamp).toLocaleDateString('sr-RS')} {new Date(log.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Voice Recordings (supervisor/superadmin only) */}
            {canViewRecordings && (
              <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <p className="text-xs uppercase tracking-wider text-blue-500 font-medium mb-3 flex items-center gap-1.5">
                  <PhoneIcon size={13} className="text-blue-500" />
                  Snimci poziva
                </p>
                {voiceRecordings.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-3">Nema snimaka</p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {voiceRecordings.map((recording, index) => (
                      <div key={recording._id || index} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-500 text-white rounded-full p-1.5">
                              <PhoneIcon size={12} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-800">{recording.phoneNumber}</p>
                              <p className="text-[10px] text-slate-500">
                                {new Date(recording.recordedAt).toLocaleString('sr-RS')}
                              </p>
                            </div>
                          </div>
                          {recording.duration && (
                            <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              {Math.floor(recording.duration / 60)}:{String(recording.duration % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <audio
                          controls
                          className="w-full h-8 rounded"
                          preload="metadata"
                          style={{ filter: 'hue-rotate(200deg)', accentColor: '#3b82f6' }}
                        >
                          <source src={recording.url} type="audio/mpeg" />
                          <source src={recording.url} type="audio/mp4" />
                          Vaš pretraživač ne podržava audio reprodukciju.
                        </audio>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[140px]">{recording.fileName}</span>
                          {recording.fileSize && (
                            <span>{(recording.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Postpone History */}
            {workOrder?.postponeHistory && workOrder.postponeHistory.length > 0 && (
              <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <p className="text-xs uppercase tracking-wider text-amber-500 font-medium mb-3 flex items-center gap-1.5">
                  <ClockIcon size={13} className="text-amber-500" />
                  Istorija odlaganja
                </p>
                <div className="space-y-2.5 max-h-56 overflow-y-auto">
                  {workOrder.postponeHistory.map((postponement, index) => (
                    <div key={index} className="bg-amber-50 rounded-lg p-3.5 border border-amber-100/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-amber-700">
                          {new Date(postponement.postponedAt).toLocaleString('sr-RS')}
                        </span>
                        <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                          Odlaganje #{index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{postponement.comment}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 font-mono">
                        <span>{new Date(postponement.fromDate).toLocaleDateString('sr-RS')} {postponement.fromTime}</span>
                        <span className="text-amber-400">→</span>
                        <span>{new Date(postponement.toDate).toLocaleDateString('sr-RS')} {postponement.toTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancel History */}
            {workOrder?.cancelHistory && workOrder.cancelHistory.length > 0 && (
              <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <p className="text-xs uppercase tracking-wider text-red-500 font-medium mb-3 flex items-center gap-1.5">
                  <AlertIcon size={13} className="text-red-500" />
                  Istorija otkazivanja
                </p>
                <div className="space-y-2.5 max-h-56 overflow-y-auto">
                  {workOrder.cancelHistory.map((cancellation, index) => (
                    <div key={index} className="bg-red-50 rounded-lg p-3.5 border border-red-100/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-red-700">
                          {new Date(cancellation.canceledAt).toLocaleString('sr-RS')}
                        </span>
                        <span className="text-[10px] bg-red-200/70 text-red-800 px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                          Otkazivanje #{index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{cancellation.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Status */}
            {needsVerification() && (
              <div className="px-5 sm:px-6 py-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3 flex items-center gap-1.5">
                  <CheckCircleIcon size={13} className="text-emerald-500" />
                  Status korisnika
                </p>
                {orderStatuses[workOrder._id] ? (
                  <div className="bg-emerald-50 rounded-lg p-3.5 border border-emerald-100/80">
                    <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                      {orderStatuses[workOrder._id]}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => openCustomerStatusModal(workOrder._id)}
                    className="w-full bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-slate-200 border-dashed text-center transition-colors"
                  >
                    <p className="text-sm text-slate-500">Kliknite da postavite status korisnika</p>
                  </button>
                )}
              </div>
            )}

        </div>
      </div>

      {/* ── Bottom Action Bar ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 md:left-16 right-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-2.5 z-40 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center">

          {/* ─ LEFT GROUP: Status + Back + Status Dropdown ─ */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status badge */}
            <div className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg", statusConfig.bgColor)}>
              <div className={cn("w-2 h-2 rounded-full", statusConfig.dotColor)} />
              <span className={cn("text-xs font-bold uppercase tracking-wide", statusConfig.textColor)}>
                {statusConfig.label}
              </span>
            </div>

            {workOrder?.verified && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 flex-shrink-0">
                <CheckCircleIcon size={14} />
                <span className="hidden sm:inline">Verifikovan</span>
              </span>
            )}

            {/* Back */}
            <button
              onClick={() => {
                if (location.state?.fromUsersList) {
                  navigate(location.state.previousPath || '/users', {
                    state: {
                      fromWorkOrderDetail: true,
                      selectedUserId: location.state.selectedUserId
                    }
                  });
                } else {
                  navigate('/work-orders');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-all flex-shrink-0"
            >
              <BackIcon size={16} />
              <span className="hidden sm:inline">Nazad</span>
            </button>

            <div className="w-px h-7 bg-slate-200 flex-shrink-0" />

            {/* Status change dropdown */}
            <div className="relative flex-shrink-0" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
              >
                Promeni status
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", showStatusDropdown && "rotate-180")}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showStatusDropdown && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[180px] py-1">
                  {[
                    { status: 'zavrsen', label: 'Završen', icon: <CheckIcon size={15} />, color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
                    { status: 'nezavrsen', label: 'Nezavršen', icon: <ClockIcon size={15} />, color: 'text-blue-600', bg: 'hover:bg-blue-50' },
                    { status: 'odlozen', label: 'Odložen', icon: <AlertIcon size={15} />, color: 'text-amber-600', bg: 'hover:bg-amber-50' },
                    { status: 'otkazan', label: 'Otkazan', icon: <BanIcon size={15} />, color: 'text-red-600', bg: 'hover:bg-red-50' },
                  ].map(s => (
                    <button
                      key={s.status}
                      onClick={() => {
                        handleStatusChange(s.status);
                        setShowStatusDropdown(false);
                      }}
                      disabled={saving || formData.status === s.status}
                      className={cn(
                        "w-full px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors",
                        s.color, s.bg,
                        formData.status === s.status ? "font-bold bg-slate-50" : "font-medium",
                        (saving || formData.status === s.status) && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {s.icon}
                      {s.label}
                      {formData.status === s.status && (
                        <span className="ml-auto text-xs text-slate-400">trenutni</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Verification nav arrows */}
            {isFromVerification && verificationOrderIds.length > 0 && (
              <>
                <div className="w-px h-7 bg-slate-200 flex-shrink-0" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={goToPrevVerification}
                    disabled={!hasPrevVerification}
                    className={cn(
                      "p-2 rounded-lg border transition-all",
                      hasPrevVerification
                        ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                        : "border-slate-200 text-slate-300 cursor-not-allowed"
                    )}
                    title="Prethodni nalog"
                  >
                    <ChevronLeftIcon size={16} />
                  </button>
                  <span className="text-xs text-slate-500 px-0.5 min-w-[2.5rem] text-center font-mono">
                    {currentVerificationIndex + 1}/{verificationOrderIds.length}
                  </span>
                  <button
                    onClick={goToNextVerification}
                    disabled={!hasNextVerification}
                    className={cn(
                      "p-2 rounded-lg border transition-all",
                      hasNextVerification
                        ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                        : "border-slate-200 text-slate-300 cursor-not-allowed"
                    )}
                    title="Sledeći nalog"
                  >
                    <ChevronRightIcon size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ─ SPACER ─ */}
          <div className="flex-1" />

          {/* ─ RIGHT GROUP: Verification + PDF + Save ─ */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Verification buttons (left of PDF/Save) */}
            {needsVerification() && (
              <>
                <button
                  onClick={() => openCustomerStatusModal(workOrder._id)}
                  disabled={verifying}
                  className="px-3 py-2 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 flex-shrink-0"
                  title="Status korisnika"
                >
                  <UserCheckIcon size={16} />
                  <span className="hidden lg:inline">Status</span>
                </button>
                <button
                  onClick={handleVerifyOrder}
                  disabled={verifying || !orderStatuses.hasOwnProperty(workOrder._id) || !orderStatuses[workOrder._id]}
                  className="px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 flex-shrink-0"
                  title={!orderStatuses[workOrder._id] ? 'Prvo postavite status korisnika' : 'Verifikuj'}
                >
                  <CheckIcon size={16} />
                  <span className="hidden lg:inline">{verifying ? 'Verifikuje...' : 'Verifikuj'}</span>
                </button>
                <button
                  onClick={() => setShowReturnModal(true)}
                  disabled={verifying}
                  className="px-3 py-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 flex-shrink-0"
                  title="Vrati nalog"
                >
                  <AlertIcon size={16} />
                  <span className="hidden lg:inline">Vrati</span>
                </button>
                <button
                  onClick={handleAIVerify}
                  disabled={loadingAIVerification || verifying}
                  className="px-3 py-2 text-sm text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 flex-shrink-0"
                  title="AI Verifikacija"
                >
                  {loadingAIVerification ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600"></div>
                  ) : (
                    <CheckIcon size={16} />
                  )}
                  <span className="hidden lg:inline">AI</span>
                </button>
                <div className="w-px h-7 bg-slate-200 flex-shrink-0" />
              </>
            )}

            {/* PDF */}
            <button
              onClick={generatePDF}
              disabled={generatingPDF || saving}
              className="px-3 py-2 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 flex-shrink-0"
              title="Generiši PDF"
            >
              {generatingPDF ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
              ) : (
                <DownloadIcon size={16} />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Save */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-60 flex-shrink-0"
            >
              <SaveIcon size={16} />
              {saving ? 'Čuva...' : 'Sačuvaj'}
            </button>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ██ MODALS (unchanged) ██████████████████████████████ */}
      {/* ══════════════════════════════════════════════════════ */}

      {/* Equipment History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full flex flex-col" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-900 text-white rounded-lg p-1.5">
                  <HistoryIcon size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Istorija opreme korisnika</h3>
                  <p className="text-[10px] text-slate-400 font-mono">TIS: {workOrder?.tisId || '—'} · {userEquipmentHistory.length} stavki</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4">
              {userEquipmentHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 text-[10px] uppercase tracking-wider">Tip</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 text-[10px] uppercase tracking-wider">Opis</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 text-[10px] uppercase tracking-wider">Serijski br.</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 text-[10px] uppercase tracking-wider">Status</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 text-[10px] uppercase tracking-wider">Instalirano</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 pr-3 text-[10px] uppercase tracking-wider">Uklonjeno</th>
                        <th className="text-left font-medium text-slate-500 pb-2.5 text-[10px] uppercase tracking-wider">Stanje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userEquipmentHistory.map(eq => (
                        <tr key={eq.id} className={cn(
                          "border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/80",
                          eq.status === 'removed' ? 'bg-red-50/40' : ''
                        )}>
                          <td className="py-2.5 pr-3">
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide text-white",
                              eq.status === 'active' ? 'bg-slate-900' : 'bg-red-600'
                            )}>
                              {eq.equipmentType?.slice(0, 3)?.toUpperCase() || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-900 font-medium">{eq.equipmentDescription || '—'}</td>
                          <td className="py-2.5 pr-3">
                            <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{eq.serialNumber}</span>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase",
                              eq.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            )}>
                              {eq.status === 'active' ? 'Aktivno' : 'Uklonjeno'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-500 font-mono text-[11px]">{eq.installedAt ? new Date(eq.installedAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</td>
                          <td className="py-2.5 pr-3 text-slate-500 font-mono text-[11px]">{eq.removedAt ? new Date(eq.removedAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</td>
                          <td className="py-2.5">
                            {!eq.condition && <span className="text-slate-400">—</span>}
                            {eq.condition === 'working' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-green-100 text-green-700">Ispravno</span>
                            )}
                            {eq.condition === 'defective' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-red-100 text-red-700">Neispravno</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">Nema istorije opreme za ovog korisnika.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showFullImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setShowFullImage(null)}
        >
          {/* Top bar with info and close */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-2">
              <ImageIcon size={14} className="text-white/70" />
              <span className="text-xs text-white/70 font-mono">
                {(() => {
                  const idx = images.findIndex(img => (typeof img === 'object' ? img.url : img) === showFullImage);
                  return idx >= 0 ? `${idx + 1} / ${images.length}` : '';
                })()}
              </span>
            </div>
            <button
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowFullImage(null); }}
              title="Zatvori"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Image */}
          <div
            className="relative flex items-center justify-center w-full h-full p-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev/Next arrows for navigating images */}
            {(() => {
              const currentIdx = images.findIndex(img => (typeof img === 'object' ? img.url : img) === showFullImage);
              return (
                <>
                  {images.length > 1 && currentIdx > 0 && (
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevImg = images[currentIdx - 1];
                        setShowFullImage(typeof prevImg === 'object' ? prevImg.url : prevImg);
                      }}
                    >
                      <ChevronLeftIcon size={20} />
                    </button>
                  )}
                  {images.length > 1 && currentIdx >= 0 && currentIdx < images.length - 1 && (
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextImg = images[currentIdx + 1];
                        setShowFullImage(typeof nextImg === 'object' ? nextImg.url : nextImg);
                      }}
                    >
                      <ChevronRightIcon size={20} />
                    </button>
                  )}
                </>
              );
            })()}

            <img
              src={showFullImage}
              alt="Slika u punoj veličini"
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              style={{
                maxWidth: 'calc(100vw - 6rem)',
                maxHeight: 'calc(100vh - 6rem)',
                width: 'auto',
                height: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Bottom bar with delete */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-4 py-3 bg-gradient-to-t from-black/60 to-transparent z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImageDelete(showFullImage);
                setShowFullImage(null);
              }}
              disabled={deletingImage}
              className="px-4 py-2 text-xs text-red-400 hover:text-red-300 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <DeleteIcon size={12} />
              Obriši sliku
            </button>
          </div>
        </div>
      )}

      {/* Return Work Order Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Vraćanje radnog naloga</h3>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setAdminComment('');
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XIcon size={20} className="text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Unesite razlog vraćanja radnog naloga tehničaru
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Razlog vraćanja radnog naloga..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                rows={4}
              />
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <Button
                type="secondary"
                size="medium"
                onClick={() => {
                  setShowReturnModal(false);
                  setAdminComment('');
                }}
                className="flex-1"
                disabled={verifying}
              >
                Odustani
              </Button>
              <Button
                type="primary"
                size="medium"
                onClick={handleReturnIncorrect}
                className="flex-1"
                disabled={verifying || !adminComment.trim()}
              >
                {verifying ? 'Vraćanje...' : 'Vrati nalog'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Status Modal */}
      {customerStatusModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) closeCustomerStatusModal(); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Status korisnika</h3>
                <button
                  onClick={closeCustomerStatusModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XIcon size={20} className="text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Izaberite status korisnika za ovaj radni nalog
              </p>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {[
                'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme)',
                'Priključenje korisnika na HFC KDS mreža u privatnim kućama sa instalacijom CPE opreme (izrada instalacije od PM-a do korisnika sa instalacijom kompletne CPE opreme)',
                'Priključenje korisnika na GPON mrežu u privatnim kućama (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme)',
                'Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme)',
                'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji sa montažnim radovima',
                'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji bez montažnih radova',
                'Priključenje novog korisnika WiFi tehnologijom (postavljanje nosača antene, postavljanje i usmeravanje antene ka baznoj stanici sa postavljanjem napajanja za antenu, postavljanje rutera i jednog uređaja za televiziju) - ASTRA TELEKOM',
                'Dodavanje drugog uređaja ili dorada - ASTRA TELEKOM',
                'Demontaža postojeće opreme kod korisnika (po korisniku) - ASTRA TELEKOM',
                'Intervencija kod korisnika - ASTRA TELEKOM',
                'Priključenje korisnika GPON tehnologijom (povezivanje svih uređaja u okviru paketa) - ASTRA TELEKOM'
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => handleCustomerStatusChange(customerStatusModal.orderId, status)}
                  className={cn(
                    "w-full p-4 text-left rounded-lg border-2 transition-all hover:shadow-md",
                    orderStatuses[customerStatusModal.orderId] === status
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 text-sm">{status}</span>
                    {orderStatuses[customerStatusModal.orderId] === status && (
                      <CheckIcon size={18} className="text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3 flex-shrink-0">
              <Button
                type="secondary"
                size="medium"
                onClick={closeCustomerStatusModal}
                className="flex-1"
              >
                Zatvori
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Verification Modal */}
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
    </div>
  );
};

export default WorkOrderDetail;
