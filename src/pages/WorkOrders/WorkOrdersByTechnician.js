import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Upload, RefreshCw, Eye, Trash2, UserCheck, Check, Sparkles, Wrench, Menu, UserRound, UserX, ClipboardList } from 'lucide-react';
import { toast } from '../../utils/toast';
import { getTimRowStyle } from '../../utils/tim';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import { useWorkOrderModal } from '../../context/WorkOrderModalContext';
import AIVerificationModal from '../../components/AIVerificationModal';
import ReturnWorkOrderModal from '../../components/ReturnWorkOrderModal';
import { cx, Btn, Sign, State, Avatar } from '../../security/sx/ui';
import { Note } from '../../security/sx/layout';
import { Select, SearchField, DateField, Choice } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { confirm } from '../../security/sx/confirm';
import { LinkBtn, Pager, Loading } from '../../montaza/ui';
import './WorkOrdersByTechnician.mx.css';

// Ikonica koja se okreće dok traje učitavanje (Btn prima komponentu ikonice)
const Spin = (p) => <RefreshCw {...p} className="mx-spin" />;

// Status naloga: natpis kao ranije, ton znaka po dogovoru (završen ok, nezavršen warn, odložen info, otkazan bad)
const STATUS = {
  zavrsen: { label: 'Završen', tone: 'ok' },
  nezavrsen: { label: 'Nezavršen', tone: 'warn' },
  odlozen: { label: 'Odložen', tone: 'info' },
  otkazan: { label: 'Otkazan', tone: 'bad' }
};

// Statusi korisnika (šalju se na API kao tekst, ne menjati)
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

const WorkOrdersByTechnician = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshCounter } = useWorkOrderModal();
  const [technicians, setTechnicians] = useState([]);
  // Obrisani tehničari ostaju u "technicians" samo zbog imena na starim nalozima
  const activeTechnicians = technicians.filter(t => !t.deletedAt);

  // Work orders state
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [olderWorkOrders, setOlderWorkOrders] = useState([]);
  const [recentUnassigned, setRecentUnassigned] = useState([]);
  const [olderUnassigned, setOlderUnassigned] = useState([]);
  const [verificationOrders, setVerificationOrders] = useState([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [allLoadingInProgress, setAllLoadingInProgress] = useState(false);
  const [serverSearchResults, setServerSearchResults] = useState(null);


  // Loading states
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationDataLoaded, setVerificationDataLoaded] = useState(false);

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeSortOrder, setTimeSortOrder] = useState('asc');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'technicians');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [customerStatusModal, setCustomerStatusModal] = useState({ isOpen: false, orderId: null });
  const [orderStatuses, setOrderStatuses] = useState({});

  // AI Verification states
  const [loadingAIVerification, setLoadingAIVerification] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiVerificationResult, setAIVerificationResult] = useState(null);
  // Vraćanje posle AI preporuke ide kroz istu potvrdu sa umanjenjem zarade kao ručno vraćanje
  const [aiReturnModal, setAiReturnModal] = useState({ isOpen: false, orderId: null, comment: '' });

  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Paginacija
  const [currentPageUnassigned, setCurrentPageUnassigned] = useState(1);
  const [currentPageVerification, setCurrentPageVerification] = useState(1);
  const [currentPageAllOrders, setCurrentPageAllOrders] = useState(1);
  const [technicianCurrentPages, setTechnicianCurrentPages] = useState({});
  const itemsPerPage = 20;

  useEffect(() => {
    fetchDashboardAndTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced server-side search for old orders not in memory
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2 || allLoaded) {
      setServerSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      serverSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, allLoaded]);

  // Refresh data when modal signals changes
  useEffect(() => {
    if (refreshCounter > 0) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter]);

  // Prati promene u URL parametrima i automatski postavlja tab i search
  useEffect(() => {
    const tab = searchParams.get('tab');
    const search = searchParams.get('search');

    if (tab) {
      setActiveTab(tab);

      if (tab === 'verification' && !verificationDataLoaded) {
        fetchVerificationOrders();
      }
    }

    if (search) {
      setSearchTerm(search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, verificationDataLoaded]);

  // Handle tab changes and lazy loading
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);

    if (tabName === 'verification' && !verificationDataLoaded) {
      fetchVerificationOrders();
    }
  };

  // Priority 1: Load dashboard stats and technicians (fastest)
  const fetchDashboardAndTechnicians = async () => {
    setDashboardLoading(true);
    setError('');

    try {
      const techniciansResponse = await techniciansAPI.getAll();
      const techniciansData = techniciansResponse.data;

      setTechnicians(techniciansData);

      setTimeout(() => {
        fetchRecentWorkOrders();
      }, 100);

    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      setError('Greška pri učitavanju osnovnih podataka. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje osnovnih podataka!');
    } finally {
      setDashboardLoading(false);
    }
  };

  // Priority 2: Load recent work orders (last 3 days)
  const fetchRecentWorkOrders = async () => {
    setRecentLoading(true);

    try {
      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll({ recent: 3 }),
        workOrdersAPI.getUnassigned()
      ]);

      const workOrdersData = Array.isArray(workOrdersResponse.data) ? workOrdersResponse.data : (workOrdersResponse.data.workOrders || []);
      const unassignedData = unassignedResponse.data;

      // Filter unassigned by recent (server already filtered work orders)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const recentUnassignedData = unassignedData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= threeDaysAgo;
      });

      setRecentWorkOrders(workOrdersData);
      setRecentUnassigned(recentUnassignedData);

      // Load verification count in background (don't block)
      if (!verificationDataLoaded) {
        fetchVerificationOrders();
      }

      // Load next batch of older orders in background (~200 more)
      setTimeout(() => {
        fetchInitialOlderWorkOrders();
      }, 300);

    } catch (error) {
      console.error('Greška pri učitavanju najnovijih radnih naloga:', error);
    } finally {
      setRecentLoading(false);
    }
  };

  // Priority 3: Load initial batch of older orders (~200) in background
  const fetchInitialOlderWorkOrders = async () => {
    setOlderLoading(true);
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll({ olderThan: 3, page: 1, limit: 200 }),
        workOrdersAPI.getUnassigned()
      ]);

      const data = workOrdersResponse.data;
      const workOrdersData = data.workOrders || (Array.isArray(data) ? data : []);
      const unassignedData = unassignedResponse.data;
      const olderUnassignedData = unassignedData.filter(order => new Date(order.date) < threeDaysAgo);

      setOlderWorkOrders(workOrdersData);
      setOlderUnassigned(olderUnassignedData);
    } catch (error) {
      console.error('Greška pri učitavanju starijih radnih naloga:', error);
    } finally {
      setOlderLoading(false);
    }
  };

  // Load ALL older work orders progressively (button click)
  const fetchAllWorkOrders = async () => {
    setAllLoadingInProgress(true);
    setOlderLoading(true);

    try {
      let page = 1;
      const pageSize = 200;
      let allOrders = [];
      let hasMore = true;

      // Start from page 2 since page 1 is already loaded by fetchInitialOlderWorkOrders
      if (olderWorkOrders.length > 0) {
        allOrders = [...olderWorkOrders];
        page = 2;
      }

      while (hasMore) {
        const response = await workOrdersAPI.getAll({ olderThan: 3, page, limit: pageSize });
        const data = response.data;
        const batch = data.workOrders || (Array.isArray(data) ? data : []);

        if (batch.length === 0) {
          hasMore = false;
        } else {
          // Deduplicate
          const existingIds = new Set(allOrders.map(o => o._id));
          const newOrders = batch.filter(o => !existingIds.has(o._id));
          allOrders = [...allOrders, ...newOrders];
          setOlderWorkOrders([...allOrders]);

          if (data.pagination && !data.pagination.hasNextPage) {
            hasMore = false;
          } else if (batch.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      setAllLoaded(true);
      toast.success(`Učitano ukupno ${allOrders.length} starijih naloga`);
    } catch (error) {
      console.error('Greška pri učitavanju svih radnih naloga:', error);
      toast.error('Greška pri učitavanju svih radnih naloga');
    } finally {
      setOlderLoading(false);
      setAllLoadingInProgress(false);
    }
  };

  // Server-side search for work orders (searches ALL orders on backend)
  const serverSearch = async (term) => {
    if (!term || term.length < 2) {
      setServerSearchResults(null);
      return;
    }
    try {
      const response = await workOrdersAPI.getAll({ search: term, page: 1, limit: 100 });
      const data = response.data;
      setServerSearchResults(data.workOrders || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Greška pri pretrazi:', error);
    }
  };

  // Lazy loading for verification tab
  const fetchVerificationOrders = async () => {
    if (verificationDataLoaded) return;

    setVerificationLoading(true);

    try {
      const verificationResponse = await workOrdersAPI.getVerification();
      const verificationData = verificationResponse.data;

      setVerificationOrders(verificationData);
      setVerificationDataLoaded(true);

    } catch (error) {
      console.error('Greška pri učitavanju naloga za verifikaciju:', error);
      toast.error('Neuspešno učitavanje naloga za verifikaciju!');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Refresh all data
  const fetchData = async () => {
    setVerificationDataLoaded(false);
    setAllLoaded(false);
    setOlderWorkOrders([]);
    setOlderUnassigned([]);
    setServerSearchResults(null);
    await fetchDashboardAndTechnicians();

    if (activeTab === 'verification') {
      await fetchVerificationOrders();
    }
  };

  const loadCustomerStatus = async (orderId) => {
    try {
      const response = await workOrdersAPI.getEvidence(orderId);
      const status = response.data.customerStatus || 'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala';
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    } catch (error) {
      console.error(`Failed to load status for order ${orderId}:`, error);
      const status = 'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala';
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    }
  };

  const handleVerifyOrder = async (orderId) => {
    try {
      let currentStatus = orderStatuses[orderId];
      if (!currentStatus) {
        currentStatus = await loadCustomerStatus(orderId);
      }

      if (!currentStatus || currentStatus === 'Nov korisnik') {
        toast.error('Potrebno je prvo postaviti status korisnika pre verifikacije!');
        return;
      }

      await workOrdersAPI.verify(orderId, {});
      toast.success('Radni nalog je uspešno verifikovan!');

      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

      const updateOrderInArray = (ordersArray, setOrdersFunc) => {
        const updatedOrders = [...ordersArray];
        const updatedIndex = updatedOrders.findIndex(order => order._id === orderId);

        if (updatedIndex !== -1) {
          updatedOrders[updatedIndex] = {
            ...updatedOrders[updatedIndex],
            verified: true,
            verifiedAt: new Date().toISOString()
          };
          setOrdersFunc(updatedOrders);
          return true;
        }
        return false;
      };

      if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
        updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
      }

    } catch (error) {
      console.error('Greška pri verifikaciji:', error);
      toast.error('Neuspešna verifikacija radnog naloga!');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ title: 'Da li ste sigurni da želite da obrišete ovaj radni nalog?', tone: 'danger', confirmLabel: 'Obriši' })) {
      try {
        await workOrdersAPI.delete(id);
        toast.success('Radni nalog je uspešno obrisan!');

        setRecentWorkOrders(prev => prev.filter(order => order._id !== id));
        setOlderWorkOrders(prev => prev.filter(order => order._id !== id));
        setRecentUnassigned(prev => prev.filter(order => order._id !== id));
        setOlderUnassigned(prev => prev.filter(order => order._id !== id));
        setVerificationOrders(prev => prev.filter(order => order._id !== id));

      } catch (error) {
        console.error('Greška pri brisanju:', error);
        toast.error('Neuspešno brisanje radnog naloga!');
      }
    }
  };

  // Combine recent, older, and server search results (deduplicated)
  const getAllWorkOrders = useCallback(() => {
    const localOrders = [...recentWorkOrders, ...olderWorkOrders];
    if (!serverSearchResults) return localOrders;
    // Merge server results, avoiding duplicates
    const existingIds = new Set(localOrders.map(o => o._id));
    const newFromServer = serverSearchResults.filter(o => !existingIds.has(o._id));
    return [...localOrders, ...newFromServer];
  }, [recentWorkOrders, olderWorkOrders, serverSearchResults]);

  const getAllUnassignedOrders = useCallback(() => {
    return [...recentUnassigned, ...olderUnassigned];
  }, [recentUnassigned, olderUnassigned]);

  const groupWorkOrdersByTechnician = () => {
    const techWorkOrders = {};

    activeTechnicians.forEach(tech => {
      techWorkOrders[tech._id] = {
        technicianInfo: tech,
        workOrders: []
      };
    });

    const allWorkOrders = getAllWorkOrders();

    allWorkOrders.forEach(order => {
      const techId = order.technicianId?._id || order.technicianId;
      const tech2Id = order.technician2Id?._id || order.technician2Id;
      if (techId && techWorkOrders[techId]) {
        techWorkOrders[techId].workOrders.push(order);
      }
      if (tech2Id && techWorkOrders[tech2Id]) {
        techWorkOrders[tech2Id].workOrders.push(order);
      }
    });

    return techWorkOrders;
  };

  const technicianWorkOrders = groupWorkOrdersByTechnician();

  // Enhanced filtering function with deep search
  const filterOrders = useCallback((orders) => {
    return orders.filter(order => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesTechnician = !technicianFilter ||
        order.technicianId?._id === technicianFilter ||
        order.technicianId === technicianFilter ||
        order.technician2Id?._id === technicianFilter ||
        order.technician2Id === technicianFilter;

      let matchesDate = true;
      if (dateFilter) {
        const orderDate = new Date(order.date);
        const filterDateObj = new Date(dateFilter);
        matchesDate = orderDate.toDateString() === filterDateObj.toDateString();
      }

      let matchesSearch = true;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        matchesSearch =
          order.municipality?.toLowerCase().includes(searchLower) ||
          order.address?.toLowerCase().includes(searchLower) ||
          order.tisId?.toString().includes(searchTerm) ||
          order.tisJobId?.toString().includes(searchTerm) ||
          order.type?.toLowerCase().includes(searchLower) ||
          order.userName?.toLowerCase().includes(searchLower) ||
          order.description?.toLowerCase().includes(searchLower) ||
          order.notes?.toLowerCase().includes(searchLower) ||
          order.technicianId?.name?.toLowerCase().includes(searchLower) ||
          order.technician2Id?.name?.toLowerCase().includes(searchLower) ||
          order.equipment?.some(eq =>
            eq.serialNumber?.toLowerCase().includes(searchLower) ||
            eq.serialNumber?.slice(-4).includes(searchTerm)
          ) ||
          order.materials?.some(mat =>
            mat.name?.toLowerCase().includes(searchLower)
          );
      }

      return matchesStatus && matchesTechnician && matchesDate && matchesSearch;
    });
  }, [statusFilter, technicianFilter, dateFilter, searchTerm]);

  // Filtrirani podaci sa paginacijom
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredUnassigned = useMemo(() => filterOrders(getAllUnassignedOrders()), [recentUnassigned, olderUnassigned, statusFilter, technicianFilter, dateFilter, searchTerm, filterOrders, getAllUnassignedOrders]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredVerification = useMemo(() => filterOrders(verificationOrders), [verificationOrders, statusFilter, technicianFilter, dateFilter, searchTerm, filterOrders]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredAllOrders = useMemo(() => {
    const filtered = filterOrders(getAllWorkOrders());
    if (dateFilter) {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        const [hoursA, minutesA] = (a.time || '00:00').split(':').map(Number);
        const [hoursB, minutesB] = (b.time || '00:00').split(':').map(Number);

        dateA.setHours(hoursA, minutesA, 0, 0);
        dateB.setHours(hoursB, minutesB, 0, 0);

        const timeA = dateA.getTime();
        const timeB = dateB.getTime();

        return timeSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
    }
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentWorkOrders, olderWorkOrders, serverSearchResults, statusFilter, technicianFilter, dateFilter, timeSortOrder, searchTerm, filterOrders, getAllWorkOrders]);

  // Paginacija za nedodeljene naloge
  const indexOfLastUnassigned = currentPageUnassigned * itemsPerPage;
  const indexOfFirstUnassigned = indexOfLastUnassigned - itemsPerPage;
  const currentUnassignedItems = filteredUnassigned.slice(indexOfFirstUnassigned, indexOfLastUnassigned);

  // Paginacija za verifikaciju
  const indexOfLastVerification = currentPageVerification * itemsPerPage;
  const indexOfFirstVerification = indexOfLastVerification - itemsPerPage;
  const currentVerificationItems = filteredVerification.slice(indexOfFirstVerification, indexOfLastVerification);

  // Paginacija za sve radne naloge
  const indexOfLastAllOrders = currentPageAllOrders * itemsPerPage;
  const indexOfFirstAllOrders = indexOfLastAllOrders - itemsPerPage;
  const currentAllOrdersItems = filteredAllOrders.slice(indexOfFirstAllOrders, indexOfLastAllOrders);

  // Funkcije za paginaciju
  const paginateUnassigned = (pageNumber) => setCurrentPageUnassigned(pageNumber);
  const paginateVerification = (pageNumber) => setCurrentPageVerification(pageNumber);
  const paginateAllOrders = (pageNumber) => setCurrentPageAllOrders(pageNumber);
  const paginateTechnician = (techId, pageNumber, event) => {
    if (event) {
      event.stopPropagation();
    }
    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: pageNumber
    }));
  };

  // Sortiranje po datumu (najnoviji na vrhu)
  const sortByDate = (orders) => {
    return [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };

  const getTechnicianName = (order) => {
    if (order.technicianId?.name) return order.technicianId.name;
    if (order.technicianId) {
      const tech = technicians.find(t => t._id === order.technicianId);
      return tech?.name || 'Nepoznat';
    }
    return 'Nedodeljen';
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTechnicianFilter('');
    setDateFilter('');
    setTimeSortOrder('asc');
    setCurrentPageUnassigned(1);
    setCurrentPageVerification(1);
    setCurrentPageAllOrders(1);
    setTechnicianCurrentPages({});
  };

  // Skrol stranice zaključava sam dijalog (sloj), ne ručno
  const openCustomerStatusModal = async (orderId) => {
    if (!orderStatuses[orderId]) {
      await loadCustomerStatus(orderId);
    }
    setCustomerStatusModal({ isOpen: true, orderId });
  };

  const closeCustomerStatusModal = () => {
    setCustomerStatusModal({ isOpen: false, orderId: null });
  };

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

  // AI Verification handler
  const handleAIVerify = async (orderId) => {
    setLoadingAIVerification(orderId);
    setAIVerificationResult(null);
    setShowAIModal(true);

    try {
      console.log('Starting AI analysis for order:', orderId);

      const result = await workOrdersAPI.aiVerify(orderId);

      console.log('AI analysis result:', result.data);

      setAIVerificationResult({
        orderId,
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
      setLoadingAIVerification(null);
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

      await workOrdersAPI.verify(orderId, {});

      toast.success('Radni nalog je uspešno verifikovan!');

      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

      const updateOrderInArray = (ordersArray, setOrdersFunc) => {
        const updatedOrders = [...ordersArray];
        const updatedIndex = updatedOrders.findIndex(order => order._id === orderId);

        if (updatedIndex !== -1) {
          updatedOrders[updatedIndex] = {
            ...updatedOrders[updatedIndex],
            verified: true,
            verifiedAt: new Date().toISOString()
          };
          setOrdersFunc(updatedOrders);
          return true;
        }
        return false;
      };

      if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
        updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
      }

      setShowAIModal(false);
      setAIVerificationResult(null);

    } catch (error) {
      console.error('Error accepting AI recommendation:', error);
      toast.error('Greška pri verifikaciji radnog naloga');
    }
  };

  // Reject AI recommendation (return to technician)
  const handleRejectAI = () => {
    if (!aiVerificationResult) return;

    setAiReturnModal({
      isOpen: true,
      orderId: aiVerificationResult.orderId,
      comment: `AI VERIFIKACIJA:\n\n${aiVerificationResult.reason}`
    });
    setShowAIModal(false);
    setAIVerificationResult(null);
  };

  // Posle potvrde vraćanja: skloni nalog iz liste za verifikaciju i ažuriraj status u listama
  const handleAIReturned = () => {
    const orderId = aiReturnModal.orderId;
    setAiReturnModal({ isOpen: false, orderId: null, comment: '' });

    setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

    const updateOrderInArray = (ordersArray, setOrdersFunc) => {
      const updatedOrders = [...ordersArray];
      const updatedIndex = updatedOrders.findIndex(order => order._id === orderId);

      if (updatedIndex !== -1) {
        updatedOrders[updatedIndex] = {
          ...updatedOrders[updatedIndex],
          status: 'nezavrsen',
          verified: false
        };
        setOrdersFunc(updatedOrders);
        return true;
      }
      return false;
    };

    if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
      updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
    }
  };

  // Funkcija za navigaciju na detalje radnog naloga (modal ili novi tab sa middle-click)
  const navigateToOrderDetails = (orderId, event) => {
    if (event.target.closest('.delete-btn') || event.target.closest('.verify-btn')) {
      return;
    }

    const isFromVerification = activeTab === 'verification';
    const url = isFromVerification
      ? `/work-orders/${orderId}?fromVerification=true`
      : `/work-orders/${orderId}`;

    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      window.open(url, '_blank');
      return;
    }

    navigate(url, { state: { backgroundLocation: location } });
  };

  // Funkcija za handleovanje klika na statistike tehničara
  const handleStatClick = (techId, status, event) => {
    event.stopPropagation();

    setStatusFilter(status);

    if (selectedTechnicianId !== techId) {
      setSelectedTechnicianId(techId);
    }

    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: 1
    }));
  };

  // Search result counting for sidebar badges
  const searchMatchCounts = useMemo(() => {
    if (!searchTerm) return {};
    const counts = {
      all: filterOrders(getAllWorkOrders()).length,
      verification: filterOrders(verificationOrders).length,
      unassigned: filterOrders(getAllUnassignedOrders()).length,
    };
    Object.entries(technicianWorkOrders).forEach(([id, data]) => {
      counts[id] = filterOrders(data.workOrders).length;
    });
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, recentWorkOrders, olderWorkOrders, recentUnassigned, olderUnassigned, verificationOrders, technicians, statusFilter, technicianFilter, dateFilter]);

  // Filter technicians in sidebar by search
  const filteredSidebarTechnicians = useMemo(() => {
    if (!searchTerm) return Object.entries(technicianWorkOrders);
    const searchLower = searchTerm.toLowerCase();
    return Object.entries(technicianWorkOrders).filter(([techId, techData]) => {
      const nameMatch = techData.technicianInfo.name?.toLowerCase().includes(searchLower);
      const phoneMatch = techData.technicianInfo.phone?.toLowerCase().includes(searchLower);
      const orderMatch = searchMatchCounts[techId] > 0;
      return nameMatch || phoneMatch || orderMatch;
    });
  }, [searchTerm, technicianWorkOrders, searchMatchCounts]);

  // Status naloga: znak + natpis (boja nikad sama)
  const renderStatusBadge = (status) => {
    const cfg = STATUS[status] || { label: status, tone: 'idle' };
    return <Sign tone={cfg.tone}>{cfg.label}</Sign>;
  };

  // Get current display data for the active tab
  const getCurrentOrders = () => {
    if (activeTab === 'technicians' && selectedTechnicianId && technicianWorkOrders[selectedTechnicianId]) {
      return filterOrders(technicianWorkOrders[selectedTechnicianId].workOrders);
    }
    if (activeTab === 'unassigned') return filteredUnassigned;
    if (activeTab === 'verification') return filteredVerification;
    if (activeTab === 'all') return filteredAllOrders;
    return [];
  };

  const getCurrentPaginatedOrders = () => {
    if (activeTab === 'technicians' && selectedTechnicianId) {
      const orders = filterOrders(technicianWorkOrders[selectedTechnicianId]?.workOrders || []);
      const currentPageTech = technicianCurrentPages[selectedTechnicianId] || 1;
      const start = (currentPageTech - 1) * itemsPerPage;
      return orders.slice(start, start + itemsPerPage);
    }
    if (activeTab === 'unassigned') return currentUnassignedItems;
    if (activeTab === 'verification') return currentVerificationItems;
    if (activeTab === 'all') return currentAllOrdersItems;
    return [];
  };

  const getCurrentPage = () => {
    if (activeTab === 'technicians' && selectedTechnicianId) {
      return technicianCurrentPages[selectedTechnicianId] || 1;
    }
    if (activeTab === 'unassigned') return currentPageUnassigned;
    if (activeTab === 'verification') return currentPageVerification;
    if (activeTab === 'all') return currentPageAllOrders;
    return 1;
  };

  const handleCurrentPageChange = (page) => {
    if (activeTab === 'technicians' && selectedTechnicianId) {
      paginateTechnician(selectedTechnicianId, page);
    } else if (activeTab === 'unassigned') {
      paginateUnassigned(page);
    } else if (activeTab === 'verification') {
      paginateVerification(page);
    } else if (activeTab === 'all') {
      paginateAllOrders(page);
    }
  };

  // Sidebar click handler (auto-closes on mobile)
  const handleSidebarItemClick = (tab, techId) => {
    handleTabChange(tab);
    if (techId) {
      setSelectedTechnicianId(techId);
    } else {
      setSelectedTechnicianId('');
    }
    setSidebarOpen(false);
  };

  // Content header info
  const getContentHeaderInfo = () => {
    if (activeTab === 'technicians' && selectedTechnicianId && technicianWorkOrders[selectedTechnicianId]) {
      const tech = technicianWorkOrders[selectedTechnicianId].technicianInfo;
      return { title: tech.name, subtitle: tech.phone, icon: UserRound };
    }
    if (activeTab === 'unassigned') return { title: 'Nedodeljeni radni nalozi', subtitle: `${filteredUnassigned.length} naloga`, icon: UserX };
    if (activeTab === 'verification') return { title: 'Za verifikaciju', subtitle: `${filteredVerification.length} naloga`, icon: Check };
    if (activeTab === 'all') return { title: 'Svi radni nalozi', subtitle: `${filteredAllOrders.length} naloga`, icon: ClipboardList };
    if (activeTab === 'technicians') return { title: 'Tehničari', subtitle: 'Izaberite tehničara iz menija', icon: UserRound };
    return { title: '', subtitle: '', icon: null };
  };

  const isLoading = dashboardLoading && recentLoading;

  const head = getContentHeaderInfo();
  const HeadIcon = head.icon;
  const loadingAny = dashboardLoading || recentLoading || olderLoading;
  const userRole = (() => { const storedUser = localStorage.getItem('user'); return storedUser ? JSON.parse(storedUser).role : null; })();
  const resetPages = () => {
    setCurrentPageUnassigned(1);
    setCurrentPageVerification(1);
    setCurrentPageAllOrders(1);
    setTechnicianCurrentPages({});
  };

  const syncRecordings = async () => {
    try {
      toast.info('Slanje sync notifikacije...');
      const response = await workOrdersAPI.triggerSyncRecordings();
      toast.success(`Sync notifikacija poslata ${response.data.successCount} tehničarima`);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error(err.response?.data?.error || 'Greška pri slanju sync notifikacije');
    }
  };

  // Stavka levog menija (Svi radni nalozi, Za verifikaciju, Nedodeljeni): ikonica, naziv, broj, pogodak pretrage
  const navItem = (tab, Icon, label, count) => {
    const on = activeTab === tab;
    const hit = searchTerm && searchMatchCounts[tab] > 0 && !on;
    return (
      <button type="button" onClick={() => handleSidebarItemClick(tab, null)} className={cx('mx-wo__nav', on && 'is-on', hit && 'is-hit')} aria-current={on ? 'true' : undefined} data-testid={`wo-nav-${tab}`}>
        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
        <span className="mx-wo__nav-label">{label}</span>
        <span className="mx-wo__nav-count">{count}</span>
        {hit && <span className="mx-wo__hit">({searchMatchCounts[tab]})</span>}
      </button>
    );
  };

  // Render sidebar content (shared between desktop and mobile overlay)
  const renderSidebarContent = () => (
    <div className="mx-wo__sidein">
      <div className="mx-wo__navs">
        {navItem('all', ClipboardList, 'Svi radni nalozi', getAllWorkOrders().length)}
        {navItem('verification', Check, 'Za verifikaciju', verificationOrders.length)}
        {navItem('unassigned', UserX, 'Nedodeljeni', getAllUnassignedOrders().length)}
        <div className="mx-wo__divider" />
        <div className="mx-wo__sidehead">
          <span className="sx-label">Tehničari</span>
          <span className="mx-wo__sidecount">{filteredSidebarTechnicians.length}</span>
        </div>
      </div>

      {/* Technician cards - scrollable */}
      <div className="mx-wo__techs">
        {filteredSidebarTechnicians.map(([techId, techData]) => {
          const isActive = activeTab === 'technicians' && selectedTechnicianId === techId;
          const tech = techData.technicianInfo;
          const total = techData.workOrders.length;
          const completed = techData.workOrders.filter(o => o.status === 'zavrsen').length;
          const active = techData.workOrders.filter(o => o.status === 'nezavrsen').length;
          const postponed = techData.workOrders.filter(o => o.status === 'odlozen').length;
          const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const hit = searchTerm && searchMatchCounts[techId] > 0 && !isActive;

          return (
            <button
              type="button"
              key={techId}
              onClick={() => handleSidebarItemClick('technicians', techId)}
              className={cx('mx-wo__tech', isActive && 'is-on', hit && 'is-hit')}
              aria-current={isActive ? 'true' : undefined}
              data-testid="wo-tech"
            >
              {/* Top row: avatar + name + phone */}
              <div className="mx-wo__tech-top">
                <Avatar name={tech.name} />
                <div className="mx-wo__tech-name">
                  <b>{tech.name}</b>
                  <span>{tech.phone}</span>
                </div>
                {hit && <span className="mx-wo__hit">({searchMatchCounts[techId]})</span>}
              </div>

              {/* Stats row */}
              <div className="mx-wo__stats">
                <div className="mx-wo__stat" onClick={(e) => handleStatClick(techId, '', e)}><b>{total}</b><span>Sve</span></div>
                <div className="mx-wo__stat is-ok" onClick={(e) => handleStatClick(techId, 'zavrsen', e)}><b>{completed}</b><span>OK</span></div>
                <div className="mx-wo__stat is-warn" onClick={(e) => handleStatClick(techId, 'nezavrsen', e)}><b>{active}</b><span>Akt</span></div>
                <div className="mx-wo__stat is-info" onClick={(e) => handleStatClick(techId, 'odlozen', e)}><b>{postponed}</b><span>Odl</span></div>
              </div>

              {/* Progress bar */}
              <div className="mx-wo__bar" aria-hidden="true"><span style={{ width: `${completionPct}%` }} /></div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const orders = getCurrentOrders();
  const paginatedOrders = getCurrentPaginatedOrders();
  const ordersToRender = (activeTab === 'all' && dateFilter) ? paginatedOrders : sortByDate(paginatedOrders);
  const showTime = activeTab === 'all' || activeTab === 'technicians';
  const isVerification = activeTab === 'verification';

  return (
    <div className="sx-page mx-wo" data-testid="page-work-orders">
      {/* 1. Gornja traka */}
      <header className="mx-wo__top">
        <div className="mx-wo__top-left">
          {/* Mobile hamburger */}
          <button type="button" className="mx-wo__burger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Meni radnih naloga" aria-expanded={sidebarOpen} data-testid="wo-sidebar-toggle">
            <Menu size={18} strokeWidth={1.9} />
          </button>
          <Wrench className="mx-wo__top-icon" size={18} strokeWidth={1.9} aria-hidden="true" />
          <h1 className="mx-wo__title">Radni nalozi</h1>
          <span className="mx-wo__top-sep" aria-hidden="true" />
          <span className="mx-wo__top-meta">{activeTechnicians.length} tehničara</span>
          <span className="mx-wo__top-meta" aria-hidden="true">&middot;</span>
          <span className="mx-wo__top-meta">{getAllWorkOrders().length} naloga</span>
        </div>
        <div className="mx-wo__top-right">
          <LinkBtn to="/work-orders/add" size="sm" variant="primary" icon={Plus} aria-label="Novi nalog"><span className="mx-wo__lbl">Novi nalog</span></LinkBtn>
          <LinkBtn to="/work-orders/upload" size="sm" icon={Upload} aria-label="Import"><span className="mx-wo__lbl">Import</span></LinkBtn>
          {(userRole === 'superadmin' || userRole === 'supervisor') && (
            <Btn size="sm" icon={RefreshCw} onClick={syncRecordings} aria-label="Sync snimke"><span className="mx-wo__lbl">Sync snimke</span></Btn>
          )}
        </div>
      </header>

      {/* Error display */}
      {error && <Note tone="bad" className="mx-wo__error">{error}</Note>}

      {/* 2. Search Strip */}
      <div className="mx-wo__filters" data-testid="wo-filters">
        <SearchField
          className="mx-wo__search"
          value={searchTerm}
          onChange={(v) => { setSearchTerm(v); resetPages(); }}
          placeholder="Pretraga po adresi, korisniku, serijskom broju..."
          testId="wo-search"
        />
        {!allLoaded && (
          <Btn size="sm" variant="primary" icon={allLoadingInProgress ? Spin : undefined} onClick={fetchAllWorkOrders} disabled={allLoadingInProgress}>
            {allLoadingInProgress ? 'Učitava...' : 'Učitaj sve naloge'}
          </Btn>
        )}
        {allLoaded && <State tone="ok">Svi nalozi učitani</State>}
        <Select size="sm" aria-label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPages(); }}>
          <option value="">Svi statusi</option>
          <option value="zavrsen">Završeni</option>
          <option value="nezavrsen">Nezavršeni</option>
          <option value="odlozen">Odloženi</option>
          <option value="otkazan">Otkazani</option>
        </Select>
        {(activeTab === 'all' || activeTab === 'verification') && (
          <Select size="sm" aria-label="Tehničar" value={technicianFilter} onChange={(e) => { setTechnicianFilter(e.target.value); resetPages(); }}>
            <option value="">Svi tehničari</option>
            {activeTechnicians.map(tech => (
              <option key={tech._id} value={tech._id}>{tech.name}</option>
            ))}
          </Select>
        )}
        {activeTab === 'all' && (
          <DateField compact clearable aria-label="Datum" value={dateFilter} onChange={(v) => { setDateFilter(v); setCurrentPageAllOrders(1); }} />
        )}
        {activeTab === 'all' && dateFilter && (
          <Select size="sm" aria-label="Redosled po vremenu" value={timeSortOrder} onChange={(e) => { setTimeSortOrder(e.target.value); setCurrentPageAllOrders(1); }}>
            <option value="asc">Najstarije &rarr; Najnovije</option>
            <option value="desc">Najnovije &rarr; Najstarije</option>
          </Select>
        )}
        <Btn size="sm" variant="ghost" onClick={resetFilters}>Resetuj</Btn>
        <Btn size="sm" variant="ghost" icon={loadingAny ? Spin : RefreshCw} onClick={fetchData} disabled={dashboardLoading || recentLoading} aria-label="Osveži">
          <span className="mx-wo__lbl">Osveži</span>
        </Btn>
      </div>

      {/* 3. Main area: Sidebar + Content */}
      <div className="mx-wo__main">
        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && <div className="mx-wo__scrim" onClick={() => setSidebarOpen(false)} />}

        {/* Left Sidebar */}
        <aside className={cx('mx-wo__side', sidebarOpen && 'is-open')} data-testid="wo-sidebar">
          {renderSidebarContent()}
        </aside>

        {/* Right Content Area */}
        <section className="mx-wo__content" data-testid="wo-orders">
          {isLoading ? (
            <div className="mx-wo__body"><Loading text="Učitavanje podataka..." rows={6} /></div>
          ) : (
            <>
              {/* Content header */}
              <div className="mx-wo__head">
                <div className="mx-wo__head-title">
                  {HeadIcon && <HeadIcon className="mx-wo__head-icon" size={16} strokeWidth={1.9} aria-hidden="true" />}
                  <div className="mx-wo__head-text">
                    <h2>{head.title}</h2>
                    <p>
                      {head.subtitle}
                      {recentLoading && <span className="mx-wo__head-note">(učitavanje...)</span>}
                      {olderLoading && <span className="mx-wo__head-note">(stariji nalozi...)</span>}
                    </p>
                  </div>
                </div>

                {/* Quick filter chips for technician view */}
                {activeTab === 'technicians' && selectedTechnicianId && (
                  <Choice
                    size="sm"
                    label="Status"
                    layoutId="mx-wo-chips"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setTechnicianCurrentPages(prev => ({ ...prev, [selectedTechnicianId]: 1 }));
                    }}
                    options={[
                      { value: '', label: 'Svi' },
                      { value: 'zavrsen', label: 'Završeni' },
                      { value: 'nezavrsen', label: 'Nezavršeni' },
                      { value: 'odlozen', label: 'Odloženi' }
                    ]}
                  />
                )}
              </div>

              {/* Table container */}
              <div className="mx-wo__body">
                {activeTab === 'technicians' && !selectedTechnicianId ? (
                  <div className="mx-wo__empty">
                    <UserRound size={44} strokeWidth={1.4} aria-hidden="true" />
                    <p>Izaberite tehničara iz menija sa leve strane</p>
                  </div>
                ) : isVerification && verificationLoading ? (
                  <Loading text="Učitavanje naloga za verifikaciju..." rows={6} />
                ) : orders.length === 0 ? (
                  <div className="mx-wo__empty">
                    <ClipboardList size={44} strokeWidth={1.4} aria-hidden="true" />
                    <p>Nema radnih naloga koji odgovaraju filterima</p>
                  </div>
                ) : (
                  <div className="sx-tablewrap">
                    <table className="sx-table mx-wo__table" data-testid="wo-table">
                      <thead>
                        <tr>
                          <th>Datum</th>
                          {showTime && <th>Vreme</th>}
                          <th>Opština</th>
                          <th>Adresa</th>
                          <th>Korisnik</th>
                          <th>Tip</th>
                          <th>Tehničar</th>
                          {!isVerification && <th>Status</th>}
                          <th>Akcije</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersToRender.map((order, i) => {
                          const technician = technicians.find(tech => tech._id === (order.technicianId?._id || order.technicianId));
                          return (
                            <tr
                              key={order._id}
                              className="is-click"
                              tabIndex={0}
                              style={{ '--i': i, ...getTimRowStyle(order.tim) }}
                              onClick={(e) => navigateToOrderDetails(order._id, e)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) navigateToOrderDetails(order._id, e); }}
                              data-testid="wo-row"
                            >
                              <td className="is-head"><span className="sx-mono mx-strong">{formatDate(order.date)}</span></td>
                              {showTime && <td data-label="Vreme"><span className="sx-mono">{order.time || '-'}</span></td>}
                              <td data-label="Opština">{order.municipality}</td>
                              <td data-label="Adresa" className="is-wide">{order.address}</td>
                              <td data-label="Korisnik">{order.userName || 'Nepoznat'}</td>
                              <td data-label="Tip">{order.type}</td>
                              <td data-label="Tehničar">{technician ? technician.name : getTechnicianName(order)}</td>
                              {!isVerification && (
                                <td data-label="Status">
                                  <span className="mx-inline">
                                    {renderStatusBadge(order.status)}
                                    {order.status === 'zavrsen' && order.verified && (
                                      <span className="sx-tag is-ok mx-wo__verified" title="Verifikovano" aria-label="Verifikovano"><Check strokeWidth={2.4} /></span>
                                    )}
                                  </span>
                                </td>
                              )}
                              <td className="is-actions">
                                {isVerification ? (
                                  <div className="mx-wo__vacts">
                                    <div className="sx-rowacts">
                                      <LinkBtn size="sm" variant="ghost" icon={Eye} to={`/work-orders/${order._id}?fromVerification=true`} state={{ backgroundLocation: location }} onClick={(e) => e.stopPropagation()}>Detalji</LinkBtn>
                                      <Btn size="sm" icon={UserCheck} onClick={(e) => { e.stopPropagation(); openCustomerStatusModal(order._id); }}>Status</Btn>
                                      <Btn size="sm" variant="primary" icon={Check} onClick={(e) => { e.stopPropagation(); handleVerifyOrder(order._id); }}>Verifikuj</Btn>
                                      <Btn size="sm" icon={loadingAIVerification === order._id ? Spin : Sparkles} disabled={loadingAIVerification === order._id}
                                        onClick={(e) => { e.stopPropagation(); handleAIVerify(order._id); }}>
                                        {loadingAIVerification === order._id ? 'AI...' : 'Verifikuj sa AI'}
                                      </Btn>
                                    </div>
                                    {orderStatuses[order._id]
                                      ? <span className="mx-wo__cstatus">{orderStatuses[order._id]}</span>
                                      : <span className="mx-wo__cstatus is-empty">Kliknite &quot;Status&quot; da postavite</span>}
                                  </div>
                                ) : (
                                  <div className="sx-rowacts mx-wo__acts">
                                    <LinkBtn size="sm" variant="ghost" icon={Eye} to={`/work-orders/${order._id}`} state={{ backgroundLocation: location }} onClick={(e) => e.stopPropagation()}>Detalji</LinkBtn>
                                    <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" aria-label="Obriši"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(order._id); }} />
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer/Pagination */}
              {orders.length > 0 && (
                <div className="mx-wo__foot">
                  <span className="mx-pager__text">Prikazano {paginatedOrders.length} od {orders.length}</span>
                  <Pager className="mx-wo__pager" page={getCurrentPage()} total={orders.length} perPage={itemsPerPage} onPage={handleCurrentPageChange} />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog
        open={customerStatusModal.isOpen}
        onClose={closeCustomerStatusModal}
        title="Status korisnika"
        description="Izaberite status korisnika za ovaj radni nalog"
        size="lg"
        testId="customer-status-dialog"
        footer={<Btn onClick={closeCustomerStatusModal}>Otkaži</Btn>}
      >
        <div className="mx-wo__statuses">
          {CUSTOMER_STATUSES.map((status) => {
            const on = orderStatuses[customerStatusModal.orderId] === status;
            return (
              <button key={status} type="button" className={cx('mx-wo__status', on && 'is-on')} aria-pressed={on}
                onClick={() => handleCustomerStatusChange(customerStatusModal.orderId, status)}>
                <span>{status}</span>
                {on && <Check size={18} strokeWidth={2.2} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </Dialog>

      {/* AI Verification Modal */}
      <AIVerificationModal
        isOpen={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAIVerificationResult(null);
        }}
        result={aiVerificationResult}
        loading={loadingAIVerification !== null}
        onAccept={handleAcceptAI}
        onReject={handleRejectAI}
      />

      <ReturnWorkOrderModal
        isOpen={aiReturnModal.isOpen}
        workOrderId={aiReturnModal.orderId}
        initialComment={aiReturnModal.comment}
        source="ai"
        onClose={() => setAiReturnModal({ isOpen: false, orderId: null, comment: '' })}
        onReturned={handleAIReturned}
      />
    </div>
  );
};

export default WorkOrdersByTechnician;
