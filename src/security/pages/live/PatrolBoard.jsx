// Tabla obilazaka (potpisni element stranice Uživo): svaki objekat je red, vreme smene je osa.
// Linija je prisustvo radnika (od prijave do sada), tačke su kontrolne tačke po planu:
// pun "otisak" = očitano, prsten = čeka, plava = sledeća, žuta = kasni, crvena prekida liniju = propušteno.
// Svi redovi imaju isti raspored: levo objekat, radnik i sledeća smena; u sredini obilazak; desno šta sledi.
import React from 'react';
import { Phone, ArrowUpRight, ClipboardPlus, Sun, Moon, ArrowRight } from 'lucide-react';
import { cx, Led, Countdown } from '../../sx/ui';
import { hm } from '../../lib/time';
import { FACILITY_STATE, roundState, roundTitle, shiftNext, sortFacilities } from './model';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function useAxis(win) {
  const t0 = new Date(win.start).getTime();
  const t1 = new Date(win.end).getTime();
  const pos = (t) => clamp(((new Date(t).getTime() - t0) / (t1 - t0)) * 100, 0, 100);
  const hours = [];
  for (let t = t0, k = 0; t <= t1 + 1; t += 3600000, k++) hours.push({ t, k, x: ((t - t0) / (t1 - t0)) * 100, label: hm(new Date(t)).slice(0, 2) });
  return { t0, t1, pos, hours };
}

const telOf = (phone) => (phone ? `tel:${String(phone).replace(/[^0-9+]/g, '')}` : undefined);

export default function PatrolBoard({ data, now, onShift, onTask, onFacility }) {
  const win = data.window;
  const axis = useAxis(win);
  const facilities = sortFacilities(data.facilities || []);
  const nowX = axis.pos(now);
  const day = win.type === 'day';
  let rowIndex = 0;

  return (
    <section className="sx-board" aria-label="Tabla obilazaka" data-testid="patrol-board" style={{ '--now': `${nowX}%` }}>
      <header className="sx-board__head">
        <div className="sx-board__titles">
          <span className="sx-eyebrow sx-board__eyebrow">Tabla obilazaka</span>
          <h2 className="sx-board__title">
            {day ? <Sun size={17} strokeWidth={1.9} aria-hidden="true" /> : <Moon size={17} strokeWidth={1.9} aria-hidden="true" />}
            {day ? 'Dnevna smena' : 'Noćna smena'}
            <span className="sx-board__range">{hm(win.start)} - {hm(win.end)}</span>
          </h2>
        </div>
        <ul className="sx-board__legend" aria-label="Legenda">
          <li><i className="sx-node is-done" />očitano</li>
          <li><i className="sx-node is-late" />kasnilo</li>
          <li><i className="sx-node is-next" />sledeće</li>
          <li><i className="sx-node is-wait" />čeka</li>
          <li><i className="sx-node is-miss" />propušteno</li>
          <li><i className="sx-taskmark" />zadatak</li>
        </ul>
      </header>

      <div className="sx-board__axis" aria-hidden="true">
        <span className="sx-board__axis-label">Objekat, radnik, sledeća smena</span>
        <div className="sx-board__hours">
          {axis.hours.map((h) => (
            <span key={h.t} className={cx('sx-board__hour', h.k % 2 === 1 && 'is-odd')} style={{ left: `${h.x}%` }}>{h.label}</span>
          ))}
          <span className="sx-board__nowtag" style={{ left: `${nowX}%` }}>{hm(now)}</span>
        </div>
        <span className="sx-board__axis-label">Šta sledi</span>
      </div>

      <div className="sx-board__body">
        <div className="sx-board__nowcol" aria-hidden="true">
          {axis.hours.map((h) => <span key={h.t} className="sx-board__gridline" style={{ left: `${h.x}%` }} />)}
          <span className="sx-board__now" style={{ left: `${nowX}%` }} />
        </div>
        {!facilities.length && (
          <div className="sx-board__empty">Još nema objekata. Dodaj objekat, NFC tagove i radnike, pa napravi raspored.</div>
        )}
        {facilities.map((f) => {
          if (!f.shifts.length) {
            const i = rowIndex++;
            return <IdleRow key={f._id} f={f} i={i} axis={axis} nowX={nowX} onFacility={onFacility} />;
          }
          return f.shifts.map((s, k) => {
            const i = rowIndex++;
            return <ShiftRow key={s._id} f={f} s={s} first={k === 0} i={i} axis={axis} now={now} nowX={nowX} onShift={onShift} onTask={onTask} onFacility={onFacility} />;
          });
        })}
      </div>
    </section>
  );
}

function NextShiftLine({ f }) {
  const n = f.nextShift;
  if (!n) return <span className="sx-row__handover is-none">Sledeća smena nije zakazana</span>;
  return (
    <span className={cx('sx-row__handover', !n.published && 'is-draft')} title={n.published ? `Sledeća smena: ${n.label}, ${n.workerName}` : 'Smena nije objavljena: radnik je ne vidi i alarmi za nju ne rade'}>
      <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
      <span className="sx-mono">{hm(n.plannedStart)}</span> {n.workerName || 'bez radnika'}{!n.published && <em>nije objavljena</em>}
    </span>
  );
}

function FacilityName({ f, tone, onFacility }) {
  const st = FACILITY_STATE[f.state] || FACILITY_STATE.idle;
  return (
    <div className="sx-row__fac">
      <Led tone={tone || st.tone} live={st.tone === 'bad' || st.tone === 'warn'} title={st.text} />
      <button type="button" className="sx-row__facname" onClick={(e) => { e.stopPropagation(); onFacility(f); }} title={`${f.name}: otvori objekat`}>{f.name}</button>
    </div>
  );
}

function ShiftRow({ f, s, first, i, axis, now, nowX, onShift, onTask, onFacility }) {
  const { pos } = axis;
  const next = shiftNext(s, now);
  const inX = s.clockIn ? pos(s.clockIn) : null;
  const startX = pos(s.plannedStart);
  const endX = pos(s.plannedEnd);
  const lateStart = s.clockIn && new Date(s.clockIn).getTime() - new Date(s.plannedStart).getTime() > 60000;
  const notIn = s.status === 'planned' && new Date(s.plannedStart).getTime() <= now;
  const rounds = s.rounds || [];
  const states = rounds.map((r) => roundState(r, now, s.tolMin));
  const nextIdx = states.findIndex((st) => st === 'due' || st === 'wait');
  const done = states.filter((st) => st === 'done' || st === 'late').length;
  const tone = s.state === 'bad' ? 'bad' : s.state === 'warn' ? 'warn' : s.state === 'ok' ? 'ok' : s.state === 'waiting' ? 'info' : 'idle';
  const tel = telOf(s.worker && s.worker.phone);

  return (
    <div className={cx('sx-row', `is-${s.state}`)} style={{ '--i': i }} data-testid="live-shift" onClick={() => onShift(s._id)}>
      <div className="sx-row__who">
        {first ? <FacilityName f={f} tone={tone} onFacility={onFacility} /> : <div className="sx-row__fac is-second"><span className="sx-row__second">{f.name}, drugi radnik</span></div>}
        <div className="sx-row__guard">
          <span className="sx-row__name">{s.worker ? s.worker.name : 'Nepoznat radnik'}</span>
          {s.clockIn && <span className="sx-row__since">od <span className="sx-mono">{hm(s.clockIn)}</span>{s.lateMin > 0 && <em>, kasnio {s.lateMin} min</em>}</span>}
          {notIn && <span className="sx-row__since is-bad">nije prijavljen</span>}
        </div>
        {first && <NextShiftLine f={f} />}
        <div className="sx-row__actions" onClick={(e) => e.stopPropagation()}>
          {tel && <a className="sx-iconbtn" href={tel} title={`Pozovi ${s.worker.name}: ${s.worker.phone}`} aria-label={`Pozovi ${s.worker.name}`}><Phone size={15} strokeWidth={1.9} /><span className="sx-iconbtn__label">Pozovi</span></a>}
          <button type="button" className="sx-iconbtn" onClick={() => onTask(f, s)} title="Novi zadatak za ovu smenu" aria-label="Novi zadatak za ovu smenu"><ClipboardPlus size={15} strokeWidth={1.9} /><span className="sx-iconbtn__label">Zadatak</span></button>
          <button type="button" className="sx-iconbtn is-extra" onClick={() => onShift(s._id)} title="Detalji smene" aria-label="Detalji smene" data-testid="open-shift"><ArrowUpRight size={15} strokeWidth={1.9} /><span className="sx-iconbtn__label">Smena</span></button>
        </div>
      </div>

      <div className="sx-row__strip">
        <div className="sx-strip" aria-label={`Obilazak: očitano ${done} od ${rounds.length}`}>
          <span className="sx-strip__track" />
          <span className="sx-strip__past" style={{ width: `${nowX}%` }} />
          {lateStart && <span className="sx-strip__gap" style={{ left: `${startX}%`, width: `${Math.max(0.4, inX - startX)}%` }} title={`Prijava ${s.lateMin} min posle početka smene`} />}
          {inX != null && s.status === 'active' && <span className="sx-strip__duty" style={{ left: `${inX}%`, width: `${Math.max(0, nowX - inX)}%` }}><i className="sx-strip__head" /></span>}
          {notIn && <span className="sx-strip__notin" style={{ left: `${startX}%`, width: `${Math.max(0.4, nowX - startX)}%` }} title="Radnik se nije prijavio na smenu" />}
          {inX != null && <span className="sx-strip__in" style={{ left: `${inX}%` }} title={`Prijava ${hm(s.clockIn)}`} />}
          <span className="sx-strip__end" style={{ left: `${endX}%` }} />
          {rounds.map((r, k) => {
            const st = states[k];
            const cls = k === nextIdx && st === 'wait' ? 'is-next' : `is-${st}`;
            return <span key={k} className={cx('sx-node', cls)} style={{ left: `${pos(r.dueAt)}%`, '--n': k }} title={roundTitle(r, st)} />;
          })}
          {(s.tasks || []).map((t) => {
            const late = t.status === 'open' && new Date(t.dueAt).getTime() < now;
            return <span key={t._id} className={cx('sx-taskmark', t.status === 'done' && 'is-done', late && 'is-late')} style={{ left: `${pos(t.dueAt)}%` }} title={`Zadatak u ${hm(t.dueAt)}: ${t.text}${t.status === 'done' ? ` (urađen ${hm(t.doneAt)})` : ''}`} />;
          })}
          <span className="sx-strip__nowmark" style={{ left: `${nowX}%` }} />
        </div>
        <div className="sx-strip__ends" aria-hidden="true"><span>{hm(axis.t0)}</span><span>{hm(axis.t1)}</span></div>
      </div>

      <div className={cx('sx-row__next', `is-${next.tone}`)}>
        <b className="sx-row__nexttitle">{next.title}</b>
        <span className="sx-row__nextnote">
          {(next.kind === 'next' || next.kind === 'warn' || next.kind === 'notin' || next.kind === 'starts') && next.at ? <><Countdown at={next.at} /> · </> : null}
          {next.note}
        </span>
        <span className="sx-row__rounds sx-mono">{done}/{rounds.length} obilazaka</span>
      </div>
    </div>
  );
}

function IdleRow({ f, i, axis, nowX, onFacility }) {
  const n = f.nextShift;
  const nx = n && new Date(n.plannedStart).getTime() <= axis.t1 ? axis.pos(n.plannedStart) : null;
  return (
    <div className="sx-row is-idle" style={{ '--i': i }} data-testid="live-facility-idle" onClick={() => onFacility(f)}>
      <div className="sx-row__who">
        <FacilityName f={f} tone="idle" onFacility={onFacility} />
        <div className="sx-row__guard"><span className="sx-row__name is-muted">Nema smene sada</span></div>
        <NextShiftLine f={f} />
        <div className="sx-row__actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="sx-iconbtn is-extra" onClick={() => onFacility(f)} title="Otvori objekat" aria-label="Otvori objekat"><ArrowUpRight size={15} strokeWidth={1.9} /><span className="sx-iconbtn__label">Objekat</span></button>
        </div>
      </div>
      <div className="sx-row__strip">
        <div className="sx-strip is-idle">
          <span className="sx-strip__track" />
          <span className="sx-strip__past is-idle" style={{ width: `${nowX}%` }} />
          {nx != null && nx <= 100 && <span className={cx('sx-strip__start', !n.published && 'is-draft')} style={{ left: `${nx}%` }} title={`Smena počinje u ${hm(n.plannedStart)}`} />}
          <span className="sx-strip__nowmark" style={{ left: `${nowX}%` }} />
        </div>
        <div className="sx-strip__ends" aria-hidden="true"><span>{hm(axis.t0)}</span><span>{hm(axis.t1)}</span></div>
      </div>
      <div className={cx('sx-row__next', n && !n.published ? 'is-warn' : 'is-idle')}>
        <b className="sx-row__nexttitle">{n ? `Smena u ${hm(n.plannedStart)}` : 'Nema zakazanih smena'}</b>
        <span className="sx-row__nextnote">{n ? (n.published ? `${n.workerName}, objavljena` : `${n.workerName}, nije objavljena`) : 'dodaj smenu u rasporedu'}</span>
        <span className="sx-row__rounds sx-mono">{f.type || 'objekat'}</span>
      </div>
    </div>
  );
}
