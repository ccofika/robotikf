import React, { useState, useEffect, useContext, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../../security/sx/layout';
import { SearchField, Select } from '../../security/sx/forms';
import { Pager, Loading } from '../../montaza/ui';
import './TechnicianInventory.mx.css';

const TechnicianMaterials = () => {
  const { user } = useContext(AuthContext);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [refreshing, setRefreshing] = useState(false);
  
  // Touch gestures
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 8 : 10;
  
  useEffect(() => {
    fetchMaterials();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user?._id]);
  
  const fetchMaterials = async () => {
    if (!user?._id) return;
    
    console.log('=== FETCHING MATERIALS ===');
    console.log('User object:', user);
    console.log('User ID:', user._id);
    console.log('User ID type:', typeof user._id);
    console.log('User ID length:', user._id?.length);
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Calling techniciansAPI.getMaterials with ID:', user._id);
      const response = await techniciansAPI.getMaterials(user._id);
      console.log('Materials response:', response.data);
      setMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje materijala!');
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality for mobile - only at top of page
  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchMaterials();
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
  
  // Filtriranje materijala
  const filteredMaterials = materials.filter(item => {
    const searchMatch = searchTerm === '' || 
                       item.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const typeMatch = typeFilter === '' || item.type === typeFilter;
    
    return searchMatch && typeMatch;
  });
  
  // Sortiranje po tipu
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    // Prvo sortiramo po tipu
    if (a.type < b.type) return -1;
    if (a.type > b.type) return 1;
    
    return 0;
  });
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedMaterials.slice(indexOfFirstItem, indexOfLastItem);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top on mobile when paginating
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Tipovi materijala za filter
  const types = [...new Set(materials.map(item => item.type))];
  
  // Statistike
  const stats = {
    total: materials.length,
    totalQuantity: materials.reduce((sum, item) => sum + item.quantity, 0),
    byType: types.reduce((acc, type) => {
      const typeItems = materials.filter(item => item.type === type);
      acc[type] = {
        count: typeItems.length,
        quantity: typeItems.reduce((sum, item) => sum + item.quantity, 0)
      };
      return acc;
    }, {})
  };
  
  return (
    <div className="sx-page mx-tinv" data-testid="page-my-materials">
      {/* povuci nadole na vrhu strane (telefon) = osveži */}
      {isMobile && (
        <div className={cx('mx-tinv-ptr', refreshing && 'is-on')} role="status" aria-live="polite">
          <RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />
          <span>{refreshing ? 'Osvežavanje...' : 'Povucite dole za osvežavanje'}</span>
        </div>
      )}

      <PageHead eyebrow="Montaža · Inventar" title="Moji materijali" lead="Pregled dodeljenih materijala" />

      {error && <Note tone="bad" className="mx-mb"><b>Greška:</b> {error}</Note>}

      <div className="sx-stats">
        <Stat label="Tipova" value={stats.total} />
        <Stat label="Ukupno" value={stats.totalQuantity} />
        {/* prva dva tipa sa količinom */}
        {Object.entries(stats.byType).slice(0, 2).map(([type, data]) => (
          <Stat key={type} label={type} value={data.quantity} />
        ))}
      </div>

      <Toolbar>
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga po tipu materijala..." />
        <Select size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Tip materijala">
          <option value="">Svi tipovi</option>
          {types.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <div className="sx-toolbar__end">
          <Btn size="sm" icon={RefreshCw} onClick={fetchMaterials} busy={loading}>Osveži</Btn>
        </div>
      </Toolbar>

      <Panel pad={false} title="Lista materijala" sub={`${filteredMaterials.length} od ${materials.length} tipova`}>
        {loading ? (
          <Loading text="Učitavanje materijala..." />
        ) : currentItems.length === 0 ? (
          <div className="sx-empty-block">
            <b>{searchTerm || typeFilter ? 'Nema rezultata za zadatu pretragu' : 'Nemate zadužene materijale'}</b>
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table mx-tinv-qtable" data-testid="my-materials-table">
              <thead>
                <tr>
                  <th>Tip materijala</th>
                  <th className="is-num">Količina</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={item.id} style={{ '--i': index }}>
                    <td className="is-head"><b className="mx-strong">{item.type}</b></td>
                    <td data-label="Količina" className="is-num">
                      {item.quantity === 0 ? <Sign tone="bad">{item.quantity} kom</Sign> : <span>{item.quantity} kom</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <Pager page={currentPage} total={sortedMaterials.length} perPage={itemsPerPage} onPage={paginate} />}
      </Panel>
    </div>
  );
};

export default TechnicianMaterials;
