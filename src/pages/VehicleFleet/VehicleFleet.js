import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Car, Wrench, Calendar, AlertTriangle, Search, Filter, Edit2, Trash2, Eye, RefreshCw, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { vehiclesAPI } from '../../services/api';
import { cn } from '../../utils/cn';

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
    date: new Date().toISOString().split('T')[0],
    price: '',
    comment: '',
    serviceType: 'regular',
    nextServiceMileage: '',
    mileage: ''
  });

  const [editService, setEditService] = useState({
    date: '',
    price: '',
    comment: '',
    serviceType: 'regular',
    nextServiceMileage: '',
    mileage: ''
  });

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
      await vehiclesAPI.addService(selectedVehicle._id, {
        ...newService,
        price: parseFloat(newService.price),
        mileage: newService.mileage ? parseInt(newService.mileage) : undefined
      });
      
      setShowAddServiceModal(false);
      setSelectedVehicle(null);
      setNewService({
        date: new Date().toISOString().split('T')[0],
        price: '',
        comment: '',
        serviceType: 'regular',
        nextServiceMileage: '',
        mileage: ''
      });

      // Refresh current page and stats
      fetchVehicles(pagination.currentPage);
      fetchStats();
      setError('');
    } catch (error) {
      console.error('Greška pri dodavanju servisa:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju servisa');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovo vozilo?')) {
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
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
    
    switch (status) {
      case 'expired':
        return (
          <span className={cn(baseClasses, "bg-red-50 text-red-700 ring-1 ring-red-600/20")}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Istekla ({Math.abs(daysUntilExpiry)} dana)
          </span>
        );
      case 'expiring_soon':
        return (
          <span className={cn(baseClasses, "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20")}>
            <Calendar className="w-3 h-3 mr-1" />
            Ističe za {daysUntilExpiry} dana
          </span>
        );
      case 'valid':
        return (
          <span className={cn(baseClasses, "bg-green-50 text-green-700 ring-1 ring-green-600/20")}>
            <Car className="w-3 h-3 mr-1" />
            Važeća ({daysUntilExpiry} dana)
          </span>
        );
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
      price: service.price?.toString() || '',
      comment: service.comment || '',
      serviceType: service.serviceType || 'regular',
      nextServiceMileage: service.nextServiceMileage?.toString() || '',
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
        price: parseFloat(editService.price),
        mileage: editService.mileage ? parseInt(editService.mileage) : undefined
      });
      
      setShowEditServiceModal(false);
      setSelectedService(null);
      setEditService({
        date: '',
        price: '',
        comment: '',
        serviceType: 'regular',
        nextServiceMileage: '',
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
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovaj servis?')) {
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

  if (loading && vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Učitavanje vozila...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vozni park</h1>
              <p className="text-slate-600 mt-1">Upravljanje vozilima, registracijama i servisima</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchVehicles(pagination.currentPage);
                fetchStats();
              }}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Osveži
            </Button>
            <Button onClick={() => setShowAddVehicleModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj vozilo
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno vozila</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVehicles}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivna vozila</CardTitle>
            <Car className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeVehicles}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registracije ističu</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringRegistrations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Troškovi servisa</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalServiceCosts)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Service Warnings */}
      {getVisibleWarnings().length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">Upozorenja - Servisi vozila</CardTitle>
              </div>
              <CardDescription>
                Automatski detektovana upozorenja za vozila koja zahtevaju pažnju
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getVisibleWarnings().map(warning => (
                  <div 
                    key={warning.id}
                    className={cn(
                      "flex items-start justify-between p-4 rounded-lg border-l-4 transition-all",
                      warning.severity === 'high' ? "bg-red-50 border-l-red-500 border border-red-200" : 
                      warning.severity === 'medium' ? "bg-amber-50 border-l-amber-500 border border-amber-200" :
                      "bg-blue-50 border-l-blue-500 border border-blue-200"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={cn(
                          "font-semibold text-sm",
                          warning.severity === 'high' ? "text-red-800" :
                          warning.severity === 'medium' ? "text-amber-800" :
                          "text-blue-800"
                        )}>
                          {warning.title}
                        </h4>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          warning.severity === 'high' ? "bg-red-200 text-red-800" :
                          warning.severity === 'medium' ? "bg-amber-200 text-amber-800" :
                          "bg-blue-200 text-blue-800"
                        )}>
                          {warning.severity === 'high' ? 'Visoko' :
                           warning.severity === 'medium' ? 'Srednje' : 'Nisko'}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm mb-1",
                        warning.severity === 'high' ? "text-red-700" :
                        warning.severity === 'medium' ? "text-amber-700" :
                        "text-blue-700"
                      )}>
                        {warning.message}
                      </p>
                      <p className={cn(
                        "text-xs",
                        warning.severity === 'high' ? "text-red-600" :
                        warning.severity === 'medium' ? "text-amber-600" :
                        "text-blue-600"
                      )}>
                        {warning.details}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowServiceHistory(vehicles.find(v => v._id === warning.vehicleId))}
                        className="text-xs"
                        title="Prikaži servise vozila"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissWarning(warning.id)}
                        className={cn(
                          "text-xs",
                          warning.severity === 'high' ? "text-red-600 hover:text-red-800" :
                          warning.severity === 'medium' ? "text-amber-600 hover:text-amber-800" :
                          "text-blue-600 hover:text-blue-800"
                        )}
                        title="Sakrij upozorenje"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Pretraži po nazivu, registraciji, brendu..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="pl-10"
                />
              </div>
              
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="h-9 px-3 pr-8 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
                >
                  <option value="all">Svi statusi</option>
                  <option value="active">Aktivna</option>
                  <option value="inactive">Neaktivna</option>
                  <option value="maintenance">U servisu</option>
                  <option value="sold">Prodana</option>
                </select>
                <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none h-4 w-4" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista vozila</CardTitle>
          <CardDescription>
            Prikazano {vehicles.length} od {pagination.totalCount} vozila
            {pagination.totalPages > 1 && ` (strana ${pagination.currentPage} od ${pagination.totalPages})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vozilo</TableHead>
                <TableHead>Registracija</TableHead>
                <TableHead>Status registracije</TableHead>
                <TableHead>Poslednji servis</TableHead>
                <TableHead>Ukupni troškovi</TableHead>
                <TableHead>Zaduženo</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="7" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-2">
                      <Car className="h-12 w-12 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Nema vozila za prikaz</p>
                      <p className="text-xs text-slate-400">Dodajte novo vozilo ili promenite filtere</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{vehicle.name}</span>
                        {vehicle.brand && vehicle.model && (
                          <span className="text-sm text-muted-foreground">
                            {vehicle.brand} {vehicle.model}
                            {vehicle.year && ` (${vehicle.year})`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{vehicle.licensePlate || 'N/A'}</span>
                        <span className="text-sm text-muted-foreground">
                          Ističe: {formatDate(vehicle.registrationExpiry)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRegistrationStatusBadge(vehicle.registrationStatus, vehicle.daysUntilRegistrationExpiry)}
                    </TableCell>
                    <TableCell>
                      {vehicle.latestService ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(vehicle.latestService.date)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(vehicle.latestService.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nema servisa</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(vehicle.totalServiceCost)}</span>
                    </TableCell>
                    <TableCell>
                      {vehicle.assignedTo ? (
                        <span className="text-sm">{vehicle.assignedTo}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nezaduženo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowServiceHistory(vehicle)}
                          title="Prikaži istoriju servisa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVehicle(vehicle)}
                          title="Izmeni informacije o vozilu"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRegistration(vehicle)}
                          title="Izmeni datum registracije"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowAddServiceModal(true);
                          }}
                          title="Dodaj servis"
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle._id)}
                          title="Obriši vozilo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Strana {pagination.currentPage} od {pagination.totalPages}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchVehicles(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                >
                  Prethodna
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchVehicles(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  Sledeća
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Dodaj novo vozilo</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddVehicleModal(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddVehicle} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Naziv vozila *
                    </label>
                    <Input
                      type="text"
                      value={newVehicle.name}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Npr. Službeni automobil 1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Registarske tablice
                    </label>
                    <Input
                      type="text"
                      value={newVehicle.licensePlate}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                      placeholder="BG-123-XY"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Brend
                    </label>
                    <Input
                      type="text"
                      value={newVehicle.brand}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Volkswagen"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Model
                    </label>
                    <Input
                      type="text"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Golf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Godina proizvodnje
                    </label>
                    <Input
                      type="number"
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Kilometraža
                    </label>
                    <Input
                      type="number"
                      value={newVehicle.mileage}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="50000"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Datum isteka registracije *
                    </label>
                    <Input
                      type="date"
                      value={newVehicle.registrationExpiry}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, registrationExpiry: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Zaduženo korisniku
                    </label>
                    <Input
                      type="text"
                      value={newVehicle.assignedTo}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, assignedTo: e.target.value }))}
                      placeholder="Ime korisnika"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Napomene
                  </label>
                  <textarea
                    value={newVehicle.notes}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Dodatne informacije o vozilu..."
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows="3"
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddVehicleModal(false)}
                  >
                    Otkaži
                  </Button>
                  <Button type="submit">
                    Dodaj vozilo
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Dodaj servis - {selectedVehicle.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddServiceModal(false);
                  setSelectedVehicle(null);
                }}
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Datum servisa *
                  </label>
                  <Input
                    type="date"
                    value={newService.date}
                    onChange={(e) => setNewService(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cena (RSD) *
                  </label>
                  <Input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="15000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tip servisa
                  </label>
                  <select
                    value={newService.serviceType}
                    onChange={(e) => setNewService(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="regular">Redovan servis</option>
                    <option value="repair">Popravka</option>
                    <option value="inspection">Pregled</option>
                    <option value="oil_change">Menjanje ulja</option>
                    <option value="brake_check">Pregled kočnica</option>
                    <option value="other">Ostalo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kilometraža prilikom servisa
                  </label>
                  <Input
                    type="number"
                    value={newService.mileage}
                    onChange={(e) => setNewService(prev => ({ ...prev, mileage: e.target.value }))}
                    placeholder="Trenutna kilometraža"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sledeći servis (kilometraža)
                  </label>
                  <Input
                    type="number"
                    value={newService.nextServiceMileage}
                    onChange={(e) => setNewService(prev => ({ ...prev, nextServiceMileage: e.target.value }))}
                    placeholder="Kilometraža sledećeg servisa"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Komentar
                  </label>
                  <textarea
                    value={newService.comment}
                    onChange={(e) => setNewService(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Opis servisa, zamenjena dela, napomene..."
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows="3"
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddServiceModal(false);
                      setSelectedVehicle(null);
                    }}
                  >
                    Otkaži
                  </Button>
                  <Button type="submit">
                    Dodaj servis
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service History Modal */}
      {showServiceHistoryModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Istorija servisa - {selectedVehicle.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowServiceHistoryModal(false);
                  setSelectedVehicle(null);
                  setVehicleServices([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {loadingServices ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3 text-slate-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-medium">Učitavanje servisa...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Tip servisa</TableHead>
                        <TableHead>Cena</TableHead>
                        <TableHead>Kilometraža</TableHead>
                        <TableHead>Komentar</TableHead>
                        <TableHead>Sledeći servis</TableHead>
                        <TableHead className="text-right">Akcije</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan="7" className="text-center py-12">
                            <div className="flex flex-col items-center space-y-2">
                              <Wrench className="h-12 w-12 text-slate-300" />
                              <p className="text-sm font-medium text-slate-500">Nema servisa za prikaz</p>
                              <p className="text-xs text-slate-400">Dodajte prvi servis za ovo vozilo</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        vehicleServices.map((service) => (
                          <TableRow key={service._id}>
                            <TableCell>
                              <span className="font-medium">{formatDate(service.date)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">{service.serviceType === 'regular' ? 'Redovan servis' : 
                                service.serviceType === 'repair' ? 'Popravka' :
                                service.serviceType === 'inspection' ? 'Pregled' :
                                service.serviceType === 'oil_change' ? 'Menjanje ulja' :
                                service.serviceType === 'brake_check' ? 'Pregled kočnica' :
                                service.serviceType}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{formatCurrency(service.price)}</span>
                            </TableCell>
                            <TableCell>
                              {service.mileage ? (
                                <span className="text-sm">{service.mileage} km</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <span className="text-sm text-slate-600 truncate block" title={service.comment}>
                                {service.comment || 'Nema komentara'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {service.nextServiceMileage ? (
                                <span className="text-sm">{service.nextServiceMileage} km</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditService(service)}
                                  title="Izmeni servis"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteService(service._id)}
                                  title="Obriši servis"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Modal */}
      {showEditRegistrationModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Izmeni registraciju - {selectedVehicle.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditRegistrationModal(false);
                  setSelectedVehicle(null);
                  setNewRegistrationDate('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateRegistration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trenutni datum isteka registracije
                  </label>
                  <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-700">
                    {formatDate(selectedVehicle.registrationExpiry)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Novi datum isteka registracije *
                  </label>
                  <Input
                    type="date"
                    value={newRegistrationDate}
                    onChange={(e) => setNewRegistrationDate(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditRegistrationModal(false);
                      setSelectedVehicle(null);
                      setNewRegistrationDate('');
                    }}
                  >
                    Otkaži
                  </Button>
                  <Button type="submit">
                    Ažuriraj registraciju
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditServiceModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Izmeni servis
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditServiceModal(false);
                  setSelectedService(null);
                  setEditService({
                    date: '',
                    price: '',
                    comment: '',
                    serviceType: 'regular',
                    nextServiceMileage: '',
                    mileage: ''
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Datum servisa *
                  </label>
                  <Input
                    type="date"
                    value={editService.date}
                    onChange={(e) => setEditService(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cena (RSD) *
                  </label>
                  <Input
                    type="number"
                    value={editService.price}
                    onChange={(e) => setEditService(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="15000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tip servisa
                  </label>
                  <select
                    value={editService.serviceType}
                    onChange={(e) => setEditService(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="regular">Redovan servis</option>
                    <option value="repair">Popravka</option>
                    <option value="inspection">Pregled</option>
                    <option value="oil_change">Menjanje ulja</option>
                    <option value="brake_check">Pregled kočnica</option>
                    <option value="other">Ostalo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kilometraža prilikom servisa
                  </label>
                  <Input
                    type="number"
                    value={editService.mileage}
                    onChange={(e) => setEditService(prev => ({ ...prev, mileage: e.target.value }))}
                    placeholder="Trenutna kilometraža"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sledeći servis (kilometraža)
                  </label>
                  <Input
                    type="number"
                    value={editService.nextServiceMileage}
                    onChange={(e) => setEditService(prev => ({ ...prev, nextServiceMileage: e.target.value }))}
                    placeholder="Kilometraža sledećeg servisa"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Komentar
                  </label>
                  <textarea
                    value={editService.comment}
                    onChange={(e) => setEditService(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Opis servisa, zamenjena dela, napomene..."
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows="3"
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditServiceModal(false);
                      setSelectedService(null);
                      setEditService({
                        date: '',
                        price: '',
                        comment: '',
                        serviceType: 'regular',
                        nextServiceMileage: '',
                        mileage: ''
                      });
                    }}
                  >
                    Otkaži
                  </Button>
                  <Button type="submit">
                    Ažuriraj servis
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditVehicleModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Izmeni vozilo - {selectedVehicle.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
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
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateVehicle} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Naziv vozila *
                    </label>
                    <Input
                      type="text"
                      value={editVehicle.name}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Npr. Službeni automobil 1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Registarske tablice
                    </label>
                    <Input
                      type="text"
                      value={editVehicle.licensePlate}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                      placeholder="BG-123-XY"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Brend
                    </label>
                    <Input
                      type="text"
                      value={editVehicle.brand}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Volkswagen"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Model
                    </label>
                    <Input
                      type="text"
                      value={editVehicle.model}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Golf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Godina proizvodnje
                    </label>
                    <Input
                      type="number"
                      value={editVehicle.year}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Kilometraža
                    </label>
                    <Input
                      type="number"
                      value={editVehicle.mileage}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="50000"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Datum isteka registracije *
                    </label>
                    <Input
                      type="date"
                      value={editVehicle.registrationExpiry}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, registrationExpiry: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Zaduženo korisniku
                    </label>
                    <Input
                      type="text"
                      value={editVehicle.assignedTo}
                      onChange={(e) => setEditVehicle(prev => ({ ...prev, assignedTo: e.target.value }))}
                      placeholder="Ime korisnika"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Napomene
                  </label>
                  <textarea
                    value={editVehicle.notes}
                    onChange={(e) => setEditVehicle(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Dodatne informacije o vozilu..."
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows="3"
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
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
                    }}
                  >
                    Otkaži
                  </Button>
                  <Button type="submit">
                    Ažuriraj vozilo
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleFleet;