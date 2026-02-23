import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BoxIcon, ToolsIcon, UserIcon, LockIcon, CheckIcon, EditIcon, PhoneIcon, DeleteIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { techniciansAPI, reviewsAPI } from '../../services/api';

// SVG Icons
const MicIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" x2="12" y1="19" y2="22"></line>
  </svg>
);

const CalendarIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
    <line x1="16" x2="16" y1="2" y2="6"></line>
    <line x1="8" x2="8" y1="2" y2="6"></line>
    <line x1="3" x2="21" y1="10" y2="10"></line>
  </svg>
);

const PlayIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const ExternalLinkIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" x2="21" y1="14" y2="3"></line>
  </svg>
);

const TechnicianDetail = () => {
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [newGmail, setNewGmail] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const { id } = useParams();

  // Call Recordings Modal State
  const [showRecordingsModal, setShowRecordingsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [includeWorkOrders, setIncludeWorkOrders] = useState(true);
  const [recordingDates, setRecordingDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef(null);
  
  // Pagination for equipment
  const [equipmentPage, setEquipmentPage] = useState(1);
  const equipmentPerPage = 10;
  
  // Pagination for materials
  const [materialsPage, setMaterialsPage] = useState(1);
  const materialsPerPage = 10;

  // Reviews state
  const [reviewStats, setReviewStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTechnicianData();
    fetchDocuments();
    fetchReviewStats();
    fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  const fetchTechnicianData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getOne(id);
      setTechnician(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
      setError('Tehničar nije pronađen ili je došlo do greške pri učitavanju.');
      toast.error('Greška pri učitavanju tehničara!');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REVIEW FUNCTIONS
  // ============================================================

  const fetchReviewStats = async () => {
    try {
      const response = await reviewsAPI.getTechnicianStats(id);
      setReviewStats(response.data);
    } catch (error) {
      console.error('[Reviews] Greška pri učitavanju statistike:', error);
    }
  };

  const fetchReviews = async (page) => {
    setReviewsLoading(true);
    try {
      const response = await reviewsAPI.getTechnicianReviews(id, page, 5);
      setReviews(response.data.reviews);
      setReviewsTotal(response.data.total);
      setReviewsPage(page);
    } catch (error) {
      console.error('[Reviews] Greška pri učitavanju review-ova:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu ocenu?')) return;
    try {
      await reviewsAPI.deleteReview(reviewId);
      toast.success('Ocena je uspešno obrisana');
      fetchReviewStats();
      fetchReviews(reviewsPage);
    } catch (error) {
      console.error('[Reviews] Greška pri brisanju:', error);
      toast.error('Greška pri brisanju ocene');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < rating ? '#f59e0b' : 'none'} stroke={i < rating ? '#f59e0b' : '#d1d5db'} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    ));
  };

  // ============================================================
  // DOCUMENT FUNCTIONS
  // ============================================================

  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const response = await techniciansAPI.getDocuments(id);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Greška pri dohvatanju dokumenata:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploadingDocument(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentName', file.name);

        const response = await techniciansAPI.uploadDocument(id, formData);
        setDocuments(prev => [...prev, response.data.document]);
        successCount++;
      } catch (error) {
        console.error('Greška pri upload-u dokumenta:', error);
        toast.error(`Greška pri upload-u: ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} dokument(a) uspešno otpremljeno`);
    }
    setUploadingDocument(false);
  };

  const handleDeleteDocument = async (documentId, documentName) => {
    if (!window.confirm(`Da li ste sigurni da želite da obrišete "${documentName}"?`)) return;

    const originalDocuments = [...documents];
    setDocuments(prev => prev.filter(d => d._id !== documentId));

    try {
      await techniciansAPI.deleteDocument(id, documentId);
      toast.success('Dokument uspešno obrisan');
    } catch (error) {
      console.error('Greška pri brisanju dokumenta:', error);
      toast.error('Greška pri brisanju dokumenta');
      setDocuments(originalDocuments);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleDocumentUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
    if (fileType?.includes('image')) return '🖼️';
    return '📎';
  };

  // Da li se fajl može prikazati u pregledaču
  const isPreviewable = (doc) => {
    const type = doc.fileType?.toLowerCase() || '';
    if (type.includes('image')) return true;
    if (type.includes('pdf')) return true;
    return false;
  };

  const getPreviewType = (doc) => {
    const type = doc.fileType?.toLowerCase() || '';
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'pdf';
    return null;
  };

  // Generiši proxy URL za dokument (zaobilazi Cloudinary 401)
  const getDocViewUrl = (doc) => techniciansAPI.getDocumentViewUrl(id, doc._id);
  const getDocDownloadUrl = (doc) => techniciansAPI.getDocumentDownloadUrl(id, doc._id);

  // Otvara preview modal
  const openPreview = (doc) => {
    setPreviewDoc(doc);
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  // Download sa pravim imenom fajla - koristi backend proxy
  const handleDownloadDocument = (doc) => {
    const a = document.createElement('a');
    a.href = getDocDownloadUrl(doc);
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleChangePassword = async () => {
    // Validacija
    if (newPassword !== confirmedPassword) {
      toast.error('Lozinke se ne podudaraju!');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 karaktera!');
      return;
    }
    
    try {
      // Poziv API-ja za promenu lozinke preko update endpointa
      await techniciansAPI.update(id, { password: newPassword });
      toast.success('Lozinka je uspešno promenjena!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmedPassword('');
    } catch (error) {
      console.error('Greška pri promeni lozinke:', error);
      toast.error('Neuspešna promena lozinke. Pokušajte ponovo.');
    }
  };

  const handleUpdateGmail = async () => {
    // Validacija email formata
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newGmail && !emailRegex.test(newGmail)) {
      toast.error('Unesite validnu Gmail adresu!');
      return;
    }

    try {
      await techniciansAPI.update(id, { gmail: newGmail });
      toast.success('Gmail adresa je uspešno ažurirana!');
      setShowGmailModal(false);
      setNewGmail('');
      // Refresh technician data to show updated gmail
      await fetchTechnicianData();
    } catch (error) {
      console.error('Greška pri ažuriranju Gmail adrese:', error);
      toast.error('Neuspešno ažuriranje Gmail adrese. Pokušajte ponovo.');
    }
  };

  const handleUpdatePhoneNumber = async () => {
    // Validacija phone number formata (opciono, može biti prazan)
    if (newPhoneNumber) {
      // Proveri da li sadrži samo brojeve, +, -, (, ), razmake
      // eslint-disable-next-line no-useless-escape
      const phoneRegex = /^[\d\+\-\(\)\s]+$/;
      if (!phoneRegex.test(newPhoneNumber)) {
        toast.error('Unesite validan broj telefona!');
        return;
      }

      // Proveri minimalno 9 cifara (bez non-digit karaktera)
      const digitsOnly = newPhoneNumber.replace(/\D/g, '');
      if (digitsOnly.length < 9) {
        toast.error('Broj telefona mora imati najmanje 9 cifara!');
        return;
      }
    }

    try {
      await techniciansAPI.update(id, { phoneNumber: newPhoneNumber });
      toast.success('Broj telefona je uspešno ažuriran!');
      setShowPhoneModal(false);
      setNewPhoneNumber('');
      // Refresh technician data to show updated phone number
      await fetchTechnicianData();
    } catch (error) {
      console.error('Greška pri ažuriranju broja telefona:', error);
      toast.error('Neuspešno ažuriranje broja telefona. Pokušajte ponovo.');
    }
  };

  // ============================================================
  // CALL RECORDINGS FUNCTIONS
  // ============================================================

  const fetchRecordings = async (date) => {
    setRecordingsLoading(true);
    try {
      const response = await techniciansAPI.getRecordings(id, date, includeWorkOrders ? 'true' : 'false');
      setRecordings(response.data.recordings || []);
    } catch (error) {
      console.error('Greška pri dohvatanju snimaka:', error);
      toast.error('Greška pri dohvatanju snimaka');
      setRecordings([]);
    } finally {
      setRecordingsLoading(false);
    }
  };

  const fetchRecordingDates = async (month, year) => {
    try {
      const response = await techniciansAPI.getRecordingDates(id, month, year);
      setRecordingDates(response.data.dates || []);
    } catch (error) {
      console.error('Greška pri dohvatanju datuma:', error);
      setRecordingDates([]);
    }
  };

  const handleOpenRecordingsModal = () => {
    setShowRecordingsModal(true);
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    fetchRecordings(today.toISOString().split('T')[0]);
    fetchRecordingDates(today.getMonth() + 1, today.getFullYear());
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchRecordings(date);
  };

  const handleMonthChange = (direction) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    fetchRecordingDates(newMonth, newYear);
  };

  const handlePlayRecording = (recording) => {
    if (playingRecordingId === recording._id) {
      // Pause if already playing
      audioRef.current?.pause();
      setPlayingRecordingId(null);
    } else {
      // Play new recording
      if (audioRef.current) {
        setAudioCurrentTime(0);
        setAudioDuration(0);
        audioRef.current.src = recording.url;
        audioRef.current.play();
        setPlayingRecordingId(recording._id);
      }
    }
  };

  const handleAudioEnded = () => {
    setPlayingRecordingId(null);
    setAudioCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e, recording) => {
    if (audioRef.current && playingRecordingId === recording._id) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  };

  const formatCurrentTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const recordingInfo = recordingDates.find(d => d.date === dateStr);
      days.push({
        day,
        date: dateStr,
        hasRecordings: !!recordingInfo,
        totalCount: recordingInfo?.totalCount || 0,
        linkedCount: recordingInfo?.linkedCount || 0,
        unlinkedCount: recordingInfo?.unlinkedCount || 0
      });
    }

    return days;
  };

  useEffect(() => {
    if (showRecordingsModal) {
      fetchRecordings(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeWorkOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center space-x-3 text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Učitavanje tehničara...</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        {/* Modern Header */}
        <div className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <UserIcon size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Detalji tehničara</h1>
                <p className="text-slate-600 mt-1">Pregled podataka tehničara</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/technicians">
                <Button 
                  type="secondary"
                  size="medium"
                  prefix={<BackIcon size={16} />}
                >
                  Povratak na listu
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UserIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Detalji tehničara</h1>
              <p className="text-slate-600 mt-1">Pregled podataka tehničara</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/technicians">
              <Button 
                type="secondary"
                size="medium"
                prefix={<BackIcon size={16} />}
              >
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Technician Profile Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-xl">
              <UserIcon size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-bold text-slate-900">{technician.name}</h2>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  technician.isActive === false
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    technician.isActive === false ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  {technician.isActive === false ? 'Neaktivan' : 'Aktivan'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">ID:</span> {technician.id}</p>
                <p><span className="font-medium">Gmail:</span> {technician.gmail || 'Nije uneto'}</p>
                <p><span className="font-medium">Broj telefona:</span> {technician.phoneNumber || 'Nije uneto'}</p>
                <p><span className="font-medium">Dodat:</span> {new Date(technician.createdAt).toLocaleDateString('sr-RS')}</p>
                {technician.employedUntil && (
                  <p>
                    <span className="font-medium">Zaposlen do:</span>{' '}
                    <span className={(() => {
                      const days = Math.ceil((new Date(technician.employedUntil) - new Date()) / (1000 * 60 * 60 * 24));
                      if (days < 0) return 'text-red-600 font-semibold';
                      if (days <= 30) return 'text-amber-600 font-semibold';
                      return '';
                    })()}>
                      {new Date(technician.employedUntil).toLocaleDateString('sr-RS')}
                      {(() => {
                        const days = Math.ceil((new Date(technician.employedUntil) - new Date()) / (1000 * 60 * 60 * 24));
                        if (days < 0) return ' (ISTEKAO)';
                        if (days <= 30) return ` (${days} dana)`;
                        return '';
                      })()}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                type="tertiary"
                size="medium"
                onClick={() => {
                  setNewGmail(technician.gmail || '');
                  setShowGmailModal(true);
                }}
                prefix={<EditIcon size={16} />}
              >
                Uredi Gmail
              </Button>
              <Button
                type="tertiary"
                size="medium"
                onClick={() => {
                  setNewPhoneNumber(technician.phoneNumber || '');
                  setShowPhoneModal(true);
                }}
                prefix={<PhoneIcon size={16} />}
              >
                Uredi telefon
              </Button>
              <Button
                type="tertiary"
                size="medium"
                onClick={() => setShowPasswordModal(true)}
                prefix={<LockIcon size={16} />}
              >
                Promeni lozinku
              </Button>
              <Button
                type="primary"
                size="medium"
                onClick={handleOpenRecordingsModal}
                prefix={<MicIcon size={16} />}
              >
                Snimci poziva
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BoxIcon size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Zadužena oprema</h2>
            </div>
            <Link to={`/technicians/${id}/assign-equipment`}>
              <Button 
                type="primary"
                size="medium"
                prefix={<BoxIcon size={16} />}
              >
                Zaduži/razduži opremu
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Kategorija
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Opis
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Serijski broj
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const equipmentItems = technician.equipment || [];
                const startIndex = (equipmentPage - 1) * equipmentPerPage;
                const endIndex = startIndex + equipmentPerPage;
                const currentEquipmentItems = equipmentItems.slice(startIndex, endIndex);
                
                if (equipmentItems.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <BoxIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema zadužene opreme</p>
                          <p className="text-xs">Dodajte opremu koristeći dugme iznad</p>
                        </div>
                      </td>
                    </tr>
                  );
                }
                
                return currentEquipmentItems.map((item, index) => (
                  <tr key={item.serialNumber} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                      {item.serialNumber}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        type={item.status === 'available' ? 'secondary' : item.status === 'assigned' ? 'primary' : 'tertiary'}
                        size="small"
                        className="text-xs capitalize"
                      >
                        {item.status === 'available' ? 'Dostupno' : 
                         item.status === 'assigned' ? 'Zaduženo' :
                         item.status === 'installed' ? 'Instalirano' :
                         item.status === 'defective' ? 'Oštećeno' : item.status}
                      </Button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Equipment Pagination */}
        {technician.equipment && technician.equipment.length > equipmentPerPage && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Prikazano {((equipmentPage - 1) * equipmentPerPage) + 1} - {Math.min(equipmentPage * equipmentPerPage, technician.equipment.length)} od {technician.equipment.length} stavki
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(1)}
                  disabled={equipmentPage === 1}
                >
                  &laquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(equipmentPage - 1)}
                  disabled={equipmentPage === 1}
                >
                  &lsaquo;
                </Button>
                
                {Array.from({ length: Math.ceil(technician.equipment.length / equipmentPerPage) }, (_, i) => i + 1)
                  .filter(number => {
                    const totalPages = Math.ceil(technician.equipment.length / equipmentPerPage);
                    return (
                      number === 1 ||
                      number === totalPages ||
                      Math.abs(number - equipmentPage) <= 1
                    );
                  })
                  .map(number => (
                    <Button
                      key={number}
                      type={equipmentPage === number ? "primary" : "tertiary"}
                      size="small"
                      onClick={() => setEquipmentPage(number)}
                    >
                      {number}
                    </Button>
                  ))}
                  
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(equipmentPage + 1)}
                  disabled={equipmentPage === Math.ceil(technician.equipment.length / equipmentPerPage)}
                >
                  &rsaquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(Math.ceil(technician.equipment.length / equipmentPerPage))}
                  disabled={equipmentPage === Math.ceil(technician.equipment.length / equipmentPerPage)}
                >
                  &raquo;
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Materials Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ToolsIcon size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Zaduženi materijali</h2>
            </div>
            <Link to={`/technicians/${id}/assign-material`}>
              <Button 
                type="primary"
                size="medium"
                prefix={<ToolsIcon size={16} />}
              >
                Zaduži/razduži materijal
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Vrsta
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Količina
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const materialItems = technician.materials || [];
                const startIndex = (materialsPage - 1) * materialsPerPage;
                const endIndex = startIndex + materialsPerPage;
                const currentMaterialItems = materialItems.slice(startIndex, endIndex);
                
                if (materialItems.length === 0) {
                  return (
                    <tr>
                      <td colSpan="2" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <ToolsIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema zaduženih materijala</p>
                          <p className="text-xs">Dodajte materijale koristeći dugme iznad</p>
                        </div>
                      </td>
                    </tr>
                  );
                }
                
                return currentMaterialItems.map((item, index) => (
                  <tr key={index} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        type="secondary"
                        size="small"
                        className="text-xs min-w-[60px] justify-center"
                      >
                        {item.quantity}
                      </Button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Materials Pagination */}
        {technician.materials && technician.materials.length > materialsPerPage && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Prikazano {((materialsPage - 1) * materialsPerPage) + 1} - {Math.min(materialsPage * materialsPerPage, technician.materials.length)} od {technician.materials.length} stavki
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(1)}
                  disabled={materialsPage === 1}
                >
                  &laquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(materialsPage - 1)}
                  disabled={materialsPage === 1}
                >
                  &lsaquo;
                </Button>
                
                {Array.from({ length: Math.ceil(technician.materials.length / materialsPerPage) }, (_, i) => i + 1)
                  .filter(number => {
                    const totalPages = Math.ceil(technician.materials.length / materialsPerPage);
                    return (
                      number === 1 ||
                      number === totalPages ||
                      Math.abs(number - materialsPage) <= 1
                    );
                  })
                  .map(number => (
                    <Button
                      key={number}
                      type={materialsPage === number ? "primary" : "tertiary"}
                      size="small"
                      onClick={() => setMaterialsPage(number)}
                    >
                      {number}
                    </Button>
                  ))}
                  
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(materialsPage + 1)}
                  disabled={materialsPage === Math.ceil(technician.materials.length / materialsPerPage)}
                >
                  &rsaquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(Math.ceil(technician.materials.length / materialsPerPage))}
                  disabled={materialsPage === Math.ceil(technician.materials.length / materialsPerPage)}
                >
                  &raquo;
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Documents Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" x2="8" y1="13" y2="13"></line>
                <line x1="16" x2="8" y1="17" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Dokumentacija</h2>
              <span className="text-sm text-slate-500">({documents.length})</span>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleDocumentUpload(Array.from(e.target.files))}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                className="hidden"
              />
              <Button
                type="primary"
                size="medium"
                onClick={() => fileInputRef.current?.click()}
                loading={uploadingDocument}
                prefix={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" x2="12" y1="3" y2="15"></line>
                  </svg>
                }
              >
                Otpremi dokument
              </Button>
            </div>
          </div>
        </div>

        {/* Drag and drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`transition-all ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''}`}
        >
          {documentsLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-slate-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Učitavanje dokumenata...</span>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div
              className="px-6 py-12 text-center text-slate-500 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center space-y-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p className="text-sm font-medium">Nema dokumenata</p>
                <p className="text-xs">Kliknite ili prevucite fajlove za otpremanje<br/>(PDF, Word, Excel, slike)</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                >
                  <div
                    className="flex items-center space-x-4 flex-1 min-w-0 cursor-pointer"
                    onClick={() => isPreviewable(doc) ? openPreview(doc) : handleDownloadDocument(doc)}
                  >
                    <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-slate-500">
                          {formatFileSize(doc.fileSize)}
                        </span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-500">
                          {new Date(doc.uploadedAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPreviewable(doc) && (
                      <button
                        onClick={() => openPreview(doc)}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Pregledaj"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Preuzmi"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" x2="12" y1="15" y2="3"></line>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc._id, doc.name)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Obriši dokument"
                    >
                      <DeleteIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-xl">{getFileIcon(previewDoc.fileType)}</span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 truncate">{previewDoc.name}</h2>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(previewDoc.fileSize)} &middot; {new Date(previewDoc.uploadedAt).toLocaleDateString('sr-RS')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleDownloadDocument(previewDoc)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" x2="12" y1="15" y2="3"></line>
                  </svg>
                  Preuzmi
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18"></line>
                    <line x1="6" x2="18" y1="6" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
              {getPreviewType(previewDoc) === 'image' ? (
                <img
                  src={getDocViewUrl(previewDoc)}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[80vh] object-contain p-4"
                />
              ) : getPreviewType(previewDoc) === 'pdf' ? (
                <iframe
                  src={getDocViewUrl(previewDoc)}
                  title={previewDoc.name}
                  className="w-full h-full min-h-[80vh] border-0"
                />
              ) : (
                <div className="text-center p-12 text-slate-500">
                  <p className="text-lg font-medium mb-2">Pregled nije dostupan</p>
                  <button
                    onClick={() => handleDownloadDocument(previewDoc)}
                    className="text-blue-600 hover:underline"
                  >
                    Preuzmi dokument
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <h2 className="text-lg font-bold text-slate-900">Ocene korisnika</h2>
            {reviewStats && reviewStats.totalReviews > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {reviewStats.totalReviews}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Stats Overview */}
          {reviewStats && reviewStats.totalReviews > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {renderStars(Math.round(reviewStats.avgProfessionalism))}
                  </div>
                  <div className="text-2xl font-bold text-amber-700">{reviewStats.avgProfessionalism}</div>
                  <div className="text-xs text-slate-500 mt-1">Profesionalnost</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {renderStars(Math.round(reviewStats.avgServiceQuality))}
                  </div>
                  <div className="text-2xl font-bold text-blue-700">{reviewStats.avgServiceQuality}</div>
                  <div className="text-xs text-slate-500 mt-1">Kvalitet servisa</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{reviewStats.avgNps}</div>
                  <div className="text-xs text-slate-500 mt-1">NPS Score (0-10)</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">{reviewStats.onTimePercent}%</div>
                  <div className="text-xs text-slate-500 mt-1">Tačnost dolaska</div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{reviewStats.cleanInstallationPercent}%</div>
                    <div className="text-xs text-slate-500">Uredna instalacija</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{reviewStats.fullExplanationPercent}%</div>
                    <div className="text-xs text-slate-500">Jasno objašnjenje</div>
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Pojedinačne ocene</h3>
              {reviewsLoading ? (
                <div className="text-center py-4 text-slate-400">Učitavanje...</div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review._id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{review.customerName || 'Anonimni korisnik'}</span>
                            <span className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString('sr-RS')}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {renderStars(review.professionalism)}
                            <span className="text-xs text-slate-500 ml-1">Profesionalnost</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Obriši ocenu"
                        >
                          <DeleteIcon size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="bg-slate-100 rounded px-2 py-1">
                          <span className="text-slate-500">Termin:</span>{' '}
                          <span className="font-medium text-slate-700">{review.onTime}</span>
                        </div>
                        <div className="bg-slate-100 rounded px-2 py-1">
                          <span className="text-slate-500">Urednost:</span>{' '}
                          <span className="font-medium text-slate-700">{review.cleanInstallation}</span>
                        </div>
                        <div className="bg-slate-100 rounded px-2 py-1">
                          <span className="text-slate-500">Servis:</span>{' '}
                          <span className="font-medium text-slate-700">{review.serviceQuality}/5</span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-600 mt-2 italic bg-slate-50 rounded-lg p-2">"{review.comment}"</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">NPS:</span>
                        <span className={`text-xs font-bold ${review.npsScore >= 9 ? 'text-green-600' : review.npsScore >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                          {review.npsScore}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {reviewsTotal > 5 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => fetchReviews(reviewsPage - 1)}
                    disabled={reviewsPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Prethodna
                  </button>
                  <span className="text-sm text-slate-500">
                    {reviewsPage} / {Math.ceil(reviewsTotal / 5)}
                  </span>
                  <button
                    onClick={() => fetchReviews(reviewsPage + 1)}
                    disabled={reviewsPage >= Math.ceil(reviewsTotal / 5)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Sledeća
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mx-auto mb-3">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <p className="text-slate-400 text-sm">Nema ocena za ovog tehničara</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Promeni lozinku za {technician.name}</h2>
              <Button
                type="tertiary"
                size="small"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmedPassword('');
                }}
                className="!p-2"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Nova lozinka:
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Unesite novu lozinku"
                    className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmedPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Potvrdite lozinku:
                  </label>
                  <input
                    type="password"
                    id="confirmedPassword"
                    value={confirmedPassword}
                    onChange={(e) => setConfirmedPassword(e.target.value)}
                    placeholder="Potvrdite novu lozinku"
                    className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                <Button 
                  type="secondary"
                  size="medium"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmedPassword('');
                  }}
                >
                  Odustani
                </Button>
                <Button 
                  type="primary"
                  size="medium"
                  onClick={handleChangePassword}
                  disabled={!newPassword || !confirmedPassword}
                  prefix={<CheckIcon size={16} />}
                >
                  Sačuvaj
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Change Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Uredi Gmail za {technician.name}</h2>
              <Button
                type="tertiary"
                size="small"
                onClick={() => {
                  setShowGmailModal(false);
                  setNewGmail('');
                }}
                className="!p-2"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="newGmail" className="block text-sm font-medium text-slate-700 mb-2">
                    Gmail adresa:
                  </label>
                  <input
                    type="email"
                    id="newGmail"
                    value={newGmail}
                    onChange={(e) => setNewGmail(e.target.value)}
                    placeholder="Unesite Gmail adresu (npr. ime@gmail.com)"
                    className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                <Button 
                  type="secondary"
                  size="medium"
                  onClick={() => {
                    setShowGmailModal(false);
                    setNewGmail('');
                  }}
                >
                  Odustani
                </Button>
                <Button
                  type="primary"
                  size="medium"
                  onClick={handleUpdateGmail}
                  prefix={<CheckIcon size={16} />}
                >
                  Sačuvaj
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Number Change Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Uredi broj telefona za {technician.name}</h2>
              <Button
                type="tertiary"
                size="small"
                onClick={() => {
                  setShowPhoneModal(false);
                  setNewPhoneNumber('');
                }}
                className="!p-2"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPhoneNumber" className="block text-sm font-medium text-slate-700 mb-2">
                    Broj telefona:
                  </label>
                  <input
                    type="tel"
                    id="newPhoneNumber"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    placeholder="Unesite broj telefona (npr. +381641234567 ili 0641234567)"
                    className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Broj telefona se koristi za automatsko povezivanje snimljenih poziva sa radnim nalozima.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                <Button
                  type="secondary"
                  size="medium"
                  onClick={() => {
                    setShowPhoneModal(false);
                    setNewPhoneNumber('');
                  }}
                >
                  Odustani
                </Button>
                <Button
                  type="primary"
                  size="medium"
                  onClick={handleUpdatePhoneNumber}
                  prefix={<CheckIcon size={16} />}
                >
                  Sačuvaj
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Recordings Modal */}
      {showRecordingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-5xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MicIcon size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Snimci poziva</h2>
                  <p className="text-sm text-slate-500">{technician?.name}</p>
                </div>
              </div>
              <Button
                type="tertiary"
                size="small"
                onClick={() => {
                  setShowRecordingsModal(false);
                  setPlayingRecordingId(null);
                  audioRef.current?.pause();
                }}
                className="!p-2"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>

            {/* Modal Body */}
            <div className="flex h-[calc(90vh-80px)]">
              {/* Left Side - Calendar */}
              <div className="w-80 border-r border-slate-200 p-4 overflow-y-auto">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => handleMonthChange(-1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <span className="font-semibold text-slate-900">
                    {new Date(currentYear, currentMonth - 1).toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handleMonthChange(1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['N', 'P', 'U', 'S', 'Č', 'P', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs font-medium text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                  {generateCalendarDays().map((dayInfo, i) => (
                    <button
                      key={i}
                      onClick={() => dayInfo && handleDateChange(dayInfo.date)}
                      disabled={!dayInfo}
                      className={`
                        relative p-2 text-sm rounded-lg transition-all
                        ${!dayInfo ? 'invisible' : ''}
                        ${dayInfo?.date === selectedDate
                          ? 'bg-blue-600 text-white font-bold'
                          : dayInfo?.hasRecordings
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
                            : 'hover:bg-slate-100 text-slate-700'
                        }
                      `}
                    >
                      {dayInfo?.day}
                      {dayInfo?.hasRecordings && dayInfo?.date !== selectedDate && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Filter Toggle */}
                <div className="border-t border-slate-200 pt-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">Prikaži vezane za nalog</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={includeWorkOrders}
                        onChange={(e) => setIncludeWorkOrders(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>

                {/* Date info */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Izabrani datum</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedDate).toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Right Side - Recordings List */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Hidden audio element */}
                <audio
                  ref={audioRef}
                  onEnded={handleAudioEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                />

                {recordingsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center space-x-3 text-slate-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">Učitavanje snimaka...</span>
                    </div>
                  </div>
                ) : recordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <MicIcon size={48} className="mb-4 text-slate-300" />
                    <p className="font-medium">Nema snimaka za izabrani datum</p>
                    <p className="text-sm mt-1">Izaberite drugi datum ili promenite filter</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Stats */}
                    <div className="flex items-center space-x-4 mb-4 p-3 bg-slate-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{recordings.length}</p>
                        <p className="text-xs text-slate-500">Ukupno</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{recordings.filter(r => r.linkedToWorkOrder).length}</p>
                        <p className="text-xs text-slate-500">Vezano</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-500">{recordings.filter(r => !r.linkedToWorkOrder).length}</p>
                        <p className="text-xs text-slate-500">Nevezano</p>
                      </div>
                    </div>

                    {/* Recordings List */}
                    {recordings.map((recording) => (
                      <div
                        key={recording._id}
                        className={`
                          p-4 rounded-xl border transition-all
                          ${recording.linkedToWorkOrder
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-slate-200'
                          }
                          ${playingRecordingId === recording._id ? 'ring-2 ring-blue-500' : ''}
                        `}
                      >
                        <div className="flex items-center space-x-4">
                          {/* Play Button */}
                          <button
                            onClick={() => handlePlayRecording(recording)}
                            className={`
                              w-12 h-12 rounded-full flex items-center justify-center transition-all
                              ${playingRecordingId === recording._id
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              }
                            `}
                          >
                            {playingRecordingId === recording._id ? (
                              <PauseIcon size={20} />
                            ) : (
                              <PlayIcon size={20} />
                            )}
                          </button>

                          {/* Recording Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-slate-900">{recording.customerPhone}</p>
                              {recording.linkedToWorkOrder && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                  Radni nalog
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mt-1 text-sm text-slate-500">
                              <span>
                                {new Date(recording.recordedAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>•</span>
                              <span>
                                {playingRecordingId === recording._id
                                  ? `${formatCurrentTime(audioCurrentTime)} / ${formatDuration(recording.duration)}`
                                  : formatDuration(recording.duration)
                                }
                              </span>
                              <span>•</span>
                              <span>{formatFileSize(recording.fileSize)}</span>
                            </div>
                            {/* Progress Bar */}
                            {playingRecordingId === recording._id && (
                              <div
                                className="mt-2 h-2 bg-slate-200 rounded-full cursor-pointer overflow-hidden"
                                onClick={(e) => handleSeek(e, recording)}
                              >
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all duration-100"
                                  style={{
                                    width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%`
                                  }}
                                />
                              </div>
                            )}
                            {recording.linkedToWorkOrder && recording.workOrderInfo && (
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                {recording.workOrderInfo.municipality} - {recording.workOrderInfo.address}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            {recording.linkedToWorkOrder && recording.workOrderId && (
                              <button
                                onClick={() => window.open(`/workorders/${recording.workOrderId}`, '_blank')}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Otvori radni nalog"
                              >
                                <ExternalLinkIcon size={20} />
                              </button>
                            )}
                            <a
                              href={recording.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Preuzmi snimak"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" x2="12" y1="15" y2="3"></line>
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDetail;