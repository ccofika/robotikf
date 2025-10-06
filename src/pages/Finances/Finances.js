import React, { useState, useEffect } from 'react';
import { DollarSignIcon, SaveIcon, RefreshIcon, CalendarIcon, ChevronDownIcon, CheckIcon, ChevronUpIcon, AlertTriangleIcon, XIcon, SearchIcon, FilterIcon, EyeIcon, TrendingUpIcon, TrendingDownIcon, BarChartIcon, SettingsIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Input } from '../../components/ui/input';
import { DateRangePicker } from '../../components/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { financesAPI } from '../../services/api';
import { toast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';

const Finances = () => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' ili 'settings'

  // State za finansijske postavke
  const [pricesByCustomerStatus, setPricesByCustomerStatus] = useState({});
  const [discountsByMunicipality, setDiscountsByMunicipality] = useState([]);
  const [technicianPrices, setTechnicianPrices] = useState([]);

  // State za dropdown podatke
  const [customerStatusOptions, setCustomerStatusOptions] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);

  // State za tip plaćanja tehničara
  const [technicianPaymentType, setTechnicianPaymentType] = useState('po_statusu'); // 'po_statusu' ili 'plata'
  const [technicianMonthlySalary, setTechnicianMonthlySalary] = useState(0);

  // State za finansijski pregled
  const [financialReports, setFinancialReports] = useState({
    summary: { totalRevenue: 0, totalPayouts: 0, totalProfit: 0 },
    technicianStats: []
  });
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());

  // State za neuspešne transakcije
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [retryLoading, setRetryLoading] = useState({});
  const [failedTransactionsExpanded, setFailedTransactionsExpanded] = useState(false);

  // State za tabelu finansijskih transakcija (server-side pagination)
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [visibleColumns, setVisibleColumns] = useState({
    tisJobId: true,
    municipality: true,
    customerStatus: true,
    technicians: true,
    basePrice: true,
    discount: true,
    finalPrice: true,
    technicianCosts: true,
    profit: true,
    verifiedAt: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('Finances: Fetching optimized initial data...');
      const startTime = Date.now();

      // Pripremi parametre za datume
      const params = {};
      if (startDate) params.dateFrom = startDate.toISOString().split('T')[0];
      if (endDate) params.dateTo = endDate.toISOString().split('T')[0];

      // Optimizovano - koristimo statsOnly za osnovne statistike gde je moguće
      const [settingsRes, statusOptionsRes, municipalitiesRes, techniciansRes, reportsRes, failedRes] = await Promise.all([
        financesAPI.getSettings(),
        financesAPI.getCustomerStatusOptions(),
        financesAPI.getMunicipalities(),
        financesAPI.getTechnicians(),
        financesAPI.getReports(params),
        financesAPI.getFailedTransactions()
      ]);

      const endTime = Date.now();
      console.log(`Finances: Initial data fetched in ${endTime - startTime}ms`);

      const settings = settingsRes.data;

      setPricesByCustomerStatus(settings.pricesByCustomerStatus || {});
      setDiscountsByMunicipality(settings.discountsByMunicipality || []);
      setTechnicianPrices(settings.technicianPrices || []);

      setCustomerStatusOptions(statusOptionsRes.data);
      setMunicipalities(municipalitiesRes.data);
      setTechnicians(techniciansRes.data || []);
      setFinancialReports(reportsRes.data);
      setTransactions(reportsRes.data.transactions || []);
      setFailedTransactions(failedRes.data || []);

      // Kreiranje prazan popust objekata za opštine koje nemaju popust
      const existingMunicipalities = settings.discountsByMunicipality?.map(d => d.municipality) || [];
      const missingMunicipalities = municipalitiesRes.data.filter(m => !existingMunicipalities.includes(m));
      const newDiscounts = missingMunicipalities.map(municipality => ({ municipality, discountPercent: 0 }));
      setDiscountsByMunicipality([...settings.discountsByMunicipality || [], ...newDiscounts]);

    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      toast.error('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  const savePricesByCustomerStatus = async () => {
    setSaveLoading(true);
    try {
      await financesAPI.saveSettings({
        pricesByCustomerStatus
      });
      toast.success('Cene po statusu korisnika su sačuvane');
    } catch (error) {
      console.error('Greška pri čuvanju cena:', error);
      toast.error('Greška pri čuvanju cena');
    } finally {
      setSaveLoading(false);
    }
  };

  const saveDiscountsByMunicipality = async () => {
    setSaveLoading(true);
    try {
      await financesAPI.saveSettings({
        discountsByMunicipality
      });
      toast.success('Popusti po opštinama su sačuvani');
    } catch (error) {
      console.error('Greška pri čuvanju popusta:', error);
      toast.error('Greška pri čuvanju popusta');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTechnicianSelect = (technician) => {
    setSelectedTechnician(technician);
    setTechnicianPaymentType(technician.paymentType || 'po_statusu');
    setTechnicianMonthlySalary(technician.monthlySalary || 0);
  };

  const saveTechnicianPrices = async () => {
    if (!selectedTechnician) {
      toast.error('Molimo izaberite tehničara');
      return;
    }

    setSaveLoading(true);
    try {
      const existingTechIndex = technicianPrices.findIndex(tp =>
        tp.technicianId === selectedTechnician._id
      );

      let updatedTechnicianPrices;
      if (existingTechIndex >= 0) {
        updatedTechnicianPrices = [...technicianPrices];
        updatedTechnicianPrices[existingTechIndex] = {
          technicianId: selectedTechnician._id,
          pricesByCustomerStatus: getCurrentTechnicianPrices()
        };
      } else {
        updatedTechnicianPrices = [...technicianPrices, {
          technicianId: selectedTechnician._id,
          pricesByCustomerStatus: getCurrentTechnicianPrices()
        }];
      }

      await financesAPI.saveSettings({
        technicianPrices: updatedTechnicianPrices
      });

      setTechnicianPrices(updatedTechnicianPrices);
      toast.success(`Cene za ${selectedTechnician.name} su sačuvane`);
    } catch (error) {
      console.error('Greška pri čuvanju cena tehničara:', error);
      toast.error('Greška pri čuvanju cena tehničara');
    } finally {
      setSaveLoading(false);
    }
  };

  const saveTechnicianPaymentSettings = async () => {
    if (!selectedTechnician) {
      toast.error('Molimo izaberite tehničara');
      return;
    }

    if (technicianPaymentType === 'plata' && (!technicianMonthlySalary || technicianMonthlySalary <= 0)) {
      toast.error('Mesečna plata mora biti veća od 0');
      return;
    }

    setSaveLoading(true);
    try {
      await financesAPI.saveTechnicianPaymentSettings({
        technicianId: selectedTechnician._id,
        paymentType: technicianPaymentType,
        monthlySalary: technicianMonthlySalary
      });

      const updatedTechnicians = technicians.map(t =>
        t._id === selectedTechnician._id
          ? { ...t, paymentType: technicianPaymentType, monthlySalary: technicianMonthlySalary }
          : t
      );
      setTechnicians(updatedTechnicians);

      setSelectedTechnician({
        ...selectedTechnician,
        paymentType: technicianPaymentType,
        monthlySalary: technicianMonthlySalary
      });

      toast.success(`Podešavanja plaćanja za ${selectedTechnician.name} su sačuvana`);
    } catch (error) {
      console.error('Greška pri čuvanju podešavanja plaćanja:', error);
      toast.error('Greška pri čuvanju podešavanja plaćanja');
    } finally {
      setSaveLoading(false);
    }
  };

  const getCurrentTechnicianPrices = () => {
    if (!selectedTechnician) return {};

    const existingTech = technicianPrices.find(tp => tp.technicianId === selectedTechnician._id);
    return existingTech?.pricesByCustomerStatus || {};
  };

  const updateTechnicianPrice = (statusKey, value) => {
    if (!selectedTechnician) return;

    const existingTechIndex = technicianPrices.findIndex(tp =>
      tp.technicianId === selectedTechnician._id
    );

    let updatedTechnicianPrices;
    if (existingTechIndex >= 0) {
      updatedTechnicianPrices = [...technicianPrices];
      updatedTechnicianPrices[existingTechIndex].pricesByCustomerStatus[statusKey] = parseFloat(value) || 0;
    } else {
      const newTechPrices = { [statusKey]: parseFloat(value) || 0 };
      updatedTechnicianPrices = [...technicianPrices, {
        technicianId: selectedTechnician._id,
        pricesByCustomerStatus: newTechPrices
      }];
    }

    setTechnicianPrices(updatedTechnicianPrices);
  };

  // Server-side paginated fetch with filters
  const fetchReportsWithFilter = async (page = 1, overrideSearch = null, overrideTechnician = null) => {
    try {
      setTransactionsLoading(true);
      console.log('Finances: Fetching filtered reports...');
      const startTime = Date.now();

      const currentTechnician = overrideTechnician !== undefined ? overrideTechnician : selectedTechnicianFilter;

      const params = {
        page,
        limit: pagination.limit,
        search: overrideSearch !== null ? overrideSearch : searchTerm,
        technicianFilter: currentTechnician?._id || 'all'
      };

      console.log('📊 Selected technician filter state:', selectedTechnicianFilter);
      console.log('📊 Finances API params:', params);

      if (startDate) params.dateFrom = startDate.toISOString().split('T')[0];
      if (endDate) params.dateTo = endDate.toISOString().split('T')[0];

      const response = await financesAPI.getReports(params);

      const endTime = Date.now();
      console.log(`Finances: Filtered reports fetched in ${endTime - startTime}ms`);

      // Update financial reports (summary & stats) only on first page
      if (page === 1 && response.data.summary) {
        setFinancialReports({
          summary: response.data.summary,
          technicianStats: response.data.technicianStats || []
        });
      }

      setTransactions(response.data.transactions || []);
      setPagination(prev => response.data.pagination || prev);

      if (page === 1) {
        toast.success('Izveštaj je ažuriran');
      }
    } catch (error) {
      console.error('Greška pri učitavanju izveštaja:', error);
      toast.error('Greška pri učitavanju izveštaja');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Automatski osvežava finansijski pregled kada se promene datumi
  useEffect(() => {
    if (startDate || endDate) {
      const timer = setTimeout(() => {
        fetchReportsWithFilter();
      }, 500);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const retryFailedTransaction = async (workOrderId) => {
    setRetryLoading(prev => ({ ...prev, [workOrderId]: true }));
    try {
      const response = await financesAPI.retryFailedTransaction(workOrderId);

      if (response.data.success) {
        toast.success('Finansijska transakcija je uspešno kreirana');
        setFailedTransactions(prev => prev.filter(ft => ft.workOrderId._id !== workOrderId));
        fetchReportsWithFilter();
      } else {
        toast.error(response.data.message);
        const updatedFailedRes = await financesAPI.getFailedTransactions();
        setFailedTransactions(updatedFailedRes.data || []);
      }
    } catch (error) {
      console.error('Greška pri ponovnom obračunu:', error);
      toast.error('Greška pri ponovnom obračunu');
    } finally {
      setRetryLoading(prev => ({ ...prev, [workOrderId]: false }));
    }
  };

  const dismissFailedTransaction = async (workOrderId) => {
    try {
      await financesAPI.dismissFailedTransaction(workOrderId);
      toast.success('Neuspešna transakcija je označena kao razrešena');
      setFailedTransactions(prev => prev.filter(ft => ft.workOrderId._id !== workOrderId));
    } catch (error) {
      console.error('Greška pri označavanju kao razrešeno:', error);
      toast.error('Greška pri označavanju kao razrešeno');
    }
  };

  const excludeFromFinances = async (workOrderId) => {
    try {
      await financesAPI.excludeFromFinances(workOrderId);
      toast.success('Radni nalog je potpuno isključen iz finansijskih kalkulacija');
      setFailedTransactions(prev => prev.filter(ft => ft.workOrderId._id !== workOrderId));
    } catch (error) {
      console.error('Greška pri isključivanju iz finansija:', error);
      toast.error('Greška pri isključivanju iz finansija');
    }
  };

  const confirmDiscount = async (municipality, discountPercent, workOrderIds) => {
    setRetryLoading(prev => {
      const newState = { ...prev };
      workOrderIds.forEach(id => newState[id] = true);
      return newState;
    });

    try {
      const response = await financesAPI.confirmDiscount({
        municipality,
        discountPercent,
        workOrderIds
      });

      toast.success(response.data.message);

      const successfulIds = response.data.retryResults
        .filter(result => result.success)
        .map(result => result.workOrderId);

      setFailedTransactions(prev => prev.filter(ft => !successfulIds.includes(ft.workOrderId._id)));

      fetchReportsWithFilter();

    } catch (error) {
      console.error('Greška pri potvrdi popusta:', error);
      toast.error('Greška pri potvrdi popusta');
    } finally {
      setRetryLoading(prev => {
        const newState = { ...prev };
        workOrderIds.forEach(id => newState[id] = false);
        return newState;
      });
    }
  };

  // Quick date presets
  const setQuickDateRange = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case 'thisWeek':
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(today.getFullYear(), today.getMonth(), diff);
        end = new Date(today);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Helper funkcije za tabelu transakcija
  const getCustomerStatusShortName = (customerStatus) => {
    const shortNames = {
      'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme)': 'HFC Zgrada',
      'Priključenje korisnika na HFC KDS mreža u privatnim kućama sa instalacijom CPE opreme (izrada instalacije od PM-a do korisnika sa instalacijom kompletne CPE opreme)': 'HFC Kuća',
      'Priključenje korisnika na GPON mrežu u privatnim kućama (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme)': 'GPON Kuća',
      'Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme)': 'GPON Zgrada',
      'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji sa montažnim radovima': 'Sa Montažom',
      'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji bez montažnih radova': 'Bez Montaže',
      'Nov korisnik': 'Nov Korisnik'
    };
    return shortNames[customerStatus] || customerStatus;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('sr-RS') + ' RSD';
  };

  // Handle search/filter changes with server-side pagination
  const handleSearchChange = (newSearchTerm) => {
    console.log('💬 Search changed to:', newSearchTerm);
    setSearchTerm(newSearchTerm);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      console.log('💬 Executing debounced search for:', newSearchTerm);
      fetchReportsWithFilter(1, newSearchTerm);
    }, 500);
  };

  const handleTechnicianFilterChange = (technician) => {
    console.log('👤 Technician filter changed to:', technician);
    setSelectedTechnicianFilter(technician);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchReportsWithFilter(1, searchTerm, technician);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    fetchReportsWithFilter(newPage);
  };

  const currentTransactions = transactions;

  // Pagination component
  const PaginationComponent = () => {
    if (pagination.totalPages <= 1) return null;

    const getVisiblePages = () => {
      const current = pagination.currentPage;
      const total = pagination.totalPages;
      const delta = 2;

      let pages = [];

      if (current > delta + 1) {
        pages.push(1);
        if (current > delta + 2) pages.push('...');
      }

      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        pages.push(i);
      }

      if (current < total - delta) {
        if (current < total - delta - 1) pages.push('...');
        pages.push(total);
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          Prikazano {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} od {pagination.totalCount} rezultata
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="tertiary"
            size="small"
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage === 1}
          >
            &laquo;
          </Button>
          <Button
            type="tertiary"
            size="small"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
          >
            &lsaquo;
          </Button>

          {getVisiblePages().map((page, index) => (
            <Button
              key={index}
              type={page === pagination.currentPage ? "primary" : "tertiary"}
              size="small"
              onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
              disabled={page === '...'}
              className={page === pagination.currentPage ?
                "!bg-blue-600 !text-white !hover:bg-blue-700" :
                "hover:bg-gray-100"
              }
            >
              {page}
            </Button>
          ))}

          <Button
            type="tertiary"
            size="small"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            &rsaquo;
          </Button>
          <Button
            type="tertiary"
            size="small"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            &raquo;
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 font-medium">Učitavanje finansijskih podataka...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/50">
            <DollarSignIcon size={28} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Finansije</h1>
            <p className="text-slate-600 mt-1">Upravljanje cenama, popustima i finansijskim izveštajima</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2',
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <BarChartIcon size={18} />
              <span>Pregled</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2',
                activeTab === 'settings'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <SettingsIcon size={18} />
              <span>Postavke</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <>
          {/* Dashboard - KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            {/* Total Revenue Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUpIcon size={20} className="text-green-600" />
                </div>
              </div>
              <div className="text-sm font-medium text-green-800 mb-1">Ukupan Prihod</div>
              <div className="text-2xl font-bold text-green-900">
                {financialReports.summary.totalRevenue.toLocaleString()} RSD
              </div>
            </div>

            {/* Total Payouts Card */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDownIcon size={20} className="text-red-600" />
                </div>
              </div>
              <div className="text-sm font-medium text-red-800 mb-1">Ukupne Isplate</div>
              <div className="text-2xl font-bold text-red-900">
                {financialReports.summary.totalPayouts.toLocaleString()} RSD
              </div>
            </div>

            {/* Total Profit Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSignIcon size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="text-sm font-medium text-blue-800 mb-1">Ukupan Profit</div>
              <div className="text-2xl font-bold text-blue-900">
                {financialReports.summary.totalProfit.toLocaleString()} RSD
              </div>
            </div>

            {/* Date Range Picker Card */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-3">
                <CalendarIcon size={18} className="text-slate-600" />
                <div className="text-sm font-medium text-slate-700">Period</div>
              </div>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateSelect={(date) => setStartDate(date)}
                onEndDateSelect={(date) => setEndDate(date)}
                startPlaceholder="Od"
                endPlaceholder="Do"
                className="w-full mb-3"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setQuickDateRange('today')}
                  className="text-xs py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Danas
                </button>
                <button
                  onClick={() => setQuickDateRange('thisWeek')}
                  className="text-xs py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Ova nedelja
                </button>
                <button
                  onClick={() => setQuickDateRange('thisMonth')}
                  className="text-xs py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Ovaj mesec
                </button>
                <button
                  onClick={() => setQuickDateRange('lastMonth')}
                  className="text-xs py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Prošli mesec
                </button>
              </div>
            </div>
          </div>

          {/* Failed Transactions Compact Alert */}
          {failedTransactions && failedTransactions.length > 0 && (
            <div className="mb-6">
              <div className="rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 shadow-sm">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangleIcon size={20} className="text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-red-900">
                          Neuspešni finansijski obračuni ({failedTransactions.length})
                        </h3>
                        <p className="text-sm text-red-700">
                          Neki radni nalozi nisu mogli biti obračunati zbog nedostajućih podataka
                        </p>
                      </div>
                    </div>
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => setFailedTransactionsExpanded(!failedTransactionsExpanded)}
                      suffix={failedTransactionsExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                    >
                      {failedTransactionsExpanded ? 'Sakrij' : 'Prikaži'}
                    </Button>
                  </div>

                  {failedTransactionsExpanded && (
                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                      {failedTransactions.map((failed) => (
                        <div
                          key={failed._id}
                          className="bg-white/70 p-4 rounded-lg border border-red-100 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-semibold text-slate-800">
                                  {failed.workOrderDetails.tisJobId || 'N/A'}
                                </span>
                                <span className="text-sm text-slate-600">
                                  {failed.workOrderDetails.address}
                                </span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                  {failed.workOrderDetails.technicianNames.join(', ') || 'Bez tehničara'}
                                </span>
                              </div>
                              <div className="text-sm text-red-700 mb-2">
                                <strong>Problem:</strong> {failed.failureMessage}
                              </div>
                              {failed.missingFields && failed.missingFields.length > 0 && (
                                <div className="text-xs text-slate-600">
                                  <strong>Potrebno je:</strong>
                                  <ul className="list-disc list-inside mt-1 space-y-1">
                                    {failed.missingFields.map((field, index) => (
                                      <li key={index}>{field.description}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="text-xs text-slate-500 mt-2">
                                Pokušaj #{failed.attemptCount} •
                                Poslednji pokušaj: {new Date(failed.lastAttemptAt).toLocaleString('sr-RS')}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {failed.failureReason === 'PENDING_DISCOUNT_CONFIRMATION' && failed.pendingDiscountConfirmation ? (
                                <>
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => confirmDiscount(
                                      failed.pendingDiscountConfirmation.municipality,
                                      failed.pendingDiscountConfirmation.suggestedDiscount,
                                      [failed.workOrderId._id]
                                    )}
                                    disabled={retryLoading[failed.workOrderId._id]}
                                    prefix={retryLoading[failed.workOrderId._id] ? (
                                      <RefreshIcon className="animate-spin" size={14} />
                                    ) : (
                                      <CheckIcon size={14} />
                                    )}
                                    className="text-xs"
                                  >
                                    Potvrdi {failed.pendingDiscountConfirmation.suggestedDiscount}% popust
                                  </Button>
                                  <Button
                                    type="secondary"
                                    size="small"
                                    onClick={() => retryFailedTransaction(failed.workOrderId._id)}
                                    disabled={retryLoading[failed.workOrderId._id]}
                                    prefix={retryLoading[failed.workOrderId._id] ? (
                                      <RefreshIcon className="animate-spin" size={14} />
                                    ) : (
                                      <RefreshIcon size={14} />
                                    )}
                                    className="text-xs"
                                  >
                                    Pokušaj ponovo
                                  </Button>
                                  <Button
                                    type="danger"
                                    size="small"
                                    onClick={() => excludeFromFinances(failed.workOrderId._id)}
                                    prefix={<XIcon size={14} />}
                                    className="text-xs bg-red-600 hover:bg-red-700 text-white border-red-600"
                                  >
                                    Ne računaj
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="secondary"
                                    size="small"
                                    onClick={() => retryFailedTransaction(failed.workOrderId._id)}
                                    disabled={retryLoading[failed.workOrderId._id]}
                                    prefix={retryLoading[failed.workOrderId._id] ? (
                                      <RefreshIcon className="animate-spin" size={14} />
                                    ) : (
                                      <RefreshIcon size={14} />
                                    )}
                                    className="text-xs"
                                  >
                                    Obračunaj ponovo
                                  </Button>
                                  <Button
                                    type="tertiary"
                                    size="small"
                                    onClick={() => dismissFailedTransaction(failed.workOrderId._id)}
                                    prefix={<XIcon size={14} />}
                                    className="text-xs"
                                  >
                                    Zanemari
                                  </Button>
                                  <Button
                                    type="danger"
                                    size="small"
                                    onClick={() => excludeFromFinances(failed.workOrderId._id)}
                                    prefix={<XIcon size={14} />}
                                    className="text-xs bg-red-600 hover:bg-red-700 text-white border-red-600"
                                  >
                                    Ne računaj
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Technician Stats Grid */}
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Isplate po tehničarima</h3>
                <Button
                  type="secondary"
                  size="small"
                  onClick={fetchReportsWithFilter}
                  loading={transactionsLoading}
                  prefix={<RefreshIcon size={16} />}
                >
                  Osveži
                </Button>
              </div>

              {financialReports.technicianStats && financialReports.technicianStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {financialReports.technicianStats.map((tech) => {
                    const isOnSalary = tech.paymentType === 'plata';
                    const monthlySalary = tech.monthlySalary || 0;
                    const earnedTowardsSalary = tech.totalEarnings;
                    const percentageEarned = monthlySalary > 0 ? Math.min((earnedTowardsSalary / monthlySalary) * 100, 100) : 0;
                    const hasExceededSalary = earnedTowardsSalary >= monthlySalary;

                    return (
                      <div key={tech.technicianId} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-slate-900 truncate">{tech.name}</h4>
                            {isOnSalary && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Plata
                              </span>
                            )}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {tech.workOrdersCount} {tech.workOrdersCount === 1 ? 'nalog' : 'naloga'}
                          </span>
                        </div>

                        {isOnSalary ? (
                          <>
                            <div className="text-lg font-bold text-green-700 mb-1">
                              {earnedTowardsSalary.toLocaleString()} RSD
                              <span className="text-sm font-normal text-slate-500 ml-1">
                                / {monthlySalary.toLocaleString()} RSD
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mb-2">
                              {hasExceededSalary
                                ? 'Plata dostignuta - višak ide u profit'
                                : `Trenutno dostignuto: ${percentageEarned.toFixed(0)}%`
                              }
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  hasExceededSalary ? "bg-blue-500" : "bg-green-500"
                                )}
                                style={{ width: `${percentageEarned}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold text-green-700">
                              {tech.totalEarnings.toLocaleString()} RSD
                            </div>
                            <div className="text-xs text-slate-500">
                              Prosek: {Math.round(tech.totalEarnings / tech.workOrdersCount).toLocaleString()} RSD
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <DollarSignIcon size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>Nema podataka za izabrani period</p>
                </div>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Finansijske transakcije</h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="text"
                      placeholder="Pretraži po TIS Job ID, opštini, tipu usluge ili tehničaru..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => handleSearchChange('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={16} />
                      </button>
                    )}
                  </div>

                  {/* Technician Filter */}
                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="secondary"
                          size="medium"
                          prefix={<FilterIcon size={16} />}
                          suffix={<ChevronDownIcon size={16} />}
                        >
                          {selectedTechnicianFilter ? selectedTechnicianFilter.name : 'Svi tehničari'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 max-h-60 overflow-auto">
                        <DropdownMenuItem
                          onClick={() => handleTechnicianFilterChange(null)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            {!selectedTechnicianFilter && (
                              <CheckIcon className="h-4 w-4 text-blue-600" />
                            )}
                            <span>Svi tehničari</span>
                          </div>
                        </DropdownMenuItem>
                        {technicians && technicians.length > 0 && technicians.map((technician) => (
                          <DropdownMenuItem
                            key={technician._id}
                            onClick={() => handleTechnicianFilterChange(technician)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center space-x-2">
                              {selectedTechnicianFilter?._id === technician._id && (
                                <CheckIcon className="h-4 w-4 text-blue-600" />
                              )}
                              <span>{technician.name}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Column Visibility Toggle */}
                  <div className="relative">
                    <Button
                      type="tertiary"
                      size="medium"
                      prefix={<EyeIcon size={16} />}
                      onClick={() => setShowColumnMenu(!showColumnMenu)}
                    >
                      Kolone
                    </Button>

                    {showColumnMenu && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-md shadow-md z-50">
                        <div className="p-1">
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Prikaži kolone</div>
                          {Object.entries({
                            tisJobId: 'TIS Job ID',
                            municipality: 'Opština',
                            customerStatus: 'Tip usluge',
                            technicians: 'Tehničari',
                            basePrice: 'Osnovna cena',
                            discount: 'Popust',
                            finalPrice: 'Finalna cena',
                            technicianCosts: 'Troškovi tehničara',
                            profit: 'Profit',
                            verifiedAt: 'Datum'
                          }).map(([key, label]) => (
                            <label key={key} className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors">
                              <input
                                type="checkbox"
                                checked={visibleColumns[key]}
                                onChange={(e) => setVisibleColumns(prev => ({
                                  ...prev,
                                  [key]: e.target.checked
                                }))}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <Button
                    type="secondary"
                    size="medium"
                    onClick={fetchReportsWithFilter}
                    loading={transactionsLoading}
                    prefix={<RefreshIcon size={16} />}
                  >
                    Osveži
                  </Button>
                </div>
              </div>
            </div>

            {transactionsLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex items-center space-x-3 text-slate-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Učitavanje transakcija...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {visibleColumns.tisJobId && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            TIS Job ID
                          </th>
                        )}
                        {visibleColumns.municipality && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Opština
                          </th>
                        )}
                        {visibleColumns.customerStatus && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Tip usluge
                          </th>
                        )}
                        {visibleColumns.technicians && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Tehničari
                          </th>
                        )}
                        {visibleColumns.basePrice && (
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Osnovna cena
                          </th>
                        )}
                        {visibleColumns.discount && (
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Popust
                          </th>
                        )}
                        {visibleColumns.finalPrice && (
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Finalna cena
                          </th>
                        )}
                        {visibleColumns.technicianCosts && (
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Troškovi tehničara
                          </th>
                        )}
                        {visibleColumns.profit && (
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Profit
                          </th>
                        )}
                        {visibleColumns.verifiedAt && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Datum
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center space-y-2">
                              <DollarSignIcon size={48} className="text-slate-300" />
                              <p className="text-sm font-medium">Nema transakcija za prikazivanje</p>
                              <p className="text-xs">Promenite filter datuma ili pretragu</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentTransactions.map((transaction, index) => (
                          <tr key={transaction._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                            {visibleColumns.tisJobId && (
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {transaction.workOrderId?.tisJobId || transaction.tisJobId || '-'}
                              </td>
                            )}
                            {visibleColumns.municipality && (
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {transaction.municipality}
                              </td>
                            )}
                            {visibleColumns.customerStatus && (
                              <td className="px-6 py-4 text-sm text-slate-700">
                                <div className="max-w-xs">
                                  <div className="font-medium text-slate-900" title={transaction.customerStatus}>
                                    {getCustomerStatusShortName(transaction.customerStatus)}
                                  </div>
                                </div>
                              </td>
                            )}
                            {visibleColumns.technicians && (
                              <td className="px-6 py-4 text-sm text-slate-700">
                                <div className="max-w-xs">
                                  {transaction.technicians && transaction.technicians.length > 0 ? (
                                    <div className="space-y-1">
                                      {transaction.technicians.map((tech, techIndex) => (
                                        <div key={techIndex} className="flex items-center justify-between">
                                          <span className="font-medium text-slate-900 truncate" title={tech.name || tech.technicianId?.name}>
                                            {tech.name || tech.technicianId?.name || 'Unknown'}
                                          </span>
                                          <span className="text-xs text-green-700 font-mono ml-2">
                                            {formatCurrency(tech.earnings)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 italic">-</span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.basePrice && (
                              <td className="px-6 py-4 text-sm text-right font-mono text-slate-700">
                                {formatCurrency(transaction.basePrice)}
                              </td>
                            )}
                            {visibleColumns.discount && (
                              <td className="px-6 py-4 text-sm text-right text-slate-700">
                                {transaction.discountPercent || 0}% ({formatCurrency(transaction.discountAmount || (transaction.basePrice * ((transaction.discountPercent || 0) / 100)))})
                              </td>
                            )}
                            {visibleColumns.finalPrice && (
                              <td className="px-6 py-4 text-sm text-right font-mono text-green-700 font-semibold">
                                {formatCurrency(transaction.finalPrice)}
                              </td>
                            )}
                            {visibleColumns.technicianCosts && (
                              <td className="px-6 py-4 text-sm text-right font-mono text-red-700">
                                {formatCurrency(transaction.totalTechnicianEarnings)}
                              </td>
                            )}
                            {visibleColumns.profit && (
                              <td className="px-6 py-4 text-sm text-right font-mono font-semibold">
                                <span className={transaction.companyProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
                                  {formatCurrency(transaction.companyProfit)}
                                </span>
                              </td>
                            )}
                            {visibleColumns.verifiedAt && (
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {formatDate(transaction.verifiedAt)}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationComponent />
              </>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Settings Tab Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            {/* Cene po Tipu Usluge */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <DollarSignIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Cene po Tipu Usluge</h2>
                  <p className="text-sm text-gray-500">Postavite cene za različite tipove usluga</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {customerStatusOptions.map((option) => (
                      <div key={option.value} className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">
                          {option.label}
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Unesite cenu"
                            value={pricesByCustomerStatus[option.value] || ''}
                            onChange={(e) => setPricesByCustomerStatus({
                              ...pricesByCustomerStatus,
                              [option.value]: parseFloat(e.target.value) || 0
                            })}
                            className="pr-12"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-sm text-gray-500">RSD</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 px-6 py-4">
                  <Button
                    onClick={savePricesByCustomerStatus}
                    disabled={saveLoading}
                    loading={saveLoading}
                    prefix={<SaveIcon size={16} />}
                    className="w-full"
                  >
                    Sačuvaj Cene
                  </Button>
                </div>
              </div>
            </div>

            {/* Popusti po Opštinama */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <DollarSignIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Popusti po Opštinama</h2>
                  <p className="text-sm text-gray-500">Upravlja popustima za različite opštine</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {discountsByMunicipality.map((discount, index) => (
                      <div key={discount.municipality} className="flex items-center justify-between p-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {discount.municipality}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={discount.discountPercent}
                            onChange={(e) => {
                              const updatedDiscounts = [...discountsByMunicipality];
                              updatedDiscounts[index].discountPercent = parseFloat(e.target.value) || 0;
                              setDiscountsByMunicipality(updatedDiscounts);
                            }}
                            className="w-20 text-center"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 px-6 py-4">
                  <Button
                    onClick={saveDiscountsByMunicipality}
                    disabled={saveLoading}
                    loading={saveLoading}
                    prefix={<SaveIcon size={16} />}
                    className="w-full"
                  >
                    Sačuvaj Popuste
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Cene za Tehničare - Full Width */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <DollarSignIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cene za Tehničare</h2>
                <p className="text-sm text-gray-500">Postavite cene po tipu usluge za svakog tehničara</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Dropdown za izbor tehničara */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Izaberite tehničara
                      </label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="secondary"
                            size="medium"
                            suffix={<ChevronDownIcon size={16} />}
                            className="w-full justify-between"
                          >
                            <span className="truncate">
                              {selectedTechnician ? selectedTechnician.name : 'Izaberite tehničara'}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-auto">
                          {technicians && technicians.length > 0 ? (
                            technicians.map((technician) => (
                              <DropdownMenuItem
                                key={technician._id}
                                onClick={() => handleTechnicianSelect(technician)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center space-x-2">
                                  {selectedTechnician?._id === technician._id && (
                                    <CheckIcon className="h-4 w-4 text-purple-600" />
                                  )}
                                  <span>{technician.name}</span>
                                </div>
                              </DropdownMenuItem>
                            ))
                          ) : (
                            <DropdownMenuItem disabled className="text-slate-500 italic">
                              Nema dostupnih tehničara
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Input polja za izabranog tehničara */}
                    {selectedTechnician && (
                      <div className="space-y-4 p-4 bg-purple-50/30 rounded-lg border border-purple-100">
                        <div className="text-sm text-purple-800 font-medium mb-3">
                          Podešavanja za: {selectedTechnician.name}
                        </div>

                        {/* Navbar menu za izbor tipa plaćanja */}
                        <div className="flex space-x-2 mb-4 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => setTechnicianPaymentType('po_statusu')}
                            className={cn(
                              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                              technicianPaymentType === 'po_statusu'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            )}
                          >
                            Po Statusu Naloga
                          </button>
                          <button
                            onClick={() => setTechnicianPaymentType('plata')}
                            className={cn(
                              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                              technicianPaymentType === 'plata'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            )}
                          >
                            Plata
                          </button>
                        </div>

                        {/* Prikaz različitih input-a u zavisnosti od tipa plaćanja */}
                        {technicianPaymentType === 'po_statusu' ? (
                          <div className="space-y-3">
                            {customerStatusOptions.map((option) => {
                              const currentPrices = getCurrentTechnicianPrices();
                              return (
                                <div key={option.value} className="space-y-1">
                                  <label className="text-xs font-medium text-slate-600 block">
                                    {option.label}
                                  </label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      value={currentPrices[option.value] || ''}
                                      onChange={(e) => updateTechnicianPrice(option.value, e.target.value)}
                                      className="pr-12 bg-white border-slate-200 focus:border-purple-400 focus:ring-purple-400/20"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                                      RSD
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <Button
                              type="primary"
                              size="medium"
                              onClick={saveTechnicianPrices}
                              disabled={saveLoading}
                              loading={saveLoading}
                              prefix={<SaveIcon size={16} />}
                              className="w-full"
                            >
                              Sačuvaj Cene za {selectedTechnician.name}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-600 block">
                                Mesečna plata (od 1og do poslednjeg dana u mesecu)
                              </label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="Unesite mesečnu platu"
                                  value={technicianMonthlySalary}
                                  onChange={(e) => setTechnicianMonthlySalary(parseFloat(e.target.value) || 0)}
                                  className="pr-12 bg-white border-slate-200 focus:border-purple-400 focus:ring-purple-400/20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                                  RSD
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                              <strong>Napomena:</strong> Tehničar sa platom zarađuje iz radnih naloga dok ne dostigne svoju mesečnu platu. Nakon toga, sav višak ide direktno u profit.
                            </div>
                            <Button
                              type="primary"
                              size="medium"
                              onClick={saveTechnicianPaymentSettings}
                              disabled={saveLoading}
                              loading={saveLoading}
                              prefix={<SaveIcon size={16} />}
                              className="w-full"
                            >
                              Sačuvaj Platu za {selectedTechnician.name}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista svih tehničara sa cenama */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Pregled cena za sve tehničare</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {technicians && technicians.length > 0 ? technicians.map((technician) => {
                        const techPrices = technicianPrices.find(tp => tp.technicianId === technician._id);
                        const paymentType = technician.paymentType || 'po_statusu';
                        return (
                          <div key={technician._id} className="p-4 bg-white/60 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-slate-800">{technician.name}</h4>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  paymentType === 'plata'
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                )}>
                                  {paymentType === 'plata' ? 'Plata' : 'Po Statusu'}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTechnicianSelect(technician)}
                                className="text-xs"
                              >
                                Uredi
                              </Button>
                            </div>
                            {paymentType === 'po_statusu' ? (
                              techPrices ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  {customerStatusOptions.map((option) => {
                                    const price = techPrices.pricesByCustomerStatus[option.value];
                                    return price ? (
                                      <div key={option.value} className="flex justify-between">
                                        <span className="text-slate-600 truncate">{option.label}:</span>
                                        <span className="font-medium text-slate-800">{price.toLocaleString()} RSD</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">Nisu postavljene cene</p>
                              )
                            ) : (
                              <div className="text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600">Mesečna plata:</span>
                                  <span className="font-medium text-green-700">{technician.monthlySalary?.toLocaleString() || 0} RSD</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="text-center py-8 text-slate-500">
                          <p>Nema dostupnih tehničara u sistemu</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Finances;
