import React, { useState, useEffect, useContext, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { cx, Btn } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../../security/sx/layout';
import { SearchField, Select } from '../../security/sx/forms';
import { Pager, Loading } from '../../montaza/ui';
import './TechnicianInventory.mx.css';

const TechnicianEquipment = () => {
  const { user } = useContext(AuthContext);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [refreshing, setRefreshing] = useState(false);
  
  // Touch gestures
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 12 : 10;
  
  useEffect(() => {
    fetchEquipment();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?._id]);
  
  const fetchEquipment = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await techniciansAPI.getEquipment(user._id);
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      setError('Greška pri učitavanju opreme. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje opreme!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile - only at top of page
  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchEquipment();
    setTimeout(() => setRefreshing(false), 800); // Visual feedback
  };
  
  // Touch gesture handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) { // Only capture when at top
      touchStartY.current = e.touches[0].clientY;
    }
  };
  
  const handleTouchMove = (e) => {
    if (window.scrollY === 0) { // Only process when at top
      touchEndY.current = e.touches[0].clientY;
      
      // If user is at the top of the page and pulling down significantly
      const pullDistance = touchEndY.current - touchStartY.current;
      if (pullDistance > 100 && !refreshing) {
        handlePullToRefresh();
        // Reset to prevent multiple triggers
        touchStartY.current = 0;
        touchEndY.current = 0;
      }
    }
  };
  
  useEffect(() => {
    if (isMobile) {
      // Use passive listeners for better performance
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isMobile, refreshing]);
  
  // Filtriranje opreme
  const filteredEquipment = equipment.filter(item => {
    const searchMatch = searchTerm === '' || 
                       item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const categoryMatch = categoryFilter === '' || item.category === categoryFilter;
    
    return searchMatch && categoryMatch;
  });
  
  // Sortiranje po kategoriji
  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    // Prvo sortiramo po kategoriji
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    
    // Zatim po serijskom broju
    return a.serialNumber.localeCompare(b.serialNumber);
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedEquipment.slice(indexOfFirstItem, indexOfLastItem);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Kategorije opreme za filter
  const categories = [...new Set(equipment.map(item => item.category))];
  
  // Statistike
  const stats = {
    total: equipment.length,
    byCategory: categories.reduce((acc, category) => {
      acc[category] = equipment.filter(item => item.category === category).length;
      return acc;
    }, {})
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };
  
  return (
    <div className="sx-page mx-tinv" data-testid="page-my-equipment">
      {/* povuci nadole na vrhu strane (telefon) = osveži */}
      {isMobile && (
        <div className={cx('mx-tinv-ptr', refreshing && 'is-on')} role="status" aria-live="polite">
          <RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />
          <span>{refreshing ? 'Osvežavanje...' : 'Povucite dole za osvežavanje'}</span>
        </div>
      )}

      <PageHead eyebrow="Montaža · Inventar" title="Moja oprema" lead="Pregled zadužene opreme" />

      {error && <Note tone="bad" className="mx-mb"><b>Greška:</b> {error}</Note>}

      <div className="sx-stats">
        <Stat label="Ukupno" value={stats.total} />
        {/* kategorije: na telefonu do 5, inače do 3 */}
        {Object.entries(stats.byCategory).slice(0, isMobile ? 5 : 3).map(([category, count]) => (
          <Stat key={category} label={category} value={count} />
        ))}
      </div>

      <Toolbar>
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga po serijskom broju, opisu..." />
        <Select size="sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Kategorija opreme">
          <option value="">Sve kategorije</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        <div className="sx-toolbar__end">
          <Btn size="sm" icon={RefreshCw} onClick={fetchEquipment} busy={loading}>Osveži</Btn>
        </div>
      </Toolbar>

      <Panel pad={false} title="Lista opreme" sub={`${filteredEquipment.length} od ${equipment.length} komada`}>
        {loading ? (
          <Loading text="Učitavanje opreme..." />
        ) : currentItems.length === 0 ? (
          <div className="sx-empty-block">
            <b>{searchTerm || categoryFilter ? 'Nema rezultata za zadatu pretragu' : 'Nemate zadužene opreme'}</b>
            {!isMobile && <span>Promenite filtere za pristup opremi</span>}
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="my-equipment-table">
              <thead>
                <tr>
                  <th>Kategorija</th>
                  <th>Opis</th>
                  <th>Serijski broj</th>
                  <th>Datum zaduženja</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={item.id} style={{ '--i': index }}>
                    <td className="is-head"><span className="sx-tag">{item.category}</span></td>
                    <td data-label="Opis" className="is-wide"><b className="mx-strong">{item.description}</b></td>
                    <td data-label="Serijski broj"><span className="sx-mono">{item.serialNumber}</span></td>
                    <td data-label="Datum zaduženja"><span className="sx-mono sx-nowrap">{formatDate(item.assignedAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <Pager page={currentPage} total={sortedEquipment.length} perPage={itemsPerPage} onPage={paginate} />}
      </Panel>
    </div>
  );
};

export default TechnicianEquipment;
