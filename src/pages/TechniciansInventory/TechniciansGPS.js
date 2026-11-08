import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RefreshCw, Play, Pause, Send, Phone, MapPin, Crosshair, Clock, ChevronLeft } from 'lucide-react';
import { toast } from '../../utils/toast';
import { gpsAPI, techniciansAPI } from '../../services/api';
import { cx, Btn, Led, Sign, Count } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { LinkBtn } from '../../montaza/ui';
import 'leaflet/dist/leaflet.css';
import './TechniciansGPS.mx.css';

// Fix za Leaflet marker ikone
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Boje markera po starosti lokacije (paleta Security dela) i odgovarajući ton za znak u listi
const AGE_TONE = { '#1e9e53': 'ok', '#0072f5': 'info', '#f5a524': 'warn', '#e5484d': 'bad' };

// Custom marker ikona za tehničare
const createTechnicianIcon = (color = '#0072f5') => {
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
        const techs = response.data.filter(t => t.role === 'technician' && !t.deletedAt);
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
      // Odmah učitaj poslednje poznate lokacije iz baze (background tracking ih čuva)
      await fetchLocations();

      // Pošalji push za tehničare koji imaju app otvoren (bonus, ne zavisi od toga)
      const response = await gpsAPI.requestLocations();
      if (response.data.success) {
        setLastRequest({
          requestId: response.data.requestId,
          timestamp: new Date(),
          successCount: response.data.successCount,
          failCount: response.data.failCount,
          totalTechnicians: response.data.totalTechnicians
        });

        toast.success(`Lokacije učitane. Push poslan tehničarima sa otvorenom aplikacijom.`);
        setAutoRefresh(true);

        // Osvežavaj još par puta za tehničare koji odgovore na push
        setTimeout(() => fetchLocations(), 5000);
        setTimeout(() => fetchLocations(), 15000);
      }
    } catch (error) {
      console.error('Greška pri slanju GPS zahteva:', error);
      // Čak i ako push fail-uje, lokacije su već učitane
      toast.info('Prikazane su poslednje poznate lokacije tehničara.');
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
    if (!createdAt) return '#a1a1a1';
    const now = new Date();
    const locationTime = new Date(createdAt);
    const diffMins = (now - locationTime) / 60000;

    if (diffMins < 5) return '#1e9e53';
    if (diffMins < 30) return '#0072f5';
    if (diffMins < 60) return '#f5a524';
    return '#e5484d';
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
    <div className="sx-page" data-testid="page-technicians-gps">
      <LinkBtn to="/technicians" size="sm" variant="ghost" icon={ChevronLeft} className="sx-head__back">Nazad na tehničare</LinkBtn>
      <PageHead
        eyebrow="Montaža · Tehničari"
        title="GPS Lokacije Tehničara"
        lead="Pratite lokacije tehničara u realnom vremenu"
        actions={<>
          <Btn icon={RefreshCw} onClick={fetchLocations} busy={loading}>Osveži</Btn>
          <Btn icon={autoRefresh ? Pause : Play} onClick={() => setAutoRefresh(!autoRefresh)} aria-pressed={autoRefresh}>
            {autoRefresh && <Led tone="ok" live />}
            {autoRefresh ? 'Pauziraj' : 'Auto'}
          </Btn>
          <Btn variant="primary" icon={Send} onClick={handleRequestLocations} busy={requesting}>Zatraži lokacije</Btn>
        </>}
      />

      {/* Osnovne brojke */}
      <div className="sx-stats">
        <Stat label="Ukupno tehničara" value={stats.totalTechnicians} />
        <Stat label="Sa lokacijom" value={stats.withLocations} sub={`${stats.coveragePercent}% pokrivenost`} />
        <Stat label="Aktivni (30min)" value={stats.recentLocations} tone={stats.recentLocations > 0 ? 'ok' : null}
          sub={stats.activeNow > 0 ? `${stats.activeNow} upravo sada` : null} />
        <Stat label="Poslednji zahtev"
          value={lastRequest ? formatTime(lastRequest.timestamp).split(' ')[1] : '-'}
          sub={lastRequest ? formatTime(lastRequest.timestamp).split(' ')[0] : 'Nije poslat'} />
      </div>

      {/* Dodatne brojke */}
      <div className="sx-stats">
        <Stat label="Response Rate"
          value={stats.responseRate !== null ? `${stats.responseRate}%` : '-'}
          sub={lastRequest ? `${lastRequest.successCount}/${lastRequest.totalTechnicians} poslato` : null}
          tone={stats.responseRate === null ? null : stats.responseRate >= 70 ? 'ok' : stats.responseRate >= 40 ? 'warn' : null} />
        <Stat label="Prosečna preciznost"
          value={stats.avgAccuracy ? `±${stats.avgAccuracy}m` : '-'}
          sub={stats.avgAccuracy && stats.avgAccuracy < 50 ? 'Visoka preciznost' : stats.avgAccuracy ? 'Srednja preciznost' : null}
          tone={stats.avgAccuracy ? (stats.avgAccuracy < 50 ? 'ok' : 'warn') : null} />
        <Stat label="Bez lokacije" value={stats.noLocation}
          sub={stats.noLocation > 0 ? 'Nisu odgovorili' : 'Svi imaju lokaciju'}
          tone={stats.noLocation === 0 ? 'ok' : 'warn'} />
        <Stat label="Zastarele (>1h)" value={stats.staleLocations}
          sub={stats.staleLocations > 0 ? 'Potrebno osvežavanje' : 'Sve ažurno'}
          tone={stats.staleLocations === 0 ? 'ok' : 'warn'} />
      </div>

      {/* Info poruka za poslednji zahtev */}
      {lastRequest && (
        <Note tone="info" className="mx-mb">
          <b>GPS zahtev poslan</b>
          <span className="mx-gps-dot">•</span>
          <span>{formatTime(lastRequest.timestamp)}</span>
          <span className="mx-gps-dot">•</span>
          <span>Uspešno: {lastRequest.successCount}/{lastRequest.totalTechnicians}</span>
          {lastRequest.failCount > 0 && (
            <span className="mx-gps-fail">Neuspešno: {lastRequest.failCount}</span>
          )}
        </Note>
      )}

      <div className="sx-cols sx-cols--main">
        {/* Mapa, ispod nje legenda (posebna kartica, kao ranije) */}
        <div className="mx-gps-left">
          <Panel pad={false} className="mx-gps-mappanel">
            <div className="mx-gps-map">
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
                      <div className="mx-gps-pop">
                        <b>{location.technician?.name || 'Nepoznat tehničar'}</b>
                        {location.technician?.phoneNumber && (
                          <span><Phone size={14} strokeWidth={1.9} aria-hidden="true" />{location.technician.phoneNumber}</span>
                        )}
                        <span className="sx-mono"><MapPin size={14} strokeWidth={1.9} aria-hidden="true" />{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                        {location.accuracy && (
                          <span><Crosshair size={14} strokeWidth={1.9} aria-hidden="true" />Preciznost: ±{Math.round(location.accuracy)}m</span>
                        )}
                        <span><Clock size={14} strokeWidth={1.9} aria-hidden="true" />{getLocationAge(location.createdAt)}</span>
                        <small className="sx-mono">{formatTime(location.createdAt)}</small>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Panel>
          <div className="sx-card mx-gps-legend">
            <span className="sx-label">Legenda:</span>
            <span><Led tone="ok" />&lt; 5 min</span>
            <span><Led tone="info" />&lt; 30 min</span>
            <span><Led tone="warn" />&lt; 1h</span>
            <span><Led tone="bad" />&gt; 1h</span>
          </div>
        </div>

        {/* Lista tehničara */}
        <Panel pad={false} title="Lista tehničara" actions={<Count>{technicians.length}</Count>} className="mx-gps-listpanel">
          {technicians.length === 0 ? (
            <div className="sx-empty-block"><b>Nema tehničara</b></div>
          ) : (
            <div className="sx-list mx-gps-list">
              {technicians.map((tech) => {
                const techLocation = locations.find(
                  loc => loc.technicianId === tech._id || loc.technician?._id === tech._id
                );

                return (
                  <div key={tech._id} className={cx('sx-item mx-gps-item', techLocation && 'is-on')}>
                    <Led tone={techLocation ? 'ok' : 'idle'} />
                    <div className="sx-item__main">
                      <b>{tech.name}</b>
                      {tech.phoneNumber && (
                        <span className="mx-gps-phone"><Phone size={12} strokeWidth={1.9} aria-hidden="true" />{tech.phoneNumber}</span>
                      )}
                    </div>
                    <div className="sx-item__side">
                      {techLocation ? (
                        <>
                          <Sign tone={AGE_TONE[getMarkerColor(techLocation.createdAt)]}>{getLocationAge(techLocation.createdAt)}</Sign>
                          {techLocation.accuracy && (
                            <span className="mx-gps-acc"><Crosshair size={12} strokeWidth={1.9} aria-hidden="true" />±{Math.round(techLocation.accuracy)}m</span>
                          )}
                        </>
                      ) : (
                        <span className="sx-faint">Nema lokacije</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default TechniciansGPS;
