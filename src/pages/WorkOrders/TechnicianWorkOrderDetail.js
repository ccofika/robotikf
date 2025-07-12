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
            const compressedFile = new File([blob], file.name, {
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

  // Funkcija za kompresovanje više slika odjednom
  const compressMultipleImages = async (files) => {
    console.log(`🚀 Početak kompresovanja ${files.length} slika`);
    const startTime = Date.now();
    
    const compressedFiles = [];
    const failedCompressions = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📸 Kompresovanje slike ${i + 1}/${files.length}: ${file.name}`);
      
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
        compressedFiles.push(compressedFile);
        
      } catch (error) {
        console.error(`❌ Neuspešno kompresovanje: ${file.name}`, error);
        failedCompressions.push(file.name);
        // Dodaj originalnu sliku ako kompresovanje ne uspe
        compressedFiles.push(file);
      }
    }
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🏁 Kompresovanje završeno za ${totalTime}s`);
    console.log(`✅ Uspešno kompresovano: ${compressedFiles.length - failedCompressions.length}/${files.length}`);
    
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
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
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
      // Validacija tipa fajla
      if (!validTypes.includes(file.type)) {
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
        
        const formattedDate = updatedData.postponeDate.toISOString().split('T')[0];
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
      
      const response = await axios.put(`${apiUrl}/api/workorders/${id}/technician-update`, updatedData);
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
      
      const response = await axios.put(`${apiUrl}/api/workorders/${id}/technician-update`, updatedData);
      setWorkOrder(response.data);
      toast.success(`Status radnog naloga je promenjen na "${
        status === 'zavrsen' ? 'Završen' : 
        status === 'otkazan' ? 'Otkazan' : 'Nezavršen'
      }"!`);
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
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
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
    
    // KORAK 2: Upload kompresovanih slika
    console.log('\n📤========== KORAK 2: UPLOAD NA CLOUDINARY ==========📤');
    const successfulUploads = [];
    const failedUploads = [];
    
    try {
      // Upload slika jedna po jedna da možemo pratiti progress
      for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i];
        const originalFileName = imageFiles[i].name; // Zadržavam originalno ime za logove
        
        console.log(`\n📤 Upload slike ${i + 1}/${compressedFiles.length}: ${originalFileName}`);
        console.log(`📊 Veličina za upload: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('technicianId', user._id);
          
          // Ažuriraj progress za trenutnu sliku - početak upload-a
          const newProgress = [...progressArray];
          newProgress[i] = 25; // Kompresija završena, početak upload-a
          setUploadProgress(newProgress);
          
          console.log('🌐 Slanje na server...');
          const uploadStartTime = Date.now();
          
          const response = await axios.post(`${apiUrl}/api/workorders/${id}/images`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
          console.log(`✅ Upload završen za ${uploadTime}s: ${originalFileName}`);
          console.log(`🔗 URL: ${response.data?.url || 'N/A'}`);
          
          // Uspešan upload
          successfulUploads.push(originalFileName);
          
          // Završetak upload-a
          newProgress[i] = 100;
          setUploadProgress(newProgress);
          
        } catch (error) {
          console.error(`❌ Greška pri upload-u slike ${originalFileName}:`, error);
          console.error('📋 Error details:', error.response?.data);
          failedUploads.push(originalFileName);
          
          // Označava neuspešan upload
          const newProgress = [...progressArray];
          newProgress[i] = -1; // -1 označava grešku
          setUploadProgress(newProgress);
        }
      }
      
      // KORAK 3: Finalizacija i izveštavanje
      console.log('\n📊========== KORAK 3: FINALNI IZVEŠTAJ ==========📊');
      console.log(`✅ Uspešno uploadovano: ${successfulUploads.length}/${compressedFiles.length}`);
      console.log(`❌ Neuspešno uploadovano: ${failedUploads.length}/${compressedFiles.length}`);
      
      if (successfulUploads.length > 0) {
        console.log(`🎉 Uspešni upload-i: ${successfulUploads.join(', ')}`);
        toast.success(`Uspešno uploadovano ${successfulUploads.length} slika`);
      }
      
      if (failedUploads.length > 0) {
        console.log(`💥 Neuspešni upload-i: ${failedUploads.join(', ')}`);
        toast.error(`Neuspešan upload za ${failedUploads.length} slika: ${failedUploads.join(', ')}`);
      }
      
      // Osveži listu slika
      console.log('🔄 Osvežavanje liste slika...');
      const response = await axios.get(`${apiUrl}/api/workorders/${id}`);
      const updatedImages = response.data.images || [];
      setImages(updatedImages);
      console.log(`📋 Nova lista slika: ${updatedImages.length} ukupno`);
      
      // Reset polja za slike
      setImageFiles([]);
      setImagePreviews([]);
      document.getElementById('image-upload').value = '';
      console.log('🧹 Polja za slike su obrisana');
      
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
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu sliku?')) {
      return;
    }

    try {
      await axios.delete(`${apiUrl}/api/workorders/${id}/images`, {
        data: { imageUrl, technicianId: user._id }
      });

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
  }, [usedMaterials, id, user._id]);
  
  // Equipment Selection Modal - optimizovan sa React.memo
  const EquipmentSelectionModal = React.memo(() => {
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
  });
  
  // Materials Modal Component - sa ref-ovima za stable input handling
  const MaterialsModal = React.memo(() => {
    if (!showMaterialsModal) return null;
    
    return <MaterialsModalContent key={materialModalKey} />;
  });
  
  // Potpuno nezavisan modal sadržaj
  const MaterialsModalContent = React.memo(() => {
    const [localSelectedMaterial, setLocalSelectedMaterial] = useState(selectedMaterialRef.current);
    const [localMaterialQuantity, setLocalMaterialQuantity] = useState(materialQuantityRef.current);
    
    // Update ref-ove kad se lokalni state promeni
    React.useEffect(() => {
      selectedMaterialRef.current = localSelectedMaterial;
    }, [localSelectedMaterial]);
    
    React.useEffect(() => {
      materialQuantityRef.current = localMaterialQuantity;
    }, [localMaterialQuantity]);
    
    // Kalkuliši maksimalnu količinu
    const selectedMaterialData = localSelectedMaterial ? availableMaterials.find(mat => mat._id === localSelectedMaterial) : null;
    const maxQuantity = selectedMaterialData?.quantity || 1;
    
    const handleMaterialSelectionChange = (e) => {
      const newValue = e.target.value;
      setLocalSelectedMaterial(newValue);
      setLocalMaterialQuantity(''); // Reset količine na prazno
    };
    
    const handleMaterialQuantityChange = (e) => {
      const inputValue = e.target.value;
      
      if (inputValue === '') {
        setLocalMaterialQuantity('');
        return;
      }
      
      const numValue = parseInt(inputValue);
      
      if (isNaN(numValue) || numValue < 0) {
        setLocalMaterialQuantity('');
        return;
      }
      
      if (localSelectedMaterial) {
        setLocalMaterialQuantity(Math.min(numValue, maxQuantity));
      } else {
        setLocalMaterialQuantity(numValue);
      }
    };
    
    const isAddDisabled = !localSelectedMaterial || !localMaterialQuantity || localMaterialQuantity === '' || localMaterialQuantity <= 0 || loadingMaterials;
    
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
                type="button"
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
                value={localSelectedMaterial}
                onChange={handleMaterialSelectionChange}
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
                min="0"
                max={maxQuantity}
                value={localMaterialQuantity}
                onChange={handleMaterialQuantityChange}
                className="form-input"
                placeholder="Unesite količinu"
                autoComplete="off"
              />
              {localSelectedMaterial && (
                <small className="form-help">
                  Maksimalno dostupno: {maxQuantity}
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
              disabled={isAddDisabled}
              type="button"
            >
              {loadingMaterials ? 'Dodavanje...' : 'Dodaj materijal'}
            </button>
          </div>
        </div>
      </div>
    );
  });
  
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
            disabled={isWorkOrderCompleted}
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
                  disabled={loadingMaterials || isWorkOrderCompleted}
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
        
        {isWorkOrderCompleted && (
          <div className="info-message">
            Radni nalog je završen - uređivanje materijala nije moguće.
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
                  disabled={isWorkOrderCompleted}
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
                  disabled={loadingEquipment || technicianEquipment.length === 0 || isWorkOrderCompleted}
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
                  disabled={!selectedEquipment || loadingEquipment || isWorkOrderCompleted}
                >
                  {loadingEquipment ? 'Dodavanje...' : 'Dodaj opremu'}
                </button>
              </div>

              {technicianEquipment.length === 0 && (
                <p className="warning-message">
                  Nemate dostupnu opremu u vašem inventaru.
                </p>
              )}
              
              {isWorkOrderCompleted && (
                <p className="info-message">
                  Radni nalog je završen - uređivanje opreme nije moguće.
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
                    multiple
                    disabled={uploadingImages || isWorkOrderCompleted}
                    className="hidden-upload"
                  />
                  <label htmlFor="image-upload" className="upload-label">
                    <ImageIcon />
                    <span>Fotografiši ili izaberi slike</span>
                    <small>Možete odabrati do 10 slika odjednom (max 30MB po slici)</small>
                  </label>
                </div>
                
                {(imagePreviews.length > 0 || uploadingImages) && (
                  <div className="multiple-images-preview-container">
                    <div className="preview-header">
                      <h4>
                        {uploadingImages && imagePreviews.length === 0 
                          ? "Kompresovanje slika u toku..."
                          : `Odabrane slike (${imagePreviews.length})`
                        }
                      </h4>
                      {!uploadingImages && (
                        <button 
                          type="button" 
                          className="btn btn-sm btn-cancel"
                          onClick={resetImageUpload}
                          disabled={uploadingImages}
                        >
                          <CloseIcon /> Ukloni sve
                        </button>
                      )}
                    </div>
                    
                    {uploadingImages && imagePreviews.length === 0 && (
                      <div className="compression-loading">
                        <div className="loading-spinner"></div>
                        <p>Kompresovanje slika u toku...</p>
                        <small>Molimo sačekajte dok se slike pripravljaju za upload</small>
                      </div>
                    )}
                    
                    <div className="images-preview-grid">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="image-preview-item">
                          <img src={preview.preview} alt={`Preview ${index + 1}`} className="image-preview" />
                          <div className="preview-info">
                            <div className="preview-filename">{preview.name}</div>
                            <div className="preview-filesize">{(preview.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                          
                          {uploadingImages && uploadProgress[index] !== undefined && (
                            <div className="upload-progress-overlay">
                              {uploadProgress[index] === -1 ? (
                                <div className="upload-error">
                                  <AlertIcon />
                                  <span>Greška</span>
                                </div>
                              ) : uploadProgress[index] === 100 ? (
                                <div className="upload-success">
                                  <CheckIcon />
                                  <span>Uspešno</span>
                                </div>
                              ) : (
                                <div className="upload-progress">
                                  <div className="progress-bar">
                                    <div 
                                      className="progress-fill"
                                      style={{ width: `${uploadProgress[index]}%` }}
                                    ></div>
                                  </div>
                                  <span>{uploadProgress[index]}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        className="btn btn-primary upload-all-btn"
                        onClick={handleImageUpload}
                        disabled={uploadingImages}
                      >
                        <SaveIcon /> {uploadingImages ? `Slanje... (${uploadProgress.filter(p => p === 100).length}/${imagePreviews.length})` : `Sačuvaj sve slike (${imagePreviews.length})`}
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
                    {images.map((imageItem, index) => {
                      // Podrška za stari i novi format
                      const imageUrl = typeof imageItem === 'object' ? imageItem.url : imageItem;
                      const originalName = typeof imageItem === 'object' ? imageItem.originalName : null;
                      
                      return (
                        <div key={index} className="gallery-image-item">
                          <img 
                            src={imageUrl} 
                            alt={originalName || `Slika ${index + 1}`} 
                            className="gallery-image" 
                            onClick={() => setShowFullImage(imageUrl)}
                          />
                          {originalName && (
                            <div className="image-filename-overlay">
                              {originalName}
                            </div>
                          )}
                          <button
                            className="delete-image-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDelete(imageUrl);
                            }}
                            title="Obriši sliku"
                            disabled={isWorkOrderCompleted}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {isWorkOrderCompleted && (
                  <div className="info-message">
                    Radni nalog je završen - dodavanje/brisanje slika nije moguće.
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
                  placeholder={isWorkOrderCompleted ? "Radni nalog je završen - komentar se ne može menjati" : "Unesite komentar o izvršenom poslu"}
                  disabled={saving || isWorkOrderCompleted}
                  rows="4"
                ></textarea>
              </div>
            </div>
          </div>
          
          {isWorkOrderCompleted && (
            <div className="card completion-info-card">
              <div className="card-header">
                <h2>Informacije o završetku</h2>
              </div>
              <div className="card-body">
                <div className="info-message">
                  <strong>Radni nalog je završen</strong> - sva polja su samo za čitanje.
                  Možete pregledati sve informacije, ali ne možete ih menjati.
                </div>
              </div>
            </div>
          )}
          
          {/* Mobilni status panel - pozicija 8 */}
          {isMobile && (
            <div className={`mobile-status-panel ${showStatusActions ? 'show' : ''}`}>
              <div className="status-actions">
                <button
                  className={`status-btn ${formData.status === 'zavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('zavrsen')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <CheckIcon /> Završen
                </button>
                <button
                  className={`status-btn ${formData.status === 'nezavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('nezavrsen')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <ClockIcon /> Nezavršen
                </button>
                <button
                  className={`status-btn ${formData.status === 'odlozen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('odlozen')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <AlertIcon /> Odložen
                </button>
                <button
                  className={`status-btn ${formData.status === 'otkazan' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('otkazan')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <CloseIcon /> Otkazan
                </button>
              </div>
            </div>
          )}
          
          {!isMobile && (
            <div className="card status-card">
              <div className="card-header">
                <h2>Status radnog naloga</h2>
              </div>
              <div className="status-actions">
                <button
                  className={`status-btn ${formData.status === 'zavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('zavrsen')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <CheckIcon /> Završen
                </button>
                <button
                  className={`status-btn ${formData.status === 'nezavrsen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('nezavrsen')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <ClockIcon /> Nezavršen
                </button>
                <button
                  className={`status-btn ${formData.status === 'odlozen' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('odlozen')}
                  disabled={saving || isWorkOrderCompleted}
                >
                  <AlertIcon /> Odložen
                </button>
                <button
                  className={`status-btn ${formData.status === 'otkazan' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('otkazan')}
                  disabled={saving || isWorkOrderCompleted}
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
              <div className="info-message" style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '4px' }}>
                <strong>Napomena:</strong> Radni nalog može biti odložen maksimalno 48 sati. Za duže odlaganje molimo otkažite radni nalog.
              </div>
              <div className="postpone-form">
                <div className="form-group">
                  <label htmlFor="postponeDate">Novi datum:</label>
                  <div className="date-picker-container">
                    {isMobile ? (
                      <input
                        type="date"
                        id="postponeDate"
                        value={formData.postponeDate ? formData.postponeDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          handleDateChange(selectedDate);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString().split('T')[0]}
                        disabled={saving || isWorkOrderCompleted}
                        className="form-control date-input-mobile"
                      />
                    ) : (
                      <DatePicker
                        id="postponeDate"
                        selected={formData.postponeDate}
                        onChange={handleDateChange}
                        dateFormat="dd.MM.yyyy"
                        minDate={new Date()}
                        maxDate={new Date(Date.now() + (48 * 60 * 60 * 1000))}
                        className="date-picker"
                        disabled={saving || isWorkOrderCompleted}
                        fixedHeight
                      />
                    )}
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
                    disabled={saving || isWorkOrderCompleted}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="postponeComment">Razlog odlaganja: <span style={{color: 'red'}}>*</span></label>
                  <textarea
                    id="postponeComment"
                    name="postponeComment"
                    value={formData.postponeComment}
                    onChange={handleChange}
                    placeholder="Obavezno objasnite razlog odlaganja radnog naloga..."
                    required
                    rows="3"
                    disabled={saving || isWorkOrderCompleted}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '14px',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {showCancelForm && (
            <div className="card cancel-card">
              <div className="card-header">
                <h2>Otkazivanje radnog naloga</h2>
              </div>
              <div className="info-message" style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
                <strong>Napomena:</strong> Molimo objasnite razlog otkazivanja radnog naloga.
              </div>
              <div className="cancel-form">
                <div className="form-group">
                  <label htmlFor="cancelComment">Razlog otkazivanja: <span style={{color: 'red'}}>*</span></label>
                  <textarea
                    id="cancelComment"
                    name="cancelComment"
                    value={formData.cancelComment}
                    onChange={handleChange}
                    placeholder="Obavezno objasnite razlog otkazivanja radnog naloga..."
                    required
                    rows="4"
                    disabled={saving || isWorkOrderCompleted}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '14px',
                      resize: 'vertical',
                      minHeight: '100px'
                    }}
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
                disabled={saving || isWorkOrderCompleted}
              >
                <SaveIcon /> {saving ? 'Čuvanje...' : isWorkOrderCompleted ? 'Završen radni nalog' : 'Sačuvaj'}
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
      
      {/* Portal za DatePicker na desktop uređajima */}
      {!isMobile && <div id="mobile-datepicker-portal"></div>}
    </div>
  );
};

export default TechnicianWorkOrderDetail;