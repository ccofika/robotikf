import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BoxIcon, ToolsIcon, UserIcon, LockIcon, CheckIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';

const TechnicianDetail = () => {
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const { id } = useParams();
  
  // Pagination for equipment
  const [equipmentPage, setEquipmentPage] = useState(1);
  const equipmentPerPage = 10;
  
  // Pagination for materials
  const [materialsPage, setMaterialsPage] = useState(1);
  const materialsPerPage = 10;
  
  useEffect(() => {
    fetchTechnicianData();
  }, [id]);
  
  const fetchTechnicianData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getOne(id);
      setTechnician(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
      setError('Tehničar nije pronađen ili je došlo do greške pri učitavanju.');
      toast.error('Greška pri učitavanju tehničara!');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validacija
    if (newPassword !== confirmedPassword) {
      toast.error('Lozinke se ne podudaraju!');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 karaktera!');
      return;
    }
    
    try {
      // Poziv API-ja za promenu lozinke preko update endpointa
      await techniciansAPI.update(id, { password: newPassword });
      toast.success('Lozinka je uspešno promenjena!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmedPassword('');
    } catch (error) {
      console.error('Greška pri promeni lozinke:', error);
      toast.error('Neuspešna promena lozinke. Pokušajte ponovo.');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center space-x-3 text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Učitavanje tehničara...</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
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
                <h1 className="text-2xl font-bold text-slate-900">Detalji tehničara</h1>
                <p className="text-slate-600 mt-1">Pregled podataka tehničara</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/technicians">
                <Button 
                  type="secondary"
                  size="medium"
                  prefix={<BackIcon size={16} />}
                >
                  Povratak na listu
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      </div>
    );
  }
  
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
              <h1 className="text-2xl font-bold text-slate-900">Detalji tehničara</h1>
              <p className="text-slate-600 mt-1">Pregled podataka tehničara</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/technicians">
              <Button 
                type="secondary"
                size="medium"
                prefix={<BackIcon size={16} />}
              >
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Technician Profile Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-xl">
              <UserIcon size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-2">{technician.name}</h2>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">ID:</span> {technician.id}</p>
                <p><span className="font-medium">Dodat:</span> {new Date(technician.createdAt).toLocaleDateString('sr-RS')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                type="tertiary"
                size="medium"
                onClick={() => setShowPasswordModal(true)}
                prefix={<LockIcon size={16} />}
              >
                Promeni lozinku
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Equipment Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BoxIcon size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Zadužena oprema</h2>
            </div>
            <Link to={`/technicians/${id}/assign-equipment`}>
              <Button 
                type="primary"
                size="medium"
                prefix={<BoxIcon size={16} />}
              >
                Zaduži/razduži opremu
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Kategorija
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Opis
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Serijski broj
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const equipmentItems = technician.equipment || [];
                const startIndex = (equipmentPage - 1) * equipmentPerPage;
                const endIndex = startIndex + equipmentPerPage;
                const currentEquipmentItems = equipmentItems.slice(startIndex, endIndex);
                
                if (equipmentItems.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <BoxIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema zadužene opreme</p>
                          <p className="text-xs">Dodajte opremu koristeći dugme iznad</p>
                        </div>
                      </td>
                    </tr>
                  );
                }
                
                return currentEquipmentItems.map((item, index) => (
                  <tr key={item.serialNumber} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                      {item.serialNumber}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        type={item.status === 'available' ? 'secondary' : item.status === 'assigned' ? 'primary' : 'tertiary'}
                        size="small"
                        className="text-xs capitalize"
                      >
                        {item.status === 'available' ? 'Dostupno' : 
                         item.status === 'assigned' ? 'Zaduženo' :
                         item.status === 'installed' ? 'Instalirano' :
                         item.status === 'defective' ? 'Oštećeno' : item.status}
                      </Button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Equipment Pagination */}
        {technician.equipment && technician.equipment.length > equipmentPerPage && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Prikazano {((equipmentPage - 1) * equipmentPerPage) + 1} - {Math.min(equipmentPage * equipmentPerPage, technician.equipment.length)} od {technician.equipment.length} stavki
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(1)}
                  disabled={equipmentPage === 1}
                >
                  &laquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(equipmentPage - 1)}
                  disabled={equipmentPage === 1}
                >
                  &lsaquo;
                </Button>
                
                {Array.from({ length: Math.ceil(technician.equipment.length / equipmentPerPage) }, (_, i) => i + 1)
                  .filter(number => {
                    const totalPages = Math.ceil(technician.equipment.length / equipmentPerPage);
                    return (
                      number === 1 ||
                      number === totalPages ||
                      Math.abs(number - equipmentPage) <= 1
                    );
                  })
                  .map(number => (
                    <Button
                      key={number}
                      type={equipmentPage === number ? "primary" : "tertiary"}
                      size="small"
                      onClick={() => setEquipmentPage(number)}
                    >
                      {number}
                    </Button>
                  ))}
                  
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(equipmentPage + 1)}
                  disabled={equipmentPage === Math.ceil(technician.equipment.length / equipmentPerPage)}
                >
                  &rsaquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setEquipmentPage(Math.ceil(technician.equipment.length / equipmentPerPage))}
                  disabled={equipmentPage === Math.ceil(technician.equipment.length / equipmentPerPage)}
                >
                  &raquo;
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Materials Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ToolsIcon size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Zaduženi materijali</h2>
            </div>
            <Link to={`/technicians/${id}/assign-material`}>
              <Button 
                type="primary"
                size="medium"
                prefix={<ToolsIcon size={16} />}
              >
                Zaduži/razduži materijal
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Vrsta
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Količina
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const materialItems = technician.materials || [];
                const startIndex = (materialsPage - 1) * materialsPerPage;
                const endIndex = startIndex + materialsPerPage;
                const currentMaterialItems = materialItems.slice(startIndex, endIndex);
                
                if (materialItems.length === 0) {
                  return (
                    <tr>
                      <td colSpan="2" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <ToolsIcon size={48} className="text-slate-300" />
                          <p className="text-sm font-medium">Nema zaduženih materijala</p>
                          <p className="text-xs">Dodajte materijale koristeći dugme iznad</p>
                        </div>
                      </td>
                    </tr>
                  );
                }
                
                return currentMaterialItems.map((item, index) => (
                  <tr key={index} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        type="secondary"
                        size="small"
                        className="text-xs min-w-[60px] justify-center"
                      >
                        {item.quantity}
                      </Button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Materials Pagination */}
        {technician.materials && technician.materials.length > materialsPerPage && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Prikazano {((materialsPage - 1) * materialsPerPage) + 1} - {Math.min(materialsPage * materialsPerPage, technician.materials.length)} od {technician.materials.length} stavki
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(1)}
                  disabled={materialsPage === 1}
                >
                  &laquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(materialsPage - 1)}
                  disabled={materialsPage === 1}
                >
                  &lsaquo;
                </Button>
                
                {Array.from({ length: Math.ceil(technician.materials.length / materialsPerPage) }, (_, i) => i + 1)
                  .filter(number => {
                    const totalPages = Math.ceil(technician.materials.length / materialsPerPage);
                    return (
                      number === 1 ||
                      number === totalPages ||
                      Math.abs(number - materialsPage) <= 1
                    );
                  })
                  .map(number => (
                    <Button
                      key={number}
                      type={materialsPage === number ? "primary" : "tertiary"}
                      size="small"
                      onClick={() => setMaterialsPage(number)}
                    >
                      {number}
                    </Button>
                  ))}
                  
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(materialsPage + 1)}
                  disabled={materialsPage === Math.ceil(technician.materials.length / materialsPerPage)}
                >
                  &rsaquo;
                </Button>
                <Button
                  type="tertiary"
                  size="small"
                  onClick={() => setMaterialsPage(Math.ceil(technician.materials.length / materialsPerPage))}
                  disabled={materialsPage === Math.ceil(technician.materials.length / materialsPerPage)}
                >
                  &raquo;
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Promeni lozinku za {technician.name}</h2>
              <Button
                type="tertiary"
                size="small"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmedPassword('');
                }}
                className="!p-2"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Nova lozinka:
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Unesite novu lozinku"
                    className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmedPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Potvrdite lozinku:
                  </label>
                  <input
                    type="password"
                    id="confirmedPassword"
                    value={confirmedPassword}
                    onChange={(e) => setConfirmedPassword(e.target.value)}
                    placeholder="Potvrdite novu lozinku"
                    className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                <Button 
                  type="secondary"
                  size="medium"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmedPassword('');
                  }}
                >
                  Odustani
                </Button>
                <Button 
                  type="primary"
                  size="medium"
                  onClick={handleChangePassword}
                  disabled={!newPassword || !confirmedPassword}
                  prefix={<CheckIcon size={16} />}
                >
                  Sačuvaj
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDetail;