import React, { useState, useEffect } from 'react';
import { DollarSignIcon, SaveIcon, RefreshIcon, CalendarIcon, ChevronDownIcon, CheckIcon, ChevronUpIcon, AlertTriangleIcon, XIcon, SearchIcon, FilterIcon, EyeIcon } from '../../components/icons/SvgIcons';
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

  // State za finansijske postavke
  const [pricesByCustomerStatus, setPricesByCustomerStatus] = useState({});
  const [discountsByMunicipality, setDiscountsByMunicipality] = useState([]);
  const [technicianPrices, setTechnicianPrices] = useState([]);

  // State za dropdown podatke
  const [customerStatusOptions, setCustomerStatusOptions] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);

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

  // State za collapsible sekcije
  const [collapsedSections, setCollapsedSections] = useState({
    customerPrices: false,
    municipalDiscounts: false,
    technicianPrices: false,
    financialReports: false,
    transactionsTable: false
  });

  // State za tabelu finansijskih transakcija
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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

  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('Fetching initial data...');
      const [settingsRes, statusOptionsRes, municipalitiesRes, techniciansRes, reportsRes, failedRes] = await Promise.all([
        financesAPI.getSettings(),
        financesAPI.getCustomerStatusOptions(),
        financesAPI.getMunicipalities(),
        financesAPI.getTechnicians(),
        financesAPI.getReports(),
        financesAPI.getFailedTransactions()
      ]);

      console.log('Technicians response:', techniciansRes);
      console.log('Technicians response data:', techniciansRes.data);
      console.log('Technicians response status:', techniciansRes.status);

      const settings = settingsRes.data;

      setPricesByCustomerStatus(settings.pricesByCustomerStatus || {});
      setDiscountsByMunicipality(settings.discountsByMunicipality || []);
      setTechnicianPrices(settings.technicianPrices || []);

      setCustomerStatusOptions(statusOptionsRes.data);
      setMunicipalities(municipalitiesRes.data);
      console.log('Setting technicians:', techniciansRes.data);
      console.log('Technicians data length:', techniciansRes.data ? techniciansRes.data.length : 'undefined');
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

  const fetchReportsWithFilter = async () => {
    try {
      setTransactionsLoading(true);
      const params = {};
      if (startDate) params.dateFrom = startDate.toISOString().split('T')[0];
      if (endDate) params.dateTo = endDate.toISOString().split('T')[0];

      const response = await financesAPI.getReports(params);
      setFinancialReports(response.data);
      setTransactions(response.data.transactions || []);
      toast.success('Izveštaj je ažuriran');
    } catch (error) {
      console.error('Greška pri učitavanju izveštaja:', error);
      toast.error('Greška pri učitavanju izveštaja');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const retryFailedTransaction = async (workOrderId) => {
    setRetryLoading(prev => ({ ...prev, [workOrderId]: true }));
    try {
      const response = await financesAPI.retryFailedTransaction(workOrderId);

      if (response.data.success) {
        toast.success('Finansijska transakcija je uspešno kreirana');
        // Ukloni iz liste neuspešnih transakcija
        setFailedTransactions(prev => prev.filter(ft => ft.workOrderId._id !== workOrderId));
        // Ažuriraj izveštaje i transakcije
        fetchReportsWithFilter();
      } else {
        toast.error(response.data.message);
        // Ažuriraj failed transaction sa novim podacima
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
      // Ukloni iz liste
      setFailedTransactions(prev => prev.filter(ft => ft.workOrderId._id !== workOrderId));
    } catch (error) {
      console.error('Greška pri označavanju kao razrešeno:', error);
      toast.error('Greška pri označavanju kao razrešeno');
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

      // Ukloni uspešno obrađene transakcije iz liste
      const successfulIds = response.data.retryResults
        .filter(result => result.success)
        .map(result => result.workOrderId);

      setFailedTransactions(prev => prev.filter(ft => !successfulIds.includes(ft.workOrderId._id)));

      // Ažuriraj izveštaje
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

  // Filtriranje i paginacija za tabelu
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        transaction.tisJobId?.toLowerCase().includes(searchLower) ||
        transaction.municipality?.toLowerCase().includes(searchLower) ||
        getCustomerStatusShortName(transaction.customerStatus).toLowerCase().includes(searchLower) ||
        transaction.technicians?.some(tech =>
          tech.name?.toLowerCase().includes(searchLower) ||
          tech.technicianId?.name?.toLowerCase().includes(searchLower)
        )
      );
      if (!matchesSearch) return false;
    }

    // Filter by selected technician
    if (selectedTechnicianFilter) {
      const hasSelectedTechnician = transaction.technicians?.some(
        tech => {
          const techId = tech.technicianId?._id || tech.technicianId;
          return techId === selectedTechnicianFilter._id ||
                 (typeof techId === 'object' && techId.toString() === selectedTechnicianFilter._id) ||
                 techId?.toString() === selectedTechnicianFilter._id;
        }
      );
      if (!hasSelectedTechnician) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

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
      <div className="mb-8">
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

      {/* Failed Transactions Alert */}
      {failedTransactions && failedTransactions.length > 0 && (
        <div className="mb-8">
          <div className="rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 shadow-lg">
            <div className="p-6">
              <div className="flex items-center space-x-2 text-red-800 mb-4">
                <AlertTriangleIcon size={20} className="text-red-600" />
                <h2 className="text-lg font-semibold">Neuspešni finansijski obračuni ({failedTransactions.length})</h2>
              </div>
              <p className="text-red-700 mb-4 text-sm">
                Sledeći radni nalozi nisu mogli biti obračunati zbog nedostajućih podataka:
              </p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">

        {/* Cene po Tipu Usluge */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <DollarSignIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cene po Tipu Usluge</h2>
                <p className="text-sm text-gray-500">Postavite cene za različite tipove usluga</p>
              </div>
            </div>
            <button
              onClick={() => toggleSection('customerPrices')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            >
              {collapsedSections.customerPrices ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {!collapsedSections.customerPrices && (
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
          )}
        </div>

        {/* Popusti po Opštinama */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <DollarSignIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Popusti po Opštinama</h2>
                <p className="text-sm text-gray-500">Upravlja popustima za različite opštine</p>
              </div>
            </div>
            <button
              onClick={() => toggleSection('municipalDiscounts')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            >
              {collapsedSections.municipalDiscounts ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {!collapsedSections.municipalDiscounts && (
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
          )}
        </div>
      </div>

      {/* Cene za Tehničare - Full Width */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <DollarSignIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cene za Tehničare</h2>
              <p className="text-sm text-gray-500">Postavite cene po tipu usluge za svakog tehničara</p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('technicianPrices')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50"
          >
            {collapsedSections.technicianPrices ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {!collapsedSections.technicianPrices && (
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
                        {console.log('Rendering technicians dropdown, count:', technicians.length)}
                        {technicians && technicians.length > 0 ? (
                          technicians.map((technician) => (
                            <DropdownMenuItem
                              key={technician._id}
                              onClick={() => setSelectedTechnician(technician)}
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
                        Cene za: {selectedTechnician.name}
                      </div>
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
                      </div>
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
                  )}
                </div>

                {/* Lista svih tehničara sa cenama */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800">Pregled cena za sve tehničare</h3>
                  {console.log('Rendering all technicians list, count:', technicians.length)}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {technicians && technicians.length > 0 ? technicians.map((technician) => {
                      const techPrices = technicianPrices.find(tp => tp.technicianId === technician._id);
                      return (
                        <div key={technician._id} className="p-4 bg-white/60 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-800">{technician.name}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTechnician(technician)}
                              className="text-xs"
                            >
                              Uredi
                            </Button>
                          </div>
                          {techPrices ? (
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
        )}
      </div>

      {/* Finansijski Pregled */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <DollarSignIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Finansijski Pregled</h2>
              <p className="text-sm text-gray-500">Analizirajte prihode, rashode i profite</p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('financialReports')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50"
          >
            {collapsedSections.financialReports ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {!collapsedSections.financialReports && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="p-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Filter kontrole */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50">
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">Vremenski period</h3>
                        <p className="text-sm text-slate-500">Odaberite period za analizu</p>
                      </div>

                      <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateSelect={(date) => setStartDate(date)}
                        onEndDateSelect={(date) => setEndDate(date)}
                        startPlaceholder="Početni datum"
                        endPlaceholder="Krajnji datum"
                        className="w-full"
                      />

                      <Button
                        type="primary"
                        size="medium"
                        onClick={fetchReportsWithFilter}
                        loading={transactionsLoading}
                        prefix={<RefreshIcon size={16} />}
                        className="w-full"
                      >
                        Ažuriraj Izveštaj
                      </Button>
                    </div>
                  </div>

                  {/* Sumarni podaci */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Ukupni rezultati</h3>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-green-800">Ukupan Prihod</div>
                          <div className="text-lg font-bold text-green-900">
                            {financialReports.summary.totalRevenue.toLocaleString()} RSD
                          </div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-red-800">Ukupne Isplate</div>
                          <div className="text-lg font-bold text-red-900">
                            {financialReports.summary.totalPayouts.toLocaleString()} RSD
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-blue-800">Ukupan Profit</div>
                          <div className="text-lg font-bold text-blue-900">
                            {financialReports.summary.totalProfit.toLocaleString()} RSD
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detaljne isplate po tehničarima */}
                <div className="xl:col-span-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Isplate po tehničarima</h3>
                      {financialReports.technicianStats && financialReports.technicianStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {financialReports.technicianStats.map((tech) => (
                            <div key={tech.technicianId} className="bg-slate-50 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-slate-900 truncate">{tech.name}</h4>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {tech.workOrdersCount} {tech.workOrdersCount === 1 ? 'nalog' : 'naloga'}
                                </span>
                              </div>
                              <div className="text-lg font-bold text-green-700">
                                {tech.totalEarnings.toLocaleString()} RSD
                              </div>
                              <div className="text-xs text-slate-500">
                                Prosek: {Math.round(tech.totalEarnings / tech.workOrdersCount).toLocaleString()} RSD
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <DollarSignIcon size={48} className="mx-auto mb-4 text-slate-300" />
                          <p>Nema podataka za izabrani period</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela finansijskih transakcija */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <DollarSignIcon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Finansijske transakcije</h2>
              <p className="text-sm text-gray-500">Pregled svih obrađenih finansijskih transakcija</p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('transactionsTable')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50"
          >
            {collapsedSections.transactionsTable ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {!collapsedSections.transactionsTable && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Table Controls */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="text"
                      placeholder="Pretraži po TIS Job ID, opštini, tipu usluge ili tehničaru..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                    />
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
                          onClick={() => setSelectedTechnicianFilter(null)}
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
                            onClick={() => setSelectedTechnicianFilter(technician)}
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

                    {/* Column Visibility Dropdown */}
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
                {/* Modern Table */}
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

                {/* Modern Pagination */}
                {filteredTransactions.length > itemsPerPage && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Prethodna
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Sledeća
                      </Button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700">
                          Prikazuje se <span className="font-medium">{startIndex + 1}</span> do{' '}
                          <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredTransactions.length)}</span>{' '}
                          od <span className="font-medium">{filteredTransactions.length}</span> rezultata
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Prethodna
                          </button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className={cn(
                                "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                                currentPage === i + 1
                                  ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                  : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Sledeća
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Finances;