import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BoxIcon, ToolsIcon, UserIcon, LockIcon, CheckIcon, EditIcon, PhoneIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';

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
  const audioRef = useRef(null);
  
  // Pagination for equipment
  const [equipmentPage, setEquipmentPage] = useState(1);
  const equipmentPerPage = 10;
  
  // Pagination for materials
  const [materialsPage, setMaterialsPage] = useState(1);
  const materialsPerPage = 10;
  
  useEffect(() => {
    fetchTechnicianData();
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
        audioRef.current.src = recording.url;
        audioRef.current.play();
        setPlayingRecordingId(recording._id);
      }
    }
  };

  const handleAudioEnded = () => {
    setPlayingRecordingId(null);
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
              <h2 className="text-xl font-bold text-slate-900 mb-2">{technician.name}</h2>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">ID:</span> {technician.id}</p>
                <p><span className="font-medium">Gmail:</span> {technician.gmail || 'Nije uneto'}</p>
                <p><span className="font-medium">Broj telefona:</span> {technician.phoneNumber || 'Nije uneto'}</p>
                <p><span className="font-medium">Dodat:</span> {new Date(technician.createdAt).toLocaleDateString('sr-RS')}</p>
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
                <audio ref={audioRef} onEnded={handleAudioEnded} />

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
                              <span>{formatDuration(recording.duration)}</span>
                              <span>•</span>
                              <span>{formatFileSize(recording.fileSize)}</span>
                            </div>
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