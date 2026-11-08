import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Stat } from '../../security/sx/layout';
import { Select, Choice, SearchField } from '../../security/sx/forms';
import { ColumnMenu } from '../../montaza/ui';
import equipmentData from '../../data/virtual_warehouse_equipment.json';
import './EquipmentList.mx.css';

// Oprema iz JSON fajla - Vladimir Milovanović oprema
const HARDCODED_EQUIPMENT = equipmentData;

const VirtualWarehouse = () => {
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    serialNumber: true,
    location: true,
  });

  // Formatiranje naziva kategorija
  const formatCategoryName = (category) => {
    const categoryNames = {
      'cam': 'CAM',
      'modem': 'Modem',
      'stb': 'STB',
      'fiksni telefon': 'Fiksni telefon',
      'mini nod': 'Mini nod',
      'hybrid': 'Hybrid'
    };

    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Lokalizacija lokacije
  const translateLocation = (location) => {
    if (location === 'magacin') return 'Magacin';
    return location;
  };

  // Get unique categories from equipment
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(HARDCODED_EQUIPMENT.map(item => item.category))];
    return uniqueCategories;
  }, []);

  // Get unique technicians from equipment
  const technicians = useMemo(() => {
    const uniqueTechnicians = [...new Set(HARDCODED_EQUIPMENT.map(item => item.location))];
    return uniqueTechnicians.filter(t => t && t !== 'magacin').sort();
  }, []);

  // Filter equipment based on search, category and technician
  const filteredEquipment = useMemo(() => {
    let filtered = [...HARDCODED_EQUIPMENT];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by technician
    if (selectedTechnician !== 'all') {
      filtered = filtered.filter(item => item.location === selectedTechnician);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.serialNumber.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [selectedCategory, selectedTechnician, searchTerm]);

  // Get category counts
  const getCategoryCount = (category) => {
    if (category === 'all') {
      return HARDCODED_EQUIPMENT.length;
    }
    return HARDCODED_EQUIPMENT.filter(item => item.category === category).length;
  };

  // Dashboard stats
  const dashboardStats = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? HARDCODED_EQUIPMENT
      : HARDCODED_EQUIPMENT.filter(item => item.category === selectedCategory);

    return {
      total: filtered.length,
      inWarehouse: filtered.filter(item => item.location === 'magacin').length,
      assigned: filtered.filter(item => item.location !== 'magacin').length,
    };
  }, [selectedCategory]);

  // Reset filters and search
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedTechnician('all');
  };

  // Get technician count
  const getTechnicianCount = (technician) => {
    if (technician === 'all') {
      return HARDCODED_EQUIPMENT.length;
    }
    return HARDCODED_EQUIPMENT.filter(item => item.location === technician).length;
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const hasFilters = searchTerm || selectedCategory !== 'all' || selectedTechnician !== 'all';
  const pctOf = (n) => (dashboardStats.total > 0 ? Math.round(n / dashboardStats.total * 100) : 0);

  return (
    <div className="sx-page" data-testid="page-virtual-warehouse">
      <PageHead
        eyebrow="Montaža · Inventar"
        title="Virtuelni magacin"
        lead={`Frontend prikaz opreme - ${filteredEquipment.length} komada`}
      />

      {/* Traka sa kategorijama (isto mesto kao ranije): pilule po sredini, na telefonu jedan red koji se pomera */}
      <div className="mx-eq-catbar">
        <Choice
          size="sm"
          scroll
          label="Kategorije"
          layoutId="mx-vw-cat"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { value: 'all', label: 'Sve kategorije', count: getCategoryCount('all') },
            ...categories.map(category => ({ value: category, label: formatCategoryName(category), count: getCategoryCount(category) }))
          ]}
        />
      </div>

      <div className="sx-stats">
        <Stat label={selectedCategory === 'all' ? 'Ukupno opreme' : `${formatCategoryName(selectedCategory)}`} value={dashboardStats.total} />
        <Stat label="U magacinu" value={dashboardStats.inWarehouse} small={`${pctOf(dashboardStats.inWarehouse)}%`} />
        <Stat label="Zaduženo" value={dashboardStats.assigned} small={`${pctOf(dashboardStats.assigned)}%`} />
      </div>

      <Toolbar>
        <SearchField value={searchTerm} onChange={(value) => handleSearch({ target: { value } })} placeholder="Pretraži po serijskom broju ili opisu..." />
        <Select size="sm" aria-label="Tehničar" value={selectedTechnician} onChange={(e) => setSelectedTechnician(e.target.value)}>
          <option value="all">Svi tehničari ({getTechnicianCount('all')})</option>
          {technicians.map(tech => (
            <option key={tech} value={tech}>
              {tech} ({getTechnicianCount(tech)})
            </option>
          ))}
        </Select>
        <div className="sx-toolbar__end">
          {hasFilters && <Btn size="sm" variant="ghost" icon={X} onClick={clearAllFilters}>Obriši filtere</Btn>}
          <ColumnMenu
            columns={{ description: 'Opis', serialNumber: 'Serijski broj', location: 'Lokacija' }}
            visible={visibleColumns}
            onChange={(key, v) => setVisibleColumns(prev => ({ ...prev, [key]: v }))}
          />
        </div>
      </Toolbar>

      <Panel pad={false}>
        {filteredEquipment.length === 0 ? (
          <div className="sx-empty-block">
            <b>Nema rezultata za prikazivanje</b>
            {hasFilters && <Btn size="sm" variant="ghost" icon={X} onClick={clearAllFilters}>Obriši filtere</Btn>}
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="virtual-warehouse-table">
              <thead>
                <tr>
                  {visibleColumns.description && <th>Opis</th>}
                  {visibleColumns.serialNumber && <th>Serijski broj</th>}
                  {visibleColumns.location && <th>Lokacija</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((item, index) => (
                  <tr key={item._id} style={{ '--i': index }}>
                    {visibleColumns.description && <td className="is-head"><b className="mx-strong">{item.description}</b></td>}
                    {visibleColumns.serialNumber && <td data-label="Serijski broj"><span className="sx-mono">{item.serialNumber}</span></td>}
                    {visibleColumns.location && (
                      <td data-label="Lokacija">
                        <Sign tone={item.location === 'magacin' ? 'idle' : 'info'} className="mx-eq-loc">{translateLocation(item.location)}</Sign>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default React.memo(VirtualWarehouse);
