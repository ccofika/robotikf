import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { materialsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../../security/sx/layout';
import { SearchField } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { Pager, ColumnMenu, Loading, LinkBtn } from '../../montaza/ui';

const MaterialsList = () => {
  // Prioritized loading states
  const [dashboardStats, setDashboardStats] = useState(null); // Prvi prioritet: statistike
  const [recentMaterials, setRecentMaterials] = useState([]); // Drugi prioritet: osnovni materijali
  const [allMaterials, setAllMaterials] = useState([]); // Treći prioritet: svi materijali

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(true);

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    quantity: true,
    actions: true
  });

  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Kombinovani materijali - koristi sve materijale ako su učitani, inače osnovne
  const materials = allLoading ? recentMaterials : allMaterials;

  useEffect(() => {
    // Prvi prioritet: Učitaj dashboard statistike
    fetchDashboardStats();

    // Drugi prioritet: Učitaj osnovne materijale (prva stranica)
    setTimeout(() => {
      fetchRecentMaterials();
    }, 300);

    // Treći prioritet: Učitaj sve materijale u pozadini
    setTimeout(() => {
      fetchAllMaterials();
    }, 1000);
  }, []);
  
  // Prvi prioritet: Učitaj samo osnovne statistike
  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    setError('');

    try {
      // Učitaj samo osnovne informacije za statistike
      const response = await materialsAPI.getAll();
      const materials = response.data;

      const stats = {
        total: materials.length,
        outOfStock: materials.filter(item => item.quantity === 0).length,
        lowStock: materials.filter(item => item.quantity > 0 && item.quantity < 5).length
      };

      setDashboardStats(stats);
    } catch (error) {
      console.error('Greška pri učitavanju statistika:', error);
      setError('Greška pri učitavanju statistika.');
    } finally {
      setDashboardLoading(false);
    }
  };

  // Drugi prioritet: Učitaj osnovne materijale za prikaz
  const fetchRecentMaterials = async () => {
    setRecentLoading(true);

    try {
      // Učitaj samo prvu stranicu materijala
      const response = await materialsAPI.getAll();
      setRecentMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju osnovnih materijala:', error);
      setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje materijala!');
    } finally {
      setRecentLoading(false);
    }
  };

  // Treći prioritet: Učitaj sve materijale u pozadini
  const fetchAllMaterials = async () => {
    setAllLoading(true);

    try {
      const response = await materialsAPI.getAll();
      setAllMaterials(response.data);

      // Ažuriraj statistike sa kompletnim podacima
      const stats = {
        total: response.data.length,
        outOfStock: response.data.filter(item => item.quantity === 0).length,
        lowStock: response.data.filter(item => item.quantity > 0 && item.quantity < 5).length
      };
      setDashboardStats(stats);
    } catch (error) {
      console.error('Greška pri učitavanju svih materijala:', error);
      // Ne prikazuj grešku ako su osnovni materijali već učitani
      if (recentMaterials.length === 0) {
        setError('Greška pri učitavanju materijala. Pokušajte ponovo.');
        toast.error('Neuspešno učitavanje materijala!');
      }
    } finally {
      setAllLoading(false);
    }
  };

  // Refresh funkcija - zadržava kompatibilnost
  const fetchMaterials = async () => {
    setDashboardLoading(true);
    setRecentLoading(true);
    setAllLoading(true);

    await fetchDashboardStats();
    await fetchRecentMaterials();
    await fetchAllMaterials();
  };
  
  const handleDelete = async (id, type) => {
    if (await confirm({ title: `Da li ste sigurni da želite da obrišete materijal "${type}"?`, tone: 'danger', confirmLabel: 'Obriši' })) {
      // OPTIMISTIC UPDATE - immediately remove from both lists
      const originalRecentMaterials = [...recentMaterials];
      const originalAllMaterials = [...allMaterials];

      setRecentMaterials(prev => prev.filter(mat => mat._id !== id));
      setAllMaterials(prev => prev.filter(mat => mat._id !== id));

      try {
        await materialsAPI.delete(id);
        toast.success('Materijal je uspešno obrisan!');
        // Success - optimistic update already done
      } catch (error) {
        console.error('Greška pri brisanju materijala:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju materijala.';
        toast.error(errorMessage);

        // ROLLBACK - restore original data on error
        setRecentMaterials(originalRecentMaterials);
        setAllMaterials(originalAllMaterials);
      }
    }
  };
  
  // Filtriranje materijala
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const searchMatch = searchTerm === '' || 
                         material.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      return searchMatch;
    });
  }, [materials, searchTerm]);
  
  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);
  
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  const busy = dashboardLoading || recentLoading || allLoading;
  const pct = (n) => (dashboardStats?.total ? Math.round((n / dashboardStats.total) * 100) : 0);

  return (
    <div className="sx-page" data-testid="page-materials">
      <PageHead
        eyebrow="Montaža · Inventar"
        title="Pregled materijala"
        lead="Upravljanje inventarom materijala"
        actions={<LinkBtn to="/materials/add" variant="primary" icon={Plus} data-testid="add-material">Dodaj materijal</LinkBtn>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      <div className="sx-stats">
        <Stat label="Ukupno materijala" value={dashboardStats?.total || 0} sub="vrsta u magacinu" />
        <Stat label="Nema na stanju" value={dashboardStats?.outOfStock || 0} small={`${pct(dashboardStats?.outOfStock || 0)}%`} tone={dashboardStats?.outOfStock ? 'bad' : null} sub="količina 0" />
        <Stat label="Malo na stanju" value={dashboardStats?.lowStock || 0} small={`${pct(dashboardStats?.lowStock || 0)}%`} tone={dashboardStats?.lowStock ? 'warn' : null} sub="manje od 5" />
      </div>

      <Toolbar>
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži po nazivu materijala..." />
        <div className="sx-toolbar__end">
          <ColumnMenu columns={{ type: 'Vrsta materijala', quantity: 'Količina', actions: 'Akcije' }} visible={visibleColumns}
            onChange={(key, v) => setVisibleColumns(prev => ({ ...prev, [key]: v }))} />
          <Btn size="sm" icon={RefreshCw} onClick={fetchMaterials} busy={busy}>Osveži</Btn>
        </div>
      </Toolbar>

      <Panel pad={false}>
        {(dashboardLoading || recentLoading) ? (
          <Loading text="Učitavanje materijala..." />
        ) : (
          <>
            {currentItems.length === 0 ? (
              <div className="sx-empty-block">
                <b>Nema rezultata za prikazivanje</b>
                <span>Promenite filtere za pristup materijalima</span>
              </div>
            ) : (
              <div className="sx-tablewrap">
                <table className="sx-table" data-testid="materials-table">
                  <thead>
                    <tr>
                      {visibleColumns.type && <th>Vrsta materijala</th>}
                      {visibleColumns.quantity && <th className="is-num">Količina</th>}
                      {visibleColumns.actions && <th className="is-end">Akcije</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((material, index) => (
                      <tr key={material._id} style={{ '--i': index }}>
                        {visibleColumns.type && <td className="is-head"><b className="mx-strong">{material.type}</b></td>}
                        {visibleColumns.quantity && (
                          <td data-label="Količina" className="is-num">
                            {material.quantity === 0 ? <Sign tone="bad">{material.quantity}</Sign>
                              : material.quantity < 5 ? <Sign tone="warn">{material.quantity}</Sign>
                                : <span className="sx-mono">{material.quantity}</span>}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="is-actions is-end">
                            <div className="sx-rowacts">
                              <LinkBtn to={`/materials/edit/${material._id}`} size="sm" variant="ghost" icon={Pencil}>Izmeni</LinkBtn>
                              <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDelete(material._id, material.type)} disabled={busy}>Obriši</Btn>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager page={currentPage} total={filteredMaterials.length} perPage={itemsPerPage} onPage={paginate} />
          </>
        )}
      </Panel>
    </div>
  );
};

export default MaterialsList;