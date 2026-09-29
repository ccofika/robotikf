// Uživo: izvedeni podaci za prikaz (bez React-a). Sve oko "šta je sada važno" je ovde,
// da bi stranica, tabla i red za reakciju govorili isto.
import { hm } from '../../lib/time';

export const KIND = {
  late: { label: 'Nije prijavljen', head: 'radnik nije prijavljen' },
  master: { label: 'MASTER ALARM', head: 'radnik nije došao na smenu' },
  checkpoint1: { label: 'Obilazak kasni', head: 'obilazak kasni' },
  checkpoint2: { label: 'Propušten obilazak', head: 'propušten obilazak' },
  no_clock_out: { label: 'Nema odjave', head: 'radnik se nije odjavio' },
  contract: { label: 'Ugovor ističe', head: 'ugovor ističe' },
  license: { label: 'Licenca ističe', head: 'licenca ističe' }
};

const ROLE_WORD = { guard: 'radniku', coordinator: 'koordinatoru', admin: 'adminu', superadmin: 'adminu', supervisor: 'adminu' };
const ROLE_NOM = { coordinator: 'koordinator', admin: 'admin', superadmin: 'admin', supervisor: 'admin' };
// "radniku, adminu, koordinatoru" (kome je alarm otišao)
export function recipientsText(recipients = []) {
  const words = [...new Set(recipients.map((r) => ROLE_WORD[r.role] || '').filter(Boolean))];
  return words.join(', ');
}
// "admin i koordinator" (ko je obavešten, bez radnika)
export function notifiedText(recipients = []) {
  const words = [...new Set(recipients.map((r) => ROLE_NOM[r.role] || '').filter(Boolean))];
  if (words.length <= 1) return words[0] || '';
  return `${words.slice(0, -1).join(', ')} i ${words[words.length - 1]}`;
}

const levelRank = { critical: 2, warn: 1, info: 0 };
const stateRank = { open: 3, escalated: 2, snoozed: 1, ack: 0, resolved: -1 };

// Alarmi iste tačke obilaska (prvi radniku, drugi adminu) ili iste prijave (kasni, MASTER) su jedan događaj
export function groupAlarms(alarms = []) {
  const map = new Map();
  for (const a of alarms) {
    if (a.kind === 'contract' || a.kind === 'license') continue;
    const fam = a.kind === 'checkpoint1' || a.kind === 'checkpoint2' ? `cp${a.roundIndex}` : a.kind === 'late' || a.kind === 'master' ? 'in' : a.kind;
    const key = a.shiftId ? `${a.shiftId}|${fam}` : String(a._id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(a);
  }
  const groups = [...map.entries()].map(([key, list]) => {
    list.sort((x, y) => new Date(x.firedAt) - new Date(y.firedAt));
    const lead = [...list].sort((x, y) => (levelRank[y.level] - levelRank[x.level]) || (stateRank[y.state] - stateRank[x.state]) || (new Date(y.firedAt) - new Date(x.firedAt)))[0];
    const acked = list.every((a) => a.state === 'ack');
    const snoozed = !acked && lead.state === 'snoozed';
    const tone = lead.level === 'critical' ? 'bad' : 'warn';
    const cls = acked ? 3 : snoozed ? 2 : tone === 'bad' ? 0 : 1;
    const snooze = (lead.snoozes && lead.snoozes.length) ? lead.snoozes[lead.snoozes.length - 1] : null;
    const ackBy = list.find((a) => a.state === 'ack' && a.ackByName);
    return { key, list, lead, tone, acked, snoozed, cls, since: list[0].firedAt, snooze, ackBy };
  });
  groups.sort((a, b) => a.cls - b.cls || new Date(a.since) - new Date(b.since));
  return groups;
}

// Stanje svake tačke obilaska u smeni
export function roundState(r, now, tolMin = 5) {
  if (r.scannedAt) return (r.lateMin || 0) > tolMin ? 'late' : 'done';
  if (r.alarm2At) return 'miss';
  if (r.alarm1At) return r.snoozedUntil && new Date(r.snoozedUntil).getTime() > now ? 'snooze' : 'warn';
  if (new Date(r.dueAt).getTime() <= now) return 'due';
  return 'wait';
}

export const ROUND_TEXT = {
  done: 'očitano', late: 'očitano sa kašnjenjem', miss: 'nije očitano, obavešten admin',
  warn: 'kasni, alarm radniku', snooze: 'kasni, radnik je odložio alarm', due: 'sada, u toleranciji', wait: 'čeka'
};

// Opis tačke za oblačić: "Skladište B · plan 15:46 · nije očitano, obavešten admin"
export function roundTitle(r, state) {
  const bits = [r.tagName, `plan ${hm(r.dueAt)}`];
  if (r.scannedAt) bits.push(`očitano ${hm(r.scannedAt)}${r.lateMin ? ` (+${r.lateMin} min)` : ''}`);
  else bits.push(ROUND_TEXT[state]);
  if (state === 'snooze' && r.snoozedUntil) bits.push(`odloženo do ${hm(r.snoozedUntil)}`);
  return bits.join(' · ');
}

// Šta je sledeće u smeni (desna kolona table): problem ima prednost nad sledećom tačkom
export function shiftNext(s, now) {
  const rounds = s.rounds || [];
  const states = rounds.map((r) => roundState(r, now, s.tolMin));
  const pick = (st) => { const i = states.indexOf(st); return i === -1 ? null : { r: rounds[i], i }; };
  const miss = pick('miss');
  if (miss) return { tone: 'bad', kind: 'miss', title: miss.r.tagName, note: `propušten, plan ${hm(miss.r.dueAt)}`, at: miss.r.alarm2At };
  const warn = pick('warn');
  if (warn) {
    const second = new Date(new Date(warn.r.alarm1At).getTime() + (s.snoozeMin || 10) * 60000);
    return { tone: 'warn', kind: 'warn', title: warn.r.tagName, note: `plan ${hm(warn.r.dueAt)}, drugi alarm u ${hm(second)}`, at: warn.r.dueAt, late: true };
  }
  const snooze = pick('snooze');
  if (snooze) return { tone: 'warn', kind: 'snooze', title: snooze.r.tagName, note: `odloženo do ${hm(snooze.r.snoozedUntil)}`, at: snooze.r.snoozedUntil };
  if (s.status === 'missed') return { tone: 'bad', kind: 'missed', title: 'Nije došao', note: 'smena je propuštena' };
  if (s.status === 'planned' && new Date(s.plannedStart).getTime() <= now) return { tone: s.alarm && s.alarm.level === 'critical' ? 'bad' : 'warn', kind: 'notin', title: 'Nije prijavljen', note: `smena od ${hm(s.plannedStart)}`, at: s.plannedStart, late: true };
  if (s.status === 'planned') return { tone: 'info', kind: 'starts', title: 'Počinje smena', note: `u ${hm(s.plannedStart)}`, at: s.plannedStart };
  const due = pick('due');
  if (due) return { tone: 'info', kind: 'due', title: due.r.tagName, note: `sada, plan ${hm(due.r.dueAt)}`, at: due.r.dueAt, now: true };
  const wait = pick('wait');
  if (wait) return { tone: 'idle', kind: 'next', title: wait.r.tagName, note: `plan ${hm(wait.r.dueAt)}`, at: wait.r.dueAt };
  if (rounds.length) return { tone: 'ok', kind: 'done', title: 'Obilazak završen', note: `kraj smene u ${hm(s.plannedEnd)}` };
  return { tone: 'idle', kind: 'none', title: 'Bez plana obilaska', note: `kraj smene u ${hm(s.plannedEnd)}` };
}

// Naslov strane: jedna rečenica koja odgovara na "da li je nešto pogrešno i šta da radim"
export function headline(data, groups, now) {
  const k = data.kpis || {};
  const top = groups.find((g) => !g.acked && !g.snoozed) || null;
  if (top) {
    const a = top.lead;
    const kind = KIND[a.kind] || { head: a.title };
    const rest = groups.filter((g) => g !== top && !g.acked).length;
    const plan = top.round ? ` (plan ${hm(top.round.dueAt)})` : '';
    const who = notifiedText(a.recipients);
    let text;
    if (a.kind === 'checkpoint2') text = `${a.workerName} nije očitao ${a.tagName}${plan}. ${who ? `U ${hm(a.firedAt)} ${who.includes(' i ') ? 'obavešteni su' : 'obavešten je'} ${who}.` : ''}`;
    else if (a.kind === 'checkpoint1') text = `${a.workerName} kasni na ${a.tagName}${plan}. Alarm mu je stigao na telefon u ${hm(a.firedAt)}.`;
    else if (a.kind === 'master' || a.kind === 'late') text = `${a.workerName} se nije prijavio na smenu. ${a.message}`;
    else text = a.message;
    return { tone: top.tone, eyebrow: top.tone === 'bad' ? 'Kritično' : 'Upozorenje', title: `${a.facilityName}: ${kind.head}.`, text, group: top, rest };
  }
  const acked = groups.filter((g) => g.acked || g.snoozed);
  if (acked.length) {
    const g = acked[0];
    return { tone: 'info', eyebrow: 'U radu', title: g.acked ? `${g.ackBy ? g.ackBy.ackByName : 'Koordinator'} rešava ${g.lead.facilityName}.` : `${g.lead.facilityName}: radnik je odložio alarm.`, text: g.acked ? 'Alarm je preuzet. Reši ga kad se situacija razjasni.' : `Razlog: ${g.snooze ? g.snooze.reason : 'bez razloga'}.`, group: g, rest: acked.length - 1 };
  }
  if ((k.expected || 0) > (k.onDuty || 0)) {
    return { tone: 'warn', eyebrow: 'Upozorenje', title: 'Neko nije na dužnosti.', text: `Prijavljeno ${k.onDuty} od ${k.expected} radnika u ovoj smeni.` };
  }
  const nextRound = nextAcross(data.facilities || [], now);
  return {
    tone: 'ok',
    eyebrow: 'Sve je u redu',
    title: 'Sve je u redu.',
    text: `${k.facilities || 0} ${plural(k.facilities || 0, 'objekat', 'objekta', 'objekata')}, ${k.onDuty || 0} ${plural(k.onDuty || 0, 'radnik', 'radnika', 'radnika')} na dužnosti.${nextRound ? ` Sledeći obilazak: ${nextRound.tagName} u ${hm(nextRound.dueAt)} (${nextRound.facilityName}).` : ''}`
  };
}

export function nextAcross(facilities, now) {
  let best = null;
  for (const f of facilities) {
    for (const s of f.shifts || []) {
      if (s.status !== 'active') continue;
      for (const r of s.rounds || []) {
        if (r.scannedAt || r.alarm1At) continue;
        if (new Date(r.dueAt).getTime() < now - 60000) continue;
        if (!best || new Date(r.dueAt) < new Date(best.dueAt)) best = { ...r, facilityName: f.name };
      }
    }
  }
  return best;
}

// Zadaci svih smena sada (povremeni zadaci), otvoreni prvi po roku
export function tasksOf(facilities) {
  const list = [];
  for (const f of facilities) for (const s of f.shifts || []) for (const t of s.tasks || []) list.push({ ...t, facilityName: f.name, facilityId: f._id, shiftId: s._id, workerName: s.worker ? s.worker.name : '' });
  const open = list.filter((t) => t.status === 'open').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const done = list.filter((t) => t.status === 'done').sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt));
  return { open, done };
}

// Stanje objekta: najgore stanje smena (bad > warn > ok > waiting > idle)
export const FACILITY_STATE = {
  bad: { tone: 'bad', text: 'Alarm' },
  warn: { tone: 'warn', text: 'Kasni' },
  ok: { tone: 'ok', text: 'U redu' },
  waiting: { tone: 'info', text: 'Čeka smenu' },
  idle: { tone: 'idle', text: 'Nema smene' }
};
const ORDER = { bad: 0, warn: 1, ok: 2, waiting: 3, idle: 4 };
export const sortFacilities = (list) => [...list].sort((a, b) => (ORDER[a.state] - ORDER[b.state]) || a.name.localeCompare(b.name, 'sr'));

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// Tačka obilaska na koju se alarm odnosi (iz podataka table)
export function attachRounds(groups, facilities) {
  const byShift = new Map();
  for (const f of facilities || []) for (const s of f.shifts || []) byShift.set(String(s._id), s);
  for (const g of groups) {
    const s = g.lead.shiftId ? byShift.get(String(g.lead.shiftId)) : null;
    g.shift = s || null;
    g.round = s && g.lead.roundIndex != null ? (s.rounds || [])[g.lead.roundIndex] || null : null;
  }
  return groups;
}

// Događaji: vrsta za filter i natpis
export function feedKind(e) {
  if (e.kind === 'scan') {
    if (e.result === 'clock_in') return { key: 'scan', label: 'Prijava' };
    if (e.result === 'clock_out') return { key: 'scan', label: 'Odjava' };
    if (e.result === 'checkpoint') return { key: 'scan', label: 'Obilazak' };
    if (e.result === 'unknown_tag') return { key: 'scan', label: 'Nepoznat tag' };
    if (e.result === 'extra') return { key: 'scan', label: 'Van plana' };
    return { key: 'scan', label: 'Očitavanje' };
  }
  if (e.kind === 'alarm') return { key: 'alarm', label: 'Alarm' };
  if (e.kind === 'note') return { key: 'note', label: e.level === 'warn' ? 'Ovlašćenje' : 'Zapažanje' };
  if (e.kind === 'task') return { key: 'task', label: 'Zadatak' };
  if (e.kind === 'report') return { key: 'report', label: 'Izveštaj' };
  return { key: 'other', label: 'Događaj' };
}
