import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Plus, MapPin, Eye, Trash2, Package, Wrench, RefreshCw, CalendarDays, Star, UserCog, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI, reviewsAPI } from '../../services/api';
import { cx, Btn, Sign, Avatar } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../../security/sx/layout';
import { SearchField, Select, MonthCalendar } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { Pager, ColumnMenu, Loading, LinkBtn } from '../../montaza/ui';
import './TechniciansList.mx.css';

// Datum za kalendar ('GGGG-MM-DD', lokalni dan) i nazad u Date
const pad2 = (n) => String(n).padStart(2, '0');
const toYmd = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
// Kao ranije (react-datepicker): novi dan zadržava sat, minut i sekund prethodnog datuma
const fromYmd = (ymd, prev) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const p = prev ? new Date(prev) : null;
  return p ? new Date(y, m - 1, d, p.getHours(), p.getMinutes(), p.getSeconds()) : new Date(y, m - 1, d);
};

const TechniciansList = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    status: true,
    createdAt: true,
    employedUntil: true,
    actions: true
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [editingDateId, setEditingDateId] = useState(null);

  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Review stats za sve tehničare
  const [reviewStatsMap, setReviewStatsMap] = useState({});

  // Sekcija "Sve ocene"
  const [allReviews, setAllReviews] = useState([]);
  const [allReviewsTotal, setAllReviewsTotal] = useState(0);
  const [allReviewsPage, setAllReviewsPage] = useState(1);
  const [allReviewsLoading, setAllReviewsLoading] = useState(false);
  const [allReviewsTechnicianFilter, setAllReviewsTechnicianFilter] = useState(''); // '' = svi
  const allReviewsLimit = 20;

  useEffect(() => {
    // Preuzmi trenutnog korisnika iz localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    fetchTechnicians();
    fetchAllReviewStats();
    fetchAllReviews(1, '');
  }, []);

  // Učitaj ocene kad se promeni filter ili stranica
  useEffect(() => {
    fetchAllReviews(allReviewsPage, allReviewsTechnicianFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReviewsPage, allReviewsTechnicianFilter]);

  const fetchTechnicians = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await techniciansAPI.getAll();
      setTechnicians(response.data.filter(t => !t.deletedAt));
    } catch (error) {
      console.error('Greška pri učitavanju tehničara:', error);
      setError('Greška pri učitavanju tehničara. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje tehničara!');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReviewStats = async () => {
    try {
      const response = await reviewsAPI.getAllStats();
      setReviewStatsMap(response.data);
    } catch (error) {
      console.error('[Reviews] Greška pri učitavanju statistike:', error);
    }
  };

  const fetchAllReviews = async (page, technicianId) => {
    setAllReviewsLoading(true);
    try {
      const response = await reviewsAPI.getAllReviews(page, allReviewsLimit, technicianId || null);
      setAllReviews(response.data.reviews || []);
      setAllReviewsTotal(response.data.total || 0);
    } catch (error) {
      console.error('[Reviews] Greška pri učitavanju svih ocena:', error);
      toast.error('Greška pri učitavanju ocena');
    } finally {
      setAllReviewsLoading(false);
    }
  };

  const handleDeleteReviewFromList = async (reviewId) => {
    if (!(await confirm({ title: 'Da li ste sigurni da želite da obrišete ovu ocenu?', tone: 'danger', confirmLabel: 'Obriši' }))) return;
    try {
      await reviewsAPI.deleteReview(reviewId);
      toast.success('Ocena uspešno obrisana');
      // Osveži ocene i stats
      fetchAllReviews(allReviewsPage, allReviewsTechnicianFilter);
      fetchAllReviewStats();
    } catch (error) {
      console.error('[Reviews] Greška pri brisanju ocene:', error);
      toast.error('Greška pri brisanju ocene');
    }
  };

  // Helper za prikaz zvezdica (1-5)
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star key={i} size={14} strokeWidth={1.5} fill={i <= rating ? 'currentColor' : 'none'} className={i <= rating ? 'mx-techs-star' : undefined} aria-hidden="true" />
      );
    }
    return stars;
  };

  const allReviewsTotalPages = Math.ceil(allReviewsTotal / allReviewsLimit);

  // Grupiše ocene iz trenutne strane po tehničaru (zadržava redosled)
  // Vraća niz: [{ technicianId, technicianName, stats, reviews: [...] }, ...]
  const groupedReviewsOnPage = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    allReviews.forEach((review) => {
      const techId = review.technicianId?.toString() || 'unknown';
      if (!groupMap.has(techId)) {
        const group = {
          technicianId: techId,
          technicianName: review.technicianName || 'Nepoznat tehničar',
          stats: reviewStatsMap[techId] || null,
          reviews: []
        };
        groupMap.set(techId, group);
        groups.push(group);
      }
      groupMap.get(techId).reviews.push(review);
    });

    return groups;
  }, [allReviews, reviewStatsMap]);

  const handleDelete = async (id, name) => {
    if (await confirm({
      title: `Da li ste sigurni da želite da obrišete tehničara "${name}"?`,
      text: 'Nestaće iz spiskova i neće moći da se prijavi. Instalirana oprema, zaduženja, nalozi i istorija ostaju kako jesu.',
      tone: 'danger',
      confirmLabel: 'Obriši'
    })) {
      // OPTIMISTIC UPDATE - immediately remove from UI
      const originalTechnicians = [...technicians];
      setTechnicians(prev => prev.filter(tech => tech._id !== id));

      try {
        await techniciansAPI.delete(id);
        toast.success('Tehničar je uspešno obrisan!');
        // Success - optimistic update already done
      } catch (error) {
        console.error('Greška pri brisanju tehničara:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju tehničara.';
        toast.error(errorMessage);

        // ROLLBACK - restore original data on error
        setTechnicians(originalTechnicians);
      }
    }
  };

  const handleToggleStatus = async (id, name, currentIsActive) => {
    const newIsActive = !currentIsActive;

    // OPTIMISTIC UPDATE
    const originalTechnicians = [...technicians];
    setTechnicians(prev => prev.map(tech =>
      tech._id === id ? { ...tech, isActive: newIsActive } : tech
    ));

    try {
      const response = await techniciansAPI.toggleStatus(id);
      // Sync sa serverovim odgovorom za sigurnost
      setTechnicians(prev => prev.map(tech =>
        tech._id === id ? { ...tech, isActive: response.data.isActive } : tech
      ));
      toast.success(`${name} je sada ${response.data.isActive ? 'aktivan' : 'neaktivan'}`);
    } catch (error) {
      console.error('Greška pri promeni statusa:', error);
      toast.error('Greška pri promeni statusa tehničara.');
      setTechnicians(originalTechnicians);
    }
  };

  const handleEmployedUntilChange = async (id, date) => {
    const originalTechnicians = [...technicians];
    setTechnicians(prev => prev.map(tech =>
      tech._id === id ? { ...tech, employedUntil: date ? date.toISOString() : null } : tech
    ));
    setEditingDateId(null);

    try {
      await techniciansAPI.update(id, { employedUntil: date ? date.toISOString() : null });
      toast.success('Datum zaposlenja ažuriran');
    } catch (error) {
      console.error('Greška pri ažuriranju datuma:', error);
      toast.error('Greška pri ažuriranju datuma.');
      setTechnicians(originalTechnicians);
    }
  };

  // Helper za proveru da li ugovor ističe uskoro (30 dana)
  const getContractStatus = (employedUntil) => {
    if (!employedUntil) return null;
    const now = new Date();
    const expiry = new Date(employedUntil);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'ok';
  };

  // Helper funkcije za proveru role-a
  const isAdminRole = (role) => ['admin', 'superadmin', 'supervisor'].includes(role);
  const isSupervisorLike = (role) => ['superadmin', 'supervisor'].includes(role);

  // Separisanje korisnika na adminske i tehničare
  const { adminUsers, technicianUsers } = useMemo(() => {
    const admins = [];
    const techs = [];

    technicians.forEach(tech => {
      if (isAdminRole(tech.role)) {
        admins.push(tech);
      } else {
        techs.push(tech);
      }
    });

    return { adminUsers: admins, technicianUsers: techs };
  }, [technicians]);

  // Filtriranje tehničara za tabelu
  const filteredTechnicians = useMemo(() => {
    return technicianUsers.filter(technician => {
      const searchMatch = searchTerm === '' ||
                         technician.name.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = statusFilter === 'all' ||
                         (statusFilter === 'active' && technician.isActive !== false) ||
                         (statusFilter === 'inactive' && technician.isActive === false);

      return searchMatch && statusMatch;
    });
  }, [technicianUsers, searchTerm, statusFilter]);

  // Filtriranje admin korisnika - vidljivi samo za superadmin i supervisor
  const visibleAdminUsers = useMemo(() => {
    if (!currentUser) return [];
    if (isSupervisorLike(currentUser.role)) {
      return adminUsers.filter(admin =>
        searchTerm === '' || admin.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return [];
  }, [adminUsers, currentUser, searchTerm]);

  // Statistike
  const activeCount = useMemo(() => technicianUsers.filter(t => t.isActive !== false).length, [technicianUsers]);
  const inactiveCount = useMemo(() => technicianUsers.filter(t => t.isActive === false).length, [technicianUsers]);

  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTechnicians.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Kolone za column visibility dropdown
  const columnLabels = {
    name: 'Ime',
    status: 'Status',
    createdAt: 'Datum kreiranja',
    employedUntil: 'Zaposlen do',
    actions: 'Akcije'
  };

  // Paginacija ocena (isti tekst kao ranije): prva, poslednja i ±1 oko trenutne
  const reviewPages = Array.from({ length: allReviewsTotalPages }, (_, i) => i + 1)
    .filter((number) => number === 1 || number === allReviewsTotalPages || Math.abs(number - allReviewsPage) <= 1);

  return (
    <div className="sx-page" data-testid="page-technicians">
      <PageHead
        eyebrow="Montaža · Tehničari"
        title="Pregled tehničara"
        lead="Upravljanje listom tehničara"
        actions={<>
          <LinkBtn to="/technicians/gps" icon={MapPin}>GPS Lokacije</LinkBtn>
          <LinkBtn to="/technicians/add" variant="primary" icon={Plus}>Dodaj tehničara</LinkBtn>
        </>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      <div className="sx-stats">
        <Stat label="Ukupno tehničara" value={technicianUsers.length} onClick={() => setStatusFilter('all')} selected={statusFilter === 'all'} />
        <Stat label="Aktivni" value={activeCount} tone={activeCount ? 'ok' : null} onClick={() => setStatusFilter('active')} selected={statusFilter === 'active'} />
        <Stat label="Neaktivni" value={inactiveCount} tone={inactiveCount ? 'bad' : null} onClick={() => setStatusFilter('inactive')} selected={statusFilter === 'inactive'} />
        <Stat label="Administratori" value={visibleAdminUsers.length} />
      </div>

      <Toolbar>
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži po imenu tehničara..." />
        <div className="sx-toolbar__end">
          <ColumnMenu columns={columnLabels} visible={visibleColumns}
            onChange={(key, v) => setVisibleColumns(prev => ({ ...prev, [key]: v }))} />
          <Btn size="sm" icon={RefreshCw} onClick={fetchTechnicians} busy={loading}>Osveži</Btn>
        </div>
      </Toolbar>

      <div className="sx-stack">
        {/* Administratorski nalozi: vidljivi samo za superadmin i supervisor */}
        {visibleAdminUsers.length > 0 && (
          <Panel title="Administratorski nalozi">
            <div className="sx-list">
              {visibleAdminUsers.map((admin) => (
                <div key={admin._id} className="sx-item">
                  <span className="sx-item__icon"><UserCog size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <div className="sx-item__main">
                    <b>{admin.name}</b>
                    <span>ID: <span className="sx-mono">{admin._id}</span> · Kreiran: {new Date(admin.createdAt).toLocaleDateString('sr-RS')}</span>
                  </div>
                  <div className="sx-item__side">
                    <span className={cx('sx-tag', admin.role === 'superadmin' && 'is-ink')}>
                      {admin.role === 'superadmin' ? 'Super Admin' : admin.role === 'supervisor' ? 'Supervisor' : 'Admin'}
                    </span>
                    <LinkBtn to={`/technicians/${admin._id}`} size="sm" variant="ghost" icon={Eye} title="Detalji korisnika">Detalji</LinkBtn>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel pad={false}>
          {loading ? (
            <Loading text="Učitavanje tehničara..." />
          ) : (
            <>
              {currentItems.length === 0 ? (
                <div className="sx-empty-block">
                  <b>{searchTerm ? `Nema rezultata za "${searchTerm}"` : 'Nema tehničara za prikazivanje'}</b>
                  <span>Promenite filtere ili dodajte novog tehničara</span>
                </div>
              ) : (
                <div className="sx-tablewrap">
                  <table className="sx-table mx-techs-table" data-testid="technicians-table">
                    <thead>
                      <tr>
                        {visibleColumns.name && <th>Ime</th>}
                        {visibleColumns.status && <th>Status</th>}
                        {visibleColumns.createdAt && <th>Datum kreiranja</th>}
                        {visibleColumns.employedUntil && <th>Zaposlen do</th>}
                        <th>Ocena</th>
                        {visibleColumns.actions && <th className="is-end">Akcije</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((technician, index) => {
                        const isInactive = technician.isActive === false;
                        const contractStatus = getContractStatus(technician.employedUntil);
                        const stats = reviewStatsMap[technician._id];

                        return (
                          <tr key={technician._id} style={{ '--i': index }}>
                            {visibleColumns.name && (
                              <td className="is-head">
                                <div className="sx-cell">
                                  <b className={isInactive ? 'mx-techs-off' : undefined}>{technician.name}</b>
                                  <span className="sx-mono">ID: {technician._id}</span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.status && (
                              <td data-label="Status">
                                <Btn size="sm" variant="ghost" className="mx-techs-pill"
                                  onClick={() => handleToggleStatus(technician._id, technician.name, technician.isActive !== false)}
                                  title={isInactive ? 'Kliknite za aktiviranje' : 'Kliknite za deaktiviranje'}>
                                  <Sign tone={isInactive ? 'bad' : 'ok'}>{isInactive ? 'Neaktivan' : 'Aktivan'}</Sign>
                                </Btn>
                              </td>
                            )}
                            {visibleColumns.createdAt && (
                              <td data-label="Datum kreiranja"><span className="sx-mono">{new Date(technician.createdAt).toLocaleDateString('sr-RS')}</span></td>
                            )}
                            {visibleColumns.employedUntil && (
                              <td data-label="Zaposlen do">
                                <Popover.Root open={editingDateId === technician._id} onOpenChange={(open) => setEditingDateId(open ? technician._id : null)}>
                                  <Popover.Trigger asChild>
                                    <Btn size="sm" variant="ghost" className="mx-techs-pill" icon={technician.employedUntil ? undefined : CalendarDays} title="Kliknite za izmenu datuma">
                                      {technician.employedUntil ? (
                                        <>
                                          <span className="sx-mono">{new Date(technician.employedUntil).toLocaleDateString('sr-RS')}</span>
                                          {contractStatus === 'expired' && <span className="sx-tag is-bad">ISTEKAO</span>}
                                          {contractStatus === 'warning' && (
                                            <span className="sx-tag is-warn">{Math.ceil((new Date(technician.employedUntil) - new Date()) / (1000 * 60 * 60 * 24))}d</span>
                                          )}
                                        </>
                                      ) : <span className="sx-faint">Postavi datum</span>}
                                    </Btn>
                                  </Popover.Trigger>
                                  <Popover.Portal>
                                    <Popover.Content className="sx-portal sx-popover" align="start" sideOffset={6} collisionPadding={12}>
                                      <MonthCalendar
                                        value={toYmd(technician.employedUntil)}
                                        onPick={(ymd) => (ymd === toYmd(technician.employedUntil)
                                          ? setEditingDateId(null)
                                          : handleEmployedUntilChange(technician._id, fromYmd(ymd, technician.employedUntil)))}
                                        clearable={!!technician.employedUntil}
                                        onClear={() => handleEmployedUntilChange(technician._id, null)}
                                      />
                                    </Popover.Content>
                                  </Popover.Portal>
                                </Popover.Root>
                              </td>
                            )}
                            <td data-label="Ocena">
                              {stats ? (
                                <span className="mx-techs-rating">
                                  <Star size={14} strokeWidth={1.5} fill="currentColor" className="mx-techs-star" aria-hidden="true" />
                                  <b>{stats.avgProfessionalism}</b>
                                  <span className="sx-faint">({stats.totalReviews})</span>
                                </span>
                              ) : (
                                <span className="sx-faint">-</span>
                              )}
                            </td>
                            {visibleColumns.actions && (
                              <td className="is-actions is-end">
                                <div className="sx-rowacts">
                                  <LinkBtn to={`/technicians/${technician._id}/assign-equipment`} size="sm" variant="ghost" icon={Package} title="Zaduži/razduži opremu">Oprema</LinkBtn>
                                  <LinkBtn to={`/technicians/${technician._id}/assign-material`} size="sm" variant="ghost" icon={Wrench} title="Zaduži/razduži materijal">Materijal</LinkBtn>
                                  <LinkBtn to={`/technicians/${technician._id}`} size="sm" variant="ghost" icon={Eye} title="Detalji tehničara">Detalji</LinkBtn>
                                  <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDelete(technician._id, technician.name)}
                                    disabled={loading} title="Obriši tehničara">Obriši</Btn>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Pager page={currentPage} total={filteredTechnicians.length} perPage={itemsPerPage} onPage={paginate} />
            </>
          )}
        </Panel>

        {/* Sve ocene korisnika */}
        <Panel
          pad={false}
          className="mx-techs-reviews"
          title="Sve ocene korisnika"
          sub={allReviewsTotal > 0
            ? `Ukupno ${allReviewsTotal} ${allReviewsTotal === 1 ? 'ocena' : 'ocena/e'}`
            : 'Nema ocena u sistemu'}
          actions={<>
            <label htmlFor="mx-techs-review-filter" className="sx-muted">Filter:</label>
            <Select
              id="mx-techs-review-filter"
              size="sm"
              value={allReviewsTechnicianFilter}
              onChange={(e) => {
                setAllReviewsTechnicianFilter(e.target.value);
                setAllReviewsPage(1); // Reset na prvu stranu pri promeni filtera
              }}
            >
              <option value="">Svi tehničari</option>
              {technicianUsers
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((tech) => (
                  <option key={tech._id} value={tech._id}>
                    {tech.name}
                  </option>
                ))}
            </Select>
            <Btn size="sm" icon={RefreshCw} onClick={() => fetchAllReviews(allReviewsPage, allReviewsTechnicianFilter)} disabled={allReviewsLoading}>Osveži</Btn>
          </>}
        >
          {allReviewsLoading ? (
            <Loading text="Učitavanje ocena..." />
          ) : allReviewsTotal === 0 ? (
            <div className="sx-empty-block">
              <b>{allReviewsTechnicianFilter ? 'Nema ocena za izabranog tehničara' : 'Nema ocena u sistemu'}</b>
            </div>
          ) : (
            <>
              {/* Grupisane ocene po tehničaru */}
              {groupedReviewsOnPage.map((group) => (
                <section key={group.technicianId} className="mx-techs-group">
                  <div className="mx-techs-group__head">
                    <div className="sx-cell sx-cell--who">
                      <Avatar name={group.technicianName} />
                      <Link to={`/technicians/${group.technicianId}`} className="mx-techs-group__name">{group.technicianName}</Link>
                      <span>{group.reviews.length} {group.reviews.length === 1 ? 'ocena' : 'ocena/e'} na ovoj stranici</span>
                    </div>

                    {/* Suma za tehničara (iz reviewStatsMap) */}
                    {group.stats && group.stats.totalReviews > 0 ? (
                      <dl className="mx-techs-sum">
                        <div><dt className="sx-label">Ukupno</dt><dd>{group.stats.totalReviews}</dd></div>
                        <div>
                          <dt className="sx-label">Profesionalnost</dt>
                          <dd><Star size={14} strokeWidth={1.5} fill="currentColor" className="mx-techs-star" aria-hidden="true" />{group.stats.avgProfessionalism}</dd>
                        </div>
                        <div>
                          <dt className="sx-label">Kvalitet</dt>
                          <dd><Star size={14} strokeWidth={1.5} fill="currentColor" className="mx-techs-star is-info" aria-hidden="true" />{group.stats.avgServiceQuality}</dd>
                        </div>
                        <div><dt className="sx-label">NPS</dt><dd>{group.stats.avgNps}/10</dd></div>
                      </dl>
                    ) : (
                      <span className="sx-faint">-</span>
                    )}
                  </div>

                  {/* Tabela ocena za ovog tehničara */}
                  <div className="sx-tablewrap">
                    <table className="sx-table">
                      <thead>
                        <tr>
                          <th>Korisnik</th>
                          <th>Datum</th>
                          <th>Prof.</th>
                          <th>Servis</th>
                          <th>NPS</th>
                          <th>Termin</th>
                          <th>Urednost</th>
                          <th>Komentar</th>
                          <th className="is-end" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.reviews.map((review, i) => (
                          <tr key={review._id} style={{ '--i': i }}>
                            <td className="is-head">
                              <div className="sx-cell">
                                <b>{review.customerName || 'Anonimni'}</b>
                                {review.tisJobId && <span className="sx-mono">#{review.tisJobId}</span>}
                              </div>
                            </td>
                            <td data-label="Datum"><span className="sx-mono sx-nowrap">{new Date(review.createdAt).toLocaleDateString('sr-RS')}</span></td>
                            <td data-label="Prof.">
                              <span className="mx-techs-stars">{renderStars(review.professionalism)}</span>
                              <span className="mx-techs-score">{review.professionalism}/5</span>
                            </td>
                            <td data-label="Servis">
                              <span className="mx-techs-stars">{renderStars(review.serviceQuality)}</span>
                              <span className="mx-techs-score">{review.serviceQuality}/5</span>
                            </td>
                            <td data-label="NPS">
                              <Sign tone={review.npsScore >= 9 ? 'ok' : review.npsScore >= 7 ? 'warn' : 'bad'}>{review.npsScore}/10</Sign>
                            </td>
                            <td data-label="Termin">{review.onTime}</td>
                            <td data-label="Urednost">
                              {review.cleanInstallation}
                              {review.cleanInstallationComment && (
                                <div className="mx-techs-quote">"{review.cleanInstallationComment}"</div>
                              )}
                            </td>
                            <td data-label="Komentar" className="is-wide">
                              {review.comment ? (
                                <span className="mx-techs-quote" title={review.comment}>
                                  "{review.comment.length > 60 ? review.comment.substring(0, 60) + '...' : review.comment}"
                                </span>
                              ) : (
                                <span className="sx-faint">-</span>
                              )}
                            </td>
                            <td className="is-actions is-end">
                              <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDeleteReviewFromList(review._id)}
                                title="Obriši ocenu" aria-label="Obriši ocenu" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}

              {/* Paginacija */}
              {allReviewsTotalPages > 1 && (
                <nav className="mx-pager" aria-label="Stranice ocena">
                  <span className="mx-pager__text">
                    Stranica {allReviewsPage} od {allReviewsTotalPages} •{' '}
                    Prikazano {(allReviewsPage - 1) * allReviewsLimit + 1} -{' '}
                    {Math.min(allReviewsPage * allReviewsLimit, allReviewsTotal)} od {allReviewsTotal}
                  </span>
                  <span className="mx-pager__btns">
                    <Btn size="sm" variant="ghost" icon={ChevronsLeft} onClick={() => setAllReviewsPage(1)} disabled={allReviewsPage === 1} aria-label="Prva strana" />
                    <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setAllReviewsPage(allReviewsPage - 1)} disabled={allReviewsPage === 1} aria-label="Prethodna strana" />
                    {reviewPages.map((number, idx) => (
                      <React.Fragment key={number}>
                        {idx > 0 && number - reviewPages[idx - 1] > 1 && <span className="mx-pager__gap" aria-hidden="true">...</span>}
                        <Btn size="sm" variant={allReviewsPage === number ? 'primary' : 'ghost'} className="mx-pager__num"
                          onClick={() => setAllReviewsPage(number)} aria-current={allReviewsPage === number ? 'page' : undefined}>{number}</Btn>
                      </React.Fragment>
                    ))}
                    <Btn size="sm" variant="ghost" icon={ChevronRight} onClick={() => setAllReviewsPage(allReviewsPage + 1)} disabled={allReviewsPage === allReviewsTotalPages} aria-label="Sledeća strana" />
                    <Btn size="sm" variant="ghost" icon={ChevronsRight} onClick={() => setAllReviewsPage(allReviewsTotalPages)} disabled={allReviewsPage === allReviewsTotalPages} aria-label="Poslednja strana" />
                  </span>
                </nav>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default TechniciansList;
