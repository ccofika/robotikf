// Detalj objekta: zaglavlje (radnje), put pripreme (klik vodi u deo gde se sređuje) i tabovi:
// Pregled (podaci, stanje sada, pravila), NFC tagovi, Obilazak (plan), Zadaci, Radnici, Izveštaj.
// Tab je u URL-u (?tab=), pa link iz liste, pretrage ili obaveštenja otvara tačan deo.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Info, Nfc, Route as RouteIcon, ClipboardList, Users, Mail, Archive, RotateCcw, X, Plus, Send, CalendarDays, Phone, ArrowUpRight } from 'lucide-react';
import { sec, errText, errData } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { Btn, Sign, Avatar, Skeleton, telOf, withCount } from '../sx/ui';
import { PageHead, Panel, Note, KV, Tabs } from '../sx/layout';
import { Input, NumberField, Select } from '../sx/forms';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import { hm } from '../lib/time';
import { FacilityForm, ReadyRoute, readiness } from './Facilities';
import { TagsTab, RoundTab, TasksTab } from './FacilityTabs';
import '../sx/facility.css';

export default function FacilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAdmin, refreshFacilities, openQuickTask } = useSec();
  const toast = useToast();
  const [f, setF] = useState(null);
  const tab = params.get('tab') || 'pregled';
  const setTab = (t) => { const n = new URLSearchParams(params); n.set('tab', t); setParams(n, { replace: true }); };
  const live = usePoll(() => sec.live().catch(() => null), 30000, []);

  const load = useCallback(() => sec.facility(id).then(setF).catch((e) => { toast.bad('Objekat nije učitan', errText(e)); navigate('/security/objekti'); }), [id, toast, navigate]);
  useEffect(() => { setF(null); load(); }, [load]);

  const lv = useMemo(() => ((live.data && live.data.facilities) || []).find((x) => String(x._id) === String(id)) || null, [live.data, id]);

  if (!f) {
    return (
      <div className="sx-page" aria-busy="true" aria-label="Učitavanje">
        <Skeleton h={14} w={160} /><Skeleton h={48} w="min(460px, 80%)" style={{ marginTop: 16 }} /><Skeleton h={96} r={18} style={{ marginTop: 24 }} /><Skeleton h={320} r={18} style={{ marginTop: 20 }} />
      </div>
    );
  }
  const steps = readiness(f);
  const active = f.tags.filter((t) => t.status === 'active');
  const planCount = f.roundPlan.day.length + f.roundPlan.night.length;
  const tabs = [
    { key: 'pregled', label: 'Pregled', icon: Info, testId: 'tab-pregled' },
    { key: 'tagovi', label: 'NFC tagovi', icon: Nfc, count: active.length, tone: !steps[0].ok || !steps[1].ok ? 'warn' : null, testId: 'tab-tagovi' },
    { key: 'obilazak', label: 'Obilazak', icon: RouteIcon, count: planCount, tone: !steps[2].ok ? 'warn' : null, testId: 'tab-obilazak' },
    { key: 'zadaci', label: 'Zadaci', icon: ClipboardList, count: f.upcomingTasks.length, testId: 'tab-zadaci' },
    { key: 'radnici', label: 'Radnici', icon: Users, count: f.guards.length, tone: !steps[3].ok || !steps[4].ok ? 'warn' : null, testId: 'tab-radnici' },
    { key: 'izvestaj', label: 'Izveštaj', icon: Mail, count: (f.reportEmails || []).length, tone: !steps[5].ok ? 'warn' : null, testId: 'tab-izvestaj' }
  ];

  const archive = async () => {
    const ok = await confirm({ eyebrow: f.name, title: 'Arhiviraj objekat?', text: 'Objekat nestaje iz liste i rasporeda. Istorija, izveštaji i tagovi ostaju sačuvani, a objekat možeš da vratiš kasnije.', tone: 'danger', confirmLabel: 'Arhiviraj objekat' });
    if (!ok) return;
    try { await sec.archiveFacility(f._id, false); toast.ok('Objekat je arhiviran'); refreshFacilities(); navigate('/security/objekti'); }
    catch (e) {
      if (errData(e).futureShifts) {
        const force = await confirm({ eyebrow: f.name, title: 'Objekat ima zakazane smene', text: errText(e), tone: 'danger', confirmLabel: 'Arhiviraj ipak' });
        if (force) { await sec.archiveFacility(f._id, true); toast.ok('Objekat je arhiviran', 'Zakazane smene su otkazane.'); refreshFacilities(); navigate('/security/objekti'); }
      } else toast.bad('Objekat nije arhiviran', errText(e));
    }
  };
  const restore = async () => {
    try { await sec.restoreFacility(f._id); toast.ok('Objekat je vraćen', 'Ponovo je u listi i rasporedu.'); refreshFacilities(); load(); } catch (e) { toast.bad('Objekat nije vraćen', errText(e)); }
  };

  return (
    <div className="sx-page sx-fac" data-testid="page-facility">
      <PageHead
        back={{ label: 'Objekti', onClick: () => navigate('/security/objekti') }}
        eyebrow={`Objekti · ${f.type || 'objekat'}`}
        title={f.name}
        lead={[[f.address, f.city].filter(Boolean).length ? `${[f.address, f.city].filter(Boolean).join(', ')}.` : 'Adresu i opis dodaj u pregledu.', f.coordinators.length ? `Koordinator: ${f.coordinators.map((c) => c.name).join(', ')}.` : 'Nema koordinatora.'].join(' ')}
        testId="facility-head"
        actions={<>
          {f.active && <Btn icon={ClipboardList} onClick={() => openQuickTask({ facilityId: f._id })} data-testid="fac-task">Novi zadatak</Btn>}
          {f.active && <Btn icon={CalendarDays} onClick={() => navigate(`/security/raspored?objekat=${f._id}`)} data-testid="fac-schedule">Raspored</Btn>}
          {isAdmin && f.active && <Btn variant="ghost" icon={Archive} onClick={archive} data-testid="fac-archive">Arhiviraj</Btn>}
          {isAdmin && !f.active && <Btn variant="primary" icon={RotateCcw} onClick={restore} data-testid="fac-restore">Vrati objekat</Btn>}
        </>}
      />

      {!f.active && <Note tone="idle" className="sx-mt">Objekat je arhiviran: ne pojavljuje se u rasporedu i na Uživo. Istorija i izveštaji su sačuvani.</Note>}

      <div className="sx-card sx-readybar" data-testid="facility-ready">
        <ReadyRoute steps={steps} onStep={(s) => setTab(s.tab)} />
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Delovi objekta" layoutId="sx-fac-tabs" className="sx-fac__tabs" />

      <div className="sx-fac__body" key={tab}>
        {tab === 'pregled' && <OverviewTab f={f} lv={lv} reload={load} isAdmin={isAdmin} refreshFacilities={refreshFacilities} />}
        {tab === 'tagovi' && <TagsTab f={f} reload={load} isAdmin={isAdmin} />}
        {tab === 'obilazak' && <RoundTab f={f} reload={load} isAdmin={isAdmin} goTags={() => setTab('tagovi')} />}
        {tab === 'zadaci' && <TasksTab f={f} reload={load} />}
        {tab === 'radnici' && <PeopleTab f={f} reload={load} isAdmin={isAdmin} />}
        {tab === 'izvestaj' && <ReportTab f={f} reload={load} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pregled
function OverviewTab({ f, lv, reload, isAdmin, refreshFacilities }) {
  const { openShift, navigate } = useSec();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [defs, setDefs] = useState(null);
  const initRules = () => ({ checkpointTolMin: f.rules && f.rules.checkpointTolMin != null ? f.rules.checkpointTolMin : '', snoozeMin: f.rules && f.rules.snoozeMin != null ? f.rules.snoozeMin : '' });
  const [rules, setRules] = useState(initRules);
  useEffect(() => { setRules(initRules()); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);
  useEffect(() => { sec.settings().then((s) => setDefs(s.alarms || {})).catch(() => {}); }, []);
  const rulesDirty = JSON.stringify(rules) !== JSON.stringify(initRules());
  const save = async (data, okText = 'Podaci objekta su sačuvani') => {
    setBusy(true);
    try { await sec.updateFacility(f._id, data); toast.ok(okText); reload(); refreshFacilities(); } catch (e) { toast.bad('Nije sačuvano', errText(e)); } finally { setBusy(false); }
  };
  const cur = lv && lv.shifts && lv.shifts[0];
  const curTone = cur ? (cur.state === 'bad' ? 'bad' : cur.state === 'warn' ? 'warn' : cur.state === 'ok' ? 'ok' : 'info') : 'idle';
  return (
    <div className="sx-cols sx-cols--main">
      <Panel title="Podaci o objektu" sub={isAdmin ? 'Radnik vidi uputstvo u aplikaciji na početku svake smene.' : 'Koordinator menja uputstvo i kontakt, ostalo menja administrator.'} testId="facility-form">
        <FacilityForm initial={f} onSave={(d) => save(d)} busy={busy} lock={isAdmin ? [] : ['name', 'type', 'city', 'address', 'description']} submitText="Sačuvaj podatke" />
      </Panel>
      <div className="sx-stack">
        <Panel title="Sada na objektu" actions={<Btn size="sm" variant="ghost" iconRight={ArrowUpRight} onClick={() => navigate('/security')}>Uživo</Btn>} testId="facility-now">
          {!f.active ? <p className="sx-ssec__lead">Arhiviran objekat nema smene.</p> : !cur ? (
            <div className="sx-now">
              <Sign tone="idle">Nema smene u toku</Sign>
              <span className="sx-now__sub">{lv && lv.nextShift ? `Sledeća: ${lv.nextShift.label} u ${hm(lv.nextShift.plannedStart)}${lv.nextShift.workerName ? `, ${lv.nextShift.workerName}` : ''}${lv.nextShift.published ? '' : ' (nacrt)'}.` : 'Nema zakazane smene. Napravi raspored.'}</span>
            </div>
          ) : (
            <div className="sx-now">
              <Sign tone={curTone} live={curTone === 'bad' || curTone === 'warn' || cur.status === 'active'}>{cur.worker ? cur.worker.name : 'Radnik'}</Sign>
              <span className="sx-now__sub">{cur.label} · {cur.status === 'active' ? `prijavljen u ${hm(cur.clockIn)}` : cur.status === 'missed' ? 'nije došao' : cur.minutesLate ? `kasni ${cur.minutesLate} min` : `počinje u ${hm(cur.plannedStart)}`}</span>
              {cur.roundsTotal > 0 && <span className="sx-now__sub">Obilazak <b className="sx-mono">{cur.roundsDone}/{cur.roundsDue}</b> dospelih, ukupno {cur.roundsTotal}{cur.nextRound ? `, sledeća ${cur.nextRound.tagName} u ${hm(cur.nextRound.dueAt)}` : ''}</span>}
              {cur.alarm && <Note tone={cur.alarm.level === 'critical' ? 'bad' : 'warn'}>{cur.alarm.title}</Note>}
              <div className="sx-now__actions">
                <Btn size="sm" onClick={() => openShift(cur._id)}>Otvori smenu</Btn>
                {cur.worker && telOf(cur.worker.phone) && <Btn size="sm" variant="ghost" icon={Phone} href={telOf(cur.worker.phone)}>Pozovi</Btn>}
              </div>
            </div>
          )}
          {(f.contactName || f.contactPhone) && (
            <KV className="sx-mt" items={[{ k: 'Kontakt na objektu', v: <>{f.contactName}{f.contactPhone && <> · <a className="sx-mono" href={telOf(f.contactPhone)}>{f.contactPhone}</a></>}</> }]} />
          )}
        </Panel>
        {isAdmin && (
          <Panel title="Pravila za ovaj objekat" sub="Prazno znači da važe opšta pravila sa stranice Alarmi."
            footer={rulesDirty && <><Btn variant="ghost" size="sm" onClick={() => setRules(initRules())}>Poništi</Btn><Btn variant="primary" size="sm" busy={busy} onClick={() => save({ rules: { checkpointTolMin: rules.checkpointTolMin === '' ? null : Number(rules.checkpointTolMin), snoozeMin: rules.snoozeMin === '' ? null : Number(rules.snoozeMin) } }, 'Pravila objekta su sačuvana')} data-testid="fac-rules-save">Sačuvaj pravila</Btn></>}
            testId="facility-rules">
            <div className="sx-rulelist">
              <div className="sx-rulelist__row">
                <div><b>Tolerancija obilaska</b><span>Koliko pre ili posle plana očitavanje je uredno.</span></div>
                <NumberField value={rules.checkpointTolMin} onChange={(v) => setRules({ ...rules, checkpointTolMin: v })} min={0} max={60} suffix="min" placeholder={defs ? String(defs.checkpointTolMin) : ''} aria-label="Tolerancija obilaska u minutima" testId="fac-rule-tol" />
              </div>
              <div className="sx-rulelist__row">
                <div><b>Odlaganje alarma</b><span>Za koliko radnik može jednom da odloži prvi alarm.</span></div>
                <NumberField value={rules.snoozeMin} onChange={(v) => setRules({ ...rules, snoozeMin: v })} min={1} max={60} suffix="min" placeholder={defs ? String(defs.snoozeMin) : ''} aria-label="Odlaganje alarma u minutima" testId="fac-rule-snooze" />
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- radnici i koordinator
// Osoba na objektu (van PeopleTab, da se ne pravi iznova pri svakom crtanju)
function Person({ w, role, f, isAdmin, onDossier, onRemove }) {
  return (
    <div className="sx-item" data-testid={`person-${role}`}>
      <Avatar name={w.name} />
      <div className="sx-item__main">
        <b>{w.name}{w.isActive === false && <span className="sx-tag" style={{ marginLeft: 8 }}>neaktivan</span>}</b>
        <span>{w.phone ? <a className="sx-mono" href={telOf(w.phone)}>{w.phone}</a> : 'bez telefona'}{(w.facilityIds || []).length > 1 ? ` · radi i na: ${(w.facilityIds || []).filter((x) => x._id !== f._id).map((x) => x.name).join(', ')}` : ''}</span>
      </div>
      <div className="sx-item__side">
        <Btn size="sm" onClick={() => onDossier(w._id)}>Dosije</Btn>
        {isAdmin && <Btn size="sm" variant="ghost" icon={X} onClick={() => onRemove(w, role)} title="Ukloni sa objekta" aria-label={`Ukloni ${w.name} sa objekta`} />}
      </div>
    </div>
  );
}

function PeopleTab({ f, reload, isAdmin }) {
  const { openWorker } = useSec();
  const toast = useToast();
  const [all, setAll] = useState([]);
  const [add, setAdd] = useState('');
  const [addCoord, setAddCoord] = useState('');
  useEffect(() => { sec.workers({ active: 'all' }).then(setAll).catch(() => {}); }, []);
  const ids = (role) => (role === 'guard' ? f.guards : f.coordinators).map((w) => w._id);
  const setPeople = async (role, list, text) => {
    try { await sec.setPeople(f._id, role, list); toast.ok(text); reload(); } catch (e) { toast.bad('Nije uspelo', errText(e)); }
  };
  const remove = async (w, role) => {
    const ok = await confirm({ eyebrow: f.name, title: `Ukloni ${w.name} sa objekta?`, text: role === 'guard' ? 'Buduće smene na ovom objektu ostaju u rasporedu dok ih ne izmeniš. Dosije i istorija ostaju.' : 'Više ne dobija MASTER ALARM za ovaj objekat i ne vidi ga na sajtu.', tone: 'danger', confirmLabel: 'Ukloni sa objekta' });
    if (!ok) return;
    setPeople(role, ids(role).filter((x) => x !== w._id), `${w.name} više nije na objektu`);
  };
  const freeGuards = all.filter((w) => w.role === 'guard' && w.isActive && !ids('guard').includes(w._id));
  const freeCoords = all.filter((w) => w.role === 'coordinator' && w.isActive && !ids('coordinator').includes(w._id));
  return (
    <div className="sx-cols sx-cols--2">
      <Panel title={<span className="sx-panel__title-row">Radnici obezbeđenja <span className="sx-count">{f.guards.length}</span></span>} sub="Radnik može da radi na više objekata; raspored ne dozvoljava dve smene u isto vreme." testId="facility-guards"
        footer={isAdmin && (
          <div className="sx-inline sx-grow">
            <Select value={add} onChange={(e) => setAdd(e.target.value)} data-testid="assign-guard" aria-label="Radnik za dodelu">
              <option value="">Dodeli radnika</option>
              {freeGuards.map((w) => <option key={w._id} value={w._id}>{w.name}{(w.facilityIds || []).length ? ` · ${(w.facilityIds || []).map((x) => x.name).join(', ')}` : ''}</option>)}
            </Select>
            <Btn variant="primary" icon={Plus} disabled={!add} onClick={() => { setPeople('guard', [...ids('guard'), add], 'Radnik je dodeljen objektu'); setAdd(''); }} data-testid="assign-guard-go">Dodeli</Btn>
          </div>
        )}>
        {!f.guards.length ? <Note tone="warn">Objekat nema radnika, pa ne može da se napravi raspored.</Note> : <div className="sx-list">{f.guards.map((w) => <Person key={w._id} w={w} role="guard" f={f} isAdmin={isAdmin} onDossier={openWorker} onRemove={remove} />)}</div>}
      </Panel>
      <Panel title={<span className="sx-panel__title-row">Koordinator objekta <span className="sx-count">{f.coordinators.length}</span></span>} sub="Pravi raspored, zadaje zadatke i dobija MASTER ALARM za ovaj objekat." testId="facility-coords"
        footer={isAdmin && (
          <div className="sx-inline sx-grow">
            <Select value={addCoord} onChange={(e) => setAddCoord(e.target.value)} data-testid="assign-coord" aria-label="Koordinator za dodelu">
              <option value="">Dodeli koordinatora</option>
              {freeCoords.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </Select>
            <Btn variant="primary" icon={Plus} disabled={!addCoord} onClick={() => { setPeople('coordinator', [...ids('coordinator'), addCoord], 'Koordinator je dodeljen'); setAddCoord(''); }}>Dodeli</Btn>
          </div>
        )}>
        {!f.coordinators.length ? <Note tone="warn">Objekat nema koordinatora. MASTER ALARM tada dobijaju samo administratori.</Note> : <div className="sx-list">{f.coordinators.map((w) => <Person key={w._id} w={w} role="coordinator" f={f} isAdmin={isAdmin} onDossier={openWorker} onRemove={remove} />)}</div>}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- adrese za izveštaj
function ReportTab({ f, reload }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [emails, setEmails] = useState(f.reportEmails || []);
  const [draft, setDraft] = useState('');
  const [bad, setBad] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setEmails(f.reportEmails || []); }, [f.reportEmails]);
  const save = async (list, text) => {
    setBusy(true);
    try { await sec.setReportEmails(f._id, list); setEmails(list); toast.ok(text); reload(); } catch (e) { toast.bad('Adrese nisu sačuvane', errText(e)); } finally { setBusy(false); }
  };
  const addEmail = () => {
    const list = draft.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const wrong = list.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (wrong.length) { setBad(`Nije ispravna adresa: ${wrong.join(', ')}`); return; }
    setBad('');
    save([...new Set([...emails, ...list])], list.length > 1 ? `Dodato ${withCount(list.length, 'adresa', 'adrese', 'adresa')}` : 'Adresa je dodata');
    setDraft('');
  };
  return (
    <div className="sx-cols sx-cols--main">
      <Panel title="Adrese za izveštaj smene" sub="Posle odjave radnika izveštaj (Dnevnik rada, sa PDF-om) ide sam na ove adrese. Koordinator dobija kopiju." testId="report-emails-panel">
        <div className="sx-chips" data-testid="report-emails">
          {!emails.length && <Note tone="warn">Još nema adresa. Bez njih izveštaj ne ide klijentu.</Note>}
          {emails.map((e) => (
            <span key={e} className="sx-chip"><span className="sx-mono">{e}</span>
              <button type="button" className="sx-chip__x" onClick={() => save(emails.filter((x) => x !== e), 'Adresa je uklonjena')} aria-label={`Ukloni ${e}`} title="Ukloni adresu"><X size={13} strokeWidth={2} /></button>
            </span>
          ))}
        </div>
        <form className="sx-inline sx-mt" onSubmit={(e) => { e.preventDefault(); addEmail(); }}>
          <Input value={draft} onChange={(e) => { setDraft(e.target.value); setBad(''); }} placeholder="uprava@klijent.rs, recepcija@klijent.rs" invalid={!!bad} data-testid="email-input" aria-label="Nova adresa" />
          <Btn type="submit" variant="primary" icon={Plus} disabled={!draft.trim() || busy} data-testid="email-add">Dodaj</Btn>
        </form>
        {bad && <p className="sx-field__error sx-mt" role="alert">{bad}</p>}
        <p className="sx-field__hint sx-mt">Više adresa odjednom: odvoji ih zarezom ili razmakom.</p>
      </Panel>
      <Panel title="Šta ide u izveštaj" sub="Ista polja kao papirni Dnevnik rada.">
        <ul className="sx-bullets">
          <li>Ko je preuzeo i predao smenu, sa NFC vremenima</li>
          <li>Preuzeta oprema i stanje opreme</li>
          <li>Tekući događaji, zapažanja i fotografije</li>
          <li>Obilazak po tačkama, zadaci i vanredni događaji</li>
          <li>Ko je primio smenu (prijava sledećeg radnika)</li>
        </ul>
        <Btn className="sx-mt" icon={Send} onClick={() => navigate(`/security/izvestaji?objekat=${f._id}`)}>Izveštaji ovog objekta</Btn>
      </Panel>
    </div>
  );
}

