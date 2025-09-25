import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, EditIcon, DeleteIcon, RefreshIcon, EyeIcon, FilterIcon, BoxIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';

const MaterialsList = () => {
  // Prioritized loading states
  const [dashboardStats, setDashboardStats] = useState(null); // Prvi prioritet: statistike
  const [recentMaterials, setRecentMaterials] = useState([]); // Drugi prioritet: osnovni materijali
  const [allMaterials, setAllMaterials] = useState([]); // Treći prioritet: svi materijali

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(true);

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    quantity: true,
    actions: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Kombinovani materijali - koristi sve materijale ako su učitani, inače osnovne
  const materials = allLoading ? recentMaterials : allMaterials;
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    // Prvi prioritet: Učitaj dashboard statistike
    fetchDashboardStats();

    // Drugi prioritet: Učitaj osnovne materijale (prva stranica)
    setTimeout(() => {
      fetchRecentMaterials();
    }, 300);

    // Treći prioritet: Učitaj sve materijale u pozadini
    setTimeout(() => {
      fetchAllMaterials();
    }, 1000);
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
  
  // Prvi prioritet: Učitaj samo osnovne statistike
  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    setError('');

    try {
      // Učitaj samo osnovne informacije za statistike
      const response = await axios.get(`${apiUrl}/api/materials?stats=true`);
      const materials = response.data;

      const stats = {
        total: materials.length,
        outOfStock: materials.filter(item => item.quantity === 0).length,
        lowStock: materials.filter(item => item.quantity > 0 && item.quantity < 5).length
      };

      setDashboardStats(stats);
    } catch (error) {
      console.error('Greška pri učitavanju statistika:', error);
      setError('Greška pri učitavanju statistika.');
    } finally {
      setDashboardLoading(false);
    }
  };

  // Drugi prioritet: Učitaj osnovne materijale za prikaz
  const fetchRecentMaterials = async () => {
    setRecentLoading(true);

    try {
      // Učitaj samo prvu stranicu materijala
      const response = await axios.get(`${apiUrl}/api/materials?limit=40`);
      setRecentMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju osnovnih materijala:', error);
      setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje materijala!');
    } finally {
      setRecentLoading(false);
    }
  };

  // Treći prioritet: Učitaj sve materijale u pozadini
  const fetchAllMaterials = async () => {
    setAllLoading(true);

    try {
      const response = await axios.get(`${apiUrl}/api/materials`);
      setAllMaterials(response.data);

      // Ažuriraj statistike sa kompletnim podacima
      const stats = {
        total: response.data.length,
        outOfStock: response.data.filter(item => item.quantity === 0).length,
        lowStock: response.data.filter(item => item.quantity > 0 && item.quantity < 5).length
      };
      setDashboardStats(stats);
    } catch (error) {
      console.error('Greška pri učitavanju svih materijala:', error);
      // Ne prikazuj grešku ako su osnovni materijali već učitani
      if (recentMaterials.length === 0) {
        setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
        toast.error('Neuspešno učitavanje materijala!');
      }
    } finally {
      setAllLoading(false);
    }
  };

  // Refresh funkcija - zadržava kompatibilnost
  const fetchMaterials = async () => {
    setDashboardLoading(true);
    setRecentLoading(true);
    setAllLoading(true);

    await fetchDashboardStats();
    await fetchRecentMaterials();
    await fetchAllMaterials();
  };
  
  const handleDelete = async (id, type) => {
    if (window.confirm(`Da li ste sigurni da želite da obrišete materijal "${type}"?`)) {
      // OPTIMISTIC UPDATE - immediately remove from both lists
      const originalRecentMaterials = [...recentMaterials];
      const originalAllMaterials = [...allMaterials];

      setRecentMaterials(prev => prev.filter(mat => mat._id !== id));
      setAllMaterials(prev => prev.filter(mat => mat._id !== id));

      try {
        await axios.delete(`${apiUrl}/api/materials/${id}`);
        toast.success('Materijal je uspešno obrisan!');
        // Success - optimistic update already done
      } catch (error) {
        console.error('Greška pri brisanju materijala:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju materijala.';
        toast.error(errorMessage);

        // ROLLBACK - restore original data on error
        setRecentMaterials(originalRecentMaterials);
        setAllMaterials(originalAllMaterials);
      }
    }
  };
  
  // Filtriranje materijala
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const searchMatch = searchTerm === '' || 
                         material.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      return searchMatch;
    });
  }, [materials, searchTerm]);
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <BoxIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pregled materijala</h1>
              <p className="text-slate-600 mt-1">Upravljanje inventarom materijala</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/materials/add">
              <Button 
                type="primary"
                size="medium"
                prefix={<PlusIcon size={16} />}
              >
                Dodaj materijal
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
              <div className="p-2 bg-green-50 rounded-lg">
                <BoxIcon size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ukupno materijala</p>
                <h3 className="text-lg font-bold text-slate-900">{dashboardStats?.total || 0}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-lg font-bold">
                {dashboardStats?.outOfStock || 0}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Nema na stanju</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardStats?.total ?
                    Math.round((dashboardStats.outOfStock / dashboardStats.total) * 100) : 0}%
                </h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 text-yellow-700 rounded-lg font-bold">
                {dashboardStats?.lowStock || 0}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Malo na stanju</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardStats?.total ?
                    Math.round((dashboardStats.lowStock / dashboardStats.total) * 100) : 0}%
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
                  placeholder="Pretraži po nazivu materijala..."
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
                        type: 'Vrsta materijala',
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
                onClick={fetchMaterials}
                loading={dashboardLoading || recentLoading || allLoading}
                prefix={<RefreshIcon size={16} />}
              >
                Osveži
              </Button>
            </div>
          </div>
        </div>
        
        {(dashboardLoading || recentLoading) ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center space-x-3 text-slate-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="text-sm font-medium">Učitavanje materijala...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.type && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Vrsta materijala
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
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <BoxIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema rezultata za prikazivanje</p>
                          <p className="text-xs">Promenite filtere za pristup materijalima</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((material, index) => (
                      <tr key={material._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                        {visibleColumns.type && (
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {material.type}
                          </td>
                        )}
                        {visibleColumns.quantity && (
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <Button
                                type={material.quantity === 0 ? 'error' : material.quantity < 5 ? 'warning' : 'secondary'}
                                size="small"
                                className="text-xs min-w-[3rem]"
                              >
                                {material.quantity}
                              </Button>
                            </div>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Link to={`/materials/edit/${material._id}`}>
                                <Button
                                  type="tertiary"
                                  size="small"
                                  prefix={<EditIcon size={14} />}
                                >
                                  Izmeni
                                </Button>
                              </Link>
                              <Button
                                type="error"
                                size="small"
                                prefix={<DeleteIcon size={14} />}
                                onClick={() => handleDelete(material._id, material.type)}
                                disabled={dashboardLoading || recentLoading || allLoading}
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
            {filteredMaterials.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Prikazano {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredMaterials.length)} od {filteredMaterials.length} rezultata
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

export default MaterialsList;