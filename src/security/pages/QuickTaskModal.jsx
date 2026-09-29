// Brzi povremeni zadatak (sa bilo koje stranice): objekat, dan, vreme i tekst. Radnik na smeni dobija push.
// Iz reda table obilazaka dolazi sa smenom (shiftId), pa se biraju samo vreme i tekst.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import Dialog from '../sx/Dialog';
import { Btn, cx } from '../sx/ui';
import { useToast } from '../sx/toast';
import { todayYmd, parts, addDays, fmtYmdShort, DAY_SHORT, dowOfYmd } from '../lib/time';

const pad2 = (n) => String(n).padStart(2, '0');
// Za sat vremena, zaokruženo na sledećih pola sata
function defaultTime() {
  const p = parts(new Date(Date.now() + 60 * 60000));
  const total = (Math.ceil((Number(p.hh) * 60 + Number(p.mm)) / 30) * 30) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}
// "930" -> 09:30, "2330" -> 23:30, "18" -> 18:00
function normTime(raw) {
  const d = String(raw || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  let h, m;
  if (d.length <= 2) { h = +d; m = 0; } else if (d.length === 3) { h = +d.slice(0, 1); m = +d.slice(1); } else { h = +d.slice(0, 2); m = +d.slice(2, 4); }
  if (h > 23 || m > 59) return null;
  return `${pad2(h)}:${pad2(m)}`;
}
function inMinutes(min) {
  const p = parts(new Date(Date.now() + min * 60000));
  const total = Math.ceil((Number(p.hh) * 60 + Number(p.mm)) / 5) * 5 % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

function Choice({ value, onChange, options, layoutId, label }) {
  return (
    <div className="sx-choice" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={cx('sx-choice__opt', on && 'is-on')} onClick={() => onChange(o.value)} data-testid={o.testId}>
            {on && <motion.span layoutId={layoutId} className="sx-choice__bg" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
            <span className="sx-choice__label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function QuickTaskModal({ prefill = {}, onClose }) {
  const { facilities } = useSec();
  const toast = useToast();
  const fromShift = !!prefill.shiftId;
  const [facilityId, setFacilityId] = useState(prefill.facilityId || (facilities.length === 1 ? facilities[0]._id : ''));
  const [day, setDay] = useState(0);
  const [time, setTime] = useState(defaultTime());
  const [draft, setDraft] = useState(time);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const today = todayYmd();
  const days = useMemo(() => [0, 1, 2].map((n) => { const ymd = addDays(today, n); return { value: n, label: n === 0 ? 'Danas' : n === 1 ? 'Sutra' : `${DAY_SHORT[dowOfYmd(ymd)]} ${fmtYmdShort(ymd)}` }; }), [today]);
  const badTime = draft !== '' && normTime(draft) === null;
  const ready = text.trim().length >= 3 && !badTime && time && (fromShift || facilityId);

  const setT = (v) => { setTime(v); setDraft(v); };
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const body = fromShift ? { shiftId: prefill.shiftId, time, text: text.trim() } : { facilityId, date: addDays(today, day), time, text: text.trim() };
      const r = await sec.createTask(body);
      toast.ok('Zadatak je poslat', r.notified ? 'Radnik na smeni je dobio obaveštenje na telefonu.' : r.shiftFound ? 'Radnik ga vidi u aplikaciji kad smena bude objavljena.' : 'U to vreme još nema smene. Zadatak čeka smenu koja pokriva to vreme.');
      window.dispatchEvent(new Event('sec:changed'));
      onClose();
    } catch (e) {
      toast.bad('Zadatak nije poslat', errText(e));
    } finally { setBusy(false); }
  };

  return (
    <Dialog
      onClose={onClose}
      busy={busy}
      size="lg"
      eyebrow="Povremeni zadatak"
      title={fromShift ? `Zadatak za ${prefill.workerName || 'radnika na smeni'}` : 'Novi povremeni zadatak'}
      description="Za tačno određeno vreme u smeni. Radnik dobija obaveštenje na telefonu i zatvara zadatak uz obavezan komentar."
      testId="quick-task"
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>Odustani</Btn><Btn variant="primary" icon={Send} onClick={submit} busy={busy} disabled={!ready} data-testid="task-send">Pošalji radniku</Btn></>}
    >
      {fromShift ? (
        <div className="sx-subject" data-tone="info">
          <b>{prefill.facilityName}</b>
          <span>{prefill.label}{prefill.workerName ? ` · ${prefill.workerName}` : ''}</span>
        </div>
      ) : (
        <div className="sx-field">
          <span className="sx-field__label">Objekat</span>
          {facilities.length <= 8 ? (
            <Choice label="Objekat" value={facilityId} onChange={setFacilityId} layoutId="sx-task-fac" options={facilities.map((x) => ({ value: x._id, label: x.name }))} />
          ) : (
            <select className="sx-input" value={facilityId} onChange={(e) => setFacilityId(e.target.value)} data-testid="task-facility">
              <option value="">Izaberi objekat</option>
              {facilities.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
            </select>
          )}
        </div>
      )}
      <div className="sx-task-when">
        {!fromShift && (
          <div className="sx-field">
            <span className="sx-field__label">Dan</span>
            <Choice label="Dan" value={day} onChange={setDay} layoutId="sx-task-day" options={days.map((d, i) => ({ ...d, testId: `task-day-${i}` }))} />
          </div>
        )}
        <div className="sx-field">
          <label className="sx-field__label" htmlFor="sx-task-time">Vreme</label>
          <div className="sx-task-time">
            <input id="sx-task-time" className={cx('sx-input sx-input--time', badTime && 'is-bad')} value={draft} inputMode="numeric" maxLength={5} autoComplete="off" placeholder="00:00" data-testid="task-time"
              onChange={(e) => { let v = e.target.value.replace(/[^0-9:]/g, ''); if (/^\d{4}$/.test(v)) v = `${v.slice(0, 2)}:${v.slice(2)}`; setDraft(v); const n = normTime(v); if (n && /^\d{2}:\d{2}$/.test(v)) setTime(n); }}
              onBlur={() => { const n = normTime(draft); if (n) setT(n); else if (n === '') setDraft(time); }} />
            <div className="sx-suggest">
              {[30, 60, 120].map((m) => <button type="button" key={m} onClick={() => setT(inMinutes(m))}>{m < 60 ? `za ${m} min` : `za ${m / 60} h`}</button>)}
            </div>
          </div>
          <span className="sx-field__hint">24 h, može i kucanjem: 2330 je 23:30.</span>
        </div>
      </div>
      <label className="sx-field">
        <span className="sx-field__label">Šta radnik treba da uradi</span>
        <textarea className="sx-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Npr. u 23:30 proveri da li je sala na 1. spratu zaključana" data-testid="task-text"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }} />
      </label>
    </Dialog>
  );
}
