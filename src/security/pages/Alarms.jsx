// Alarmi: dnevnik (po danima, najnovije prvo) sa preuzimanjem i rešavanjem, i pravila koja administrator
// menja bez programera (važe od sledećeg minuta). Pravila su nacrtana kao lestvica eskalacije:
// početak smene -> alarm radniku -> MASTER ALARM, plan obilaska -> prvi alarm -> drugi alarm.
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Siren, ListChecks, Power, Smartphone, Mail, Globe, MapPin, LogOut, CalendarDays, FileWarning, Clock, Flag, ArrowUpRight, UserRound } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { cx, Btn, Led, Skeleton, withCount, agoText, useTick } from '../sx/ui';
import { PageHead, Toolbar, Panel, Note, Tabs, Stat, SaveBar } from '../sx/layout';
import { Input, Select, Choice, Switch, NumberField, TimeField } from '../sx/forms';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import { hm, fmtDateTime, dayWord, ymdOf, DAY_LONG, dowOfYmd, fmtYmd } from '../lib/time';
import { ResolveDialog } from './live/Side';
import { recipientsText } from './live/model';
import '../sx/alarms.css';

const KINDS = [
  { value: 'all', label: 'Sve vrste' },
  { value: 'late,master', label: 'Dolazak' },
  { value: 'checkpoint1,checkpoint2', label: 'Obilazak' },
  { value: 'no_clock_out', label: 'Odjava' },
  { value: 'contract,license', label: 'Ugovor i licence', admin: true }
];
const KIND_LABEL = { late: 'Kašnjenje na smenu', master: 'MASTER ALARM', checkpoint1: 'Obilazak, prvi alarm', checkpoint2: 'Obilazak, drugi alarm', no_clock_out: 'Bez odjave', contract: 'Ugovor ističe', license: 'Licenca ističe' };
const STATE = { open: ['bad', 'otvoren'], snoozed: ['warn', 'odložen'], escalated: ['bad', 'eskaliran'], ack: ['info', 'preuzet'], resolved: ['ok', 'rešen'] };

export default function Alarms() {
  const { isAdmin } = useSec();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'dnevnik';
  const setTab = (t) => { const n = new URLSearchParams(params); n.set('tab', t); setParams(n, { replace: true }); };
  return (
    <div className="sx-page sx-alarms" data-testid="page-alarms">
      <PageHead
        eyebrow="Security · Alarmi"
        title="Alarmi"
        lead="Alarmi stižu sami, po pravilima. Preuzmi alarm da koordinator i ostali vide da neko reaguje, pa ga reši uz kratku belešku."
      />
      <Tabs items={[{ key: 'dnevnik', label: 'Dnevnik alarma', icon: Siren, testId: 'tab-log' }, { key: 'pravila', label: isAdmin ? 'Pravila' : 'Pravila (pregled)', icon: ListChecks, testId: 'tab-rules' }]}
        value={tab === 'pravila' ? 'pravila' : 'dnevnik'} onChange={setTab} ariaLabel="Delovi strane Alarmi" layoutId="sx-alarms-tabs" className="sx-alarms__tabs" />
      <div key={tab} className="sx-fac__body">{tab === 'pravila' ? <Rules /> : <AlarmLog />}</div>
    </div>
  );
}

// ---------------------------------------------------------------- dnevnik
function AlarmLog() {
  const { isAdmin, facilities, openShift, openWorker } = useSec();
  const toast = useToast();
  const now = useTick(30000);
  const [state, setState] = useState('open');
  const [kind, setKind] = useState('all');
  const [facility, setFacility] = useState('');
  const [resolving, setResolving] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const list = usePoll(() => sec.alarms({ state, kind: kind === 'all' ? undefined : kind, facility: facility || undefined, limit: 200 }), 15000, [state, kind, facility]);
  const items = useMemo(() => list.data || [], [list.data]);
  useEffect(() => { const h = () => list.reload(); window.addEventListener('sec:changed', h); return () => window.removeEventListener('sec:changed', h); }, [list]);

  const c = useMemo(() => ({
    open: items.filter((a) => a.state !== 'resolved' && a.state !== 'ack').length,
    critical: items.filter((a) => a.level === 'critical' && a.state !== 'resolved' && a.state !== 'ack').length,
    ack: items.filter((a) => a.state === 'ack').length,
    snoozed: items.filter((a) => a.state === 'snoozed').length
  }), [items]);

  const days = useMemo(() => {
    const out = [];
    items.forEach((a) => { const d = ymdOf(a.firedAt); let g = out.find((x) => x.d === d); if (!g) { g = { d, items: [] }; out.push(g); } g.items.push(a); });
    return out;
  }, [items]);

  const ack = async (a) => {
    setBusyId(a._id);
    try { await sec.ackAlarm(a._id); toast.ok('Alarm je preuzet', `${a.facilityName || KIND_LABEL[a.kind]}: svi vide da ti reaguješ.`); list.reload(); window.dispatchEvent(new Event('sec:changed')); }
    catch (e) { toast.bad('Alarm nije preuzet', errText(e)); } finally { setBusyId(null); }
  };
  const resolve = async (g, note) => {
    try {
      for (const a of g.list) await sec.resolveAlarm(a._id, note);
      toast.ok('Alarm je rešen', 'Upis je sačuvan u istoriji alarma.');
      list.reload(); window.dispatchEvent(new Event('sec:changed'));
    } catch (e) { toast.bad('Alarm nije rešen', errText(e)); throw e; }
  };

  return (
    <>
      <div className="sx-stats">
        <Stat label="Čeka reakciju" value={c.open} tone={c.open ? 'warn' : 'ok'} sub={c.open ? 'niko ih još nije preuzeo' : 'sve je preuzeto'} testId="stat-open" />
        <Stat label="Kritični" value={c.critical} tone={c.critical ? 'bad' : null} sub="MASTER i drugi alarm obilaska" testId="stat-critical" />
        <Stat label="Preuzeti" value={c.ack} sub="neko reaguje, čeka rešenje" />
        <Stat label="Odloženi" value={c.snoozed} sub="radnik je odložio uz razlog" />
      </div>

      <Toolbar testId="alarms-toolbar">
        <Choice size="sm" label="Stanje" value={state} onChange={setState} layoutId="sx-alarms-state"
          options={[{ value: 'open', label: 'Aktivni', testId: 'alarms-open' }, { value: 'all', label: 'Svi, i rešeni', testId: 'alarms-all' }]} />
        <span className="sx-toolbar__sep" aria-hidden="true" />
        <Choice size="sm" scroll label="Vrsta" value={kind} onChange={setKind} layoutId="sx-alarms-kind" options={KINDS.filter((k) => !k.admin || isAdmin).map((k) => ({ value: k.value, label: k.label, testId: `kind-${k.label}` }))} />
        <div className="sx-toolbar__end">
          <Select size="sm" value={facility} onChange={(e) => setFacility(e.target.value)} aria-label="Objekat" data-testid="alarms-facility">
            <option value="">Svi objekti</option>
            {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </Select>
        </div>
      </Toolbar>

      {list.loading && !list.data ? <div className="sx-stack"><Skeleton h={90} r={18} /><Skeleton h={90} r={18} /></div> : !items.length ? (
        <Panel>
          <div className="sx-alclear">
            <Led tone="ok" lg />
            <div><b>{state === 'open' ? 'Nema aktivnih alarma' : 'Nema alarma za ovaj filter'}</b><span>{state === 'open' ? 'Sve smene teku po planu. Novi alarm se pojavljuje ovde, na Uživo i na vrhu svake stranice.' : 'Promeni vrstu ili objekat.'}</span></div>
          </div>
        </Panel>
      ) : (
        <div className="sx-stack" data-testid="alarm-list">
          {days.map((g) => (
            <section key={g.d} className="sx-card sx-alday">
              <header className="sx-alday__head"><b>{dayWord(g.d) === 'danas' ? 'Danas' : dayWord(g.d) === 'juče' ? 'Juče' : DAY_LONG[dowOfYmd(g.d)].replace(/^./, (x) => x.toUpperCase())}</b><span className="sx-mono">{fmtYmd(g.d)}</span><span className="sx-count">{g.items.length}</span></header>
              <ol className="sx-allist">
                {g.items.map((a, i) => {
                  const [tone, label] = STATE[a.state] || ['idle', a.state];
                  const openish = a.state !== 'resolved' && a.state !== 'ack';
                  const sign = a.state === 'resolved' ? 'ok' : a.state === 'ack' ? 'info' : a.level === 'critical' ? 'bad' : 'warn';
                  return (
                    <li key={a._id} className={cx('sx-alrow', `is-${sign}`, a.state === 'resolved' && 'is-done')} style={{ '--i': i }} data-testid="alarm-row" data-kind={a.kind}>
                      <time className="sx-alrow__time sx-mono" title={fmtDateTime(a.firedAt)}>{hm(a.firedAt)}</time>
                      <Led tone={sign} live={openish} className="sx-alrow__led" />
                      <div className="sx-alrow__main">
                        <div className="sx-alrow__top">
                          <span className="sx-alrow__kind">{KIND_LABEL[a.kind] || a.kind}</span>
                          <span className={cx('sx-tag', `is-${tone}`)}>{label}</span>
                          <span className="sx-alrow__ago">{agoText(a.firedAt, now)}</span>
                        </div>
                        <b className="sx-alrow__title">{a.facilityName ? `${a.facilityName}: ` : ''}{a.title}</b>
                        <span className="sx-alrow__msg">{a.message}</span>
                        {a.recipients && a.recipients.length > 0 && <span className="sx-alrow__meta">Poslato: {recipientsText(a.recipients) || a.recipients.map((r) => r.name).join(', ')}</span>}
                        {(a.snoozes || []).map((z, k) => <span key={k} className="sx-alrow__note is-warn">Odloženo u <span className="sx-mono">{hm(z.at)}</span>: „{z.reason}”</span>)}
                        {a.ackByName && <span className="sx-alrow__note is-info">Preuzeo {a.ackByName} u <span className="sx-mono">{hm(a.ackAt)}</span></span>}
                        {a.resolution && <span className="sx-alrow__note is-ok">Rešeno: „{a.resolution}”</span>}
                      </div>
                      <div className="sx-alrow__actions">
                        {openish && <Btn size="sm" variant={a.level === 'critical' ? 'danger' : 'primary'} onClick={() => ack(a)} busy={busyId === a._id} data-testid="alarm-ack">Preuzmi</Btn>}
                        {a.state !== 'resolved' && <Btn size="sm" onClick={() => setResolving({ key: a._id, lead: a, list: [a], tone: a.level === 'critical' ? 'bad' : 'warn', round: null })} data-testid="alarm-resolve">Reši</Btn>}
                        {a.shiftId && <Btn size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => openShift(a.shiftId)}>Smena</Btn>}
                        {a.workerId && <Btn size="sm" variant="ghost" icon={UserRound} onClick={() => openWorker(a.workerId)}>Dosije</Btn>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
      <p className="sx-facs__foot"><Led tone="ok" live /> Dnevnik se osvežava sam na 15 s · {withCount(items.length, 'alarm', 'alarma', 'alarma')}</p>
      {resolving && <ResolveDialog g={resolving} onClose={() => setResolving(null)} onDone={resolve} />}
    </>
  );
}

// ---------------------------------------------------------------- pravila
const pick = (s) => ({
  alarms: { ...s.alarms },
  expiry: { ...s.expiry, contractDays: (s.expiry.contractDays || []).join(', '), licenseDays: (s.expiry.licenseDays || []).join(', ') },
  reports: { ...s.reports },
  gpsRadiusM: s.gpsRadiusM
});

// korak lestvice: znak stanja, naslov (sa brojem) i opis
function Rung({ tone, title, children, icon: Icon }) {
  return (
    <li className="sx-rung">
      <span className="sx-rung__mark"><Led tone={tone} lg /></span>
      <div className="sx-rung__body">
        <b className="sx-rung__title">{title}</b>
        {children && <span className="sx-rung__text">{Icon && <Icon size={14} strokeWidth={1.9} aria-hidden="true" />}{children}</span>}
      </div>
    </li>
  );
}

function RuleRow({ icon: Icon, title, text, control }) {
  return (
    <div className="sx-rulelist__row">
      <div><b>{Icon && <Icon size={14} strokeWidth={1.9} aria-hidden="true" />} {title}</b>{text && <span>{text}</span>}</div>
      {control}
    </div>
  );
}

function Rules() {
  const { isAdmin } = useSec();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { sec.settings().then((x) => { setS(x); setF(pick(x)); }).catch((e) => toast.bad('Pravila nisu učitana', errText(e))); }, [toast]);
  if (!s || !f) return <div className="sx-stack"><Skeleton h={80} r={18} /><Skeleton h={320} r={18} /></div>;
  const orig = pick(s);
  const dirty = JSON.stringify(f) !== JSON.stringify(orig);
  const ro = !isAdmin;
  const setA = (k, v) => setF({ ...f, alarms: { ...f.alarms, [k]: v } });
  const setE = (k, v) => setF({ ...f, expiry: { ...f.expiry, [k]: v } });
  const setR = (k, v) => setF({ ...f, reports: { ...f.reports, [k]: v } });
  const masterBad = Number(f.alarms.masterMin) <= Number(f.alarms.lateMin);
  const num = (k, props) => <NumberField value={f.alarms[k]} onChange={(v) => setA(k, v)} disabled={ro} {...props} />;

  const save = async () => {
    const body = {};
    ['alarms', 'expiry', 'reports'].forEach((g) => { Object.keys(f[g]).forEach((k) => { if (JSON.stringify(f[g][k]) !== JSON.stringify(orig[g][k])) { body[g] = body[g] || {}; body[g][k] = f[g][k]; } }); });
    if (f.gpsRadiusM !== orig.gpsRadiusM) body.gpsRadiusM = f.gpsRadiusM;
    if (body.alarms && body.alarms.enabled === false) {
      const ok = await confirm({ title: 'Isključi sve alarme?', text: 'Niko neće dobiti alarm za kašnjenje, MASTER ALARM ni alarm za obilazak dok ih ponovo ne uključiš. Koristi samo kratko, na primer za praznik bez smena.', tone: 'danger', confirmLabel: 'Isključi alarme' });
      if (!ok) return;
    }
    setBusy(true);
    try { const x = await sec.saveSettings(body); setS(x); setF(pick(x)); toast.ok('Pravila su sačuvana', 'Važe od sledećeg minuta.'); }
    catch (e) { toast.bad('Pravila nisu sačuvana', errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="sx-stack" data-testid="rules">
      {ro && <Note>Pravila menjaju administrator i superadmin. Ovde vidiš kako alarmi rade.</Note>}
      <div className={cx('sx-card sx-kill', !f.alarms.enabled && 'is-off')}>
        <span className="sx-kill__icon"><Power size={20} strokeWidth={1.9} aria-hidden="true" /></span>
        <div className="sx-kill__text"><b>{f.alarms.enabled ? 'Alarmi su uključeni' : 'Svi alarmi su isključeni'}</b><span>{f.alarms.enabled ? 'Sistem proverava smene i obilaske svakog minuta.' : 'Niko ne dobija alarme. Uključi ih čim je moguće.'}</span></div>
        <Switch checked={f.alarms.enabled} onChange={(v) => setA('enabled', v)} disabled={ro} label="Alarmi uključeni" testId="rule-enabled" />
      </div>

      <div className="sx-cols sx-cols--2">
        <Panel title="Dolazak na smenu" sub={`Dnevna ${s.dayStart}-${s.nightStart}, noćna ${s.nightStart}-${s.dayStart}.`} testId="rules-arrival">
          <ol className="sx-ladder">
            <Rung tone="ok" title={<>Početak smene</>}>Prijava prislanjanjem telefona na tag radnog mesta, najranije {num('earlyClockInMin', { min: 0, max: 240, suffix: 'min', testId: 'rule-early', 'aria-label': 'Najranija prijava pre početka' })} pre početka.</Rung>
            <Rung tone="warn" title={<>Posle {num('lateMin', { min: 1, max: 120, suffix: 'min', testId: 'rule-late', 'aria-label': 'Alarm radniku posle' })} bez prijave</>} icon={Smartphone}>alarm radniku na telefonu i upis u dosije</Rung>
            <Rung tone="bad" title={<>Posle {num('masterMin', { min: 2, max: 240, suffix: 'min', testId: 'rule-master', 'aria-label': 'MASTER ALARM posle' })} bez prijave</>} icon={Siren}>MASTER ALARM koordinatoru objekta i administratorima: telefon, mejl i sajt</Rung>
          </ol>
          {masterBad && <Note tone="bad" className="sx-mt">MASTER ALARM mora da stigne posle alarma radniku.</Note>}
        </Panel>

        <Panel title="Obilazak (checkpointi)" sub="Vreme obilaska se zadaje po objektu, u tabu Obilazak." testId="rules-rounds">
          <ol className="sx-ladder">
            <Rung tone="ok" title={<>Vreme iz plana ± {num('checkpointTolMin', { min: 0, max: 60, suffix: 'min', testId: 'rule-tol', 'aria-label': 'Tolerancija obilaska' })}</>} icon={Flag}>očitavanje u tom roku je uredno</Rung>
            <Rung tone="warn" title="Prvi alarm radniku">Može da ga odloži za {num('snoozeMin', { min: 1, max: 60, suffix: 'min', testId: 'rule-snooze', 'aria-label': 'Odlaganje alarma' })}, najviše {num('maxSnoozes', { min: 1, max: 5, suffix: 'put', width: 56, testId: 'rule-maxsnooze', 'aria-label': 'Najviše odlaganja' })}, uz obavezan razlog.</Rung>
            <Rung tone="bad" title="Drugi alarm" icon={Siren}>ide administratoru, upis u dosije</Rung>
          </ol>
          <p className="sx-field__hint sx-mt">Objekat može da ima svoju toleranciju i odlaganje (Objekti, tab Pregled).</p>
        </Panel>

        <Panel title="Odjava sa smene" testId="rules-out">
          <div className="sx-rulelist">
            <RuleRow icon={LogOut} title="Alarm ako radnik ne odjavi smenu" text={<>Posle {num('noClockOutMin', { min: 5, max: 240, suffix: 'min', disabled: ro || !f.alarms.noClockOutEnabled, testId: 'rule-noout', 'aria-label': 'Alarm za odjavu posle' })} od kraja smene, koordinatoru i adminima.</>}
              control={<Switch checked={f.alarms.noClockOutEnabled} onChange={(v) => setA('noClockOutEnabled', v)} disabled={ro} label="Alarm za odjavu" testId="rule-noout-on" />} />
          </div>
          <p className="sx-field__hint">Odjava više od 30 min pre kraja traži potvrdu radnika i upisuje se u dosije.</p>
        </Panel>

        <Panel title="Ugovori i licence" sub="Provera jednom dnevno. Svaki alarm stiže samo jednom po roku." testId="rules-expiry">
          <div className="sx-rulelist">
            <RuleRow icon={CalendarDays} title="Ugovor ističe" text="Koliko dana pre isteka stiže alarm. Više rokova odvoji zarezom, npr. 30, 7."
              control={<Input size="sm" mono value={f.expiry.contractDays} onChange={(e) => setE('contractDays', e.target.value)} disabled={ro} className="sx-rule-days" data-testid="rule-contract-days" aria-label="Dani pre isteka ugovora" />} />
            <RuleRow icon={FileWarning} title="Licenca ističe" text={<span className="sx-inline"><Input size="sm" mono value={f.expiry.licenseDays} onChange={(e) => setE('licenseDays', e.target.value)} disabled={ro || !f.expiry.licenseEnabled} className="sx-rule-days" data-testid="rule-license-days" aria-label="Dani pre isteka licence" /> dana pre isteka</span>}
              control={<Switch checked={f.expiry.licenseEnabled} onChange={(v) => setE('licenseEnabled', v)} disabled={ro} label="Alarm za licence" />} />
            <RuleRow icon={Clock} title="Vreme dnevne provere" control={<TimeField value={f.expiry.dailyTime} onChange={(v) => setE('dailyTime', v)} disabled={ro} compact testId="rule-daily-time" aria-label="Vreme dnevne provere" />} />
            <RuleRow icon={Mail} title="Mejl administratorima" text="Pored obaveštenja na sajtu." control={<Switch checked={f.expiry.emailAdmins} onChange={(v) => setE('emailAdmins', v)} disabled={ro} label="Mejl administratorima" />} />
          </div>
        </Panel>

        <Panel title="Izveštaji smene" testId="rules-reports">
          <div className="sx-rulelist">
            <RuleRow icon={Mail} title="Kopija koordinatoru" text="Koordinator objekta dobija svaki izveštaj." control={<Switch checked={f.reports.ccCoordinator} onChange={(v) => setR('ccCoordinator', v)} disabled={ro} label="Kopija koordinatoru" />} />
            <RuleRow icon={Globe} title="PDF u prilogu" text="Dnevnik rada kao PDF, pored teksta u mejlu." control={<Switch checked={f.reports.attachPdf} onChange={(v) => setR('attachPdf', v)} disabled={ro} label="PDF u prilogu" />} />
          </div>
        </Panel>

        <Panel title="Lokacija očitavanja" testId="rules-gps">
          <div className="sx-rulelist">
            <RuleRow icon={MapPin} title="Udaljenost od objekta" text="Očitavanje dalje od ovoga se označava u izveštaju. Ne blokira prijavu."
              control={<NumberField value={f.gpsRadiusM} onChange={(v) => setF({ ...f, gpsRadiusM: v })} min={50} max={5000} suffix="m" width={70} disabled={ro} aria-label="Udaljenost u metrima" />} />
          </div>
        </Panel>
      </div>

      <Panel title="Istorija izmena pravila" testId="rules-history-panel">
        {!(s.history || []).length ? <p className="sx-ssec__lead">Pravila još nisu menjana. Važe podrazumevana.</p> : (
          <ol className="sx-tl" data-testid="rules-history">
            {s.history.map((h, i) => (
              <li className="sx-tl__item" key={i} style={{ '--i': i }}>
                <span className="sx-tl__mark"><Led tone="info" /></span>
                <div className="sx-tl__body"><span className="sx-tl__title">{h.changes}</span><span className="sx-tl__meta"><span className="sx-mono">{fmtDateTime(h.at)}</span> · {h.byName}</span></div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <p className="sx-field__hint">Satnica i dodaci za noćni rad i praznike su na stranici Satnica.</p>
      {isAdmin && <SaveBar show={dirty} text="Pravila su izmenjena. Važe od sledećeg minuta posle čuvanja." onReset={() => setF(orig)} onSave={save} busy={busy} disabled={masterBad} saveLabel="Sačuvaj pravila" testId="rules-savebar" />}
    </div>
  );
}
