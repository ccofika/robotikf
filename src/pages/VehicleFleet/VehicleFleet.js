import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Wrench, Calendar, AlertTriangle, Pencil, Trash2, Eye, RefreshCw, X, Upload, Image, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { localYmd } from '../../utils/localDate';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../../security/sx/layout';
import { Field, Input, Textarea, Select, SearchField, FileButton } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { confirm } from '../../security/sx/confirm';
import { Loading } from '../../montaza/ui';
import './VehicleFleet.mx.css';

const SERVICE_TYPES = [
  ['regular', 'Redovan servis'],
  ['repair', 'Popravka'],
  ['inspection', 'Pregled'],
  ['oil_change', 'Menjanje ulja'],
  ['brake_check', 'Pregled kočnica'],
  ['other', 'Ostalo']
];

// Polja vozila (dodavanje i izmena imaju ista polja)
function VehicleFields({ idp, v, set }) {
  const on = (key, upper) => (e) => {
    const value = upper ? e.target.value.toUpperCase() : e.target.value;
    set(prev => ({ ...prev, [key]: value }));
  };
  return (
    <div className="sx-form">
      <Field label="Naziv vozila *" htmlFor={`${idp}-name`}>
        <Input id={`${idp}-name`} type="text" value={v.name} onChange={on('name')} placeholder="Npr. Službeni automobil 1" required />
      </Field>
      <Field label="Registarske tablice" htmlFor={`${idp}-plate`}>
        <Input id={`${idp}-plate`} type="text" value={v.licensePlate} onChange={on('licensePlate', true)} placeholder="BG-123-XY" />
      </Field>
      <Field label="Brend" htmlFor={`${idp}-brand`}>
        <Input id={`${idp}-brand`} type="text" value={v.brand} onChange={on('brand')} placeholder="Volkswagen" />
      </Field>
      <Field label="Model" htmlFor={`${idp}-model`}>
        <Input id={`${idp}-model`} type="text" value={v.model} onChange={on('model')} placeholder="Golf" />
      </Field>
      <Field label="Godina proizvodnje" htmlFor={`${idp}-year`}>
        <Input id={`${idp}-year`} type="number" value={v.year} onChange={on('year')} placeholder="2020" min="1900" max={new Date().getFullYear() + 1} />
      </Field>
      <Field label="Kilometraža" htmlFor={`${idp}-mileage`}>
        <Input id={`${idp}-mileage`} type="number" value={v.mileage} onChange={on('mileage')} placeholder="50000" min="0" />
      </Field>
      <Field label="Datum isteka registracije *" htmlFor={`${idp}-registration`}>
        <Input id={`${idp}-registration`} type="date" value={v.registrationExpiry} onChange={on('registrationExpiry')} required />
      </Field>
      <Field label="Zaduženo korisniku" htmlFor={`${idp}-assigned`}>
        <Input id={`${idp}-assigned`} type="text" value={v.assignedTo} onChange={on('assignedTo')} placeholder="Ime korisnika" />
      </Field>
      <Field label="Napomene" htmlFor={`${idp}-notes`} wide>
        <Textarea id={`${idp}-notes`} value={v.notes} onChange={on('notes')} placeholder="Dodatne informacije o vozilu..." rows={3} />
      </Field>
    </div>
  );
}

// Polja servisa (dodavanje i izmena): ukupna cena se računa iz delova i rada, a može i ručno
function ServiceFields({ idp, v, set, total }) {
  const on = (key) => (e) => {
    const value = e.target.value;
    set(prev => ({ ...prev, [key]: value }));
  };
  return (
    <>
      <div className="sx-fieldset mx-vehicles-first">
        <div className="sx-form">
          <Field label="Datum servisa *" htmlFor={`${idp}-date`}>
            <Input id={`${idp}-date`} type="date" value={v.date} onChange={on('date')} required />
          </Field>
          <Field label="Tip servisa" htmlFor={`${idp}-type`}>
            <Select id={`${idp}-type`} value={v.serviceType} onChange={on('serviceType')}>
              {SERVICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Kilometraža prilikom servisa" htmlFor={`${idp}-mileage`} wide>
            <Input id={`${idp}-mileage`} type="number" value={v.mileage} onChange={on('mileage')} placeholder="Trenutna kilometraža" min="0" />
          </Field>
        </div>
      </div>

      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">Cene</h3>
        <div className="mx-vehicles-pair">
          <Field label="Cena delova (RSD)" htmlFor={`${idp}-parts`}>
            <Input
              id={`${idp}-parts`}
              type="number"
              value={v.partsPrice}
              onChange={(e) => {
                const newPartsPrice = e.target.value;
                set(prev => ({
                  ...prev,
                  partsPrice: newPartsPrice,
                  price: total(newPartsPrice, prev.laborPrice)
                }));
              }}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </Field>
          <Field label="Cena ruku (RSD)" htmlFor={`${idp}-labor`}>
            <Input
              id={`${idp}-labor`}
              type="number"
              value={v.laborPrice}
              onChange={(e) => {
                const newLaborPrice = e.target.value;
                set(prev => ({
                  ...prev,
                  laborPrice: newLaborPrice,
                  price: total(prev.partsPrice, newLaborPrice)
                }));
              }}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </Field>
        </div>
        <Field label="Ukupna cena (RSD) *" htmlFor={`${idp}-price`} hint="Automatski se računa ali možete ručno izmeniti">
          <Input id={`${idp}-price`} type="number" value={v.price} onChange={on('price')} placeholder="15000" min="0" step="0.01" required className="mx-strong" />
        </Field>
      </div>

      <div className="sx-fieldset">
        <Field label="Komentar" htmlFor={`${idp}-comment`}>
          <Textarea id={`${idp}-comment`} value={v.comment} onChange={on('comment')} placeholder="Opis servisa, zamenjena dela, napomene..." rows={3} />
        </Field>
      </div>
    </>
  );
}

const VehicleFleet = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showServiceHistoryModal, setShowServiceHistoryModal] = useState(false);
  const [showEditRegistrationModal, setShowEditRegistrationModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [vehicleServices, setVehicleServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [newRegistrationDate, setNewRegistrationDate] = useState('');
  const [serviceWarnings, setServiceWarnings] = useState([]);
  const [dismissedWarnings, setDismissedWarnings] = useState(new Set());
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    expiringRegistrations: 0,
    totalServiceCosts: 0
  });

  // Form states
  const [newVehicle, setNewVehicle] = useState({
    name: '',
    licensePlate: '',
    brand: '',
    model: '',
    year: '',
    registrationExpiry: '',
    insuranceExpiry: '',
    inspectionExpiry: '',
    mileage: '',
    assignedTo: '',
    notes: ''
  });

  const [newService, setNewService] = useState({
    date: localYmd(),
    partsPrice: '',
    laborPrice: '',
    price: '',
    comment: '',
    serviceType: 'regular',
    mileage: ''
  });

  const [editService, setEditService] = useState({
    date: '',
    partsPrice: '',
    laborPrice: '',
    price: '',
    comment: '',
    serviceType: 'regular',
    mileage: ''
  });

  // Image upload states
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const invoiceInputRef = useRef(null);

  const [editVehicle, setEditVehicle] = useState({
    name: '',
    licensePlate: '',
    brand: '',
    model: '',
    year: '',
    registrationExpiry: '',
    insuranceExpiry: '',
    inspectionExpiry: '',
    mileage: '',
    assignedTo: '',
    notes: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '' || statusFilter !== 'all') {
        fetchVehicles(1); // Reset to page 1 when searching
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (vehicles.length > 0) {
      analyzeServiceWarnings();
    }
  }, [vehicles]);

  // Optimized initial data fetch for dashboard stats
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('VehicleFleet: Fetching optimized dashboard data...');
      const startTime = Date.now();

      // Fetch only stats first for quick dashboard load
      const [vehicleStatsResponse] = await Promise.all([
        vehiclesAPI.getStats()
      ]);

      const endTime = Date.now();
      console.log(`VehicleFleet: Dashboard stats fetched in ${endTime - startTime}ms`);

      setStats(vehicleStatsResponse.data);

      // Then fetch full vehicle list asynchronously
      fetchVehicles(1);

    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      setError('Greška pri učitavanju podataka. Pokušajte ponovo.');
      setLoading(false);
    }
  };

  // Server-side paginated vehicle fetch
  const fetchVehicles = async (page = 1) => {
    if (page === 1) setLoading(true);
    setError('');
    try {
      console.log(`VehicleFleet: Fetching vehicles page ${page}...`);
      const startTime = Date.now();

      const params = {
        page,
        limit: pagination.limit,
        search: searchTerm,
        statusFilter: statusFilter === 'all' ? '' : statusFilter
      };

      const response = await vehiclesAPI.getAllWithStatus(params);

      const endTime = Date.now();
      console.log(`VehicleFleet: Vehicles page ${page} fetched in ${endTime - startTime}ms`);

      if (response.data.data) {
        // Server-side pagination response
        setVehicles(response.data.data);
        setPagination(response.data.pagination);
      } else {
        // Fallback for old API response format
        setVehicles(response.data);
        setPagination(prev => ({ ...prev, currentPage: page, totalCount: response.data.length }));
      }

    } catch (error) {
      console.error('Greška pri učitavanju vozila:', error);
      setError('Greška pri učitavanju vozila. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('VehicleFleet: Fetching vehicle statistics...');
      const startTime = Date.now();

      const response = await vehiclesAPI.getStats();

      const endTime = Date.now();
      console.log(`VehicleFleet: Statistics fetched in ${endTime - startTime}ms`);

      setStats(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju statistika:', error);
    }
  };

  // Remove client-side filtering since we now use server-side filtering
  const filteredVehicles = vehicles; // Server already filters the data

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    
    if (!newVehicle.name || !newVehicle.registrationExpiry) {
      setError('Naziv vozila i datum isteka registracije su obavezni');
      return;
    }

    try {
      await vehiclesAPI.create({
        ...newVehicle,
        year: newVehicle.year ? parseInt(newVehicle.year) : undefined,
        mileage: newVehicle.mileage ? parseInt(newVehicle.mileage) : 0
      });
      
      setShowAddVehicleModal(false);
      setNewVehicle({
        name: '',
        licensePlate: '',
        brand: '',
        model: '',
        year: '',
        registrationExpiry: '',
        insuranceExpiry: '',
        inspectionExpiry: '',
        mileage: '',
        assignedTo: '',
        notes: ''
      });

      // Refresh current page and stats
      fetchVehicles(pagination.currentPage);
      fetchStats();
      setError('');
    } catch (error) {
      console.error('Greška pri dodavanju vozila:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju vozila');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();

    if (!newService.date || !newService.price) {
      setError('Datum i cena servisa su obavezni');
      return;
    }

    try {
      const serviceResponse = await vehiclesAPI.addService(selectedVehicle._id, {
        ...newService,
        partsPrice: newService.partsPrice ? parseFloat(newService.partsPrice) : 0,
        laborPrice: newService.laborPrice ? parseFloat(newService.laborPrice) : 0,
        price: parseFloat(newService.price),
        mileage: newService.mileage ? parseInt(newService.mileage) : undefined
      });

      // If there's an invoice file, upload it
      if (invoiceFile && serviceResponse.data._id) {
        await handleInvoiceUpload(selectedVehicle._id, serviceResponse.data._id);
      }

      setShowAddServiceModal(false);
      setSelectedVehicle(null);
      setNewService({
        date: localYmd(),
        partsPrice: '',
        laborPrice: '',
        price: '',
        comment: '',
        serviceType: 'regular',
        mileage: ''
      });
      resetInvoiceUpload();

      // Refresh current page and stats
      fetchVehicles(pagination.currentPage);
      fetchStats();
      setError('');
    } catch (error) {
      console.error('Greška pri dodavanju servisa:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju servisa');
    }
  };

  // Handle invoice file selection
  const handleInvoiceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Samo slike su dozvoljene');
        return;
      }
      setInvoiceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset invoice upload
  const resetInvoiceUpload = () => {
    setInvoiceFile(null);
    setInvoicePreview(null);
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = '';
    }
  };

  // Upload invoice to cloudinary
  const handleInvoiceUpload = async (vehicleId, serviceId) => {
    if (!invoiceFile) return;

    setUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoice', invoiceFile);

      await vehiclesAPI.uploadServiceInvoice(vehicleId, serviceId, formData);
      console.log('Invoice uploaded successfully');
    } catch (error) {
      console.error('Greška pri upload-u fakture:', error);
      setError('Greška pri upload-u slike fakture');
    } finally {
      setUploadingInvoice(false);
    }
  };

  // Delete invoice image
  const handleDeleteInvoice = async (serviceId) => {
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete sliku fakture?', tone: 'danger', confirmLabel: 'Obriši' }))) {
      return;
    }

    try {
      await vehiclesAPI.deleteServiceInvoice(selectedVehicle._id, serviceId);
      // Refresh services
      await fetchVehicleServices(selectedVehicle._id);
    } catch (error) {
      console.error('Greška pri brisanju slike fakture:', error);
      setError(error.response?.data?.error || 'Greška pri brisanju slike fakture');
    }
  };

  // Show image in modal
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  // Calculate total price when parts or labor price changes
  const calculateTotalPrice = (parts, labor) => {
    const partsNum = parseFloat(parts) || 0;
    const laborNum = parseFloat(labor) || 0;
    return (partsNum + laborNum).toString();
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete ovo vozilo?', tone: 'danger', confirmLabel: 'Obriši' }))) {
      return;
    }

    try {
      await vehiclesAPI.delete(vehicleId);
      // Refresh current page and stats
      fetchVehicles(pagination.currentPage);
      fetchStats();
    } catch (error) {
      console.error('Greška pri brisanju vozila:', error);
      setError(error.response?.data?.error || 'Greška pri brisanju vozila');
    }
  };

  const getRegistrationStatusBadge = (status, daysUntilExpiry) => {
    switch (status) {
      case 'expired':
        return <Sign tone="bad">Istekla ({Math.abs(daysUntilExpiry)} dana)</Sign>;
      case 'expiring_soon':
        return <Sign tone="warn">Ističe za {daysUntilExpiry} dana</Sign>;
      case 'valid':
        return <Sign tone="ok">Važeća ({daysUntilExpiry} dana)</Sign>;
      default:
        return null;
    }
  };

  const fetchVehicleServices = async (vehicleId) => {
    setLoadingServices(true);
    try {
      const response = await vehiclesAPI.getServices(vehicleId);
      setVehicleServices(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju servisa:', error);
      setError('Greška pri učitavanju servisa vozila');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleShowServiceHistory = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowServiceHistoryModal(true);
    await fetchVehicleServices(vehicle._id);
  };

  const handleEditRegistration = (vehicle) => {
    setSelectedVehicle(vehicle);
    setNewRegistrationDate(vehicle.registrationExpiry ? vehicle.registrationExpiry.split('T')[0] : '');
    setShowEditRegistrationModal(true);
  };

  const handleUpdateRegistration = async (e) => {
    e.preventDefault();
    
    if (!newRegistrationDate) {
      setError('Datum registracije je obavezan');
      return;
    }

    try {
      await vehiclesAPI.updateRegistration(selectedVehicle._id, {
        registrationExpiry: newRegistrationDate
      });
      
      setShowEditRegistrationModal(false);
      setSelectedVehicle(null);
      setNewRegistrationDate('');

      // Refresh current page and stats
      fetchVehicles(pagination.currentPage);
      fetchStats();
      setError('');
    } catch (error) {
      console.error('Greška pri ažuriranju registracije:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju registracije');
    }
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    setEditService({
      date: service.date ? service.date.split('T')[0] : '',
      partsPrice: service.partsPrice?.toString() || '',
      laborPrice: service.laborPrice?.toString() || '',
      price: service.price?.toString() || '',
      comment: service.comment || '',
      serviceType: service.serviceType || 'regular',
      mileage: service.mileage?.toString() || ''
    });
    setShowEditServiceModal(true);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();

    if (!editService.date || !editService.price) {
      setError('Datum i cena servisa su obavezni');
      return;
    }

    try {
      await vehiclesAPI.updateService(selectedVehicle._id, selectedService._id, {
        ...editService,
        partsPrice: editService.partsPrice ? parseFloat(editService.partsPrice) : 0,
        laborPrice: editService.laborPrice ? parseFloat(editService.laborPrice) : 0,
        price: parseFloat(editService.price),
        mileage: editService.mileage ? parseInt(editService.mileage) : undefined
      });

      setShowEditServiceModal(false);
      setSelectedService(null);
      setEditService({
        date: '',
        partsPrice: '',
        laborPrice: '',
        price: '',
        comment: '',
        serviceType: 'regular',
        mileage: ''
      });

      // Osvezi servise u modalu
      await fetchVehicleServices(selectedVehicle._id);
      // Osvezi glavnu listu vozila
      fetchVehicles(pagination.currentPage);
      fetchStats();
      setError('');
    } catch (error) {
      console.error('Greška pri ažuriranju servisa:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju servisa');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete ovaj servis?', tone: 'danger', confirmLabel: 'Obriši' }))) {
      return;
    }

    try {
      await vehiclesAPI.deleteService(selectedVehicle._id, serviceId);

      // Osvezi servise u modalu
      await fetchVehicleServices(selectedVehicle._id);
      // Osvezi glavnu listu vozila
      fetchVehicles(pagination.currentPage);
      fetchStats();
    } catch (error) {
      console.error('Greška pri brisanju servisa:', error);
      setError(error.response?.data?.error || 'Greška pri brisanju servisa');
    }
  };

  const analyzeServiceWarnings = () => {
    const warnings = [];
    const now = new Date();
    
    vehicles.forEach(vehicle => {
      if (!vehicle.services || vehicle.services.length === 0) return;
      
      const vehicleId = vehicle._id;
      const vehicleName = vehicle.name;
      
      // Sortiranje servisa po datumu (najnoviji prvi)
      const sortedServices = [...vehicle.services].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 1. Previše servisa u poslednjih 30 dana
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentServices = sortedServices.filter(service => new Date(service.date) >= last30Days);
      
      if (recentServices.length > 3) {
        warnings.push({
          id: `frequent-${vehicleId}`,
          vehicleId,
          vehicleName,
          type: 'frequent_service',
          severity: 'high',
          title: 'Česti servisi',
          message: `${vehicleName} ima ${recentServices.length} servisa u poslednjih 30 dana`,
          details: `Možda je potrebna detaljna dijagnostika vozila.`
        });
      }
      
      // 2. Visoki troškovi u poslednjih 3 meseca
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const recentExpensiveServices = sortedServices.filter(service => new Date(service.date) >= last90Days);
      const totalCost = recentExpensiveServices.reduce((sum, service) => sum + (service.price || 0), 0);
      
      if (totalCost > 50000) {
        warnings.push({
          id: `expensive-${vehicleId}`,
          vehicleId,
          vehicleName,
          type: 'high_cost',
          severity: 'medium',
          title: 'Visoki troškovi servisa',
          message: `${vehicleName} ima troškove od ${formatCurrency(totalCost)} u poslednjih 3 meseca`,
          details: `Razmotrite da li je ekonomičnija zamena vozila.`
        });
      }
      
      // 3. Česte popravke (ne redovni servisi)
      const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const recentRepairs = sortedServices.filter(service => 
        new Date(service.date) >= last60Days && 
        (service.serviceType === 'repair' || service.serviceType === 'other')
      );
      
      if (recentRepairs.length > 2) {
        warnings.push({
          id: `repairs-${vehicleId}`,
          vehicleId,
          vehicleName,
          type: 'frequent_repairs',
          severity: 'high',
          title: 'Česte popravke',
          message: `${vehicleName} ima ${recentRepairs.length} popravki u poslednjih 60 dana`,
          details: `Vozilo možda ima ozbiljan tehnički problem.`
        });
      }
      
      // 4. Kratki intervali između servisa
      if (sortedServices.length > 1) {
        const daysBetweenServices = (new Date(sortedServices[0].date) - new Date(sortedServices[1].date)) / (1000 * 60 * 60 * 24);
        
        if (daysBetweenServices < 15 && daysBetweenServices > 0) {
          warnings.push({
            id: `interval-${vehicleId}`,
            vehicleId,
            vehicleName,
            type: 'short_interval',
            severity: 'medium',
            title: 'Kratki intervali servisa',
            message: `${vehicleName} ima servise na svakih ${Math.round(daysBetweenServices)} dana`,
            details: `Proverite da li su svi servisi bili neophodni.`
          });
        }
      }
    });
    
    setServiceWarnings(warnings);
  };

  const dismissWarning = (warningId) => {
    setDismissedWarnings(prev => new Set([...prev, warningId]));
  };

  const getVisibleWarnings = () => {
    return serviceWarnings.filter(warning => !dismissedWarnings.has(warning.id));
  };

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setEditVehicle({
      name: vehicle.name || '',
      licensePlate: vehicle.licensePlate || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      registrationExpiry: vehicle.registrationExpiry ? vehicle.registrationExpiry.split('T')[0] : '',
      insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : '',
      inspectionExpiry: vehicle.inspectionExpiry ? vehicle.inspectionExpiry.split('T')[0] : '',
      mileage: vehicle.mileage?.toString() || '',
      assignedTo: vehicle.assignedTo || '',
      notes: vehicle.notes || ''
    });
    setShowEditVehicleModal(true);
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    
    if (!editVehicle.name || !editVehicle.registrationExpiry) {
      setError('Naziv vozila i datum isteka registracije su obavezni');
      return;
    }

    try {
      await vehiclesAPI.update(selectedVehicle._id, {
        ...editVehicle,
        year: editVehicle.year ? parseInt(editVehicle.year) : undefined,
        mileage: editVehicle.mileage ? parseInt(editVehicle.mileage) : 0
      });
      
      setShowEditVehicleModal(false);
      setSelectedVehicle(null);
      setEditVehicle({
        name: '',
        licensePlate: '',
        brand: '',
        model: '',
        year: '',
        registrationExpiry: '',
        insuranceExpiry: '',
        inspectionExpiry: '',
        mileage: '',
        assignedTo: '',
        notes: ''
      });

      // Refresh current page and stats
      fetchVehicles(pagination.currentPage);
      fetchStats();
      setError('');
    } catch (error) {
      console.error('Greška pri ažuriranju vozila:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju vozila');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('sr-Latn-RS');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sr-Latn-RS', {
      style: 'currency',
      currency: 'RSD'
    }).format(amount);
  };

  // Zatvaranje prozora (isto kao X i Otkaži ranije)
  const closeAddService = () => {
    setShowAddServiceModal(false);
    setSelectedVehicle(null);
    resetInvoiceUpload();
  };
  const closeServiceHistory = () => {
    setShowServiceHistoryModal(false);
    setSelectedVehicle(null);
    setVehicleServices([]);
  };
  const closeEditRegistration = () => {
    setShowEditRegistrationModal(false);
    setSelectedVehicle(null);
    setNewRegistrationDate('');
  };
  const closeEditService = () => {
    setShowEditServiceModal(false);
    setSelectedService(null);
    setEditService({
      date: '',
      partsPrice: '',
      laborPrice: '',
      price: '',
      comment: '',
      serviceType: 'regular',
      mileage: ''
    });
  };
  const closeEditVehicle = () => {
    setShowEditVehicleModal(false);
    setSelectedVehicle(null);
    setEditVehicle({
      name: '',
      licensePlate: '',
      brand: '',
      model: '',
      year: '',
      registrationExpiry: '',
      insuranceExpiry: '',
      inspectionExpiry: '',
      mileage: '',
      assignedTo: '',
      notes: ''
    });
  };
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const visibleWarnings = getVisibleWarnings();

  return (
    <div className="sx-page mx-vehicles" data-testid="page-vehicles">
      <PageHead
        eyebrow="Montaža · Vozni park"
        title="Vozni park"
        lead="Upravljanje vozilima, registracijama i servisima"
        actions={<>
          <Btn
            icon={RefreshCw}
            onClick={() => {
              fetchVehicles(pagination.currentPage);
              fetchStats();
            }}
            busy={loading}
          >
            Osveži
          </Btn>
          <Btn variant="primary" icon={Plus} onClick={() => setShowAddVehicleModal(true)}>Dodaj vozilo</Btn>
        </>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      <div className="sx-stats">
        <Stat label="Ukupno vozila" value={stats.totalVehicles} />
        <Stat label="Aktivna vozila" value={stats.activeVehicles} />
        <Stat label="Registracije ističu" value={stats.expiringRegistrations} tone={stats.expiringRegistrations > 0 ? 'warn' : null} />
        <Stat label="Troškovi servisa" value={formatCurrency(stats.totalServiceCosts)} />
      </div>

      {visibleWarnings.length > 0 && (
        <Panel
          tone="warn"
          title="Upozorenja - Servisi vozila"
          sub="Automatski detektovana upozorenja za vozila koja zahtevaju pažnju"
        >
          <div className="sx-list">
            {visibleWarnings.map(warning => {
              const [tone, level] = warning.severity === 'high' ? ['bad', 'Visoko']
                : warning.severity === 'medium' ? ['warn', 'Srednje'] : ['info', 'Nisko'];
              return (
                <div key={warning.id} className="sx-item">
                  <span className={cx('sx-item__icon', tone !== 'info' && `is-${tone}`)}>
                    <AlertTriangle size={17} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <div className="sx-item__main">
                    <div className="mx-inline">
                      <b>{warning.title}</b>
                      <span className={`sx-tag is-${tone}`}>{level}</span>
                    </div>
                    <span>{warning.message}</span>
                    <span>{warning.details}</span>
                  </div>
                  <div className="sx-item__side">
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Eye}
                      onClick={() => handleShowServiceHistory(vehicles.find(v => v._id === warning.vehicleId))}
                      title="Prikaži servise vozila"
                      aria-label="Prikaži servise vozila"
                    />
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={X}
                      onClick={() => dismissWarning(warning.id)}
                      title="Sakrij upozorenje"
                      aria-label="Sakrij upozorenje"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Toolbar>
        <SearchField
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          placeholder="Pretraži po nazivu, registraciji, brendu..."
        />
        <Select
          size="sm"
          aria-label="Status vozila"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
        >
          <option value="all">Svi statusi</option>
          <option value="active">Aktivna</option>
          <option value="inactive">Neaktivna</option>
          <option value="maintenance">U servisu</option>
          <option value="sold">Prodana</option>
        </Select>
      </Toolbar>

      <Panel
        pad={false}
        title="Lista vozila"
        sub={`Prikazano ${vehicles.length} od ${pagination.totalCount} vozila${pagination.totalPages > 1 ? ` (strana ${pagination.currentPage} od ${pagination.totalPages})` : ''}`}
      >
        {loading && vehicles.length === 0 ? (
          <Loading text="Učitavanje vozila..." />
        ) : filteredVehicles.length === 0 ? (
          <div className="sx-empty-block">
            <b>Nema vozila za prikaz</b>
            <span>Dodajte novo vozilo ili promenite filtere</span>
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="vehicles-table">
              <thead>
                <tr>
                  <th>Vozilo</th>
                  <th>Registracija</th>
                  <th>Status registracije</th>
                  <th>Poslednji servis</th>
                  <th className="is-num">Ukupni troškovi</th>
                  <th>Zaduženo</th>
                  <th className="is-end">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle, index) => (
                  <tr key={vehicle._id} style={{ '--i': index }}>
                    <td className="is-head">
                      <div className="sx-cell">
                        <b>{vehicle.name}</b>
                        {vehicle.brand && vehicle.model && (
                          <span>
                            {vehicle.brand} {vehicle.model}
                            {vehicle.year && ` (${vehicle.year})`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Registracija">
                      <span className="sx-datecell">
                        <span className="sx-mono mx-strong">{vehicle.licensePlate || 'N/A'}</span>
                        <small>Ističe: {formatDate(vehicle.registrationExpiry)}</small>
                      </span>
                    </td>
                    <td data-label="Status registracije">
                      {getRegistrationStatusBadge(vehicle.registrationStatus, vehicle.daysUntilRegistrationExpiry)}
                    </td>
                    <td data-label="Poslednji servis">
                      {vehicle.latestService ? (
                        <span className="sx-datecell">
                          <span>{formatDate(vehicle.latestService.date)}</span>
                          <small>{formatCurrency(vehicle.latestService.price)}</small>
                        </span>
                      ) : (
                        <span className="sx-faint">Nema servisa</span>
                      )}
                    </td>
                    <td data-label="Ukupni troškovi" className="is-num">{formatCurrency(vehicle.totalServiceCost)}</td>
                    <td data-label="Zaduženo">
                      {vehicle.assignedTo ? vehicle.assignedTo : <span className="sx-faint">Nezaduženo</span>}
                    </td>
                    <td className="is-actions is-end">
                      <div className="sx-rowacts">
                        <Btn size="sm" variant="ghost" icon={Eye} onClick={() => handleShowServiceHistory(vehicle)} title="Prikaži istoriju servisa" aria-label="Prikaži istoriju servisa" />
                        <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => handleEditVehicle(vehicle)} title="Izmeni informacije o vozilu" aria-label="Izmeni informacije o vozilu" />
                        <Btn size="sm" variant="ghost" icon={Calendar} onClick={() => handleEditRegistration(vehicle)} title="Izmeni datum registracije" aria-label="Izmeni datum registracije" />
                        <Btn
                          size="sm"
                          variant="ghost"
                          icon={Wrench}
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowAddServiceModal(true);
                          }}
                          title="Dodaj servis"
                          aria-label="Dodaj servis"
                        />
                        <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDeleteVehicle(vehicle._id)} title="Obriši vozilo" aria-label="Obriši vozilo" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <nav className="mx-pager" aria-label="Stranice">
            <span className="mx-pager__text">Strana {pagination.currentPage} od {pagination.totalPages}</span>
            <span className="mx-pager__btns">
              <Btn size="sm" icon={ChevronLeft} onClick={() => fetchVehicles(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage || loading}>Prethodna</Btn>
              <Btn size="sm" iconRight={ChevronRight} onClick={() => fetchVehicles(pagination.currentPage + 1)} disabled={!pagination.hasNextPage || loading}>Sledeća</Btn>
            </span>
          </nav>
        )}
      </Panel>

      {/* Dodavanje vozila */}
      {showAddVehicleModal && (
        <Dialog
          onClose={() => setShowAddVehicleModal(false)}
          title="Dodaj novo vozilo"
          size="lg"
          testId="vehicle-add-dialog"
          footer={<>
            <Btn variant="ghost" onClick={() => setShowAddVehicleModal(false)}>Otkaži</Btn>
            <Btn type="submit" form="vehicle-add-form" variant="primary">Dodaj vozilo</Btn>
          </>}
        >
          <form id="vehicle-add-form" onSubmit={handleAddVehicle}>
            <VehicleFields idp="vehicle-add" v={newVehicle} set={setNewVehicle} />
          </form>
        </Dialog>
      )}

      {/* Dodavanje servisa */}
      {showAddServiceModal && selectedVehicle && (
        <Dialog
          onClose={closeAddService}
          title={`Dodaj servis - ${selectedVehicle.name}`}
          size="md"
          testId="service-add-dialog"
          footer={<>
            <Btn variant="ghost" onClick={closeAddService}>Otkaži</Btn>
            <Btn type="submit" form="service-add-form" variant="primary" disabled={uploadingInvoice}>
              {uploadingInvoice ? 'Upload u toku...' : 'Dodaj servis'}
            </Btn>
          </>}
        >
          <form id="service-add-form" onSubmit={handleAddService}>
            <ServiceFields idp="service-add" v={newService} set={setNewService} total={calculateTotalPrice} />
            <div className="sx-fieldset">
              <Field label="Slika fakture">
                <div className="mx-inline">
                  <FileButton accept="image/*" icon={Upload} onFile={(file) => handleInvoiceFileChange({ target: { files: [file] } })}>
                    Izaberi sliku
                  </FileButton>
                  {invoicePreview && (
                    <Btn size="sm" icon={X} onClick={resetInvoiceUpload} title="Ukloni sliku" aria-label="Ukloni sliku" />
                  )}
                </div>
                {invoicePreview && (
                  <img src={invoicePreview} alt="Pregled fakture" className="mx-vehicles-preview" />
                )}
              </Field>
            </div>
          </form>
        </Dialog>
      )}

      {/* Istorija servisa */}
      {showServiceHistoryModal && selectedVehicle && (
        <Dialog
          onClose={closeServiceHistory}
          size="xl"
          title={`Istorija servisa - ${selectedVehicle.name}`}
          testId="service-history"
        >
          {loadingServices ? (
            <Loading text="Učitavanje servisa..." />
          ) : vehicleServices.length === 0 ? (
            <div className="sx-empty-block">
              <b>Nema servisa za prikaz</b>
              <span>Dodajte prvi servis za ovo vozilo</span>
            </div>
          ) : (
            <div className="sx-tablewrap mx-vehicles-history">
              <div className="mx-vehicles-history__box">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Tip servisa</th>
                      <th>Cene</th>
                      <th>Kilometraža</th>
                      <th>Komentar</th>
                      <th>Faktura</th>
                      <th className="is-end">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleServices.map((service, index) => (
                      <tr key={service._id} style={{ '--i': index }}>
                        <td className="is-head"><b className="mx-strong sx-nowrap">{formatDate(service.date)}</b></td>
                        <td data-label="Tip servisa">
                          <span className="capitalize">{service.serviceType === 'regular' ? 'Redovan servis' :
                            service.serviceType === 'repair' ? 'Popravka' :
                            service.serviceType === 'inspection' ? 'Pregled' :
                            service.serviceType === 'oil_change' ? 'Menjanje ulja' :
                            service.serviceType === 'brake_check' ? 'Pregled kočnica' :
                            service.serviceType}</span>
                        </td>
                        <td data-label="Cene">
                          <div className="sx-cell">
                            <b>{formatCurrency(service.price)}</b>
                            {(service.partsPrice > 0 || service.laborPrice > 0) && (
                              <span>
                                {service.partsPrice > 0 && <span className="mx-vehicles-line">Delovi: {formatCurrency(service.partsPrice)}</span>}
                                {service.laborPrice > 0 && <span className="mx-vehicles-line">Ruke: {formatCurrency(service.laborPrice)}</span>}
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Kilometraža">
                          {service.mileage ? (
                            <span className="sx-nowrap">{service.mileage.toLocaleString()} km</span>
                          ) : (
                            <span className="sx-faint">N/A</span>
                          )}
                        </td>
                        <td data-label="Komentar" className="is-wide">
                          <span className="mx-vehicles-clip" title={service.comment}>
                            {service.comment || 'Nema komentara'}
                          </span>
                        </td>
                        <td data-label="Faktura">
                          {service.invoiceImage ? (
                            <div className="sx-rowacts">
                              <Btn size="sm" variant="ghost" icon={Image} onClick={() => openImageModal(service.invoiceImage)} title="Prikaži fakturu" aria-label="Prikaži fakturu" />
                              <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDeleteInvoice(service._id)} title="Obriši fakturu" aria-label="Obriši fakturu" />
                            </div>
                          ) : (
                            <span className="sx-faint">-</span>
                          )}
                        </td>
                        <td className="is-actions is-end">
                          <div className="sx-rowacts">
                            <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => handleEditService(service)} title="Izmeni servis" aria-label="Izmeni servis" />
                            <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDeleteService(service._id)} title="Obriši servis" aria-label="Obriši servis" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Dialog>
      )}

      {/* Izmena registracije */}
      {showEditRegistrationModal && selectedVehicle && (
        <Dialog
          onClose={closeEditRegistration}
          title={`Izmeni registraciju - ${selectedVehicle.name}`}
          size="sm"
          testId="registration-dialog"
          footer={<>
            <Btn variant="ghost" onClick={closeEditRegistration}>Otkaži</Btn>
            <Btn type="submit" form="registration-form" variant="primary">Ažuriraj registraciju</Btn>
          </>}
        >
          <form id="registration-form" onSubmit={handleUpdateRegistration}>
            <Field label="Trenutni datum isteka registracije">
              <div className="sx-cred sx-mono">{formatDate(selectedVehicle.registrationExpiry)}</div>
            </Field>
            <Field label="Novi datum isteka registracije *" htmlFor="registration-date">
              <Input
                id="registration-date"
                type="date"
                value={newRegistrationDate}
                onChange={(e) => setNewRegistrationDate(e.target.value)}
                required
              />
            </Field>
          </form>
        </Dialog>
      )}

      {/* Izmena servisa */}
      {showEditServiceModal && selectedService && (
        <Dialog
          onClose={closeEditService}
          title="Izmeni servis"
          size="md"
          testId="service-edit-dialog"
          footer={<>
            <Btn variant="ghost" onClick={closeEditService}>Otkaži</Btn>
            <Btn type="submit" form="service-edit-form" variant="primary">Ažuriraj servis</Btn>
          </>}
        >
          <form id="service-edit-form" onSubmit={handleUpdateService}>
            <ServiceFields idp="service-edit" v={editService} set={setEditService} total={calculateTotalPrice} />
          </form>
        </Dialog>
      )}

      {/* Izmena vozila */}
      {showEditVehicleModal && selectedVehicle && (
        <Dialog
          onClose={closeEditVehicle}
          title={`Izmeni vozilo - ${selectedVehicle.name}`}
          size="lg"
          testId="vehicle-edit-dialog"
          footer={<>
            <Btn variant="ghost" onClick={closeEditVehicle}>Otkaži</Btn>
            <Btn type="submit" form="vehicle-edit-form" variant="primary">Ažuriraj vozilo</Btn>
          </>}
        >
          <form id="vehicle-edit-form" onSubmit={handleUpdateVehicle}>
            <VehicleFields idp="vehicle-edit" v={editVehicle} set={setEditVehicle} />
          </form>
        </Dialog>
      )}

      {/* Slika fakture */}
      {showImageModal && selectedImage && (
        <Dialog
          onClose={closeImageModal}
          title="Faktura servisa"
          size="xl"
          testId="invoice-dialog"
          footer={
            <Btn href={selectedImage} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Otvori u novom tabu</Btn>
          }
        >
          <img src={selectedImage} alt="Faktura servisa" className="mx-vehicles-invoice" />
        </Dialog>
      )}
    </div>
  );
};

export default VehicleFleet;
