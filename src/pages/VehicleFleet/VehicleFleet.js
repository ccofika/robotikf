import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Car, Wrench, Calendar, AlertTriangle, Search, Filter, Edit2, Trash2, Eye, RefreshCw } from 'lucide-react';
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
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
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
    nextServiceDue: '',
    mileage: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchStats();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await vehiclesAPI.getAllWithStatus();
      setVehicles(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju vozila:', error);
      setError('Greška pri učitavanju vozila. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await vehiclesAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju statistika:', error);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = searchTerm === '' || 
        vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.licensePlate && vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vehicle.brand && vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

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
      
      fetchVehicles();
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
        nextServiceDue: '',
        mileage: ''
      });
      
      fetchVehicles();
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
      fetchVehicles();
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
              onClick={fetchVehicles}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
            Prikazano {filteredVehicles.length} od {vehicles.length} vozila
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
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowAddServiceModal(true);
                          }}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle._id)}
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
                      Datum isteka osiguranja
                    </label>
                    <Input
                      type="date"
                      value={newVehicle.insuranceExpiry}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, insuranceExpiry: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Datum isteka tehničkog pregleda
                    </label>
                    <Input
                      type="date"
                      value={newVehicle.inspectionExpiry}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, inspectionExpiry: e.target.value }))}
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
                    Sledeći servis
                  </label>
                  <Input
                    type="date"
                    value={newService.nextServiceDue}
                    onChange={(e) => setNewService(prev => ({ ...prev, nextServiceDue: e.target.value }))}
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
    </div>
  );
};

export default VehicleFleet;