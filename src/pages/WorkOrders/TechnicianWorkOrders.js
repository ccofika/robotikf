import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchIcon, FilterIcon, ViewIcon, RefreshIcon, ClipboardIcon, BarChartIcon, PhoneIcon, MapPinIcon, CalendarIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { toast } from '../../utils/toast';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import TechnicianAPKDownload from '../../components/TechnicianAPKDownload';

const TechnicianWorkOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [refreshing, setRefreshing] = useState(false);
  
  // Touch gestures
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const activeOrderRef = useRef(null);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 12 : 10;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Function to check if work order date/time hasn't passed yet
  const isWorkOrderNew = (order) => {
    if (order.status !== 'nezavrsen') return false;
    
    try {
      const now = new Date();
      
      // Handle different date formats
      let orderDate;
      if (order.date instanceof Date) {
        orderDate = order.date;
      } else if (typeof order.date === 'string') {
        // If it's already in YYYY-MM-DD format or ISO string
        orderDate = new Date(order.date);
      } else {
        console.warn('Invalid date format for order:', order);
        return false;
      }
      
      // Create datetime with time
      const orderTime = order.time || '09:00';
      const [hours, minutes] = orderTime.split(':');
      const orderDateTime = new Date(orderDate);
      orderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Debug logging (can be removed later)
      const isNew = orderDateTime > now;
      console.log('Checking order:', {
        id: order._id,
        status: order.status,
        date: order.date,
        time: order.time,
        orderDateTime: orderDateTime.toISOString(),
        orderDateTimeLocal: orderDateTime.toLocaleString('sr-RS'),
        now: now.toISOString(),
        nowLocal: now.toLocaleString('sr-RS'),
        isNew: isNew,
        timeDiffMinutes: Math.round((orderDateTime - now) / (1000 * 60))
      });
      
      return orderDateTime > now;
    } catch (error) {
      console.error('Error checking if order is new:', error, order);
      return false;
    }
  };

  // Function to get display status and CSS class
  const getDisplayStatus = (order) => {
    if (order.status === 'zavrsen') return { text: 'Završen', cssClass: 'zavrsen' };
    if (order.status === 'odlozen') return { text: 'Odložen', cssClass: 'odlozen' };
    if (order.status === 'otkazan') return { text: 'Otkazan', cssClass: 'otkazan' };
    
    // For 'nezavrsen' status, check if it's new (date/time hasn't passed)
    if (order.status === 'nezavrsen') {
      const isNew = isWorkOrderNew(order);
      
      // Debug logging
      console.log('Display status for order:', {
        id: order._id,
        status: order.status,
        isNew: isNew,
        willShow: isNew ? 'Nov' : 'Nezavršen'
      });
      
      if (isNew) {
        return { text: 'Nov', cssClass: 'nov' };
      } else {
        return { text: 'Nezavršen', cssClass: 'nezavrsen' };
      }
    }
    
    return { text: 'Nezavršen', cssClass: 'nezavrsen' };
  };
  
  useEffect(() => {
    fetchWorkOrders();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?._id]);
  
  const fetchWorkOrders = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${apiUrl}/api/workorders/technician/${user._id}`);
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje radnih naloga!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile
  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchWorkOrders();
    setTimeout(() => setRefreshing(false), 800); // Visual feedback
  };
  
  // Touch gesture handlers
  const handleTouchStart = (e, orderId) => {
    e.preventDefault();
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    activeOrderRef.current = orderId;
    
    console.log('Touch start - Order ID:', orderId); // Debug log
  };
  
  const handleTouchMove = (e) => {
    if (!activeOrderRef.current) return;
    
    touchEndX.current = e.touches[0].clientX;
    
    const orderCard = document.getElementById(`order-${activeOrderRef.current}`);
    if (!orderCard) return;
    
    const diff = touchEndX.current - touchStartX.current;
    
    // Only allow swiping left (negative diff)
    if (diff < 0 && diff > -100) {
      orderCard.style.transform = `translateX(${diff}px)`;
    }
  };
  
  const handleTouchEnd = () => {
    if (!activeOrderRef.current) {
      console.log('Touch end - No active order ID'); // Debug log
      return;
    }
    
    const orderId = activeOrderRef.current; // Store ID before resetting
    const orderCard = document.getElementById(`order-${orderId}`);
    
    console.log('Touch end - Order ID:', orderId); // Debug log
    
    if (!orderCard) {
      console.log('Touch end - Order card not found for ID:', orderId); // Debug log
      activeOrderRef.current = null;
      return;
    }
    
    const diff = touchEndX.current - touchStartX.current;
    
    if (diff < -80) {
      // Swiped far enough to trigger action
      orderCard.classList.add('swiped');
      setTimeout(() => {
        orderCard.classList.remove('swiped');
        orderCard.style.transform = 'translateX(0)';
        
        // Navigate to details using the stored ID
        console.log('Navigating to order:', orderId); // Debug log
        navigate(`/my-work-orders/${orderId}`);
      }, 300);
    } else {
      // Reset position with animation
      orderCard.style.transition = 'transform 0.3s ease';
      orderCard.style.transform = 'translateX(0)';
      setTimeout(() => {
        orderCard.style.transition = '';
      }, 300);
    }
    
    // Reset only after using the ID
    activeOrderRef.current = null;
  };
  
  // Filtriranje radnih naloga
  const filteredWorkOrders = workOrders.filter(order => {
    const searchMatch = searchTerm === '' || 
                       order.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (order.comment && order.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    // Ako nema filtera, ne prikazuj završene radne naloge
    const defaultHideCompleted = statusFilter === '' && searchTerm === '' ? order.status !== 'zavrsen' : true;
    
    return searchMatch && statusMatch && defaultHideCompleted;
  });
  
  // Sortiranje po datumu i vremenu
  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    // Prvo stavljamo nezavršene (uključujući "nove")
    const aIsIncomplete = a.status === 'nezavrsen';
    const bIsIncomplete = b.status === 'nezavrsen';
    
    if (aIsIncomplete && !bIsIncomplete) return -1;
    if (!aIsIncomplete && bIsIncomplete) return 1;
    
    // Zatim sortiramo po datumu i vremenu - najnoviji na vrhu
    const aDateTime = new Date(`${a.date}T${a.time || '09:00'}:00`);
    const bDateTime = new Date(`${b.date}T${b.time || '09:00'}:00`);
    
    return bDateTime - aDateTime;
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedWorkOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(sortedWorkOrders.length / itemsPerPage);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Statistike
  const stats = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter(o => o.status === 'zavrsen').length;
    const pending = workOrders.filter(o => o.status === 'nezavrsen').length;
    const postponed = workOrders.filter(o => o.status === 'odlozen').length;
    const canceled = workOrders.filter(o => o.status === 'otkazan').length;
    
    // Calculate "new" orders for testing
    const newOrders = workOrders.filter(o => o.status === 'nezavrsen' && isWorkOrderNew(o)).length;
    const actualPending = pending - newOrders;
    
    console.log('Stats calculation:', {
      total,
      pending,
      newOrders,
      actualPending,
      workOrdersWithNezavrsen: workOrders.filter(o => o.status === 'nezavrsen').map(o => ({
        id: o._id,
        date: o.date,
        time: o.time,
        isNew: isWorkOrderNew(o)
      }))
    });
    
    return {
      total,
      completed,
      pending: actualPending,
      newOrders, // Add this for debugging
      postponed,
      canceled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [workOrders]);

  // Format date for mobile display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
      return `Danas, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Juče, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise return full date
    return date.toLocaleDateString('sr-RS');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      {/* Pull to refresh indicator for mobile */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 -translate-y-full transition-transform duration-300 z-10 flex items-center justify-center h-16 bg-white/80 backdrop-blur-sm">
          <RefreshIcon className={cn('w-6 h-6 text-blue-600', refreshing && 'animate-spin')} />
          <span className="ml-2 text-sm text-slate-600">{refreshing ? 'Osvežavanje...' : 'Povucite dole za osvežavanje'}</span>
        </div>
      )}
      
      {/* Page Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-blue-50 rounded-xl">
              <ClipboardIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Moji radni nalozi</h1>
              <p className="text-slate-600 text-sm mt-1 hidden sm:block">Pregled i upravljanje radnim nalozima</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              type="secondary"
              size="medium"
              onClick={fetchWorkOrders}
              loading={loading}
              disabled={loading}
              className={cn(
                "min-w-[44px] h-11",
                isMobile && "px-0 w-11"
              )}
            >
              <RefreshIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
              {!isMobile && <span className="ml-1">Osveži</span>}
            </Button>
            {isMobile && (
              <Button
                type={showFilters ? "primary" : "secondary"}
                size="medium"
                onClick={() => setShowFilters(!showFilters)}
                className="min-w-[44px] h-11 px-0 w-11"
              >
                <FilterIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong>Greška:</strong> {error}
        </div>
      )}
      
      {/* Statistics Cards - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <BarChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Ukupno</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</h3>
              </div>
            </div>
          </div>
          
          {/* Completed */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-green-100 text-green-700 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                {stats.completionRate}%
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Završeno</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.completed}</h3>
              </div>
            </div>
          </div>
          
          {/* Pending */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 text-yellow-700 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                {stats.pending}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Nezavršeno</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.pending}</h3>
              </div>
            </div>
          </div>
          
          {/* Postponed */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-100 text-red-700 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                {stats.postponed}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Odloženo</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.postponed}</h3>
              </div>
            </div>
          </div>
          
          {/* Canceled */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                {stats.canceled}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Otkazano</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.canceled}</h3>
              </div>
            </div>
          </div>
          
          {/* New Orders */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 text-purple-700 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0">
                {stats.newOrders || 0}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider truncate">Novi</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{stats.newOrders || 0}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {/* Main Content Card - Mobile Optimized */}
      <Card className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* Mobile Filter Panel - Toggleable */}
        {isMobile && (
          <div className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-all duration-300",
            showFilters ? "opacity-100 visible" : "opacity-0 invisible"
          )}>
            <div className={cn(
              "absolute bottom-0 left-0 right-0 bg-white rounded-t-xl transition-transform duration-300",
              showFilters ? "translate-y-0" : "translate-y-full"
            )}>
              <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Filteri</h3>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setShowFilters(false)}
                  className="w-8 h-8 p-0"
                >
                  <span className="text-xl leading-none">&times;</span>
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Pretraga..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 h-12"
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 flex items-center justify-center"
                      onClick={() => setSearchTerm('')}
                    >
                      &times;
                    </button>
                  )}
                </div>
                
                {/* Status Filter */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Status naloga</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '', label: 'Svi' },
                      { value: 'nezavrsen', label: 'Nezavršeni' },
                      { value: 'zavrsen', label: 'Završeni' },
                      { value: 'odlozen', label: 'Odloženi' }
                    ].map((status) => (
                      <button
                        key={status.value}
                        className={cn(
                          "px-4 py-3 text-sm font-medium rounded-lg border transition-all min-h-[48px]",
                          statusFilter === status.value
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
                        )}
                        onClick={() => setStatusFilter(status.value)}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Apply Button */}
                <div className="pt-4">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setShowFilters(false)}
                    className="w-full h-12"
                  >
                    Primeni filtere
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <CardHeader className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl text-slate-900">Radni nalozi</CardTitle>
            <div className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              {filteredWorkOrders.length} od {workOrders.length} naloga
            </div>
          </div>
        </CardHeader>
        
        {/* Desktop Table Controls */}
        {!isMobile && (
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-4 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Pretraga po opštini, adresi, tipu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 flex items-center justify-center hover:text-slate-600"
                      onClick={() => setSearchTerm('')}
                    >
                      &times;
                    </button>
                  )}
                </div>
                
                {/* Status Filter Select */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none hover:bg-accent"
                  >
                    <option value="">Svi statusi</option>
                    <option value="zavrsen">Završeni</option>
                    <option value="nezavrsen">Nezavršeni</option>
                    <option value="odlozen">Odloženi</option>
                    <option value="otkazan">Otkazani</option>
                  </select>
                  <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Content - Table for Desktop, Cards for Mobile */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-slate-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Učitavanje radnih naloga...</span>
              </div>
            </div>
          ) : (
          <>
            {isMobile ? (
              // Mobile Card View
              <div className="p-3 space-y-2">
                {currentItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <ClipboardIcon className="w-12 h-12 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        {searchTerm || statusFilter 
                          ? 'Nema rezultata za zadatu pretragu' 
                          : 'Nemate dodeljenih radnih naloga'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  currentItems.map((order, index) => {
                    const displayStatus = getDisplayStatus(order);
                    const statusColors = {
                      zavrsen: 'border-l-green-500',
                      nezavrsen: 'border-l-yellow-500',
                      odlozen: 'border-l-red-500',
                      otkazan: 'border-l-gray-500',
                      nov: 'border-l-purple-500'
                    };
                    const statusBadgeColors = {
                      zavrsen: 'bg-green-100 text-green-700 border-green-200',
                      nezavrsen: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                      odlozen: 'bg-red-100 text-red-700 border-red-200',
                      otkazan: 'bg-gray-100 text-gray-700 border-gray-200',
                      nov: 'bg-purple-100 text-purple-700 border-purple-200'
                    };
                    
                    return (
                      <div 
                        key={order._id} 
                        id={`order-${order._id}`}
                        className={cn(
                          "bg-white border border-slate-200 rounded-lg overflow-hidden border-l-4 transition-transform duration-200 touch-pan-y",
                          statusColors[displayStatus.cssClass]
                        )}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          handleTouchStart(e, order._id);
                        }}
                        onTouchMove={(e) => {
                          e.stopPropagation();
                          handleTouchMove(e);
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          handleTouchEnd(e);
                        }}
                      >
                        <div className="p-3">
                          {/* Header - Kompaktan */}
                          <div className="flex justify-between items-center mb-2">
                            <span className={cn(
                              "px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md border",
                              statusBadgeColors[displayStatus.cssClass]
                            )}>
                              {displayStatus.text}
                            </span>
                            <div className="flex items-center text-xs text-slate-500">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              <span>
                                {order.date ? new Date(order.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                                {order.time && ' • ' + order.time}
                              </span>
                            </div>
                          </div>
                          
                          {/* Body - Kompaktan */}
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-1.5">
                              <MapPinIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-900 text-sm truncate">{order.municipality}</div>
                                <div className="text-xs text-slate-600 truncate">{order.address} • {order.type}</div>
                              </div>
                            </div>
                            
                            {order.userPhone && (
                              <a
                                href={`tel:${order.userPhone}`}
                                className="flex items-center space-x-1.5 text-blue-600 text-xs font-medium py-1 -mx-1 px-1 rounded hover:bg-blue-50 active:bg-blue-100 transition-colors"
                              >
                                <PhoneIcon className="w-3.5 h-3.5" />
                                <span>{order.userPhone}</span>
                              </a>
                            )}

                            {/* Admin comment for returned work orders */}
                            {order.adminComment && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <div className="text-xs font-medium text-red-800 mb-1">Razlog vraćanja:</div>
                                <div className="text-xs text-red-700">{order.adminComment}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Footer - Kompaktan */}
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                            <Button
                              type="primary"
                              size="small"
                              className="h-7 px-2.5 text-xs"
                              onClick={() => navigate(`/my-work-orders/${order._id}`)}
                            >
                              <ViewIcon className="w-3 h-3 mr-1" />
                              Detalji
                            </Button>
                            <div className="text-xs text-slate-400 hidden">
                              Prevucite levo
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vreme</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opština</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresa</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center space-y-2">
                            <ClipboardIcon className="w-12 h-12 text-slate-300" />
                            <p className="text-sm font-medium">
                              {searchTerm || statusFilter 
                                ? 'Nema rezultata za zadatu pretragu' 
                                : 'Nemate dodeljenih radnih naloga'
                              }
                            </p>
                            <p className="text-xs">Promenite filtere za pristup nalozima</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((order, index) => {
                        const displayStatus = getDisplayStatus(order);
                        const statusBadgeColors = {
                          zavrsen: 'bg-green-100 text-green-700 border-green-200',
                          nezavrsen: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                          odlozen: 'bg-red-100 text-red-700 border-red-200',
                          otkazan: 'bg-gray-100 text-gray-700 border-gray-200',
                          nov: 'bg-purple-100 text-purple-700 border-purple-200'
                        };
                        
                        return (
                          <React.Fragment key={order._id}>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-900">{new Date(order.date).toLocaleDateString('sr-RS')}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">{order.time || '09:00'}</td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">{order.municipality}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">{order.address}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">{order.type}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border",
                                  statusBadgeColors[displayStatus.cssClass]
                                )}>
                                  {displayStatus.text}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  type="tertiary"
                                  size="small"
                                  onClick={() => navigate(`/my-work-orders/${order._id}`)}
                                  className="h-8 px-3 text-xs"
                                >
                                  <ViewIcon className="w-3 h-3 mr-1" />
                                  Detalji
                                </Button>
                              </td>
                            </tr>
                            {/* Admin comment row */}
                            {order.adminComment && (
                              <tr>
                                <td colSpan="7" className="px-6 py-2 border-t-0">
                                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                    <div className="text-xs font-medium text-red-800 mb-1">Razlog vraćanja:</div>
                                    <div className="text-sm text-red-700">{order.adminComment}</div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination - Mobile Optimized */}
            {sortedWorkOrders.length > itemsPerPage && (
              <div className="px-4 sm:px-6 py-4 border-t border-slate-200">
                {isMobile ? (
                  // Mobile Pagination
                  <div className="flex items-center justify-between max-w-xs mx-auto">
                    <Button
                      type="secondary"
                      size="medium"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-11 h-11 p-0"
                    >
                      &lsaquo;
                    </Button>
                    
                    <div className="text-sm font-medium text-slate-600">
                      Stranica {currentPage} od {totalPages}
                    </div>
                    
                    <Button
                      type="secondary"
                      size="medium"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-11 h-11 p-0"
                    >
                      &rsaquo;
                    </Button>
                  </div>
                ) : (
                  // Desktop Pagination
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Prikazano {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedWorkOrders.length)} od {sortedWorkOrders.length} rezultata
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 p-0"
                      >
                        &laquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 p-0"
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
                            type={currentPage === number ? "primary" : "tertiary"}
                            size="small"
                            onClick={() => paginate(number)}
                            className="w-8 h-8 p-0"
                          >
                            {number}
                          </Button>
                        ))}
                        
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 p-0"
                      >
                        &rsaquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => paginate(totalPages)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 p-0"
                      >
                        &raquo;
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>

      {/* APK Download Section - Only for Technicians */}
      <div className="mb-4 sm:mb-6 mt-10">
        <TechnicianAPKDownload />
      </div>
    </div>
  );

  
};

export default TechnicianWorkOrders;