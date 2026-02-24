import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, DeleteIcon, UserIcon, UserSlashIcon, ToolsIcon, CheckIcon, RefreshIcon, ClipboardIcon, PlusIcon, UserCheckIcon, XIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import { useWorkOrderModal } from '../../context/WorkOrderModalContext';
import AIVerificationModal from '../../components/AIVerificationModal';

const WorkOrdersByTechnician = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshCounter } = useWorkOrderModal();
  const [technicians, setTechnicians] = useState([]);

  // Optimized state management with priority-based loading
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [olderWorkOrders, setOlderWorkOrders] = useState([]);
  const [recentUnassigned, setRecentUnassigned] = useState([]);
  const [olderUnassigned, setOlderUnassigned] = useState([]);
  const [verificationOrders, setVerificationOrders] = useState([]);


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
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll(),
        workOrdersAPI.getUnassigned()
      ]);

      const workOrdersData = workOrdersResponse.data;
      const unassignedData = unassignedResponse.data;

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

      // Load verification count in background (don't block)
      if (!verificationDataLoaded) {
        fetchVerificationOrders();
      }

      setTimeout(() => {
        fetchOlderWorkOrders();
      }, 500);

    } catch (error) {
      console.error('Greška pri učitavanju najnovijih radnih naloga:', error);
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
    if (window.confirm('Da li ste sigurni da želite da obrišete ovaj radni nalog?')) {
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

  // Combine recent and older work orders for compatibility
  const getAllWorkOrders = useCallback(() => {
    return [...recentWorkOrders, ...olderWorkOrders];
  }, [recentWorkOrders, olderWorkOrders]);

  const getAllUnassignedOrders = useCallback(() => {
    return [...recentUnassigned, ...olderUnassigned];
  }, [recentUnassigned, olderUnassigned]);

  const groupWorkOrdersByTechnician = () => {
    const techWorkOrders = {};

    technicians.forEach(tech => {
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
  }, [recentWorkOrders, olderWorkOrders, statusFilter, technicianFilter, dateFilter, timeSortOrder, searchTerm, filterOrders, getAllWorkOrders]);

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
    if (!orderStatuses[orderId]) {
      await loadCustomerStatus(orderId);
    }
    document.body.style.overflow = 'hidden';
    setCustomerStatusModal({ isOpen: true, orderId });
  };

  const closeCustomerStatusModal = () => {
    document.body.style.overflow = '';
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
  const handleRejectAI = async () => {
    if (!aiVerificationResult) return;

    try {
      const orderId = aiVerificationResult.orderId;

      await workOrdersAPI.returnIncorrect(orderId, {
        adminComment: `AI VERIFIKACIJA:\n\n${aiVerificationResult.reason}`
      });

      toast.info('Radni nalog je vraćen tehničaru');

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

  // Helpers for sidebar layout
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  // Status badge config
  const statusCfg = {
    zavrsen: { label: 'Završen', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    nezavrsen: { label: 'Nezavršen', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    odlozen: { label: 'Odložen', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    otkazan: { label: 'Otkazan', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
  };

  const renderStatusBadge = (status) => {
    const cfg = statusCfg[status] || { label: status, dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border', cfg.bg, cfg.text, cfg.border)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
        {cfg.label}
      </span>
    );
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

  const getCurrentTotalPages = () => {
    if (activeTab === 'technicians' && selectedTechnicianId) {
      const orders = filterOrders(technicianWorkOrders[selectedTechnicianId]?.workOrders || []);
      return Math.ceil(orders.length / itemsPerPage);
    }
    if (activeTab === 'unassigned') return totalPagesUnassigned;
    if (activeTab === 'verification') return totalPagesVerification;
    if (activeTab === 'all') return totalPagesAllOrders;
    return 0;
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
      return { title: tech.name, subtitle: tech.phone, icon: <UserIcon size={16} /> };
    }
    if (activeTab === 'unassigned') return { title: 'Nedodeljeni radni nalozi', subtitle: `${filteredUnassigned.length} naloga`, icon: <UserSlashIcon size={16} /> };
    if (activeTab === 'verification') return { title: 'Za verifikaciju', subtitle: `${filteredVerification.length} naloga`, icon: <CheckIcon size={16} /> };
    if (activeTab === 'all') return { title: 'Svi radni nalozi', subtitle: `${filteredAllOrders.length} naloga`, icon: <ClipboardIcon size={16} /> };
    if (activeTab === 'technicians') return { title: 'Tehničari', subtitle: 'Izaberite tehničara iz menija', icon: <UserIcon size={16} /> };
    return { title: '', subtitle: '', icon: null };
  };

  const isLoading = dashboardLoading && recentLoading;

  // Render sidebar content (shared between desktop and mobile overlay)
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Fixed nav items */}
      <div className="flex-shrink-0">
        {/* Svi radni nalozi */}
        <button
          onClick={() => handleSidebarItemClick('all', null)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-left transition-all border-l-[3px]',
            activeTab === 'all'
              ? 'bg-slate-900 text-white border-l-white'
              : 'border-l-transparent hover:bg-slate-50',
            searchTerm && searchMatchCounts.all > 0 && activeTab !== 'all' && 'bg-blue-50/50'
          )}
        >
          <ClipboardIcon size={16} className={activeTab === 'all' ? 'text-white' : 'text-slate-500'} />
          <span className={cn('text-[13px] font-medium flex-1', activeTab === 'all' ? 'text-white' : 'text-slate-700')}>Svi radni nalozi</span>
          <span className={cn('text-[11px] font-semibold', activeTab === 'all' ? 'text-white/70' : 'text-slate-400')}>
            {getAllWorkOrders().length}
          </span>
          {searchTerm && searchMatchCounts.all > 0 && activeTab !== 'all' && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">({searchMatchCounts.all})</span>
          )}
        </button>

        {/* Za verifikaciju */}
        <button
          onClick={() => handleSidebarItemClick('verification', null)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-left transition-all border-l-[3px]',
            activeTab === 'verification'
              ? 'bg-slate-900 text-white border-l-white'
              : 'border-l-transparent hover:bg-slate-50',
            searchTerm && searchMatchCounts.verification > 0 && activeTab !== 'verification' && 'bg-blue-50/50'
          )}
        >
          <CheckIcon size={16} className={activeTab === 'verification' ? 'text-white' : 'text-slate-500'} />
          <span className={cn('text-[13px] font-medium flex-1', activeTab === 'verification' ? 'text-white' : 'text-slate-700')}>Za verifikaciju</span>
          <span className={cn('text-[11px] font-semibold', activeTab === 'verification' ? 'text-white/70' : 'text-slate-400')}>
            {verificationOrders.length}
          </span>
          {searchTerm && searchMatchCounts.verification > 0 && activeTab !== 'verification' && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">({searchMatchCounts.verification})</span>
          )}
        </button>

        {/* Nedodeljeni */}
        <button
          onClick={() => handleSidebarItemClick('unassigned', null)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-left transition-all border-l-[3px]',
            activeTab === 'unassigned'
              ? 'bg-slate-900 text-white border-l-white'
              : 'border-l-transparent hover:bg-slate-50',
            searchTerm && searchMatchCounts.unassigned > 0 && activeTab !== 'unassigned' && 'bg-blue-50/50'
          )}
        >
          <UserSlashIcon size={16} className={activeTab === 'unassigned' ? 'text-white' : 'text-slate-500'} />
          <span className={cn('text-[13px] font-medium flex-1', activeTab === 'unassigned' ? 'text-white' : 'text-slate-700')}>Nedodeljeni</span>
          <span className={cn('text-[11px] font-semibold', activeTab === 'unassigned' ? 'text-white/70' : 'text-slate-400')}>
            {getAllUnassignedOrders().length}
          </span>
          {searchTerm && searchMatchCounts.unassigned > 0 && activeTab !== 'unassigned' && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">({searchMatchCounts.unassigned})</span>
          )}
        </button>

        {/* Divider */}
        <div className="border-b border-slate-100 my-2" />

        {/* Tehničari section header */}
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tehničari</span>
          <span className="text-[10px] text-slate-400">{filteredSidebarTechnicians.length}</span>
        </div>
      </div>

      {/* Technician cards - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {filteredSidebarTechnicians.map(([techId, techData]) => {
          const isActive = activeTab === 'technicians' && selectedTechnicianId === techId;
          const tech = techData.technicianInfo;
          const total = techData.workOrders.length;
          const completed = techData.workOrders.filter(o => o.status === 'zavrsen').length;
          const active = techData.workOrders.filter(o => o.status === 'nezavrsen').length;
          const postponed = techData.workOrders.filter(o => o.status === 'odlozen').length;
          const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <button
              key={techId}
              onClick={() => handleSidebarItemClick('technicians', techId)}
              className={cn(
                'w-full px-4 py-3 cursor-pointer transition-all border-l-[3px] text-left',
                isActive
                  ? 'bg-slate-900 text-white border-l-white'
                  : 'border-l-transparent hover:bg-slate-50',
                searchTerm && searchMatchCounts[techId] > 0 && !isActive && 'bg-blue-50/50'
              )}
            >
              {/* Top row: avatar + name + phone */}
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                )}>
                  {getInitials(tech.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[13px] font-semibold truncate', isActive ? 'text-white' : 'text-slate-800')}>
                    {tech.name}
                  </div>
                  <div className={cn('text-[10px] font-mono', isActive ? 'text-white/60' : 'text-slate-400')}>
                    {tech.phone}
                  </div>
                </div>
                {searchTerm && searchMatchCounts[techId] > 0 && !isActive && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                    ({searchMatchCounts[techId]})
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                <div
                  className={cn(
                    'rounded px-1.5 py-1 flex flex-col items-center justify-center cursor-pointer transition-colors',
                    isActive ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-50 hover:bg-slate-100'
                  )}
                  onClick={(e) => handleStatClick(techId, '', e)}
                >
                  <div className={cn('text-[11px] font-bold', isActive ? 'text-white' : 'text-slate-900')}>{total}</div>
                  <div className={cn('text-[8px] uppercase tracking-wider', isActive ? 'text-white/50' : 'text-slate-400')}>Sve</div>
                </div>
                <div
                  className={cn(
                    'rounded px-1.5 py-1 flex flex-col items-center justify-center cursor-pointer transition-colors',
                    isActive ? 'bg-white/10 hover:bg-emerald-500/30' : 'bg-slate-50 hover:bg-emerald-50'
                  )}
                  onClick={(e) => handleStatClick(techId, 'zavrsen', e)}
                >
                  <div className={cn('text-[11px] font-bold', isActive ? 'text-emerald-400' : 'text-emerald-600')}>{completed}</div>
                  <div className={cn('text-[8px] uppercase tracking-wider', isActive ? 'text-white/50' : 'text-slate-400')}>OK</div>
                </div>
                <div
                  className={cn(
                    'rounded px-1.5 py-1 flex flex-col items-center justify-center cursor-pointer transition-colors',
                    isActive ? 'bg-white/10 hover:bg-blue-500/30' : 'bg-slate-50 hover:bg-blue-50'
                  )}
                  onClick={(e) => handleStatClick(techId, 'nezavrsen', e)}
                >
                  <div className={cn('text-[11px] font-bold', isActive ? 'text-blue-400' : 'text-blue-600')}>{active}</div>
                  <div className={cn('text-[8px] uppercase tracking-wider', isActive ? 'text-white/50' : 'text-slate-400')}>Akt</div>
                </div>
                <div
                  className={cn(
                    'rounded px-1.5 py-1 flex flex-col items-center justify-center cursor-pointer transition-colors',
                    isActive ? 'bg-white/10 hover:bg-amber-500/30' : 'bg-slate-50 hover:bg-amber-50'
                  )}
                  onClick={(e) => handleStatClick(techId, 'odlozen', e)}
                >
                  <div className={cn('text-[11px] font-bold', isActive ? 'text-amber-400' : 'text-amber-600')}>{postponed}</div>
                  <div className={cn('text-[8px] uppercase tracking-wider', isActive ? 'text-white/50' : 'text-slate-400')}>Odl</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className={cn('h-1 rounded-full mt-2 overflow-hidden', isActive ? 'bg-white/10' : 'bg-slate-100')}>
                <div
                  className={cn('h-full rounded-full transition-all', isActive ? 'bg-emerald-400' : 'bg-emerald-500')}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="-m-6 -mt-16 md:-mt-6 h-screen flex flex-col overflow-hidden">
      {/* 1. Dark Header Bar */}
      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <ToolsIcon size={18} className="text-blue-400" />
          <h1 className="text-[15px] font-semibold text-white">Radni nalozi</h1>
          <div className="w-px h-5 bg-white/20 hidden sm:block" />
          <span className="text-[11px] text-slate-400 hidden sm:inline">{technicians.length} tehničara</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">&middot;</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">{getAllWorkOrders().length} naloga</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/work-orders/add"
            className="px-2.5 py-1.5 text-[11px] bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <PlusIcon size={12} />
            <span className="hidden sm:inline">Novi nalog</span>
          </Link>
          <Link
            to="/work-orders/upload"
            className="px-2.5 py-1.5 text-[11px] bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors"
          >
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </span>
          </Link>
          {(() => {
            const storedUser = localStorage.getItem('user');
            const userRole = storedUser ? JSON.parse(storedUser).role : null;
            if (userRole === 'superadmin' || userRole === 'supervisor') {
              return (
                <button
                  onClick={async () => {
                    try {
                      toast.info('Slanje sync notifikacije...');
                      const response = await workOrdersAPI.triggerSyncRecordings();
                      toast.success(`Sync notifikacija poslata ${response.data.successCount} tehničarima`);
                    } catch (err) {
                      console.error('Sync error:', err);
                      toast.error(err.response?.data?.error || 'Greška pri slanju sync notifikacije');
                    }
                  }}
                  className="px-2.5 py-1.5 text-[11px] bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <RefreshIcon size={12} />
                  <span className="hidden sm:inline">Sync snimke</span>
                </button>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* 2. Search Strip */}
      <div className="bg-slate-50/50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 flex-shrink-0 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Pretraga po adresi, korisniku, serijskom broju..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPageUnassigned(1);
              setCurrentPageVerification(1);
              setCurrentPageAllOrders(1);
              setTechnicianCurrentPages({});
            }}
            className="h-8 w-full pl-9 pr-3 bg-white border border-slate-200 rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPageUnassigned(1);
            setCurrentPageVerification(1);
            setCurrentPageAllOrders(1);
            setTechnicianCurrentPages({});
          }}
          className="h-8 px-2.5 pr-7 bg-white border border-slate-200 rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all appearance-none"
        >
          <option value="">Svi statusi</option>
          <option value="zavrsen">Završeni</option>
          <option value="nezavrsen">Nezavršeni</option>
          <option value="odlozen">Odloženi</option>
          <option value="otkazan">Otkazani</option>
        </select>

        {/* Technician filter - only for all/verification tabs */}
        {(activeTab === 'all' || activeTab === 'verification') && (
          <select
            value={technicianFilter}
            onChange={(e) => {
              setTechnicianFilter(e.target.value);
              setCurrentPageUnassigned(1);
              setCurrentPageVerification(1);
              setCurrentPageAllOrders(1);
              setTechnicianCurrentPages({});
            }}
            className="h-8 px-2.5 pr-7 bg-white border border-slate-200 rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all appearance-none"
          >
            <option value="">Svi tehničari</option>
            {technicians.map(tech => (
              <option key={tech._id} value={tech._id}>
                {tech.name}
              </option>
            ))}
          </select>
        )}

        {/* Date filter - only for all tab */}
        {activeTab === 'all' && (
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPageAllOrders(1);
            }}
            className="h-8 px-2.5 bg-white border border-slate-200 rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
          />
        )}

        {/* Time sort - only when date filter active */}
        {activeTab === 'all' && dateFilter && (
          <select
            value={timeSortOrder}
            onChange={(e) => {
              setTimeSortOrder(e.target.value);
              setCurrentPageAllOrders(1);
            }}
            className="h-8 px-2.5 pr-7 bg-white border border-slate-200 rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all appearance-none"
          >
            <option value="asc">Najstarije &rarr; Najnovije</option>
            <option value="desc">Najnovije &rarr; Najstarije</option>
          </select>
        )}

        {/* Reset */}
        <button
          onClick={resetFilters}
          className="h-8 px-2.5 text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        >
          Resetuj
        </button>

        {/* Refresh */}
        <button
          onClick={fetchData}
          disabled={dashboardLoading || recentLoading}
          className="h-8 px-2.5 text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshIcon size={12} className={(dashboardLoading || recentLoading || olderLoading) ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Osveži</span>
        </button>
      </div>

      {/* 3. Main area: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div
          className={cn(
            'w-[280px] flex-shrink-0 border-r border-slate-100 bg-white overflow-hidden transition-transform duration-200',
            'lg:relative lg:translate-x-0',
            'fixed left-0 top-0 h-full z-40 lg:z-auto',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {renderSidebarContent()}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500 text-sm">Učitavanje podataka...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Content header */}
              <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400">
                      {getContentHeaderInfo().icon}
                    </div>
                    <div>
                      <h2 className="text-[14px] font-semibold text-slate-800">{getContentHeaderInfo().title}</h2>
                      <p className="text-[11px] text-slate-400">
                        {getContentHeaderInfo().subtitle}
                        {recentLoading && <span className="ml-2">(učitavanje...)</span>}
                        {olderLoading && <span className="ml-2 text-[10px]">(stariji nalozi...)</span>}
                      </p>
                    </div>
                  </div>

                  {/* Quick filter chips for technician view */}
                  {activeTab === 'technicians' && selectedTechnicianId && (
                    <div className="flex items-center gap-1.5">
                      {[
                        { label: 'Svi', value: '', activeBg: 'bg-slate-900 text-white', inactiveBg: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                        { label: 'Završeni', value: 'zavrsen', activeBg: 'bg-emerald-600 text-white', inactiveBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                        { label: 'Nezavršeni', value: 'nezavrsen', activeBg: 'bg-blue-600 text-white', inactiveBg: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                        { label: 'Odloženi', value: 'odlozen', activeBg: 'bg-amber-500 text-white', inactiveBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                      ].map(chip => (
                        <button
                          key={chip.value}
                          onClick={() => {
                            setStatusFilter(chip.value);
                            setTechnicianCurrentPages(prev => ({ ...prev, [selectedTechnicianId]: 1 }));
                          }}
                          className={cn(
                            'px-2.5 py-1 text-[11px] rounded-full transition-colors',
                            statusFilter === chip.value ? chip.activeBg : chip.inactiveBg
                          )}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Table container */}
              <div className="flex-1 overflow-auto">
                {activeTab === 'technicians' && !selectedTechnicianId ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <UserIcon size={48} className="text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-sm">Izaberite tehničara iz menija sa leve strane</p>
                    </div>
                  </div>
                ) : activeTab === 'verification' && verificationLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                      <p className="text-slate-500 text-sm">Učitavanje naloga za verifikaciju...</p>
                    </div>
                  </div>
                ) : getCurrentOrders().length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <ClipboardIcon size={48} className="text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-sm">Nema radnih naloga koji odgovaraju filterima</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Datum</th>
                        {(activeTab === 'all' || activeTab === 'technicians') && (
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Vreme</th>
                        )}
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Opština</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Adresa</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Korisnik</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Tip</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Tehničar</th>
                        {activeTab !== 'verification' && (
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Status</th>
                        )}
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const paginatedOrders = getCurrentPaginatedOrders();
                        const ordersToRender = (activeTab === 'all' && dateFilter) ? paginatedOrders : sortByDate(paginatedOrders);

                        return ordersToRender.map((order) => {
                          const technician = technicians.find(tech => tech._id === (order.technicianId?._id || order.technicianId));
                          return (
                            <tr
                              key={order._id}
                              onClick={(e) => navigateToOrderDetails(order._id, e)}
                              className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatDate(order.date)}</td>
                              {(activeTab === 'all' || activeTab === 'technicians') && (
                                <td className="px-4 py-3 text-sm text-slate-500">{order.time || '-'}</td>
                              )}
                              <td className="px-4 py-3 text-sm text-slate-600">{order.municipality}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{order.address}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{order.userName || 'Nepoznat'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{order.type}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{technician ? technician.name : getTechnicianName(order)}</td>
                              {activeTab !== 'verification' && (
                                <td className="px-4 py-3 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    {renderStatusBadge(order.status)}
                                    {order.status === 'zavrsen' && order.verified && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Verifikovano">
                                        <CheckIcon size={12} />
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="px-4 py-3 text-sm">
                                {activeTab === 'verification' ? (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                                        <Link
                                          to={`/work-orders/${order._id}?fromVerification=true`}
                                          state={{ backgroundLocation: location }}
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
                                          Kliknite &quot;Status&quot; da postavite
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className={cn(
                                    'flex items-center gap-1.5',
                                    'opacity-0 group-hover:opacity-100 transition-opacity'
                                  )}>
                                    <Button type="tertiary" size="tiny" prefix={<ViewIcon size={14} />} asChild>
                                      <Link
                                        to={`/work-orders/${order._id}`}
                                        state={{ backgroundLocation: location }}
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
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer/Pagination */}
              {getCurrentOrders().length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="text-[11px] text-slate-500">
                    Prikazano {getCurrentPaginatedOrders().length} od {getCurrentOrders().length}
                  </div>
                  <div>
                    <PaginationComponent
                      currentPage={getCurrentPage()}
                      totalPages={getCurrentTotalPages()}
                      onPageChange={handleCurrentPageChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
