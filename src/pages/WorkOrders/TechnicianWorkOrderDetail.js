// Radni nalog tehničara: ista struktura kao ranije (kartice jedna ispod druge), izgled Security dela
import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Phone, MapPin, Search, Trash2, Image as ImageIcon, X, Check, TriangleAlert, Save, RefreshCw, Clock } from 'lucide-react';
import { toast } from '../../utils/toast';
import { getTimLabel, getTimBadgeClasses } from '../../utils/tim';
import { userEquipmentAPI, materialsAPI, workOrdersAPI, techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useOverdueWorkOrders } from '../../context/OverdueWorkOrdersContext';
import { cx, Btn, State, Empty } from '../../security/sx/ui';
import { Panel, Note, KV } from '../../security/sx/layout';
import { Field, Input, Textarea, DateField, TimeField } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { Loading, LinkBtn } from '../../montaza/ui';
import EquipmentSelectionModal from './components/EquipmentSelectionModal';
import MaterialsModal from './components/MaterialsModal';
import UsedMaterialsList from './components/UsedMaterialsList';
import InstalledEquipmentList from './components/InstalledEquipmentList';
import './TechnicianWorkOrderDetail.mx.css';
import { localYmd } from '../../utils/localDate';

// Statusi naloga: isti natpisi, redosled i ikonice kao ranije; ton po vodiču (završen ok, nezavršen warn, odložen info, otkazan bad)
const STATUSES = [
  { key: 'zavrsen', label: 'Završen', tone: 'ok', icon: Check },
  { key: 'nezavrsen', label: 'Nezavršen', tone: 'warn', icon: Clock },
  { key: 'odlozen', label: 'Odložen', tone: 'info', icon: TriangleAlert },
  { key: 'otkazan', label: 'Otkazan', tone: 'bad', icon: X }
];

// Slika u punoj veličini (portal: koren strane je kontejner, pa fiksni sloj mora van njega)
function ImageViewer({ src, onClose }) {
  return createPortal(
    <div className="sx-portal mx-tnalog-viewer" onClick={onClose}>
      <img src={src} alt="Slika u punoj veličini" onClick={(e) => e.stopPropagation()} />
      <button type="button" className="mx-tnalog-viewer__x" onClick={onClose} aria-label="Zatvori"><X size={22} strokeWidth={1.8} /></button>
    </div>,
    document.body
  );
}

const TechnicianWorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { checkOverdueOrders } = useOverdueWorkOrders();
  const [workOrder, setWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    comment: '',
    status: '',
    postponeDate: null,
    postponeTime: '',
    postponeComment: '',
    cancelComment: ''
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [images, setImages] = useState([]);
  const [showPostponeForm, setShowPostponeForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [error, setError] = useState('');
  const [technicianEquipment, setTechnicianEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [equipmentOperation, setEquipmentOperation] = useState('add'); // 'add' ili 'remove'
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [userEquipment, setUserEquipment] = useState([]);
  const [removedEquipment, setRemovedEquipment] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showStatusActions, setShowStatusActions] = useState(false);
  const [showFullImage, setShowFullImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const mainRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [stableEquipment, setStableEquipment] = useState([]);

  // State za uklanjanje opreme
  const [removalEquipmentName, setRemovalEquipmentName] = useState('');
  const [removalEquipmentDescription, setRemovalEquipmentDescription] = useState('');
  const [removalSerialNumber, setRemovalSerialNumber] = useState('');
  const [loadingRemoval, setLoadingRemoval] = useState(false);

  // Dodaj state za provjeru da li je radni nalog završen
  const isWorkOrderCompleted = workOrder?.status === 'zavrsen';

  
  // Materijali state - optimizovano sa ref-ovima za stable input handling
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [usedMaterials, setUsedMaterials] = useState([]);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  
  // Ref-ovi za stable modal state
  const selectedMaterialRef = useRef('');
  const materialQuantityRef = useRef(''); // Početna vrednost prazna
  const [materialModalKey, setMaterialModalKey] = useState(0); // Za forsirano re-render

  // Dodajemo pull-to-refresh funkcionalnost
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e) => {
      touchEndY.current = e.touches[0].clientY;
      
      // Ako je korisnik na vrhu stranice i povlači prema dole
      if (window.scrollY === 0 && touchEndY.current - touchStartY.current > 70) {
        setRefreshing(true);
      }
    };
    
    const handleTouchEnd = () => {
      if (refreshing) {
        // Osvežavanje podataka
        fetchData();
        
        // Resetovanje stanja nakon 1s
        setTimeout(() => {
          setRefreshing(false);
        }, 1000);
      }
      
      touchStartY.current = 0;
      touchEndY.current = 0;
    };
    
    const mainElement = mainRef.current;
    if (mainElement && isMobile) {
      mainElement.addEventListener('touchstart', handleTouchStart);
      mainElement.addEventListener('touchmove', handleTouchMove);
      mainElement.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        mainElement.removeEventListener('touchstart', handleTouchStart);
        mainElement.removeEventListener('touchmove', handleTouchMove);
        mainElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [refreshing, isMobile]);
  
  const fetchData = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const response = await workOrdersAPI.getOne(id);
      
      // Proveriti da li radni nalog pripada ovom tehničaru (prvom ili drugom)
      const technicianId = response.data.technicianId?._id || response.data.technicianId;
      const technician2Id = response.data.technician2Id?._id || response.data.technician2Id;
      const userId = user._id?.toString() || user._id;
      
      if (technicianId !== userId && technician2Id !== userId) {
        setError('Nemate pristup ovom radnom nalogu');
        setLoading(false);
        return;
      }
      
      setWorkOrder(response.data);
      setFormData({
        comment: response.data.comment || '',
        status: response.data.status || 'nezavrsen',
        postponeDate: response.data.date ? new Date(response.data.date) : new Date(),
        postponeTime: response.data.time || '09:00'
      });
      
      setImages(response.data.images || []);
      setUsedMaterials(response.data.materials || []);

      const fetchUserEquipment = async () => {
        try {
          // Dohvati opremu trenutno instaliranu kod korisnika
          const userEqResponse = await workOrdersAPI.getUserEquipment(id);
          setUserEquipment(userEqResponse.data);

          // Dohvati uklonjenu opremu za ovaj radni nalog
          const removedEqResponse = await userEquipmentAPI.getRemovedForWorkOrder(id);
          setRemovedEquipment(removedEqResponse.data);

          // Dohvati opremu tehničara
          if (user?._id) {
            const techEqResponse = await techniciansAPI.getEquipment(user._id);
            setTechnicianEquipment(techEqResponse.data);
          }

          // Dohvati materijale koje tehničar poseduje
          const materialsResponse = await techniciansAPI.getMaterials(user._id);
          setAvailableMaterials(materialsResponse.data);
        } catch (err) {
          console.error('Greška pri dohvatanju opreme/materijala:', err);
          toast.error('Greška pri učitavanju opreme/materijala');
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
  
  useEffect(() => {
    fetchData();
  }, [id, user?._id]);

  const handleAddEquipment = async (equipmentId) => {
    console.log('handleAddEquipment called with equipmentId:', equipmentId);
    console.log('Current workOrder:', workOrder);
    console.log('Current user:', user);
    
    if (!equipmentId) {
      console.error('No equipment selected');
      toast.error('Morate odabrati opremu za dodavanje');
      return;
    }
    
    setLoadingEquipment(true);
    
    try {
      console.log('Sending request to add equipment with data:', {
        userId: workOrder.tisId,
        equipmentId: equipmentId,
        workOrderId: id,
        technicianId: user._id
      });
      
      const response = await userEquipmentAPI.add({
        userId: workOrder.tisId,
        equipmentId: equipmentId,
        workOrderId: id,
        technicianId: user._id
      });
      
      console.log('Add equipment response:', response);
      toast.success('Oprema je uspešno dodata korisniku!');
      
      // Ažuriraj prikaz opreme
      console.log('Fetching updated user equipment...');
      const userEqResponse = await workOrdersAPI.getUserEquipment(id);
      console.log('Updated user equipment:', userEqResponse.data);
      setUserEquipment(userEqResponse.data);
      
      // Ažuriraj opremu tehničara
      console.log('Fetching updated technician equipment...');
      const techEqResponse = await techniciansAPI.getEquipment(user._id);
      console.log('Updated technician equipment:', techEqResponse.data);
      setTechnicianEquipment(techEqResponse.data);
      
      // Reset forme
      setSelectedEquipment('');
      setShowEquipmentModal(false);
    } catch (error) {
      console.error('Greška pri dodavanju opreme:', error);
      console.error('Error response:', error.response?.data);
      
      // Poboljšana poruka o grešci
      const errorMessage = error.response?.data?.error || 'Neuspešno dodavanje opreme. Pokušajte ponovo.';
      toast.error(errorMessage);
    } finally {
      setLoadingEquipment(false);
    }
  };

  // Live search handler that triggers re-renders
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
  }, []);

  // Update stableEquipment when technicianEquipment changes
  useEffect(() => {
    console.log('=== UPDATING STABLE EQUIPMENT ===');
    console.log('TechnicianEquipment changed:', technicianEquipment);
    console.log('TechnicianEquipment length:', technicianEquipment.length);
    console.log('Current user ID:', user._id);
    
    if (technicianEquipment.length > 0) {
      // Filter equipment that belongs to this technician and is available for installation
      const availableEquipment = technicianEquipment.filter(
        equipment => {
          const belongsToTechnician = equipment.assignedTo === user._id;
          const isAssignedToTechnician = equipment.status === 'assigned';
          const notAssignedToUser = !equipment.assignedToUser;
          
          console.log(`Filtering in useEffect - ${equipment.serialNumber}:`, {
            belongsToTechnician,
            isAssignedToTechnician,
            notAssignedToUser,
            assignedTo: equipment.assignedTo,
            status: equipment.status,
            userIdComparison: `${equipment.assignedTo} === ${user._id}`,
            passes: belongsToTechnician && isAssignedToTechnician && notAssignedToUser
          });
          
          return belongsToTechnician && isAssignedToTechnician && notAssignedToUser;
        }
      );
      
      console.log('Setting stable equipment:', availableEquipment);
      console.log('Stable equipment count:', availableEquipment.length);
      setStableEquipment(availableEquipment);
    } else {
      console.log('No technician equipment, setting empty stable equipment');
      setStableEquipment([]);
    }
  }, [technicianEquipment, user._id]);

  // Separate filtering function that only runs when needed
  const getFilteredEquipment = useCallback(() => {
    console.log('=== FILTERING EQUIPMENT ===');
    const searchTermValue = searchTerm.toLowerCase().trim();
    console.log('Search term:', searchTermValue);
    console.log('Stable equipment before filtering:', stableEquipment);
    console.log('Stable equipment count:', stableEquipment.length);
    
    // Start with equipment that's available for installation
    const availableEquipment = stableEquipment.filter(
      equipment => {
        const belongsToTechnician = equipment.assignedTo === user._id;
        const isAssignedToTechnician = equipment.status === 'assigned';
        const notAssignedToUser = !equipment.assignedToUser;
        
        console.log(`Filtering in getFilteredEquipment - ${equipment.serialNumber}:`, {
          belongsToTechnician,
          isAssignedToTechnician,
          notAssignedToUser,
          assignedTo: equipment.assignedTo,
          status: equipment.status,
          userIdComparison: `${equipment.assignedTo} === ${user._id}`,
          passes: belongsToTechnician && isAssignedToTechnician && notAssignedToUser
        });
        
        return belongsToTechnician && isAssignedToTechnician && notAssignedToUser;
      }
    );
    
    console.log('Available equipment after first filter:', availableEquipment);
    console.log('Available equipment count after first filter:', availableEquipment.length);
    
    if (!searchTermValue) {
      console.log('No search term, returning all available equipment');
      return availableEquipment;
    }
    
    const searchFiltered = availableEquipment.filter(equipment => 
      equipment.serialNumber?.toLowerCase().includes(searchTermValue) ||
      equipment.description?.toLowerCase().includes(searchTermValue) ||
      equipment.category?.toLowerCase().includes(searchTermValue)
    );
    
    console.log('Search filtered equipment:', searchFiltered);
    console.log('Search filtered count:', searchFiltered.length);
    
    return searchFiltered;
  }, [stableEquipment, user._id, searchTerm]);

  // Stable modal close function
  const closeModal = useCallback(() => {
    setShowEquipmentModal(false);
    setSearchTerm('');
  }, []);

  // Handle search button click - only filter when button is clicked
  const performSearch = useCallback(() => {
    setIsSearching(true);
    // Force re-render with new filtered results
    setTimeout(() => {
      setIsSearching(false);
    }, 100);
  }, []);

  // Optimized equipment selection with stable reference
  const selectEquipment = useCallback((equipmentId) => {
    const equipment = stableEquipment.find(eq => eq._id === equipmentId);
    if (equipment) {
      closeModal();
      setTimeout(() => {
        handleAddEquipment(equipmentId);
      }, 50);
    }
  }, [stableEquipment, closeModal]);

  // Clear search function with focus maintenance
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dodati funkciju za otvaranje modala za izbor opreme:
  const openEquipmentModal = async () => {
    console.log('=== OPENING EQUIPMENT MODAL ===');
    console.log('Current user:', user);
    console.log('User ID:', user._id);
    
    // Refresh technician equipment data before showing modal
    try {
      // Fetch fresh equipment data
      console.log('Fetching equipment for technician:', user._id);
      const techEqResponse = await techniciansAPI.getEquipment(user._id);
      const freshEquipment = techEqResponse.data;
      
      console.log('Raw equipment data from API:', freshEquipment);
      console.log('Total equipment count:', freshEquipment.length);
      
      // Log each equipment item details
      freshEquipment.forEach((eq, index) => {
        console.log(`Equipment ${index + 1}:`, {
          id: eq._id,
          serialNumber: eq.serialNumber,
          description: eq.description,
          status: eq.status,
          location: eq.location,
          assignedTo: eq.assignedTo,
          assignedToUser: eq.assignedToUser
        });
      });
      
      // Filter equipment that belongs to this technician and is available for installation
      const availableEquipment = freshEquipment.filter(
        equipment => {
          const belongsToTechnician = equipment.assignedTo === user._id;
          const isAssignedToTechnician = equipment.status === 'assigned';
          const notAssignedToUser = !equipment.assignedToUser;
          
          console.log(`Filtering equipment ${equipment.serialNumber}:`, {
            belongsToTechnician,
            isAssignedToTechnician,
            notAssignedToUser,
            assignedTo: equipment.assignedTo,
            status: equipment.status,
            userIdComparison: `${equipment.assignedTo} === ${user._id}`,
            passes: belongsToTechnician && isAssignedToTechnician && notAssignedToUser
          });
          
          return belongsToTechnician && isAssignedToTechnician && notAssignedToUser;
        }
      );
      
      console.log('Filtered available equipment:', availableEquipment);
      console.log('Available equipment count:', availableEquipment.length);
      
      setTechnicianEquipment(freshEquipment);
      setStableEquipment(availableEquipment);
      
      console.log('Equipment state updated');
      console.log('Available equipment for modal:', availableEquipment.length, 'items');
    } catch (error) {
      console.error('Error refreshing equipment data:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Greška pri učitavanju opreme');
    }
    
    // Clear search input
    setSearchTerm('');
    
    // Show modal
    console.log('Opening modal with equipment count:', stableEquipment.length);
    setShowEquipmentModal(true);
  };

  const openRemoveEquipmentDialog = async (equipment) => {
    // Odmah ukloni opremu bez modal-a
    setLoadingEquipment(true);

    try {
      const response = await userEquipmentAPI.remove(equipment.id, {
        workOrderId: id,
        technicianId: user._id,
        isWorking: true, // Uvek ispravna oprema - vraća se tehničaru
        removalReason: 'Uklonjena oprema'
      });

      if (response.data) {
        toast.success('Oprema je uspešno uklonjena');
        // Odmah osvezi podatke
        fetchData();
      }
    } catch (error) {
      console.error('Greška pri uklanjanju opreme:', error);
      toast.error(error.response?.data?.error || 'Neuspešno uklanjanje opreme. Pokušajte ponovo.');
    } finally {
      setLoadingEquipment(false);
    }
  };


  // Funkcija za uklanjanje opreme sa novim formom
  const handleEquipmentRemoval = async () => {
    if (!removalEquipmentName.trim() || !removalEquipmentDescription.trim() || !removalSerialNumber.trim()) {
      toast.error('Morate popuniti naziv opreme, opis i serijski broj');
      return;
    }

    setLoadingRemoval(true);

    try {
      // Poziv backend API-ja za uklanjanje opreme
      const response = await userEquipmentAPI.removeBySerial({
        workOrderId: id,
        technicianId: user._id,
        equipmentName: removalEquipmentName,
        equipmentDescription: removalEquipmentDescription,
        serialNumber: removalSerialNumber
      });

      if (response.data && response.data.success) {
        toast.success('Oprema je uspešno uklonjena');

        // Resetuj formu
        setRemovalEquipmentName('');
        setRemovalEquipmentDescription('');
        setRemovalSerialNumber('');

        // Osvezi podatke odmah
        fetchData();
      }
    } catch (error) {
      console.error('Greška pri uklanjanju opreme:', error);
      toast.error(error.response?.data?.error || 'Neuspešno uklanjanje opreme. Pokušajte ponovo.');
    } finally {
      setLoadingRemoval(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Funkcija za kompresovanje slika
  const compressImage = (file, quality = 0.7, maxWidth = 1200, maxHeight = 1200) => {
    console.log(`🖼️ Početak kompresovanja slike: ${file.name}`);
    console.log(`📊 Originalna veličina: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        console.log(`📐 Originalne dimenzije: ${img.width}x${img.height}`);
        
        // Kalkulacija novih dimenzija zadržavajući proporcije
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        console.log(`🔧 Nove dimenzije: ${Math.round(width)}x${Math.round(height)}`);
        
        // Postavka canvas dimenzija
        canvas.width = width;
        canvas.height = height;
        
        // Crtanje slike na canvas sa anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Konvertovanje u blob sa specificiranim kvalitetom
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error('❌ Greška pri kompresovanju slike:', file.name);
              reject(new Error(`Neuspešno kompresovanje slike: ${file.name}`));
              return;
            }
            
            const compressionRatio = ((file.size - blob.size) / file.size * 100).toFixed(1);
            console.log(`✅ Kompresovanje završeno za: ${file.name}`);
            console.log(`📉 Nova veličina: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`🎯 Kompresija: ${compressionRatio}%`);
            
            // Kreiranje novog File objekta sa kompresovanom slikom
            // Za HEIC/HEIF fajlove, promeni ekstenziju u .jpg jer su već konvertovani u JPEG
            const originalExtension = file.name.toLowerCase().split('.').pop();
            let fileName = file.name;
            if (originalExtension === 'heic' || originalExtension === 'heif') {
              const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
              fileName = nameWithoutExtension + '.jpg';
              console.log(`🔄 HEIC/HEIF fajl konvertovan: ${file.name} → ${fileName}`);
            }

            const compressedFile = new File([blob], fileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        console.error('❌ Greška pri učitavanju slike za kompresovanje:', file.name);
        reject(new Error(`Neuspešno učitavanje slike: ${file.name}`));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Funkcija za kompresovanje više slika odjednom (paralelno za brže procesovanje)
  const compressMultipleImages = async (files) => {
    console.log(`🚀 Početak kompresovanja ${files.length} slika (paralelno)`);
    const startTime = Date.now();

    // Paralelno kompresovanje svih slika odjednom
    const compressionPromises = files.map(async (file, index) => {
      console.log(`\n📸 Kompresovanje slike ${index + 1}/${files.length}: ${file.name}`);

      try {
        // Dinamički kvalitet na osnovu veličine fajla
        let quality = 0.8;
        const fileSizeMB = file.size / 1024 / 1024;

        if (fileSizeMB > 10) {
          quality = 0.6; // Veća kompresija za veće fajlove (10-20MB)
        } else if (fileSizeMB > 20) {
          quality = 0.4; // Još veća kompresija za vrlo velike fajlove (20-30MB)
        } else if (fileSizeMB > 25) {
          quality = 0.3; // Maksimalna kompresija za ekstremno velike fajlove (25-30MB)
        }

        console.log(`🎛️ Primenjeni kvalitet kompresije: ${(quality * 100)}%`);

        const compressedFile = await compressImage(file, quality);
        return { success: true, file: compressedFile, originalName: file.name };

      } catch (error) {
        console.error(`❌ Neuspešno kompresovanje: ${file.name}`, error);
        // Vrati originalnu sliku ako kompresovanje ne uspe
        return { success: false, file: file, originalName: file.name };
      }
    });

    const results = await Promise.all(compressionPromises);

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    const compressedFiles = results.map(r => r.file);
    const successCount = results.filter(r => r.success).length;
    const failedCompressions = results.filter(r => !r.success).map(r => r.originalName);

    console.log(`\n🏁 Kompresovanje završeno za ${totalTime}s`);
    console.log(`✅ Uspešno kompresovano: ${successCount}/${files.length}`);

    if (failedCompressions.length > 0) {
      console.log(`⚠️ Neuspešno kompresovano: ${failedCompressions.join(', ')}`);
    }

    // Kalkulacija ukupne uštede
    const originalTotalSize = files.reduce((sum, file) => sum + file.size, 0);
    const compressedTotalSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSavings = ((originalTotalSize - compressedTotalSize) / originalTotalSize * 100).toFixed(1);

    console.log(`💾 Ukupna ušteda prostora: ${totalSavings}%`);
    console.log(`📊 Originalna ukupna veličina: ${(originalTotalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Kompresovana ukupna veličina: ${(compressedTotalSize / 1024 / 1024).toFixed(2)} MB`);

    return compressedFiles;
  };

  // Funkcija za kompresiju slika odmah nakon izbora
  const compressSelectedImages = async (validFiles, previews) => {
    console.log('\n🔄========== POČETAK KOMPRESIJE NAKON IZBORA ==========🔄');
    setUploadingImages(true); // Koristimo ovaj flag za indikator kompresije
    
    try {
      const compressedFiles = await compressMultipleImages(validFiles);
      
      // Ažuriraj previews sa kompresovanim fajlovima
      const updatedPreviews = previews.map((preview, index) => ({
        ...preview,
        file: compressedFiles[index],
        size: compressedFiles[index].size
      }));
      
      setImageFiles(compressedFiles);
      setImagePreviews(updatedPreviews);
      
      console.log('✅ Kompresija završena - slike su spremne za upload');
      toast.success(`Slike su kompresovane i spremne za upload!`);
      
    } catch (error) {
      console.error('❌ Greška pri kompresovanju:', error);
      toast.error('Greška pri kompresovanju slika');
      // Koristi originalne fajlove ako kompresija ne uspe
      setImageFiles(validFiles);
    } finally {
      setUploadingImages(false);
    }
    
    console.log('🏁========== KOMPRESIJA NAKON IZBORA ZAVRŠENA ==========🏁\n');
  };
  
  const handleDateChange = (date) => {
    // Validacija: maksimalno 2 dana unapred
    const currentTime = new Date();
    const maxAllowedDate = new Date(currentTime.getTime() + (48 * 60 * 60 * 1000));
    
    if (date > maxAllowedDate) {
      toast.error('Radni nalog ne može biti odložen za više od 48 sati. Otkažite radni nalog.');
      return;
    }
    
    setFormData(prev => ({ ...prev, postponeDate: date }));
  };

  // DatePicker handlers only needed for desktop now
  const handleDatePickerOpen = () => {
    // No special handling needed for desktop
  };

  const handleDatePickerClose = () => {
    // No special handling needed for desktop
  };
  
  // Funkcija za izvlačenje originalnog naziva fajla iz image objekta ili URL-a
  const extractOriginalFilename = (imageItem) => {
    try {
      // Novi format - objekat sa originalName propertijem
      if (typeof imageItem === 'object' && imageItem.originalName) {
        return imageItem.originalName.toLowerCase();
      }
      
      // Stari format - URL string (fallback za postojeće podatke)
      if (typeof imageItem === 'string') {
        // Ako je Cloudinary URL, izdvojimo poslednji deo
        if (imageItem.includes('cloudinary.com')) {
          const urlParts = imageItem.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          // Uklanjamo sve do poslednje tačke za ekstenziju
          const filename = lastPart.split('.')[0];
          // Uklanjamo timestamp ako postoji (format: timestamp-originalname)
          const cleanFilename = filename.replace(/^\d+-/, '');
          return cleanFilename.toLowerCase();
        }
        
        // Za obične URL-ove
        const urlParts = imageItem.split('/');
        const filename = urlParts[urlParts.length - 1];
        // Uklanjamo timestamp ako postoji (format: timestamp-originalname)
        const cleanFilename = filename.replace(/^\d+-/, '').split('.')[0];
        return cleanFilename.toLowerCase();
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting filename:', error);
      return '';
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    console.log('\n📸========== IZBOR SLIKA ==========📸');
    console.log(`📋 Broj odabranih fajlova: ${files.length}`);
    
    if (files.length === 0) {
      console.log('⚠️ Nisu odabrani fajlovi');
      return;
    }
    
    // Log informacija o svakom fajlu
    files.forEach((file, index) => {
      console.log(`📄 Fajl ${index + 1}: ${file.name}`);
      console.log(`📊 Veličina: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`🔍 Tip: ${file.type}`);
    });
    
    // Validacija tipa fajla i veličine
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'];
    const maxSize = 30 * 1024 * 1024; // 30MB
    const maxFiles = 10; // Maksimalno 10 slika odjednom
    
    if (files.length > maxFiles) {
      toast.error(`Možete odabrati maksimalno ${maxFiles} slika odjednom`);
      return;
    }
    
    const validFiles = [];
    const previews = [];
    const invalidFiles = [];
    
    // Izvlačimo originalne nazive postojećih slika
    const existingFilenames = images.map(imageItem => extractOriginalFilename(imageItem));
    
    files.forEach((file, index) => {
      // Validacija tipa fajla - proverava i MIME tip i ekstenziju
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const validExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif'];
      const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);

      if (!isValidType) {
        invalidFiles.push(`${file.name} - neispravna ekstenzija`);
        return;
      }
      
      // Validacija veličine fajla
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} - veća od 30MB`);
        return;
      }
      
      // Provera duplikata naziva fajla
      const filename = file.name.toLowerCase();
      const filenameWithoutExtension = filename.split('.')[0];
      
      // Proveravamo i pun naziv i naziv bez ekstenzije
      const isDuplicate = existingFilenames.some(existingName => 
        existingName === filenameWithoutExtension || 
        existingName === filename ||
        existingName.includes(filenameWithoutExtension)
      );
      
      if (isDuplicate) {
        invalidFiles.push(`${file.name} - slika vec postoji`);
        return;
      }
      
      // Provera duplikata među trenutno odabranim fajlovima
      if (validFiles.some(f => f.name.toLowerCase() === filename)) {
        invalidFiles.push(`${file.name} - duplikat u odabranim fajlovima`);
        return;
      }
      
      validFiles.push(file);
      
      // Kreiranje preview-a
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push({
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size
        });
        
        // Kada su svi preview-i spremni, ažuriraj state
        if (previews.length === validFiles.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Prikaži greške za neispravne fajlove
    if (invalidFiles.length > 0) {
      console.log(`❌ Neispravni fajlovi: ${invalidFiles.join(', ')}`);
      toast.error(`Sledeći fajlovi nisu validni:\n${invalidFiles.join('\n')}`);
    }
    
    // Prikaži uspešnu poruku
    if (validFiles.length > 0) {
      console.log(`✅ Validnih fajlova: ${validFiles.length}`);
      console.log(`📋 Imena validnih fajlova: ${validFiles.map(f => f.name).join(', ')}`);
      toast.success(`Odabrano ${validFiles.length} slika - kompresovanje u toku...`);
      
      // Započni kompresiju odmah nakon izbora
      compressSelectedImages(validFiles, previews);
    }
    
    // Resetuj progress
    setUploadProgress([]);
    
    console.log('🏁========== IZBOR SLIKA ZAVRŠEN ==========🏁\n');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    setError('');
    
    try {
      // Pripremi podatke za slanje
      const updatedData = { ...formData };
      
      // Dodajemo ID trenutnog tehničara
      updatedData.technicianId = user._id;
      
      // Ako je status odložen, MORA da imamo datum, vreme i komentar
      if (updatedData.status === 'odlozen') {
        if (!updatedData.postponeDate || !updatedData.postponeTime) {
          toast.error('Morate odabrati datum i vreme odlaganja');
          setSaving(false);
          return;
        }
        
        if (!updatedData.postponeComment || updatedData.postponeComment.trim() === '') {
          toast.error('Morate uneti razlog odlaganja radnog naloga');
          setSaving(false);
          return;
        }
        
        const formattedDate = localYmd(updatedData.postponeDate);
        updatedData.postponeDate = formattedDate;
        
        console.log('Sending postponement data:', {
          postponeDate: formattedDate,
          postponeTime: updatedData.postponeTime
        });
      }
      
      // Ako je status otkazan, MORA da imamo komentar
      if (updatedData.status === 'otkazan') {
        if (!updatedData.cancelComment || updatedData.cancelComment.trim() === '') {
          toast.error('Morate uneti razlog otkazivanja radnog naloga');
          setSaving(false);
          return;
        }
      }
      
      const response = await workOrdersAPI.updateByTechnician(id, updatedData);
      setWorkOrder(response.data);
      
      if (updatedData.status === 'odlozen') {
        toast.success('Radni nalog je uspešno odložen!');
        setShowPostponeForm(false); // Hide form after successful postponement
      } else if (updatedData.status === 'otkazan') {
        toast.success('Radni nalog je uspešno otkazan!');
        setShowCancelForm(false); // Hide form after successful cancellation
      } else {
        toast.success('Radni nalog je uspešno ažuriran!');
      }
      
      // Reset forme ako nisu potrebne
      if (updatedData.status !== 'odlozen') {
        setShowPostponeForm(false);
      }
      if (updatedData.status !== 'otkazan') {
        setShowCancelForm(false);
      }
    } catch (error) {
      console.error('Greška pri ažuriranju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje radnog naloga!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = async (status) => {
    // For postponed status, we need to submit the form with postponement data
    if (status === 'odlozen') {
      setShowPostponeForm(true);
      setShowCancelForm(false);
      setFormData(prev => ({ ...prev, status }));
      
      // Zatvaramo status akcije na mobilnim uređajima
      if (isMobile) {
        setShowStatusActions(false);
      }
      return; // Don't submit yet, let user choose date/time
    }
    
    // For canceled status, we need to submit the form with cancellation comment
    if (status === 'otkazan') {
      setShowCancelForm(true);
      setShowPostponeForm(false);
      setFormData(prev => ({ ...prev, status }));
      
      // Zatvaramo status akcije na mobilnim uređajima
      if (isMobile) {
        setShowStatusActions(false);
      }
      return; // Don't submit yet, let user enter cancellation reason
    }
    
    // For other statuses, submit immediately
    setFormData(prev => ({ ...prev, status }));
    setShowPostponeForm(false);
    setShowCancelForm(false);
    
    // Submit the status change
    setSaving(true);
    setError('');
    
    try {
      const updatedData = { 
        ...formData,
        status,
        technicianId: user._id
      };
      
      const response = await workOrdersAPI.updateByTechnician(id, updatedData);
      setWorkOrder(response.data);
      toast.success(`Status radnog naloga je promenjen na "${
        status === 'zavrsen' ? 'Završen' : 
        status === 'otkazan' ? 'Otkazan' : 'Nezavršen'
      }"!`);
      
      // Refresh overdue orders after status change (especially when completing orders)
      if (checkOverdueOrders) {
        checkOverdueOrders();
      }
    } catch (error) {
      console.error('Greška pri promeni statusa:', error);
      setError(error.response?.data?.error || 'Greška pri promeni statusa. Pokušajte ponovo.');
      toast.error('Neuspešna promena statusa!');
    } finally {
      setSaving(false);
    }
    
    // Zatvaramo status akcije na mobilnim uređajima
    if (isMobile) {
      setShowStatusActions(false);
    }
  };

  // Show postpone form if status is already 'odlozen' when component loads
  useEffect(() => {
    if (formData.status === 'odlozen') {
      setShowPostponeForm(true);
    } else if (formData.status === 'otkazan') {
      setShowCancelForm(true);
    }
  }, [formData.status]);
  
  const handleImageUpload = async () => {
    if (imageFiles.length === 0) {
      toast.error('Molimo izaberite slike');
      return;
    }

    console.log('\n🚀========== POČETAK UPLOAD PROCESA ==========🚀');
    console.log(`📋 Ukupno slika za upload: ${imageFiles.length}`);

    setUploadingImages(true);

    // Osveži listu slika pre upload-a da se uverim da je najnovija
    try {
      const response = await workOrdersAPI.getOne(id);
      const currentImages = response.data.images || [];
      setImages(currentImages);

      // Ponovo proverava duplikate sa najnovijom listom
      const existingFilenames = currentImages.map(imageItem => extractOriginalFilename(imageItem));

      const duplicateFiles = [];
      imageFiles.forEach(file => {
        const filename = file.name.toLowerCase();
        const filenameWithoutExtension = filename.split('.')[0];

        const isDuplicate = existingFilenames.some(existingName =>
          existingName === filenameWithoutExtension ||
          existingName === filename ||
          existingName.includes(filenameWithoutExtension)
        );

        if (isDuplicate) {
          duplicateFiles.push(file.name);
        }
      });

      if (duplicateFiles.length > 0) {
        toast.error(`Sledeće slike već postoje: ${duplicateFiles.join(', ')}`);
        setUploadingImages(false);
        return;
      }
    } catch (error) {
      console.error('Greška pri proveri duplikata:', error);
    }

    // KORAK 1: Slike su već kompresovane pri izboru
    console.log('\n📤========== KORAK 1: PRIPREMA ZA UPLOAD ==========📤');
    const compressedFiles = imageFiles; // Već kompresovane slike
    console.log('✅ Koriste se već kompresovane slike');

    // Inicijalizacija progress tracking-a
    const progressArray = compressedFiles.map(() => 0);
    setUploadProgress(progressArray);

    // KORAK 2: Paralelni upload kompresovanih slika
    console.log('\n📤========== KORAK 2: PARALELNI UPLOAD NA CLOUDINARY ==========📤');
    const successfulUploads = [];
    const failedUploads = [];

    // Funkcija za upload pojedinačne slike sa retry logikom
    const uploadSingleImage = async (file, index, retries = 2) => {
      const originalFileName = imageFiles[index].name;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Retry ${attempt}/${retries} za sliku: ${originalFileName}`);
          }

          console.log(`\n📤 Upload slike ${index + 1}/${compressedFiles.length}: ${originalFileName}`);
          console.log(`📊 Veličina za upload: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

          const formData = new FormData();
          formData.append('image', file);
          formData.append('technicianId', user._id);

          // Ažuriraj progress za trenutnu sliku - početak upload-a
          setUploadProgress(prev => {
            const newProgress = [...prev];
            newProgress[index] = 25;
            return newProgress;
          });

          console.log('🌐 Slanje na server...');
          const uploadStartTime = Date.now();

          const response = await workOrdersAPI.uploadImage(id, formData);

          const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
          console.log(`✅ Upload završen za ${uploadTime}s: ${originalFileName}`);
          console.log(`🔗 URL: ${response.data?.url || 'N/A'}`);

          // Završetak upload-a
          setUploadProgress(prev => {
            const newProgress = [...prev];
            newProgress[index] = 100;
            return newProgress;
          });

          return { success: true, fileName: originalFileName, url: response.data?.url };

        } catch (error) {
          console.error(`❌ Greška pri upload-u (pokušaj ${attempt + 1}/${retries + 1}): ${originalFileName}`, error.message);

          // Ako je poslednji pokušaj, označi kao neuspešan
          if (attempt === retries) {
            console.error('📋 Error details:', error.response?.data);
            setUploadProgress(prev => {
              const newProgress = [...prev];
              newProgress[index] = -1;
              return newProgress;
            });
            return { success: false, fileName: originalFileName, error: error.message };
          }

          // Sačekaj malo pre sledećeg pokušaja
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    };

    try {
      // Batch paralelni upload - 4 slike odjednom za optimalan balans
      const BATCH_SIZE = 4;
      const uploadedUrls = [];

      for (let i = 0; i < compressedFiles.length; i += BATCH_SIZE) {
        const batch = compressedFiles.slice(i, i + BATCH_SIZE);
        const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);

        console.log(`\n🔄 Upload batch-a ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(compressedFiles.length / BATCH_SIZE)}`);

        const batchResults = await Promise.allSettled(
          batch.map((file, batchIdx) => uploadSingleImage(file, batchIndices[batchIdx]))
        );

        batchResults.forEach((result, batchIdx) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successfulUploads.push(result.value.fileName);
            if (result.value.url) uploadedUrls.push(result.value.url);
          } else {
            const fileName = result.value?.fileName || imageFiles[batchIndices[batchIdx]].name;
            failedUploads.push(fileName);
          }
        });
      }

      // KORAK 3: Finalizacija i izveštavanje
      console.log('\n📊========== KORAK 3: FINALNI IZVEŠTAJ ==========📊');
      console.log(`✅ Uspešno uploadovano: ${successfulUploads.length}/${compressedFiles.length}`);
      console.log(`❌ Neuspešno uploadovano: ${failedUploads.length}/${compressedFiles.length}`);

      if (successfulUploads.length > 0) {
        console.log(`🎉 Uspešni upload-i: ${successfulUploads.join(', ')}`);
        toast.success(`Uspešno uploadovano ${successfulUploads.length} slika`);

        // Osveži listu slika samo ako ima uspešnih uploada
        console.log('🔄 Osvežavanje liste slika...');
        const response = await workOrdersAPI.getOne(id);
        const updatedImages = response.data.images || [];
        setImages(updatedImages);
        console.log(`📋 Nova lista slika: ${updatedImages.length} ukupno`);
      }

      if (failedUploads.length > 0) {
        console.log(`💥 Neuspešni upload-i: ${failedUploads.join(', ')}`);
        toast.error(`Neuspešan upload za ${failedUploads.length} slika: ${failedUploads.join(', ')}`);
      }

      // Reset polja za slike samo ako su sve slike uspešno uploadovane
      if (failedUploads.length === 0) {
        setImageFiles([]);
        setImagePreviews([]);
        document.getElementById('image-upload').value = '';
        console.log('🧹 Polja za slike su obrisana');
      }

      console.log('🏁========== UPLOAD PROCES ZAVRŠEN ==========🏁\n');

    } catch (error) {
      console.error('💥 Opšta greška pri upload-u slika:', error);
      console.error('📋 Error stack:', error.stack);
      toast.error('Neuspešan upload slika. Pokušajte ponovo.');
    } finally {
      setUploadingImages(false);
      setUploadProgress([]);
    }
  };
  
  const resetImageUpload = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setUploadProgress([]);
    document.getElementById('image-upload').value = '';
  };

  // Funkcija za brisanje slike
  const handleImageDelete = async (imageUrl) => {
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete ovu sliku?', tone: 'danger', confirmLabel: 'Obriši' }))) {
      return;
    }

    try {
      await workOrdersAPI.deleteImage(id, { imageUrl, technicianId: user._id });

      toast.success('Slika je uspešno obrisana!');
      
      // Ukloni sliku iz lokalne liste (radi sa novom i starom strukturom)
      setImages(images.filter(img => {
        // Novi format - objekat sa url propertijem
        if (typeof img === 'object' && img.url) {
          return img.url !== imageUrl;
        }
        // Stari format - direktno string URL
        return img !== imageUrl;
      }));
    } catch (error) {
      console.error('Greška pri brisanju slike:', error);
      toast.error('Greška pri brisanju slike. Pokušajte ponovo.');
    }
  };
  
  // Funkcija za poziv korisnika
  const callUser = () => {
    if (workOrder?.userPhone) {
      window.location.href = `tel:${workOrder.userPhone}`;
    }
  };
  
  // Funkcija za otvaranje lokacije u mapi
  const openInMaps = () => {
    if (workOrder?.address && workOrder?.municipality) {
      const address = `${workOrder.address}, ${workOrder.municipality}`;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank');
    }
  };
  
  // Funkcije za materijale - potpuno optimizovane sa ref-ovima
  const openMaterialsModal = useCallback(() => {
    selectedMaterialRef.current = '';
    materialQuantityRef.current = ''; // Postavlja na prazno
    setMaterialModalKey(prev => prev + 1); // Force refresh modal
    setShowMaterialsModal(true);
  }, []);
  
  const closeMaterialsModal = useCallback(() => {
    setShowMaterialsModal(false);
    selectedMaterialRef.current = '';
    materialQuantityRef.current = ''; // Postavlja na prazno
  }, []);
  

  
  const addMaterial = useCallback(async () => {
    const selectedMaterial = selectedMaterialRef.current;
    const materialQuantity = materialQuantityRef.current;
    
    // Poboljšana validacija - ne dozvoli 0 ili prazan materijal
    if (!selectedMaterial || !materialQuantity || materialQuantity === '' || materialQuantity <= 0) {
      toast.error('Morate odabrati materijal i uneti validnu količinu (veću od 0)');
      return;
    }
    
    // Proveri da li tehničar ima dovoljno materijala
    const selectedMaterialData = availableMaterials.find(mat => mat._id === selectedMaterial);
    if (!selectedMaterialData || selectedMaterialData.quantity < materialQuantity) {
      toast.error(`Nemate dovoljno materijala. Dostupno: ${selectedMaterialData?.quantity || 0}`);
      return;
    }
    
    const materialExists = usedMaterials.find(
      (mat) => mat.material._id === selectedMaterial || mat.material === selectedMaterial
    );
    
    if (materialExists) {
      // Proveri ukupnu količinu koju pokušava da koristi
      const totalQuantity = materialExists.quantity + materialQuantity;
      if (totalQuantity > selectedMaterialData.quantity) {
        toast.error(`Nemate dovoljno materijala. Dostupno: ${selectedMaterialData.quantity}, već koristite: ${materialExists.quantity}`);
        return;
      }
      toast.warning('Ovaj materijal je već dodat. Molimo ažurirajte postojeći unos.');
      return;
    }
    
    setLoadingMaterials(true);
    
    try {
      // Dodaj materijal u lokalnu listu
      const materialData = availableMaterials.find(mat => mat._id === selectedMaterial);
      const newMaterial = {
        material: materialData,
        quantity: materialQuantity
      };
      
      const updatedMaterials = [...usedMaterials, newMaterial];
      setUsedMaterials(updatedMaterials);
      
      // Čuvaj u bazi
      const materialsData = updatedMaterials.map(mat => ({
        material: mat.material._id || mat.material,
        quantity: mat.quantity
      }));
      
      await workOrdersAPI.updateUsedMaterials(id, { materials: materialsData, technicianId: user._id });
      
      // Osvežavanje podataka iz baze
      const response = await workOrdersAPI.getOne(id);
      setUsedMaterials(response.data.materials || []);
      
      // Osveži listu dostupnih materijala
      try {
        const materialsResponse = await techniciansAPI.getMaterials(user._id);
        setAvailableMaterials(materialsResponse.data);
      } catch (err) {
        console.error('Greška pri osvežavanju liste materijala:', err);
      }
      
      closeMaterialsModal();
      toast.success('Materijal je uspešno dodat!');
    } catch (error) {
      console.error('Greška pri dodavanju materijala:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju materijala');
      
      // Vraćamo na prethodnu listu u slučaju greške
      const response = await workOrdersAPI.getOne(id);
      setUsedMaterials(response.data.materials || []);
      
      // Osveži listu dostupnih materijala
      try {
        const materialsResponse = await techniciansAPI.getMaterials(user._id);
        setAvailableMaterials(materialsResponse.data);
      } catch (err) {
        console.error('Greška pri osvežavanju liste materijala:', err);
      }
    } finally {
      setLoadingMaterials(false);
    }
  }, [availableMaterials, usedMaterials, id, user._id, closeMaterialsModal]);
  
  const removeMaterial = useCallback(async (materialId) => {
    setLoadingMaterials(true);
    
    try {
      // Ukloni materijal iz lokalne liste
      const updatedMaterials = usedMaterials.filter(mat => 
        (mat.material._id || mat.material) !== materialId
      );
      
      // Ažuriraj lokalnu listu
      setUsedMaterials(updatedMaterials);
      
      // Čuvaj u bazi
      const materialsData = updatedMaterials.map(mat => ({
        material: mat.material._id || mat.material,
        quantity: mat.quantity
      }));
      
      await workOrdersAPI.updateUsedMaterials(id, { materials: materialsData, technicianId: user._id });
      
      // Osvežavanje podataka iz baze
      const response = await workOrdersAPI.getOne(id);
      setUsedMaterials(response.data.materials || []);
      
      // Osveži listu dostupnih materijala
      try {
        const materialsResponse = await techniciansAPI.getMaterials(user._id);
        setAvailableMaterials(materialsResponse.data);
      } catch (err) {
        console.error('Greška pri osvežavanju liste materijala:', err);
      }
      
      toast.success('Materijal je uspešno uklonjen!');
    } catch (error) {
      console.error('Greška pri uklanjanju materijala:', error);
      toast.error(error.response?.data?.error || 'Greška pri uklanjanju materijala');
      
      // Vraćamo na prethodnu listu u slučaju greške
      const response = await workOrdersAPI.getOne(id);
      setUsedMaterials(response.data.materials || []);
      
      // Osveži listu dostupnih materijala
      try {
        const materialsResponse = await techniciansAPI.getMaterials(user._id);
        setAvailableMaterials(materialsResponse.data);
      } catch (err) {
        console.error('Greška pri osvežavanju liste materijala:', err);
      }
    } finally {
      setLoadingMaterials(false);
    }
  }, [usedMaterials, id, user._id]);
  
  // Komponente su izdvojene u zasebne fajlove:
  // - EquipmentSelectionModal -> ./components/EquipmentSelectionModal.js
  // - MaterialsModal -> ./components/MaterialsModal.js
  // - UsedMaterialsList -> ./components/UsedMaterialsList.js  
  // - InstalledEquipmentList -> ./components/InstalledEquipmentList.js
  
  const status = STATUSES.find((s) => s.key === formData.status) || STATUSES[1];
  const req = <span className="mx-tnalog-req">*</span>;

  // Ista četiri dugmeta kao ranije: u traci na telefonu, u kartici na desktopu i u kartici izbora statusa
  const statusButtons = (
    <div className="mx-tnalog-status">
      {STATUSES.map((s) => (
        <Btn key={s.key} size="lg" variant={formData.status === s.key ? 'primary' : 'secondary'} icon={s.icon}
          onClick={() => handleStatusChange(s.key)} disabled={saving || isWorkOrderCompleted}>
          {s.label}
        </Btn>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="sx-page mx-tnalog" data-testid="page-my-work-order-detail">
        <Loading rows={5} h={72} text="Učitavanje radnog naloga..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sx-page mx-tnalog" data-testid="page-my-work-order-detail">
        <div className="mx-tnalog-top">
          <h1 className="sx-title mx-tnalog-top__title">Detalji radnog naloga</h1>
          <LinkBtn to="/my-work-orders" size="sm" icon={ArrowLeft}>Nazad</LinkBtn>
        </div>
        <Note tone="bad">{error}</Note>
      </div>
    );
  }

  return (
    <div className="sx-page mx-tnalog" data-testid="page-my-work-order-detail" ref={mainRef}>
      {/* Povlačenje za osvežavanje */}
      <div className={cx('mx-tnalog-pull', refreshing && 'is-on')}>
        <span className="mx-tnalog-pull__ic"><RefreshCw size={14} strokeWidth={1.9} aria-hidden="true" /></span>
        <span>Povucite za osvežavanje</span>
      </div>

      {/* Zaglavlje: naslov i stanje levo, Status i Nazad desno (jedan red, kao ranije) */}
      <div className="mx-tnalog-top">
        <div className="mx-tnalog-top__main">
          <span className="mx-tnalog-top__icon"><Package size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="mx-tnalog-top__titles">
            <h1 className="sx-title mx-tnalog-top__title">Radni nalog</h1>
            <State tone={status.tone} testId="work-order-status">{status.label}</State>
          </div>
        </div>
        <div className="mx-tnalog-top__acts">
          <Btn size="sm" variant={showStatusActions ? 'primary' : 'secondary'} onClick={() => setShowStatusActions(!showStatusActions)} data-testid="status-toggle">
            Status
          </Btn>
          <LinkBtn to="/my-work-orders" size="sm" icon={ArrowLeft} aria-label="Nazad">
            <span className="mx-tnalog-wide">Nazad</span>
          </LinkBtn>
        </div>
      </div>

      <div className="sx-stack mx-tnalog-cards">
        <Panel title="Informacije o korisniku">
          <div className="mx-tnalog-contact">
            {workOrder?.userPhone && <Btn variant="primary" icon={Phone} onClick={callUser}>Pozovi</Btn>}
            <Btn icon={MapPin} onClick={openInMaps}>Mapa</Btn>
          </div>
          <KV items={[
            { k: 'Korisnik', v: workOrder?.userName || 'Nije dostupno' },
            { k: 'Telefon', v: workOrder?.userPhone || 'Nije dostupno', mono: !!workOrder?.userPhone },
            workOrder?.customerEmail && { k: 'Email', v: workOrder.customerEmail },
            { k: 'TIS ID', v: workOrder?.tisId || 'Nije dostupno', mono: !!workOrder?.tisId }
          ]} />
        </Panel>

        <Panel title="Lokacija">
          <KV items={[
            { k: 'Opština', v: workOrder?.municipality },
            { k: 'Adresa', v: workOrder?.address },
            { k: 'Datum', v: new Date(workOrder?.date).toLocaleDateString('sr-RS'), mono: true },
            { k: 'Vreme', v: workOrder?.time || '09:00', mono: true }
          ]} />
        </Panel>

        <Panel title="Detalji instalacije">
          <KV items={[
            { k: 'Tip instalacije', v: workOrder?.type },
            { k: 'Tehnologija', v: workOrder?.technology || 'Nije definisana' },
            { k: 'Tim', v: <span className={cx('mx-tnalog-tim', getTimBadgeClasses(workOrder?.tim))}>{getTimLabel(workOrder?.tim)}</span> }
          ]} />
          {workOrder?.details && (
            <div className="mx-tnalog-details">
              <span className="sx-label">Detalji</span>
              <p className="mx-tnalog-text">{workOrder?.details}</p>
            </div>
          )}
        </Panel>

        {/* Razlog vraćanja radnog naloga */}
        {workOrder?.adminComment && (
          <Panel title="Razlog vraćanja radnog naloga" tone="bad">
            <p className="mx-tnalog-text is-bad">{workOrder.adminComment}</p>
            <p className="mx-tnalog-note is-bad">
              <strong>Napomena:</strong> Admin je vratio ovaj radni nalog na doradu. Molimo pročitajte razlog vraćanja i ispravite nedostajuće podatke pre ponovnog označavanja kao završen.
            </p>
          </Panel>
        )}

        <Panel title="Oprema korisnika">
          <InstalledEquipmentList
            userEquipment={userEquipment}
            openRemoveEquipmentDialog={openRemoveEquipmentDialog}
            isWorkOrderCompleted={isWorkOrderCompleted}
          />

          <div className="mx-tnalog-add">
            <h3 className="mx-tnalog-sub">Dodaj novu opremu:</h3>
            <div className="mx-tnalog-btncol">
              <Btn size="sm" icon={Search} onClick={openEquipmentModal} disabled={loadingEquipment || technicianEquipment.length === 0 || isWorkOrderCompleted}>
                Izaberi opremu
              </Btn>
              {selectedEquipment && (
                <Note>
                  {technicianEquipment.find(eq => eq.id === selectedEquipment)?.description} -
                  S/N: {technicianEquipment.find(eq => eq.id === selectedEquipment)?.serialNumber}
                </Note>
              )}
              <Btn variant="primary" onClick={() => handleAddEquipment(selectedEquipment)} disabled={!selectedEquipment || loadingEquipment || isWorkOrderCompleted} busy={loadingEquipment}>
                {loadingEquipment ? 'Dodavanje...' : 'Dodaj opremu'}
              </Btn>
            </div>
            {technicianEquipment.length === 0 && <Note tone="warn" className="mx-mt">Nemate dostupnu opremu u vašem inventaru.</Note>}
            {isWorkOrderCompleted && <Note tone="idle" className="mx-mt">Radni nalog je završen - uređivanje opreme nije moguće.</Note>}

            {/* Uklanjanje opreme */}
            <div className="mx-tnalog-sec">
              <h3 className="mx-tnalog-sub">Uklanjanje opreme:</h3>
              <p className="mx-tnalog-hint">Ovde možete ukloniti opremu koja je prethodno dodata kod korisnika.</p>
              <div className="mx-tnalog-fields">
                <Field label={<>Naziv opreme (kategorija): {req}</>} htmlFor="removalEquipmentName">
                  <Input id="removalEquipmentName" value={removalEquipmentName} onChange={(e) => setRemovalEquipmentName(e.target.value)}
                    placeholder="Unesite naziv opreme" disabled={loadingRemoval || isWorkOrderCompleted} />
                </Field>
                <Field label={<>Opis opreme: {req}</>} htmlFor="removalEquipmentDescription">
                  <Input id="removalEquipmentDescription" value={removalEquipmentDescription} onChange={(e) => setRemovalEquipmentDescription(e.target.value)}
                    placeholder="Unesite opis opreme" disabled={loadingRemoval || isWorkOrderCompleted} />
                </Field>
                <Field label={<>Serijski broj opreme: {req}</>} htmlFor="removalSerialNumber">
                  <Input id="removalSerialNumber" value={removalSerialNumber} onChange={(e) => setRemovalSerialNumber(e.target.value)}
                    placeholder="Unesite tačan serijski broj opreme" disabled={loadingRemoval || isWorkOrderCompleted} />
                </Field>
                <div className="mx-tnalog-btncol">
                  <Btn variant="danger" onClick={handleEquipmentRemoval} busy={loadingRemoval}
                    disabled={!removalEquipmentName.trim() || !removalEquipmentDescription.trim() || !removalSerialNumber.trim() || loadingRemoval || isWorkOrderCompleted}>
                    {loadingRemoval ? 'Uklanjanje...' : 'Ukloni opremu'}
                  </Btn>
                </div>
              </div>
              {isWorkOrderCompleted && <Note tone="idle" className="mx-mt">Radni nalog je završen - uklanjanje opreme nije moguće.</Note>}
            </div>
          </div>
        </Panel>

        {/* Uklonjena oprema */}
        {removedEquipment.length > 0 && (
          <Panel title="Uklonjena oprema (u ovom radnom nalogu)">
            <div className="mx-tnalog-list">
              {removedEquipment.map((equipment) => (
                <div key={equipment.id} className="mx-tnalog-li is-bad">
                  <div className="mx-tnalog-li__main">
                    <div className="mx-tnalog-li__head">
                      <b>{equipment.equipmentType}</b>
                      <State tone={equipment.condition === 'ispravna' ? 'ok' : 'bad'}>{equipment.condition === 'ispravna' ? 'Ispravna' : 'Neispravna'}</State>
                    </div>
                    <span>S/N: <span className="sx-mono">{equipment.serialNumber}</span></span>
                    {equipment.removedAt && (
                      <span>
                        Uklonjeno: {new Date(equipment.removedAt).toLocaleDateString('sr-RS')} u {new Date(equipment.removedAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <span className="mx-tnalog-li__mark"><Trash2 size={14} strokeWidth={1.9} aria-hidden="true" /></span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Materijali */}
        <UsedMaterialsList
          usedMaterials={usedMaterials}
          openMaterialsModal={openMaterialsModal}
          removeMaterial={removeMaterial}
          loadingMaterials={loadingMaterials}
          isWorkOrderCompleted={isWorkOrderCompleted}
        />

        {/* Slike */}
        <Panel title={<span className="mx-tnalog-ttl"><ImageIcon size={16} strokeWidth={1.9} aria-hidden="true" />Slike</span>}>
          <input
            type="file"
            id="image-upload"
            onChange={handleImageChange}
            accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
            multiple
            disabled={uploadingImages || isWorkOrderCompleted}
            className="sx-sr"
          />
          <label htmlFor="image-upload" className={cx('mx-tnalog-drop', (uploadingImages || isWorkOrderCompleted) && 'is-off')}>
            <ImageIcon size={24} strokeWidth={1.8} aria-hidden="true" />
            <b>{uploadingImages ? 'Upload u toku...' : 'Fotografiši ili izaberi slike'}</b>
            <span>Možete odabrati do 10 slika odjednom (max 30MB po slici)</span>
          </label>

          {(imagePreviews.length > 0 || uploadingImages) && (
            <div className="mx-tnalog-sec">
              <div className="mx-tnalog-subrow">
                <h4 className="mx-tnalog-sub">
                  {uploadingImages && imagePreviews.length === 0
                    ? 'Kompresovanje slika u toku...'
                    : `Odabrane slike (${imagePreviews.length})`}
                </h4>
                {!uploadingImages && (
                  <Btn size="sm" icon={X} onClick={resetImageUpload} disabled={uploadingImages}>Ukloni sve</Btn>
                )}
              </div>

              {uploadingImages && imagePreviews.length === 0 && (
                <div className="mx-tnalog-busy" role="status">
                  <span className="mx-tnalog-spin" aria-hidden="true" />
                  <b>Kompresovanje slika u toku...</b>
                  <span>Molimo sačekajte dok se slike pripravljaju za upload</span>
                </div>
              )}

              <div className="mx-tnalog-previews">
                {imagePreviews.map((preview, index) => (
                  <figure key={index} className="mx-tnalog-prev">
                    <div className="mx-tnalog-prev__img">
                      <img src={preview.preview} alt={`Preview ${index + 1}`} />
                      {uploadingImages && uploadProgress[index] !== undefined && (
                        <div className="mx-tnalog-prog">
                          {uploadProgress[index] === -1 ? (
                            <><TriangleAlert size={20} strokeWidth={1.9} aria-hidden="true" /><span>Greška</span></>
                          ) : uploadProgress[index] === 100 ? (
                            <><Check size={20} strokeWidth={2.2} aria-hidden="true" /><span>Uspešno</span></>
                          ) : (
                            <><span className="mx-tnalog-progress"><i style={{ width: `${uploadProgress[index]}%` }} /></span><span className="sx-mono">{uploadProgress[index]}%</span></>
                          )}
                        </div>
                      )}
                    </div>
                    <figcaption>
                      <b title={preview.name}>{preview.name}</b>
                      <span className="sx-mono">{(preview.size / 1024 / 1024).toFixed(2)} MB</span>
                    </figcaption>
                  </figure>
                ))}
              </div>

              <div className="mx-tnalog-center">
                <Btn variant="primary" icon={Save} onClick={handleImageUpload} disabled={uploadingImages}>
                  {uploadingImages
                    ? `Slanje... (${uploadProgress.filter(p => p === 100).length}/${imagePreviews.length})`
                    : `Sačuvaj sve slike (${imagePreviews.length})`}
                </Btn>
              </div>
            </div>
          )}

          <div className="mx-tnalog-gallery">
            {images.length === 0 ? (
              <Empty text="Nema dodatih slika" />
            ) : (
              <div className="mx-tnalog-images">
                {images.map((imageItem, index) => {
                  // Podrška za stari i novi format
                  const imageUrl = typeof imageItem === 'object' ? imageItem.url : imageItem;
                  const originalName = typeof imageItem === 'object' ? imageItem.originalName : null;
                  return (
                    <div key={index} className="mx-tnalog-img">
                      <button type="button" className="mx-tnalog-img__open" onClick={() => setShowFullImage(imageUrl)}>
                        <img src={imageUrl} alt={originalName || `Slika ${index + 1}`} />
                      </button>
                      {originalName && <span className="mx-tnalog-img__name">{originalName}</span>}
                      <button
                        type="button"
                        className="mx-tnalog-img__del"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageDelete(imageUrl);
                        }}
                        title="Obriši sliku"
                        disabled={isWorkOrderCompleted}
                      >
                        <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {isWorkOrderCompleted && <Note tone="idle" className="mx-mt">Radni nalog je završen - dodavanje/brisanje slika nije moguće.</Note>}
          </div>
        </Panel>

        {/* Komentar tehničara */}
        <Panel title="Komentar tehničara">
          <Textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            placeholder={isWorkOrderCompleted ? "Radni nalog je završen - komentar se ne može menjati" : "Unesite komentar o izvršenom poslu"}
            disabled={saving || isWorkOrderCompleted}
            rows={4}
            aria-label="Komentar tehničara"
          />
        </Panel>

        {isWorkOrderCompleted && (
          <Panel title="Informacije o završetku">
            <Note tone="ok">
              <b>Radni nalog je završen</b> - sva polja su samo za čitanje.
              Možete pregledati sve informacije, ali ne možete ih menjati.
            </Note>
          </Panel>
        )}

        {/* Desktop: kartica statusa */}
        {!isMobile && (
          <Panel title="Status radnog naloga">
            {statusButtons}
          </Panel>
        )}

        {showPostponeForm && (
          <Panel title="Odlaganje termina">
            <Note tone="info"><b>Napomena:</b> Radni nalog može biti odložen maksimalno 48 sati. Za duže odlaganje molimo otkažite radni nalog.</Note>
            <div className="mx-tnalog-postpone">
              <Field label="Novi datum:" htmlFor="postponeDate">
                <DateField
                  id="postponeDate"
                  value={formData.postponeDate ? localYmd(formData.postponeDate) : ''}
                  onChange={(ymd) => handleDateChange(new Date(ymd))}
                  min={localYmd()}
                  max={localYmd(new Date(Date.now() + (48 * 60 * 60 * 1000)))}
                  disabled={saving || isWorkOrderCompleted}
                />
              </Field>
              <Field label="Novo vreme:" htmlFor="postponeTime">
                <TimeField
                  id="postponeTime"
                  value={formData.postponeTime}
                  onChange={(v) => handleChange({ target: { name: 'postponeTime', value: v } })}
                  disabled={saving || isWorkOrderCompleted}
                />
              </Field>
              <Field label={<>Razlog odlaganja: {req}</>} htmlFor="postponeComment" wide>
                <Textarea
                  id="postponeComment"
                  name="postponeComment"
                  value={formData.postponeComment}
                  onChange={handleChange}
                  placeholder="Obavezno objasnite razlog odlaganja radnog naloga..."
                  required
                  rows={3}
                  disabled={saving || isWorkOrderCompleted}
                />
              </Field>
            </div>
          </Panel>
        )}

        {showCancelForm && (
          <Panel title="Otkazivanje radnog naloga">
            <Note tone="bad"><b>Napomena:</b> Molimo objasnite razlog otkazivanja radnog naloga.</Note>
            <Field label={<>Razlog otkazivanja: {req}</>} htmlFor="cancelComment" className="mx-mt">
              <Textarea
                id="cancelComment"
                name="cancelComment"
                value={formData.cancelComment}
                onChange={handleChange}
                placeholder="Obavezno objasnite razlog otkazivanja radnog naloga..."
                required
                rows={4}
                disabled={saving || isWorkOrderCompleted}
              />
            </Field>
          </Panel>
        )}

        {/* Izbor statusa */}
        <Panel title="Status radnog naloga" sub="Izaberite status radnog naloga" testId="status-selection">
          {statusButtons}
        </Panel>

        <form onSubmit={handleSubmit} className="mx-tnalog-save">
          <Btn type="submit" variant="primary" size="lg" icon={Save} disabled={saving || isWorkOrderCompleted} busy={saving} data-testid="save-work-order">
            {saving ? 'Čuvanje...' : isWorkOrderCompleted ? 'Završen radni nalog' : 'Sačuvaj'}
          </Btn>
        </form>
      </div>

      {/* Telefon (do 768 px): traka sa statusima uz donju ivicu, otvara je dugme Status (portal: van kontejnera strane) */}
      {isMobile && createPortal(
        <div className={cx('sx-portal mx-tnalog-bar', showStatusActions && 'is-open')} data-testid="status-bar">
          {statusButtons}
        </div>,
        document.body
      )}

      {/* Modal za pregled slike u punoj veličini */}
      {showFullImage && <ImageViewer src={showFullImage} onClose={() => setShowFullImage(null)} />}

      {/* Modal za izbor opreme */}
      <EquipmentSelectionModal
        showEquipmentModal={showEquipmentModal}
        closeModal={closeModal}
        stableEquipment={stableEquipment}
        getFilteredEquipment={getFilteredEquipment}
        searchTerm={searchTerm}
        searchInputRef={searchInputRef}
        handleSearchChange={handleSearchChange}
        clearSearch={clearSearch}
        isSearching={isSearching}
        selectEquipment={selectEquipment}
      />

      {/* Modal za dodavanje materijala */}
      <MaterialsModal
        showMaterialsModal={showMaterialsModal}
        materialModalKey={materialModalKey}
        selectedMaterialRef={selectedMaterialRef}
        materialQuantityRef={materialQuantityRef}
        availableMaterials={availableMaterials}
        closeMaterialsModal={closeMaterialsModal}
        addMaterial={addMaterial}
        loadingMaterials={loadingMaterials}
      />
    </div>
  );
};

export default TechnicianWorkOrderDetail;
