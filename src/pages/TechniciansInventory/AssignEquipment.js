import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BoxIcon, PlusIcon, MinusIcon, UserIcon, SearchIcon } from '../../components/icons/SvgIcons';
import { toast } from '../../utils/toast';
import { techniciansAPI, equipmentAPI } from '../../services/api';
import { Button } from '../../components/ui/button-1';
import { cn } from '../../utils/cn';

const AssignEquipment = () => {
  const [technician, setTechnician] = useState(null);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [assignedEquipment, setAssignedEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' ili 'return'
  const [technicians, setTechnicians] = useState([]);
  // Dodajemo state za pretragu
  const [searchTerm, setSearchTerm] = useState('');
  const { id } = useParams();
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  useEffect(() => {
    fetchData();
    fetchTechnicians();
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [techResponse, equipmentResponse] = await Promise.all([
        techniciansAPI.getOne(id),
        equipmentAPI.getAll()
      ]);
      
      setTechnician(techResponse.data);
      
      // Razdvajanje opreme na onu koja je dostupna i onu koja je već zadužena kod tehničara
      const available = equipmentResponse.data.filter(item => item.location === 'magacin');
      const assigned = equipmentResponse.data.filter(item => item.location === `tehnicar-${id}`);
      
      setAvailableEquipment(available);
      setAssignedEquipment(assigned);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Došlo je do greške pri učitavanju podataka.');
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTechnicians = async () => {
    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
    }
  };
  
  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    if (location.startsWith('tehnicar-')) {
      const techId = location.split('-')[1];
      // Pronađi tehničara po ID-u
      const tech = technicians.find(t => t._id === techId);
      return tech ? `Tehničar: ${tech.username || tech.name}` : `Tehničar ID: ${techId}`;
    }
    return location;
  };
  
  const toggleSelectEquipment = (serialNumber) => {
    setSelectedEquipment(prev => {
      if (prev.includes(serialNumber)) {
        return prev.filter(sn => sn !== serialNumber);
      } else {
        return [...prev, serialNumber];
      }
    });
  };
  
  const handleAssignEquipment = async () => {
    if (selectedEquipment.length === 0) {
      toast.warning('Niste odabrali nijedan komad opreme!');
      return;
    }

    // OPTIMISTIC UPDATE - immediately move equipment from available to assigned
    const originalAvailable = [...availableEquipment];
    const originalAssigned = [...assignedEquipment];

    // Find selected equipment items and move them
    const equipmentToMove = availableEquipment.filter(item =>
      selectedEquipment.includes(item.serialNumber)
    );

    setAvailableEquipment(prev =>
      prev.filter(item => !selectedEquipment.includes(item.serialNumber))
    );

    setAssignedEquipment(prev => [
      ...prev,
      ...equipmentToMove.map(item => ({
        ...item,
        location: `tehnicar-${id}`
      }))
    ]);

    try {
      await techniciansAPI.assignEquipment(id, { serialNumbers: selectedEquipment });
      toast.success(`Uspešno ste zadužili ${selectedEquipment.length} komada opreme tehničaru!`);
      setSelectedEquipment([]);
      // Success - optimistic update already done
    } catch (error) {
      console.error('Greška pri zaduživanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri zaduživanju opreme!');

      // ROLLBACK - restore original data on error
      setAvailableEquipment(originalAvailable);
      setAssignedEquipment(originalAssigned);
    }
  };
  
  const handleReturnEquipment = async () => {
    if (selectedEquipment.length === 0) {
      toast.warning('Niste odabrali nijedan komad opreme!');
      return;
    }

    // OPTIMISTIC UPDATE - immediately move equipment from assigned back to available
    const originalAvailable = [...availableEquipment];
    const originalAssigned = [...assignedEquipment];

    // Find selected equipment items and move them back
    const equipmentToReturn = assignedEquipment.filter(item =>
      selectedEquipment.includes(item.serialNumber)
    );

    setAssignedEquipment(prev =>
      prev.filter(item => !selectedEquipment.includes(item.serialNumber))
    );

    setAvailableEquipment(prev => [
      ...prev,
      ...equipmentToReturn.map(item => ({
        ...item,
        location: 'magacin'
      }))
    ]);

    try {
      await techniciansAPI.returnEquipment(id, { serialNumbers: selectedEquipment });
      toast.success(`Uspešno ste razdužili ${selectedEquipment.length} komada opreme!`);
      setSelectedEquipment([]);
      // Success - optimistic update already done
    } catch (error) {
      console.error('Greška pri razduživanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri razduživanju opreme!');

      // ROLLBACK - restore original data on error
      setAvailableEquipment(originalAvailable);
      setAssignedEquipment(originalAssigned);
    }
  };
  
  const selectAll = () => {
    if (activeTab === 'assign') {
      setSelectedEquipment(filteredAvailableEquipment.map(item => item.serialNumber));
    } else {
      setSelectedEquipment(filteredAssignedEquipment.map(item => item.serialNumber));
    }
  };
  
  const deselectAll = () => {
    setSelectedEquipment([]);
  };
  
  // Funkcija za filtriranje opreme prema searchTerm-u
  const filteredAvailableEquipment = availableEquipment.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });
  
  const filteredAssignedEquipment = assignedEquipment.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });

  // Paginacija - trenutni elementi za prikaz
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAvailableItems = filteredAvailableEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const currentAssignedItems = filteredAssignedEquipment.slice(indexOfFirstItem, indexOfLastItem);

  // Ukupan broj stranica
  const totalAvailablePages = Math.ceil(filteredAvailableEquipment.length / itemsPerPage);
  const totalAssignedPages = Math.ceil(filteredAssignedEquipment.length / itemsPerPage);
  const totalPages = activeTab === 'assign' ? totalAvailablePages : totalAssignedPages;

  // Funkcija za promenu stranice
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  if (loading && !technician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg font-medium text-slate-600">Učitavanje...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <BoxIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Zaduženje/Razduženje opreme</h1>
              <p className="text-slate-600 mt-1">Upravljanje opremom tehničara</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button type="secondary" size="medium" prefix={<BackIcon size={16} />} asChild>
              <Link to={`/technicians/${id}`}>
                Nazad na detalje
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {technician && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <UserIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{technician.name}</h2>
              <p className="text-slate-600">Tehničar</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-6 bg-slate-100 rounded-lg p-4">
          <button 
            onClick={() => setActiveTab('assign')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'assign' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <PlusIcon size={16} />
            <span>Zaduži opremu</span>
          </button>
          <button 
            onClick={() => setActiveTab('return')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              activeTab === 'return' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <MinusIcon size={16} />
            <span>Razduži opremu</span>
          </button>
        </div>
      </div>
      
      {/* Main Equipment Table */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <BoxIcon size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {activeTab === 'assign' ? 'Oprema dostupna za zaduženje' : 'Oprema za razduženje'}
                </h3>
              </div>
              <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
                {activeTab === 'assign' ? filteredAvailableEquipment.length : filteredAssignedEquipment.length}
              </span>
            </div>

            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                className="h-9 w-full pl-10 pr-4 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                placeholder="Pretraži opremu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <Button type="secondary" size="small" onClick={selectAll}>
              Označi sve
            </Button>
            <Button type="secondary" size="small" onClick={deselectAll}>
              Poništi
            </Button>
            <div className="text-sm text-slate-600 ml-auto">
              Odabrano: <span className="font-semibold">{selectedEquipment.length}</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{ width: '80px' }}>Odaberi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opis</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serijski broj</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lokacija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeTab === 'assign' ? (
                filteredAvailableEquipment.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                      {searchTerm ? 'Nema rezultata za pretragu' : 'Nema dostupne opreme u magacinu'}
                    </td>
                  </tr>
                ) : (
                  currentAvailableItems.map((item) => (
                    <tr key={item.id || item.serialNumber}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        selectedEquipment.includes(item.serialNumber) ? "bg-blue-50" : ""
                      )}
                      onClick={() => toggleSelectEquipment(item.serialNumber)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(item.serialNumber)}
                          onChange={() => { }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.serialNumber}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          item.location === 'magacin' 
                            ? "bg-green-100 text-green-800" 
                            : "bg-blue-100 text-blue-800"
                        )}>
                          {translateLocation(item.location)}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredAssignedEquipment.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                      {searchTerm ? 'Nema rezultata za pretragu' : 'Tehničar nema zaduženu opremu'}
                    </td>
                  </tr>
                ) : (
                  currentAssignedItems.map((item) => (
                    <tr key={item.id || item.serialNumber}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        selectedEquipment.includes(item.serialNumber) ? "bg-blue-50" : ""
                      )}
                      onClick={() => toggleSelectEquipment(item.serialNumber)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(item.serialNumber)}
                          onChange={() => { }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.serialNumber}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          item.location === 'magacin' 
                            ? "bg-green-100 text-green-800" 
                            : "bg-blue-100 text-blue-800"
                        )}>
                          {translateLocation(item.location)}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {((activeTab === 'assign' && filteredAvailableEquipment.length > itemsPerPage) ||
          (activeTab === 'return' && filteredAssignedEquipment.length > itemsPerPage)) && (
          <div className="flex justify-center items-center space-x-2 p-6 border-t border-slate-200">
            <Button
              type="secondary"
              size="small"
              onClick={() => paginate(1)}
              disabled={currentPage === 1}
            >
              &laquo;
            </Button>

            <Button
              type="secondary"
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
                  type={currentPage === number ? "primary" : "secondary"}
                  size="small"
                  onClick={() => paginate(number)}
                >
                  {number}
                </Button>
              ))}

            <Button
              type="secondary"
              size="small"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &rsaquo;
            </Button>

            <Button
              type="secondary"
              size="small"
              onClick={() => paginate(totalPages)}
              disabled={currentPage === totalPages}
            >
              &raquo;
            </Button>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Odabrano: <span className="font-semibold text-slate-900">{selectedEquipment.length}</span> stavka
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'assign' ? (
                <Button 
                  type="primary" 
                  size="medium"
                  prefix={<PlusIcon size={16} />}
                  onClick={handleAssignEquipment}
                  disabled={loading || selectedEquipment.length === 0}
                >
                  Zaduži opremu
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  size="medium"
                  prefix={<MinusIcon size={16} />}
                  onClick={handleReturnEquipment}
                  disabled={loading || selectedEquipment.length === 0}
                >
                  Razduži opremu
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignEquipment;