import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Download, Funnel, Search, TriangleAlert, ChartColumn, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cx, Btn, Led } from '../../security/sx/ui';
import { Panel, Note, Stat, KV } from '../../security/sx/layout';
import { Field, Select } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';
import { logsAPI } from '../../services/api';

// Boje gustine iz tokena (alarm, upozorenje, ok, siva); leaflet i SVG ikonica traže upisanu boju
const DENSITY_HEX = { high: '#e5484d', medium: '#f5a524', low: '#1e9e53', minimal: '#a1a1a1' };
const ACCENT_HEX = '#0072f5';
const ACCENT_TEXT_HEX = '#0062d1';

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
    const color = DENSITY_HEX[density] || DENSITY_HEX.minimal;

    const size = Math.max(25, Math.min(60, 25 + (count / 5))); // More visible size scaling

    // Debug log for icon creation
    console.log(`🎯 Creating icon: density=${density}, count=${count}, size=${size}, color=${color}`);


    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${(size-4)/2}" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="${size/2}" cy="${size/2}" r="${(size-12)/2}" fill="white" fill-opacity="0.9"/>
          <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="${Math.max(8, size/4)}" font-weight="600" fill="#171717">
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


  // Sadržaj oblačića opštine (isti za oba prikaza)
  const municipalityKV = (municipality) => [
    { k: 'Region', v: municipality.coordinates.region },
    { k: 'Aktivnosti', v: municipality.totalActivities },
    { k: 'Tehničari', v: municipality.technicians.length },
    { k: 'Gustina', v: getDensityLabel(municipality.density) },
    { k: 'Prosečno vreme', v: `${Math.round(municipality.averageResponseTime)} min` },
    { k: 'Završenost', v: `${municipality.completionRate.toFixed(1)}%` }
  ];

  if (loading || geocodingLoading) {
    return (
      <div className="mx-logdash-sec">
        {geocodingLoading && (
          <span className="mx-logdash-geo">
            <Led tone="info" live />
            <span>Geocoding municipalities...</span>
          </span>
        )}
        <Loading rows={1} h={320} />
        <Loading rows={2} h={56} />
      </div>
    );
  }

  if (error || geocodingError) {
    return (
      <Note tone="bad" icon={TriangleAlert} actions={onRefresh && (
        <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Pokušaj ponovo</Btn>
      )}>
        <h4 className="mx-logdash-note__title">Greška pri učitavanju mape</h4>
        <p>{error || geocodingError}</p>
        {geocodingError && (
          <p className="mx-logdash-geo__warn">
            Geocoding failed, using fallback coordinates. Map may show approximate locations.
          </p>
        )}
      </Note>
    );
  }

  return (
    <div className={cx('mx-logdash-sec', className)}>
      {/* Zaglavlje */}
      <div className="mx-logdash-sec__head">
        <div className="mx-logdash-sec__titles">
          <h3 className="mx-logdash-sec__title">Interaktivna mapa aktivnosti</h3>
          <p className="mx-logdash-sec__lead">Heatmap analiza aktivnosti po lokacijama u Srbiji</p>
        </div>

        <div className="mx-logdash-sec__tools">
          {onTimeRangeChange && (
            <Select size="sm" value={timeRange} onChange={(e) => onTimeRangeChange(e.target.value)} aria-label="Period">
              <option value="7d">Poslednja 7 dana</option>
              <option value="30d">Poslednja 30 dana</option>
              <option value="90d">Poslednja 3 meseca</option>
              <option value="180d">Poslednja 6 meseci</option>
              <option value="365d">Poslednja godina</option>
            </Select>
          )}

          <Select size="sm" value={mapView} onChange={(e) => setMapView(e.target.value)} aria-label="Prikaz mape">
            <option value="heatmap">Heatmap</option>
            <option value="pins">Lokacije</option>
            <option value="clusters">Klasteri</option>
          </Select>

          <Btn size="sm" icon={Funnel} onClick={() => setShowFilters(!showFilters)} aria-pressed={showFilters}>
            Filteri
          </Btn>

          {onExport && (
            <Btn size="sm" icon={Download} onClick={() => onExport(mapAnalysis)}>Export</Btn>
          )}

          {onRefresh && (
            <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Osvježi</Btn>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Panel>
          <div className="sx-form">
            <Field label="Pretraži opštine" htmlFor="mx-logdash-map-q">
              <div className="sx-search">
                <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
                <input
                  id="mx-logdash-map-q"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Unesite naziv opštine..."
                />
              </div>
            </Field>

            <Field label="Opština" htmlFor="mx-logdash-map-mun">
              <Select id="mx-logdash-map-mun" value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)}>
                <option value="all">Sve opštine</option>
                {Object.keys(municipalityCoordinates).map(municipality => (
                  <option key={municipality} value={municipality}>{municipality}</option>
                ))}
              </Select>
            </Field>

            <Field label="Tip aktivnosti" htmlFor="mx-logdash-map-type">
              <Select id="mx-logdash-map-type" value={selectedActivityType} onChange={(e) => setSelectedActivityType(e.target.value)}>
                <option value="all">Sve aktivnosti</option>
                {mapAnalysis.activityTypes.map(type => (
                  <option key={type.type} value={type.type}>{type.type}</option>
                ))}
              </Select>
            </Field>

            <Field label="Gustina" htmlFor="mx-logdash-map-density">
              <Select id="mx-logdash-map-density" value={densityThreshold} onChange={(e) => setDensityThreshold(e.target.value)}>
                <option value="all">Sve gustine</option>
                <option value="high">Visoka gustina</option>
                <option value="medium">Srednja gustina</option>
                <option value="low">Niska gustina</option>
                <option value="minimal">Minimalna gustina</option>
              </Select>
            </Field>
          </div>
        </Panel>
      )}

      {/* Statistics Overview */}
      <div className="sx-stats">
        <Stat label="Ukupno aktivnosti" value={mapAnalysis.statistics.totalActivities} />
        <Stat label="Aktivne opštine" value={mapAnalysis.statistics.activeMunicipalities} />
        <Stat label="Ukupno tehničara" value={mapAnalysis.statistics.totalTechnicians} />
        <Stat label="Najaktivnija opština" value={<span className="mx-logdash-stat-text">{mapAnalysis.statistics.mostActiveMunicipality}</span>} />
      </div>

      {/* Map Visualization */}
      {mapAnalysis.municipalityData.length === 0 ? (
        <Panel>
          <div className="sx-empty-block">
            <h4>Nema podataka za mapu</h4>
            <span>Nema aktivnosti za izabrani period i filtere.</span>
          </div>
        </Panel>
      ) : (
        <>
          {/* Interactive Leaflet Map */}
          <Panel pad={false} className="mx-logdash-mappanel">
            <div className="mx-logdash-map">
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
                    fillColor={DENSITY_HEX[municipality.density] || DENSITY_HEX.minimal}
                    color="white"
                    weight={2}
                    opacity={0.9}
                    fillOpacity={0.7}
                    eventHandlers={{
                      click: () => handleLocationClick(municipality)
                    }}
                  >
                    <Popup closeOnClick={true} autoClose={true}>
                      <div className="mx-logdash-pop">
                        <h4 className="mx-logdash-pop__title">{municipality.municipality}</h4>
                        <KV items={municipalityKV(municipality)} />
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
                    <Popup closeOnClick={true} autoClose={true}>
                      <div className="mx-logdash-pop">
                        <h4 className="mx-logdash-pop__title">{municipality.municipality}</h4>
                        <KV items={municipalityKV(municipality)} />

                        {/* Activity types breakdown */}
                        <div className="mx-logdash-pop__sub">
                          <b>Tipovi aktivnosti:</b>
                          {Object.entries(municipality.activityTypes).slice(0, 3).map(([type, count]) => (
                            <div key={type} className="mx-logdash-pop__row">
                              <span>{type}:</span> <span className="sx-mono">{count}</span>
                            </div>
                          ))}
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
                      fillColor={ACCENT_HEX}
                      color={ACCENT_TEXT_HEX}
                      weight={3}
                      opacity={0.8}
                      fillOpacity={0.3}
                    >
                      <Popup closeOnClick={true} autoClose={true}>
                        <div className="mx-logdash-pop">
                          <h4 className="mx-logdash-pop__title">{region.region}</h4>
                          <KV items={[
                            { k: 'Ukupne aktivnosti', v: region.totalActivities },
                            { k: 'Opštine', v: region.municipalities.length },
                            { k: 'Tehničari', v: region.technicians.length },
                            { k: 'Prosečno vreme', v: `${Math.round(region.averageResponseTime)} min` }
                          ]} />

                          <div className="mx-logdash-pop__sub">
                            <b>Opštine u regionu:</b>
                            {region.municipalities.slice(0, 5).map(municipality => (
                              <div key={municipality.municipality} className="mx-logdash-pop__row">
                                <span>{municipality.municipality}</span>
                                <span className="sx-mono">{municipality.totalActivities}</span>
                              </div>
                            ))}
                            {region.municipalities.length > 5 && (
                              <div className="mx-logdash-pop__more">
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
                <div className="leaflet-top leaflet-right">
                  <div className="mx-logdash-legendbox">
                    <h5>Legenda</h5>
                    <div className="mx-logdash-legendbox__list">
                      {['high', 'medium', 'low', 'minimal'].map(density => (
                        <span key={density} className="mx-logdash-dotlabel">
                          <span className={cx('mx-logdash-dot', `is-${density}`)} />
                          <span>{getDensityLabel(density)}</span>
                        </span>
                      ))}
                    </div>
                    <div className="mx-logdash-legendbox__foot">
                      Prikaz: {mapView === 'heatmap' ? 'Heatmap' : mapView === 'pins' ? 'Lokacije' : 'Klasteri'}
                    </div>
                  </div>
                </div>
              </MapContainer>
            </div>
          </Panel>

          {/* Municipality Cards Grid */}
          <div className="mx-logdash-places">
            {mapAnalysis.municipalityData.slice(0, 6).map((municipality, i) => (
              <div
                key={municipality.municipality}
                role="button"
                tabIndex={0}
                className="sx-card mx-logdash-place"
                style={{ '--i': i }}
                onClick={() => handleLocationClick(municipality)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLocationClick(municipality); } }}
              >
                <div className="mx-logdash-place__head">
                  <div className="mx-logdash-place__name">
                    <h4>{municipality.municipality}</h4>
                    <span className="mx-logdash-dotlabel">
                      <span className={cx('mx-logdash-dot', `is-${municipality.density}`)} />
                      <span>{getDensityLabel(municipality.density)}</span>
                    </span>
                  </div>
                  <div className="mx-logdash-place__region">{municipality.coordinates.region}</div>
                </div>

                <div className="mx-logdash-place__grid">
                  <span><ChartColumn size={14} strokeWidth={1.9} aria-hidden="true" />Aktivnosti:<b>{municipality.totalActivities}</b></span>
                  <span><Users size={14} strokeWidth={1.9} aria-hidden="true" />Tehničari:<b>{municipality.technicians.length}</b></span>
                  <span><Clock size={14} strokeWidth={1.9} aria-hidden="true" />Prosek:<b>{Math.round(municipality.averageResponseTime)}min</b></span>
                  <span>
                    {municipality.trend > 0
                      ? <TrendingUp size={14} strokeWidth={1.9} aria-hidden="true" className="mx-logdash-trend is-good" />
                      : <TrendingDown size={14} strokeWidth={1.9} aria-hidden="true" className="mx-logdash-trend is-bad" />}
                    Trend:<b className={municipality.trend > 0 ? 'mx-logdash-trend is-good' : 'mx-logdash-trend is-bad'}>
                      {municipality.trend > 0 ? '+' : ''}{(municipality.trend * 100).toFixed(1)}%
                    </b>
                  </span>
                </div>

                <div className="mx-logdash-place__foot">
                  <div>
                    <span>Završeno: {municipality.completionRate.toFixed(1)}%</span>
                    <span>Hitno: {municipality.urgencyRate.toFixed(1)}%</span>
                  </div>
                  <div className="mx-logdash-meter is-ok" aria-hidden="true">
                    <i style={{ width: `${municipality.completionRate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Region Summary */}
          <Panel pad={false} title="Pregled po regionima">
            <div className="sx-tablewrap">
              <table className="sx-table">
                <thead>
                  <tr>
                    <th><span className="sx-sr">Region</span></th>
                    <th className="is-num">Aktivnosti</th>
                    <th className="is-num">Opštine</th>
                    <th className="is-num">Tehničari</th>
                    <th className="is-num">Prosečno vreme</th>
                  </tr>
                </thead>
                <tbody>
                  {mapAnalysis.regionData.filter(region => region.totalActivities > 0).map((region, i) => (
                    <tr key={region.region} style={{ '--i': i }}>
                      <td className="is-head"><div className="sx-cell"><b>{region.region}</b></div></td>
                      <td data-label="Aktivnosti" className="is-num">{region.totalActivities}</td>
                      <td data-label="Opštine" className="is-num">{region.municipalities.length}</td>
                      <td data-label="Tehničari" className="is-num">{region.technicians.length}</td>
                      <td data-label="Prosečno vreme" className="is-num">{Math.round(region.averageResponseTime)}min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};

export default InteractiveActivityMap;
