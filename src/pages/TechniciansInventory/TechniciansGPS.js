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

// Custom marker ikona za tehničare
const createTechnicianIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-technician-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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
        // Filtriraj samo tehničare (ne admine)
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
    }, 30000); // Refresh svakih 30 sekundi

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

        // Automatski uključi auto-refresh da se vide novi rezultati
        setAutoRefresh(true);

        // Osvezi lokacije nakon 5 sekundi (daj vreme uređajima da odgovore)
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
    if (!createdAt) return '#6b7280'; // gray
    const now = new Date();
    const locationTime = new Date(createdAt);
    const diffMins = (now - locationTime) / 60000;

    if (diffMins < 5) return '#22c55e'; // green - fresh
    if (diffMins < 30) return '#3b82f6'; // blue - recent
    if (diffMins < 60) return '#f59e0b'; // yellow - getting old
    return '#ef4444'; // red - stale
  };

  // Statistike
  const stats = {
    totalTechnicians: technicians.length,
    withLocations: locations.length,
    recentLocations: locations.filter(loc => {
      const diffMins = (new Date() - new Date(loc.createdAt)) / 60000;
      return diffMins < 30;
    }).length
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/technicians" className="text-blue-500 hover:underline text-sm">
              ← Nazad na tehničare
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Učitavanje...
              </span>
            ) : (
              'Osveži mapu'
            )}
          </Button>

          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸ Pauziraj Auto' : '▶ Auto Osvežavanje'}
          </Button>

          <Button
            variant="default"
            onClick={handleRequestLocations}
            disabled={requesting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {requesting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Slanje...
              </span>
            ) : (
              '📍 Zatraži lokacije'
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Ukupno tehničara</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTechnicians}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Sa lokacijom</div>
          <div className="text-2xl font-bold text-blue-600">{stats.withLocations}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Aktivni (30min)</div>
          <div className="text-2xl font-bold text-green-600">{stats.recentLocations}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Poslednji zahtev</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {lastRequest ? formatTime(lastRequest.timestamp) : 'Nije poslat'}
          </div>
        </div>
      </div>

      {/* Info poruka za poslednji zahtev */}
      {lastRequest && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>
              GPS zahtev poslan u {formatTime(lastRequest.timestamp)}.
              Uspešno poslato: {lastRequest.successCount}/{lastRequest.totalTechnicians} tehničara.
              {lastRequest.failCount > 0 && ` Neuspešno: ${lastRequest.failCount}`}
            </span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div style={{ height: '500px' }}>
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
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
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg mb-2">
                          {location.technician?.name || 'Nepoznat tehničar'}
                        </div>
                        {location.technician?.phoneNumber && (
                          <div className="text-sm text-gray-600 mb-1">
                            📞 {location.technician.phoneNumber}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 mb-1">
                          📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </div>
                        {location.accuracy && (
                          <div className="text-sm text-gray-500 mb-1">
                            🎯 Preciznost: ±{Math.round(location.accuracy)}m
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          🕐 {getLocationAge(location.createdAt)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
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
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-500">Legenda:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>&lt; 5 min</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>&lt; 30 min</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>&lt; 1h</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>&gt; 1h</span>
            </div>
          </div>
        </div>

        {/* Lista tehničara */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[500px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Lista tehničara</h3>
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
                      techLocation ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {tech.name}
                        </div>
                        {tech.phoneNumber && (
                          <div className="text-xs text-gray-500">
                            {tech.phoneNumber}
                          </div>
                        )}
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
                            <div className="text-xs text-gray-400">
                              {techLocation.accuracy ? `±${Math.round(techLocation.accuracy)}m` : ''}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400">
                            Nema lokacije
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {technicians.length === 0 && (
                <div className="p-4 text-center text-gray-500">
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
