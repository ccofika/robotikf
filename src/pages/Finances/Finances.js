import React, { useState, useEffect } from 'react';
import { BarChart3, Settings, RefreshCw, Save, Check, X, ChevronDown, ChevronUp, AlertTriangle, Pencil, CalendarDays } from 'lucide-react';
import { DateRangePicker } from '../../components/ui/date-picker';
import { financesAPI } from '../../services/api';
import { toast } from '../../components/ui/toast';
import { cx, Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note, Tabs, Stat } from '../../security/sx/layout';
import { Field, Select, Choice, SearchField } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { Pager, ColumnMenu, Loading } from '../../montaza/ui';
import './Finances.mx.css';

// Kolone tabele transakcija (meni Kolone)
const COLUMNS = {
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
};

const QUICK_RANGES = [['today', 'Danas'], ['thisWeek', 'Ova nedelja'], ['thisMonth', 'Ovaj mesec'], ['lastMonth', 'Prošli mesec']];

// Iznos sa jedinicom: izgled kao NumberField, ali ostaje type="number" (decimale, isti onChange sa događajem)
const Money = ({ suffix = 'RSD', className, ...rest }) => (
  <span className={cx('sx-numfield mx-finances-money', className)}>
    <input type="number" className="sx-numfield__in" {...rest} />
    <span className="sx-numfield__suffix">{suffix}</span>
  </span>
);

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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('Finances: Fetching optimized initial data...');
      const startTime = Date.now();

      // Pripremi parametre za datume - koristi lokalni datum bez UTC konverzije
      const params = {};
      if (startDate) {
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        params.dateFrom = `${year}-${month}-${day}`;
      }
      if (endDate) {
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        params.dateTo = `${year}-${month}-${day}`;
      }

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

      // Čuvanje cena na "Po Statusu Naloga" tabu znači da tehničar radi po statusu.
      // Ako je ranije bio na "plata", moramo i da prebacimo paymentType - inače ostaje
      // na plati i unete cene se ne koriste u obračunu (bug koji je ostavljao tehničare na plati).
      if (selectedTechnician.paymentType !== 'po_statusu') {
        await financesAPI.saveTechnicianPaymentSettings({
          technicianId: selectedTechnician._id,
          paymentType: 'po_statusu',
          monthlySalary: 0
        });

        const updatedTechnicians = technicians.map(t =>
          t._id === selectedTechnician._id
            ? { ...t, paymentType: 'po_statusu', monthlySalary: 0 }
            : t
        );
        setTechnicians(updatedTechnicians);
        setSelectedTechnician({ ...selectedTechnician, paymentType: 'po_statusu', monthlySalary: 0 });
        setTechnicianMonthlySalary(0);
      }

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

      // Koristi lokalni datum bez UTC konverzije
      if (startDate) {
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        params.dateFrom = `${year}-${month}-${day}`;
      }
      if (endDate) {
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        params.dateTo = `${year}-${month}-${day}`;
      }

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

  // Migrira stare customerStatus ključeve (HFC/GPON/Radovi bez sufiksa) u nove
  // (sa " sa isporukom materijala" sufiksom) u FinancialSettings dokumentu.
  // Bezbedno za višestruko pokretanje.
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const migrateCustomerStatusKeys = async () => {
    if (!(await confirm({ title: 'Ovo će preimenovati stare ključeve cena (HFC/GPON/Radovi bez sufiksa) u nove (sa "sa isporukom materijala"). Nastavi?', tone: 'danger', confirmLabel: 'Migriraj' }))) {
      return;
    }
    setBulkActionLoading(true);
    try {
      const response = await financesAPI.migrateCustomerStatusKeys();
      const { globalRenamed, globalSkipped, techniciansAffected } = response.data;
      toast.success(`Migracija završena: ${globalRenamed} globalnih cena preimenovano, ${techniciansAffected} tehničara ažurirano${globalSkipped > 0 ? ` (${globalSkipped} preskočeno jer novi ključ već ima vrednost)` : ''}`);
      // Osveži settings da bi se nove cene prikazale
      const settingsRes = await financesAPI.getSettings();
      setPricesByCustomerStatus(settingsRes.data.pricesByCustomerStatus || {});
      setTechnicianPrices(settingsRes.data.technicianPrices || []);
    } catch (error) {
      console.error('Greška pri migraciji ključeva:', error);
      toast.error('Greška pri migraciji ključeva: ' + (error.response?.data?.error || error.message));
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Pokuša ponovo obračun za sve nerazrešene failed transakcije
  const retryAllFailedTransactions = async () => {
    if (!(await confirm({ title: `Ovo će pokušati ponovo obračun za sve neuspesne radne naloge (${failedTransactions.length}). Nastavi?`, tone: 'danger', confirmLabel: 'Obračunaj' }))) {
      return;
    }
    setBulkActionLoading(true);
    try {
      const response = await financesAPI.retryAllFailedTransactions();
      const { summary } = response.data;
      toast.success(`Bulk retry završen: ${summary.succeeded} uspešno, ${summary.stillFailing} i dalje failuje, ${summary.errors} grešaka`);
      // Osveži failed transakcije i reports
      const failedRes = await financesAPI.getFailedTransactions();
      setFailedTransactions(failedRes.data || []);
      fetchReportsWithFilter();
    } catch (error) {
      console.error('Greška pri bulk retry-u:', error);
      toast.error('Greška pri bulk retry-u: ' + (error.response?.data?.error || error.message));
    } finally {
      setBulkActionLoading(false);
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
      'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala': 'HFC Zgrada',
      'Priključenje korisnika na HFC KDS mreža u privatnim kućama sa instalacijom CPE opreme (izrada instalacije od PM-a do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala': 'HFC Kuća',
      'Priključenje korisnika na GPON mrežu u privatnim kućama (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala': 'GPON Kuća',
      'Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala': 'GPON Zgrada',
      'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji sa montažnim radovima sa isporukom materijala': 'Sa Montažom',
      'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji bez montažnih radova sa isporukom materijala': 'Bez Montaže',
      'Nov korisnik': 'Nov Korisnik',
      'Priključenje novog korisnika WiFi tehnologijom (postavljanje nosača antene, postavljanje i usmeravanje antene ka baznoj stanici sa postavljanjem napajanja za antenu, postavljanje rutera i jednog uređaja za televiziju) - ASTRA TELEKOM': 'WiFi Priključenje (ASTRA)',
      'Dodavanje drugog uređaja ili dorada - ASTRA TELEKOM': 'Dodavanje/Dorada (ASTRA)',
      'Demontaža postojeće opreme kod korisnika (po korisniku) - ASTRA TELEKOM': 'Demontaža (ASTRA)',
      'Intervencija kod korisnika - ASTRA TELEKOM': 'Intervencija (ASTRA)',
      'Priključenje korisnika GPON tehnologijom (povezivanje svih uređaja u okviru paketa) - ASTRA TELEKOM': 'GPON Priključenje (ASTRA)'
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

  const validFailedTransactions = (failedTransactions || []).filter(
    failed => failed.workOrderId && failed.workOrderId._id
  );
  const hasTechStats = !!(financialReports.technicianStats && financialReports.technicianStats.length > 0);
  const refreshButton = <Btn size="sm" icon={RefreshCw} onClick={fetchReportsWithFilter} busy={transactionsLoading}>Osveži</Btn>;

  return (
    <div className="sx-page mx-finances" data-testid="page-finances">
      <PageHead
        eyebrow="Montaža · Finansije"
        title="Finansije"
        lead="Upravljanje cenama, popustima i finansijskim izveštajima"
      />

      {loading ? (
        <Loading rows={6} text="Učitavanje finansijskih podataka..." />
      ) : (
        <>
          <Tabs
            ariaLabel="Finansije"
            layoutId="mx-finances-tabs"
            value={activeTab}
            onChange={setActiveTab}
            items={[{ key: 'overview', label: 'Pregled', icon: BarChart3 }, { key: 'settings', label: 'Postavke', icon: Settings }]}
          />

          {activeTab === 'overview' ? (
            <>
              <div className="sx-stats mx-finances-kpis">
                <Stat label="Ukupan Prihod" value={financialReports.summary.totalRevenue.toLocaleString()} small=" RSD" />
                <Stat label="Ukupne Isplate" value={financialReports.summary.totalPayouts.toLocaleString()} small=" RSD" />
                <Stat label="Ukupan Profit" value={financialReports.summary.totalProfit.toLocaleString()} small=" RSD" tone={financialReports.summary.totalProfit < 0 ? 'bad' : null} />
                <div className="sx-stat mx-finances-period">
                  <span className="sx-label"><CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" /> Period</span>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateSelect={(date) => setStartDate(date)}
                    onEndDateSelect={(date) => setEndDate(date)}
                    startPlaceholder="Od"
                    endPlaceholder="Do"
                  />
                  <div className="mx-finances-quick">
                    {QUICK_RANGES.map(([key, label]) => (
                      <Btn key={key} size="sm" variant="ghost" onClick={() => setQuickDateRange(key)}>{label}</Btn>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sx-stack">
                {validFailedTransactions.length > 0 && (
                  <Panel
                    tone="bad"
                    pad={false}
                    title={`Neuspešni finansijski obračuni (${validFailedTransactions.length})`}
                    sub="Neki radni nalozi nisu mogli biti obračunati zbog nedostajućih podataka"
                    actions={<>
                      <Btn size="sm" onClick={migrateCustomerStatusKeys} disabled={bulkActionLoading}>
                        {bulkActionLoading ? 'Radi...' : 'Migriraj cene'}
                      </Btn>
                      <Btn size="sm" variant="primary" onClick={retryAllFailedTransactions} disabled={bulkActionLoading || validFailedTransactions.length === 0}>
                        {bulkActionLoading ? 'Radi...' : `Obračunaj sve ponovo (${validFailedTransactions.length})`}
                      </Btn>
                      <Btn size="sm" variant="ghost" iconRight={failedTransactionsExpanded ? ChevronUp : ChevronDown} onClick={() => setFailedTransactionsExpanded(!failedTransactionsExpanded)}>
                        {failedTransactionsExpanded ? 'Sakrij' : 'Prikaži'}
                      </Btn>
                    </>}
                  >
                    {failedTransactionsExpanded && (
                      <div className="sx-list mx-finances-failed">
                        {failedTransactions.map((failed) => {
                          // Provera da li postoji workOrderId
                          if (!failed.workOrderId || !failed.workOrderId._id) {
                            return null;
                          }
                          const workOrderId = failed.workOrderId._id;
                          const busy = !!retryLoading[workOrderId];

                          return (
                            <div key={failed._id} className="sx-item">
                              <span className="sx-item__icon is-bad"><AlertTriangle size={17} strokeWidth={1.9} aria-hidden="true" /></span>
                              <div className="sx-item__main">
                                <div className="mx-inline">
                                  <b>{failed.workOrderDetails?.tisJobId || 'N/A'}</b>
                                  <span className="sx-tag">{failed.workOrderDetails?.technicianNames?.join(', ') || 'Bez tehničara'}</span>
                                </div>
                                <span>{failed.workOrderDetails?.address || 'N/A'}</span>
                                <div className="mx-finances-failed__problem"><strong>Problem:</strong> {failed.failureMessage}</div>
                                {failed.missingFields && failed.missingFields.length > 0 && (
                                  <div className="mx-finances-failed__need">
                                    <strong>Potrebno je:</strong>
                                    <ul>
                                      {failed.missingFields.map((field, index) => (
                                        <li key={index}>{field.description}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <span className="mx-finances-failed__meta">
                                  Pokušaj #{failed.attemptCount} • Poslednji pokušaj: {new Date(failed.lastAttemptAt).toLocaleString('sr-RS')}
                                </span>
                              </div>
                              <div className="sx-item__side">
                                {failed.failureReason === 'PENDING_DISCOUNT_CONFIRMATION' && failed.pendingDiscountConfirmation ? (
                                  <>
                                    <Btn
                                      size="sm"
                                      variant="primary"
                                      icon={Check}
                                      busy={busy}
                                      onClick={() => confirmDiscount(
                                        failed.pendingDiscountConfirmation.municipality,
                                        failed.pendingDiscountConfirmation.suggestedDiscount,
                                        [workOrderId]
                                      )}
                                    >
                                      Potvrdi {failed.pendingDiscountConfirmation.suggestedDiscount}% popust
                                    </Btn>
                                    <Btn size="sm" icon={RefreshCw} busy={busy} onClick={() => retryFailedTransaction(workOrderId)}>Pokušaj ponovo</Btn>
                                    <Btn size="sm" variant="danger" icon={X} onClick={() => excludeFromFinances(workOrderId)}>Ne računaj</Btn>
                                  </>
                                ) : (
                                  <>
                                    <Btn size="sm" icon={RefreshCw} busy={busy} onClick={() => retryFailedTransaction(workOrderId)}>Obračunaj ponovo</Btn>
                                    <Btn size="sm" variant="ghost" icon={X} onClick={() => dismissFailedTransaction(workOrderId)}>Zanemari</Btn>
                                    <Btn size="sm" variant="danger" icon={X} onClick={() => excludeFromFinances(workOrderId)}>Ne računaj</Btn>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                )}

                <Panel title="Isplate po tehničarima" actions={refreshButton} pad={hasTechStats}>
                  {hasTechStats ? (
                    <div className="mx-finances-techs">
                      {financialReports.technicianStats.map((tech) => {
                        const isOnSalary = tech.paymentType === 'plata';
                        const monthlySalary = tech.monthlySalary || 0;
                        const earnedTowardsSalary = tech.totalEarnings;
                        const percentageEarned = monthlySalary > 0 ? Math.min((earnedTowardsSalary / monthlySalary) * 100, 100) : 0;
                        const hasExceededSalary = earnedTowardsSalary >= monthlySalary;

                        return (
                          <div key={tech.technicianId} className="mx-finances-tech">
                            <div className="mx-finances-tech__top">
                              <b title={tech.name}>{tech.name}</b>
                              {isOnSalary && <span className="sx-tag is-ok">Plata</span>}
                              <span className="sx-tag mx-right">{tech.workOrdersCount} {tech.workOrdersCount === 1 ? 'nalog' : 'naloga'}</span>
                            </div>
                            {isOnSalary ? (
                              <>
                                <div className="mx-finances-tech__sum sx-num">
                                  {earnedTowardsSalary.toLocaleString()} RSD
                                  <small> / {monthlySalary.toLocaleString()} RSD</small>
                                </div>
                                <span className="mx-finances-tech__sub">
                                  {hasExceededSalary
                                    ? 'Plata dostignuta - višak ide u profit'
                                    : `Trenutno dostignuto: ${percentageEarned.toFixed(0)}%`}
                                </span>
                                <span className={cx('mx-finances-bar', hasExceededSalary && 'is-full')} aria-hidden="true">
                                  <i style={{ transform: `scaleX(${percentageEarned / 100})` }} />
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="mx-finances-tech__sum sx-num">{tech.totalEarnings.toLocaleString()} RSD</div>
                                <span className="mx-finances-tech__sub">
                                  {/* Tehničar može u periodu imati samo odbitak za reklamaciju (0 naloga) */}
                                  Prosek: {tech.workOrdersCount > 0
                                    ? `${Math.round(tech.totalEarnings / tech.workOrdersCount).toLocaleString()} RSD`
                                    : '-'}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="sx-empty-block">
                      <b>Nema podataka za izabrani period</b>
                    </div>
                  )}
                </Panel>

                <Panel pad={false} title="Finansijske transakcije">
                  <div className="mx-finances-filters">
                    <SearchField
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="Pretraži po TIS Job ID, opštini, tipu usluge ili tehničaru..."
                    />
                    <Select
                      size="sm"
                      aria-label="Tehničar"
                      value={selectedTechnicianFilter ? selectedTechnicianFilter._id : ''}
                      onChange={(e) => handleTechnicianFilterChange(technicians.find(t => t._id === e.target.value) || null)}
                    >
                      <option value="">Svi tehničari</option>
                      {technicians && technicians.length > 0 && technicians.map((technician) => (
                        <option key={technician._id} value={technician._id}>{technician.name}</option>
                      ))}
                    </Select>
                    <div className="mx-inline mx-right">
                      <ColumnMenu
                        columns={COLUMNS}
                        visible={visibleColumns}
                        onChange={(key, checked) => setVisibleColumns(prev => ({ ...prev, [key]: checked }))}
                      />
                      {refreshButton}
                    </div>
                  </div>

                  {transactionsLoading ? (
                    <Loading text="Učitavanje transakcija..." />
                  ) : (
                    <>
                      {currentTransactions.length === 0 ? (
                        <div className="sx-empty-block">
                          <b>Nema transakcija za prikazivanje</b>
                          <span>Promenite filter datuma ili pretragu</span>
                        </div>
                      ) : (
                        <div className="sx-tablewrap mx-finances-tx">
                          <table className="sx-table">
                            <thead>
                              <tr>
                                {visibleColumns.tisJobId && <th>TIS Job ID</th>}
                                {visibleColumns.municipality && <th>Opština</th>}
                                {visibleColumns.customerStatus && <th>Tip usluge</th>}
                                {visibleColumns.technicians && <th>Tehničari</th>}
                                {visibleColumns.basePrice && <th className="is-num">Osnovna cena</th>}
                                {visibleColumns.discount && <th className="is-num">Popust</th>}
                                {visibleColumns.finalPrice && <th className="is-num">Finalna cena</th>}
                                {visibleColumns.technicianCosts && <th className="is-num">Troškovi tehničara</th>}
                                {visibleColumns.profit && <th className="is-num">Profit</th>}
                                {visibleColumns.verifiedAt && <th>Datum</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {currentTransactions.map((transaction, index) => (
                                <tr key={transaction._id} style={{ '--i': index }}>
                                  {visibleColumns.tisJobId && (
                                    <td className="is-head">
                                      <div className="sx-cell">
                                        <b>{transaction.workOrderId?.tisJobId || transaction.tisJobId || '-'}</b>
                                        {(transaction.entryType === 'complaint_deduction' || transaction.entryType === 'complaint_fix' || transaction.rejectionPenaltyPercent > 0 || transaction.penaltyAdjustedAt) && (
                                          <div className="mx-finances-tags">
                                            {transaction.entryType === 'complaint_deduction' && (
                                              <span className="sx-tag is-bad">
                                                {transaction.deductionKind === 'complaint_order'
                                                  ? 'Reklamacija - ne plaća se'
                                                  : transaction.deductionKind === 'complaint_extra'
                                                    ? `Skinut zbog reklamacije ${transaction.relatedTisJobId || transaction.relatedTisId || ''}`
                                                    : transaction.deductionKind === 'complaint_extra_fallback'
                                                      ? 'Reklamacija - dodatni odbitak'
                                                      : 'Reklamacija - odbitak'}
                                              </span>
                                            )}
                                            {transaction.entryType === 'complaint_fix' && (
                                              <span className="sx-tag is-info">Ispravka po reklamaciji</span>
                                            )}
                                            {transaction.rejectionPenaltyPercent > 0 && (
                                              <span className="sx-tag is-bad">Vraćan · minus {transaction.rejectionPenaltyPercent}%</span>
                                            )}
                                            {transaction.penaltyAdjustedAt && (
                                              <span
                                                className="sx-tag is-warn"
                                                title={`Minus promenio ${transaction.penaltyAdjustedByName || 'superadmin'} ${new Date(transaction.penaltyAdjustedAt).toLocaleString('sr-RS')}`}
                                              >
                                                Minus promenjen · {transaction.penaltyPercentOriginal ?? 0}% → {transaction.rejectionPenaltyPercent || 0}%
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {visibleColumns.municipality && <td data-label="Opština">{transaction.municipality}</td>}
                                  {visibleColumns.customerStatus && (
                                    <td data-label="Tip usluge">
                                      <span className="mx-strong" title={transaction.customerStatus}>
                                        {getCustomerStatusShortName(transaction.customerStatus)}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.technicians && (
                                    <td data-label="Tehničari" className="is-wide">
                                      {transaction.technicians && transaction.technicians.length > 0 ? (
                                        <div className="mx-finances-techcell">
                                          {transaction.technicians.map((tech, techIndex) => (
                                            <div key={techIndex} className="mx-finances-techcell__row">
                                              <span title={tech.name || tech.technicianId?.name}>
                                                {tech.name || tech.technicianId?.name || 'Unknown'}
                                              </span>
                                              <span className={tech.earnings < 0 ? 'mx-finances-neg' : undefined}>
                                                {formatCurrency(tech.earnings)}
                                                {tech.penaltyPercent > 0 && (
                                                  <span
                                                    className="mx-finances-neg"
                                                    title={`Umanjeno ${tech.penaltyPercent}% (${formatCurrency(tech.penaltyAmount || 0)}) zbog vraćanja naloga`}
                                                  >
                                                    {' '}(-{tech.penaltyPercent}%)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="sx-faint">-</span>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.basePrice && (
                                    <td data-label="Osnovna cena" className="is-num">{formatCurrency(transaction.basePrice)}</td>
                                  )}
                                  {visibleColumns.discount && (
                                    <td data-label="Popust" className="is-num">
                                      {transaction.discountPercent || 0}% ({formatCurrency(transaction.discountAmount || (transaction.basePrice * ((transaction.discountPercent || 0) / 100)))})
                                    </td>
                                  )}
                                  {visibleColumns.finalPrice && (
                                    <td data-label="Finalna cena" className="is-num mx-strong">{formatCurrency(transaction.finalPrice)}</td>
                                  )}
                                  {visibleColumns.technicianCosts && (
                                    <td data-label="Troškovi tehničara" className="is-num">{formatCurrency(transaction.totalTechnicianEarnings)}</td>
                                  )}
                                  {visibleColumns.profit && (
                                    <td data-label="Profit" className={cx('is-num mx-strong', transaction.companyProfit < 0 && 'mx-finances-neg')}>
                                      {formatCurrency(transaction.companyProfit)}
                                    </td>
                                  )}
                                  {visibleColumns.verifiedAt && (
                                    <td data-label="Datum" className="sx-nowrap">{formatDate(transaction.verifiedAt)}</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <Pager page={pagination.currentPage} total={pagination.totalCount} perPage={pagination.limit} onPage={handlePageChange} />
                    </>
                  )}
                </Panel>
              </div>
            </>
          ) : (
            <div className="sx-stack">
              <div className="sx-cols sx-cols--2">
                {/* Cene po Tipu Usluge */}
                <Panel
                  title="Cene po Tipu Usluge"
                  sub="Postavite cene za različite tipove usluga"
                  footer={<Btn variant="primary" icon={Save} onClick={savePricesByCustomerStatus} busy={saveLoading}>Sačuvaj Cene</Btn>}
                >
                  <div className="mx-finances-scrollbox">
                    {customerStatusOptions.map((option, i) => (
                      <Field key={option.value} label={option.label} htmlFor={`fin-price-${i}`}>
                        <Money
                          id={`fin-price-${i}`}
                          className="is-wide"
                          placeholder="Unesite cenu"
                          value={pricesByCustomerStatus[option.value] || ''}
                          onChange={(e) => setPricesByCustomerStatus({
                            ...pricesByCustomerStatus,
                            [option.value]: parseFloat(e.target.value) || 0
                          })}
                        />
                      </Field>
                    ))}
                  </div>
                </Panel>

                {/* Popusti po Opštinama */}
                <Panel
                  title="Popusti po Opštinama"
                  sub="Upravlja popustima za različite opštine"
                  footer={<Btn variant="primary" icon={Save} onClick={saveDiscountsByMunicipality} busy={saveLoading}>Sačuvaj Popuste</Btn>}
                >
                  <div className="mx-finances-scrollbox">
                    {discountsByMunicipality.map((discount, index) => (
                      <div key={discount.municipality} className="mx-finances-row">
                        <label htmlFor={`fin-discount-${index}`}>{discount.municipality}</label>
                        <Money
                          id={`fin-discount-${index}`}
                          suffix="%"
                          className="is-pct"
                          min="0"
                          max="100"
                          value={discount.discountPercent}
                          onChange={(e) => {
                            const updatedDiscounts = [...discountsByMunicipality];
                            updatedDiscounts[index].discountPercent = parseFloat(e.target.value) || 0;
                            setDiscountsByMunicipality(updatedDiscounts);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              {/* Cene za Tehničare */}
              <Panel title="Cene za Tehničare" sub="Postavite cene po tipu usluge za svakog tehničara">
                <div className="sx-cols sx-cols--2">
                  <div className="mx-gap">
                    <Field label="Izaberite tehničara" htmlFor="fin-technician">
                      <Select
                        id="fin-technician"
                        value={selectedTechnician ? selectedTechnician._id : ''}
                        onChange={(e) => {
                          const technician = technicians.find(t => t._id === e.target.value);
                          if (technician) handleTechnicianSelect(technician);
                        }}
                      >
                        {technicians && technicians.length > 0 ? (
                          <>
                            <option value="" disabled>Izaberite tehničara</option>
                            {technicians.map((technician) => (
                              <option key={technician._id} value={technician._id}>{technician.name}</option>
                            ))}
                          </>
                        ) : (
                          <option value="" disabled>Nema dostupnih tehničara</option>
                        )}
                      </Select>
                    </Field>

                    {selectedTechnician && (
                      <div className="mx-finances-techform">
                        <div className="sx-fieldset__title">Podešavanja za: {selectedTechnician.name}</div>
                        <Choice
                          label="Tip plaćanja"
                          layoutId="mx-finances-paytype"
                          value={technicianPaymentType}
                          onChange={setTechnicianPaymentType}
                          options={[{ value: 'po_statusu', label: 'Po Statusu Naloga' }, { value: 'plata', label: 'Plata' }]}
                        />

                        {technicianPaymentType === 'po_statusu' ? (
                          <>
                            <div>
                              {customerStatusOptions.map((option, i) => {
                                const currentPrices = getCurrentTechnicianPrices();
                                return (
                                  <Field key={option.value} label={option.label} htmlFor={`fin-tech-price-${i}`}>
                                    <Money
                                      id={`fin-tech-price-${i}`}
                                      className="is-wide"
                                      placeholder="0"
                                      value={currentPrices[option.value] || ''}
                                      onChange={(e) => updateTechnicianPrice(option.value, e.target.value)}
                                    />
                                  </Field>
                                );
                              })}
                            </div>
                            <Btn variant="primary" icon={Save} onClick={saveTechnicianPrices} busy={saveLoading} className="mx-finances-full">
                              Sačuvaj Cene za {selectedTechnician.name}
                            </Btn>
                          </>
                        ) : (
                          <>
                            <Field label="Mesečna plata (od 1og do poslednjeg dana u mesecu)" htmlFor="fin-salary">
                              <Money
                                id="fin-salary"
                                className="is-wide"
                                placeholder="Unesite mesečnu platu"
                                value={technicianMonthlySalary}
                                onChange={(e) => setTechnicianMonthlySalary(parseFloat(e.target.value) || 0)}
                              />
                            </Field>
                            <Note tone="info">
                              <b>Napomena:</b> Tehničar sa platom zarađuje iz radnih naloga dok ne dostigne svoju mesečnu platu. Nakon toga, sav višak ide direktno u profit.
                            </Note>
                            <Btn variant="primary" icon={Save} onClick={saveTechnicianPaymentSettings} busy={saveLoading} className="mx-finances-full">
                              Sačuvaj Platu za {selectedTechnician.name}
                            </Btn>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista svih tehničara sa cenama */}
                  <div className="mx-gap">
                    <h3 className="sx-fieldset__title">Pregled cena za sve tehničare</h3>
                    <div className="mx-finances-scrollbox">
                      {technicians && technicians.length > 0 ? technicians.map((technician) => {
                        const techPrices = technicianPrices.find(tp => tp.technicianId === technician._id);
                        const paymentType = technician.paymentType || 'po_statusu';
                        return (
                          <div key={technician._id} className="mx-finances-techlist">
                            <div className="mx-finances-techlist__head">
                              <b>{technician.name}</b>
                              <span className={cx('sx-tag', paymentType === 'plata' ? 'is-ok' : 'is-info')}>
                                {paymentType === 'plata' ? 'Plata' : 'Po Statusu'}
                              </span>
                              <Btn size="sm" variant="ghost" icon={Pencil} className="mx-right" onClick={() => handleTechnicianSelect(technician)}>Uredi</Btn>
                            </div>
                            {paymentType === 'po_statusu' ? (
                              techPrices ? (
                                <dl className="mx-finances-prices">
                                  {customerStatusOptions.map((option) => {
                                    const price = techPrices.pricesByCustomerStatus[option.value];
                                    return price ? (
                                      <div key={option.value}>
                                        <dt title={option.label}>{option.label}</dt>
                                        <dd>{price.toLocaleString()} RSD</dd>
                                      </div>
                                    ) : null;
                                  })}
                                </dl>
                              ) : (
                                <span className="sx-faint">Nisu postavljene cene</span>
                              )
                            ) : (
                              <dl className="mx-finances-prices">
                                <div>
                                  <dt>Mesečna plata</dt>
                                  <dd>{technician.monthlySalary?.toLocaleString() || 0} RSD</dd>
                                </div>
                              </dl>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="sx-empty-block">
                          <span>Nema dostupnih tehničara u sistemu</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Finances;
