// Tok jedne smene na liniji od početka do kraja (svetla verzija reda sa table obilazaka):
// prijava i odjava su crte, prisustvo je puna linija, kašnjenje isprekidano žuto, dok radnik nije
// prijavljen linija je isprekidano crvena; tačke obilaska imaju ISO oblik stanja, zadaci su romb.
import React from 'react';
import { cx } from './ui';
import { hm } from '../lib/time';
import { roundState, ROUND_TEXT } from '../pages/live/model';

const NODE = { done: 'is-done', late: 'is-late', miss: 'is-miss', warn: 'is-warn', snooze: 'is-snooze', due: 'is-due', wait: 'is-wait' };

export default function ShiftLine({ s, now = Date.now(), tolMin = 5, className }) {
  const start = new Date(s.plannedStart).getTime();
  const end = new Date(s.plannedEnd).getTime();
  const span = Math.max(1, end - start);
  const pos = (t) => `${Math.min(100, Math.max(0, ((new Date(t).getTime() - start) / span) * 100))}%`;
  const inAt = s.clockIn && (s.clockIn.at || s.clockIn);
  const outAt = s.clockOut && (s.clockOut.at || s.clockOut);
  const live = now > start && now < end;
  const dutyEnd = outAt || (s.status === 'active' ? Math.min(now, end) : null);
  const notIn = !inAt && (s.status === 'missed' || (s.status === 'planned' && now > start));
  // Oznake sati na pravim mestima: svaka 3 sata od početka, pa kraj smene. U noći promene sata smena traje
  // 13 h ili 11 h, pa fiksne četvrtine (i "početak + 12 h" na kraju) pokazuju pogrešno vreme.
  const hours = [];
  for (let t = start; t < end - 90 * 60000; t += 3 * 3600000) hours.push(t);
  hours.push(end);
  return (
    <div className={cx('sx-sline', className)} aria-hidden="true">
      <div className="sx-sline__bar">
        <span className="sx-sline__track" />
        {inAt && new Date(inAt).getTime() > start && <span className="sx-sline__late" style={{ left: 0, width: pos(inAt) }} />}
        {inAt && dutyEnd && <span className="sx-sline__duty" style={{ left: pos(inAt), width: `calc(${pos(dutyEnd)} - ${pos(inAt)})` }} />}
        {notIn && <span className="sx-sline__notin" style={{ left: 0, width: s.status === 'missed' ? '100%' : pos(Math.min(now, end)) }} />}
        {inAt && <span className="sx-sline__mark is-in" style={{ left: pos(inAt) }} title={`Prijava ${hm(inAt)}`} />}
        {outAt && <span className="sx-sline__mark is-out" style={{ left: pos(outAt) }} title={`Odjava ${hm(outAt)}`} />}
        {(s.tasks || []).map((t) => <span key={t._id} className={cx('sx-sline__task', t.status === 'done' && 'is-done', t.status === 'cancelled' && 'is-off')} style={{ left: pos(t.dueAt) }} title={`${hm(t.dueAt)} · ${t.text}`} />)}
        {(s.rounds || []).map((r, i) => {
          const st = roundState(r, now, tolMin);
          return <span key={i} className={cx('sx-node', NODE[st])} style={{ left: pos(r.dueAt), '--i': 0, '--n': i }} title={`${hm(r.dueAt)} · ${r.tagName} · ${ROUND_TEXT[st]}`} />;
        })}
        {live && <span className="sx-sline__now" style={{ left: pos(now) }} />}
      </div>
      <div className="sx-sline__hours">
        {hours.map((t) => <span key={t} style={{ left: pos(t) }}>{hm(t)}</span>)}
      </div>
    </div>
  );
}
