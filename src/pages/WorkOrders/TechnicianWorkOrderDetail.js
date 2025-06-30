// Kompletna zamena za fajl: src/pages/WorkOrders/TechnicianWorkOrderDetail.js
import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BackIcon, SaveIcon, CheckIcon, ClockIcon, AlertIcon, CloseIcon, CalendarIcon, ImageIcon, DeleteIcon, SearchIcon, PhoneIcon, MapPinIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import { userEquipmentAPI, materialsAPI, workOrdersAPI, techniciansAPI } from '../../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './TechnicianWorkOrderDetail.css';

const TechnicianWorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [workOrder, setWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    comment: '',
    status: '',
    postponeDate: null,
    postponeTime: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [images, setImages] = useState([]);
  const [showPostponeForm, setShowPostponeForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [technicianEquipment, setTechnicianEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [equipmentOperation, setEquipmentOperation] = useState('add'); // 'add' ili 'remove'
  const [isEquipmentWorking, setIsEquipmentWorking] = useState(true);
  const [removalReason, setRemovalReason] = useState('');
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [equipmentToRemove, setEquipmentToRemove] = useState(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [userEquipment, setUserEquipment] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showStatusActions, setShowStatusActions] = useState(false);
  const [showFullImage, setShowFullImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const mainRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTermRef = useRef('');
  const [isSearching, setIsSearching] = useState(false);
  const [stableEquipment, setStableEquipment] = useState([]);
  
  // Materijali state
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [usedMaterials, setUsedMaterials] = useState([]);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState(1);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
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
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
      
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
          const userEqResponse = await axios.get(`${apiUrl}/api/workorders/${id}/user-equipment`);
          setUserEquipment(userEqResponse.data);

          // Dohvati opremu tehničara
          if (user?._id) {
            const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user._id}/equipment`);
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
      const userEqResponse = await axios.get(`${apiUrl}/api/workorders/${id}/user-equipment`);
      console.log('Updated user equipment:', userEqResponse.data);
      setUserEquipment(userEqResponse.data);
      
      // Ažuriraj opremu tehničara
      console.log('Fetching updated technician equipment...');
      const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user._id}/equipment`);
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

  // Pure input handler that doesn't cause re-renders
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    // Store in ref to avoid re-renders
    searchTermRef.current = value;
    // Just update the input value directly
    if (searchInputRef.current) {
      searchInputRef.current.value = value;
    }
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
    const searchTerm = searchTermRef.current.toLowerCase().trim();
    console.log('Search term:', searchTerm);
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
    
    if (!searchTerm) {
      console.log('No search term, returning all available equipment');
      return availableEquipment;
    }
    
    const searchFiltered = availableEquipment.filter(equipment => 
      equipment.serialNumber?.toLowerCase().includes(searchTerm) ||
      equipment.description?.toLowerCase().includes(searchTerm) ||
      equipment.category?.toLowerCase().includes(searchTerm)
    );
    
    console.log('Search filtered equipment:', searchFiltered);
    console.log('Search filtered count:', searchFiltered.length);
    
    return searchFiltered;
  }, [stableEquipment, user._id]);

  // Stable modal close function
  const closeModal = useCallback(() => {
    setShowEquipmentModal(false);
    searchTermRef.current = '';
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
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
    searchTermRef.current = '';
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.focus();
    }
    performSearch();
  }, [performSearch]);

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
      const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user._id}/equipment`);
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
    searchTermRef.current = '';
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    
    // Show modal
    console.log('Opening modal with equipment count:', stableEquipment.length);
    setShowEquipmentModal(true);
  };

  const openRemoveEquipmentDialog = (equipment) => {
    setEquipmentToRemove(equipment);
    setIsEquipmentWorking(true);
    setRemovalReason('');
  };

  const handleRemoveEquipment = async () => {
    if (!equipmentToRemove) {
      return;
    }

    setLoadingEquipment(true);

    try {
      const response = await userEquipmentAPI.remove(equipmentToRemove.id, {
        workOrderId: id,
        technicianId: user._id,
        isWorking: isEquipmentWorking,
        removalReason: removalReason
      });

      toast.success('Oprema je uspešno uklonjena od korisnika!');

      // Ažuriraj prikaz opreme
      const userEqResponse = await axios.get(`${apiUrl}/api/workorders/${id}/user-equipment`);
      setUserEquipment(userEqResponse.data);

      // Ažuriraj opremu tehničara ako je oprema ispravna
      if (isEquipmentWorking) {
        const techEqResponse = await axios.get(`${apiUrl}/api/technicians/${user._id}/equipment`);
        setTechnicianEquipment(techEqResponse.data);
      }

      // Reset forme
      setEquipmentToRemove(null);
      setRemovalReason('');
    } catch (error) {
      console.error('Greška pri uklanjanju opreme:', error);
      toast.error(error.response?.data?.error || 'Neuspešno uklanjanje opreme. Pokušajte ponovo.');
    } finally {
      setLoadingEquipment(false);
    }
  };

  const cancelRemoveEquipment = () => {
    setEquipmentToRemove(null);
    setIsEquipmentWorking(true);
    setRemovalReason('');
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, postponeDate: date }));
  };

  const handleDatePickerOpen = () => {
    if (isMobile) {
      const portal = document.getElementById('mobile-datepicker-portal');
      if (portal) {
        portal.classList.add('active');
      }
    }
  };

  const handleDatePickerClose = () => {
    if (isMobile) {
      const portal = document.getElementById('mobile-datepicker-portal');
      if (portal) {
        portal.classList.remove('active');
      }
    }
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validacija tipa fajla i veličine
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      toast.error('Dozvoljeni su samo JPG i PNG formati slika');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error('Slika ne sme biti veća od 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Prikaz preview-a slike
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    setError('');
    
    try {
      // Ako je status odložen, dodajemo datum i vreme odlaganja
      const updatedData = { ...formData };
      
      // Dodajemo ID trenutnog tehničara
      updatedData.technicianId = user._id;
      
      if (updatedData.status === 'odlozen' && updatedData.postponeDate) {
        const formattedDate = updatedData.postponeDate.toISOString().split('T')[0];
        updatedData.postponeDate = formattedDate;
      }
      
      const response = await axios.put(`${apiUrl}/api/workorders/${id}/technician-update`, updatedData);
      setWorkOrder(response.data);
      toast.success('Radni nalog je uspešno ažuriran!');
      
      // Reset postpone forme ako nije potrebna
      if (updatedData.status !== 'odlozen') {
        setShowPostponeForm(false);
      }
    } catch (error) {
      console.error('Greška pri ažuriranju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje radnog naloga!');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = (status) => {
    setFormData(prev => ({ ...prev, status }));
    
    if (status === 'odlozen') {
      setShowPostponeForm(true);
    } else {
      setShowPostponeForm(false);
    }
    
    // Zatvaramo status akcije na mobilnim uređajima
    if (isMobile) {
      setShowStatusActions(false);
    }
  };
  
  const handleImageUpload = async () => {
    if (!imageFile) {
      toast.error('Molimo izaberite sliku');
      return;
    }
    
    setUploadingImage(true);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('technicianId', user._id);
    
    try {
      const response = await axios.post(`${apiUrl}/api/workorders/${id}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Slika je uspešno dodata na Cloudinary!');
      console.log('Cloudinary URL:', response.data.imageUrl);
      
      // Ažuriranje liste slika
      setImages(response.data.workOrder.images || []);
      
      // Reset polja za sliku
      setImageFile(null);
      setImagePreview('');
      document.getElementById('image-upload').value = '';
    } catch (error) {
      console.error('Greška pri upload-u slike na Cloudinary:', error);
      toast.error(error.response?.data?.error || 'Neuspešan upload slike. Pokušajte ponovo.');
    } finally {
      setUploadingImage(false);
    }
  };
  
  const resetImageUpload = () => {
    setImageFile(null);
    setImagePreview('');
    document.getElementById('image-upload').value = '';
  };

  // Funkcija za brisanje slike
  const handleImageDelete = async (imageUrl) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu sliku?')) {
      return;
    }

    try {
      await axios.delete(`${apiUrl}/api/workorders/${id}/images`, {
        data: { imageUrl, technicianId: user._id }
      });

      toast.success('Slika je uspešno obrisana!');
      
      // Ukloni sliku iz lokalne liste
      setImages(images.filter(img => img !== imageUrl));
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
  
  // Funkcije za materijale
  const openMaterialsModal = () => {
    setShowMaterialsModal(true);
  };
  
  const closeMaterialsModal = () => {
    setShowMaterialsModal(false);
    setSelectedMaterial('');
    setMaterialQuantity(1);
  };
  
  const addMaterial = async () => {
    if (!selectedMaterial || materialQuantity <= 0) {
      toast.error('Morate odabrati materijal i uneti validnu količinu');
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
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
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
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
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
  };
  
  const removeMaterial = async (materialId) => {
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
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
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
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
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
  };
  

  
  // Completely rewritten Equipment Selection Modal with stable rendering
  const EquipmentSelectionModal = useCallback(() => {
    if (!showEquipmentModal) return null;
    
    console.log('=== RENDERING EQUIPMENT MODAL ===');
    
    // Get filtered results only when rendering, not during typing
    const filteredResults = getFilteredEquipment();
    const searchTerm = searchTermRef.current;
    const hasAvailableEquipment = stableEquipment && stableEquipment.length > 0;
    
    console.log('Modal rendering state:', {
      stableEquipmentLength: stableEquipment?.length || 0,
      hasAvailableEquipment,
      filteredResultsLength: filteredResults?.length || 0,
      searchTerm
    });
    
    console.log('Stable equipment in modal:', stableEquipment);
    console.log('Filtered results in modal:', filteredResults);

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content equipment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-section">
              <h3>Izbor opreme</h3>
              <button 
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Zatvori modal"
              >
                <CloseIcon />
              </button>
            </div>
            
            {hasAvailableEquipment && (
              <div className="search-section">
                <div className="search-input-container">
                  <SearchIcon className="search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Pretraži opremu..."
                    defaultValue=""
                    onChange={handleSearchChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        performSearch();
                      }
                    }}
                    className="search-input"
                    autoComplete="off"
                    autoFocus
                  />
                  {searchTermRef.current && (
                    <button 
                      className="clear-search-btn"
                      onClick={clearSearch}
                      aria-label="Obriši pretragu"
                      type="button"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
                
                <div className="search-actions">
                  <button 
                    className="search-button"
                    onClick={performSearch}
                    type="button"
                  >
                    Pretraži
                  </button>
                </div>
                
                {isSearching && (
                  <div className="search-loading">
                    <div className="search-spinner"></div>
                    <span>Pretražujem...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-body">
            {!hasAvailableEquipment ? (
              <div className="no-equipment-available">
                <div className="no-results-icon">
                  <AlertIcon />
                </div>
                <h4>Nema dostupne opreme</h4>
                <p>
                  Trenutno nemate dostupnu opremu za instalaciju. 
                  Molimo vas da prvo preuzmete opremu iz magacina.
                </p>
                <button 
                  className="btn btn-secondary"
                  onClick={closeModal}
                  type="button"
                >
                  Zatvori
                </button>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="equipment-grid">
                {filteredResults.map((equipment) => (
                  <div
                    key={`equipment-${equipment._id}-${equipment.serialNumber}`}
                    className="equipment-card"
                    onClick={() => selectEquipment(equipment._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectEquipment(equipment._id);
                      }
                    }}
                  >
                    <div className="equipment-card-header">
                      <div className="equipment-category">{equipment.category}</div>
                      <CheckIcon className="select-icon" />
                    </div>
                    <div className="equipment-card-body">
                      <div className="equipment-description">{equipment.description}</div>
                      <div className="equipment-serial">S/N: {equipment.serialNumber}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">
                  <SearchIcon />
                </div>
                <h4>Nema rezultata</h4>
                <p>
                  {searchTerm 
                    ? `Nema opreme koja odgovara pretrazi "${searchTerm}"`
                    : 'Nemate dostupnu opremu u inventaru'
                  }
                </p>
                {searchTerm && (
                  <button 
                    className="btn btn-secondary"
                    onClick={clearSearch}
                    type="button"
                  >
                    Obriši pretragu
                  </button>
                )}
              </div>
            )}
          </div>
          
          {hasAvailableEquipment && (
            <div className="modal-footer">
              <div className="results-count">
                {filteredResults.length} od {stableEquipment.length} stavki
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={closeModal}
                type="button"
              >
                Zatvori
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }, [showEquipmentModal, isSearching, getFilteredEquipment, closeModal, selectEquipment, clearSearch, performSearch, stableEquipment]);
  
  // Materials Modal Component - optimized to prevent unnecessary re-renders
  const MaterialsModal = useCallback(() => {
    if (!showMaterialsModal) return null;
    
    return (
      <div className="modal-overlay" onClick={closeMaterialsModal}>
        <div className="modal-content equipment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-section">
              <h3>Dodaj materijal</h3>
              <button 
                className="modal-close-btn"
                onClick={closeMaterialsModal}
                aria-label="Zatvori modal"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="material-select">Materijal:</label>
              <select
                id="material-select"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="form-select"
              >
                <option value="">-- Izaberite materijal --</option>
                {availableMaterials.map(material => (
                  <option key={material._id} value={material._id}>
                    {material.type} (dostupno: {material.quantity})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="material-quantity">Količina:</label>
              <input
                type="number"
                id="material-quantity"
                min="1"
                max={selectedMaterial ? (availableMaterials.find(mat => mat._id === selectedMaterial)?.quantity || 1) : 1}
                value={materialQuantity}
                onChange={(e) => {
                  const maxQuantity = selectedMaterial ? (availableMaterials.find(mat => mat._id === selectedMaterial)?.quantity || 1) : 1;
                  const inputValue = parseInt(e.target.value) || 1;
                  setMaterialQuantity(Math.min(inputValue, maxQuantity));
                }}
                className="form-input"
              />
              {selectedMaterial && (
                <small className="form-help">
                  Maksimalno dostupno: {availableMaterials.find(mat => mat._id === selectedMaterial)?.quantity || 0}
                </small>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={closeMaterialsModal}
              type="button"
            >
              Otkaži
            </button>
            <button 
              className="btn btn-primary" 
              onClick={addMaterial}
              disabled={!selectedMaterial || materialQuantity <= 0 || loadingMaterials}
              type="button"
            >
              {loadingMaterials ? 'Dodavanje...' : 'Dodaj materijal'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [showMaterialsModal, selectedMaterial, materialQuantity, availableMaterials, loadingMaterials]);
  
  // Komponenta za prikaz korišćenih materijala
  const UsedMaterialsList = () => {
    return (
      <div className="materials-section">
        <div className="card-header">
          <h3>Korišćeni materijali</h3>
          <button 
            className="btn btn-sm btn-primary"
            onClick={openMaterialsModal}
            type="button"
          >
            + Dodaj materijal
          </button>
        </div>
        
        {usedMaterials.length > 0 ? (
          <div className="technician-materials-list">
            {usedMaterials.map((item, index) => (
              <div key={index} className="material-item">
                <div className="material-info">
                  <div className="material-name">
                    {item.material?.type || item.material}
                  </div>
                  <div className="material-quantity">
                    Količina: {item.quantity}
                  </div>
                </div>
                <button
                  className="btn btn-icon remove-btn"
                  onClick={() => removeMaterial(item.material?._id || item.material)}
                  disabled={loadingMaterials}
                  type="button"
                >
                  <DeleteIcon />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-materials-message">
            Nema dodanih materijala
          </div>
        )}
      </div>
    );
  };
  
  // Komponenta za prikaz instalirane opreme
  const InstalledEquipmentList = () => {
    return (
      <div className="installed-equipment-section">
        <h4>Instalirana oprema:</h4>
        {userEquipment.length > 0 ? (
          <div className="installed-equipment-list">
            {userEquipment.map((equipment) => (
              <div key={equipment._id} className="installed-equipment-item">
                <div className="equipment-details">
                  <div className="equipment-name">{equipment.category} - {equipment.description}</div>
                  <div className="equipment-serial">S/N: {equipment.serialNumber}</div>
                </div>
                <button
                  className="btn btn-icon remove-btn"
                  onClick={() => openRemoveEquipmentDialog(equipment)}
                >
                  <DeleteIcon />
                  <span>Ukloni</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-equipment-message">Nema instalirane opreme</div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="technician-work-order-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Učitavanje radnog naloga...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="technician-work-order-detail fade-in">
        <div className="page-header">
          <h1 className="page-title">Detalji radnog naloga</h1>
          <Link to="/my-work-orders" className="btn btn-sm">
            <BackIcon /> Nazad
          </Link>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="technician-work-order-detail fade-in" ref={mainRef}>
      {/* Pull-to-refresh indikator */}
      <div className={`pull-refresh-indicator ${refreshing ? 'active' : ''}`}>
        <div className={`refresh-icon ${refreshing ? 'spin' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 21h5v-5"></path>
          </svg>
        </div>
        <span>Povucite za osvežavanje</span>
      </div>

      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Radni nalog</h1>
          <div className={`status-indicator status-${formData.status}`}>
            {formData.status === 'zavrsen' ? 'Završen' : 
             formData.status === 'odlozen' ? 'Odložen' :
             formData.status === 'otkazan' ? 'Otkazan' : 'Nezavršen'}
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`status-toggle-btn ${showStatusActions ? 'active' : ''}`}
            onClick={() => setShowStatusActions(!showStatusActions)}
          >
            Status
          </button>
          <Link to="/my-work-orders" className="btn btn-sm btn-back">
            <BackIcon />
          </Link>
        </div>
      </div>
      
      {/* Mobilni status panel */}
      {isMobile && (
        <div className={`mobile-status-panel ${showStatusActions ? 'show' : ''}`}>
          <div className="status-actions">
            <button
              className={`status-btn ${formData.status === 'zavrsen' ? 'active' : ''}`}
              onClick={() => handleStatusChange('zavrsen')}
              disabled={saving}
            >
              <CheckIcon /> Završen
            </button>
            <button
              className={`status-btn ${formData.status === 'nezavrsen' ? 'active' : ''}`}
              onClick={() => handleStatusChange('nezavrsen')}
              disabled={saving}
            >
              <ClockIcon /> Nezavršen
            </button>
            <button
              className={`status-btn ${formData.status === 'odlozen' ? 'active' : ''}`}
              onClick={() => handleStatusChange('odlozen')}
              disabled={saving}
            >
              <AlertIcon /> Odložen
            </button>
            <button
              className={`status-btn ${formData.status === 'otkazan' ? 'active' : ''}`}
              onClick={() => handleStatusChange('otkazan')}
              disabled={saving}
            >
              <CloseIcon /> Otkazan
            </button>
          </div>
        </div>
      )}
      
      <div className="work-order-layout">
        <div className="work-order-main">
          <div className="card user-info-card">
            <div className="card-header">
              <h2>Informacije o korisniku</h2>
            </div>
            <div className="user-contact-actions">
              {workOrder?.userPhone && (
                <button className="contact-action-btn call-btn" onClick={callUser}>
                  <PhoneIcon /> Pozovi
                </button>
              )}
              <button className="contact-action-btn map-btn" onClick={openInMaps}>
                <MapPinIcon /> Mapa
              </button>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <label>Korisnik:</label>
                <p>{workOrder?.userName || 'Nije dostupno'}</p>
              </div>
              <div className="detail-item">
                <label>Telefon:</label>
                <p>{workOrder?.userPhone || 'Nije dostupno'}</p>
              </div>
              <div className="detail-item">
                <label>TIS ID:</label>
                <p>{workOrder?.tisId || 'Nije dostupno'}</p>
              </div>
            </div>
          </div>
          
          <div className="card location-card">
            <div className="card-header">
              <h2>Lokacija</h2>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <label>Opština:</label>
                <p>{workOrder?.municipality}</p>
              </div>
              <div className="detail-item">
                <label>Adresa:</label>
                <p>{workOrder?.address}</p>
              </div>
              <div className="detail-item">
                <label>Datum:</label>
                <p>{new Date(workOrder?.date).toLocaleDateString('sr-RS')}</p>
              </div>
              <div className="detail-item">
                <label>Vreme:</label>
                <p>{workOrder?.time || '09:00'}</p>
              </div>
            </div>
          </div>
          
          <div className="card installation-card">
            <div className="card-header">
              <h2>Detalji instalacije</h2>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <label>Tip instalacije:</label>
                <p>{workOrder?.type}</p>
              </div>
              <div className="detail-item">
                <label>Tehnologija:</label>
                <p>{workOrder?.technology || 'Nije definisana'}</p>
              </div>
              {workOrder?.details && (
                <div className="detail-item full-width">
                  <label>Detalji:</label>
                  <p className="details-text">{workOrder?.details}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="card equipment-card">
            <div className="card-header">
              <h2>Oprema korisnika</h2>
            </div>
            
            <InstalledEquipmentList />

            <div className="equipment-form">
              <h3>Dodaj novu opremu:</h3>

              <div className="equipment-selection">
                <button
                  type="button"
                  className="btn btn-secondary select-equipment-btn"
                  onClick={openEquipmentModal}
                  disabled={loadingEquipment || technicianEquipment.length === 0}
                >
                  <SearchIcon /> Izaberi opremu
                </button>
                
                {selectedEquipment && (
                  <div className="selected-equipment-info">
                    {technicianEquipment.find(eq => eq.id === selectedEquipment)?.description} - 
                    S/N: {technicianEquipment.find(eq => eq.id === selectedEquipment)?.serialNumber}
                  </div>
                )}
                
                <button
                  type="button"
                  className="btn btn-primary add-equipment-btn"
                  onClick={() => handleAddEquipment(selectedEquipment)}
                  disabled={!selectedEquipment || loadingEquipment}
                >
                  {loadingEquipment ? 'Dodavanje...' : 'Dodaj opremu'}
                </button>
              </div>

              {technicianEquipment.length === 0 && (
                <p className="warning-message">
                  Nemate dostupnu opremu u vašem inventaru.
                </p>
              )}
            </div>
          </div>
          
          <div className="card materials-card">
            <UsedMaterialsList />
          </div>
          
          <div className="card images-card">
            <div className="card-header">
              <h2><ImageIcon /> Slike</h2>
            </div>
            <div className="card-body">
              <div className="image-upload-section">
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="image-upload"
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png"
                    disabled={uploadingImage}
                    className="hidden-upload"
                  />
                  <label htmlFor="image-upload" className="upload-label">
                    <ImageIcon />
                    <span>Fotografiši ili izaberi sliku</span>
                  </label>
                </div>
                
                {imagePreview && (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-cancel"
                        onClick={resetImageUpload}
                      >
                        <CloseIcon /> Ukloni
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-primary"
                        onClick={handleImageUpload}
                        disabled={uploadingImage}
                      >
                        <SaveIcon /> {uploadingImage ? 'Slanje...' : 'Sačuvaj sliku'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="images-gallery">
                {images.length === 0 ? (
                  <p className="no-images-message">Nema dodatih slika</p>
                ) : (
                  <div className="images-grid">
                    {images.map((imageUrl, index) => (
                      <div key={index} className="gallery-image-item">
                        <img 
                          src={imageUrl} 
                          alt={`Slika ${index + 1}`} 
                          className="gallery-image" 
                          onClick={() => setShowFullImage(imageUrl)}
                        />
                        <button
                          className="delete-image-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageDelete(imageUrl);
                          }}
                          title="Obriši sliku"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card comments-card">
            <div className="card-header">
              <h2>Komentar tehničara</h2>
            </div>
            <div className="technician-comments-form">
              <div className="form-group">
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  placeholder="Unesite komentar o izvršenom poslu"
                  disabled={saving}
                  rows="4"
                ></textarea>
              </div>
            </div>
          </div>
          
          {!isMobile && (
            <div className="card status-card">
              <div className="card-header">
                <h2>Status radnog naloga</h2>
              </div>
              <div className="status-actions">
                <button
                  className={`status-btn ${formData.status === 'zavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('zavrsen')}
                  disabled={saving}
                >
                  <CheckIcon /> Završen
                </button>
                <button
                  className={`status-btn ${formData.status === 'nezavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('nezavrsen')}
                  disabled={saving}
                >
                  <ClockIcon /> Nezavršen
                </button>
                <button
                  className={`status-btn ${formData.status === 'odlozen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('odlozen')}
                  disabled={saving}
                >
                  <AlertIcon /> Odložen
                </button>
                <button
                  className={`status-btn ${formData.status === 'otkazan' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('otkazan')}
                  disabled={saving}
                >
                  <CloseIcon /> Otkazan
                </button>
              </div>
            </div>
          )}
          
          {showPostponeForm && (
            <div className="card postpone-card">
              <div className="card-header">
                <h2>Odlaganje termina</h2>
              </div>
              <div className="postpone-form">
                <div className="form-group">
                  <label htmlFor="postponeDate">Novi datum:</label>
                  <div className="date-picker-container">
                    <DatePicker
                      id="postponeDate"
                      selected={formData.postponeDate}
                      onChange={handleDateChange}
                      dateFormat="dd.MM.yyyy"
                      minDate={new Date()}
                      className="date-picker mobile-optimized"
                      calendarClassName="mobile-calendar"
                      wrapperClassName="date-picker-wrapper"
                      popperClassName="date-picker-popper"
                      withPortal={isMobile}
                      portalId="mobile-datepicker-portal"
                      popperPlacement={isMobile ? "bottom" : "bottom-start"}
                      popperModifiers={isMobile ? [] : [
                        {
                          name: 'preventOverflow',
                          options: {
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        }
                      ]}
                      onCalendarOpen={handleDatePickerOpen}
                      onCalendarClose={handleDatePickerClose}
                      fixedHeight
                    />
                    <CalendarIcon className="date-picker-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="postponeTime">Novo vreme:</label>
                  <input
                    type="time"
                    id="postponeTime"
                    name="postponeTime"
                    value={formData.postponeTime}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="save-form">
            <div className="form-buttons">
              <button 
                type="submit" 
                className="btn btn-primary save-btn"
                disabled={saving}
              >
                <SaveIcon /> {saving ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Modal za pregled slike u punoj veličini */}
      {showFullImage && (
        <div className="modal-overlay image-viewer-overlay" onClick={() => setShowFullImage(null)}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <img src={showFullImage} alt="Slika u punoj veličini" className="full-size-image" />
            <button className="close-image-btn fixed-close-btn" onClick={() => setShowFullImage(null)}>
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
      
      {/* Modal za izbor opreme */}
      <EquipmentSelectionModal />
      
      {/* Modal za dodavanje materijala */}
      <MaterialsModal />

      {/* Modal za uklanjanje opreme */}
      {equipmentToRemove && (
        <div className="modal-overlay">
          <div className="modal-content equipment-removal-modal">
            <h3>Uklanjanje opreme</h3>
            <p>Uklanjate: <strong>{equipmentToRemove.equipmentType} - {equipmentToRemove.equipmentDescription}</strong></p>
            <p>Serijski broj: <strong>{equipmentToRemove.serialNumber}</strong></p>

            <div className="form-group">
              <label>Stanje opreme:</label>
              <div className="radio-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="equipmentCondition"
                    checked={isEquipmentWorking}
                    onChange={() => setIsEquipmentWorking(true)}
                  />
                  Ispravna
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="equipmentCondition"
                    checked={!isEquipmentWorking}
                    onChange={() => setIsEquipmentWorking(false)}
                  />
                  Neispravna
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="removalReason">Razlog uklanjanja:</label>
              <textarea
                id="removalReason"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="Unesite razlog uklanjanja opreme"
                rows="3"
              ></textarea>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRemoveEquipment}
                disabled={loadingEquipment}
              >
                {loadingEquipment ? 'Uklanjanje...' : 'Potvrdi uklanjanje'}
              </button>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={cancelRemoveEquipment}
                disabled={loadingEquipment}
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Portal za DatePicker na mobilnim uređajima */}
      <div id="mobile-datepicker-portal"></div>
    </div>
  );
};

export default TechnicianWorkOrderDetail;