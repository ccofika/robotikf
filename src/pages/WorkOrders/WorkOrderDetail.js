import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { BackIcon, SaveIcon, CheckIcon, ClockIcon, BanIcon, UserIcon, AlertIcon, HistoryIcon, ImageIcon, DeleteIcon, MaterialIcon, EquipmentIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { workOrdersAPI, techniciansAPI, userEquipmentAPI } from '../../services/api';
import { cn } from '../../utils/cn';
import axios from 'axios';

const WorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [workOrder, setWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    municipality: '',
    address: '',
    type: '',
    technicianId: '',
    technician2Id: '',
    details: '',
    comment: '',
    status: ''
  });
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userEquipment, setUserEquipment] = useState([]);
  const [userEquipmentHistory, setUserEquipmentHistory] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [images, setImages] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showFullImage, setShowFullImage] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [workOrderRes, techniciansRes] = await Promise.all([
          workOrdersAPI.getOne(id),
          techniciansAPI.getAll()
        ]);
        
        setWorkOrder(workOrderRes.data);
        setFormData({
          date: workOrderRes.data.date ? new Date(workOrderRes.data.date).toISOString().split('T')[0] : '',
          time: workOrderRes.data.time || '09:00',
          municipality: workOrderRes.data.municipality,
          address: workOrderRes.data.address,
          type: workOrderRes.data.type,
          technicianId: workOrderRes.data.technicianId?._id || workOrderRes.data.technicianId || '',
          technician2Id: workOrderRes.data.technician2Id?._id || workOrderRes.data.technician2Id || '',
          details: workOrderRes.data.details || '',
          comment: workOrderRes.data.comment || '',
          status: workOrderRes.data.status || 'nezavrsen'
        });
        setTechnicians(techniciansRes.data);
        
        // Postavi slike i materijale
        setImages(workOrderRes.data.images || []);
        setMaterials(workOrderRes.data.materials || []);

        const fetchUserEquipment = async () => {
          if (!workOrderRes.data.tisId) return;

          setLoadingEquipment(true);
          try {
            // Dohvati trenutno instaliranu opremu
            const userEqResponse = await userEquipmentAPI.getForUser(workOrderRes.data.tisId);
            setUserEquipment(userEqResponse.data);

            // Dohvati istoriju opreme
            const historyResponse = await userEquipmentAPI.getUserHistory(workOrderRes.data.tisId);
            setUserEquipmentHistory(historyResponse.data);
          } catch (err) {
            console.error('Error fetching user equipment:', err);
          } finally {
            setLoadingEquipment(false);
          }
        };

        fetchUserEquipment();
      } catch (err) {
        console.error('Greška pri učitavanju podataka:', err);
        setError('Greška pri učitavanju podataka. Pokušajte ponovo.');
        toast.error('Neuspešno učitavanje podataka!');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    setError('');
    
    try {
      const updatedData = {
        ...formData,
        technicianId: formData.technicianId || null,
        technician2Id: formData.technician2Id || null
      };

      const response = await workOrdersAPI.update(id, updatedData);
      setWorkOrder(response.data);
      toast.success('Radni nalog je uspešno ažuriran!');
    } catch (error) {
      console.error('Greška pri ažuriranju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje radnog naloga!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = async (status) => {
    setSaving(true);
    setError('');
    
    try {
      // Priprema podataka za slanje, konvertuj prazan string u null za oba technicianId polja
      const updatedData = { 
        ...formData,
        status,
        technicianId: formData.technicianId || null, // konvertuj prazan string u null
        technician2Id: formData.technician2Id || null // konvertuj prazan string u null
      };
      
      console.log('Sending data:', updatedData);
      const response = await workOrdersAPI.update(id, updatedData);
      console.log('Response:', response);
      
      setWorkOrder(response.data);
      setFormData(prev => ({ ...prev, status }));
      toast.success(`Status radnog naloga je promenjen na "${status === 'zavrsen' ? 'Završen' : 
        status === 'odlozen' ? 'Odložen' : 
        status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}"!`);
    } catch (error) {
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || 'Greška pri promeni statusa. Pokušajte ponovo.');
      toast.error('Neuspešna promena statusa!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUnassign = (field) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  // Funkcija za brisanje slike
  const handleImageDelete = async (imageUrl) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu sliku?')) {
      return;
    }

    setDeletingImage(true);
    try {
      await axios.delete(`${apiUrl}/api/workorders/${id}/images`, {
        data: { imageUrl }
      });

      toast.success('Slika je uspešno obrisana!');
      
      // Ukloni sliku iz lokalne liste
      setImages(images.filter(img => img !== imageUrl));
      
      // Refresh work order data
      const updatedWorkOrder = await workOrdersAPI.getOne(id);
      setImages(updatedWorkOrder.data.images || []);
    } catch (error) {
      console.error('Greška pri brisanju slike:', error);
      toast.error('Greška pri brisanju slike. Pokušajte ponovo.');
    } finally {
      setDeletingImage(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Učitavanje...</p>
        </div>
      </div>
    );
  }
  
  if (error && !workOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Detalji radnog naloga</h1>
            <Button
              type="secondary"
              size="small"
              prefix={<BackIcon size={16} />}
              onClick={() => {
                if (location.state?.fromUsersList) {
                  navigate(location.state.previousPath || '/users', {
                    state: { 
                      fromWorkOrderDetail: true, 
                      selectedUserId: location.state.selectedUserId 
                    }
                  });
                } else {
                  navigate('/work-orders');
                }
              }}
            >
              Povratak na listu
            </Button>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Detalji radnog naloga</h1>
          <Button
            type="secondary"
            size="small"
            prefix={<BackIcon size={16} />}
            onClick={() => {
              if (location.state?.fromUsersList) {
                navigate(location.state.previousPath || '/users', {
                  state: { 
                    fromWorkOrderDetail: true, 
                    selectedUserId: location.state.selectedUserId 
                  }
                });
              } else {
                navigate('/work-orders');
              }
            }}
          >
            Povratak na listu
          </Button>
        </div>
      </div>
      
      {/* Main Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        {/* Status Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className={cn(
              "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium",
              formData.status === 'zavrsen' && "bg-green-50 text-green-700 border border-green-200",
              formData.status === 'odlozen' && "bg-yellow-50 text-yellow-700 border border-yellow-200",
              formData.status === 'otkazan' && "bg-red-50 text-red-700 border border-red-200",
              formData.status === 'nezavrsen' && "bg-blue-50 text-blue-700 border border-blue-200"
            )}>
              {formData.status === 'zavrsen' ? 'Završen' : 
               formData.status === 'odlozen' ? 'Odložen' : 
               formData.status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}
            </div>
            <div className="flex items-center space-x-3 flex-wrap">
              <Button
                type={formData.status === 'zavrsen' ? 'primary' : 'secondary'}
                size="small"
                prefix={<CheckIcon size={16} />}
                onClick={() => handleStatusChange('zavrsen')}
                disabled={saving || formData.status === 'zavrsen'}
              >
                Završen
              </Button>
              <Button
                type={formData.status === 'nezavrsen' ? 'primary' : 'secondary'}
                size="small"
                prefix={<ClockIcon size={16} />}
                onClick={() => handleStatusChange('nezavrsen')}
                disabled={saving || formData.status === 'nezavrsen'}
              >
                Nezavršen
              </Button>
              <Button
                type={formData.status === 'odlozen' ? 'warning' : 'secondary'}
                size="small"
                prefix={<AlertIcon size={16} />}
                onClick={() => handleStatusChange('odlozen')}
                disabled={saving || formData.status === 'odlozen'}
              >
                Odložen
              </Button>
              <Button
                type={formData.status === 'otkazan' ? 'error' : 'secondary'}
                size="small"
                prefix={<BanIcon size={16} />}
                onClick={() => handleStatusChange('otkazan')}
                disabled={saving || formData.status === 'otkazan'}
              >
                Otkazan
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Images Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
            <ImageIcon size={20} />
            <span>Slike radnog naloga</span>
          </h3>
        </div>
        <div className="p-6">
          {images.length === 0 ? (
            <p className="text-slate-600 text-center py-8">Nema upload-ovanih slika za ovaj radni nalog</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((imageItem, index) => {
                // Podrška za stari i novi format
                const imageUrl = typeof imageItem === 'object' ? imageItem.url : imageItem;
                const originalName = typeof imageItem === 'object' ? imageItem.originalName : null;
                
                return (
                  <div key={index} className="relative group cursor-pointer">
                    <img 
                      src={imageUrl} 
                      alt={originalName || `Slika ${index + 1}`} 
                      className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:border-blue-300 transition-colors" 
                      onClick={() => setShowFullImage(imageUrl)}
                    />
                    {originalName && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg truncate">
                        {originalName}
                      </div>
                    )}
                    <button
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageDelete(imageUrl);
                      }}
                      title="Obriši sliku"
                      disabled={deletingImage}
                    >
                      <DeleteIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Materials Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
            <MaterialIcon size={20} />
            <span>Utrošeni materijali</span>
          </h3>
        </div>
        <div className="p-6">
          {materials.length === 0 ? (
            <p className="text-slate-600 text-center py-8">Nema utrošenih materijala za ovaj radni nalog</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((materialItem, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-900">
                      {materialItem.material?.type || 'Nepoznat materijal'}
                    </h4>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Količina: {materialItem.quantity}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p><strong>Tip:</strong> {materialItem.material?.type || 'N/A'}</p>
                    {materialItem.material?._id && (
                      <p><strong>ID:</strong> {materialItem.material._id}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Equipment Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
            <EquipmentIcon size={20} />
            <span>Oprema korisnika</span>
          </h3>
        </div>
        <div className="p-6">
          {loadingEquipment ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-600">Učitavanje opreme...</p>
            </div>
          ) : (
            <>
              {userEquipment.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Trenutno instalirana oprema:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opis</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serijski broj</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum instalacije</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {userEquipment.map(eq => (
                          <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-900">{eq.equipmentType}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{eq.equipmentDescription}</td>
                            <td className="px-4 py-3 text-sm font-mono text-slate-900 bg-slate-100 rounded px-2 py-1">{eq.serialNumber}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{new Date(eq.installedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 text-center py-8">Korisnik trenutno nema instaliranu opremu.</p>
              )}
              
              {/* Prikaži dugme za istoriju ako ima bilo kakve istorije opreme */}
              {userEquipmentHistory.length > 0 && (
                <div className="mt-6">
                  <Button
                    type="secondary"
                    size="small"
                    prefix={<HistoryIcon size={16} />}
                    onClick={() => setShowHistoryModal(true)}
                  >
                    Prikaži istoriju opreme
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Modal za prikaz istorije opreme */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">Istorija opreme korisnika</h3>
            </div>

            <div className="p-6">
              {userEquipmentHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tip</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opis</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serijski broj</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum instalacije</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum uklanjanja</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Stanje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {userEquipmentHistory.map(eq => (
                        <tr key={eq.id} className={cn(
                          "hover:bg-slate-50 transition-colors",
                          eq.status === 'removed' ? 'bg-red-50' : ''
                        )}>
                          <td className="px-4 py-3 text-sm text-slate-900">{eq.equipmentType}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{eq.equipmentDescription}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-900 bg-slate-100 rounded px-2 py-1">{eq.serialNumber}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full",
                              eq.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            )}>
                              {eq.status === 'active' ? 'Aktivno' : 'Uklonjeno'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{eq.installedAt ? new Date(eq.installedAt).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{eq.removedAt ? new Date(eq.removedAt).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3">
                            {!eq.condition && <span className="text-sm text-slate-400">-</span>}
                            {eq.condition === 'working' && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                                Ispravno
                              </span>
                            )}
                            {eq.condition === 'defective' && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                                Neispravno
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-600 text-center py-8">Nema istorije opreme za ovog korisnika.</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <Button
                type="primary"
                size="medium"
                onClick={() => setShowHistoryModal(false)}
              >
                Zatvori
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Dodatne informacije</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workOrder?.tisId && (
              <div>
                <label className="text-sm font-medium text-slate-600">TIS ID:</label>
                <p className="text-sm text-slate-900 mt-1">{workOrder.tisId}</p>
              </div>
            )}
            {workOrder?.userName && (
              <div>
                <label className="text-sm font-medium text-slate-600">Ime korisnika:</label>
                <p className="text-sm text-slate-900 mt-1">{workOrder.userName}</p>
              </div>
            )}
            {workOrder?.userPhone && (
              <div>
                <label className="text-sm font-medium text-slate-600">Telefon korisnika:</label>
                <p className="text-sm text-slate-900 mt-1">{workOrder.userPhone}</p>
              </div>
            )}
            {workOrder?.tisJobId && (
              <div>
                <label className="text-sm font-medium text-slate-600">TIS Job ID:</label>
                <p className="text-sm text-slate-900 mt-1">{workOrder.tisJobId}</p>
              </div>
            )}
            {workOrder?.technology && (
              <div>
                <label className="text-sm font-medium text-slate-600">Tehnologija:</label>
                <p className="text-sm text-slate-900 mt-1">{workOrder.technology}</p>
              </div>
            )}
            {workOrder?.additionalJobs && (
              <div>
                <label className="text-sm font-medium text-slate-600">Dodatni poslovi:</label>
                <p className="text-sm text-slate-900 mt-1">{workOrder.additionalJobs}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-600">Kreiran:</label>
              <p className="text-sm text-slate-900 mt-1">{workOrder?.createdAt ? new Date(workOrder.createdAt).toLocaleString('sr-RS') : 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Poslednja izmena:</label>
              <p className="text-sm text-slate-900 mt-1">{workOrder?.updatedAt ? new Date(workOrder.updatedAt).toLocaleString('sr-RS') : 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Verifikovan:</label>
              <p className={cn(
                "text-sm mt-1 font-medium",
                workOrder?.verified ? 'text-green-600' : 'text-red-600'
              )}>
                {workOrder?.verified ? 'Da' : 'Ne'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Postpone History */}
      {workOrder?.postponeHistory && workOrder.postponeHistory.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <HistoryIcon size={20} />
              <span>Istorija odlaganja</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {workOrder.postponeHistory.map((postponement, index) => (
                <div key={index} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-600">
                      {new Date(postponement.postponedAt).toLocaleString('sr-RS')}
                    </span>
                    <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                      Odlaganje #{index + 1}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-slate-700">
                      <strong>Sa:</strong> {new Date(postponement.fromDate).toLocaleDateString('sr-RS')} u {postponement.fromTime}
                    </div>
                    <div className="text-slate-700">
                      <strong>Na:</strong> {new Date(postponement.toDate).toLocaleDateString('sr-RS')} u {postponement.toTime}
                    </div>
                    <div className="text-slate-700">
                      <strong>Razlog:</strong> {postponement.comment}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancel History */}
      {workOrder?.cancelHistory && workOrder.cancelHistory.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <BanIcon size={20} />
              <span>Istorija otkazivanja</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {workOrder.cancelHistory.map((cancellation, index) => (
                <div key={index} className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-600">
                      {new Date(cancellation.canceledAt).toLocaleString('sr-RS')}
                    </span>
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                      Otkazivanje #{index + 1}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Razlog:</strong> {cancellation.comment}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        
      {/* Form */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Izmeni radni nalog</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
                  Datum:
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={saving}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-2">
                  Vreme:
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="municipality" className="block text-sm font-medium text-slate-700 mb-2">
                  Opština:
                </label>
                <input
                  type="text"
                  id="municipality"
                  name="municipality"
                  value={formData.municipality}
                  onChange={handleChange}
                  placeholder="Unesite opštinu"
                  disabled={saving}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
                  Adresa:
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Unesite adresu"
                  disabled={saving}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
                Tip instalacije:
              </label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Internet, IPTV, Telefon..."
                disabled={saving}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          
            <div>
              <label htmlFor="technicianId" className="block text-sm font-medium text-slate-700 mb-2">
                Prvi tehničar:
              </label>
              <div className="flex items-center space-x-3">
                <select
                  id="technicianId"
                  name="technicianId"
                  value={formData.technicianId}
                  onChange={handleChange}
                  disabled={saving}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Izaberite tehničara --</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech._id}>{tech.name}</option>
                  ))}
                </select>
                {formData.technicianId && (
                  <Button
                    type="error"
                    size="small"
                    prefix={<BanIcon size={16} />}
                    onClick={() => handleUnassign('technicianId')}
                    disabled={saving}
                  >
                    Poništi
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="technician2Id" className="block text-sm font-medium text-slate-700 mb-2">
                Drugi tehničar:
              </label>
              <div className="flex items-center space-x-3">
                <select
                  id="technician2Id"
                  name="technician2Id"
                  value={formData.technician2Id}
                  onChange={handleChange}
                  disabled={saving}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Izaberite tehničara --</option>
                  {technicians
                    .filter(tech => tech._id !== formData.technicianId)
                    .map(tech => (
                      <option key={tech._id} value={tech._id}>{tech.name}</option>
                    ))}
                </select>
                {formData.technician2Id && (
                  <Button
                    type="error"
                    size="small"
                    prefix={<BanIcon size={16} />}
                    onClick={() => handleUnassign('technician2Id')}
                    disabled={saving}
                  >
                    Poništi
                  </Button>
                )}
              </div>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-2">
                  Detalji:
                </label>
                <textarea
                  id="details"
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  placeholder="Detalji za tehničara"
                  disabled={saving}
                  rows="3"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                ></textarea>
              </div>
              
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">
                  Komentar:
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  placeholder="Dodatne napomene"
                  disabled={saving}
                  rows="3"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                ></textarea>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
              <Button
                type="secondary"
                size="medium"
                onClick={() => {
                  if (location.state?.fromUsersList) {
                    navigate(location.state.previousPath || '/users', {
                      state: { 
                        fromWorkOrderDetail: true, 
                        selectedUserId: location.state.selectedUserId 
                      }
                    });
                  } else {
                    navigate('/work-orders');
                  }
                }}
                disabled={saving}
              >
                Odustani
              </Button>
              <Button
                type="primary"
                size="medium"
                prefix={<SaveIcon size={16} />}
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {showFullImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setShowFullImage(null)}
        >
          <div 
            className="relative flex items-center justify-center max-w-[95vw] max-h-[95vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={showFullImage} 
              alt="Slika u punoj veličini" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{
                maxWidth: '95vw',
                maxHeight: '95vh',
                width: 'auto',
                height: 'auto'
              }}
            />
            <button 
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 backdrop-blur-sm transition-colors z-10" 
              onClick={() => setShowFullImage(null)}
              title="Zatvori sliku"
            >
              <DeleteIcon size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderDetail;