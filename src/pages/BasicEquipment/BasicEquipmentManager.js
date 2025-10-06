import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, SearchIcon, EditIcon, DeleteIcon, RefreshIcon, EyeIcon, FilterIcon, ToolsIcon, UserIcon, MinusIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { basicEquipmentAPI, techniciansAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';

const BasicEquipmentManager = () => {
  // State za osnovnu opremu
  const [basicEquipment, setBasicEquipment] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State za formu
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    serialNumber: '',
    quantity: 0
  });

  // State za zadužavanje
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignData, setAssignData] = useState({
    technicianId: '',
    basicEquipmentId: '',
    quantity: 1,
    isReturn: false
  });

  // State za pretragu i filtriranje
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [viewMode, setViewMode] = useState('inventory'); // 'inventory', 'technicians', 'assign'
  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    serialNumber: true,
    quantity: true,
    actions: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnMenu && !event.target.closest('.relative')) {
        setShowColumnMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnMenu]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');

    try {
      const [equipmentResponse, techniciansResponse] = await Promise.all([
        basicEquipmentAPI.getAll(),
        techniciansAPI.getAll()
      ]);

      setBasicEquipment(equipmentResponse.data);
      setTechnicians(techniciansResponse.data);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Greška pri učitavanju podataka. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje podataka!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.type.trim()) {
      toast.error('Naziv osnovne opreme je obavezan!');
      return;
    }

    if (formData.quantity < 0) {
      toast.error('Količina ne može biti negativna!');
      return;
    }

    setLoading(true);

    try {
      if (editingItem) {
        await basicEquipmentAPI.update(editingItem._id, formData);
        toast.success('Osnovna oprema je uspešno ažurirana!');
      } else {
        await basicEquipmentAPI.create(formData);
        toast.success('Osnovna oprema je uspešno dodana!');
      }

      fetchAllData();
      resetForm();
    } catch (error) {
      console.error('Greška pri čuvanju:', error);
      const errorMessage = error.response?.data?.error || 'Greška pri čuvanju osnovne opreme.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete osnovnu opremu "${type}"?`)) {
      setLoading(true);

      try {
        await basicEquipmentAPI.delete(id);
        toast.success('Osnovna oprema je uspešno obrisana!');
        fetchAllData();
      } catch (error) {
        console.error('Greška pri brisanju:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju osnovne opreme.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!assignData.technicianId || !assignData.basicEquipmentId) {
      toast.error('Morate odabrati tehničara i osnovnu opremu!');
      return;
    }

    if (assignData.quantity <= 0) {
      toast.error('Količina mora biti veća od 0!');
      return;
    }

    setLoading(true);

    try {
      if (assignData.isReturn) {
        await techniciansAPI.returnBasicEquipment(assignData.technicianId, {
          basicEquipmentId: assignData.basicEquipmentId,
          quantity: parseInt(assignData.quantity, 10)
        });
        toast.success('Osnovna oprema je uspešno razdužena!');
      } else {
        await techniciansAPI.assignBasicEquipment(assignData.technicianId, {
          basicEquipmentId: assignData.basicEquipmentId,
          quantity: parseInt(assignData.quantity, 10)
        });
        toast.success('Osnovna oprema je uspešno zadužena!');
      }

      fetchAllData();
      resetAssignForm();
    } catch (error) {
      console.error('Greška pri zaduženju/razduženju:', error);
      const errorMessage = error.response?.data?.error || 'Greška pri zaduženju/razduženju osnovne opreme.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ type: '', serialNumber: '', quantity: 0 });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const resetAssignForm = () => {
    setAssignData({
      technicianId: '',
      basicEquipmentId: '',
      quantity: 1,
      isReturn: false
    });
    setShowAssignForm(false);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      serialNumber: item.serialNumber || '',
      quantity: item.quantity
    });
    setShowAddForm(true);
  };

  // Filtriranje podataka
  const filteredBasicEquipment = useMemo(() => {
    return basicEquipment.filter(item => {
      const searchMatch = searchTerm === '' ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    });
  }, [basicEquipment, searchTerm]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech => {
      const hasBasicEquipment = tech.basicEquipment && tech.basicEquipment.length > 0;
      const searchMatch = searchTerm === '' ||
                         tech.name.toLowerCase().includes(searchTerm.toLowerCase());
      return hasBasicEquipment && searchMatch;
    });
  }, [technicians, searchTerm]);

  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBasicEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBasicEquipment.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Dostupna osnovna oprema za zadužavanje
  const availableBasicEquipment = basicEquipment.filter(item => item.quantity > 0);

  // Osnovna oprema zadužena kod selektovanog tehničara
  const selectedTechnicianEquipment = selectedTechnician ?
    technicians.find(t => t._id === selectedTechnician)?.basicEquipment || [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <ToolsIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Osnovna oprema</h1>
              <p className="text-slate-600 mt-1">Upravljanje osnovnom opremom i zaduženjima</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-6 bg-slate-100 rounded-lg p-4">
          <button
            onClick={() => setViewMode('inventory')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              viewMode === 'inventory' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <ToolsIcon size={16} />
            <span>Inventar</span>
          </button>
          <button
            onClick={() => setViewMode('technicians')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              viewMode === 'technicians' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <UserIcon size={16} />
            <span>Po tehničarima</span>
          </button>
          <button
            onClick={() => setViewMode('assign')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              viewMode === 'assign' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <PlusIcon size={16} />
            <span>Zaduženje/Razduženje</span>
          </button>
        </div>
      </div>

      {/* Inventory View */}
      {viewMode === 'inventory' && (
        <>
          {/* Stats Cards */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ToolsIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno stavki</p>
                    <h3 className="text-lg font-bold text-slate-900">{filteredBasicEquipment.length}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-lg font-bold">
                    {filteredBasicEquipment.filter(item => item.quantity === 0).length}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Nema na stanju</p>
                    <h3 className="text-lg font-bold text-slate-900">
                      {filteredBasicEquipment.length ?
                        Math.round(filteredBasicEquipment.filter(item => item.quantity === 0).length / filteredBasicEquipment.length * 100) : 0}%
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 text-yellow-700 rounded-lg font-bold">
                    {filteredBasicEquipment.filter(item => item.quantity > 0 && item.quantity < 5).length}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Malo na stanju</p>
                    <h3 className="text-lg font-bold text-slate-900">
                      {filteredBasicEquipment.length ?
                        Math.round(filteredBasicEquipment.filter(item => item.quantity > 0 && item.quantity < 5).length / filteredBasicEquipment.length * 100) : 0}%
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg font-bold">
                    {technicians.reduce((acc, tech) => acc + (tech.basicEquipment?.length || 0), 0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Zaduženo</p>
                    <h3 className="text-lg font-bold text-slate-900">
                      {technicians.filter(tech => tech.basicEquipment && tech.basicEquipment.length > 0).length} tehničara
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingItem ? 'Izmeni osnovnu opremu' : 'Dodaj novu osnovnu opremu'}
                  </h3>
                  <Button
                    type="tertiary"
                    size="small"
                    onClick={resetForm}
                  >
                    ✕
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700">
                      Vrsta osnovne opreme:
                    </label>
                    <input
                      type="text"
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      placeholder="Unesite vrstu osnovne opreme"
                      disabled={loading}
                      autoFocus
                      required
                      className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="serialNumber" className="block text-sm font-medium text-slate-700">
                      Serijski broj (S/N):
                    </label>
                    <input
                      type="text"
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                      placeholder="Unesite serijski broj"
                      disabled={loading}
                      className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">
                      Količina:
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                      min="0"
                      disabled={loading}
                      required
                      className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                  <Button
                    type="secondary"
                    size="medium"
                    onClick={resetForm}
                  >
                    Odustani
                  </Button>
                  <Button
                    type="primary"
                    size="medium"
                    onClick={handleSubmit}
                    loading={loading}
                  >
                    {loading ? 'Čuvanje...' : editingItem ? 'Ažuriraj' : 'Dodaj'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Main Table Card */}
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
            {/* Table Controls */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="text"
                      placeholder="Pretraži po nazivu osnovne opreme..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Add Button */}
                  <Button
                    type="primary"
                    size="medium"
                    prefix={<PlusIcon size={16} />}
                    onClick={() => setShowAddForm(true)}
                  >
                    Dodaj
                  </Button>

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
                            type: 'Vrsta osnovne opreme',
                            serialNumber: 'Serijski broj',
                            quantity: 'Količina',
                            actions: 'Akcije'
                          }).map(([key, label]) => (
                            <label key={key} className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors">
                              <input
                                type="checkbox"
                                checked={visibleColumns[key]}
                                onChange={(e) => setVisibleColumns(prev => ({...prev, [key]: e.target.checked}))}
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
                    onClick={fetchAllData}
                    loading={loading}
                    prefix={<RefreshIcon size={16} />}
                  >
                    Osveži
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex items-center space-x-3 text-slate-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Učitavanje osnovne opreme...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {visibleColumns.type && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Vrsta osnovne opreme
                          </th>
                        )}
                        {visibleColumns.serialNumber && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Serijski broj
                          </th>
                        )}
                        {visibleColumns.quantity && (
                          <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Količina
                          </th>
                        )}
                        {visibleColumns.actions && (
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Akcije
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center space-y-2">
                              <ToolsIcon size={48} className="text-slate-300" />
                              <p className="text-sm font-medium">Nema rezultata za prikazivanje</p>
                              <p className="text-xs">Promenite filtere ili dodajte novu osnovnu opremu</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item, index) => (
                          <tr key={item._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                            {visibleColumns.type && (
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {item.type}
                              </td>
                            )}
                            {visibleColumns.serialNumber && (
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {item.serialNumber || '-'}
                              </td>
                            )}
                            {visibleColumns.quantity && (
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <Button
                                    type={item.quantity === 0 ? 'error' : item.quantity < 5 ? 'warning' : 'secondary'}
                                    size="small"
                                    className="text-xs min-w-[3rem]"
                                  >
                                    {item.quantity}
                                  </Button>
                                </div>
                              </td>
                            )}
                            {visibleColumns.actions && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    type="tertiary"
                                    size="small"
                                    prefix={<EditIcon size={14} />}
                                    onClick={() => startEdit(item)}
                                  >
                                    Izmeni
                                  </Button>
                                  <Button
                                    type="error"
                                    size="small"
                                    prefix={<DeleteIcon size={14} />}
                                    onClick={() => handleDelete(item._id, item.type)}
                                    disabled={loading}
                                  >
                                    Obriši
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredBasicEquipment.length > itemsPerPage && (
                  <div className="px-6 py-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600">
                        Prikazano {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredBasicEquipment.length)} od {filteredBasicEquipment.length} rezultata
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="tertiary"
                          size="small"
                          onClick={() => paginate(1)}
                          disabled={currentPage === 1}
                        >
                          &laquo;
                        </Button>
                        <Button
                          type="tertiary"
                          size="small"
                          onClick={() => paginate(currentPage - 1)}
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
                              type={currentPage === number ? "primary" : "tertiary"}
                              size="small"
                              onClick={() => paginate(number)}
                            >
                              {number}
                            </Button>
                          ))}

                        <Button
                          type="tertiary"
                          size="small"
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          &rsaquo;
                        </Button>
                        <Button
                          type="tertiary"
                          size="small"
                          onClick={() => paginate(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          &raquo;
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Technicians View */}
      {viewMode === 'technicians' && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">Osnovna oprema po tehničarima</h3>
              <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Pretraži tehničare..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredTechnicians.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-500">Nema tehničara sa zaduženom osnovnom opremom</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredTechnicians.map(technician => (
                  <div key={technician._id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <UserIcon size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{technician.name}</h4>
                        <p className="text-xs text-slate-600">Tehničar</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(technician.basicEquipment || []).map(equipment => (
                        <div key={equipment._id} className="flex items-center justify-between bg-white rounded-md p-3 border border-slate-200">
                          <span className="text-sm font-medium text-slate-900">{equipment.type}</span>
                          <Button
                            type="secondary"
                            size="small"
                            className="text-xs"
                          >
                            {equipment.quantity}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment View */}
      {viewMode === 'assign' && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <ToolsIcon size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Zaduženje / Razduženje osnovne opreme</h3>
            </div>
          </div>

          <form onSubmit={handleAssignSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tehničar:</label>
                  <select
                    value={assignData.technicianId}
                    onChange={(e) => {
                      setAssignData({...assignData, technicianId: e.target.value});
                      setSelectedTechnician(e.target.value);
                    }}
                    disabled={loading}
                    className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                    required
                  >
                    <option value="">Izaberite tehničara</option>
                    {technicians.map(tech => (
                      <option key={tech._id} value={tech._id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-slate-700">Tip operacije:</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={!assignData.isReturn}
                          onChange={() => setAssignData({...assignData, isReturn: false, basicEquipmentId: ''})}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Zaduženje</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={assignData.isReturn}
                          onChange={() => setAssignData({...assignData, isReturn: true, basicEquipmentId: ''})}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Razduženje</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Osnovna oprema:</label>
                  <select
                    value={assignData.basicEquipmentId}
                    onChange={(e) => setAssignData({...assignData, basicEquipmentId: e.target.value})}
                    disabled={loading || (!assignData.isReturn && availableBasicEquipment.length === 0) || (assignData.isReturn && selectedTechnicianEquipment.length === 0)}
                    className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                    required
                  >
                    <option value="">Izaberite osnovnu opremu</option>
                    {assignData.isReturn ? (
                      selectedTechnicianEquipment.map(equipment => (
                        <option key={equipment.id || equipment._id} value={equipment.id || equipment._id}>
                          {equipment.type} (Zaduženo: {equipment.quantity})
                        </option>
                      ))
                    ) : (
                      availableBasicEquipment.map(equipment => (
                        <option key={equipment._id} value={equipment._id}>
                          {equipment.type} (Dostupno: {equipment.quantity})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Količina:</label>
                  <input
                    type="number"
                    min="1"
                    value={assignData.quantity}
                    onChange={(e) => setAssignData({...assignData, quantity: parseInt(e.target.value) || 1})}
                    disabled={loading || !assignData.basicEquipmentId}
                    className="h-9 w-full px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                    required
                  />
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">Pregled stanja</h4>

                {selectedTechnician && (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Tehničar:</span> {technicians.find(t => t._id === selectedTechnician)?.name}
                    </div>

                    {selectedTechnicianEquipment.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Trenutno zadužena oprema:</div>
                        <div className="space-y-1">
                          {selectedTechnicianEquipment.map(equipment => (
                            <div key={equipment._id} className="flex justify-between text-xs bg-white rounded p-2">
                              <span>{equipment.type}</span>
                              <span className="font-medium">{equipment.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
              <Button
                type="secondary"
                size="medium"
                onClick={resetAssignForm}
              >
                Poništi
              </Button>
              <Button
                type="primary"
                size="medium"
                onClick={handleAssignSubmit}
                loading={loading}
                disabled={!assignData.technicianId || !assignData.basicEquipmentId || assignData.quantity <= 0}
                prefix={assignData.isReturn ? <MinusIcon size={16} /> : <PlusIcon size={16} />}
              >
                {loading ? 'Obrađuje se...' : assignData.isReturn ? 'Razduži' : 'Zaduži'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BasicEquipmentManager;