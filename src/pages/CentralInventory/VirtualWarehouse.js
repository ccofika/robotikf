import React, { useState, useMemo } from 'react';
import { SearchIcon, FilterIcon, BoxIcon, EyeIcon, CloseIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { cn } from '../../utils/cn';
import equipmentData from '../../data/virtual_warehouse_equipment.json';

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
  const [showColumnMenu, setShowColumnMenu] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <BoxIcon size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Virtuelni magacin</h1>
              <p className="text-slate-600 mt-1">Frontend prikaz opreme - {filteredEquipment.length} komada</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Category Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-6 bg-slate-100 rounded-lg p-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              "hover:bg-white hover:text-slate-900",
              selectedCategory === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            )}
          >
            <span>Sve kategorije</span>
            <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
              {getCategoryCount('all')}
            </span>
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                "hover:bg-white hover:text-slate-900",
                selectedCategory === category ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              )}
            >
              <span>{formatCategoryName(category)}</span>
              <span className="ml-2 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full">
                {getCategoryCount(category)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BoxIcon size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {selectedCategory === 'all' ? 'Ukupno opreme' : `${formatCategoryName(selectedCategory)}`}
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardStats.total}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg font-bold">
                {dashboardStats.inWarehouse}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">U magacinu</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardStats.total > 0 ?
                    Math.round(dashboardStats.inWarehouse / dashboardStats.total * 100) : 0
                  }%
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-lg font-bold">
                {dashboardStats.assigned}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Zaduženo</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {dashboardStats.total > 0 ?
                    Math.round(dashboardStats.assigned / dashboardStats.total * 100) : 0
                  }%
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
                  placeholder="Pretraži po serijskom broju ili opisu..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="h-9 w-full pl-10 pr-4 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-slate-50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>

              {/* Technician Filter */}
              <div className="relative">
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="h-9 pl-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-slate-50 appearance-none cursor-pointer"
                >
                  <option value="all">Svi tehničari ({getTechnicianCount('all')})</option>
                  {technicians.map(tech => (
                    <option key={tech} value={tech}>
                      {tech} ({getTechnicianCount(tech)})
                    </option>
                  ))}
                </select>
                <FilterIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Clear Filters */}
              {(searchTerm || selectedCategory !== 'all' || selectedTechnician !== 'all') && (
                <Button
                  type="tertiary"
                  size="small"
                  onClick={clearAllFilters}
                >
                  Obriši filtere
                </Button>
              )}

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
                        description: 'Opis',
                        serialNumber: 'Serijski broj',
                        location: 'Lokacija'
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
            </div>
          </div>
        </div>

        {/* Modern Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {visibleColumns.description && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Opis
                  </th>
                )}
                {visibleColumns.serialNumber && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Serijski broj
                  </th>
                )}
                {visibleColumns.location && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Lokacija
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-2">
                      <BoxIcon size={48} className="text-slate-300" />
                      <p className="text-sm font-medium">Nema rezultata za prikazivanje</p>
                      {(searchTerm || selectedCategory !== 'all' || selectedTechnician !== 'all') && (
                        <Button
                          type="tertiary"
                          size="small"
                          onClick={clearAllFilters}
                          className="mt-3"
                        >
                          Obriši filtere
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item, index) => (
                  <tr key={item._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    {visibleColumns.description && (
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {item.description}
                      </td>
                    )}
                    {visibleColumns.serialNumber && (
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                        {item.serialNumber}
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-6 py-4">
                        <Button
                          type={item.location === 'magacin' ? 'primary' : 'secondary'}
                          size="small"
                          className="text-xs"
                        >
                          {translateLocation(item.location)}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(VirtualWarehouse);
