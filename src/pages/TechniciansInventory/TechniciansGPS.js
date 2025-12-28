import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { gpsAPI, techniciansAPI } from '../../services/api';
import { cn } from '../../utils/cn';
import 'leaflet/dist/leaflet.css';

// Fix za Leaflet marker ikone
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// SVG Icons
const Icons = {
  mapPin: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  refresh: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  pause: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  send: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"/>
      <path d="M22 2 11 13"/>
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  userCheck: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  activity: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  clock: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  phone: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  target: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  ),
  arrowLeft: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
  ),
  signal: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01"/>
      <path d="M7 20v-4"/>
      <path d="M12 20v-8"/>
      <path d="M17 20V8"/>
      <path d="M22 4v16"/>
    </svg>
  ),
  percent: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19"/>
      <circle cx="6.5" cy="6.5" r="2.5"/>
      <circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  trendingUp: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  trendingDown: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
      <polyline points="16 17 22 17 22 11"/>
    </svg>
  )
};

// Loading spinner
const Spinner = ({ size = 16 }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Custom marker ikona za tehničare
const createTechnicianIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-technician-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Komponenta za automatski fit bounds
const FitBounds = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);

  return null;
};

// Stat Card komponenta
const StatCard = ({ icon, label, value, subValue, color = 'blue', trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-green-600" : "text-red-600")}>
            {trend > 0 ? Icons.trendingUp : Icons.trendingDown}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        {subValue && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};

const TechniciansGPS = () => {
  const [locations, setLocations] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [lastRequest, setLastRequest] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Srbija centar
  const defaultCenter = [44.0165, 21.0059];
  const defaultZoom = 7;

  // Učitaj tehničare
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await techniciansAPI.getAll();
        const techs = response.data.filter(t => t.role === 'technician');
        setTechnicians(techs);
      } catch (error) {
        console.error('Greška pri učitavanju tehničara:', error);
      }
    };
    fetchTechnicians();
  }, []);

  // Učitaj lokacije
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await gpsAPI.getLocations();
      if (response.data.success) {
        setLocations(response.data.locations);
      }
    } catch (error) {
      console.error('Greška pri učitavanju lokacija:', error);
      toast.error('Neuspešno učitavanje lokacija');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLocations();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchLocations]);

  // Zahtevaj lokacije od svih tehničara
  const handleRequestLocations = async () => {
    setRequesting(true);
    try {
      const response = await gpsAPI.requestLocations();
      if (response.data.success) {
        setLastRequest({
          requestId: response.data.requestId,
          timestamp: new Date(),
          successCount: response.data.successCount,
          failCount: response.data.failCount,
          totalTechnicians: response.data.totalTechnicians
        });

        toast.success(`GPS zahtev poslan! Uspešno: ${response.data.successCount}/${response.data.totalTechnicians}`);
        setAutoRefresh(true);

        setTimeout(() => {
          fetchLocations();
        }, 5000);
      }
    } catch (error) {
      console.error('Greška pri slanju GPS zahteva:', error);
      toast.error('Neuspešno slanje GPS zahteva');
    } finally {
      setRequesting(false);
    }
  };

  // Format vremena
  const formatTime = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Koliko je stara lokacija
  const getLocationAge = (createdAt) => {
    if (!createdAt) return null;
    const now = new Date();
    const locationTime = new Date(createdAt);
    const diffMs = now - locationTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Upravo sada';
    if (diffMins < 60) return `Pre ${diffMins} min`;
    if (diffHours < 24) return `Pre ${diffHours}h`;
    return `Pre ${diffDays} dana`;
  };

  // Boja markera na osnovu starosti lokacije
  const getMarkerColor = (createdAt) => {
    if (!createdAt) return '#6b7280';
    const now = new Date();
    const locationTime = new Date(createdAt);
    const diffMins = (now - locationTime) / 60000;

    if (diffMins < 5) return '#22c55e';
    if (diffMins < 30) return '#3b82f6';
    if (diffMins < 60) return '#f59e0b';
    return '#ef4444';
  };

  // Napredne statistike
  const calculateStats = () => {
    const now = new Date();

    // Osnovne
    const totalTechnicians = technicians.length;
    const withLocations = locations.length;

    // Po vremenskim intervalima
    const recentLocations = locations.filter(loc => {
      const diffMins = (now - new Date(loc.createdAt)) / 60000;
      return diffMins < 30;
    }).length;

    const activeNow = locations.filter(loc => {
      const diffMins = (now - new Date(loc.createdAt)) / 60000;
      return diffMins < 5;
    }).length;

    const staleLocations = locations.filter(loc => {
      const diffMins = (now - new Date(loc.createdAt)) / 60000;
      return diffMins > 60;
    }).length;

    // Prosečna preciznost
    const accuracies = locations.filter(l => l.accuracy).map(l => l.accuracy);
    const avgAccuracy = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : null;

    // Procenat pokrivenosti
    const coveragePercent = totalTechnicians > 0
      ? Math.round((withLocations / totalTechnicians) * 100)
      : 0;

    // Response rate (ako je bilo zahteva)
    const responseRate = lastRequest && lastRequest.totalTechnicians > 0
      ? Math.round((lastRequest.successCount / lastRequest.totalTechnicians) * 100)
      : null;

    return {
      totalTechnicians,
      withLocations,
      recentLocations,
      activeNow,
      staleLocations,
      avgAccuracy,
      coveragePercent,
      responseRate,
      noLocation: totalTechnicians - withLocations
    };
  };

  const stats = calculateStats();

  return (
    <div className="p-6 relative" style={{ zIndex: 1 }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/technicians" className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors">
              {Icons.arrowLeft}
              Nazad na tehničare
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {Icons.mapPin}
            GPS Lokacije Tehničara
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Pratite lokacije tehničara u realnom vremenu
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={fetchLocations}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Spinner size={16} /> : Icons.refresh}
            Osveži
          </Button>

          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn("flex items-center gap-2", autoRefresh && "bg-green-600 hover:bg-green-700")}
          >
            {autoRefresh ? Icons.pause : Icons.play}
            {autoRefresh ? 'Pauziraj' : 'Auto'}
          </Button>

          <Button
            variant="default"
            onClick={handleRequestLocations}
            disabled={requesting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {requesting ? <Spinner size={16} /> : Icons.send}
            Zatraži lokacije
          </Button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Icons.users}
          label="Ukupno tehničara"
          value={stats.totalTechnicians}
          color="gray"
        />
        <StatCard
          icon={Icons.mapPin}
          label="Sa lokacijom"
          value={stats.withLocations}
          subValue={`${stats.coveragePercent}% pokrivenost`}
          color="blue"
        />
        <StatCard
          icon={Icons.activity}
          label="Aktivni (30min)"
          value={stats.recentLocations}
          subValue={stats.activeNow > 0 ? `${stats.activeNow} upravo sada` : null}
          color="green"
        />
        <StatCard
          icon={Icons.clock}
          label="Poslednji zahtev"
          value={lastRequest ? formatTime(lastRequest.timestamp).split(' ')[1] : '-'}
          subValue={lastRequest ? formatTime(lastRequest.timestamp).split(' ')[0] : 'Nije poslat'}
          color="purple"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Icons.signal}
          label="Response Rate"
          value={stats.responseRate !== null ? `${stats.responseRate}%` : '-'}
          subValue={lastRequest ? `${lastRequest.successCount}/${lastRequest.totalTechnicians} poslato` : null}
          color={stats.responseRate >= 70 ? 'green' : stats.responseRate >= 40 ? 'yellow' : 'gray'}
        />
        <StatCard
          icon={Icons.target}
          label="Prosečna preciznost"
          value={stats.avgAccuracy ? `±${stats.avgAccuracy}m` : '-'}
          subValue={stats.avgAccuracy && stats.avgAccuracy < 50 ? 'Visoka preciznost' : stats.avgAccuracy ? 'Srednja preciznost' : null}
          color={stats.avgAccuracy && stats.avgAccuracy < 50 ? 'green' : 'yellow'}
        />
        <StatCard
          icon={Icons.userCheck}
          label="Bez lokacije"
          value={stats.noLocation}
          subValue={stats.noLocation > 0 ? 'Nisu odgovorili' : 'Svi imaju lokaciju'}
          color={stats.noLocation === 0 ? 'green' : 'yellow'}
        />
        <StatCard
          icon={Icons.clock}
          label="Zastarele (>1h)"
          value={stats.staleLocations}
          subValue={stats.staleLocations > 0 ? 'Potrebno osvežavanje' : 'Sve ažurno'}
          color={stats.staleLocations === 0 ? 'green' : 'yellow'}
        />
      </div>

      {/* Info poruka za poslednji zahtev */}
      {lastRequest && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center gap-3 text-blue-800 dark:text-blue-200">
            <div className="text-blue-600 dark:text-blue-400">{Icons.info}</div>
            <div>
              <span className="font-medium">GPS zahtev poslan</span>
              <span className="text-blue-600 dark:text-blue-400 mx-2">•</span>
              <span>{formatTime(lastRequest.timestamp)}</span>
              <span className="text-blue-600 dark:text-blue-400 mx-2">•</span>
              <span>Uspešno: {lastRequest.successCount}/{lastRequest.totalTechnicians}</span>
              {lastRequest.failCount > 0 && (
                <span className="text-red-600 ml-2">Neuspešno: {lastRequest.failCount}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div style={{ height: '500px', position: 'relative', zIndex: 0 }}>
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {locations.length > 0 && <FitBounds locations={locations} />}

                {locations.map((location) => (
                  <Marker
                    key={location._id}
                    position={[location.latitude, location.longitude]}
                    icon={createTechnicianIcon(getMarkerColor(location.createdAt))}
                  >
                    <Popup>
                      <div className="min-w-[220px] p-1">
                        <div className="font-bold text-lg mb-3 text-gray-900">
                          {location.technician?.name || 'Nepoznat tehničar'}
                        </div>
                        {location.technician?.phoneNumber && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            {location.technician.phoneNumber}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </div>
                        {location.accuracy && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                            Preciznost: ±{Math.round(location.accuracy)}m
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {getLocationAge(location.createdAt)}
                        </div>
                        <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                          {formatTime(location.createdAt)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 font-medium">Legenda:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm"></div>
              <span className="text-gray-600 dark:text-gray-300">&lt; 5 min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm"></div>
              <span className="text-gray-600 dark:text-gray-300">&lt; 30 min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-sm"></div>
              <span className="text-gray-600 dark:text-gray-300">&lt; 1h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div>
              <span className="text-gray-600 dark:text-gray-300">&gt; 1h</span>
            </div>
          </div>
        </div>

        {/* Lista tehničara */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[556px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {Icons.users}
                Lista tehničara
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {technicians.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {technicians.map((tech) => {
                const techLocation = locations.find(
                  loc => loc.technicianId === tech._id || loc.technician?._id === tech._id
                );

                return (
                  <div
                    key={tech._id}
                    className={cn(
                      "p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                      techLocation ? 'bg-green-50/30 dark:bg-green-900/10' : ''
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          techLocation ? 'bg-green-500' : 'bg-gray-300'
                        )}></div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {tech.name}
                          </div>
                          {tech.phoneNumber && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {Icons.phone}
                              {tech.phoneNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {techLocation ? (
                          <>
                            <div className={cn(
                              "text-xs font-medium",
                              getMarkerColor(techLocation.createdAt) === '#22c55e' ? 'text-green-600' :
                              getMarkerColor(techLocation.createdAt) === '#3b82f6' ? 'text-blue-600' :
                              getMarkerColor(techLocation.createdAt) === '#f59e0b' ? 'text-yellow-600' :
                              'text-red-600'
                            )}>
                              {getLocationAge(techLocation.createdAt)}
                            </div>
                            {techLocation.accuracy && (
                              <div className="flex items-center justify-end gap-1 text-xs text-gray-400">
                                {Icons.target}
                                ±{Math.round(techLocation.accuracy)}m
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            Nema lokacije
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {technicians.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-gray-300 dark:text-gray-600 mb-2">{Icons.users}</div>
                  Nema tehničara
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechniciansGPS;
