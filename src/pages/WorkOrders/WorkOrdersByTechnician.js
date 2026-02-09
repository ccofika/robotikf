import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, DeleteIcon, UserIcon, UserSlashIcon, ToolsIcon, CheckIcon, AlertIcon, RefreshIcon, ClipboardIcon, PlusIcon, UserCheckIcon, XIcon, TableIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import AIVerificationModal from '../../components/AIVerificationModal';
import FancyDataTable from '../../components/fancy-table/FancyDataTable';

const WorkOrdersByTechnician = () => {
  const [searchParams] = useSearchParams();
  const [technicians, setTechnicians] = useState([]);

  // Optimized state management with priority-based loading
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [olderWorkOrders, setOlderWorkOrders] = useState([]);
  const [recentUnassigned, setRecentUnassigned] = useState([]);
  const [olderUnassigned, setOlderUnassigned] = useState([]);
  const [verificationOrders, setVerificationOrders] = useState([]);
  // Removed unused state - dashboardStats


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
  const [timeSortOrder, setTimeSortOrder] = useState('asc'); // 'asc' = oldest first, 'desc' = newest first
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'technicians');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [customerStatusModal, setCustomerStatusModal] = useState({ isOpen: false, orderId: null });
  const [orderStatuses, setOrderStatuses] = useState({}); // Store customer status for each order

  // AI Verification states
  const [loadingAIVerification, setLoadingAIVerification] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiVerificationResult, setAIVerificationResult] = useState(null);

  // Fancy table states (for new "pregled" tab)
  const [fancyTableData, setFancyTableData] = useState([]);
  const [fancyTablePagination, setFancyTablePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [fancyTableLoading, setFancyTableLoading] = useState(false);
  const [fancyTableFilters, setFancyTableFilters] = useState({
    status: '',
    technician: '',
    municipality: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    verified: ''
  });
  const [fancyTableSearch, setFancyTableSearch] = useState('');
  const [fancyTableRefreshing, setFancyTableRefreshing] = useState(false);

  // Removed unused hook - navigate
  
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

  // Prati promene u URL parametrima i automatski postavlja tab i search
  useEffect(() => {
    const tab = searchParams.get('tab');
    const search = searchParams.get('search');

    // Postavi tab ako postoji u URL-u (bez provere trenutne vrednosti)
    if (tab) {
      setActiveTab(tab);

      // Lazy load verification data when tab is accessed
      if (tab === 'verification' && !verificationDataLoaded) {
        fetchVerificationOrders();
      }
    }

    // Postavi search ako postoji u URL-u (bez provere trenutne vrednosti)
    if (search) {
      setSearchTerm(search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, verificationDataLoaded]);

  // Handle tab changes and lazy loading
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);

    // Lazy load verification data when tab is clicked
    if (tabName === 'verification' && !verificationDataLoaded) {
      fetchVerificationOrders();
    }

    // Load fancy table data when pregled tab is clicked
    if (tabName === 'pregled') {
      fetchFancyTableData();
    }
  };

  // Fetch data for fancy table (server-side pagination)
  const fetchFancyTableData = async (page) => {
    setFancyTableLoading(true);
    try {
      const currentPage = page || fancyTablePagination?.currentPage || 1;
      const currentLimit = fancyTablePagination?.limit || 20;

      const params = {
        page: currentPage.toString(),
        limit: currentLimit.toString(),
        search: fancyTableSearch,
        status: fancyTableFilters.status,
        municipality: fancyTableFilters.municipality,
        technician: fancyTableFilters.technician
      };

      console.log('Fetching fancy table data with params:', params);

      const response = await workOrdersAPI.getAll(params);
      console.log('API Response:', response.data);

      // Backend vraća podatke u response.data direktno ili u response.data objektu
      const workOrders = response.data.workOrders || response.data || [];
      const pagination = response.data.pagination;

      console.log('Work Orders:', workOrders);
      console.log('Pagination:', pagination);

      setFancyTableData(Array.isArray(workOrders) ? workOrders : []);

      if (pagination) {
        setFancyTablePagination(pagination);
      } else {
        // Ako backend ne vraća pagination strukturu, kreiraj je manualno
        setFancyTablePagination({
          currentPage: currentPage,
          totalPages: 1,
          totalCount: Array.isArray(workOrders) ? workOrders.length : 0,
          limit: currentLimit,
          hasNextPage: false,
          hasPreviousPage: false
        });
      }
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setFancyTableLoading(false);
    }
  };

  // Handle fancy table page change
  const handleFancyTablePageChange = (newPage) => {
    setFancyTablePagination(prev => ({ ...prev, currentPage: newPage }));
  };

  // Handle fancy table filter change
  const handleFancyTableFilterChange = (newFilters) => {
    setFancyTableFilters(newFilters);
    setFancyTablePagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle fancy table search change
  const handleFancyTableSearchChange = (value) => {
    setFancyTableSearch(value);
    setFancyTablePagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle fancy table refresh
  const handleFancyTableRefresh = async () => {
    setFancyTableRefreshing(true);
    await fetchFancyTableData(fancyTablePagination?.currentPage || 1);
    setFancyTableRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  // Fetch fancy table data when filters, search, or page changes
  useEffect(() => {
    if (activeTab === 'pregled') {
      fetchFancyTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fancyTablePagination?.currentPage, fancyTableSearch, fancyTableFilters]);
  
  // Priority 1: Load dashboard stats and technicians (fastest)
  const fetchDashboardAndTechnicians = async () => {
    setDashboardLoading(true);
    setError('');

    try {
      const techniciansResponse = await techniciansAPI.getAll();
      const techniciansData = techniciansResponse.data;

      setTechnicians(techniciansData);


      // Start loading recent data
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
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll(),
        workOrdersAPI.getUnassigned()
      ]);

      const workOrdersData = workOrdersResponse.data;
      const unassignedData = unassignedResponse.data;

      // Filter for last 3 days
      const recentWorkOrdersData = workOrdersData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= threeDaysAgo;
      });

      const recentUnassignedData = unassignedData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= threeDaysAgo;
      });

      setRecentWorkOrders(recentWorkOrdersData);
      setRecentUnassigned(recentUnassignedData);


      // Start loading older data in background
      setTimeout(() => {
        fetchOlderWorkOrders();
      }, 500);

    } catch (error) {
      console.error('Greška pri učitavanju najnovijih radnih naloga:', error);
      // Don't show error for background loading
    } finally {
      setRecentLoading(false);
    }
  };

  // Priority 3: Load older work orders (background loading)
  const fetchOlderWorkOrders = async () => {
    setOlderLoading(true);

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll(),
        workOrdersAPI.getUnassigned()
      ]);

      const workOrdersData = workOrdersResponse.data;
      const unassignedData = unassignedResponse.data;

      // Filter for older than 3 days
      const olderWorkOrdersData = workOrdersData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate < threeDaysAgo;
      });

      const olderUnassignedData = unassignedData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate < threeDaysAgo;
      });

      setOlderWorkOrders(olderWorkOrdersData);
      setOlderUnassigned(olderUnassignedData);


    } catch (error) {
      console.error('Greška pri učitavanju starijih radnih naloga:', error);
      // Silent background loading
    } finally {
      setOlderLoading(false);
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
    await fetchDashboardAndTechnicians();

    // If verification tab is active, reload it
    if (activeTab === 'verification') {
      await fetchVerificationOrders();
    }
  };
  
  const loadCustomerStatus = async (orderId) => {
    try {
      const response = await workOrdersAPI.getEvidence(orderId);
      const status = response.data.customerStatus || 'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme)';
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    } catch (error) {
      console.error(`Failed to load status for order ${orderId}:`, error);
      const status = 'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme)';
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    }
  };
  
  const handleVerifyOrder = async (orderId) => {
    try {
      // First load the current customer status if not already loaded
      let currentStatus = orderStatuses[orderId];
      if (!currentStatus) {
        currentStatus = await loadCustomerStatus(orderId);
      }
      
      // Check if customer status is set and not the old default value
      if (!currentStatus || currentStatus === 'Nov korisnik') {
        toast.error('Potrebno je prvo postaviti status korisnika pre verifikacije!');
        return;
      }

      await workOrdersAPI.verify(orderId, {});
      toast.success('Radni nalog je uspešno verifikovan!');
      
      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));
      
      // Update in both recent and older work orders
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

      // Try to update in recent orders first, then older orders
      if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
        updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
      }
      
    } catch (error) {
      console.error('Greška pri verifikaciji:', error);
      toast.error('Neuspešna verifikacija radnog naloga!');
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Da li ste sigurni da želite da obrišete ovaj radni nalog?')) {
      try {
        await workOrdersAPI.delete(id);
        toast.success('Radni nalog je uspešno obrisan!');

        // Update both recent and older work orders
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
  
  // Combine recent and older work orders for compatibility
  const getAllWorkOrders = () => {
    return [...recentWorkOrders, ...olderWorkOrders];
  };

  const getAllUnassignedOrders = () => {
    return [...recentUnassigned, ...olderUnassigned];
  };

  const groupWorkOrdersByTechnician = () => {
    const techWorkOrders = {};

    technicians.forEach(tech => {
      techWorkOrders[tech._id] = {
        technicianInfo: tech,
        workOrders: []
      };
    });

    // Combine recent and older work orders
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
  const filterOrders = (orders) => {
    return orders.filter(order => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesTechnician = !technicianFilter ||
        order.technicianId?._id === technicianFilter ||
        order.technicianId === technicianFilter ||
        order.technician2Id?._id === technicianFilter ||
        order.technician2Id === technicianFilter;

      // Date filter - check if order date matches selected date
      let matchesDate = true;
      if (dateFilter) {
        const orderDate = new Date(order.date);
        const filterDate = new Date(dateFilter);
        matchesDate = orderDate.toDateString() === filterDate.toDateString();
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
          // Search by technician name
          order.technicianId?.name?.toLowerCase().includes(searchLower) ||
          order.technician2Id?.name?.toLowerCase().includes(searchLower) ||
          // Search by equipment serial numbers (last 4 digits or full)
          order.equipment?.some(eq =>
            eq.serialNumber?.toLowerCase().includes(searchLower) ||
            eq.serialNumber?.slice(-4).includes(searchTerm)
          ) ||
          // Search by material names
          order.materials?.some(mat =>
            mat.name?.toLowerCase().includes(searchLower)
          );
      }

      return matchesStatus && matchesTechnician && matchesDate && matchesSearch;
    });
  };
  
  // Filtrirani podaci sa paginacijom
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredUnassigned = useMemo(() => filterOrders(getAllUnassignedOrders()), [recentUnassigned, olderUnassigned, statusFilter, technicianFilter, dateFilter, searchTerm]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredVerification = useMemo(() => filterOrders(verificationOrders), [verificationOrders, statusFilter, technicianFilter, dateFilter, searchTerm]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredAllOrders = useMemo(() => {
    const filtered = filterOrders(getAllWorkOrders());
    // Sort by time if date filter is active
    if (dateFilter) {
      return [...filtered].sort((a, b) => {
        // Combine date and time for proper sorting
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        // Parse time strings (format: "HH:MM")
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
  }, [recentWorkOrders, olderWorkOrders, statusFilter, technicianFilter, dateFilter, timeSortOrder, searchTerm]);
  
  // Paginacija za nedodeljene naloge
  const indexOfLastUnassigned = currentPageUnassigned * itemsPerPage;
  const indexOfFirstUnassigned = indexOfLastUnassigned - itemsPerPage;
  const currentUnassignedItems = filteredUnassigned.slice(indexOfFirstUnassigned, indexOfLastUnassigned);
  const totalPagesUnassigned = Math.ceil(filteredUnassigned.length / itemsPerPage);
  
  // Paginacija za verifikaciju
  const indexOfLastVerification = currentPageVerification * itemsPerPage;
  const indexOfFirstVerification = indexOfLastVerification - itemsPerPage;
  const currentVerificationItems = filteredVerification.slice(indexOfFirstVerification, indexOfLastVerification);
  const totalPagesVerification = Math.ceil(filteredVerification.length / itemsPerPage);
  
  // Paginacija za sve radne naloge
  const indexOfLastAllOrders = currentPageAllOrders * itemsPerPage;
  const indexOfFirstAllOrders = indexOfLastAllOrders - itemsPerPage;
  const currentAllOrdersItems = filteredAllOrders.slice(indexOfFirstAllOrders, indexOfLastAllOrders);
  const totalPagesAllOrders = Math.ceil(filteredAllOrders.length / itemsPerPage);
  
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
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'zavrsen': return 'Završen';
      case 'nezavrsen': return 'Nezavršen';
      case 'odlozen': return 'Odložen';
      case 'otkazan': return 'Otkazan';
      default: return status;
    }
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
  
  const openCustomerStatusModal = async (orderId) => {
    // Load customer status when modal opens if not already loaded
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
  
  const getCustomerStatusColor = (status) => {
    if (status?.includes('HFC KDS')) return 'bg-blue-100 text-blue-800';
    if (status?.includes('GPON')) return 'bg-green-100 text-green-800';
    if (status?.includes('montažnim radovima')) return 'bg-yellow-100 text-yellow-800';
    if (status?.includes('bez montažnih radova')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
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

      // 1. Postavi customerStatus
      await workOrdersAPI.updateCustomerStatus(orderId, {
        customerStatus: aiVerificationResult.customerStatus
      });

      // 2. Verifikuj radni nalog
      await workOrdersAPI.verify(orderId, {});

      toast.success('Radni nalog je uspešno verifikovan!');

      // Ukloni nalog iz liste verifikacije
      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

      // Update in work orders lists
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

      // Zatvori modal
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

      // Vrati nalog tehničaru sa AI komentarom
      await workOrdersAPI.returnIncorrect(orderId, {
        adminComment: `AI VERIFIKACIJA:\n\n${aiVerificationResult.reason}`
      });

      toast.info('Radni nalog je vraćen tehničaru');

      // Ukloni nalog iz liste verifikacije
      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

      // Update order status
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

      // Zatvori modal
      setShowAIModal(false);
      setAIVerificationResult(null);

    } catch (error) {
      console.error('Error rejecting AI recommendation:', error);
      toast.error('Greška pri vraćanju radnog naloga');
    }
  };
  
  // Komponenta za paginaciju
  const PaginationComponent = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          type="secondary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(1, e);
          }}
          disabled={currentPage === 1}
        >
          &laquo;
        </Button>
        
        <Button
          type="secondary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(currentPage - 1, e);
          }}
          disabled={currentPage === 1}
        >
          &lsaquo;
        </Button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(number => {
            return (
              number === 1 ||
              number === totalPages ||
              Math.abs(number - currentPage) <= 1
            );
          })
          .map(number => (
            <Button
              key={number}
              type={currentPage === number ? "primary" : "secondary"}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onPageChange(number, e);
              }}
            >
              {number}
            </Button>
          ))}
        
        <Button
          type="secondary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(currentPage + 1, e);
          }}
          disabled={currentPage === totalPages}
        >
          &rsaquo;
        </Button>
        
        <Button
          type="secondary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(totalPages, e);
          }}
          disabled={currentPage === totalPages}
        >
          &raquo;
        </Button>
      </div>
    );
  };

  // Funkcija za navigaciju na detalje radnog naloga u novom tabu
  const navigateToOrderDetails = (orderId, event) => {
    if (event.target.closest('.delete-btn') || event.target.closest('.verify-btn')) {
      return;
    }

    // Ako dolazi sa verification taba, dodaj query param
    const isFromVerification = activeTab === 'verification';
    const url = isFromVerification
      ? `/work-orders/${orderId}?fromVerification=true`
      : `/work-orders/${orderId}`;

    window.open(url, '_blank');
  };

  // Funkcija za handleovanje klika na statistike tehničara
  const handleStatClick = (techId, status, event) => {
    event.stopPropagation();
    
    // Postaviti status filter
    setStatusFilter(status);
    
    // Otvoriti expandovanu karticu ako nije već otvorena
    if (selectedTechnicianId !== techId) {
      setSelectedTechnicianId(techId);
    }
    
    // Reset paginacije za ovog tehničara
    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: 1
    }));
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header Section */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <ToolsIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Radni nalozi po tehničarima</h1>
              <p className="text-slate-600 mt-1">Upravljanje i praćenje radnih naloga po tehničarima</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button type="primary" size="medium" prefix={<PlusIcon size={16} />} asChild>
              <Link to="/work-orders/add">
                Novi nalog
              </Link>
            </Button>
            <Button type="secondary" size="medium" asChild>
              <Link to="/work-orders/upload">
                Import
              </Link>
            </Button>
            {/* Sync snimke button - samo za superadmin i supervisor */}
            {(() => {
              const storedUser = localStorage.getItem('user');
              const userRole = storedUser ? JSON.parse(storedUser).role : null;
              if (userRole === 'superadmin' || userRole === 'supervisor') {
                return (
                  <Button
                    type="secondary"
                    size="medium"
                    prefix={<RefreshIcon size={16} />}
                    onClick={async () => {
                      try {
                        toast.info('Slanje sync notifikacije...');
                        const response = await workOrdersAPI.triggerSyncRecordings();
                        toast.success(`Sync notifikacija poslata ${response.data.successCount} tehničarima`);
                      } catch (error) {
                        console.error('Sync error:', error);
                        toast.error(error.response?.data?.error || 'Greška pri slanju sync notifikacije');
                      }
                    }}
                  >
                    Sync snimke
                  </Button>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-6 bg-slate-100 rounded-lg p-4">
          <button
            onClick={() => handleTabChange('technicians')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'technicians' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <UserIcon size={16} />
            <span>Tehničari</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {Object.keys(technicianWorkOrders).length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('unassigned')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'unassigned' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <UserSlashIcon size={16} />
            <span>Nedodeljeni</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {getAllUnassignedOrders().length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('verification')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'verification' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <CheckIcon size={16} />
            <span>Za verifikaciju</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {verificationOrders.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('all')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <ClipboardIcon size={16} />
            <span>Svi radni nalozi</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {getAllWorkOrders().length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('pregled')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'pregled' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <TableIcon size={16} />
            <span>Pregled radnih naloga</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {fancyTablePagination?.totalCount || 0}
            </span>
          </button>
        </div>
      </div>
      
      {/* Search and Filters - Hide for pregled tab */}
      {activeTab !== 'pregled' && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Pretraga po adresi, korisniku, serijskom broju, tehničaru..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPageUnassigned(1);
                      setCurrentPageVerification(1);
                      setCurrentPageAllOrders(1);
                      setTechnicianCurrentPages({});
                    }}
                    className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPageUnassigned(1);
                      setCurrentPageVerification(1);
                      setCurrentPageAllOrders(1);
                      setTechnicianCurrentPages({});
                    }}
                    className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                  >
                    <option value="">Svi statusi</option>
                    <option value="zavrsen">Završeni</option>
                    <option value="nezavrsen">Nezavršeni</option>
                    <option value="odlozen">Odloženi</option>
                    <option value="otkazan">Otkazani</option>
                  </select>
                  <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>

                {/* Technician Filter */}
                {(activeTab === 'all' || activeTab === 'verification') && (
                  <div className="relative">
                    <select
                      value={technicianFilter}
                      onChange={(e) => {
                        setTechnicianFilter(e.target.value);
                        setCurrentPageUnassigned(1);
                        setCurrentPageVerification(1);
                        setCurrentPageAllOrders(1);
                        setTechnicianCurrentPages({});
                      }}
                      className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                    >
                      <option value="">Svi tehničari</option>
                      {technicians.map(tech => (
                        <option key={tech._id} value={tech._id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                    <UserIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                )}

                {/* Date Filter - Only for "all" tab */}
                {activeTab === 'all' && (
                  <>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => {
                          setDateFilter(e.target.value);
                          setCurrentPageAllOrders(1);
                        }}
                        className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                      />
                    </div>

                    {/* Time Sort Order - Only show when date filter is active */}
                    {dateFilter && (
                      <div className="relative">
                        <select
                          value={timeSortOrder}
                          onChange={(e) => {
                            setTimeSortOrder(e.target.value);
                            setCurrentPageAllOrders(1);
                          }}
                          className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                        >
                          <option value="asc">Najstarije → Najnovije</option>
                          <option value="desc">Najnovije → Najstarije</option>
                        </select>
                        <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-3">
                <Button type="tertiary" size="small" prefix={<RefreshIcon size={16} />} onClick={resetFilters}>
                  Resetuj
                </Button>
                <Button
                  type="secondary"
                  size="small"
                  prefix={<RefreshIcon size={16} className={(dashboardLoading || recentLoading || olderLoading) ? 'animate-spin' : ''} />}
                  onClick={fetchData}
                  disabled={dashboardLoading || recentLoading}
                >
                  Osveži
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {(dashboardLoading && recentLoading) ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Učitavanje osnovnih podataka...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab za tehničare */}
          {activeTab === 'technicians' && (
            <div>
              {Object.keys(technicianWorkOrders).length === 0 ? (
                <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12 text-center">
                  <UserIcon size={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Nema tehničara u sistemu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(technicianWorkOrders).map(([techId, techData]) => {
                    const filteredTechOrders = filterOrders(techData.workOrders);
                    
                    const currentPageTech = technicianCurrentPages[techId] || 1;
                    const indexOfLastTech = currentPageTech * itemsPerPage;
                    const indexOfFirstTech = indexOfLastTech - itemsPerPage;
                    const currentTechItems = filteredTechOrders.slice(indexOfFirstTech, indexOfLastTech);
                    const totalPagesTech = Math.ceil(filteredTechOrders.length / itemsPerPage);
                    
                    return (
                      <div 
                        key={techId} 
                        className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
                      >
                        <div 
                          className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setSelectedTechnicianId(prevId => prevId === techId ? '' : techId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 bg-blue-50 rounded-xl">
                                <UserIcon size={20} className="text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">{techData.technicianInfo.name}</h3>
                                <p className="text-slate-600">{techData.technicianInfo.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div 
                                className="text-center cursor-pointer p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                onClick={(e) => handleStatClick(techId, '', e)}
                                title="Klikni da prikažeš sve naloge"
                              >
                                <div className="text-xl font-bold text-slate-900">{techData.workOrders.length}</div>
                                <div className="text-xs text-slate-600">Ukupno</div>
                              </div>
                              <div 
                                className="text-center cursor-pointer p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                                onClick={(e) => handleStatClick(techId, 'nezavrsen', e)}
                                title="Klikni da prikažeš nezavršene naloge"
                              >
                                <div className="text-xl font-bold text-yellow-600">
                                  {techData.workOrders.filter(o => o.status === 'nezavrsen').length}
                                </div>
                                <div className="text-xs text-slate-600">Nezavršeni</div>
                              </div>
                              <div 
                                className="text-center cursor-pointer p-2 rounded-lg hover:bg-green-50 transition-colors"
                                onClick={(e) => handleStatClick(techId, 'zavrsen', e)}
                                title="Klikni da prikažeš završene naloge"
                              >
                                <div className="text-xl font-bold text-green-600">
                                  {techData.workOrders.filter(o => o.status === 'zavrsen').length}
                                </div>
                                <div className="text-xs text-slate-600">Završeni</div>
                              </div>
                              <div 
                                className="text-center cursor-pointer p-2 rounded-lg hover:bg-orange-50 transition-colors"
                                onClick={(e) => handleStatClick(techId, 'odlozen', e)}
                                title="Klikni da prikažeš odložene naloge"
                              >
                                <div className="text-xl font-bold text-orange-600">
                                  {techData.workOrders.filter(o => o.status === 'odlozen').length}
                                </div>
                                <div className="text-xs text-slate-600">Odloženi</div>
                              </div>
                              <div 
                                className="text-center cursor-pointer p-2 rounded-lg hover:bg-red-50 transition-colors"
                                onClick={(e) => handleStatClick(techId, 'otkazan', e)}
                                title="Klikni da prikažeš otkazane naloge"
                              >
                                <div className="text-xl font-bold text-red-600">
                                  {techData.workOrders.filter(o => o.status === 'otkazan').length}
                                </div>
                                <div className="text-xs text-slate-600">Otkazani</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {selectedTechnicianId === techId && (
                          <div className="border-t border-slate-200 p-6">
                            {filteredTechOrders.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-slate-600">Nema radnih naloga koji odgovaraju pretrazi</p>
                                {olderLoading && <p className="text-slate-500 text-sm mt-2">Učitavanje starijih naloga u pozadini...</p>}
                              </div>
                            ) : (
                              <>
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                      <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opština</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresa</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Korisnik</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {sortByDate(currentTechItems).map((order) => (
                                        <tr 
                                          key={order._id} 
                                          onClick={(e) => navigateToOrderDetails(order._id, e)}
                                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(order.date)}</td>
                                          <td className="px-6 py-4 text-sm text-slate-600">{order.municipality}</td>
                                          <td className="px-6 py-4 text-sm text-slate-600">{order.address}</td>
                                          <td className="px-6 py-4 text-sm text-slate-600">{order.userName || 'Nepoznat'}</td>
                                          <td className="px-6 py-4 text-sm text-slate-600">{order.type}</td>
                                          <td className="px-6 py-4 text-sm">
                                            <span className={cn(
                                              "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                                              order.status === 'zavrsen' && "bg-green-100 text-green-800",
                                              order.status === 'nezavrsen' && "bg-yellow-100 text-yellow-800",
                                              order.status === 'odlozen' && "bg-orange-100 text-orange-800",
                                              order.status === 'otkazan' && "bg-red-100 text-red-800"
                                            )}>
                                              {getStatusLabel(order.status)}
                                            </span>
                                            {order.status === 'zavrsen' && order.verified && (
                                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800" title="Verifikovano">
                                                <CheckIcon size={14} />
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center space-x-2">
                                              <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                                                <Link
                                                  to={`/work-orders/${order._id}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  Detalji
                                                </Link>
                                              </Button>
                                              <Button 
                                                type="error" 
                                                size="tiny" 
                                                prefix={<DeleteIcon size={14} />}
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  handleDelete(order._id); 
                                                }}
                                                className="delete-btn"
                                              />
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                
                                <PaginationComponent 
                                  currentPage={currentPageTech}
                                  totalPages={totalPagesTech}
                                  onPageChange={(page) => paginateTechnician(techId, page)}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Tab za nedodeljene naloge */}
          {activeTab === 'unassigned' && (
            <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <UserSlashIcon size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Nedodeljeni radni nalozi</h2>
                    <p className="text-sm text-slate-600">
                      {recentLoading ? 'Učitavanje najnovijih...' : `${filteredUnassigned.length} naloga`}
                      {olderLoading && <span className="ml-2 text-xs">(učitavanje starijih...)</span>}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {filteredUnassigned.length === 0 ? (
                  <div className="text-center py-12">
                    <UserSlashIcon size={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Nema nedodeljenih radnih naloga</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opština</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresa</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Korisnik</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {sortByDate(currentUnassignedItems).map((order) => (
                            <tr 
                              key={order._id} 
                              onClick={(e) => navigateToOrderDetails(order._id, e)}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(order.date)}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.municipality}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.address}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.userName || 'Nepoznat'}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.type}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={cn(
                                  "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                                  order.status === 'zavrsen' && "bg-green-100 text-green-800",
                                  order.status === 'nezavrsen' && "bg-yellow-100 text-yellow-800",
                                  order.status === 'odlozen' && "bg-orange-100 text-orange-800",
                                  order.status === 'otkazan' && "bg-red-100 text-red-800"
                                )}>
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                                    <Link
                                      to={`/work-orders/${order._id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Detalji
                                    </Link>
                                  </Button>
                                  <Button 
                                    type="error" 
                                    size="tiny" 
                                    prefix={<DeleteIcon size={14} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(order._id);
                                    }}
                                    className="delete-btn"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <PaginationComponent 
                      currentPage={currentPageUnassigned}
                      totalPages={totalPagesUnassigned}
                      onPageChange={paginateUnassigned}
                    />
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Tab za verifikaciju radnih naloga */}
          {activeTab === 'verification' && (
            <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <AlertIcon size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Radni nalozi za verifikaciju</h2>
                    <p className="text-sm text-slate-600">
                      {verificationLoading ? 'Učitavanje...' : `${filteredVerification.length} naloga`}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {verificationLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                      <p className="text-slate-600">Učitavanje naloga za verifikaciju...</p>
                    </div>
                  </div>
                ) : filteredVerification.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertIcon size={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Nema radnih naloga za verifikaciju</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opština</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresa</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Korisnik</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tehničar</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {sortByDate(currentVerificationItems).map((order) => {
                            const technician = technicians.find(tech => tech._id === order.technicianId);
                            return (
                              <tr 
                                key={order._id}
                                onClick={(e) => navigateToOrderDetails(order._id, e)}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(order.date)}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{order.municipality}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{order.address}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{order.userName || 'Nepoznat'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{order.type}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{technician ? technician.name : 'Nepoznat'}</td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="flex flex-col space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                                        <Link
                                          to={`/work-orders/${order._id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Detalji
                                        </Link>
                                      </Button>
                                      <Button 
                                        type="secondary" 
                                        size="tiny" 
                                        prefix={<UserCheckIcon size={14} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openCustomerStatusModal(order._id);
                                        }}
                                      >
                                        Status
                                      </Button>
                                      <Button
                                        type="primary"
                                        size="tiny"
                                        prefix={<CheckIcon size={14} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleVerifyOrder(order._id);
                                        }}
                                        className="verify-btn"
                                      >
                                        Verifikuj
                                      </Button>
                                      <Button
                                        type="success"
                                        size="tiny"
                                        prefix={loadingAIVerification === order._id ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        ) : (
                                          <CheckIcon size={14} />
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAIVerify(order._id);
                                        }}
                                        disabled={loadingAIVerification === order._id}
                                        className="ai-verify-btn"
                                      >
                                        {loadingAIVerification === order._id ? 'AI...' : 'Verifikuj sa AI'}
                                      </Button>
                                    </div>
                                    {orderStatuses[order._id] && (
                                      <div className="text-xs">
                                        <span className={cn(
                                          "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                                          getCustomerStatusColor(orderStatuses[order._id])
                                        )}>
                                          {orderStatuses[order._id]}
                                        </span>
                                      </div>
                                    )}
                                    {!orderStatuses[order._id] && (
                                      <div className="text-xs">
                                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                          Kliknite "Status" da postavite
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <PaginationComponent 
                      currentPage={currentPageVerification}
                      totalPages={totalPagesVerification}
                      onPageChange={paginateVerification}
                    />
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Tab za pregled radnih naloga (fancy table) */}
          {activeTab === 'pregled' && (
            <FancyDataTable
              data={fancyTableData.map(order => ({
                ...order,
                onClick: () => window.open(`/work-orders/${order._id}`, '_blank')
              }))}
              columns={[
                {
                  id: 'date',
                  header: 'Datum',
                  cell: (row) => {
                    const date = new Date(row.date);
                    return date.toLocaleDateString('sr-RS');
                  },
                  className: 'w-32'
                },
                {
                  id: 'time',
                  header: 'Vreme',
                  cell: (row) => row.time || '-',
                  className: 'w-24'
                },
                {
                  id: 'municipality',
                  header: 'Opština',
                  cell: (row) => row.municipality,
                  cellClassName: 'font-medium text-slate-900'
                },
                {
                  id: 'address',
                  header: 'Adresa',
                  cell: (row) => row.address,
                  cellClassName: 'text-slate-700'
                },
                {
                  id: 'userName',
                  header: 'Korisnik',
                  cell: (row) => row.userName || 'Nepoznat',
                  cellClassName: 'text-slate-700'
                },
                {
                  id: 'type',
                  header: 'Tip',
                  cell: (row) => row.type,
                  cellClassName: 'text-slate-700'
                },
                {
                  id: 'technician',
                  header: 'Tehničar',
                  cell: (row) => {
                    if (row.technicianId?.name) return row.technicianId.name;
                    if (row.technicianId) {
                      const tech = technicians.find(t => t._id === row.technicianId);
                      return tech?.name || 'Nepoznat';
                    }
                    return 'Nedodeljen';
                  },
                  cellClassName: 'text-slate-700'
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                        row.status === 'zavrsen' && "bg-green-100 text-green-800",
                        row.status === 'nezavrsen' && "bg-yellow-100 text-yellow-800",
                        row.status === 'odlozen' && "bg-orange-100 text-orange-800",
                        row.status === 'otkazan' && "bg-red-100 text-red-800"
                      )}>
                        {getStatusLabel(row.status)}
                      </span>
                      {row.status === 'zavrsen' && row.verified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800" title="Verifikovano">
                          <CheckIcon size={14} />
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  id: 'actions',
                  header: 'Akcije',
                  cell: (row) => (
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                        <Link
                          to={`/work-orders/${row._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Detalji
                        </Link>
                      </Button>
                      <Button
                        type="error"
                        size="tiny"
                        prefix={<DeleteIcon size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(row._id);
                        }}
                      />
                    </div>
                  ),
                  className: 'w-48 text-right'
                }
              ]}
              pagination={fancyTablePagination}
              onPageChange={handleFancyTablePageChange}
              loading={fancyTableLoading}
              filterFields={[
                {
                  id: 'status',
                  label: 'Status radnog naloga',
                  type: 'select',
                  options: [
                    { value: 'zavrsen', label: 'Završen' },
                    { value: 'nezavrsen', label: 'Nezavršen' },
                    { value: 'odlozen', label: 'Odložen' },
                    { value: 'otkazan', label: 'Otkazan' }
                  ]
                },
                {
                  id: 'verified',
                  label: 'Status verifikacije',
                  type: 'select',
                  options: [
                    { value: 'true', label: 'Verifikovano' },
                    { value: 'false', label: 'Nije verifikovano' }
                  ]
                },
                {
                  id: 'technician',
                  label: 'Tehničar',
                  type: 'select',
                  options: technicians.map(tech => ({
                    value: tech._id,
                    label: tech.name
                  }))
                },
                {
                  id: 'municipality',
                  label: 'Opština',
                  type: 'select',
                  options: [
                    ...new Set(fancyTableData.map(order => order.municipality).filter(Boolean))
                  ].map(municipality => ({
                    value: municipality,
                    label: municipality
                  }))
                },
                {
                  id: 'type',
                  label: 'Tip radnog naloga',
                  type: 'select',
                  options: [
                    ...new Set(fancyTableData.map(order => order.type).filter(Boolean))
                  ].map(type => ({
                    value: type,
                    label: type
                  }))
                },
                {
                  id: 'dateFrom',
                  label: 'Datum od',
                  type: 'date'
                },
                {
                  id: 'dateTo',
                  label: 'Datum do',
                  type: 'date'
                }
              ]}
              onFilterChange={handleFancyTableFilterChange}
              filters={fancyTableFilters}
              searchValue={fancyTableSearch}
              onSearchChange={handleFancyTableSearchChange}
              onRefresh={handleFancyTableRefresh}
              isRefreshing={fancyTableRefreshing}
            />
          )}

          {/* Tab za sve radne naloge */}
          {activeTab === 'all' && (
            <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ClipboardIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Svi radni nalozi</h2>
                    <p className="text-sm text-slate-600">
                      {recentLoading ? 'Učitavanje najnovijih...' : `${filteredAllOrders.length} naloga`}
                      {olderLoading && <span className="ml-2 text-xs">(učitavanje starijih...)</span>}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {filteredAllOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardIcon size={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Nema radnih naloga koji odgovaraju filterima</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vreme</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opština</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresa</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Korisnik</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tehničar</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(dateFilter ? currentAllOrdersItems : sortByDate(currentAllOrdersItems)).map((order) => (
                            <tr
                              key={order._id}
                              onClick={(e) => navigateToOrderDetails(order._id, e)}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(order.date)}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.time || '-'}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.municipality}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.address}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.userName || 'Nepoznat'}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{order.type}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{getTechnicianName(order)}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={cn(
                                  "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                                  order.status === 'zavrsen' && "bg-green-100 text-green-800",
                                  order.status === 'nezavrsen' && "bg-yellow-100 text-yellow-800",
                                  order.status === 'odlozen' && "bg-orange-100 text-orange-800",
                                  order.status === 'otkazan' && "bg-red-100 text-red-800"
                                )}>
                                  {getStatusLabel(order.status)}
                                </span>
                                {order.status === 'zavrsen' && order.verified && (
                                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800" title="Verifikovano">
                                    <CheckIcon size={14} />
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                                    <Link
                                      to={`/work-orders/${order._id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Detalji
                                    </Link>
                                  </Button>
                                  <Button
                                    type="error"
                                    size="tiny"
                                    prefix={<DeleteIcon size={14} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(order._id);
                                    }}
                                    className="delete-btn"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <PaginationComponent 
                      currentPage={currentPageAllOrders}
                      totalPages={totalPagesAllOrders}
                      onPageChange={paginateAllOrders}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Customer Status Modal */}
      {customerStatusModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-200">
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
            
            <div className="p-6 space-y-3">
              {[
                'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme)',
                'Priključenje korisnika na HFC KDS mreža u privatnim kućama sa instalacijom CPE opreme (izrada instalacije od PM-a do korisnika sa instalacijom kompletne CPE opreme)',
                'Priključenje korisnika na GPON mrežu u privatnim kućama (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme)',
                'Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme)',
                'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji sa montažnim radovima',
                'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji bez montažnih radova'
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
            
            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <Button
                type="secondary"
                size="medium"
                onClick={closeCustomerStatusModal}
                className="flex-1"
              >
                Otkaži
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
        loading={loadingAIVerification !== null}
        onAccept={handleAcceptAI}
        onReject={handleRejectAI}
      />
    </div>
  );
};

export default WorkOrdersByTechnician;