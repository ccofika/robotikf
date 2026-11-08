import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { RefreshCw, Warehouse, Plus, Upload, Download, X, Pencil } from 'lucide-react';
import { toast } from '../../utils/toast';
import { equipmentAPI, techniciansAPI } from '../../services/api';
import { describeAssignment, formatAssignedAt } from '../../utils/equipmentAssignment';
import { localYmd } from '../../utils/localDate';
import { Btn, Sign, Skeleton } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../../security/sx/layout';
import { Field, Input, Select, Choice, SearchField } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { Pager, ColumnMenu, Loading, LinkBtn } from '../../montaza/ui';
import './EquipmentList.mx.css';

const EquipmentList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Server-side pagination state
  const [equipment, setEquipment] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });
  const [dashboardStats, setDashboardStats] = useState({ total: 0, inWarehouse: 0, assigned: 0 });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [allLocations, setAllLocations] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Search and filter states - read initial search from URL if present
  const urlSearch = new URLSearchParams(location.search).get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(urlSearch);
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI states
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    serialNumber: true,
    location: true,
    assignedAt: true,
    actions: true
  });

  const [technicians, setTechnicians] = useState([]);
  const [equipmentByDescription, setEquipmentByDescription] = useState([]);

  // Modalni prozor za dodavanje pojedinačne opreme
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    category: '',
    description: '',
    serialNumber: ''
  });

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when pagination, search, or filters change
  useEffect(() => {
    fetchEquipment();
    fetchDashboardStats(selectedCategory); // Update dashboard stats for new category

    // Fetch equipment grouped by description if technician or warehouse is selected
    if (locationFilter && (locationFilter.startsWith('tehnicar-') || locationFilter === 'magacin')) {
      fetchEquipmentByDescription(locationFilter);
    } else {
      setEquipmentByDescription([]);
    }
  }, [pagination.currentPage, debouncedSearchTerm, locationFilter, selectedCategory]);

  // Initial load
  useEffect(() => {
    fetchDashboardStats('all'); // Start with all categories
    fetchCategories();
    fetchTechnicians();
    fetchAllLocations(); // Load all possible locations
    fetchEquipment();
  }, []);

  // Fetch dashboard stats for current category
  const fetchDashboardStats = async (category = selectedCategory) => {
    setDashboardLoading(true);
    try {
      const params = {
        statsOnly: 'true'
      };
      if (category && category !== 'all') {
        params.category = category;
      }

      const response = await equipmentAPI.getDisplay(params);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch categories with counts
  const fetchCategories = async () => {
    try {
      const [categoriesResponse, countsResponse] = await Promise.all([
        equipmentAPI.getCategories(),
        equipmentAPI.getCategories({ withCounts: 'true' })
      ]);

      setAvailableCategories(categoriesResponse.data);
      setCategoryCounts(countsResponse.data);
    } catch (error) {
      console.error('Greška pri učitavanju kategorija:', error);
    }
  };

  // Main fetch function with server-side pagination
  const fetchEquipment = async (page = pagination.currentPage) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearchTerm,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        location: locationFilter
      };

      const response = await equipmentAPI.getDisplay(params);
      const { data: equipmentData, pagination: paginationData, performance: performanceData } = response.data;

      setEquipment(equipmentData);
      setPagination(paginationData);
      setPerformance(performanceData);

      // Update current page in state if different
      if (paginationData.currentPage !== pagination.currentPage) {
        setPagination(prev => ({ ...prev, currentPage: paginationData.currentPage }));
      }

    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje opreme!');
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

  // Fetch all possible locations for filter dropdown
  const fetchAllLocations = async () => {
    try {
      const response = await equipmentAPI.getLocations();
      setAllLocations(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju lokacija:', error);
    }
  };

  // Fetch equipment grouped by description for selected technician
  const fetchEquipmentByDescription = async (location) => {
    try {
      const params = {
        location: location,
        groupBy: 'description'
      };

      const response = await equipmentAPI.getGrouped(params);
      setEquipmentByDescription(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju grupisane opreme:', error);
      setEquipmentByDescription([]);
    }
  };

  
  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [pagination.totalPages]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardStats(selectedCategory),
      fetchCategories(),
      fetchAllLocations(),
      fetchEquipment(pagination.currentPage)
    ]);
    setIsRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  // Reset filters and search
  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setLocationFilter('');
    setSelectedCategory('all');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search
  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Export filtered equipment to Excel (respects current filters)
  const handleExportToExcel = async () => {
    if (!locationFilter) return;

    setIsExporting(true);
    try {
      const params = {
        all: 'true',
        search: debouncedSearchTerm,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        location: locationFilter
      };

      const response = await equipmentAPI.getDisplay(params);
      const equipmentData = response.data?.data || [];

      if (equipmentData.length === 0) {
        toast.error('Nema opreme za eksportovanje sa trenutnim filterima.');
        return;
      }

      const excelRows = equipmentData.map(item => ({
        'Kategorija': item.category || '',
        'Opis': item.description || '',
        'Serijski broj': item.serialNumber || '',
        'Datum i vreme zaduženja': formatAssignedAt(item.assignedAt) || '',
        'Zadužio': item.assignedByName || '',
        'Lokacija': translateLocation(item.location || '')
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      worksheet['!cols'] = [
        { wch: 22 }, // Kategorija
        { wch: 35 }, // Opis
        { wch: 22 }, // Serijski broj
        { wch: 22 }, // Datum i vreme zaduženja
        { wch: 30 }, // Zadužio
        { wch: 28 }  // Lokacija
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Oprema');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Build filename
      const dateStr = localYmd();
      let locationLabel = 'oprema';
      if (locationFilter === 'magacin') {
        locationLabel = 'magacin';
      } else if (locationFilter.startsWith('tehnicar-')) {
        const techId = locationFilter.split('-')[1];
        const technician = technicians.find(tech => tech._id === techId || tech.id === techId);
        if (technician?.name) {
          locationLabel = technician.name.replace(/\s+/g, '_').toLowerCase();
        } else {
          locationLabel = `tehnicar-${techId}`;
        }
      }
      const filename = `oprema-${locationLabel}-${dateStr}.xlsx`;

      saveAs(blob, filename);
      toast.success(`Eksportovano ${equipmentData.length} komada opreme!`);
    } catch (error) {
      console.error('Greška pri eksportovanju opreme:', error);
      toast.error('Greška pri eksportovanju opreme!');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Categories for filters
  const categories = availableCategories;

  // Get category count from backend data
  const getCategoryCount = (category) => {
    if (category === 'all') {
      return categoryCounts.all || dashboardStats.total || pagination.totalCount;
    }
    return categoryCounts[category] || 0;
  };
  
  // All locations for filter dropdown (magacin + all technicians)
  const locationOptions = useMemo(() => {
    return [
      { value: '', label: 'Sve lokacije' },
      ...allLocations
    ];
  }, [allLocations]);
  
  // Lokalizacija lokacije
  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    if (location.startsWith('tehnicar-')) {
      const techId = location.split('-')[1];
      // Pronađi tehničara po ID-u
      const technician = technicians.find(tech => tech._id === techId || tech.id === techId);
      return technician ? `Tehničar: ${technician.name}` : `Tehničar ID: ${techId}`;
    }
    return location;
  };
  
  // Lista svih validnih kategorija za dropdown pri dodavanju opreme
  const ALL_VALID_CATEGORIES = [
    'STB', 'Cam Modul', 'Hybrid', 'OTT tv po tvom', 'Smart Card',
    'HFC Modem', 'GPON Modem', 'ATV', 'PON',
    'M-Cam Modul', 'M-Smart Card', 'M-HFC Modem', 'M-GPON Modem',
    'M-ATV', 'M-STB', 'M-OTT tv po tvom', 'M-Hybrid', 'M-PON',
    'Astra Modem', 'Astra Stb', 'Astra Antena', 'Astra Ruter', 'Astra Poe napajanje'
  ];

  // Formatiranje naziva kategorija - kategorije su sada standardizovane
  const formatCategoryName = (category) => {
    // Kategorije su već u ispravnom formatu nakon migracije
    // Ova funkcija služi samo za eventualno prilagođavanje prikaza
    const categoryNames = {
      'STB': 'STB',
      'Cam Modul': 'Cam Modul',
      'Hybrid': 'Hybrid',
      'OTT tv po tvom': 'OTT tv po tvom',
      'Smart Card': 'Smart Card',
      'HFC Modem': 'HFC Modem',
      'GPON Modem': 'GPON Modem',
      'ATV': 'ATV',
      'PON': 'PON',
      'M-Cam Modul': 'M-Cam Modul',
      'M-Smart Card': 'M-Smart Card',
      'M-HFC Modem': 'M-HFC Modem',
      'M-GPON Modem': 'M-GPON Modem',
      'M-ATV': 'M-ATV',
      'M-STB': 'M-STB',
      'M-OTT tv po tvom': 'M-OTT tv po tvom',
      'M-Hybrid': 'M-Hybrid',
      'M-PON': 'M-PON',
      'Astra Modem': 'Astra Modem',
      'Astra Stb': 'Astra Stb',
      'Astra Antena': 'Astra Antena',
      'Astra Ruter': 'Astra Ruter',
      'Astra Poe napajanje': 'Astra Poe napajanje'
    };

    return categoryNames[category] || category;
  };
  
  // Handling za dodavanje pojedinačne opreme
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEquipment(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setNewEquipment(prev => ({
      ...prev,
      category: value
    }));
  };
  
  const handleAddEquipment = async (e) => {
    e.preventDefault();

    // Validacije
    if (!newEquipment.category || !newEquipment.description || !newEquipment.serialNumber) {
      toast.error('Sva polja su obavezna!');
      return;
    }

    try {
      const equipmentToAdd = {
        category: newEquipment.category,
        description: newEquipment.description,
        serialNumber: newEquipment.serialNumber
      };

      await equipmentAPI.create(equipmentToAdd);
      toast.success('Oprema uspešno dodata!');
      setShowAddModal(false);
      
      // Reset forme
      setNewEquipment({
        category: '',
        description: '',
        serialNumber: ''
      });
      
      // Osvežavanje liste opreme i kategorija
      await Promise.all([
        handleRefresh(),
        fetchCategories() // Ponovo učitaj kategorije jer se možda dodala nova
      ]);
    } catch (error) {
      console.error('Greška pri dodavanju opreme:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju opreme!');
    }
  };
  
  // SearchField šalje vrednost: X (prazno) briše odmah kao staro dugme, kucanje ide kroz handleSearch
  const onSearch = (value) => {
    if (value === '') {
      setSearchTerm('');
      setDebouncedSearchTerm('');
      return;
    }
    handleSearch({ target: { value } });
  };

  const hasFilters = searchTerm || locationFilter || selectedCategory !== 'all';
  const pctOf = (n) => (dashboardStats.total > 0 ? Math.round(n / dashboardStats.total * 100) : 0);
  const statNum = (n) => (dashboardLoading ? <Skeleton h={30} w={56} r={8} /> : n);
  const showByType = locationFilter && (locationFilter.startsWith('tehnicar-') || locationFilter === 'magacin') && equipmentByDescription.length > 0;

  return (
    <div className="sx-page" data-testid="page-equipment">
      <PageHead
        className="mx-eq-head"
        eyebrow="Montaža · Inventar"
        title="Pregled opreme"
        lead={`Server-side pagination - ${pagination.totalCount} komada opreme`}
        actions={<>
          <Btn icon={RefreshCw} onClick={handleRefresh} busy={isRefreshing || dashboardLoading || loading}>Osveži</Btn>
          <Btn icon={Warehouse} onClick={() => navigate('/virtual-warehouse')}>Virtuelni magacin</Btn>
          <Btn icon={Plus} onClick={() => setShowAddModal(true)}>Dodaj opremu</Btn>
          <LinkBtn to="/equipment/upload" variant="primary" icon={Upload}>Dodaj iz Excel-a</LinkBtn>
        </>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      {/* Traka sa kategorijama (isto mesto kao ranije): pilule po sredini, na telefonu jedan red koji se pomera */}
      <div className="mx-eq-catbar">
        <Choice
          size="sm"
          scroll
          label="Kategorije"
          layoutId="mx-eq-cat"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { value: 'all', label: 'Sve kategorije', count: getCategoryCount('all') },
            ...categories
              .filter(category => getCategoryCount(category) > 0)
              .map(category => ({ value: category, label: formatCategoryName(category), count: getCategoryCount(category) }))
          ]}
        />
      </div>

      <div className="sx-stats">
        <Stat label={selectedCategory === 'all' ? 'Ukupno opreme' : `${formatCategoryName(selectedCategory)}`} value={statNum(dashboardStats.total)} />
        <Stat label="U magacinu" value={statNum(dashboardStats.inWarehouse)} small={dashboardLoading ? null : `${pctOf(dashboardStats.inWarehouse)}%`} />
        <Stat label="Zaduženo" value={statNum(dashboardStats.assigned)} small={dashboardLoading ? null : `${pctOf(dashboardStats.assigned)}%`} />
      </div>

      {/* Oprema po tipu: kad je izabran tehničar ili magacin (dve stavke u redu) */}
      {showByType && (
        <Panel title="Oprema po tipu" pad={false} className="mx-mb">
          <div className="sx-tablewrap">
            <table className="sx-table mx-eq-types">
              <thead>
                <tr>
                  <th>Opis opreme</th>
                  <th className="is-num">Broj</th>
                  <th>Opis opreme</th>
                  <th className="is-num">Broj</th>
                </tr>
              </thead>
              <tbody>
                {equipmentByDescription.reduce((rows, item, index) => {
                  if (index % 2 === 0) {
                    rows.push([item]);
                  } else {
                    rows[rows.length - 1].push(item);
                  }
                  return rows;
                }, []).map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ '--i': rowIndex }}>
                    <td data-label="Opis opreme"><b className="mx-strong">{row[0]?.description}</b></td>
                    <td data-label="Broj" className="is-num">{row[0]?.count}</td>
                    <td data-label={row[1] ? 'Opis opreme' : undefined}>{row[1] ? <b className="mx-strong">{row[1].description}</b> : ''}</td>
                    <td data-label={row[1] ? 'Broj' : undefined} className="is-num">{row[1]?.count || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Toolbar>
        <SearchField value={searchTerm} onChange={onSearch} placeholder="Pretraži po serijskom broju ili opisu..." />
        <Select
          size="sm"
          aria-label="Lokacija"
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
        >
          {locationOptions.map((location, idx) => (
            <option key={idx} value={location.value}>{location.label}</option>
          ))}
        </Select>
        {locationFilter && (
          <Btn size="sm" variant="primary" icon={Download} onClick={handleExportToExcel} disabled={isExporting}>
            {isExporting ? 'Eksportujem...' : 'Eksportuj u Excel'}
          </Btn>
        )}
        <div className="sx-toolbar__end">
          {hasFilters && <Btn size="sm" variant="ghost" icon={X} onClick={clearAllFilters}>Obriši filtere</Btn>}
          <ColumnMenu
            columns={{ description: 'Opis', serialNumber: 'Serijski broj', location: 'Lokacija', assignedAt: 'Zaduženo', actions: 'Akcije' }}
            visible={visibleColumns}
            onChange={(key, v) => setVisibleColumns(prev => ({ ...prev, [key]: v }))}
          />
        </div>
      </Toolbar>

      <Panel pad={false}>
        {loading ? (
          <Loading text="Učitavanje opreme..." />
        ) : (
          <>
            {equipment.length === 0 ? (
              <div className="sx-empty-block">
                <b>Nema rezultata za prikazivanje</b>
                {hasFilters && <Btn size="sm" variant="ghost" icon={X} onClick={clearAllFilters}>Obriši filtere</Btn>}
              </div>
            ) : (
              <div className="sx-tablewrap">
                <table className="sx-table" data-testid="equipment-table">
                  <thead>
                    <tr>
                      {visibleColumns.description && <th>Opis</th>}
                      {visibleColumns.serialNumber && <th>Serijski broj</th>}
                      {visibleColumns.location && <th>Lokacija</th>}
                      {visibleColumns.assignedAt && <th>Zaduženo</th>}
                      {visibleColumns.actions && <th className="is-end">Akcije</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item, index) => (
                      <tr key={item._id} style={{ '--i': index }}>
                        {visibleColumns.description && <td className="is-head"><b className="mx-strong">{item.description}</b></td>}
                        {visibleColumns.serialNumber && <td data-label="Serijski broj"><span className="sx-mono">{item.serialNumber}</span></td>}
                        {visibleColumns.location && (
                          <td data-label="Lokacija">
                            <Sign tone={item.location === 'magacin' ? 'idle' : 'info'} className="mx-eq-loc">{translateLocation(item.location)}</Sign>
                          </td>
                        )}
                        {visibleColumns.assignedAt && (() => {
                          const assignment = describeAssignment(item);
                          return (
                            <td data-label="Zaduženo">
                              <span className={assignment.variant === 'stamped' ? 'sx-mono' : assignment.variant === 'legacy' ? 'mx-eq-legacy' : 'sx-faint'}>
                                {assignment.text}
                              </span>
                            </td>
                          );
                        })()}
                        {visibleColumns.actions && (
                          <td className="is-actions is-end">
                            <div className="sx-rowacts">
                              <LinkBtn to={`/equipment/edit/${item._id}`} size="sm" variant="ghost" icon={Pencil}>Izmeni</LinkBtn>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager
              page={pagination.currentPage}
              total={pagination.totalCount}
              perPage={pagination.limit}
              onPage={handlePageChange}
              label={performance.queryTime ? <>rezultata <span className="sx-faint">({performance.queryTime}ms)</span></> : 'rezultata'}
            />
          </>
        )}
      </Panel>

      {/* Dodavanje pojedinačne opreme; dugmad su kao ranije "submit" dugmad forme (Otkaži je prvo) */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        eyebrow="Oprema"
        title="Dodaj novu opremu"
        size="sm"
        testId="add-equipment-dialog"
        footer={<>
          <Btn type="submit" form="mx-eq-add" variant="ghost" onClick={() => setShowAddModal(false)}>Otkaži</Btn>
          <Btn type="submit" form="mx-eq-add" variant="primary" icon={Plus} onClick={handleAddEquipment}>Dodaj opremu</Btn>
        </>}
      >
        <form id="mx-eq-add" onSubmit={handleAddEquipment} className="sx-form">
          <Field label="Kategorija:" htmlFor="mx-eq-category">
            <Select id="mx-eq-category" onChange={handleCategoryChange} defaultValue="">
              <option value="" disabled>Izaberite kategoriju</option>
              {ALL_VALID_CATEGORIES.map(category => (
                <option key={category} value={category}>{formatCategoryName(category)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Opis:" htmlFor="mx-eq-description">
            <Input type="text" id="mx-eq-description" name="description" value={newEquipment.description} onChange={handleInputChange} placeholder="Unesite opis opreme" />
          </Field>
          <Field label="Serijski broj:" htmlFor="mx-eq-serial">
            <Input type="text" id="mx-eq-serial" name="serialNumber" value={newEquipment.serialNumber} onChange={handleInputChange} placeholder="Unesite serijski broj" mono />
          </Field>
        </form>
      </Dialog>
    </div>
  );
};

export default React.memo(EquipmentList);