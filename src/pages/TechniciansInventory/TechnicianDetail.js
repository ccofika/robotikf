// Detalj tehničara: isti raspored kao ranije (zaglavlje, podaci sa dugmadima desno, pozivi podršci, oprema,
// materijali, dokumentacija, ocene), u izgledu Security dela. Obaveštenje o oceni (state { tab: 'reviews' })
// otvara ovu stranicu kao i ranije; ocene su na njoj.
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, UserRound, Package, Cable, FileText, FileSpreadsheet, FileImage, File as FileIcon, Star, Mic, CalendarDays, Pencil,
  Phone, Lock, Check, MessageSquare, Upload, Eye, Download, Trash2, Play, Pause, ExternalLink, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI, reviewsAPI, supportCallsAPI } from '../../services/api';
import { describeAssignment } from '../../utils/equipmentAssignment';
import { SUPPORT_TYPES, supportTypeLabel } from '../../utils/supportCalls';
import { localYmd } from '../../utils/localDate';
import { cx, Btn, Sign, State, Skeleton } from '../../security/sx/ui';
import { PageHead, Panel, Note, KV, Stat } from '../../security/sx/layout';
import { Field, Input, Switch } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { confirm } from '../../security/sx/confirm';
import { Pager, Loading, LinkBtn } from '../../montaza/ui';
import './TechnicianDetail.mx.css';

// Status opreme: tekst kao ranije, ton po značenju (magacin, kod tehničara, instalirana, neispravna, čeka potvrdu)
const STATUS_TONE = { available: 'idle', assigned: 'info', installed: 'ok', defective: 'bad', pending_confirmation: 'warn' };
const statusText = (status) => (status === 'available' ? 'Dostupno' :
  status === 'assigned' ? 'Zaduženo' :
  status === 'installed' ? 'Instalirano' :
  status === 'defective' ? 'Oštećeno' : status);

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
  const [selectedDate, setSelectedDate] = useState(localYmd());
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
  const [supportCallSummary, setSupportCallSummary] = useState(null);
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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRequestRef = useRef(0);
  const fileInputRef = useRef(null);

  // Mesečni obračun vide isti korisnici kao stranicu Finansije (supervisor i superadmin)
  const storedUser = localStorage.getItem('user');
  const currentUserRole = storedUser ? JSON.parse(storedUser).role : null;
  const canViewStatement = currentUserRole === 'supervisor' || currentUserRole === 'superadmin';

  useEffect(() => {
    fetchTechnicianData();
    fetchDocuments();
    fetchReviewStats();
    fetchReviews(1);
    fetchSupportCallSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchSupportCallSummary = async () => {
    try {
      const response = await supportCallsAPI.getTechnicianSummary(id);
      setSupportCallSummary(response.data);
    } catch (error) {
      // Summary je informativan, neuspeh ne sme da obori stranicu
      console.error('Greška pri učitavanju pregleda poziva podrške:', error);
    }
  };

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
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete ovu ocenu?', tone: 'danger', confirmLabel: 'Obriši' }))) return;
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

  // Zvezdice (ocena 1-5); broj je i u natpisu za čitače ekrana
  const renderStars = (rating) => (
    <span className="mx-tdet-stars" role="img" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} strokeWidth={1.9} className={i < rating ? 'is-on' : undefined} fill={i < rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  );

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
    if (!(await confirm({ title: `Da li ste sigurni da želite da obrišete "${documentName}"?`, tone: 'danger', confirmLabel: 'Obriši' }))) return;

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
    if (fileType?.includes('pdf')) return FileText;
    if (fileType?.includes('word') || fileType?.includes('document')) return FileText;
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return FileSpreadsheet;
    if (fileType?.includes('image')) return FileImage;
    return FileIcon;
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

  // Otvara preview modal - fajl se učitava kroz backend proxy (traži token) kao blob URL
  const openPreview = async (doc) => {
    setPreviewDoc(doc);
    if (!getPreviewType(doc)) return;

    const requestId = ++previewRequestRef.current;
    setPreviewLoading(true);
    try {
      const response = await techniciansAPI.getDocumentFile(id, doc._id);
      // Preview je u međuvremenu zatvoren ili otvoren drugi dokument
      if (requestId !== previewRequestRef.current) return;
      setPreviewUrl(window.URL.createObjectURL(response.data));
    } catch (error) {
      if (requestId !== previewRequestRef.current) return;
      console.error('Greška pri učitavanju dokumenta:', error);
      toast.error('Greška pri učitavanju dokumenta');
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    previewRequestRef.current++;
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewLoading(false);
    setPreviewDoc(null);
  };

  // Download sa pravim imenom fajla - koristi backend proxy (traži token, pa ide kao blob)
  const handleDownloadDocument = async (doc) => {
    try {
      const response = await techniciansAPI.getDocumentFile(id, doc._id, true);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Greška pri preuzimanju dokumenta:', error);
      toast.error('Greška pri preuzimanju dokumenta');
    }
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

  // Zatvaranje dijaloga (X, Odustani, Escape, klik van): isto kao ranije X i Odustani
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmedPassword('');
  };

  const closeGmailModal = () => {
    setShowGmailModal(false);
    setNewGmail('');
  };

  const closePhoneModal = () => {
    setShowPhoneModal(false);
    setNewPhoneNumber('');
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
    setSelectedDate(localYmd(today));
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    fetchRecordings(localYmd(today));
    fetchRecordingDates(today.getMonth() + 1, today.getFullYear());
  };

  const closeRecordingsModal = () => {
    setShowRecordingsModal(false);
    setPlayingRecordingId(null);
    audioRef.current?.pause();
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

  const head = (
    <PageHead
      eyebrow="Montaža · Tehničari"
      title="Detalji tehničara"
      lead="Pregled podataka tehničara"
      actions={<LinkBtn to="/technicians" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
    />
  );

  if (loading) {
    return (
      <div className="sx-page" data-testid="page-technician-detail" aria-busy="true">
        <span className="sx-sr" role="status">Učitavanje tehničara...</span>
        <Skeleton h={14} w={160} />
        <Skeleton h={48} w="min(460px, 80%)" style={{ marginTop: 16 }} />
        <Skeleton h={150} r={18} style={{ marginTop: 26 }} />
        <Skeleton h={320} r={18} style={{ marginTop: 20 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sx-page mx-tdet" data-testid="page-technician-detail">
        {head}
        <Note tone="bad">{error}</Note>
      </div>
    );
  }

  const equipmentItems = technician.equipment || [];
  const currentEquipmentItems = equipmentItems.slice((equipmentPage - 1) * equipmentPerPage, equipmentPage * equipmentPerPage);
  const materialItems = technician.materials || [];
  const currentMaterialItems = materialItems.slice((materialsPage - 1) * materialsPerPage, materialsPage * materialsPerPage);
  const employedDays = technician.employedUntil ? Math.ceil((new Date(technician.employedUntil) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const reviewPages = Math.ceil(reviewsTotal / 5);

  return (
    <div className="sx-page mx-tdet" data-testid="page-technician-detail">
      {head}

      <div className="sx-stack">
        {/* Podaci tehničara, dugmad desno */}
        <Panel testId="technician-profile">
          <div className="mx-tdet-profile">
            <span className="mx-tdet-profile__icon"><UserRound size={28} strokeWidth={1.8} aria-hidden="true" /></span>
            <div className="mx-tdet-profile__main">
              <div className="mx-tdet-profile__name">
                <h2 className="sx-card__title">{technician.name}</h2>
                <State tone={technician.isActive === false ? 'bad' : 'ok'}>
                  {technician.deletedAt ? 'Obrisan' : technician.isActive === false ? 'Neaktivan' : 'Aktivan'}
                </State>
              </div>
              <KV items={[
                { k: 'ID', v: technician.id, mono: true },
                { k: 'Gmail', v: technician.gmail || 'Nije uneto' },
                { k: 'Broj telefona', v: technician.phoneNumber || 'Nije uneto' },
                { k: 'Dodat', v: new Date(technician.createdAt).toLocaleDateString('sr-RS') },
                technician.employedUntil && {
                  k: 'Zaposlen do',
                  v: `${new Date(technician.employedUntil).toLocaleDateString('sr-RS')}${employedDays < 0 ? ' (ISTEKAO)' : employedDays <= 30 ? ` (${employedDays} dana)` : ''}`,
                  tone: employedDays < 0 ? 'bad' : employedDays <= 30 ? 'warn' : undefined
                }
              ]} />
            </div>
            <div className="mx-tdet-profile__acts">
              <Btn variant="ghost" icon={Pencil} onClick={() => { setNewGmail(technician.gmail || ''); setShowGmailModal(true); }}>Uredi Gmail</Btn>
              <Btn variant="ghost" icon={Phone} onClick={() => { setNewPhoneNumber(technician.phoneNumber || ''); setShowPhoneModal(true); }}>Uredi telefon</Btn>
              <Btn variant="ghost" icon={Lock} onClick={() => setShowPasswordModal(true)}>Promeni lozinku</Btn>
              <Btn variant="primary" icon={Mic} onClick={handleOpenRecordingsModal}>Snimci poziva</Btn>
              {canViewStatement && <LinkBtn to={`/technicians/${id}/obracun`} icon={CalendarDays}>Mesečni obračun</LinkBtn>}
            </div>
          </div>
        </Panel>

        {/* Pozivi podršci: zbirni pregled */}
        {supportCallSummary && supportCallSummary.total > 0 && (
          <Panel title="Pozivi podršci" testId="technician-support-calls">
            <div className="sx-stats mx-tdet-stats mx-tdet-stats--3">
              <Stat label="Ukupno poziva" value={supportCallSummary.total} />
              {SUPPORT_TYPES.map((type) => (
                <Stat key={type} label={supportTypeLabel(type)} value={supportCallSummary[type] || 0} />
              ))}
              <Stat
                label="Poslednji poziv"
                value={(
                  <span className="mx-tdet-statdate">
                    {supportCallSummary.lastCalledAt
                      ? new Date(supportCallSummary.lastCalledAt).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </span>
                )}
              />
            </div>
          </Panel>
        )}

        {/* Zadužena oprema */}
        <Panel
          title="Zadužena oprema"
          pad={false}
          actions={<LinkBtn to={`/technicians/${id}/assign-equipment`} variant="primary" size="sm" icon={Package}>Zaduži/razduži opremu</LinkBtn>}
          testId="technician-equipment"
        >
          {equipmentItems.length === 0 ? (
            <div className="sx-empty-block">
              <b>Nema zadužene opreme</b>
              <span>Dodajte opremu koristeći dugme iznad</span>
            </div>
          ) : (
            <>
              <div className="sx-tablewrap">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Kategorija</th>
                      <th>Opis</th>
                      <th>Serijski broj</th>
                      <th>Zaduženo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEquipmentItems.map((item, index) => {
                      const assignment = describeAssignment(item, { assumeAssigned: true });
                      return (
                        <tr key={item.serialNumber} style={{ '--i': index }}>
                          <td className="is-head"><b className="mx-strong">{item.category}</b></td>
                          <td data-label="Opis" className="is-wide">{item.description}</td>
                          <td data-label="Serijski broj"><span className="sx-mono">{item.serialNumber}</span></td>
                          <td data-label="Zaduženo">
                            {assignment.variant === 'stamped'
                              ? <span className="sx-mono sx-nowrap">{assignment.text}</span>
                              : <span className="mx-tdet-legacy">{assignment.text}</span>}
                          </td>
                          <td data-label="Status"><Sign tone={STATUS_TONE[item.status] || 'idle'}>{statusText(item.status)}</Sign></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={equipmentPage} total={equipmentItems.length} perPage={equipmentPerPage} onPage={setEquipmentPage} label="stavki" />
            </>
          )}
        </Panel>

        {/* Zaduženi materijali */}
        <Panel
          title="Zaduženi materijali"
          pad={false}
          actions={<LinkBtn to={`/technicians/${id}/assign-material`} variant="primary" size="sm" icon={Cable}>Zaduži/razduži materijal</LinkBtn>}
          testId="technician-materials"
        >
          {materialItems.length === 0 ? (
            <div className="sx-empty-block">
              <b>Nema zaduženih materijala</b>
              <span>Dodajte materijale koristeći dugme iznad</span>
            </div>
          ) : (
            <>
              <div className="sx-tablewrap">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Vrsta</th>
                      <th className="is-num">Količina</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMaterialItems.map((item, index) => (
                      <tr key={index} style={{ '--i': index }}>
                        <td className="is-head"><b className="mx-strong">{item.type}</b></td>
                        <td data-label="Količina" className="is-num">
                          {item.quantity === 0 ? <Sign tone="bad">{item.quantity}</Sign> : item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={materialsPage} total={materialItems.length} perPage={materialsPerPage} onPage={setMaterialsPage} label="stavki" />
            </>
          )}
        </Panel>

        {/* Dokumentacija: dugme ili prevlačenje fajlova na panel */}
        <Panel
          title={<span className="sx-panel__title-row">Dokumentacija <span className="sx-count">{documents.length}</span></span>}
          pad={false}
          actions={<>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleDocumentUpload(Array.from(e.target.files))}
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              hidden
            />
            <Btn variant="primary" size="sm" icon={Upload} busy={uploadingDocument} onClick={() => fileInputRef.current?.click()}>Otpremi dokument</Btn>
          </>}
          testId="technician-documents"
        >
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cx('mx-tdet-drop', dragOver && 'is-over')}
          >
            {documentsLoading ? (
              <Loading rows={3} text="Učitavanje dokumenata..." />
            ) : documents.length === 0 ? (
              <div className="sx-empty-block mx-tdet-pick" onClick={() => fileInputRef.current?.click()}>
                <b>Nema dokumenata</b>
                <span>Kliknite ili prevucite fajlove za otpremanje<br />(PDF, Word, Excel, slike)</span>
              </div>
            ) : (
              <div className="sx-list mx-tdet-docs">
                {documents.map((doc) => {
                  const DocIcon = getFileIcon(doc.fileType);
                  const open = () => (isPreviewable(doc) ? openPreview(doc) : handleDownloadDocument(doc));
                  return (
                    <div
                      key={doc._id}
                      className="sx-item is-click"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open(); }}
                    >
                      <span className="sx-item__icon"><DocIcon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
                      <div className="sx-item__main">
                        <b>{doc.name}</b>
                        <span>
                          {formatFileSize(doc.fileSize)} | {new Date(doc.uploadedAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="sx-item__side" onClick={(e) => e.stopPropagation()}>
                        {isPreviewable(doc) && (
                          <Btn size="sm" variant="ghost" icon={Eye} onClick={() => openPreview(doc)} title="Pregledaj" aria-label="Pregledaj" />
                        )}
                        <Btn size="sm" variant="ghost" icon={Download} onClick={() => handleDownloadDocument(doc)} title="Preuzmi" aria-label="Preuzmi" />
                        <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDeleteDocument(doc._id, doc.name)} title="Obriši dokument" aria-label="Obriši dokument" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Ocene korisnika: brojke, dodatne brojke, pojedinačne ocene, strane */}
        <Panel
          title={(
            <span className="sx-panel__title-row">
              Ocene korisnika
              {reviewStats && reviewStats.totalReviews > 0 && <span className="sx-count">{reviewStats.totalReviews}</span>}
            </span>
          )}
          testId="technician-reviews"
        >
          {reviewStats && reviewStats.totalReviews > 0 ? (
            <>
              <div className="sx-stats mx-tdet-stats mx-tdet-stats--4">
                <Stat label="Profesionalnost" value={reviewStats.avgProfessionalism} sub={renderStars(Math.round(reviewStats.avgProfessionalism))} />
                <Stat label="Kvalitet servisa" value={reviewStats.avgServiceQuality} sub={renderStars(Math.round(reviewStats.avgServiceQuality))} />
                <Stat label="NPS Score (0-10)" value={reviewStats.avgNps} />
                <Stat label="Tačnost dolaska" value={reviewStats.onTimePercent} small="%" />
              </div>

              <div className="mx-tdet-extra">
                <div className="mx-tdet-extra__item">
                  <span className="sx-item__icon"><Check size={16} strokeWidth={2} aria-hidden="true" /></span>
                  <div><b>{reviewStats.cleanInstallationPercent}%</b><span>Uredna instalacija</span></div>
                </div>
                <div className="mx-tdet-extra__item">
                  <span className="sx-item__icon"><MessageSquare size={16} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div><b>{reviewStats.fullExplanationPercent}%</b><span>Jasno objašnjenje</span></div>
                </div>
              </div>

              <h3 className="mx-tdet-subhead">Pojedinačne ocene</h3>
              {reviewsLoading ? (
                <Loading rows={3} h={96} text="Učitavanje..." />
              ) : (
                <div className="mx-tdet-reviews">
                  {reviews.map((review) => (
                    <div key={review._id} className="mx-tdet-review">
                      <div className="mx-tdet-review__head">
                        <div className="mx-tdet-review__who">
                          <div className="mx-tdet-review__name">
                            <b>{review.customerName || 'Anonimni korisnik'}</b>
                            <span>{new Date(review.createdAt).toLocaleDateString('sr-RS')}</span>
                          </div>
                          <span className="mx-tdet-review__stars">{renderStars(review.professionalism)} Profesionalnost</span>
                        </div>
                        <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDeleteReview(review._id)} title="Obriši ocenu" aria-label="Obriši ocenu" />
                      </div>
                      <div className="mx-tdet-review__grid">
                        <span><span className="sx-muted">Termin:</span> <b>{review.onTime}</b></span>
                        <span><span className="sx-muted">Urednost:</span> <b>{review.cleanInstallation}</b></span>
                        <span><span className="sx-muted">Servis:</span> <b>{review.serviceQuality}/5</b></span>
                      </div>
                      {review.comment && <p className="mx-tdet-quote">"{review.comment}"</p>}
                      <div className="mx-tdet-review__nps">
                        <span className="sx-muted">NPS:</span>
                        <Sign tone={review.npsScore >= 9 ? 'ok' : review.npsScore >= 7 ? 'warn' : 'bad'}>{review.npsScore}/10</Sign>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reviewsTotal > 5 && (
                <nav className="mx-tdet-revpager" aria-label="Stranice ocena">
                  <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={() => fetchReviews(reviewsPage - 1)} disabled={reviewsPage <= 1}>Prethodna</Btn>
                  <span className="mx-pager__text">{reviewsPage} / {reviewPages}</span>
                  <Btn size="sm" variant="ghost" iconRight={ChevronRight} onClick={() => fetchReviews(reviewsPage + 1)} disabled={reviewsPage >= reviewPages}>Sledeća</Btn>
                </nav>
              )}
            </>
          ) : (
            <div className="sx-empty-block mx-tdet-noreviews">
              <b>Nema ocena za ovog tehničara</b>
            </div>
          )}
        </Panel>
      </div>

      {/* Pregled dokumenta */}
      <Dialog
        open={!!previewDoc}
        onClose={closePreview}
        size="xl"
        title={previewDoc?.name}
        description={previewDoc && `${formatFileSize(previewDoc.fileSize)} · ${new Date(previewDoc.uploadedAt).toLocaleDateString('sr-RS')}`}
        className="mx-tdet-preview"
        bodyClassName="mx-tdet-preview__body"
        footer={previewDoc && <Btn icon={Download} onClick={() => handleDownloadDocument(previewDoc)}>Preuzmi</Btn>}
        testId="document-preview"
      >
        {previewDoc && (previewLoading ? (
          <p className="mx-tdet-preview__msg">Učitavanje dokumenta...</p>
        ) : previewUrl && getPreviewType(previewDoc) === 'image' ? (
          <img src={previewUrl} alt={previewDoc.name} className="mx-tdet-preview__img" />
        ) : previewUrl && getPreviewType(previewDoc) === 'pdf' ? (
          <iframe src={previewUrl} title={previewDoc.name} className="mx-tdet-preview__frame" />
        ) : (
          <div className="sx-empty-block">
            <b>Pregled nije dostupan</b>
            <Btn size="sm" icon={Download} onClick={() => handleDownloadDocument(previewDoc)}>Preuzmi dokument</Btn>
          </div>
        ))}
      </Dialog>

      {/* Promena lozinke */}
      <Dialog
        open={showPasswordModal}
        onClose={closePasswordModal}
        title={`Promeni lozinku za ${technician.name}`}
        footer={<>
          <Btn variant="ghost" onClick={closePasswordModal}>Odustani</Btn>
          <Btn type="submit" form="tdet-password" variant="primary" icon={Check} disabled={!newPassword || !confirmedPassword}>Sačuvaj</Btn>
        </>}
        testId="password-dialog"
      >
        <form id="tdet-password" className="sx-form" noValidate onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
          <Field label="Nova lozinka:" htmlFor="newPassword" wide>
            <Input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Unesite novu lozinku" />
          </Field>
          <Field label="Potvrdite lozinku:" htmlFor="confirmedPassword" wide>
            <Input type="password" id="confirmedPassword" value={confirmedPassword} onChange={(e) => setConfirmedPassword(e.target.value)} placeholder="Potvrdite novu lozinku" />
          </Field>
        </form>
      </Dialog>

      {/* Gmail adresa */}
      <Dialog
        open={showGmailModal}
        onClose={closeGmailModal}
        title={`Uredi Gmail za ${technician.name}`}
        footer={<>
          <Btn variant="ghost" onClick={closeGmailModal}>Odustani</Btn>
          <Btn type="submit" form="tdet-gmail" variant="primary" icon={Check}>Sačuvaj</Btn>
        </>}
        testId="gmail-dialog"
      >
        <form id="tdet-gmail" className="sx-form" noValidate onSubmit={(e) => { e.preventDefault(); handleUpdateGmail(); }}>
          <Field label="Gmail adresa:" htmlFor="newGmail" wide>
            <Input type="email" id="newGmail" value={newGmail} onChange={(e) => setNewGmail(e.target.value)} placeholder="Unesite Gmail adresu (npr. ime@gmail.com)" />
          </Field>
        </form>
      </Dialog>

      {/* Broj telefona */}
      <Dialog
        open={showPhoneModal}
        onClose={closePhoneModal}
        title={`Uredi broj telefona za ${technician.name}`}
        footer={<>
          <Btn variant="ghost" onClick={closePhoneModal}>Odustani</Btn>
          <Btn type="submit" form="tdet-phone" variant="primary" icon={Check}>Sačuvaj</Btn>
        </>}
        testId="phone-dialog"
      >
        <form id="tdet-phone" className="sx-form" noValidate onSubmit={(e) => { e.preventDefault(); handleUpdatePhoneNumber(); }}>
          <Field label="Broj telefona:" htmlFor="newPhoneNumber" hint="Broj telefona se koristi za automatsko povezivanje snimljenih poziva sa radnim nalozima." wide>
            <Input type="tel" id="newPhoneNumber" value={newPhoneNumber} onChange={(e) => setNewPhoneNumber(e.target.value)} placeholder="Unesite broj telefona (npr. +381641234567 ili 0641234567)" />
          </Field>
        </form>
      </Dialog>

      {/* Snimci poziva: kalendar levo (na telefonu gore), snimci izabranog dana desno */}
      <Dialog
        open={showRecordingsModal}
        onClose={closeRecordingsModal}
        size="xl"
        title="Snimci poziva"
        description={technician?.name}
        className="mx-tdet-rec"
        bodyClassName="mx-tdet-rec__body"
        testId="recordings-dialog"
      >
        <div className="mx-tdet-rec__side">
          <div className="sx-cal mx-tdet-cal">
            <div className="sx-cal__head">
              <button type="button" className="sx-cal__nav" onClick={() => handleMonthChange(-1)} aria-label="Prethodni mesec">
                <ChevronLeft size={16} strokeWidth={1.9} />
              </button>
              <p className="sx-cal__title">
                {new Date(currentYear, currentMonth - 1).toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' })}
              </p>
              <button type="button" className="sx-cal__nav" onClick={() => handleMonthChange(1)} aria-label="Sledeći mesec">
                <ChevronRight size={16} strokeWidth={1.9} />
              </button>
            </div>
            <div className="sx-cal__grid sx-cal__dows">
              {['N', 'P', 'U', 'S', 'Č', 'P', 'S'].map((day, i) => <span key={i}>{day}</span>)}
            </div>
            <div className="sx-cal__grid">
              {generateCalendarDays().map((dayInfo, i) => (dayInfo ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDateChange(dayInfo.date)}
                  aria-pressed={dayInfo.date === selectedDate}
                  className={cx('sx-cal__day', dayInfo.date === selectedDate && 'is-selected', dayInfo.hasRecordings && 'mx-tdet-cal__rec')}
                >
                  {dayInfo.day}
                </button>
              ) : <span key={i} />))}
            </div>
          </div>

          <Switch checked={includeWorkOrders} onChange={setIncludeWorkOrders} className="mx-tdet-rec__filter">Prikaži vezane za nalog</Switch>

          <div className="mx-tdet-rec__date">
            <span className="sx-label">Izabrani datum</span>
            <b>{new Date(selectedDate).toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
          </div>
        </div>

        <div className="mx-tdet-rec__main">
          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            onEnded={handleAudioEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />

          {recordingsLoading ? (
            <Loading rows={3} h={64} text="Učitavanje snimaka..." />
          ) : recordings.length === 0 ? (
            <div className="sx-empty-block">
              <b>Nema snimaka za izabrani datum</b>
              <span>Izaberite drugi datum ili promenite filter</span>
            </div>
          ) : (
            <>
              <div className="sx-stats mx-tdet-recstats">
                <Stat label="Ukupno" value={recordings.length} />
                <Stat label="Vezano" value={recordings.filter(r => r.linkedToWorkOrder).length} tone="ok" />
                <Stat label="Nevezano" value={recordings.filter(r => !r.linkedToWorkOrder).length} tone={recordings.some(r => !r.linkedToWorkOrder) ? 'warn' : null} />
              </div>

              <div className="mx-tdet-reclist">
                {recordings.map((recording) => {
                  const playing = playingRecordingId === recording._id;
                  return (
                    <div key={recording._id} className={cx('mx-tdet-recitem', recording.linkedToWorkOrder && 'is-linked', playing && 'is-playing')}>
                      <Btn
                        variant={playing ? 'primary' : 'secondary'}
                        icon={playing ? Pause : Play}
                        onClick={() => handlePlayRecording(recording)}
                        aria-label={playing ? 'Pauziraj snimak' : 'Pusti snimak'}
                        className="mx-tdet-play"
                      />
                      <div className="mx-tdet-recitem__main">
                        <div className="mx-tdet-recitem__top">
                          <b className="sx-mono">{recording.customerPhone}</b>
                          {recording.linkedToWorkOrder && <span className="sx-tag is-ok">Radni nalog</span>}
                        </div>
                        <span className="mx-tdet-recitem__meta">
                          {new Date(recording.recordedAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                          {' • '}
                          {playing ? `${formatCurrentTime(audioCurrentTime)} / ${formatDuration(recording.duration)}` : formatDuration(recording.duration)}
                          {' • '}
                          {formatFileSize(recording.fileSize)}
                        </span>
                        {playing && (
                          <div className="mx-tdet-progress" onClick={(e) => handleSeek(e, recording)}>
                            <div style={{ width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }} />
                          </div>
                        )}
                        {recording.linkedToWorkOrder && recording.workOrderInfo && (
                          <span className="mx-tdet-recitem__wo">
                            {recording.workOrderInfo.municipality} - {recording.workOrderInfo.address}
                          </span>
                        )}
                      </div>
                      <div className="mx-tdet-recitem__acts">
                        {recording.linkedToWorkOrder && recording.workOrderId && (
                          <Btn
                            size="sm"
                            variant="ghost"
                            icon={ExternalLink}
                            onClick={() => window.open(`/workorders/${recording.workOrderId}`, '_blank')}
                            title="Otvori radni nalog"
                            aria-label="Otvori radni nalog"
                          />
                        )}
                        <Btn
                          size="sm"
                          variant="ghost"
                          icon={Download}
                          href={recording.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preuzmi snimak"
                          aria-label="Preuzmi snimak"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default TechnicianDetail;
