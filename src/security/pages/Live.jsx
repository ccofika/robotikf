// Uživo: da li je sada nešto pogrešno, gde i šta da uradim.
// Zone su uvek na istom mestu:
//   1) naslov = situacija jednom rečenicom (i dugmad za prvi problem), desno sat i smena
//   2) pet brojki (na dužnosti, obilasci, alarmi, izveštaji, treba srediti)
//   3) tabla obilazaka (svi objekti na istoj vremenskoj osi smene)
//   4) desno: za reakciju (alarmi), zadaci u smeni, treba srediti
//   5) dnevnik događaja
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Phone, ArrowUpRight, ArrowDown, RefreshCw, Sun, Moon } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { cx, Btn, Led, Skeleton, Ring, useTick, agoText } from '../sx/ui';
import { SplitReveal, Reveal, CountUp } from '../sx/motion';
import { useToast } from '../sx/toast';
import { parts, DAY_LONG, fmtYmd, weekStart, ymdOf } from '../lib/time';
import { groupAlarms, attachRounds, headline, tasksOf, roundState, plural } from './live/model';
import PatrolBoard from './live/PatrolBoard';
import { AlarmQueue, ResolveDialog, TaskList, TodoList } from './live/Side';
import EventLog from './live/EventLog';
import '../sx/live.css';

const telOf = (phone) => (phone ? `tel:${String(phone).replace(/[^0-9+]/g, '')}` : undefined);
const pad = (n) => String(n).padStart(2, '0');

export default function Live() {
  const { user, openShift, openQuickTask, openWorker, navigate } = useSec();
  const toast = useToast();
  const { data, setData, loading, reload, updatedAt, error } = usePoll(() => sec.live(), 10000, []);
  const now = useTick(20000);
  const [resolving, setResolving] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    const on = () => reload();
    window.addEventListener('sec:changed', on);
    return () => window.removeEventListener('sec:changed', on);
  }, [reload]);

  const groups = useMemo(() => (data ? attachRounds(groupAlarms(data.alarms), data.facilities) : []), [data]);
  const tasks = useMemo(() => (data ? tasksOf(data.facilities) : { open: [], done: [] }), [data]);

  const ack = useCallback(async (g) => {
    setBusyKey(g.key);
    const ids = g.list.filter((a) => a.state !== 'ack').map((a) => a._id);
    // odmah u prikazu, pa potvrda sa servera
    setData((d) => d && ({ ...d, alarms: d.alarms.map((a) => (ids.includes(a._id) ? { ...a, state: 'ack', ackByName: user.name, ackAt: new Date().toISOString() } : a)) }));
    try {
      for (const id of ids) await sec.ackAlarm(id);
      toast.ok('Alarm preuzet', `${g.lead.facilityName}: svi vide da ti reaguješ.`);
      window.dispatchEvent(new Event('sec:changed'));
    } catch (e) {
      toast.bad('Alarm nije preuzet', errText(e));
      reload();
    } finally { setBusyKey(null); }
  }, [setData, user.name, toast, reload]);

  const resolve = useCallback(async (g, note) => {
    try {
      for (const a of g.list) await sec.resolveAlarm(a._id, note);
      toast.ok('Alarm rešen', `${g.lead.facilityName}: upis je sačuvan u istoriji alarma.`);
      window.dispatchEvent(new Event('sec:changed'));
    } catch (e) {
      toast.bad('Alarm nije rešen', errText(e));
      throw e;
    }
  }, [toast]);

  if (loading && !data) return <LiveSkeleton />;
  if (!data) {
    return (
      <div className="sx-page sx-live">
        <div className="sx-card sx-live__error" role="alert">
          <Led tone="bad" lg />
          <div><b>Podaci nisu učitani</b><span>{errText(error, 'Server se ne javlja.')} Proveri internet vezu.</span></div>
          <Btn icon={RefreshCw} onClick={reload}>Pokušaj ponovo</Btn>
        </div>
      </div>
    );
  }

  const head = headline(data, groups, now);
  const top = head.group;
  const onTask = (f, s) => openQuickTask({ facilityId: f._id, shiftId: s._id, facilityName: f.name, workerName: s.worker ? s.worker.name : '', label: s.label });
  const onFacility = (f) => navigate(`/security/objekti/${f._id}`);
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="sx-page sx-live" data-testid="page-live">
      <header className={cx('sx-live__head', `is-${head.tone}`)}>
        <div className="sx-live__status">
          <Reveal y={6} className="sx-eyebrow">Security · Uživo</Reveal>
          <div className="sx-live__headline">
            <Led tone={head.tone} live={head.tone === 'bad' || head.tone === 'warn'} lg className="sx-live__led" />
            <SplitReveal key={head.title} as="h1" className="sx-title sx-live__title" text={head.title} data-testid="live-headline" />
          </div>
          <Reveal y={8} delay={0.12} className="sx-live__text"><p>{head.text}</p></Reveal>
          <Reveal y={8} delay={0.18} className="sx-live__actions">
            {top && !top.acked && <Btn variant={top.tone === 'bad' ? 'danger' : 'primary'} onClick={() => ack(top)} busy={busyKey === top.key} data-testid="headline-ack">Preuzmi alarm</Btn>}
            {top && telOf(top.lead.workerPhone) && <Btn icon={Phone} href={telOf(top.lead.workerPhone)} title={`Pozovi ${top.lead.workerName}`}>Pozovi radnika <span className="sx-btn__aside sx-mono">{top.lead.workerPhone}</span></Btn>}
            {top && top.lead.shiftId && <Btn variant="ghost" iconRight={ArrowUpRight} onClick={() => openShift(top.lead.shiftId)}>Otvori smenu</Btn>}
            {head.rest > 0 && <Btn variant="ghost" iconRight={ArrowDown} onClick={() => scrollTo('sx-alarms')}>Još {head.rest} {plural(head.rest, 'alarm', 'alarma', 'alarma')}</Btn>}
            {!top && <Btn variant="primary" icon={ClipboardList} onClick={() => openQuickTask({})} data-testid="new-task">Novi zadatak</Btn>}
          </Reveal>
        </div>
        <LiveClock win={data.window} updatedAt={updatedAt} onTask={top ? () => openQuickTask({ facilityId: top.lead.facilityId }) : null} />
      </header>

      <KpiStrip data={data} groups={groups} now={now} onAlarms={() => scrollTo('sx-alarms')} onTodo={() => scrollTo('sx-todo')} onReports={() => navigate('/security/izvestaji')} />

      <div className="sx-live__grid">
        <div className="sx-live__board">
          <PatrolBoard data={data} now={now} onShift={openShift} onTask={onTask} onFacility={onFacility} />
        </div>
        <div className="sx-live__side">
          <AlarmQueue groups={groups} onAck={ack} onResolve={setResolving} onShift={openShift} busyKey={busyKey} />
          <TaskList tasks={tasks} onNew={() => openQuickTask({})} />
          <TodoList todo={data.todo || {}} onUnknown={() => navigate('/security/objekti?nepoznati=1')} onDrafts={(d) => navigate(d && d.facilityId ? `/security/raspored?objekat=${d.facilityId}&nedelja=${weekStart(ymdOf(d.plannedStart))}` : '/security/raspored')} onWorker={openWorker} />
        </div>
        <div className="sx-live__log">
          <EventLog feed={data.feed || []} now={now} />
        </div>
      </div>

      {resolving && <ResolveDialog g={resolving} onClose={() => setResolving(null)} onDone={resolve} />}
    </div>
  );
}

function LiveClock({ win, updatedAt, onTask }) {
  const now = useTick(1000);
  const p = parts(now);
  const ss = pad(new Date(now).getSeconds());
  const day = win.type === 'day';
  const left = Math.max(0, Math.round((new Date(win.end).getTime() - now) / 60000));
  const h = Math.floor(left / 60), m = left % 60;
  return (
    <Reveal y={8} delay={0.08} className="sx-clock">
      <div className="sx-clock__time" aria-label={`Vreme u Srbiji ${p.hh}:${p.mm}`}>
        <span className="sx-num sx-clock__hm">{p.hh}<i>:</i>{p.mm}</span><small className="sx-num sx-clock__ss">{ss}</small>
      </div>
      <div className="sx-clock__meta">
        <span className="sx-clock__date">{DAY_LONG[p.dow]}, {fmtYmd(p.ymd)}</span>
        <span className="sx-clock__shift">
          {day ? <Sun size={14} strokeWidth={2} aria-hidden="true" /> : <Moon size={14} strokeWidth={2} aria-hidden="true" />}
          {day ? 'Dnevna' : 'Noćna'} smena, još {h ? `${h} h ${m} min` : `${m} min`}
        </span>
        <span className="sx-clock__sync"><Led tone="ok" live /> {updatedAt ? `osveženo ${agoText(updatedAt, now).replace('pre ', 'pre ')}` : 'uživo'}</span>
      </div>
      {onTask && <Btn size="sm" icon={ClipboardList} onClick={onTask} className="sx-clock__task" data-testid="new-task">Novi zadatak</Btn>}
    </Reveal>
  );
}

function KpiStrip({ data, groups, now, onAlarms, onTodo, onReports }) {
  const k = data.kpis || {};
  let due = 0, doneDue = 0, problem = 0;
  for (const f of data.facilities || []) for (const s of f.shifts || []) {
    if (s.status !== 'active') continue;
    for (const r of s.rounds || []) {
      if (new Date(r.dueAt).getTime() > now) continue;
      due++;
      const st = roundState(r, now, s.tolMin);
      if (st === 'done' || st === 'late') doneDue++;
      else if (st !== 'due') problem++;
    }
  }
  const openGroups = groups.filter((g) => !g.acked).length;
  const critical = groups.filter((g) => !g.acked && g.tone === 'bad').length;
  const t = data.todo || {};
  const todoCount = (t.unknownTags || []).length + (t.drafts || []).length + (t.expiring || []).length;
  const missing = Math.max(0, (k.expected || 0) - (k.onDuty || 0));
  return (
    <section className="sx-kpis" aria-label="Pregled smene">
      <div className={cx('sx-kpi', missing && 'is-warn')} data-testid="kpi-onduty">
        <span className="sx-label">Na dužnosti</span>
        <span className="sx-kpi__num sx-num"><CountUp value={k.onDuty || 0} /><small>/{Math.max(k.expected || 0, k.onDuty || 0)}</small></span>
        <span className="sx-kpi__sub">{missing ? `${missing} nije ${missing === 1 ? 'prijavljen' : 'prijavljeno'}` : 'svi su prijavljeni'}</span>
      </div>
      <div className={cx('sx-kpi sx-kpi--ring', problem && 'is-bad')} data-testid="kpi-rounds">
        <span className="sx-label">Obilasci</span>
        <span className="sx-kpi__num sx-num"><CountUp value={doneDue} /><small>/{due}</small></span>
        <span className="sx-kpi__sub">{problem ? `${problem} ${plural(problem, 'tačka nije očitana', 'tačke nisu očitane', 'tačaka nije očitano')}` : 'dospele tačke su očitane'}</span>
        <Ring done={doneDue} missed={problem} total={due} size={54} className="sx-kpi__ring" />
      </div>
      <button type="button" className={cx('sx-kpi', critical ? 'is-bad' : openGroups ? 'is-warn' : '')} onClick={onAlarms} data-testid="kpi-alarms">
        <span className="sx-label">Otvoreni alarmi</span>
        <span className="sx-kpi__num sx-num"><CountUp value={openGroups} /></span>
        <span className="sx-kpi__sub">{critical ? `${critical} ${plural(critical, 'kritičan', 'kritična', 'kritičnih')}` : openGroups ? 'bez kritičnih' : 'sve je mirno'}</span>
      </button>
      <button type="button" className="sx-kpi" onClick={onReports} data-testid="kpi-reports">
        <span className="sx-label">Izveštaji danas</span>
        <span className="sx-kpi__num sx-num"><CountUp value={k.reportsToday || 0} /></span>
        <span className="sx-kpi__sub">poslato objektima mejlom</span>
      </button>
      <button type="button" className={cx('sx-kpi', todoCount && 'is-soft')} onClick={onTodo} data-testid="kpi-todo">
        <span className="sx-label">Treba srediti</span>
        <span className="sx-kpi__num sx-num"><CountUp value={todoCount} /></span>
        <span className="sx-kpi__sub">tagovi, smene, ugovori</span>
      </button>
    </section>
  );
}

function LiveSkeleton() {
  return (
    <div className="sx-page sx-live" aria-busy="true" aria-label="Učitavanje">
      <div className="sx-live__head">
        <div className="sx-live__status"><Skeleton h={12} w={140} /><Skeleton h={52} w="min(560px, 90%)" style={{ marginTop: 18 }} /><Skeleton h={16} w="min(420px, 70%)" style={{ marginTop: 14 }} /></div>
        <Skeleton h={92} w={240} />
      </div>
      <Skeleton h={108} r={18} />
      <div className="sx-live__grid" style={{ marginTop: 20 }}>
        <div className="sx-live__board"><div className="sx-board sx-board--skeleton">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="sx-board__skelrow" />)}</div></div>
        <div className="sx-live__side"><Skeleton h={260} r={18} /><Skeleton h={180} r={18} /></div>
      </div>
    </div>
  );
}
