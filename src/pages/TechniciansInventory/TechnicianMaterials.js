import React, { useState, useEffect, useContext, useRef } from 'react';
import { RefreshCw, Filter, X, Wrench } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { cx, Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { SearchField, Select, Choice } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';
import { MobilePager, PagePager } from './TechnicianPagers';
import './TechnicianInventory.mx.css';

const TechnicianMaterials = () => {
  const { user } = useContext(AuthContext);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
  
  const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage);
  
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
    <div className="sx-page mx-tech" data-testid="page-my-materials">
      {/* povuci nadole na vrhu strane (telefon) = osveži */}
      {isMobile && (
        <div className={cx('mx-tinv-ptr', refreshing && 'is-on')} role="status" aria-live="polite">
          <RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />
          <span>{refreshing ? 'Osvežavanje...' : 'Povucite dole za osvežavanje'}</span>
        </div>
      )}

      <PageHead
        eyebrow="Montaža · Inventar"
        title="Moji materijali"
        lead="Pregled dodeljenih materijala"
        actions={isMobile ? (
          <>
            <Btn icon={RefreshCw} onClick={fetchMaterials} busy={loading} aria-label="Osveži" />
            <Btn icon={Filter} variant={showFilters ? 'primary' : undefined} onClick={() => setShowFilters(!showFilters)} aria-label="Filteri" aria-pressed={showFilters} />
          </>
        ) : (
          <Btn icon={RefreshCw} onClick={fetchMaterials} busy={loading}>Osveži</Btn>
        )}
      />

      {error && <Note tone="bad" className="mx-mb"><b>Greška:</b> {error}</Note>}

      <div className="mx-tech-stats is-4">
        <Stat label="Tipova" value={stats.total} />
        <Stat label="Ukupno" value={stats.totalQuantity} />
        {/* prva dva tipa sa količinom */}
        {Object.entries(stats.byType).slice(0, 2).map(([type, data]) => (
          <Stat key={type} label={type} value={data.quantity} />
        ))}
      </div>

      <Panel pad={false}>
        {/* Telefon: filteri u kartici iznad naslova, kao ranije */}
        {isMobile && showFilters && (
          <div className="mx-tech-inlinefilter">
            <div className="mx-tech-inlinefilter__head">
              <h3 className="sx-card__title">Filteri</h3>
              <Btn size="sm" variant="ghost" icon={X} onClick={() => setShowFilters(false)} aria-label="Zatvori" />
            </div>
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga po tipu..." />
            <div className="mx-tech-filter__group">
              <h4 className="sx-label">Tip materijala</h4>
              <Choice
                size="sm"
                label="Tip materijala"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[{ value: '', label: 'Svi' }, ...types.map(type => ({ value: type, label: type, title: type }))]}
              />
            </div>
          </div>
        )}

        <header className="sx-card__head sx-panel__head">
          <div className="sx-panel__titles">
            <h2 className="sx-card__title">Lista materijala</h2>
            <p className="sx-card__sub">{filteredMaterials.length} od {materials.length} tipova</p>
          </div>
        </header>

        {/* Desktop: pretraga i tip ispod naslova kartice */}
        {!isMobile && (
          <div className="mx-tech-controls">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga po tipu materijala..." />
            <Select size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Tip materijala">
              <option value="">Svi tipovi</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>
        )}

        {loading ? (
          <Loading text="Učitavanje materijala..." />
        ) : currentItems.length === 0 ? (
          <div className="sx-empty-block">
            <b>{searchTerm || typeFilter ? 'Nema rezultata za zadatu pretragu' : 'Nemate zadužene materijale'}</b>
          </div>
        ) : isMobile ? (
          // Telefon: kartice (ikonica, tip i podnaslov, količina)
          <div className="mx-tech-cards">
            {currentItems.map((item, index) => (
              <div key={item.id} className="mx-tech-card mx-tech-qcard" style={{ '--i': index }}>
                <span className="sx-item__icon"><Wrench size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                <div className="mx-tech-qcard__main">
                  <b title={item.type}>{item.type}</b>
                  <span>Material</span>
                </div>
                <div className="mx-tech-qcard__qty">
                  <b>{item.quantity}</b>
                  <span>kom</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="my-materials-table">
              <thead>
                <tr>
                  <th>Tip materijala</th>
                  <th>Količina</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={item.id} style={{ '--i': index }}>
                    <td className="is-head"><span className="sx-tag">{item.type}</span></td>
                    <td data-label="Količina"><b className="mx-strong">{item.quantity}</b> kom</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (isMobile ? (
          <MobilePager page={currentPage} pages={totalPages} onPage={paginate} prevLabel="Prethodna" nextLabel="Sledeća" text={`${currentPage} od ${totalPages}`} />
        ) : (
          <PagePager page={currentPage} pages={totalPages} onPage={paginate} text={`Stranica ${currentPage} od ${totalPages}`} />
        ))}
      </Panel>
    </div>
  );
};

export default TechnicianMaterials;
