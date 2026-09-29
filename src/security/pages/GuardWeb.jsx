// Web za radnika obezbeđenja (rezerva za Android aplikaciju): trenutna smena, alarmi, obilazak, zadaci,
// zapažanja i raspored. NFC očitavanje radi i ovde, u Chrome-u na Android telefonu (Web NFC).
// Raspored strane: na telefonu jedna kolona, na širem ekranu dve (smena levo, zadaci i objekat desno).
import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Nfc, Clock, Sun, Moon, Check, MapPin, Phone, Eye, ShieldAlert, Camera, X, Smartphone } from 'lucide-react';
import { sec, errText } from '../api';
import { usePoll, useNow } from '../hooks';
import { cx, Btn, Led, Sign, Skeleton, telOf, withCount } from '../sx/ui';
import { Panel, Note, Tabs } from '../sx/layout';
import { Field, Input, Select, Textarea, FileButton } from '../sx/forms';
import Dialog from '../sx/Dialog';
import ShiftLine from '../sx/ShiftLine';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import BrandMark from '../sx/BrandMark';
import { webNfcSupported, readTagOnce } from '../components/nfc';
import { hm, relText, dayWord, fmtDateTime, durText, weekStart, todayYmd, addDays, DAY_SHORT, fmtYmdShort, dowOfYmd } from '../lib/time';
import '../sx/shift.css';
import '../sx/guard.css';

const newClientId = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function GuardWeb({ user, logout }) {
  const [tab, setTab] = useState('smena');
  const cur = usePoll(() => sec.meCurrent(), 20000, []);
  const d = cur.data;
  return (
    <div className="sx sx-guard" data-testid="guard-web">
      <header className="sx-guard__top">
        <BrandMark />
        <div className="sx-guard__brand"><b>Robotik Security</b><span>{user.name}</span></div>
        <Btn size="sm" variant="ghost" icon={LogOut} onClick={logout} data-testid="guard-logout">Odjavi se</Btn>
      </header>
      <main className="sx-page sx-guard__page">
        <Note icon={Smartphone} className="sx-mb">Za prijavu na smenu i obilazak koristi aplikaciju Robotik na telefonu. Ova stranica je rezerva{webNfcSupported() ? ' i može da očita tag.' : '; tag se očitava samo u Chrome-u na Android telefonu.'}</Note>
        {d && (d.alarms || []).length > 0 && <AlarmCards alarms={d.alarms} reload={cur.reload} />}
        <Tabs items={[{ key: 'smena', label: 'Moja smena', testId: 'gw-tab-shift' }, { key: 'raspored', label: 'Raspored', testId: 'gw-tab-schedule' }]} value={tab} onChange={setTab} ariaLabel="Delovi strane" layoutId="sx-gw-tabs" />
        <div key={tab} className="sx-fac__body">
          {tab === 'smena' ? (!d ? <div className="sx-stack"><Skeleton h={220} r={20} /><Skeleton h={160} r={18} /></div> : <ShiftView d={d} reload={cur.reload} />) : <ScheduleView />}
        </div>
      </main>
    </div>
  );
}

function AlarmCards({ alarms, reload }) {
  const toast = useToast();
  const snooze = async (a) => {
    const reason = await confirm({ eyebrow: a.tagName ? `Obilazak · ${a.tagName}` : 'Alarm', title: 'Odloži alarm', text: 'Alarm se odlaže jednom. Ako tačku ne očitaš ni tada, alarm ide administratoru.', input: 'Razlog (obavezno)', placeholder: 'Npr. intervencija na ulazu, stižem za 5 min', confirmLabel: 'Odloži alarm' });
    if (!reason) return;
    try { await sec.meSnooze(a._id, reason); toast.ok('Alarm je odložen', 'Očitaj tačku čim stigneš.'); reload(); } catch (e) { toast.bad('Alarm nije odložen', errText(e)); }
  };
  return (
    <div className="sx-stack sx-guard__alarms">
      {alarms.map((a) => (
        <div key={a._id} className={cx('sx-alarm', a.level === 'critical' ? 'is-bad' : 'is-warn')} data-testid="guard-alarm">
          <div className="sx-alarm__top">
            <span className="sx-alarm__kind"><Led tone={a.level === 'critical' ? 'bad' : 'warn'} live />{a.level === 'critical' ? 'Kritično' : 'Upozorenje'}</span>
            <time className="sx-alarm__age sx-mono">{hm(a.firedAt)} · {relText(a.firedAt)}</time>
          </div>
          <h3 className="sx-alarm__title">{a.title}</h3>
          <p className="sx-alarm__what">{a.message}</p>
          {(a.snoozes || []).map((z, i) => <p key={i} className="sx-alarm__note">Odloženo: „{z.reason}”</p>)}
          {a.kind === 'checkpoint1' && a.state === 'open' && !(a.snoozes || []).length && <div className="sx-alarm__actions"><Btn size="sm" onClick={() => snooze(a)} data-testid="guard-snooze">Odloži alarm</Btn></div>}
        </div>
      ))}
    </div>
  );
}

function ScanButton({ reload }) {
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const ctrl = useRef(null);
  useEffect(() => () => ctrl.current && ctrl.current.abort(), []);
  if (!webNfcSupported()) return null;
  const send = async (uid, confirmEarly = false, clientId = newClientId()) => {
    const r = await sec.meScan({ uid, source: 'webnfc', deviceAt: new Date().toISOString(), clientId, confirmEarly });
    if (r.result === 'confirm_early') {
      const ok = await confirm({ title: 'Odlaziš ranije?', text: `${r.message} Ostalo je ${durText(r.minutesLeft)}. Rana odjava se upisuje u dosije.`, tone: 'danger', confirmLabel: 'Da, odjavi me' });
      if (ok) return send(uid, true, newClientId());
      return null;
    }
    return r;
  };
  const scan = async () => {
    setScanning(true);
    ctrl.current = new AbortController();
    try {
      const { uid } = await readTagOnce({ signal: ctrl.current.signal });
      if (navigator.vibrate) navigator.vibrate(60);
      const r = await send(uid);
      if (r) {
        const good = ['clock_in', 'clock_out', 'checkpoint', 'extra'].includes(r.result);
        (good ? toast.ok : toast.warn)(r.tag ? r.tag.name : 'Očitano', r.message);
      }
      reload();
    } catch (e) { if (e.message !== 'Otkazano') toast.bad('Očitavanje nije uspelo', e.message || errText(e)); }
    finally { setScanning(false); }
  };
  return (
    <div className={cx('sx-scan sx-guard__scan', scanning && 'is-scanning')}>
      <span className="sx-scan__icon" aria-hidden="true"><Nfc size={22} strokeWidth={1.9} /><i /><i /></span>
      <div className="sx-scan__text"><b>{scanning ? 'Prisloni telefon na tag' : 'Očitaj tag'}</b><span>Radno mesto za prijavu i odjavu, checkpoint za obilazak.</span></div>
      <Btn variant="primary" size="lg" icon={Nfc} onClick={scan} busy={scanning} data-testid="guard-scan">{scanning ? 'Čekam tag' : 'Očitaj tag'}</Btn>
    </div>
  );
}

function ShiftView({ d, reload }) {
  const now = useNow(30000);
  const toast = useToast();
  const [taskDone, setTaskDone] = useState(null);
  const [note, setNote] = useState(null);
  const sh = d.shift;
  if (!sh) {
    return (
      <Panel>
        <div className="sx-empty-block">
          <b>Nemaš smenu sada</b>
          <span>{d.nextShift ? `Sledeća: ${dayWord(d.nextShift.date)} ${d.nextShift.label}, ${d.nextShift.facilityName}.` : 'Nema zakazanih smena. Raspored vidiš na kartici Raspored.'}</span>
        </div>
      </Panel>
    );
  }
  const f = sh.facility || {};
  const done = sh.rounds.filter((r) => r.scannedAt).length;
  const late = sh.status === 'planned' && new Date(sh.plannedStart) < new Date(now);
  const statusText = sh.status === 'active' ? `U smeni si od ${hm(sh.clockIn && sh.clockIn.at)}.` : sh.status === 'planned' ? (late ? `Kasniš ${durText((now - new Date(sh.plannedStart)) / 60000)}. Prijavi se odmah.` : `Smena počinje ${relText(sh.plannedStart, now)}.`) : sh.status === 'done' ? `Smena je završena u ${hm(sh.clockOut && sh.clockOut.at)}.` : 'Smena je propuštena.';
  const tone = sh.status === 'active' ? 'ok' : late ? 'bad' : sh.status === 'done' ? 'idle' : sh.status === 'missed' ? 'bad' : 'info';
  const TypeIcon = sh.type === 'night' ? Moon : Sun;
  const standingDone = async (t) => {
    if (t.done) { try { await sec.meStandingUndo(sh._id, t._id); reload(); } catch (e) { toast.bad('Nije uspelo', errText(e)); } return; }
    if (t.requireComment) { setTaskDone({ kind: 'standing', t }); return; }
    try { await sec.meStanding(sh._id, t._id, ''); toast.ok('Zadatak je označen'); reload(); } catch (e) { toast.bad('Nije uspelo', errText(e)); }
  };
  const lineShift = { ...sh, tasks: sh.occasional.map((t) => ({ _id: t._id, dueAt: t.dueAt, text: t.text, status: t.status })) };
  return (
    <div className="sx-guard__grid">
      <div className="sx-stack">
        <section className={cx('sx-card sx-guard__shift', `is-${sh.type}`)} data-testid="guard-shift">
          <span className="sx-eyebrow"><TypeIcon size={13} strokeWidth={2} aria-hidden="true" />{dayWord(sh.date)} · {sh.label}</span>
          <h2 className="sx-guard__fac">{f.name}</h2>
          {f.address && <span className="sx-guard__addr">{f.address}</span>}
          <div className="sx-guard__state"><Sign tone={tone} live={sh.status === 'active' || late}>{sh.status === 'active' ? 'u smeni' : sh.status === 'planned' ? 'nisi prijavljen' : sh.status === 'done' ? 'završena' : 'propuštena'}</Sign></div>
          <b className="sx-guard__statetext" data-testid="guard-shift-state">{statusText}</b>
          {sh.status !== 'done' && sh.status !== 'missed' && <ScanButton reload={reload} />}
          <div className="sx-guard__line">
            <ShiftLine s={lineShift} now={now} tolMin={sh.rules ? sh.rules.checkpointTolMin : 5} />
            {sh.rounds.length > 0 && <span className="sx-guard__progress">Obilazak <b className="sx-mono">{done}/{sh.rounds.length}</b>, tolerancija ±{sh.rules.checkpointTolMin} min</span>}
          </div>
        </section>

        {sh.rounds.length > 0 && (
          <Panel title="Obilazak" sub="Očitaj svaku tačku u vreme iz plana.">
            <ol className="sx-events">
              {sh.rounds.map((r, i) => {
                const miss = !r.scannedAt && new Date(r.dueAt).getTime() + sh.rules.checkpointTolMin * 60000 < now;
                return (
                  <li key={r.index} className="sx-event" style={{ '--i': i }} data-testid="guard-round">
                    <time className="sx-mono">{hm(r.dueAt)}</time>
                    <Led tone={r.scannedAt ? (r.lateMin > sh.rules.checkpointTolMin ? 'warn' : 'ok') : miss ? 'bad' : 'idle'} live={miss} />
                    <div className="sx-event__body"><b>{r.tagName}</b><span>{r.scannedAt ? `očitano u ${hm(r.scannedAt)}` : miss ? 'kasni, očitaj odmah' : 'čeka'}</span></div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        )}
      </div>

      <div className="sx-stack">
        <Panel title="Zadaci" sub="Stalni važe za svaku smenu, povremeni se zatvaraju uz komentar." testId="guard-tasks">
          {!sh.standing.length && !sh.occasional.length && <p className="sx-ssec__lead">Nema zadataka za ovu smenu.</p>}
          <div className="sx-guard__tasks">
            {sh.standing.map((t) => (
              <button type="button" key={t._id} className={cx('sx-gtask', t.done && 'is-done')} onClick={() => sh.status === 'active' && standingDone(t)} disabled={sh.status !== 'active'} aria-pressed={!!t.done} data-testid="guard-standing">
                <span className="sx-gtask__box" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                <span className="sx-gtask__text"><b>{t.text}</b><span>{t.done ? `${hm(t.doneAt)}${t.comment ? ` · ${t.comment}` : ''}` : t.requireComment ? 'stalni zadatak · obavezan komentar' : 'stalni zadatak'}</span></span>
              </button>
            ))}
            {sh.occasional.map((t) => (
              <button type="button" key={t._id} className={cx('sx-gtask is-occ', t.status === 'done' && 'is-done')} onClick={() => t.status !== 'done' && setTaskDone({ kind: 'occasional', t })} aria-pressed={t.status === 'done'} data-testid="guard-occasional">
                <span className="sx-gtask__box" aria-hidden="true">{t.status === 'done' ? <Check size={13} strokeWidth={3} /> : <Clock size={13} strokeWidth={2.2} />}</span>
                <span className="sx-gtask__text"><b><span className="sx-mono">{hm(t.dueAt)}</span> · {t.text}</b><span>{t.status === 'done' ? `${hm(t.doneAt)} · ${t.comment}` : `povremeni, samo za ovu smenu · ${t.createdByName}`}</span></span>
              </button>
            ))}
          </div>
        </Panel>

        {sh.status === 'active' && (
          <div className="sx-guard__notes">
            <Btn icon={Eye} onClick={() => setNote('observation')} data-testid="guard-note">Zapažanje</Btn>
            <Btn icon={ShieldAlert} onClick={() => setNote('authority')} data-testid="guard-authority">Primena ovlašćenja</Btn>
          </div>
        )}
        {sh.notes.length > 0 && (
          <Panel title="Upisano u ovoj smeni">
            <ol className="sx-tl">
              {sh.notes.map((n, i) => (
                <li className="sx-tl__item" key={n._id} style={{ '--i': i }}>
                  <span className="sx-tl__mark"><Led tone={n.kind === 'authority' ? 'warn' : 'info'} /></span>
                  <div className="sx-tl__body"><span className="sx-tl__title">{n.kind === 'authority' ? `${n.power}: ` : ''}{n.text}</span><span className="sx-tl__meta"><span className="sx-mono">{fmtDateTime(n.at)}</span>{(n.photos || []).length ? ` · ${withCount(n.photos.length, 'fotografija', 'fotografije', 'fotografija')}` : ''}</span></div>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        {(f.instructions || f.contactPhone || (f.coordinators || []).length > 0) && (
          <Panel title="Objekat" sub={f.name}>
            {f.instructions && <p className="sx-guard__instr">{f.instructions}</p>}
            <div className="sx-guard__contacts">
              {f.contactPhone && <Btn size="sm" icon={Phone} href={telOf(f.contactPhone)}>{f.contactName || 'Kontakt'}</Btn>}
              {(f.coordinators || []).filter((c) => c.phone).map((c) => <Btn key={c.name} size="sm" icon={Phone} href={telOf(c.phone)}>{c.name}</Btn>)}
              {f.address && <Btn size="sm" variant="ghost" icon={MapPin} href={`https://maps.google.com/?q=${encodeURIComponent(f.address)}`} target="_blank" rel="noreferrer">Mapa</Btn>}
            </div>
          </Panel>
        )}
      </div>

      {taskDone && <TaskDoneDialog item={taskDone} shiftId={sh._id} onClose={() => setTaskDone(null)} onDone={() => { setTaskDone(null); reload(); }} />}
      {note && <NoteDialog kind={note} shiftId={sh._id} onClose={() => setNote(null)} onDone={() => { setNote(null); reload(); }} />}
    </div>
  );
}

function PhotoPicker({ photos, setPhotos, max }) {
  return (
    <div className="sx-field sx-mt">
      <span className="sx-field__label">Fotografije</span>
      <div className="sx-inline">
        <FileButton accept="image/*" capture="environment" multiple icon={Camera} disabled={photos.length >= max} onFile={(files) => setPhotos([...photos, ...files].slice(0, max))}>Dodaj fotografiju</FileButton>
        <span className="sx-field__hint">do {max}, nije obavezno</span>
      </div>
      {photos.length > 0 && (
        <div className="sx-chips">
          {photos.map((p, i) => <span key={i} className="sx-chip">{p.name.slice(0, 22)}<button type="button" className="sx-chip__x" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label={`Ukloni ${p.name}`}><X size={13} strokeWidth={2} /></button></span>)}
        </div>
      )}
    </div>
  );
}

function TaskDoneDialog({ item, shiftId, onClose, onDone }) {
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const min = item.kind === 'occasional' ? 3 : 2;
  const submit = async () => {
    setBusy(true);
    try {
      if (item.kind === 'standing') await sec.meStanding(shiftId, item.t._id, comment);
      else { const form = new FormData(); form.append('comment', comment); photos.forEach((p) => form.append('photos', p)); await sec.meTaskDone(item.t._id, form); }
      toast.ok('Zadatak je zatvoren'); onDone();
    } catch (e) { toast.bad('Zadatak nije zatvoren', errText(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog onClose={onClose} busy={busy} eyebrow={item.kind === 'occasional' ? `Povremeni zadatak · ${hm(item.t.dueAt)}` : 'Stalni zadatak'} title="Zatvori zadatak" description={item.t.text} testId="task-done"
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>Odustani</Btn><Btn variant="primary" icon={Check} busy={busy} disabled={comment.trim().length < min} onClick={submit} data-testid="task-done-save">Zatvori zadatak</Btn></>}>
      <Field label="Komentar (obavezno)" hint="Šta je urađeno ili šta si zatekao."><Textarea autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Npr. sala zaključana, svetla ugašena" data-testid="task-comment" /></Field>
      {item.kind === 'occasional' && <PhotoPicker photos={photos} setPhotos={setPhotos} max={4} />}
    </Dialog>
  );
}

function NoteDialog({ kind, shiftId, onClose, onDone }) {
  const toast = useToast();
  const [powers, setPowers] = useState([]);
  const [f, setF] = useState({ text: '', power: '', subject: '', witnesses: '' });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (kind === 'authority') sec.mePowers().then(setPowers).catch(() => {}); }, [kind]);
  const submit = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('kind', kind); form.append('clientId', newClientId());
      Object.entries(f).forEach(([k, v]) => form.append(k, v));
      photos.forEach((p) => form.append('photos', p));
      await sec.meNote(shiftId, form);
      toast.ok(kind === 'authority' ? 'Izveštaj o primeni ovlašćenja je poslat' : 'Zapažanje je upisano', kind === 'authority' ? 'Koordinator i administrator su obavešteni.' : 'Ulazi u izveštaj smene.'); onDone();
    } catch (e) { toast.bad('Nije sačuvano', errText(e)); } finally { setBusy(false); }
  };
  const valid = f.text.trim().length >= 3 && (kind !== 'authority' || f.power);
  return (
    <Dialog onClose={onClose} busy={busy} size="lg" eyebrow="Ulazi u izveštaj smene" title={kind === 'authority' ? 'Primena ovlašćenja' : 'Zapažanje'} testId="note-modal"
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>Odustani</Btn><Btn variant="primary" busy={busy} disabled={!valid} onClick={submit} data-testid="note-save">{kind === 'authority' ? 'Pošalji izveštaj' : 'Upiši zapažanje'}</Btn></>}>
      {kind === 'authority' && (
        <div className="sx-form sx-mb">
          <Field label="Ovlašćenje" wide><Select value={f.power} onChange={(e) => setF({ ...f, power: e.target.value })} data-testid="note-power"><option value="">Izaberi ovlašćenje</option>{powers.map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
          <Field label="Lice"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Ime ili opis lica" /></Field>
          <Field label="Svedoci" hint="Nije obavezno."><Input value={f.witnesses} onChange={(e) => setF({ ...f, witnesses: e.target.value })} /></Field>
        </div>
      )}
      <Field label={kind === 'authority' ? 'Šta se desilo' : 'Zapažanje'}><Textarea autoFocus value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder={kind === 'authority' ? 'Kratko: razlog, šta je urađeno, kako se završilo' : 'Npr. otvoren prozor na 2. spratu, zatvoren'} data-testid="note-text" /></Field>
      <PhotoPicker photos={photos} setPhotos={setPhotos} max={6} />
    </Dialog>
  );
}

function ScheduleView() {
  const list = usePoll(() => sec.meShifts(), 0, []);
  if (!list.data) return <Skeleton h={300} r={18} />;
  const today = todayYmd();
  const upcoming = list.data.filter((s) => s.date >= addDays(today, -1));
  const past = list.data.filter((s) => s.date < addDays(today, -1)).reverse();
  const weeks = [];
  upcoming.forEach((s) => { const w = weekStart(s.date); let g = weeks.find((x) => x.w === w); if (!g) { g = { w, items: [] }; weeks.push(g); } g.items.push(s); });
  const row = (s) => {
    const Icon = s.type === 'night' ? Moon : Sun;
    return (
      <div key={s._id} className={cx('sx-item sx-gshift', s.date === today && 'is-today')} data-testid="guard-schedule-row">
        <span className={cx('sx-item__icon', s.type === 'night' && 'is-ink')}><Icon size={16} strokeWidth={1.9} aria-hidden="true" /></span>
        <div className="sx-item__main"><b>{DAY_SHORT[dowOfYmd(s.date)]} <span className="sx-mono">{fmtYmdShort(s.date)}</span> · {s.label}</b><span>{s.facilityName}</span></div>
        <div className="sx-item__side">
          {s.status === 'done' ? <Sign tone={s.lateMin ? 'warn' : 'ok'}>{s.lateMin ? `kasnio ${s.lateMin} min` : 'uredno'}</Sign> : s.status === 'active' ? <Sign tone="ok" live>u toku</Sign> : s.status === 'missed' ? <Sign tone="bad">propuštena</Sign> : <span className="sx-field__hint">{dayWord(s.date)}</span>}
        </div>
      </div>
    );
  };
  return (
    <div className="sx-stack">
      {!upcoming.length && <Panel><div className="sx-empty-block"><b>Nema zakazanih smena</b><span>Kad koordinator objavi raspored, smene se pojavljuju ovde i u aplikaciji.</span></div></Panel>}
      {weeks.map((g) => <Panel key={g.w} title={`Nedelja od ${fmtYmdShort(g.w)}`}><div className="sx-list">{g.items.map(row)}</div></Panel>)}
      {past.length > 0 && <Panel title="Prethodnih 30 dana"><div className="sx-list">{past.map(row)}</div></Panel>}
      <p className="sx-field__hint">Vidiš 30 dana unazad i 30 unapred, samo objavljene smene.</p>
    </div>
  );
}
