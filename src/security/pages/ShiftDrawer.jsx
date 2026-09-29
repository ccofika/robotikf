// Detalj smene (fioka sa bilo koje stranice, ?smena=ID): ko, kad, stanje i šta se desilo, redom:
// tok smene na liniji, vremena, zamena radnika, obilazak, zadaci, zapažanja, alarmi, NFC očitavanja.
// Radnje u zaglavlju: objava, ručna prijava/odjava (kad telefon ili tag ne rade), izveštaj, poziv, brisanje.
import React, { useCallback, useEffect, useState } from 'react';
import { Sun, Moon, UserRoundCog, Trash2, LogIn, LogOut, FileText, Send, Phone, Scale, Nfc, Camera } from 'lucide-react';
import { sec, errText, errData, fileUrl } from '../api';
import Sheet, { SheetSection } from '../sx/Sheet';
import Dialog from '../sx/Dialog';
import ShiftLine from '../sx/ShiftLine';
import { Btn, Led, Sign, Skeleton, telOf, withCount, useTick } from '../sx/ui';
import { KV, Note } from '../sx/layout';
import { Field, Select, TimeField, Textarea } from '../sx/forms';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import { hm, fmtYmd, fmtDateTime, DAY_LONG, dowOfYmd } from '../lib/time';
import { roundState, ROUND_TEXT } from './live/model';
import ReportModal from './ReportModal';
import '../sx/shift.css';

const STATUS = { planned: ['info', 'Planirana'], active: ['ok', 'U toku'], done: ['idle', 'Završena'], missed: ['bad', 'Nije došao'], cancelled: ['idle', 'Otkazana'] };
const RESULT = { clock_in: 'Prijava', clock_out: 'Odjava', checkpoint: 'Obilazak', extra: 'Van plana', no_clock_in: 'Pre prijave', shift_done: 'Posle smene', duplicate: 'Ponovljeno', no_shift: 'Bez smene' };
const FLAG = { far: 'GPS van objekta', fast: 'prebrz obilazak', clock: 'sat telefona' };
const ROUND_TONE = { done: 'ok', late: 'warn', miss: 'bad', warn: 'warn', snooze: 'warn', due: 'info', wait: 'idle' };

export default function ShiftDrawer({ id, onClose }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [guards, setGuards] = useState([]);
  const [swapTo, setSwapTo] = useState('');
  const [swapMsg, setSwapMsg] = useState(null);
  const [punch, setPunch] = useState(null);
  const [report, setReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = useTick(30000);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const s = await sec.shift(id);
      setD(s);
      const g = await sec.workers({ role: 'guard' });
      setGuards(g.filter((w) => w._id !== (s.workerId && s.workerId._id)));
    } catch (e) { toast.bad('Smena nije učitana', errText(e)); onClose(); }
  }, [id, toast, onClose]);
  useEffect(() => { if (id) { setD(null); setSwapTo(''); setSwapMsg(null); setPunch(null); load(); } }, [id, load]);

  const changed = () => { window.dispatchEvent(new Event('sec:changed')); load(); };

  const swap = async (force = false, assign = false) => {
    setBusy(true);
    try {
      await sec.updateShift(id, { workerId: swapTo, force, assign });
      toast.ok('Radnik je zamenjen', 'Ako je smena objavljena, oba radnika dobijaju obaveštenje.');
      setSwapMsg(null); setSwapTo(''); changed();
    } catch (e) {
      const x = errData(e);
      if (x.code === 'rest') setSwapMsg({ tone: 'warn', text: x.error, retry: () => swap(true, assign) });
      else if (x.code === 'not_assigned') setSwapMsg({ tone: 'warn', text: `${x.error} Dodeli ga objektu i zameni?`, retry: () => swap(force, true) });
      else setSwapMsg({ tone: 'bad', text: errText(e) });
    } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await confirm({ eyebrow: d.facilityId.name, title: 'Obriši smenu?', text: `${d.workerId ? d.workerId.name : 'Radnik'}, ${d.label}, ${fmtYmd(d.date)}.${d.published ? ' Radnik dobija obaveštenje da smena više ne važi.' : ''}`, tone: 'danger', confirmLabel: 'Obriši smenu' });
    if (!ok) return;
    try { await sec.deleteShift(id); toast.ok('Smena je obrisana'); window.dispatchEvent(new Event('sec:changed')); onClose(); } catch (e) { toast.bad('Smena nije obrisana', errText(e)); }
  };
  const publishOne = async () => {
    try {
      const r = await sec.publishShifts({ facilityId: d.facilityId._id, from: d.date, to: d.date });
      toast.ok('Smena je objavljena', `${withCount(r.published, 'smena', 'smene', 'smena')} za taj dan, radnik je dobio obaveštenje.`);
      changed();
    } catch (e) { toast.bad('Smena nije objavljena', errText(e)); }
  };
  const doPunch = async () => {
    setBusy(true);
    try {
      await sec.manualPunch(id, { type: punch.type, time: punch.time, note: punch.note.trim() });
      toast.ok(punch.type === 'in' ? 'Prijava je upisana' : 'Odjava je upisana', 'Upis je u dosijeu radnika, sa tvojim imenom.');
      setPunch(null); changed();
    } catch (e) { toast.bad('Upis nije uspeo', errText(e)); } finally { setBusy(false); }
  };

  const open = !!id;
  const st = d ? (STATUS[d.status] || STATUS.planned) : null;
  const TypeIcon = d && d.type === 'night' ? Moon : Sun;
  const tolMin = d && d.rules ? d.rules.checkpointTolMin : 5;
  const tel = d && d.workerId && telOf(d.workerId.phone);
  const actions = d ? <>
    {!d.published && d.status === 'planned' && <Btn size="sm" variant="primary" icon={Send} onClick={publishOne} data-testid="publish-one">Objavi smenu</Btn>}
    {!d.clockIn && d.status !== 'done' && d.status !== 'cancelled' && <Btn size="sm" icon={LogIn} onClick={() => setPunch({ type: 'in', time: '', note: '' })} data-testid="manual-in">Ručna prijava</Btn>}
    {d.clockIn && !d.clockOut && <Btn size="sm" icon={LogOut} onClick={() => setPunch({ type: 'out', time: '', note: '' })} data-testid="manual-out">Ručna odjava</Btn>}
    {(d.status === 'done' || d.status === 'active') && <Btn size="sm" icon={FileText} onClick={() => setReport(true)} data-testid="open-report">Izveštaj smene</Btn>}
    {tel && <Btn size="sm" variant="ghost" icon={Phone} href={tel} title={`Pozovi ${d.workerId.name}`}>Pozovi</Btn>}
    {!d.clockIn && <Btn size="sm" variant="ghost" icon={Trash2} onClick={remove} data-testid="delete-shift">Obriši</Btn>}
  </> : null;

  const doneRounds = d ? d.rounds.filter((r) => r.scannedAt).length : 0;
  const standing = d ? (d.facilityId.standingTasks || []) : [];

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        busy={busy}
        testId="shift-drawer"
        eyebrow={d ? `${d.facilityId.name} · ${d.type === 'night' ? 'noćna' : 'dnevna'} smena` : 'Smena'}
        title={d ? (d.workerId ? d.workerId.name : 'Radnik') : 'Učitavanje'}
        meta={d && <>
          <span className="sx-sheet__when"><TypeIcon size={14} strokeWidth={2} aria-hidden="true" />{DAY_LONG[dowOfYmd(d.date)]}, {fmtYmd(d.date)} · <span className="sx-mono">{hm(d.plannedStart)}-{hm(d.plannedEnd)}</span></span>
          <Sign tone={st[0]} live={d.status === 'active'} testId="shift-status">{st[1]}</Sign>
          {!d.published && <span className="sx-tag is-warn">Nacrt, radnik je ne vidi</span>}
          {d.workerId && d.workerId.phone && <a className="sx-mono" href={tel}>{d.workerId.phone}</a>}
        </>}
        actions={actions}
      >
        {!d ? <div className="sx-stack"><Skeleton h={64} /><Skeleton h={160} /><Skeleton h={120} /></div> : (
          <>
            <SheetSection title="Tok smene" testId="shift-line">
              <ShiftLine s={d} now={now} tolMin={tolMin} />
            </SheetSection>

            <SheetSection title="Vremena" testId="shift-times">
              <KV items={[
                { k: 'Plan', v: <span className="sx-mono">{hm(d.plannedStart)} - {hm(d.plannedEnd)}</span> },
                { k: 'Prijava', v: d.clockIn ? <><span className="sx-mono">{hm(d.clockIn.at)}</span>{d.lateMin ? <b className="sx-warn-inline"> · kasnio {d.lateMin} min</b> : ' · na vreme'}<span className="sx-faint"> · {d.clockIn.source === 'manual' ? `ručno (${d.clockIn.byName})` : d.clockIn.offline ? 'bez interneta' : 'NFC'}</span></> : <span className="sx-faint">nije prijavljen</span> },
                { k: 'Odjava', v: d.clockOut ? <><span className="sx-mono">{hm(d.clockOut.at)}</span>{d.clockOut.early ? <b className="sx-warn-inline"> · {d.earlyLeaveMin} min pre kraja</b> : ''}{d.clockOut.source === 'manual' ? <span className="sx-faint"> · ručno ({d.clockOut.byName})</span> : ''}</> : <span className="sx-faint">{d.clockIn ? 'još traje' : 'nema'}</span> },
                { k: 'Smenu primio', v: d.receivedBy && d.receivedBy.name ? <>{d.receivedBy.name} <span className="sx-mono sx-faint">{hm(d.receivedBy.at)}</span></> : null },
                d.replaced && d.replaced.length ? { k: 'Zamene', v: d.replaced.map((r, i) => <div key={i}>{r.fromName} → {r.toName} <span className="sx-faint">({r.byName}, {fmtDateTime(r.at)})</span></div>) } : null
              ]} />
            </SheetSection>

            {d.status === 'planned' && (
              <SheetSection title="Zamena radnika">
                <p className="sx-ssec__lead">Novi radnik preuzima smenu. Ako je smena objavljena, oba radnika dobijaju obaveštenje.</p>
                <div className="sx-inline">
                  <Select value={swapTo} onChange={(e) => { setSwapTo(e.target.value); setSwapMsg(null); }} data-testid="swap-select" aria-label="Novi radnik">
                    <option value="">Izaberi radnika</option>
                    {guards.map((g) => <option key={g._id} value={g._id}>{g.name}{(g.facilityIds || []).some((f) => f._id === d.facilityId._id) ? '' : ' (nije na objektu)'}</option>)}
                  </Select>
                  <Btn icon={UserRoundCog} onClick={() => swap()} disabled={!swapTo || busy} data-testid="swap-go">Zameni radnika</Btn>
                </div>
                {swapMsg && <Note tone={swapMsg.tone} className="sx-mt" actions={swapMsg.retry && <Btn size="sm" onClick={swapMsg.retry} busy={busy} data-testid="swap-force">Nastavi</Btn>}>{swapMsg.text}</Note>}
              </SheetSection>
            )}

            {d.rounds.length > 0 && (
              <SheetSection title={`Obilazak · ${doneRounds} od ${d.rounds.length}`}>
                <ol className="sx-events">
                  {d.rounds.map((r, i) => {
                    const rs = roundState(r, now, tolMin);
                    return (
                      <li key={i} className="sx-event" style={{ '--i': i }}>
                        <time className="sx-mono">{hm(r.dueAt)}</time>
                        <Led tone={ROUND_TONE[rs]} live={rs === 'warn'} />
                        <div className="sx-event__body">
                          <b>{r.tagName}</b>
                          <span>{r.scannedAt ? `očitano u ${hm(r.scannedAt)}${r.lateMin > 0 ? `, ${r.lateMin} min posle plana` : ''}` : r.snoozedUntil && rs === 'snooze' ? `radnik je odložio do ${hm(r.snoozedUntil)}` : ROUND_TEXT[rs]}</span>
                          {(r.snoozes || []).map((z, k) => <span key={k} className="sx-event__quote">Razlog odlaganja: „{z.reason}”</span>)}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </SheetSection>
            )}

            {(d.tasks.length > 0 || standing.length > 0) && (
              <SheetSection title="Zadaci">
                <ol className="sx-events">
                  {standing.map((t, i) => {
                    const x = (d.standingDone || []).find((q) => String(q.taskId) === String(t._id));
                    return (
                      <li key={t._id} className="sx-event" style={{ '--i': i }}>
                        <time className="sx-mono">{x ? hm(x.doneAt) : '--:--'}</time>
                        <Led tone={x ? 'ok' : 'idle'} />
                        <div className="sx-event__body"><b>{t.text}</b><span>stalni zadatak · {x ? 'urađeno' : 'nije potvrđeno'}</span>{x && x.comment && <span className="sx-event__quote">„{x.comment}”</span>}</div>
                      </li>
                    );
                  })}
                  {d.tasks.map((t, i) => (
                    <li key={t._id} className="sx-event" style={{ '--i': standing.length + i }}>
                      <time className="sx-mono">{hm(t.dueAt)}</time>
                      <Led tone={t.status === 'done' ? 'ok' : t.status === 'cancelled' ? 'idle' : new Date(t.dueAt).getTime() < now ? 'warn' : 'info'} />
                      <div className="sx-event__body"><b>{t.text}</b><span>povremeni · {t.status === 'done' ? `urađeno u ${hm(t.doneAt)}` : t.status === 'cancelled' ? 'otkazan' : new Date(t.dueAt).getTime() < now ? 'rok je prošao' : 'čeka'}</span>{t.comment && <span className="sx-event__quote">„{t.comment}”</span>}</div>
                    </li>
                  ))}
                </ol>
              </SheetSection>
            )}

            {d.notes.length > 0 && (
              <SheetSection title="Zapažanja i ovlašćenja">
                <ol className="sx-events">
                  {d.notes.map((n, i) => (
                    <li key={n._id} className="sx-event" style={{ '--i': i }}>
                      <time className="sx-mono">{hm(n.at)}</time>
                      <Led tone={n.kind === 'authority' ? 'warn' : 'info'} />
                      <div className="sx-event__body">
                        {n.kind === 'authority' ? <b><Scale size={13} strokeWidth={2} aria-hidden="true" /> {n.power}{n.subject ? <span className="sx-faint"> · lice: {n.subject}</span> : null}</b> : <b>Zapažanje</b>}
                        <span>{n.text}</span>
                        {n.witnesses && <span className="sx-faint">Svedoci: {n.witnesses}</span>}
                        {n.photos && n.photos.length > 0 && (
                          <div className="sx-thumbs">{n.photos.map((p, k) => <a key={k} href={fileUrl(p.url)} target="_blank" rel="noreferrer" title="Otvori fotografiju"><img src={fileUrl(p.url)} alt={`Fotografija ${k + 1} od ${n.photos.length}`} /></a>)}<Camera size={14} strokeWidth={1.9} aria-hidden="true" /></div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </SheetSection>
            )}

            {d.alarms.length > 0 && (
              <SheetSection title="Alarmi">
                <ol className="sx-events">
                  {d.alarms.map((a, i) => (
                    <li key={a._id} className="sx-event" style={{ '--i': i }}>
                      <time className="sx-mono">{hm(a.firedAt)}</time>
                      <Led tone={a.state === 'resolved' ? 'ok' : a.level === 'critical' ? 'bad' : 'warn'} />
                      <div className="sx-event__body">
                        <b>{a.title}</b>
                        <span>{a.state === 'resolved' ? 'rešen' : a.state === 'ack' ? `preuzeo ${a.ackByName}` : a.state === 'snoozed' ? 'odložen' : 'otvoren'}</span>
                        {a.resolution && <span className="sx-event__quote">„{a.resolution}”</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </SheetSection>
            )}

            <SheetSection title="NFC očitavanja">
              {!d.scans.length ? <p className="sx-ssec__lead">U ovoj smeni još nema očitavanja.</p> : (
                <ol className="sx-events">
                  {d.scans.map((s, i) => (
                    <li key={s._id} className="sx-event" style={{ '--i': i }}>
                      <time className="sx-mono">{hm(s.at)}</time>
                      <Led tone={['clock_in', 'clock_out', 'checkpoint'].includes(s.result) ? 'ok' : 'warn'} />
                      <div className="sx-event__body">
                        <b><Nfc size={13} strokeWidth={2} aria-hidden="true" /> {RESULT[s.result] || s.result}: {s.tagName || <span className="sx-uid">{s.uid}</span>}</b>
                        {(s.lateMin > 0 || s.offline || (s.flags || []).length > 0) && (
                          <span className="sx-event__flags">
                            {s.lateMin > 0 && <span className="sx-tag">{s.lateMin} min posle plana</span>}
                            {s.offline && <span className="sx-tag">bez interneta</span>}
                            {(s.flags || []).map((f) => <span key={f} className="sx-tag is-warn">{FLAG[f] || f}</span>)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </SheetSection>
          </>
        )}
      </Sheet>

      {punch && d && (
        <Dialog onClose={() => setPunch(null)} busy={busy} eyebrow={`${d.workerId ? d.workerId.name : 'Radnik'} · ${d.facilityId.name}`}
          title={punch.type === 'in' ? 'Ručna prijava' : 'Ručna odjava'}
          description="Kad telefon ili tag ne rade. Upis ide u dosije radnika, sa tvojim imenom i razlogom."
          testId="punch-dialog"
          footer={<><Btn variant="ghost" onClick={() => setPunch(null)} disabled={busy}>Odustani</Btn><Btn variant="primary" onClick={doPunch} busy={busy} disabled={punch.note.trim().length < 3} data-testid="punch-save">{punch.type === 'in' ? 'Upiši prijavu' : 'Upiši odjavu'}</Btn></>}>
          <Field label="Vreme" hint="Prazno znači sada. 24 h, može i kucanjem: 1905 je 19:05.">
            <TimeField value={punch.time} onChange={(v) => setPunch({ ...punch, time: v })} testId="punch-time" aria-label="Vreme" />
          </Field>
          <Field label="Razlog">
            <Textarea value={punch.note} placeholder="Npr. telefon radnika se ugasio, prijava potvrđena pozivom u 19:05" onChange={(e) => setPunch({ ...punch, note: e.target.value })} data-testid="punch-note"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && punch.note.trim().length >= 3) doPunch(); }} />
          </Field>
        </Dialog>
      )}
      {report && id && <ReportModal shiftId={id} onClose={() => setReport(false)} />}
    </>
  );
}
