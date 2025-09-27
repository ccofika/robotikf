import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPinIcon,
  RefreshIcon,
  DownloadIcon,
  FilterIcon,
  SearchIcon,
  LayersIcon,
  ZoomInIcon,
  ZoomOutIcon,
  AlertTriangleIcon,
  BarChartIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { logsAPI } from '../../services/api';
import { cn } from '../../utils/cn';

// Custom CSS for Leaflet popups to ensure proper z-index
const customStyles = `
  .leaflet-popup-pane {
    z-index: 700 !important;
  }
  .leaflet-popup {
    z-index: 701 !important;
  }
  .leaflet-popup-content-wrapper {
    z-index: 702 !important;
  }
  .leaflet-popup-tip {
    z-index: 703 !important;
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  if (!document.head.querySelector('style[data-leaflet-custom]')) {
    styleElement.setAttribute('data-leaflet-custom', 'true');
    document.head.appendChild(styleElement);
  }
}

// Fix Leaflet default markers
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const InteractiveActivityMap = ({
  data = [],
  loading = false,
  error = null,
  timeRange = '30d',
  onTimeRangeChange,
  onRefresh,
  onExport,
  onLocationClick,
  className = ''
}) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('all');
  const [mapView, setMapView] = useState('heatmap'); // 'heatmap', 'pins', 'clusters'
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState('all');
  const [densityThreshold, setDensityThreshold] = useState('all');

  // Helper functions - must be defined before useMemo
  const getDensityLevel = (activities, totalActivities) => {
    // Use absolute thresholds based on activity count
    if (activities >= 100) return 'high';
    if (activities >= 50) return 'medium';
    if (activities >= 10) return 'low';
    return 'minimal';
  };

  const applyFilters = (data) => {
    let filtered = [...data];

    // Municipality filter
    if (selectedMunicipality !== 'all') {
      filtered = filtered.filter(item =>
        item.municipality === selectedMunicipality || item.municipality?.includes(selectedMunicipality)
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Activity type filter
    if (selectedActivityType !== 'all') {
      filtered = filtered.filter(item =>
        item.activityTypes && item.activityTypes[selectedActivityType] > 0
      );
    }

    // Density threshold filter
    if (densityThreshold !== 'all') {
      filtered = filtered.filter(item => item.density === densityThreshold);
    }

    return filtered;
  };

  const getDensityColor = (density) => {
    switch (density) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      case 'minimal': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getDensityLabel = (density) => {
    switch (density) {
      case 'high': return 'Visoka';
      case 'medium': return 'Srednja';
      case 'low': return 'Niska';
      case 'minimal': return 'Minimalna';
      default: return 'Nepoznato';
    }
  };

  // Create custom icons for different density levels
  const createCustomIcon = (density, count) => {
    const color = density === 'high' ? '#ef4444' :
                  density === 'medium' ? '#f59e0b' :
                  density === 'low' ? '#22c55e' : '#6b7280';

    const size = Math.max(25, Math.min(60, 25 + (count / 5))); // More visible size scaling

    // Debug log for icon creation
    console.log(`🎯 Creating icon: density=${density}, count=${count}, size=${size}, color=${color}`);


    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${(size-4)/2}" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="${size/2}" cy="${size/2}" r="${(size-12)/2}" fill="white" fill-opacity="0.8"/>
          <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-size="${Math.max(8, size/4)}" font-weight="bold" fill="${color}">
            ${count > 999 ? '999+' : count}
          </text>
        </svg>
      `)}`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2]
    });
  };

  // Municipality coordinates will be fetched dynamically from geocoding service
  const [municipalityCoordinates, setMunicipalityCoordinates] = useState({});
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState(null);

  // Fetch municipality coordinates when data changes (DEBOUNCED)
  useEffect(() => {
    console.log('🗺️ InteractiveActivityMap useEffect triggered. Data length:', data?.length);

    // Debounce to prevent React StrictMode double calls and rapid re-renders
    const timeoutId = setTimeout(async () => {
      const fetchMunicipalityCoordinates = async () => {
      if (!data || data.length === 0) {
        // Only reset coordinates if they're not already empty
        if (Object.keys(municipalityCoordinates).length > 0) {
          setMunicipalityCoordinates({});
        }
        return;
      }

      // Extract unique municipalities from data (handle both old and new API formats)
      const uniqueMunicipalities = [...new Set(
        data
          .map(item =>
            // New API format: municipality data with '_id' field
            item._id || item.municipality ||
            // Old API format: activity data with 'municipality' field
            item.location
          )
          .filter(Boolean)
      )];

      if (uniqueMunicipalities.length === 0) {
        return;
      }

      // Check if we already have coordinates for all municipalities
      const missingMunicipalities = uniqueMunicipalities.filter(
        municipality => !municipalityCoordinates[municipality]
      );

      if (missingMunicipalities.length === 0) {
        return; // All municipalities already geocoded
      }

      console.log(`🗺️ Need to geocode ${missingMunicipalities.length} municipalities:`, missingMunicipalities);

      setGeocodingLoading(true);
      setGeocodingError(null);

      try {
        const response = await logsAPI.geocodeMunicipalities(missingMunicipalities);
        const result = response.data;

        if (result.coordinatesMap) {
          // Merge new coordinates with existing ones
          setMunicipalityCoordinates(prev => {
            const newCoordinates = {
              ...prev,
              ...result.coordinatesMap
            };
            console.log(`🗺️ DEBUG: Updated coordinates, now have:`, Object.keys(newCoordinates));
            return newCoordinates;
          });

          console.log(`🗺️ Successfully geocoded ${Object.keys(result.coordinatesMap).length} municipalities`);

          if (result.statistics) {
            console.log(`🗺️ Geocoding stats:`, result.statistics);
          }
        }

      } catch (error) {
        console.error('❌ Error geocoding municipalities:', error);

        // Check if it's a network error (backend not running)
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          console.log('🔧 Backend server not running - using static coordinates');
          setGeocodingError('Backend server not available - using static coordinates');
        } else {
          setGeocodingError(`Failed to geocode municipalities: ${error.message}`);
        }

        // Use static coordinates for Serbian municipalities (OPTIMIZED FALLBACK)
        const staticCoordinates = {
          'Beograd': {
            lat: 44.7866,
            lng: 20.4489,
            region: 'Centralna Srbija',
            displayName: 'Beograd, Serbia',
            type: 'static',
            class: 'city'
          },
          'Novi Sad': {
            lat: 45.2671,
            lng: 19.8335,
            region: 'Vojvodina',
            displayName: 'Novi Sad, Serbia',
            type: 'static',
            class: 'city'
          },
          'Niš': {
            lat: 43.3209,
            lng: 21.8958,
            region: 'Južna Srbija',
            displayName: 'Niš, Serbia',
            type: 'static',
            class: 'city'
          },
          'Kragujevac': {
            lat: 44.0165,
            lng: 20.9114,
            region: 'Centralna Srbija',
            displayName: 'Kragujevac, Serbia',
            type: 'static',
            class: 'city'
          },
          'Subotica': {
            lat: 46.1008,
            lng: 19.6677,
            region: 'Vojvodina',
            displayName: 'Subotica, Serbia',
            type: 'static',
            class: 'city'
          },
          'Zrenjanin': {
            lat: 45.3833,
            lng: 20.3833,
            region: 'Vojvodina',
            displayName: 'Zrenjanin, Serbia',
            type: 'static',
            class: 'city'
          }
        };

        // Set static coordinates for missing municipalities
        const fallbackCoordinates = {};
        missingMunicipalities.forEach(municipality => {
          fallbackCoordinates[municipality] = staticCoordinates[municipality] || {
            lat: 44.7866, // Belgrade center as default
            lng: 20.4489,
            region: 'Nepoznat region',
            displayName: `${municipality}, Serbia`,
            type: 'fallback',
            class: 'fallback'
          };
        });

        setMunicipalityCoordinates(prev => ({
          ...prev,
          ...fallbackCoordinates
        }));

        console.log(`🗺️ Applied static coordinates for ${missingMunicipalities.length} municipalities`);

        // Mark that we tried geocoding so we don't retry immediately
        missingMunicipalities.forEach(municipality => {
          fallbackCoordinates[municipality].geocodingAttempted = true;
        });
      } finally {
        setGeocodingLoading(false);
      }
    };

      fetchMunicipalityCoordinates();
    }, 200); // 200ms debounce

    // Cleanup timeout on unmount or dependency change
    return () => clearTimeout(timeoutId);
  }, [data]); // Re-run when data changes

  // Process map data for visualization
  const mapAnalysis = useMemo(() => {
    console.log(`🗺️ DEBUG: useMemo executing - Available coordinates:`, Object.keys(municipalityCoordinates));
    console.log(`🗺️ DEBUG: useMemo executing - Data length:`, data?.length || 0);

    if (!data.length) return {
      municipalityData: [],
      activityTypes: [],
      heatmapData: [],
      statistics: {},
      regionData: {}
    };

    // Group activities by municipality
    const municipalityGroups = {};
    const activityTypeGroups = {};
    const regionGroups = {};

    // Municipality groups will be created dynamically from data

    // First, extract all unique municipalities from data for geocoding
    const discoveredMunicipalities = new Set();
    data.forEach(municipalityData => {
      const municipality = municipalityData._id || municipalityData.municipality;
      if (municipality) {
        discoveredMunicipalities.add(municipality);
      }
    });

    console.log(`🗺️ DEBUG: Found ${discoveredMunicipalities.size} unique municipalities:`, Array.from(discoveredMunicipalities));

    // Create municipality groups with coordinates from geocoding service
    discoveredMunicipalities.forEach(municipality => {
      const coordinates = municipalityCoordinates[municipality] || {
        lat: 44.7866, // Default to Belgrade center
        lng: 20.4489,
        region: 'Nepoznat region'
      };

      console.log(`🗺️ DEBUG: Creating group for ${municipality} with coordinates:`, coordinates);

      municipalityGroups[municipality] = {
        municipality,
        coordinates,
        totalActivities: 0,
        technicians: new Set(),
        activities: [],
        activityTypes: {},
        averageResponseTime: 0,
        totalResponseTime: 0,
        recentActivities: [],
        urgentActivities: 0,
        completedActivities: 0,
        trend: 0,
        uniqueAddresses: 0,
        uniqueTechnicians: 0
      };
    });

    // Now populate municipality groups with data from backend (NEW API FORMAT)
    data.forEach(municipalityData => {
      const municipality = municipalityData._id || municipalityData.municipality;
      if (!municipality || !municipalityGroups[municipality]) return;

      const group = municipalityGroups[municipality];

      // Populate with backend aggregated data
      group.totalActivities = municipalityData.activities || 0;
      group.technicians = new Set(municipalityData.technicianList || []);
      group.activities = municipalityData.sampleWorkOrders || [];
      group.activityTypes = { 'completed': municipalityData.completed || 0 };
      group.recentActivities = municipalityData.sampleWorkOrders || [];
      group.completedActivities = municipalityData.completed || 0;
      group.uniqueAddresses = municipalityData.uniqueAddresses || 0;
      group.uniqueTechnicians = municipalityData.uniqueTechnicians || 0;
    });

    // Initialize region groups
    const regions = [...new Set(Object.values(municipalityGroups).map(m => m.coordinates.region))];
    regions.forEach(region => {
      regionGroups[region] = {
        region,
        totalActivities: 0,
        municipalities: [],
        technicians: new Set(),
        averageResponseTime: 0
      };
    });

    // Update region data from municipality groups (NEW API FORMAT)
    Object.values(municipalityGroups).forEach(group => {
      const region = group.coordinates.region;

      if (!regionGroups[region]) {
        regionGroups[region] = {
          region,
          totalActivities: 0,
          municipalities: [],
          technicians: new Set(),
          averageResponseTime: 0
        };
      }

      regionGroups[region].totalActivities += group.totalActivities;
      group.technicians.forEach(tech => regionGroups[region].technicians.add(tech));
      if (!regionGroups[region].municipalities.includes(group.municipality)) {
        regionGroups[region].municipalities.push(group.municipality);
      }

      // Update activity type groups
      activityTypeGroups['completed'] = {
        type: 'completed',
        count: (activityTypeGroups['completed']?.count || 0) + group.completedActivities,
        municipalities: (activityTypeGroups['completed']?.municipalities || new Set()).add(group.municipality)
      };
    });

    console.log(`🗺️ DEBUG: Created ${Object.keys(municipalityGroups).length} municipality groups:`, Object.keys(municipalityGroups));
    console.log(`🗺️ DEBUG: Coordinates available for:`, Object.keys(municipalityCoordinates));

    // Calculate averages and finalize data
    const municipalityData = Object.values(municipalityGroups).map(group => ({
      ...group,
      technicians: Array.from(group.technicians),
      averageResponseTime: group.totalActivities > 0 ? group.totalResponseTime / group.totalActivities : 0,
      completionRate: group.totalActivities > 0 ? (group.completedActivities / group.totalActivities) * 100 : 0,
      urgencyRate: group.totalActivities > 0 ? (group.urgentActivities / group.totalActivities) * 100 : 0,
      trend: group.recentActivities.length / Math.max(group.totalActivities - group.recentActivities.length, 1) - 1,
      density: getDensityLevel(group.totalActivities)
    }));

    console.log(`🗺️ DEBUG: Before filter municipalityData count: ${municipalityData.length}`);
    console.log(`🗺️ DEBUG: Before filter activities:`, municipalityData.map(m => ({ name: m.municipality, activities: m.totalActivities })));

    const filteredMunicipalityData = municipalityData.filter(group => group.totalActivities > 0);

    console.log(`🗺️ DEBUG: After filter municipalityData count: ${filteredMunicipalityData.length}`);
    console.log(`🗺️ DEBUG: municipalityData:`, municipalityData.map(m => ({ name: m.municipality, activities: m.totalActivities, coords: m.coordinates })));

    // Create heatmap data
    const heatmapData = filteredMunicipalityData.map(municipality => ({
      lat: municipality.coordinates.lat,
      lng: municipality.coordinates.lng,
      weight: municipality.totalActivities,
      municipality: municipality.municipality,
      density: municipality.density,
      activities: municipality.totalActivities
    }));

    // Finalize region data
    Object.values(regionGroups).forEach(region => {
      region.technicians = Array.from(region.technicians);
      region.municipalities = municipalityData.filter(m => m.coordinates.region === region.region);
      const totalResponseTime = region.municipalities.reduce((sum, m) => sum + m.totalResponseTime, 0);
      const totalActivities = region.municipalities.reduce((sum, m) => sum + m.totalActivities, 0);
      region.averageResponseTime = totalActivities > 0 ? totalResponseTime / totalActivities : 0;
    });

    // Calculate statistics (NEW API FORMAT)
    const totalActivities = data.reduce((sum, municipality) => sum + (municipality.activities || 0), 0);
    const activeMunicipalities = filteredMunicipalityData.length;
    const averageActivitiesPerMunicipality = activeMunicipalities > 0 ? totalActivities / activeMunicipalities : 0;
    const mostActiveMunicipality = filteredMunicipalityData.reduce((max, current) =>
      current.totalActivities > max.totalActivities ? current : max, filteredMunicipalityData[0] || {});

    // Calculate unique technicians from all municipalities
    const allTechnicians = new Set();
    filteredMunicipalityData.forEach(municipality => {
      if (municipality.technicians && Array.isArray(municipality.technicians)) {
        municipality.technicians.forEach(tech => allTechnicians.add(tech));
      }
    });

    const statistics = {
      totalActivities,
      activeMunicipalities,
      averageActivitiesPerMunicipality,
      mostActiveMunicipality: mostActiveMunicipality.municipality || 'N/A',
      totalTechnicians: allTechnicians.size,
      averageResponseTime: filteredMunicipalityData.reduce((sum, m) => sum + m.averageResponseTime, 0) / filteredMunicipalityData.length || 0
    };

    return {
      municipalityData: applyFilters(filteredMunicipalityData),
      activityTypes: Object.values(activityTypeGroups).sort((a, b) => b.count - a.count),
      heatmapData: applyFilters(heatmapData),
      statistics,
      regionData: Object.values(regionGroups)
    };
  }, [data, selectedMunicipality, searchTerm, selectedActivityType, densityThreshold, municipalityCoordinates]);

  const handleLocationClick = useCallback((municipality) => {
    if (onLocationClick) {
      onLocationClick({
        municipality: municipality.municipality,
        coordinates: municipality.coordinates,
        activities: municipality.totalActivities,
        technicians: municipality.technicians,
        responseTime: municipality.averageResponseTime,
        sampleWorkOrders: municipality.activities || [], // Pass the actual work orders
        uniqueAddresses: municipality.uniqueAddresses,
        uniqueTechnicians: municipality.uniqueTechnicians,
        completed: municipality.completedActivities || municipality.totalActivities // All activities are completed since we filter by 'zavrsen'
      });
    }
  }, [onLocationClick]);

  if (loading || geocodingLoading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          {geocodingLoading && (
            <div className="text-sm text-blue-600 mb-4 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Geocoding municipalities...</span>
            </div>
          )}
          <div className="h-80 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || geocodingError) {
    return (
      <div className={cn("bg-white rounded-xl border border-red-200 p-6", className)}>
        <div className="text-center">
          <AlertTriangleIcon size={48} className="text-red-400 mb-4 mx-auto" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju mape</h4>
          <p className="text-slate-600 mb-4">{error || geocodingError}</p>
          {geocodingError && (
            <p className="text-sm text-orange-600 mb-4">
              Geocoding failed, using fallback coordinates. Map may show approximate locations.
            </p>
          )}
          {onRefresh && (
            <Button type="secondary" size="small" onClick={onRefresh} prefix={<RefreshIcon size={16} />}>
              Pokušaj ponovo
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <MapPinIcon size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Interaktivna mapa aktivnosti</h3>
              <p className="text-slate-600 mt-1">Heatmap analiza aktivnosti po lokacijama u Srbiji</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onTimeRangeChange && (
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
              >
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
                <option value="365d">Poslednja godina</option>
              </select>
            )}

            <select
              value={mapView}
              onChange={(e) => setMapView(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
            >
              <option value="heatmap">Heatmap</option>
              <option value="pins">Lokacije</option>
              <option value="clusters">Klasteri</option>
            </select>

            <Button
              type="secondary"
              size="small"
              onClick={() => setShowFilters(!showFilters)}
              prefix={<FilterIcon size={16} />}
            >
              Filteri
            </Button>

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(mapAnalysis)}
                prefix={<DownloadIcon size={16} />}
              >
                Export
              </Button>
            )}

            {onRefresh && (
              <Button
                type="secondary"
                size="small"
                onClick={onRefresh}
                prefix={<RefreshIcon size={16} />}
              >
                Osvježi
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pretraži opštine</label>
                <div className="relative">
                  <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Unesite naziv opštine..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Opština</label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Sve opštine</option>
                  {Object.keys(municipalityCoordinates).map(municipality => (
                    <option key={municipality} value={municipality}>{municipality}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tip aktivnosti</label>
                <select
                  value={selectedActivityType}
                  onChange={(e) => setSelectedActivityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Sve aktivnosti</option>
                  {mapAnalysis.activityTypes.map(type => (
                    <option key={type.type} value={type.type}>{type.type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gustina</label>
                <select
                  value={densityThreshold}
                  onChange={(e) => setDensityThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Sve gustine</option>
                  <option value="high">Visoka gustina</option>
                  <option value="medium">Srednja gustina</option>
                  <option value="low">Niska gustina</option>
                  <option value="minimal">Minimalna gustina</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Overview */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{mapAnalysis.statistics.totalActivities}</div>
            <div className="text-sm text-slate-600">Ukupno aktivnosti</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{mapAnalysis.statistics.activeMunicipalities}</div>
            <div className="text-sm text-slate-600">Aktivne opštine</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{mapAnalysis.statistics.totalTechnicians}</div>
            <div className="text-sm text-slate-600">Ukupno tehničara</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{mapAnalysis.statistics.mostActiveMunicipality}</div>
            <div className="text-sm text-slate-600">Najaktivnija opština</div>
          </div>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="p-6">
        {mapAnalysis.municipalityData.length === 0 ? (
          <div className="text-center py-8">
            <MapPinIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema podataka za mapu</h4>
            <p className="text-slate-600">Nema aktivnosti za izabrani period i filtere.</p>
          </div>
        ) : (
          <div>
            {/* Interactive Leaflet Map */}
            <div className="h-80 rounded-xl border border-slate-200 mb-6 overflow-hidden relative z-0">
              <MapContainer
                center={[44.2619, 20.5819]} // Center of Serbia
                zoom={7}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render markers based on map view */}
                {console.log(`🗺️ DEBUG: Rendering ${mapAnalysis.municipalityData.length} markers in ${mapView} mode`)}
                {mapView === 'heatmap' && mapAnalysis.municipalityData.map((municipality, index) => {
                  // Smaller radius calculation: scale based on activities (6-25 range)
                  const calculatedRadius = Math.max(6, Math.min(25, 6 + (municipality.totalActivities / 8)));
                  console.log(`🎯 Circle for ${municipality.municipality}: activities=${municipality.totalActivities}, radius=${calculatedRadius}`);

                  return (
                  <CircleMarker
                    key={index}
                    center={[municipality.coordinates.lat, municipality.coordinates.lng]}
                    radius={calculatedRadius}
                    fillColor={
                      municipality.density === 'high' ? '#ef4444' :
                      municipality.density === 'medium' ? '#f59e0b' :
                      municipality.density === 'low' ? '#22c55e' : '#6b7280'
                    }
                    color="white"
                    weight={2}
                    opacity={0.8}
                    fillOpacity={0.6}
                    eventHandlers={{
                      click: () => handleLocationClick(municipality)
                    }}
                  >
                    <Popup className="z-50" closeOnClick={true} autoClose={true}>
                      <div className="p-2 relative z-50">
                        <h4 className="font-bold text-sm mb-2">{municipality.municipality}</h4>
                        <div className="text-xs space-y-1">
                          <div><strong>Region:</strong> {municipality.coordinates.region}</div>
                          <div><strong>Aktivnosti:</strong> {municipality.totalActivities}</div>
                          <div><strong>Tehničari:</strong> {municipality.technicians.length}</div>
                          <div><strong>Gustina:</strong> {getDensityLabel(municipality.density)}</div>
                          <div><strong>Prosečno vreme:</strong> {Math.round(municipality.averageResponseTime)} min</div>
                          <div><strong>Završenost:</strong> {municipality.completionRate.toFixed(1)}%</div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                  );
                })}

                {mapView === 'pins' && mapAnalysis.municipalityData.map((municipality, index) => (
                  <Marker
                    key={index}
                    position={[municipality.coordinates.lat, municipality.coordinates.lng]}
                    icon={createCustomIcon(municipality.density, municipality.totalActivities)}
                    eventHandlers={{
                      click: () => handleLocationClick(municipality)
                    }}
                  >
                    <Popup className="z-50" closeOnClick={true} autoClose={true}>
                      <div className="p-2 relative z-50">
                        <h4 className="font-bold text-sm mb-2">{municipality.municipality}</h4>
                        <div className="text-xs space-y-1">
                          <div><strong>Region:</strong> {municipality.coordinates.region}</div>
                          <div><strong>Aktivnosti:</strong> {municipality.totalActivities}</div>
                          <div><strong>Tehničari:</strong> {municipality.technicians.length}</div>
                          <div><strong>Gustina:</strong> {getDensityLabel(municipality.density)}</div>
                          <div><strong>Prosečno vreme:</strong> {Math.round(municipality.averageResponseTime)} min</div>
                          <div><strong>Završenost:</strong> {municipality.completionRate.toFixed(1)}%</div>

                          {/* Activity types breakdown */}
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="font-medium">Tipovi aktivnosti:</div>
                            {Object.entries(municipality.activityTypes).slice(0, 3).map(([type, count]) => (
                              <div key={type} className="flex justify-between">
                                <span>{type}:</span> <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {mapView === 'clusters' && mapAnalysis.regionData.filter(region => region.totalActivities > 0).map((region, index) => {
                  // Use the first municipality's coordinates as region center
                  const regionCenter = region.municipalities.length > 0 ?
                    [region.municipalities[0].coordinates.lat, region.municipalities[0].coordinates.lng] :
                    [44.2619, 20.5819];

                  const regionRadius = Math.max(8, Math.min(20, 8 + (region.totalActivities / 15)));
                  console.log(`🎯 Region circle for ${region.region}: activities=${region.totalActivities}, radius=${regionRadius}`);

                  return (
                    <CircleMarker
                      key={index}
                      center={regionCenter}
                      radius={regionRadius}
                      fillColor="#3b82f6"
                      color="#1d4ed8"
                      weight={3}
                      opacity={0.8}
                      fillOpacity={0.3}
                    >
                      <Popup className="z-50" closeOnClick={true} autoClose={true}>
                        <div className="p-2 relative z-50">
                          <h4 className="font-bold text-sm mb-2">{region.region}</h4>
                          <div className="text-xs space-y-1">
                            <div><strong>Ukupne aktivnosti:</strong> {region.totalActivities}</div>
                            <div><strong>Opštine:</strong> {region.municipalities.length}</div>
                            <div><strong>Tehničari:</strong> {region.technicians.length}</div>
                            <div><strong>Prosečno vreme:</strong> {Math.round(region.averageResponseTime)} min</div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="font-medium text-xs mb-1">Opštine u regionu:</div>
                            {region.municipalities.slice(0, 5).map(municipality => (
                              <div key={municipality.municipality} className="text-xs flex justify-between">
                                <span>{municipality.municipality}</span>
                                <span>{municipality.totalActivities}</span>
                              </div>
                            ))}
                            {region.municipalities.length > 5 && (
                              <div className="text-xs text-slate-500">
                                +{region.municipalities.length - 5} više...
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {/* Custom map controls overlay */}
                <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
                  <div className="bg-white rounded-lg shadow-md p-3">
                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Legenda</h5>
                    <div className="space-y-2">
                      {['high', 'medium', 'low', 'minimal'].map(density => (
                        <div key={density} className="flex items-center space-x-2 text-xs">
                          <div className={cn("w-3 h-3 rounded-full", getDensityColor(density))}></div>
                          <span>{getDensityLabel(density)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                      Prikaz: {mapView === 'heatmap' ? 'Heatmap' : mapView === 'pins' ? 'Lokacije' : 'Klasteri'}
                    </div>
                  </div>
                </div>
              </MapContainer>
            </div>

            {/* Municipality Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {mapAnalysis.municipalityData.slice(0, 6).map((municipality) => (
                <div
                  key={municipality.municipality}
                  className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => handleLocationClick(municipality)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={cn("w-3 h-3 rounded-full", getDensityColor(municipality.density))}></div>
                      <h4 className="font-semibold text-slate-900">{municipality.municipality}</h4>
                    </div>
                    <div className="text-xs text-slate-500">{municipality.coordinates.region}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <BarChartIcon size={14} className="text-blue-600" />
                      <span className="text-slate-600">Aktivnosti:</span>
                      <span className="font-semibold">{municipality.totalActivities}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <UsersIcon size={14} className="text-green-600" />
                      <span className="text-slate-600">Tehničari:</span>
                      <span className="font-semibold">{municipality.technicians.length}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ClockIcon size={14} className="text-orange-600" />
                      <span className="text-slate-600">Prosek:</span>
                      <span className="font-semibold">{Math.round(municipality.averageResponseTime)}min</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUpIcon size={14} className={municipality.trend > 0 ? "text-green-600" : "text-red-600"} />
                      <span className="text-slate-600">Trend:</span>
                      <span className={cn(
                        "font-semibold",
                        municipality.trend > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {municipality.trend > 0 ? '+' : ''}{(municipality.trend * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Završeno: {municipality.completionRate.toFixed(1)}%</span>
                      <span>Hitno: {municipality.urgencyRate.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-green-500 rounded-full h-1.5 transition-all duration-500"
                        style={{ width: `${municipality.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Region Summary */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Pregled po regionima</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mapAnalysis.regionData.filter(region => region.totalActivities > 0).map(region => (
                  <div key={region.region} className="bg-white rounded-lg p-3 border border-slate-200">
                    <h5 className="font-medium text-slate-900 mb-2">{region.region}</h5>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Aktivnosti:</span>
                        <span className="font-semibold">{region.totalActivities}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Opštine:</span>
                        <span className="font-semibold">{region.municipalities.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tehničari:</span>
                        <span className="font-semibold">{region.technicians.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prosečno vreme:</span>
                        <span className="font-semibold">{Math.round(region.averageResponseTime)}min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveActivityMap;