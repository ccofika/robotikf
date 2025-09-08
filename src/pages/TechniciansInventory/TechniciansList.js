import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, ViewIcon, DeleteIcon, BoxIcon, ToolsIcon, RefreshIcon, EyeIcon, UserIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { cn } from '../../utils/cn';

const TechniciansList = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    createdAt: true,
    actions: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  useEffect(() => {
    fetchTechnicians();
  }, []);
  
  // Close column menu when clicking outside
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
  
  const fetchTechnicians = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
      setError('Greška pri učitavanju tehničara. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje tehničara!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id, name) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete tehničara "${name}"?`)) {
      setLoading(true);
      
      try {
        await techniciansAPI.delete(id);
        toast.success('Tehničar je uspešno obrisan!');
        fetchTechnicians();
      } catch (error) {
        console.error('Greška pri brisanju tehničara:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju tehničara.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Filtriranje tehničara - isključuj admin korisnike
  const filteredTechnicians = useMemo(() => {
    return technicians.filter(technician => {
      // Sakrij admin korisnike
      if (technician.isAdmin) {
        return false;
      }
      const searchMatch = searchTerm === '' || 
                         technician.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return searchMatch;
    });
  }, [technicians, searchTerm]);
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTechnicians.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredTechnicians.length / itemsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UserIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pregled tehničara</h1>
              <p className="text-slate-600 mt-1">Upravljanje listom tehničara</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/technicians/add">
              <Button 
                type="primary"
                size="medium"
                prefix={<PlusIcon size={16} />}
              >
                Dodaj tehničara
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno tehničara</p>
                <h3 className="text-lg font-bold text-slate-900">{filteredTechnicians.length}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg font-bold">
                {technicians.length}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Svi tehničari</p>
                <h3 className="text-lg font-bold text-slate-900">100%</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-700 rounded-lg font-bold">
                {searchTerm ? filteredTechnicians.length : technicians.length}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">{searchTerm ? 'Rezultati pretrage' : 'Aktivni'}</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {searchTerm && technicians.length > 0 ? 
                    Math.round(filteredTechnicians.length / technicians.length * 100) : 100}%
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modern Table Card */}
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
                  placeholder="Pretraži po imenu tehničara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                />
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
                        name: 'Ime',
                        createdAt: 'Datum kreiranja',
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
                onClick={fetchTechnicians}
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
              <span className="text-sm font-medium">Učitavanje tehničara...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.name && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Ime
                      </th>
                    )}
                    {visibleColumns.createdAt && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Datum kreiranja
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
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <UserIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">
                            {searchTerm ? 
                              `Nema rezultata za "${searchTerm}"` : 
                              'Nema tehničara za prikazivanje'
                            }
                          </p>
                          <p className="text-xs">Promenite filtere ili dodajte novog tehničara</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((technician, index) => (
                      <tr key={technician._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                        {visibleColumns.name && (
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{technician.name}</span>
                              <span className="text-xs text-slate-500 font-mono">ID: {technician._id}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.createdAt && (
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {new Date(technician.createdAt).toLocaleDateString('sr-RS')}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-1 flex-wrap gap-1">
                              <Link to={`/technicians/${technician._id}/assign-equipment`}>
                                <Button
                                  type="tertiary"
                                  size="small"
                                  prefix={<BoxIcon size={14} />}
                                  title="Zaduži/razduži opremu"
                                >
                                  Oprema
                                </Button>
                              </Link>
                              <Link to={`/technicians/${technician._id}/assign-material`}>
                                <Button
                                  type="tertiary"
                                  size="small"
                                  prefix={<ToolsIcon size={14} />}
                                  title="Zaduži/razduži materijal"
                                >
                                  Materijal
                                </Button>
                              </Link>
                              <Link to={`/technicians/${technician._id}`}>
                                <Button
                                  type="tertiary"
                                  size="small"
                                  prefix={<ViewIcon size={14} />}
                                  title="Detalji tehničara"
                                >
                                  Detalji
                                </Button>
                              </Link>
                              <Button
                                type="error"
                                size="small"
                                prefix={<DeleteIcon size={14} />}
                                onClick={() => handleDelete(technician._id, technician.name)}
                                disabled={loading}
                                title="Obriši tehničara"
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
            
            {/* Modern Pagination */}
            {filteredTechnicians.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Prikazano {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTechnicians.length)} od {filteredTechnicians.length} rezultata
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
    </div>
  );
};

export default TechniciansList;