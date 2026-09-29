// Desna kolona stranice Uživo: sve što traži čoveka, po hitnosti.
// 1) Za reakciju (alarmi, grupisani po događaju), 2) Zadaci u smeni, 3) Treba srediti.
import React, { useState } from 'react';
import { Phone, ArrowUpRight, Check, Nfc, CalendarClock, FileBadge, UserRound, ClipboardList } from 'lucide-react';
import { cx, Btn, Led, Count, Ago, Countdown, useTick, agoText } from '../../sx/ui';
import Dialog from '../../sx/Dialog';
import { hm, fmtDate } from '../../lib/time';
import { KIND, recipientsText } from './model';

const telOf = (phone) => (phone ? `tel:${String(phone).replace(/[^0-9+]/g, '')}` : undefined);

export function AlarmQueue({ groups, onAck, onResolve, onShift, busyKey }) {
  const open = groups.filter((g) => !g.acked).length;
  return (
    <section className="sx-card sx-queue" id="sx-alarms" aria-labelledby="sx-alarms-t" data-testid="panel-alarms">
      <header className="sx-card__head">
        <div>
          <h2 className="sx-card__title" id="sx-alarms-t">Za reakciju <Count>{groups.length}</Count></h2>
          <p className="sx-card__sub">{groups.length ? (open ? 'Najhitnije je prvo. Preuzmi alarm da drugi vide da neko reaguje.' : 'Svi alarmi su preuzeti. Reši ih kad se situacija razjasni.') : 'Alarmi stižu ovde i na telefon koordinatora.'}</p>
        </div>
      </header>
      {!groups.length ? (
        <div className="sx-allclear">
          <Led tone="ok" lg />
          <div><b>Nema otvorenih alarma</b><span>Kad radnik kasni na smenu ili propusti obilazak, alarm se pojavi ovde.</span></div>
        </div>
      ) : (
        <ol className="sx-queue__list">
          {groups.map((g, i) => <AlarmCard key={g.key} g={g} i={i} onAck={onAck} onResolve={onResolve} onShift={onShift} busy={busyKey === g.key} />)}
        </ol>
      )}
    </section>
  );
}

function AlarmCard({ g, i, onAck, onResolve, onShift, busy }) {
  const now = useTick(15000);
  const a = g.lead;
  const kind = KIND[a.kind] || { label: a.title };
  const tel = telOf(a.workerPhone);
  const level = g.acked ? 'Preuzet' : g.snoozed ? 'Odloženo' : g.tone === 'bad' ? 'Kritično' : 'Upozorenje';
  return (
    <li className={cx('sx-alarm', `is-${g.tone}`, g.acked && 'is-acked', g.snoozed && 'is-snoozed')} style={{ '--i': i }} data-testid="live-alarm">
      <div className="sx-alarm__top">
        <span className="sx-alarm__kind"><Led tone={g.acked ? 'info' : g.tone} live={!g.acked && !g.snoozed} />{level} · {kind.label}</span>
        <time className="sx-alarm__age" dateTime={new Date(g.since).toISOString()} title={`Prvi alarm u ${hm(g.since)}`}>{agoText(g.since, now)}</time>
      </div>
      <h3 className="sx-alarm__title">{a.facilityName}</h3>
      <p className="sx-alarm__what">
        {a.tagName ? <><b>{a.tagName}</b>{g.round ? <> · plan <span className="sx-mono">{hm(g.round.dueAt)}</span></> : null}</> : <b>{a.title}</b>}
      </p>
      {a.workerName && <p className="sx-alarm__who">{a.workerName}{a.workerPhone && <> · <span className="sx-mono">{a.workerPhone}</span></>}</p>}
      <ol className="sx-alarm__chain" aria-label="Kome je alarm poslat">
        {g.list.map((x) => (
          <li key={x._id}><span className="sx-mono">{hm(x.firedAt)}</span> {x.kind === 'checkpoint2' || x.kind === 'master' ? 'drugi alarm' : 'alarm'} {recipientsText(x.recipients) || 'poslat'}</li>
        ))}
      </ol>
      {g.snooze && <p className="sx-alarm__note">Radnik je odložio do <span className="sx-mono">{hm(g.snooze.until)}</span>: „{g.snooze.reason}”</p>}
      {g.acked && g.ackBy && <p className="sx-alarm__note is-ack">Preuzeo {g.ackBy.ackByName} u <span className="sx-mono">{hm(g.ackBy.ackAt)}</span></p>}
      <div className="sx-alarm__actions">
        {!g.acked && <Btn size="sm" variant="primary" onClick={() => onAck(g)} busy={busy} data-testid="alarm-ack">Preuzmi</Btn>}
        <Btn size="sm" onClick={() => onResolve(g)} data-testid="alarm-resolve">Reši</Btn>
        {tel && <Btn size="sm" variant="ghost" icon={Phone} href={tel} title={`Pozovi ${a.workerName}: ${a.workerPhone}`}>Pozovi</Btn>}
        {a.shiftId && <Btn size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => onShift(a.shiftId)} className="sx-alarm__shift" title="Detalji smene" aria-label="Detalji smene" />}
      </div>
    </li>
  );
}

const SUGGEST = [
  'Radnik je bio na intervenciji u objektu.',
  'Tag je oštećen, radnik je obišao tačku.',
  'Razgovarao sam sa radnikom, očitaće odmah.',
  'Lažni alarm, sve je u redu.'
];

export function ResolveDialog({ g, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const a = g.lead;
  const kind = KIND[a.kind] || { label: a.title };
  const submit = async () => {
    setBusy(true);
    try { await onDone(g, note.trim()); onClose(); } finally { setBusy(false); }
  };
  return (
    <Dialog
      onClose={onClose}
      busy={busy}
      eyebrow={`${kind.label} · ${a.facilityName}`}
      title="Reši alarm"
      description="Napiši kako je rešeno. Upis ostaje u istoriji alarma i u dosijeu smene."
      testId="resolve-dialog"
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>Odustani</Btn><Btn variant="primary" onClick={submit} busy={busy} disabled={note.trim().length < 3} data-testid="confirm-ok">Reši alarm</Btn></>}
    >
      <div className="sx-subject" data-tone={g.tone}>
        <b>{a.tagName ? `${a.tagName}${g.round ? ` · plan ${hm(g.round.dueAt)}` : ''}` : a.title}</b>
        <span>{a.workerName}{a.workerName ? ' · ' : ''}{a.message}</span>
      </div>
      <label className="sx-field" style={{ marginTop: 16 }}>
        <span className="sx-field__label">Kako je rešeno</span>
        <textarea className="sx-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Npr. radnik je bio na intervenciji, prijavio se u 19:40" data-testid="confirm-input"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && note.trim().length >= 3) submit(); }} />
      </label>
      <div className="sx-suggest" aria-label="Brzi odgovori">
        {SUGGEST.map((s) => <button type="button" key={s} onClick={() => setNote(s)}>{s}</button>)}
      </div>
    </Dialog>
  );
}

export function TaskList({ tasks, onNew }) {
  const now = useTick(30000);
  const { open, done } = tasks;
  return (
    <section className="sx-card sx-tasks" aria-labelledby="sx-tasks-t" data-testid="panel-tasks">
      <header className="sx-card__head">
        <div>
          <h2 className="sx-card__title" id="sx-tasks-t">Zadaci u smeni <Count>{open.length}</Count></h2>
          <p className="sx-card__sub">Povremeni zadaci. Radnik ih zatvara uz komentar.</p>
        </div>
        <Btn size="sm" variant="ghost" icon={ClipboardList} onClick={onNew}>Novi</Btn>
      </header>
      {!open.length && !done.length && <div className="sx-empty sx-card__pad"><span>Nema zadataka u ovoj smeni.</span></div>}
      <ol className="sx-tasks__list">
        {open.map((t) => {
          const late = new Date(t.dueAt).getTime() < now;
          return (
            <li key={t._id} className={cx('sx-task', late && 'is-late')}>
              <time className="sx-task__time sx-mono">{hm(t.dueAt)}</time>
              <div className="sx-task__body">
                <b>{t.facilityName}</b>
                <span>{t.text}</span>
                <span className="sx-task__meta">{t.workerName}{t.workerName ? ' · ' : ''}<Countdown at={t.dueAt} lateWord="rok je prošao pre" /></span>
              </div>
            </li>
          );
        })}
        {done.slice(0, 3).map((t) => (
          <li key={t._id} className="sx-task is-done">
            <time className="sx-task__time sx-mono">{hm(t.doneAt || t.dueAt)}</time>
            <div className="sx-task__body">
              <b><Check size={13} strokeWidth={2.4} aria-hidden="true" /> {t.facilityName}</b>
              <span>{t.text}</span>
              <span className="sx-task__meta">{t.doneByName}: {agoText(t.doneAt, now)}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TodoList({ todo, onUnknown, onDrafts, onWorker }) {
  const [all, setAll] = useState(false);
  const unknown = todo.unknownTags || [];
  const drafts = todo.drafts || [];
  const expiring = todo.expiring || [];
  // redosled po težini: nepoznat tag (radnik ga stalno skenira), neobjavljena smena (alarmi ne rade), pa rokovi
  const items = [
    ...unknown.map((u) => ({ key: `u-${u.uid}`, tone: 'warn', icon: Nfc, title: `Nepoznat tag · ${u.facilityName || 'bez objekta'}`, line: <span className="sx-mono">{u.uid}</span>, meta: <>{u.workerName}, <Ago at={u.at} />{u.count > 1 ? `, ${u.count} puta` : ''}</>, action: <Btn size="sm" onClick={onUnknown}>Registruj</Btn> })),
    ...drafts.map((d) => ({ key: `d-${d._id}`, tone: 'warn', icon: CalendarClock, title: `Smena nije objavljena · ${d.facilityName}`, line: <>{d.label} u <span className="sx-mono">{hm(d.plannedStart)}</span>, {d.workerName}</>, meta: 'Radnik je ne vidi i alarmi za nju ne rade.', action: <Btn size="sm" onClick={() => onDrafts(d)}>Raspored</Btn> })),
    ...expiring.map((x) => ({ key: `e-${x.workerId}-${x.kind}-${x.label}`, tone: x.daysLeft <= 14 ? 'warn' : 'idle', icon: x.kind === 'contract' ? UserRound : FileBadge, title: `${x.kind === 'contract' ? 'Ugovor ističe' : 'Licenca ističe'} · ${x.workerName}`, line: <>{x.kind === 'contract' ? 'Ugovor o radu' : x.label}, <span className="sx-mono">{fmtDate(x.until)}</span></>, meta: `za ${x.daysLeft} ${x.daysLeft === 1 ? 'dan' : 'dana'}`, action: <Btn size="sm" variant="ghost" onClick={() => onWorker(x.workerId)}>Radnik</Btn> }))
  ];
  const shown = all ? items : items.slice(0, 5);
  return (
    <section className="sx-card sx-todo" id="sx-todo" aria-labelledby="sx-todo-t" data-testid="panel-todo">
      <header className="sx-card__head">
        <div>
          <h2 className="sx-card__title" id="sx-todo-t">Treba srediti <Count>{items.length}</Count></h2>
          <p className="sx-card__sub">Nije hitno, ali utiče na rad sledećih smena.</p>
        </div>
      </header>
      {!items.length && <div className="sx-empty sx-card__pad"><span>Sve je sređeno.</span></div>}
      <ul className="sx-todo__list">
        {shown.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.key} className="sx-todo__item" data-tone={it.tone}>
              <span className="sx-todo__icon"><Icon size={16} strokeWidth={1.9} /></span>
              <div className="sx-todo__body">
                <b>{it.title}</b>
                <span>{it.line}</span>
                <span className="sx-todo__meta">{it.meta}</span>
              </div>
              {it.action}
            </li>
          );
        })}
      </ul>
      {items.length > 5 && (
        <div className="sx-todo__more">
          <Btn size="sm" variant="ghost" onClick={() => setAll((v) => !v)}>{all ? 'Prikaži manje' : `Prikaži još ${items.length - 5}`}</Btn>
        </div>
      )}
    </section>
  );
}
