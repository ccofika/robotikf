// Raspored smena: nedelja po objektu (redovi su radnici) ili po radniku (redovi su njegovi objekti).
// Uvek dve smene po 12 h: dnevna 07-19 (papir) i noćna 19-07 (tuš). Prvi red je pokrivenost: odmah se
// vidi koja smena nema radnika. Klik na prazno polje otvara izbor smene tačno na tom mestu, klik na
// smenu otvara njene detalje. Nacrt (šrafura) radnik ne vidi dok se raspored ne objavi.
// Na uskom prostoru (< 760 px) isti podaci su po danima (dan -> dnevna / noćna -> radnici).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Sun, Moon, ChevronLeft, ChevronRight, Send, Copy, Repeat, UserPlus, Check, Plus, CalendarDays } from 'lucide-react';
import { sec, errText, errData } from '../api';
import { useSec } from '../SecurityApp';
import { cx, Btn, Led, Avatar, Sign, plural, withCount, useWidth } from '../sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../sx/layout';
import { Choice, Select, DateField } from '../sx/forms';
import Dialog from '../sx/Dialog';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import { addDays, weekStart, todayYmd, fmtYmdShort, DAY_SHORT, DAY_LONG, dowOfYmd, MONTHS } from '../lib/time';
import '../sx/schedule.css';

const TYPES = { day: { label: 'Dnevna', short: 'Dan', text: '07-19', icon: Sun }, night: { label: 'Noćna', short: 'Noć', text: '19-07', icon: Moon } };
export const emitChanged = () => window.dispatchEvent(new Event('sec:changed'));

function weekLabel(ws) {
  const we = addDays(ws, 6);
  const [y1, m1, d1] = ws.split('-').map(Number);
  const [y2, m2, d2] = we.split('-').map(Number);
  if (m1 === m2) return `${d1}-${d2}. ${MONTHS[m1 - 1]} ${y2}.`;
  return `${d1}. ${MONTHS[m1 - 1]}${y1 !== y2 ? ` ${y1}.` : ''} - ${d2}. ${MONTHS[m2 - 1]} ${y2}.`;
}

// Smena kao "karta": dnevna je papir, noćna tuš; nacrt je šrafiran; stanje je znak desno
export function ShiftChip({ s, onClick, fresh, showFacility, compact }) {
  const T = TYPES[s.type] || TYPES.day;
  const I = T.icon;
  const state = s.status === 'active' ? { tone: 'ok', live: true, text: 'u toku' }
    : s.status === 'missed' ? { tone: 'bad', text: 'nije došao' }
      : s.status === 'done' ? (s.lateMin ? { tone: 'warn', text: `kasnio ${s.lateMin} min` } : { tone: 'ok', text: 'odrađena' })
        : !s.published ? { tone: null, text: 'nacrt, radnik je još ne vidi' } : { tone: null, text: 'objavljena' };
  const who = showFacility ? (s.facility && s.facility.name) : (s.worker && s.worker.name);
  return (
    <button type="button" className={cx('sx-shift', `is-${s.type}`, !s.published && 'is-draft', fresh && 'is-fresh', compact && 'is-compact')}
      title={`${T.label} ${T.text}${who ? ` · ${who}` : ''} · ${state.text}`}
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick(s); }}
      data-testid="shift-chip" data-type={s.type} data-published={s.published ? '1' : '0'}>
      <I className="sx-shift__icon" size={13} strokeWidth={2} aria-hidden="true" />
      <span className="sx-shift__time">{T.text}</span>
      {showFacility && <span className="sx-shift__who">{s.facility && s.facility.name}</span>}
      {!s.published && <span className="sx-shift__draft">nacrt</span>}
      {state.tone && <Led tone={state.tone} live={state.live} className="sx-shift__led" />}
    </button>
  );
}

export default function Schedule() {
  const { facilities, openShift, refreshFacilities, navigate } = useSec();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(params.get('prikaz') === 'radnik' ? 'worker' : 'facility');
  const [facilityId, setFacilityId] = useState(params.get('objekat') || null);
  const [ws, setWs] = useState(weekStart(params.get('nedelja') || todayYmd()));
  const [guards, setGuards] = useState([]);
  const [allGuards, setAllGuards] = useState([]);
  const [workerId, setWorkerId] = useState(params.get('radnikId') || '');
  const [shifts, setShifts] = useState(null);
  const [holidays, setHolidays] = useState(new Map());
  const [pop, setPop] = useState(null); // { mode: 'cell'|'gap', workerId, facilityId, date, type, el }
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(new Set());
  const [cycleOpen, setCycleOpen] = useState(false);
  const boxRef = useRef(null);
  const width = useWidth(boxRef);
  const days = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(ws, i)), [ws]);
  const today = todayYmd();

  // URL prati izbor (link iz obaveštenja ili sa Uživo vodi na tačan objekat i nedelju)
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (view === 'worker') next.set('prikaz', 'radnik'); else next.delete('prikaz');
    if (facilityId) next.set('objekat', facilityId); else next.delete('objekat');
    if (ws !== weekStart(today)) next.set('nedelja', ws); else next.delete('nedelja');
    if (view === 'worker' && workerId) next.set('radnikId', workerId); else next.delete('radnikId');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, facilityId, ws, workerId]);

  useEffect(() => { if (!facilityId && facilities.length) setFacilityId(facilities[0]._id); }, [facilities, facilityId]);
  useEffect(() => {
    sec.workers({ role: 'guard' }).then((l) => {
      setAllGuards(l);
      if (!workerId) { const multi = l.find((w) => (w.facilityIds || []).length > 1) || l[0]; if (multi) setWorkerId(multi._id); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const years = [...new Set([ws.slice(0, 4), addDays(ws, 6).slice(0, 4)])];
    Promise.all(years.map((y) => sec.holidays(y))).then((arr) => setHolidays(new Map(arr.flat().map((h) => [h.date, h.name])))).catch(() => {});
  }, [ws]);

  const load = useCallback(async () => {
    const from = ws, to = addDays(ws, 6);
    if (view === 'facility') {
      if (!facilityId) return;
      const [g, s] = await Promise.all([sec.workers({ role: 'guard', facility: facilityId }), sec.shifts({ facility: facilityId, from, to })]);
      setGuards(g); setShifts(s);
    } else {
      if (!workerId) return;
      setShifts(await sec.shifts({ worker: workerId, from, to }));
    }
  }, [facilityId, ws, view, workerId]);
  useEffect(() => { setShifts(null); load().catch((e) => toast.bad('Raspored nije učitan', errText(e))); }, [load, toast]);
  useEffect(() => { const h = () => load().catch(() => {}); window.addEventListener('sec:changed', h); return () => window.removeEventListener('sec:changed', h); }, [load]);

  const facility = facilities.find((f) => f._id === facilityId);
  const worker = allGuards.find((w) => w._id === workerId);
  const list = shifts || [];
  const drafts = list.filter((s) => !s.published && s.status === 'planned');
  const rows = view === 'facility'
    ? guards.map((g) => ({ key: g._id, workerId: g._id, facilityId, title: g.name, person: g, others: (g.facilityIds || []).filter((f) => f._id !== facilityId) }))
    : (worker ? (worker.facilityIds || []).map((f) => ({ key: f._id, workerId, facilityId: f._id, title: f.name })) : []);
  const shiftsFor = (row, date) => list.filter((s) => s.date === date && (view === 'facility' ? s.worker && s.worker._id === row.workerId : s.facility && s.facility._id === row.facilityId));
  // Sati po stvarnom trajanju smene: noć promene sata ima 13 h (oktobar) ili 11 h (mart), ne 12
  const hoursIn = (arr) => Math.round(arr.reduce((h, s) => h + (new Date(s.plannedEnd) - new Date(s.plannedStart)) / 3600000, 0));
  const hoursOf = (row) => hoursIn(list.filter((s) => (view === 'facility' ? s.worker && s.worker._id === row.workerId : s.facility && s.facility._id === row.facilityId)));
  const cover = (date, type) => list.filter((s) => s.date === date && s.type === type);
  const gaps = view === 'facility' ? days.flatMap((d) => ['day', 'night'].filter((t) => !cover(d, t).length).map((t) => ({ date: d, type: t }))) : [];

  const closePop = () => { setPop(null); setMsg(null); };
  const openPop = (p) => { setMsg(null); setPop(p); };

  const add = async (type, { force = false, assign = false, target } = {}) => {
    const cur = target || pop;
    if (!cur || !cur.workerId) return;
    setBusy(true);
    try {
      // "Dodeli i dodaj": server sam dodaje radnika objektu. Ne šalje se ceo spisak radnika sa ove strane: mogao je da
      // zastari (drugi admin je u međuvremenu dodao ili premestio radnike), pa bi ih ova radnja skinula sa objekta.
      const created = await sec.createShift({ facilityId: cur.facilityId, workerId: cur.workerId, date: cur.date, type, force, assign });
      if (assign) refreshFacilities();
      setFresh(new Set([created._id]));
      toast.ok(`${TYPES[type].label} smena dodata`, `${DAY_SHORT[dowOfYmd(cur.date)]} ${fmtYmdShort(cur.date)}. Radnik je vidi posle objave.`);
      closePop();
      await load();
    } catch (e) {
      const d = errData(e);
      if (d.code === 'rest') setMsg({ tone: 'warn', text: d.error, retry: () => add(type, { force: true, assign, target: cur }) });
      else if (d.code === 'not_assigned') setMsg({ tone: 'warn', text: `${d.error} Dodeli ga objektu i dodaj smenu?`, assign: () => add(type, { force, assign: true, target: cur }) });
      else setMsg({ tone: 'bad', text: errText(e) });
    } finally { setBusy(false); }
  };

  const publish = async () => {
    const ok = await confirm({
      eyebrow: `Raspored · ${facility ? facility.name : ''}`,
      title: `Objavi ${withCount(drafts.length, 'smenu', 'smene', 'smena')}?`,
      text: `${weekLabel(ws)}. Radnici dobijaju obaveštenje na telefonu i od tada za te smene rade alarmi.`,
      confirmLabel: 'Objavi raspored'
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await sec.publishShifts({ facilityId, from: ws, to: addDays(ws, 6) });
      toast.ok('Raspored je objavljen', `${withCount(r.published, 'smena', 'smene', 'smena')}, obavešteno ${withCount(r.notified, 'radnik', 'radnika', 'radnika')}.`);
      await load(); emitChanged();
    } catch (e) { toast.bad('Raspored nije objavljen', errText(e)); } finally { setBusy(false); }
  };

  const copyPrevWeek = async () => {
    setBusy(true);
    try {
      const prev = await sec.shifts({ facility: facilityId, from: addDays(ws, -7), to: addDays(ws, -1) });
      if (!prev.length) { toast.info('Prethodna nedelja je prazna', 'Nema smena za kopiranje.'); return; }
      const items = prev.filter((s) => s.worker).map((s) => ({ facilityId, workerId: s.worker._id, date: addDays(s.date, 7), type: s.type }));
      const r = await sec.bulkShifts(items, false);
      const why = [...new Set((r.results || []).filter((x) => !x.ok).map((x) => x.error))].slice(0, 2).join(' ');
      toast[r.failed ? 'warn' : 'ok'](`Kopirano: ${withCount(r.created, 'smena', 'smene', 'smena')}`, r.failed ? `${r.failed} preskočeno. ${why}` : 'Smene su nacrt: proveri ih i objavi raspored.');
      await load();
    } catch (e) { toast.bad('Kopiranje nije uspelo', errText(e)); } finally { setBusy(false); }
  };

  const narrow = width > 0 && width < 760;
  const covered = view === 'facility' ? 14 - gaps.length : null;
  const totalHours = hoursIn(list);

  return (
    <div className="sx-page sx-sched" data-testid="page-schedule">
      <PageHead
        eyebrow="Security · Raspored"
        title="Raspored smena"
        lead="Dnevna smena 07-19 i noćna 19-07. Klikni prazno polje da dodaš smenu, a smenu da vidiš detalje. Radnici vide smene tek kad objaviš raspored."
        actions={view === 'facility' && facilityId ? <>
          <Btn icon={Copy} onClick={copyPrevWeek} disabled={busy} data-testid="copy-week">Kopiraj prethodnu nedelju</Btn>
          <Btn icon={Repeat} onClick={() => setCycleOpen(true)} disabled={busy || !guards.length} data-testid="fill-cycle">Popuni ciklusom</Btn>
          <Btn variant="primary" icon={Send} onClick={publish} disabled={busy || !drafts.length} data-testid="publish">{drafts.length ? `Objavi ${withCount(drafts.length, 'smenu', 'smene', 'smena')}` : 'Sve je objavljeno'}</Btn>
        </> : null}
      />

      <Toolbar testId="sched-toolbar">
        <Choice size="sm" label="Prikaz" value={view} onChange={(v) => { setView(v); closePop(); }} layoutId="sx-sched-view"
          options={[{ value: 'facility', label: 'Po objektu', testId: 'view-facility' }, { value: 'worker', label: 'Po radniku', testId: 'view-worker' }]} />
        <span className="sx-toolbar__sep" aria-hidden="true" />
        {view === 'facility' ? (
          facilities.length <= 6 ? (
            <Choice size="sm" scroll label="Objekat" value={facilityId} onChange={(v) => { setFacilityId(v); closePop(); }} layoutId="sx-sched-fac"
              options={facilities.map((f) => ({ value: f._id, label: f.name, testId: 'sched-facility' }))} />
          ) : (
            <Select size="sm" value={facilityId || ''} onChange={(e) => { setFacilityId(e.target.value); closePop(); }} aria-label="Objekat" data-testid="sched-facility-select">
              {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </Select>
          )
        ) : (
          <Select size="sm" value={workerId} onChange={(e) => { setWorkerId(e.target.value); closePop(); }} aria-label="Radnik" data-testid="sched-worker">
            {allGuards.map((w) => <option key={w._id} value={w._id}>{w.name} · {(w.facilityIds || []).map((f) => f.name).join(', ') || 'bez objekta'}</option>)}
          </Select>
        )}
        <div className="sx-toolbar__end sx-weeknav">
          <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setWs(addDays(ws, -7))} aria-label="Prethodna nedelja" title="Prethodna nedelja" data-testid="week-prev" />
          <span className="sx-weeknav__label" data-testid="week-label">{weekLabel(ws)}</span>
          <Btn size="sm" variant="ghost" icon={ChevronRight} onClick={() => setWs(addDays(ws, 7))} aria-label="Sledeća nedelja" title="Sledeća nedelja" data-testid="week-next" />
          {ws !== weekStart(today) && <Btn size="sm" onClick={() => setWs(weekStart(today))} data-testid="week-today">Ova nedelja</Btn>}
        </div>
      </Toolbar>

      {view === 'facility' && shifts && (
        <div className="sx-stats sx-sched__stats">
          <Stat label="Pokrivenost" value={covered} small="/14" tone={gaps.length ? 'warn' : 'ok'} sub={gaps.length ? `${withCount(gaps.length, 'smena nema', 'smene nemaju', 'smena nema')} radnika` : 'svaka smena ima radnika'} testId="stat-coverage" />
          <Stat label="Nacrt" value={drafts.length} tone={drafts.length ? 'warn' : null} sub={drafts.length ? 'radnici ih ne vide, objavi raspored' : 'sve je objavljeno'} testId="stat-drafts" />
          <Stat label="Radnici na objektu" value={guards.length} sub={guards.length ? `${withCount(new Set(list.map((s) => s.worker && s.worker._id)).size, 'radi', 'rade', 'radi')} ove nedelje` : 'dodeli radnike objektu'} />
          <Stat label="Sati u nedelji" value={totalHours} small=" h" sub={`${withCount(list.length, 'smena', 'smene', 'smena')} po 12 h`} />
        </div>
      )}

      <div ref={boxRef} className="sx-sched__box">
        {!shifts ? (
          <div className="sx-card sx-sched__skel" aria-busy="true" aria-label="Učitavanje"><div /><div /><div /><div /></div>
        ) : !rows.length ? (
          <Panel>
            <div className="sx-empty-block">
              <b>{view === 'facility' ? 'Na objektu još nema radnika' : 'Izaberi radnika'}</b>
              <span>{view === 'facility' ? 'Dodeli radnike objektu, pa pravi raspored. Radnik može da radi na više objekata, ali ne u isto vreme.' : 'Izaberi radnika da vidiš njegove smene na svim objektima.'}</span>
              {view === 'facility' && facilityId && <Btn variant="primary" icon={UserPlus} onClick={() => navigate(`/security/objekti/${facilityId}?tab=radnici`)}>Dodeli radnike</Btn>}
            </div>
          </Panel>
        ) : narrow ? (
          <WeekAgenda days={days} today={today} holidays={holidays} rows={rows} view={view} list={list} cover={cover} fresh={fresh}
            onShift={(s) => openShift(s._id)} onGap={(date, type, el) => openPop({ mode: 'gap', facilityId, date, type, el })}
            onAddFor={(row, date, el) => openPop({ mode: 'cell', workerId: row.workerId, facilityId: row.facilityId, date, el })} />
        ) : (
          <WeekGrid days={days} today={today} holidays={holidays} rows={rows} view={view} cover={cover} shiftsFor={shiftsFor} hoursOf={hoursOf} fresh={fresh} pop={pop}
            onShift={(s) => openShift(s._id)} onCell={(row, date, el) => openPop({ mode: 'cell', workerId: row.workerId, facilityId: row.facilityId, date, el })}
            onGap={(date, type, el) => openPop({ mode: 'gap', facilityId, date, type, el })} />
        )}
      </div>

      <div className="sx-sched__legend" aria-label="Značenje oznaka">
        <span className="sx-shift is-day is-static"><Sun size={13} strokeWidth={2} aria-hidden="true" /><span className="sx-shift__time">07-19</span></span><span>dnevna</span>
        <span className="sx-shift is-night is-static"><Moon size={13} strokeWidth={2} aria-hidden="true" /><span className="sx-shift__time">19-07</span></span><span>noćna</span>
        <span className="sx-shift is-day is-draft is-static"><span className="sx-shift__time">nacrt</span></span><span>nije objavljena</span>
        <Sign tone="ok" live>u toku</Sign><Sign tone="warn">kasnio</Sign><Sign tone="bad">nije došao</Sign>
        <span className="sx-sched__rule">Sistem ne dozvoljava dve smene u isto vreme i upozorava na manje od 12 h odmora.</span>
      </div>

      <SlotPopover pop={pop} onClose={closePop} guards={guards} list={list} msg={msg} busy={busy} view={view} worker={worker}
        onAdd={(type) => add(type)}
        onPickGuard={(g) => { const target = { ...pop, workerId: g._id }; setPop(target); add(pop.type, { target }); }} />
      {cycleOpen && facility && <CycleDialog facility={facility} guards={guards} ws={ws} onClose={() => setCycleOpen(false)} onDone={() => { setCycleOpen(false); load(); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- nedelja kao mreža (desktop)
function DayHead({ d, today, holidays }) {
  const isToday = d === today;
  const hol = holidays.get(d);
  const dow = dowOfYmd(d);
  return (
    <div className={cx('sx-wk__day', isToday && 'is-today', (dow === 0 || dow === 6) && 'is-weekend', hol && 'is-holiday')} title={hol || undefined} role="columnheader">
      <span className="sx-wk__dow">{isToday ? 'danas' : DAY_SHORT[dow]}</span>
      <span className="sx-wk__date">{fmtYmdShort(d)}</span>
      {hol && <span className="sx-wk__hol">praznik</span>}
    </div>
  );
}

function WeekGrid({ days, today, holidays, rows, view, cover, shiftsFor, hoursOf, fresh, pop, onShift, onCell, onGap }) {
  return (
    <div className="sx-card sx-wk" role="grid" aria-label="Raspored nedelje" data-testid="sched-grid">
      <div className="sx-wk__row sx-wk__row--head" role="row">
        <div className="sx-wk__corner sx-label" role="columnheader">{view === 'facility' ? 'Radnik' : 'Objekat'}</div>
        {days.map((d) => <DayHead key={d} d={d} today={today} holidays={holidays} />)}
      </div>

      {view === 'facility' && (
        <div className="sx-wk__row sx-wk__row--cover" role="row" data-testid="sched-coverage">
          <div className="sx-wk__who sx-wk__who--cover" role="rowheader"><b>Pokrivenost</b><span>dnevna i noćna za svaki dan</span></div>
          {days.map((d) => (
            <div key={d} className={cx('sx-wk__cell sx-wk__cell--cover', d === today && 'is-today')} role="gridcell">
              {['day', 'night'].map((t) => {
                const c = cover(d, t);
                const T = TYPES[t];
                if (c.length) {
                  const names = c.map((s) => (s.worker ? s.worker.name.split(' ')[0] : '?')).join(', ');
                  return <span key={t} className={cx('sx-cov', `is-${t}`)} title={`${T.label} ${T.text}: ${c.map((s) => s.worker && s.worker.name).join(', ')}`}><Led tone="ok" /><em>{T.short}</em><span>{names}</span></span>;
                }
                const on = pop && pop.mode === 'gap' && pop.date === d && pop.type === t;
                return (
                  <button key={t} type="button" className={cx('sx-cov is-gap', `is-${t}`, on && 'is-on')} onClick={(e) => onGap(d, t, e.currentTarget)} title={`${T.label} ${T.text} nema radnika. Klikni da dodaš.`} data-testid="cov-gap">
                    <Led tone="warn" /><em>{T.short}</em><span>nema</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {rows.map((row, ri) => (
        <div key={row.key} className="sx-wk__row" role="row" style={{ '--i': ri }}>
          <div className="sx-wk__who" role="rowheader">
            {row.person ? <Avatar name={row.title} /> : <span className="sx-wk__facicon"><CalendarDays size={15} strokeWidth={1.9} /></span>}
            <div className="sx-wk__whotext">
              <b>{row.title}</b>
              <span><span className="sx-mono">{hoursOf(row)} h</span> ove nedelje{row.others && row.others.length ? ` · radi i na: ${row.others.map((f) => f.name).join(', ')}` : ''}</span>
            </div>
          </div>
          {days.map((d) => {
            const here = shiftsFor(row, d);
            const on = pop && pop.mode === 'cell' && pop.workerId === row.workerId && pop.facilityId === row.facilityId && pop.date === d;
            return (
              <div key={d} role="gridcell" tabIndex={0}
                className={cx('sx-wk__cell', !here.length && 'is-empty', d === today && 'is-today', on && 'is-on')}
                aria-label={`${row.title}, ${DAY_LONG[dowOfYmd(d)]} ${fmtYmdShort(d)}${here.length ? '' : ', prazno, Enter dodaje smenu'}`}
                data-testid="sched-cell" data-date={d} data-worker={row.workerId}
                onClick={(e) => onCell(row, d, e.currentTarget)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCell(row, d, e.currentTarget); } }}>
                {here.map((s) => <ShiftChip key={s._id} s={s} fresh={fresh.has(s._id)} onClick={onShift} />)}
                {!here.length && <span className="sx-wk__add" aria-hidden="true"><Plus size={14} strokeWidth={2} /></span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- nedelja po danima (uzak prostor)
function WeekAgenda({ days, today, holidays, rows, view, list, cover, fresh, onShift, onGap, onAddFor }) {
  return (
    <div className="sx-agenda" data-testid="sched-agenda">
      {days.map((d, i) => {
        const dow = dowOfYmd(d);
        const hol = holidays.get(d);
        return (
          <section key={d} className={cx('sx-card sx-agenda__day', d === today && 'is-today')} style={{ '--i': i }}>
            <header className="sx-agenda__head">
              <b>{d === today ? 'Danas' : DAY_LONG[dow].replace(/^./, (c) => c.toUpperCase())}</b>
              <span className="sx-mono">{fmtYmdShort(d)}</span>
              {hol && <span className="sx-tag is-warn">{hol}</span>}
            </header>
            {view === 'facility' ? ['day', 'night'].map((t) => {
              const T = TYPES[t];
              const c = cover(d, t);
              return (
                <div key={t} className={cx('sx-agenda__slot', `is-${t}`)}>
                  <span className="sx-agenda__type"><T.icon size={14} strokeWidth={2} aria-hidden="true" />{T.label} <span className="sx-mono">{T.text}</span></span>
                  <div className="sx-agenda__people">
                    {c.map((s) => (
                      <button key={s._id} type="button" className={cx('sx-agenda__person', !s.published && 'is-draft', fresh.has(s._id) && 'is-fresh')} onClick={() => onShift(s)} data-testid="shift-chip">
                        {s.worker ? s.worker.name : 'Radnik'}{!s.published && <em>nacrt</em>}
                        {s.status === 'active' && <Led tone="ok" live />}{s.status === 'missed' && <Led tone="bad" />}
                      </button>
                    ))}
                    {!c.length && <button type="button" className="sx-agenda__gap" onClick={(e) => onGap(d, t, e.currentTarget)} data-testid="cov-gap"><Led tone="warn" />Nema radnika, dodaj</button>}
                    {c.length > 0 && <button type="button" className="sx-agenda__gap is-quiet" onClick={(e) => onGap(d, t, e.currentTarget)} aria-label={`Dodaj još jednog radnika, ${T.label.toLowerCase()} smena`} data-testid="agenda-add"><Plus size={13} strokeWidth={2} />Dodaj</button>}
                  </div>
                </div>
              );
            }) : (
              <div className="sx-agenda__slot">
                <div className="sx-agenda__people">
                  {list.filter((s) => s.date === d).map((s) => <ShiftChip key={s._id} s={s} showFacility fresh={fresh.has(s._id)} onClick={onShift} />)}
                  {rows.map((row) => <button key={row.key} type="button" className="sx-agenda__gap is-quiet" onClick={(e) => onAddFor(row, d, e.currentTarget)}><Plus size={13} strokeWidth={2} />{row.title}</button>)}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- izbor smene / radnika na mestu klika
function SlotPopover({ pop, onClose, guards, list, msg, busy, view, worker, onAdd, onPickGuard }) {
  const anchor = useRef({ getBoundingClientRect: () => new DOMRect(0, 0, 0, 0) });
  if (pop && pop.el) anchor.current = { getBoundingClientRect: () => pop.el.getBoundingClientRect() };
  const open = !!pop;
  const who = pop && pop.mode === 'cell' ? (view === 'facility' ? (guards.find((g) => g._id === pop.workerId) || {}).name : (worker || {}).name) : null;
  const dayText = pop ? `${DAY_LONG[dowOfYmd(pop.date)]}, ${fmtYmdShort(pop.date)}` : '';
  return (
    <Popover.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        <Popover.Content className="sx-portal sx-popover sx-slotpop" side="bottom" align="center" sideOffset={8} collisionPadding={12} data-testid="composer">
            {pop && pop.mode === 'cell' && (
              <>
                <span className="sx-label">Nova smena</span>
                <b className="sx-slotpop__title">{who}</b>
                <span className="sx-slotpop__sub">{dayText}</span>
                <div className="sx-slotpop__types">
                  {['day', 'night'].map((t) => {
                    const T = TYPES[t];
                    return (
                      <button key={t} type="button" className={cx('sx-slotpop__type', `is-${t}`)} disabled={busy} onClick={() => onAdd(t)} data-testid={t === 'day' ? 'add-day' : 'add-night'}>
                        <T.icon size={18} strokeWidth={1.9} aria-hidden="true" />
                        <b>{T.label}</b>
                        <span className="sx-mono">{T.text}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {pop && pop.mode === 'gap' && (
              <>
                <span className="sx-label">{TYPES[pop.type].label} smena · {TYPES[pop.type].text}</span>
                <b className="sx-slotpop__title">Ko pokriva?</b>
                <span className="sx-slotpop__sub">{dayText}</span>
                <div className="sx-slotpop__guards" role="list">
                  {!guards.length && <span className="sx-slotpop__sub">Objekat nema radnika.</span>}
                  {guards.map((g) => {
                    const same = list.filter((s) => s.date === pop.date && s.worker && s.worker._id === g._id);
                    return (
                      <button key={g._id} type="button" role="listitem" className="sx-slotpop__guard" disabled={busy} onClick={() => onPickGuard(g)} data-testid="gap-worker">
                        <Avatar name={g.name} />
                        <span><b>{g.name}</b>{same.length ? <small>već ima {same.map((s) => TYPES[s.type].label.toLowerCase()).join(' i ')} smenu tog dana</small> : <small>slobodan tog dana</small>}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {msg && (
              <Note tone={msg.tone} testId="composer-msg" actions={(msg.retry || msg.assign) && <>
                {msg.retry && <Btn size="sm" onClick={msg.retry} busy={busy} data-testid="force-add">Dodaj ipak</Btn>}
                {msg.assign && <Btn size="sm" icon={UserPlus} onClick={msg.assign} busy={busy} data-testid="assign-add">Dodeli i dodaj</Btn>}
              </>}>{msg.text}</Note>
            )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------- popuni ciklusom
// Svaki radnik radi dan, pa noć, pa ima dva slobodna dana; sa 4 radnika objekat je pokriven 0-24
function CycleDialog({ facility, guards, ws, onClose, onDone }) {
  const toast = useToast();
  const [order, setOrder] = useState(guards.slice(0, 4).map((g) => g._id));
  const [weeks, setWeeks] = useState(1);
  const [start, setStart] = useState(ws);
  const [busy, setBusy] = useState(false);
  const people = [0, 1, 2, 3].map((k) => order[k]).filter(Boolean);
  const items = useMemo(() => {
    const out = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(start, i);
      [0, 1, 2, 3].forEach((k) => {
        const wid = order[k];
        if (!wid) return;
        const pos = (((i - k) % 4) + 4) % 4;
        if (pos === 0) out.push({ facilityId: facility._id, workerId: wid, date, type: 'day' });
        if (pos === 1) out.push({ facilityId: facility._id, workerId: wid, date, type: 'night' });
      });
    }
    return out;
  }, [order, weeks, start, facility._id]);
  const preview = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => addDays(start, i));
  const run = async () => {
    setBusy(true);
    try {
      const r = await sec.bulkShifts(items, false);
      toast[r.failed ? 'warn' : 'ok'](`Dodato: ${withCount(r.created, 'smena', 'smene', 'smena')}`, r.failed ? `${r.failed} preskočeno (već postoji smena ili nema dovoljno odmora).` : 'Smene su nacrt: proveri ih i objavi raspored.');
      onDone();
    } catch (e) { toast.bad('Ciklus nije dodat', errText(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog onClose={onClose} busy={busy} size="lg" eyebrow={`Raspored · ${facility.name}`} title="Popuni ciklusom"
      description="Svaki radnik radi dan, pa noć, pa ima dva slobodna dana. Sa 4 radnika objekat je pokriven 0-24. Postojeće smene ostaju."
      testId="cycle-modal"
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>Odustani</Btn><Btn variant="primary" icon={Check} onClick={run} busy={busy} disabled={!people.length} data-testid="cycle-run">Dodaj {withCount(items.length, 'smenu', 'smene', 'smena')}</Btn></>}>
      <div className="sx-form">
        {[0, 1, 2, 3].map((i) => (
          <label key={i} className="sx-field">
            <span className="sx-field__label">Radnik {i + 1}</span>
            <Select value={order[i] || ''} onChange={(e) => { const n = [...order]; n[i] = e.target.value; setOrder(n); }} data-testid={`cycle-worker-${i}`}>
              <option value="">Bez radnika</option>
              {guards.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
            </Select>
          </label>
        ))}
        <div className="sx-field"><span className="sx-field__label">Od dana</span><DateField value={start} onChange={(v) => v && setStart(v)} testId="cycle-start" /></div>
        <div className="sx-field"><span className="sx-field__label">Trajanje</span><Choice size="sm" label="Trajanje" value={weeks} onChange={setWeeks} layoutId="sx-cycle-weeks" options={[{ value: 1, label: '1 nedelja' }, { value: 2, label: '2 nedelje' }, { value: 4, label: '4 nedelje' }]} /></div>
      </div>
      <div className="sx-cycle" aria-label="Pregled prvih 8 dana">
        <div className="sx-cycle__row sx-cycle__row--head"><span />{preview.map((d) => <span key={d}><b>{DAY_SHORT[dowOfYmd(d)]}</b><span className="sx-mono">{fmtYmdShort(d)}</span></span>)}</div>
        {[0, 1, 2, 3].map((k) => {
          const g = guards.find((x) => x._id === order[k]);
          if (!g) return null;
          return (
            <div key={k} className="sx-cycle__row">
              <span className="sx-cycle__who">{g.name}</span>
              {preview.map((d, i) => {
                const pos = (((i - k) % 4) + 4) % 4;
                return <span key={d} className={cx('sx-cycle__cell', pos === 0 && 'is-day', pos === 1 && 'is-night')}>{pos === 0 ? 'D' : pos === 1 ? 'N' : ''}</span>;
              })}
            </div>
          );
        })}
      </div>
      <p className="sx-field__hint" style={{ marginTop: 10 }}>D je dnevna 07-19, N je noćna 19-07. {plural(people.length, 'Izabran je', 'Izabrana su', 'Izabrano je')} {people.length} od 4 radnika.</p>
    </Dialog>
  );
}
