import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Filter, Eye, Phone, MapPin, CalendarDays } from 'lucide-react';
import { toast } from '../../utils/toast';
import { workOrdersAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { getTimRowStyle } from '../../utils/tim';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { SearchField, Select, Choice } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { Pager, Loading } from '../../montaza/ui';
import { MobilePager } from '../TechniciansInventory/TechnicianPagers';
import TechnicianAPKDownload from '../../components/TechnicianAPKDownload';
import '../TechniciansInventory/TechnicianInventory.mx.css';
import './TechnicianWorkOrders.mx.css';

// Ton statusa: završen ok, nezavršen warn, odložen info, otkazan bad, nov (termin još nije prošao) info
const STATUS_TONE = { zavrsen: 'ok', nezavrsen: 'warn', odlozen: 'info', otkazan: 'bad', nov: 'info' };

const TechnicianWorkOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Touch gestures
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const activeOrderRef = useRef(null);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 12 : 10;

  // Function to check if work order date/time hasn't passed yet
  const isWorkOrderNew = (order) => {
    if (order.status !== 'nezavrsen') return false;
    
    try {
      const now = new Date();
      
      // Handle different date formats
      let orderDate;
      if (order.date instanceof Date) {
        orderDate = order.date;
      } else if (typeof order.date === 'string') {
        // If it's already in YYYY-MM-DD format or ISO string
        orderDate = new Date(order.date);
      } else {
        console.warn('Invalid date format for order:', order);
        return false;
      }
      
      // Create datetime with time
      const orderTime = order.time || '09:00';
      const [hours, minutes] = orderTime.split(':');
      const orderDateTime = new Date(orderDate);
      orderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Debug logging (can be removed later)
      const isNew = orderDateTime > now;
      console.log('Checking order:', {
        id: order._id,
        status: order.status,
        date: order.date,
        time: order.time,
        orderDateTime: orderDateTime.toISOString(),
        orderDateTimeLocal: orderDateTime.toLocaleString('sr-RS'),
        now: now.toISOString(),
        nowLocal: now.toLocaleString('sr-RS'),
        isNew: isNew,
        timeDiffMinutes: Math.round((orderDateTime - now) / (1000 * 60))
      });
      
      return orderDateTime > now;
    } catch (error) {
      console.error('Error checking if order is new:', error, order);
      return false;
    }
  };

  // Function to get display status and CSS class
  const getDisplayStatus = (order) => {
    if (order.status === 'zavrsen') return { text: 'Završen', cssClass: 'zavrsen' };
    if (order.status === 'odlozen') return { text: 'Odložen', cssClass: 'odlozen' };
    if (order.status === 'otkazan') return { text: 'Otkazan', cssClass: 'otkazan' };
    
    // For 'nezavrsen' status, check if it's new (date/time hasn't passed)
    if (order.status === 'nezavrsen') {
      const isNew = isWorkOrderNew(order);
      
      // Debug logging
      console.log('Display status for order:', {
        id: order._id,
        status: order.status,
        isNew: isNew,
        willShow: isNew ? 'Nov' : 'Nezavršen'
      });
      
      if (isNew) {
        return { text: 'Nov', cssClass: 'nov' };
      } else {
        return { text: 'Nezavršen', cssClass: 'nezavrsen' };
      }
    }
    
    return { text: 'Nezavršen', cssClass: 'nezavrsen' };
  };
  
  useEffect(() => {
    fetchWorkOrders();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?._id]);
  
  const fetchWorkOrders = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await workOrdersAPI.getTechnicianWorkOrders(user._id);
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      setError('Greška pri učitavanju radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje radnih naloga!');
    } finally {
      setLoading(false);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e, orderId) => {
    e.preventDefault();
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    activeOrderRef.current = orderId;
    
    console.log('Touch start - Order ID:', orderId); // Debug log
  };
  
  const handleTouchMove = (e) => {
    if (!activeOrderRef.current) return;
    
    touchEndX.current = e.touches[0].clientX;
    
    const orderCard = document.getElementById(`order-${activeOrderRef.current}`);
    if (!orderCard) return;
    
    const diff = touchEndX.current - touchStartX.current;
    
    // Only allow swiping left (negative diff)
    if (diff < 0 && diff > -100) {
      orderCard.style.transform = `translateX(${diff}px)`;
    }
  };
  
  const handleTouchEnd = () => {
    if (!activeOrderRef.current) {
      console.log('Touch end - No active order ID'); // Debug log
      return;
    }
    
    const orderId = activeOrderRef.current; // Store ID before resetting
    const orderCard = document.getElementById(`order-${orderId}`);
    
    console.log('Touch end - Order ID:', orderId); // Debug log
    
    if (!orderCard) {
      console.log('Touch end - Order card not found for ID:', orderId); // Debug log
      activeOrderRef.current = null;
      return;
    }
    
    const diff = touchEndX.current - touchStartX.current;
    
    if (diff < -80) {
      // Swiped far enough to trigger action
      orderCard.classList.add('swiped');
      setTimeout(() => {
        orderCard.classList.remove('swiped');
        orderCard.style.transform = 'translateX(0)';
        
        // Navigate to details using the stored ID
        console.log('Navigating to order:', orderId); // Debug log
        navigate(`/my-work-orders/${orderId}`);
      }, 300);
    } else {
      // Reset position with animation
      orderCard.style.transition = 'transform 0.3s ease';
      orderCard.style.transform = 'translateX(0)';
      setTimeout(() => {
        orderCard.style.transition = '';
      }, 300);
    }
    
    // Reset only after using the ID
    activeOrderRef.current = null;
  };
  
  // Filtriranje radnih naloga
  const filteredWorkOrders = workOrders.filter(order => {
    const searchMatch = searchTerm === '' || 
                       order.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (order.comment && order.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    // Ako nema filtera, ne prikazuj završene radne naloge
    const defaultHideCompleted = statusFilter === '' && searchTerm === '' ? order.status !== 'zavrsen' : true;
    
    return searchMatch && statusMatch && defaultHideCompleted;
  });
  
  // Sortiranje po datumu i vremenu
  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    // Prvo stavljamo nezavršene (uključujući "nove")
    const aIsIncomplete = a.status === 'nezavrsen';
    const bIsIncomplete = b.status === 'nezavrsen';
    
    if (aIsIncomplete && !bIsIncomplete) return -1;
    if (!aIsIncomplete && bIsIncomplete) return 1;
    
    // Zatim sortiramo po datumu i vremenu - najnoviji na vrhu
    const aDateTime = new Date(`${a.date}T${a.time || '09:00'}:00`);
    const bDateTime = new Date(`${b.date}T${b.time || '09:00'}:00`);
    
    return bDateTime - aDateTime;
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedWorkOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(sortedWorkOrders.length / itemsPerPage);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Statistike
  const stats = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter(o => o.status === 'zavrsen').length;
    const pending = workOrders.filter(o => o.status === 'nezavrsen').length;
    const postponed = workOrders.filter(o => o.status === 'odlozen').length;
    const canceled = workOrders.filter(o => o.status === 'otkazan').length;
    
    // Calculate "new" orders for testing
    const newOrders = workOrders.filter(o => o.status === 'nezavrsen' && isWorkOrderNew(o)).length;
    const actualPending = pending - newOrders;
    
    console.log('Stats calculation:', {
      total,
      pending,
      newOrders,
      actualPending,
      workOrdersWithNezavrsen: workOrders.filter(o => o.status === 'nezavrsen').map(o => ({
        id: o._id,
        date: o.date,
        time: o.time,
        isNew: isWorkOrderNew(o)
      }))
    });
    
    return {
      total,
      completed,
      pending: actualPending,
      newOrders, // Add this for debugging
      postponed,
      canceled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [workOrders]);

  // Format date for mobile display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
      return `Danas, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Juče, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise return full date
    return date.toLocaleDateString('sr-RS');
  };
  
  
  return (
    <div className="sx-page mx-tech mx-mynalozi" data-testid="page-my-work-orders">
      <PageHead
        eyebrow="Montaža · Radni nalozi"
        title="Moji radni nalozi"
        lead="Pregled i upravljanje radnim nalozima"
        actions={isMobile ? (
          <>
            <Btn icon={RefreshCw} onClick={fetchWorkOrders} busy={loading} aria-label="Osveži" />
            <Btn icon={Filter} variant={showFilters ? 'primary' : undefined} onClick={() => setShowFilters(!showFilters)} aria-label="Filteri" aria-pressed={showFilters} />
          </>
        ) : (
          <Btn icon={RefreshCw} onClick={fetchWorkOrders} busy={loading}>Osveži</Btn>
        )}
      />

      {error && <Note tone="bad" className="mx-mb"><b>Greška:</b> {error}</Note>}

      <div className="mx-tech-stats">
        <Stat label="Ukupno" value={stats.total} />
        <Stat label="Završeno" value={stats.completed} small={`${stats.completionRate}%`} tone={stats.completed ? 'ok' : null} />
        <Stat label="Nezavršeno" value={stats.pending} tone={stats.pending ? 'warn' : null} />
        <Stat label="Odloženo" value={stats.postponed} />
        <Stat label="Otkazano" value={stats.canceled} tone={stats.canceled ? 'bad' : null} />
        <Stat label="Novi" value={stats.newOrders || 0} />
      </div>

      <div className="sx-stack">
        <Panel
          pad={false}
          className="mx-mynalozi-panel"
          title="Radni nalozi"
          actions={<span className="sx-tag">{filteredWorkOrders.length} od {workOrders.length} naloga</span>}
        >
          {/* Desktop: pretraga i status ispod naslova kartice */}
          {!isMobile && (
            <div className="mx-tech-controls">
              <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga po opštini, adresi, tipu..." />
              <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status naloga">
                <option value="">Svi statusi</option>
                <option value="zavrsen">Završeni</option>
                <option value="nezavrsen">Nezavršeni</option>
                <option value="odlozen">Odloženi</option>
                <option value="otkazan">Otkazani</option>
              </Select>
            </div>
          )}

          {loading ? (
            <Loading text="Učitavanje radnih naloga..." />
          ) : currentItems.length === 0 ? (
            <div className="sx-empty-block">
              <b>{searchTerm || statusFilter ? 'Nema rezultata za zadatu pretragu' : 'Nemate dodeljenih radnih naloga'}</b>
              {!isMobile && <span>Promenite filtere za pristup nalozima</span>}
            </div>
          ) : isMobile ? (
            // Telefon: kartice, prevlačenje kartice ulevo otvara detalj
            <div className="mx-mynalozi-cards">
              {currentItems.map((order, index) => {
                const displayStatus = getDisplayStatus(order);
                return (
                  <div
                    key={order._id}
                    id={`order-${order._id}`}
                    className="mx-mynalozi-card"
                    style={{ '--i': index, ...getTimRowStyle(order.tim) }}
                    onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, order._id); }}
                    onTouchMove={(e) => { e.stopPropagation(); handleTouchMove(e); }}
                    onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e); }}
                  >
                    <div className="mx-mynalozi-card__top">
                      <Sign tone={STATUS_TONE[displayStatus.cssClass]}>{displayStatus.text}</Sign>
                      <span className="mx-mynalozi-card__when">
                        <CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" />
                        <span>
                          {order.date ? new Date(order.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                          {order.time && ' • ' + order.time}
                        </span>
                      </span>
                    </div>
                    <div className="mx-mynalozi-card__place">
                      <MapPin size={16} strokeWidth={1.9} aria-hidden="true" />
                      <div>
                        <b>{order.municipality}</b>
                        <span>{order.address} • {order.type}</span>
                      </div>
                    </div>
                    {order.userPhone && (
                      <a href={`tel:${order.userPhone}`} className="mx-mynalozi-card__tel">
                        <Phone size={15} strokeWidth={1.9} aria-hidden="true" />
                        <span>{order.userPhone}</span>
                      </a>
                    )}
                    {/* razlog vraćanja (admin vratio nalog) */}
                    {order.adminComment && <Note tone="bad"><b>Razlog vraćanja:</b> {order.adminComment}</Note>}
                    <div className="mx-mynalozi-card__foot">
                      <Btn size="sm" variant="primary" icon={Eye} onClick={() => navigate(`/my-work-orders/${order._id}`)}>Detalji</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sx-tablewrap">
              <table className="sx-table mx-mynalozi-table" data-testid="my-work-orders-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Vreme</th>
                    <th>Opština</th>
                    <th>Adresa</th>
                    <th>Tip</th>
                    <th>Status</th>
                    <th className="is-end">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((order, index) => {
                    const displayStatus = getDisplayStatus(order);
                    return (
                      <React.Fragment key={order._id}>
                        <tr style={{ '--i': index, ...getTimRowStyle(order.tim) }} className={order.adminComment ? 'has-note' : undefined}>
                          <td className="is-head"><span className="sx-mono sx-nowrap">{new Date(order.date).toLocaleDateString('sr-RS')}</span></td>
                          <td data-label="Vreme"><span className="sx-mono">{order.time || '09:00'}</span></td>
                          <td data-label="Opština"><b className="mx-strong">{order.municipality}</b></td>
                          <td data-label="Adresa" className="is-wide">{order.address}</td>
                          <td data-label="Tip">{order.type}</td>
                          <td data-label="Status"><Sign tone={STATUS_TONE[displayStatus.cssClass]}>{displayStatus.text}</Sign></td>
                          <td className="is-actions is-end">
                            <div className="sx-rowacts">
                              <Btn size="sm" variant="ghost" icon={Eye} onClick={() => navigate(`/my-work-orders/${order._id}`)}>Detalji</Btn>
                            </div>
                          </td>
                        </tr>
                        {/* razlog vraćanja: red ispod naloga */}
                        {order.adminComment && (
                          <tr className="mx-mynalozi-note" style={{ '--mx-tim': getTimRowStyle(order.tim).backgroundColor }}>
                            <td colSpan="7"><Note tone="bad"><b>Razlog vraćanja:</b> {order.adminComment}</Note></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && (isMobile ? (
            <MobilePager narrow page={currentPage} pages={totalPages} onPage={paginate} text={`Stranica ${currentPage} od ${totalPages}`} />
          ) : (
            <Pager page={currentPage} total={sortedWorkOrders.length} perPage={itemsPerPage} onPage={paginate} />
          ))}
        </Panel>

        {/* APK Download Section - Only for Technicians */}
        <TechnicianAPKDownload />
      </div>

      {/* Telefon: filteri u listu odozdo, kao ranije (pretraga i status se primenjuju odmah) */}
      {isMobile && (
        <Dialog
          open={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filteri"
          size="sm"
          initialFocus={false}
          testId="my-work-orders-filters"
          footer={<Btn variant="primary" size="lg" className="mx-btn--full" onClick={() => setShowFilters(false)}>Primeni filtere</Btn>}
        >
          <div className="mx-tech-filter">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga..." />
            <div className="mx-tech-filter__group">
              <h4 className="sx-label">Status naloga</h4>
              <Choice
                label="Status naloga"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'Svi' },
                  { value: 'nezavrsen', label: 'Nezavršeni' },
                  { value: 'zavrsen', label: 'Završeni' },
                  { value: 'odlozen', label: 'Odloženi' }
                ]}
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default TechnicianWorkOrders;
