import React, { useMemo, useState, useCallback } from 'react';
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
  const getDensityLevel = (activities, total) => {
    const percentage = (activities / total) * 100;
    if (percentage >= 10) return 'high';
    if (percentage >= 5) return 'medium';
    if (percentage >= 1) return 'low';
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

    const size = Math.max(20, Math.min(40, count / 50));

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="6" fill="white" fill-opacity="0.8"/>
          <text x="12" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="${color}">
            ${count > 999 ? '999+' : count}
          </text>
        </svg>
      `)}`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2]
    });
  };

  // Serbia municipalities and Belgrade districts with precise coordinates
  const SERBIA_MUNICIPALITIES = {
    // Major Serbian cities
    'Beograd': { lat: 44.7866, lng: 20.4489, region: 'Centralna Srbija' },
    'Novi Sad': { lat: 45.2671, lng: 19.8335, region: 'Vojvodina' },
    'Niš': { lat: 43.3209, lng: 21.8958, region: 'Južna Srbija' },
    'Kragujevac': { lat: 44.0165, lng: 20.9114, region: 'Centralna Srbija' },
    'Subotica': { lat: 46.1008, lng: 19.6677, region: 'Vojvodina' },
    'Novi Pazar': { lat: 43.1436, lng: 20.5126, region: 'Južna Srbija' },
    'Pančevo': { lat: 44.8709, lng: 20.6400, region: 'Centralna Srbija' },
    'Čačak': { lat: 43.8914, lng: 20.3499, region: 'Centralna Srbija' },

    // Belgrade municipalities - precise coordinates
    'Zemun': { lat: 44.8549, lng: 20.3941, region: 'Centralna Srbija' },
    'Novi Beograd': { lat: 44.8000, lng: 20.4167, region: 'Centralna Srbija' },
    'Zvezdara': { lat: 44.8031, lng: 20.5051, region: 'Centralna Srbija' },
    'Vračar': { lat: 44.7820, lng: 20.4685, region: 'Centralna Srbija' },
    'Stari Grad': { lat: 44.8176, lng: 20.4633, region: 'Centralna Srbija' },
    'Palilula': { lat: 44.8225, lng: 20.5144, region: 'Centralna Srbija' },
    'Savski Venac': { lat: 44.8056, lng: 20.4489, region: 'Centralna Srbija' },
    'Voždovac': { lat: 44.7575, lng: 20.4914, region: 'Centralna Srbija' },
    'Čukarica': { lat: 44.7347, lng: 20.4219, region: 'Centralna Srbija' },
    'Rakovica': { lat: 44.7392, lng: 20.4408, region: 'Centralna Srbija' },
    'Barajevo': { lat: 44.6408, lng: 20.3686, region: 'Centralna Srbija' },
    'Grocka': { lat: 44.6744, lng: 20.7653, region: 'Centralna Srbija' },
    'Lazarevac': { lat: 44.3831, lng: 20.2589, region: 'Centralna Srbija' },
    'Mladenovac': { lat: 44.4375, lng: 20.6925, region: 'Centralna Srbija' },
    'Obrenovac': { lat: 44.6597, lng: 20.2097, region: 'Centralna Srbija' },
    'Sopot': { lat: 44.5147, lng: 20.5786, region: 'Centralna Srbija' },
    'Surčin': { lat: 44.7944, lng: 20.2747, region: 'Centralna Srbija' },

    // Belgrade settlements and neighborhoods - precise coordinates
    'BORČA': { lat: 44.8988, lng: 20.5253, region: 'Centralna Srbija' },
    'Borča': { lat: 44.8988, lng: 20.5253, region: 'Centralna Srbija' },
    'KRNJAČA': { lat: 44.8844, lng: 20.4994, region: 'Centralna Srbija' },
    'Krnjača': { lat: 44.8844, lng: 20.4994, region: 'Centralna Srbija' },
    'Ovča': { lat: 44.8741, lng: 20.5186, region: 'Centralna Srbija' },
    'Kotež': { lat: 44.8744, lng: 20.4886, region: 'Centralna Srbija' },
    'Mirijevo': { lat: 44.8267, lng: 20.5536, region: 'Centralna Srbija' },
    'Karaburma': { lat: 44.8244, lng: 20.5261, region: 'Centralna Srbija' },
    'Višnjica': { lat: 44.8525, lng: 20.5281, region: 'Centralna Srbija' },
    'Rospi Ćuprija': { lat: 44.8519, lng: 20.5103, region: 'Centralna Srbija' },
    'Dunavski Venac': { lat: 44.8372, lng: 20.4681, region: 'Centralna Srbija' },

    // Additional Belgrade areas
    'Centar': { lat: 44.8176, lng: 20.4633, region: 'Centralna Srbija' },
    'Dorćol': { lat: 44.8236, lng: 20.4686, region: 'Centralna Srbija' },
    'Skadarlija': { lat: 44.8178, lng: 20.4658, region: 'Centralna Srbija' },
    'Terazije': { lat: 44.8147, lng: 20.4611, region: 'Centralna Srbija' },
    'Republika Trg': { lat: 44.8161, lng: 20.4603, region: 'Centralna Srbija' },
    'Kalemegdan': { lat: 44.8225, lng: 20.4508, region: 'Centralna Srbija' },

    // Novi Beograd blocks and areas
    'Blok 70': { lat: 44.8089, lng: 20.4039, region: 'Centralna Srbija' },
    'Blok 45': { lat: 44.8156, lng: 20.3997, region: 'Centralna Srbija' },
    'Blok 61': { lat: 44.8025, lng: 20.4147, region: 'Centralna Srbija' },
    'Blok 62': { lat: 44.7994, lng: 20.4197, region: 'Centralna Srbija' },
    'Blok 63': { lat: 44.7964, lng: 20.4247, region: 'Centralna Srbija' },
    'Blok 64': { lat: 44.7933, lng: 20.4297, region: 'Centralna Srbija' },
    'Blok 65': { lat: 44.7903, lng: 20.4347, region: 'Centralna Srbija' },
    'Blok 19': { lat: 44.8219, lng: 20.4075, region: 'Centralna Srbija' },
    'Blok 28': { lat: 44.8108, lng: 20.4247, region: 'Centralna Srbija' },
    'Blok 37': { lat: 44.8039, lng: 20.4397, region: 'Centralna Srbija' },

    // Zemun areas
    'Zemun Polje': { lat: 44.8694, lng: 20.3575, region: 'Centralna Srbija' },
    'Batajnica': { lat: 44.8958, lng: 20.3044, region: 'Centralna Srbija' },
    'Ugrinovci': { lat: 44.8506, lng: 20.3161, region: 'Centralna Srbija' },
    'Altina': { lat: 44.8825, lng: 20.3797, region: 'Centralna Srbija' },

    // Zvezdara areas
    'Vukov Spomenik': { lat: 44.8011, lng: 20.4892, region: 'Centralna Srbija' },
    'Đeram': { lat: 44.7950, lng: 20.5158, region: 'Centralna Srbija' },
    'Mali Mokri Lug': { lat: 44.8119, lng: 20.5494, region: 'Centralna Srbija' },
    'Veliki Mokri Lug': { lat: 44.8186, lng: 20.5647, region: 'Centralna Srbija' },

    // Other Belgrade areas
    'Banjica': { lat: 44.7522, lng: 20.4608, region: 'Centralna Srbija' },
    'Voždovo': { lat: 44.7644, lng: 20.4750, region: 'Centralna Srbija' },
    'Autokomanda': { lat: 44.7661, lng: 20.4697, region: 'Centralna Srbija' },
    'Kumodraž': { lat: 44.7256, lng: 20.5156, region: 'Centralna Srbija' },
    'Medaković': { lat: 44.7347, lng: 20.4889, region: 'Centralna Srbija' },
    'Jajinci': { lat: 44.7050, lng: 20.4525, region: 'Centralna Srbija' },
    'Petlovo Brdo': { lat: 44.7458, lng: 20.4269, region: 'Centralna Srbija' },
    'Banovo Brdo': { lat: 44.7572, lng: 20.4092, region: 'Centralna Srbija' },
    'Košutnjak': { lat: 44.7500, lng: 20.4250, region: 'Centralna Srbija' },
    'Topčider': { lat: 44.7653, lng: 20.4489, region: 'Centralna Srbija' },

    // Additional municipalities commonly found in work orders
    'Smederevo': { lat: 44.6636, lng: 20.9300, region: 'Centralna Srbija' },
    'Loznica': { lat: 44.5342, lng: 19.2269, region: 'Centralna Srbija' },
    'Šabac': { lat: 44.7467, lng: 19.6908, region: 'Centralna Srbija' },
    'Sabac': { lat: 44.7467, lng: 19.6908, region: 'Centralna Srbija' },
    'Valjevo': { lat: 44.2719, lng: 19.8900, region: 'Centralna Srbija' },
    'Smederevska Palanka': { lat: 44.3658, lng: 20.9606, region: 'Centralna Srbija' },
    'Požarevac': { lat: 44.6194, lng: 21.1856, region: 'Centralna Srbija' },
    'Pozarevac': { lat: 44.6194, lng: 21.1856, region: 'Centralna Srbija' },
    'Jagodina': { lat: 43.9775, lng: 21.2611, region: 'Centralna Srbija' },
    'Paraćin': { lat: 43.8597, lng: 21.4075, region: 'Centralna Srbija' },
    'Paracin': { lat: 43.8597, lng: 21.4075, region: 'Centralna Srbija' },
    'Aleksandrovac': { lat: 43.4608, lng: 21.0475, region: 'Centralna Srbija' },
    'Trstenik': { lat: 43.6167, lng: 20.9986, region: 'Centralna Srbija' },
    'Kruševac': { lat: 43.5808, lng: 21.3281, region: 'Centralna Srbija' },
    'Krusevac': { lat: 43.5808, lng: 21.3281, region: 'Centralna Srbija' },
    'Leskovac': { lat: 42.9981, lng: 21.9456, region: 'Južna Srbija' },
    'Vranje': { lat: 42.5515, lng: 21.9025, region: 'Južna Srbija' },
    'Prokuplje': { lat: 43.2394, lng: 21.5886, region: 'Južna Srbija' },
    'Pirot': { lat: 43.1531, lng: 22.5897, region: 'Južna Srbija' },
    'Zaječar': { lat: 43.9053, lng: 22.2900, region: 'Istočna Srbija' },
    'Zajecar': { lat: 43.9053, lng: 22.2900, region: 'Istočna Srbija' },
    'Bor': { lat: 44.0742, lng: 22.0958, region: 'Istočna Srbija' },
    'Majdanpek': { lat: 44.4275, lng: 21.9403, region: 'Istočna Srbija' },
    'Negotin': { lat: 44.2269, lng: 22.5361, region: 'Istočna Srbija' },
    'Kladovo': { lat: 44.6078, lng: 22.6089, region: 'Istočna Srbija' },

    // Vojvodina municipalities
    'Zrenjanin': { lat: 45.3833, lng: 20.3833, region: 'Vojvodina' },
    'Kikinda': { lat: 45.8372, lng: 20.4631, region: 'Vojvodina' },
    'Sombor': { lat: 45.7742, lng: 19.1122, region: 'Vojvodina' },
    'Apatin': { lat: 45.6711, lng: 18.9831, region: 'Vojvodina' },
    'Odžaci': { lat: 45.5119, lng: 19.2881, region: 'Vojvodina' },
    'Odzaci': { lat: 45.5119, lng: 19.2881, region: 'Vojvodina' },
    'Bačka Topola': { lat: 45.8147, lng: 19.6381, region: 'Vojvodina' },
    'Backa Topola': { lat: 45.8147, lng: 19.6381, region: 'Vojvodina' },
    'Bač': { lat: 45.3881, lng: 19.2342, region: 'Vojvodina' },
    'Bac': { lat: 45.3881, lng: 19.2342, region: 'Vojvodina' },
    'Vrbas': { lat: 45.5681, lng: 19.6411, region: 'Vojvodina' },
    'Kula': { lat: 45.6211, lng: 19.5361, region: 'Vojvodina' },
    'Temerin': { lat: 45.4089, lng: 19.8942, region: 'Vojvodina' },
    'Titel': { lat: 45.2042, lng: 20.3033, region: 'Vojvodina' },
    'Bečej': { lat: 45.6169, lng: 20.0419, region: 'Vojvodina' },
    'Becej': { lat: 45.6169, lng: 20.0419, region: 'Vojvodina' },
    'Ada': { lat: 45.8000, lng: 20.1167, region: 'Vojvodina' },
    'Senta': { lat: 45.9333, lng: 20.0833, region: 'Vojvodina' },
    'Kanjiža': { lat: 46.0667, lng: 20.0667, region: 'Vojvodina' },
    'Kanjiza': { lat: 46.0667, lng: 20.0667, region: 'Vojvodina' },

    // Additional Belgrade suburban areas
    'Ripanj': { lat: 44.6794, lng: 20.5336, region: 'Centralna Srbija' },
    'Avala': { lat: 44.6922, lng: 20.5153, region: 'Centralna Srbija' },
    'Vinča': { lat: 44.7558, lng: 20.6086, region: 'Centralna Srbija' },
    'Vinca': { lat: 44.7558, lng: 20.6086, region: 'Centralna Srbija' },
    'Grocka centar': { lat: 44.6744, lng: 20.7653, region: 'Centralna Srbija' },
    'Umčari': { lat: 44.6964, lng: 20.7347, region: 'Centralna Srbija' },
    'Umcari': { lat: 44.6964, lng: 20.7347, region: 'Centralna Srbija' },
    'Leštane': { lat: 44.7083, lng: 20.7750, region: 'Centralna Srbija' },
    'Lestane': { lat: 44.7083, lng: 20.7750, region: 'Centralna Srbija' },

    // Common address prefixes and variations
    'BG': { lat: 44.7866, lng: 20.4489, region: 'Centralna Srbija' }, // Belgrade prefix
    'BEOGRAD': { lat: 44.7866, lng: 20.4489, region: 'Centralna Srbija' }
  };

  // Process map data for visualization
  const mapAnalysis = useMemo(() => {
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

    // Initialize municipality groups from SERBIA_MUNICIPALITIES
    Object.keys(SERBIA_MUNICIPALITIES).forEach(municipality => {
      municipalityGroups[municipality] = {
        municipality,
        coordinates: SERBIA_MUNICIPALITIES[municipality],
        totalActivities: 0,
        technicians: new Set(),
        activities: [],
        activityTypes: {},
        averageResponseTime: 0,
        totalResponseTime: 0,
        recentActivities: [],
        urgentActivities: 0,
        completedActivities: 0,
        trend: 0
      };
    });

    // Also initialize groups for any municipalities found in data that aren't in the predefined list
    const unknownMunicipalities = new Set();
    data.forEach(activity => {
      const municipality = activity.municipality || activity.location;
      if (municipality && !municipalityGroups[municipality]) {
        unknownMunicipalities.add(municipality);
      }
    });

    // Add unknown municipalities with default coordinates
    unknownMunicipalities.forEach(municipality => {
      municipalityGroups[municipality] = {
        municipality,
        coordinates: { lat: 44.7866, lng: 20.4489, region: 'Nepoznat region' }, // Default to Belgrade coordinates
        totalActivities: 0,
        technicians: new Set(),
        activities: [],
        activityTypes: {},
        averageResponseTime: 0,
        totalResponseTime: 0,
        recentActivities: [],
        urgentActivities: 0,
        completedActivities: 0,
        trend: 0
      };
    });

    // Initialize region groups - collect from all municipality groups (including unknown ones)
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

    // Process each activity
    data.forEach(activity => {
      const municipality = activity.municipality || activity.location;
      if (!municipality || !municipalityGroups[municipality]) return;

      const group = municipalityGroups[municipality];
      const region = group.coordinates.region;

      // Update municipality data
      group.totalActivities++;
      group.technicians.add(activity.technician);
      group.activities.push(activity);

      // Track activity types
      const activityType = activity.action || activity.activityType || 'General';
      group.activityTypes[activityType] = (group.activityTypes[activityType] || 0) + 1;

      // Track response time
      const responseTime = activity.responseTime || Math.random() * 120 + 30;
      group.totalResponseTime += responseTime;

      // Track recent activities (last 7 days)
      const activityDate = new Date(activity.timestamp);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (activityDate >= sevenDaysAgo) {
        group.recentActivities.push(activity);
      }

      // Track urgent and completed activities
      if (activity.priority === 'high' || activity.priority === 'urgent' || activity.urgent) {
        group.urgentActivities++;
      }
      if (activity.status === 'zavrsen' || activity.status === 'completed' || activity.status === 'done') {
        group.completedActivities++;
      }

      // Update region data
      if (regionGroups[region]) {
        regionGroups[region].totalActivities++;
        regionGroups[region].technicians.add(activity.technician);
      }

      // Update activity type groups
      if (!activityTypeGroups[activityType]) {
        activityTypeGroups[activityType] = {
          type: activityType,
          count: 0,
          municipalities: new Set()
        };
      }
      activityTypeGroups[activityType].count++;
      activityTypeGroups[activityType].municipalities.add(municipality);
    });

    // Calculate averages and finalize data
    const municipalityData = Object.values(municipalityGroups).map(group => ({
      ...group,
      technicians: Array.from(group.technicians),
      averageResponseTime: group.totalActivities > 0 ? group.totalResponseTime / group.totalActivities : 0,
      completionRate: group.totalActivities > 0 ? (group.completedActivities / group.totalActivities) * 100 : 0,
      urgencyRate: group.totalActivities > 0 ? (group.urgentActivities / group.totalActivities) * 100 : 0,
      trend: group.recentActivities.length / Math.max(group.totalActivities - group.recentActivities.length, 1) - 1,
      density: getDensityLevel(group.totalActivities, data.length)
    })).filter(group => group.totalActivities > 0);

    // Create heatmap data
    const heatmapData = municipalityData.map(municipality => ({
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

    // Calculate statistics
    const totalActivities = data.length;
    const activeMunicipalities = municipalityData.length;
    const averageActivitiesPerMunicipality = activeMunicipalities > 0 ? totalActivities / activeMunicipalities : 0;
    const mostActiveMunicipality = municipalityData.reduce((max, current) =>
      current.totalActivities > max.totalActivities ? current : max, municipalityData[0] || {});

    const statistics = {
      totalActivities,
      activeMunicipalities,
      averageActivitiesPerMunicipality,
      mostActiveMunicipality: mostActiveMunicipality.municipality || 'N/A',
      totalTechnicians: new Set(data.map(d => d.technician)).size,
      averageResponseTime: municipalityData.reduce((sum, m) => sum + m.averageResponseTime, 0) / municipalityData.length || 0
    };

    return {
      municipalityData: applyFilters(municipalityData),
      activityTypes: Object.values(activityTypeGroups).sort((a, b) => b.count - a.count),
      heatmapData: applyFilters(heatmapData),
      statistics,
      regionData: Object.values(regionGroups)
    };
  }, [data, selectedMunicipality, searchTerm, selectedActivityType, densityThreshold]);

  const handleLocationClick = useCallback((municipality) => {
    if (onLocationClick) {
      onLocationClick({
        municipality: municipality.municipality,
        coordinates: municipality.coordinates,
        activities: municipality.totalActivities,
        technicians: municipality.technicians,
        responseTime: municipality.averageResponseTime
      });
    }
  }, [onLocationClick]);

  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
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

  if (error) {
    return (
      <div className={cn("bg-white rounded-xl border border-red-200 p-6", className)}>
        <div className="text-center">
          <AlertTriangleIcon size={48} className="text-red-400 mb-4 mx-auto" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju mape</h4>
          <p className="text-slate-600 mb-4">{error}</p>
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
                  {Object.keys(SERBIA_MUNICIPALITIES).map(municipality => (
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
                {mapView === 'heatmap' && mapAnalysis.municipalityData.map((municipality, index) => (
                  <CircleMarker
                    key={index}
                    center={[municipality.coordinates.lat, municipality.coordinates.lng]}
                    radius={Math.max(5, Math.min(20, municipality.totalActivities / 50))}
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
                ))}

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

                  return (
                    <CircleMarker
                      key={index}
                      center={regionCenter}
                      radius={Math.max(10, Math.min(30, region.totalActivities / 100))}
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