// Izveštaji smena: period, objekat i stanje su gore; svaka smena je red sa obilaskom, dolaskom, slanjem
// i kontrolom koordinatora. Klik otvara izveštaj (Dnevnik rada), PDF i ponovno slanje su u redu.
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileDown, Send, Sun, Moon, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { cx, Btn, Sign, Skeleton, withCount } from '../sx/ui';
import { PageHead, Toolbar, Panel } from '../sx/layout';
import { Select, Choice, DateField } from '../sx/forms';
import { useToast } from '../sx/toast';
import { todayYmd, addDays, fmtYmd, dayWord, hm, monthOf, ymdOf } from '../lib/time';
import ReportModal from './ReportModal';
import '../sx/reports.css';

const PRESETS = [
  { key: 'today', label: 'Danas', range: () => [todayYmd(), todayYmd()] },
  { key: 'yesterday', label: 'Juče', range: () => [addDays(todayYmd(), -1), addDays(todayYmd(), -1)] },
  { key: '7', label: '7 dana', range: () => [addDays(todayYmd(), -6), todayYmd()] },
  { key: 'month', label: 'Ovaj mesec', range: () => [`${monthOf(todayYmd())}-01`, todayYmd()] }
];

function sendState(r) {
  const rep = r.report || {};
  if (rep.sentAt) return { tone: 'ok', text: 'poslat', sub: `${dayWord(ymdOf(rep.sentAt))} ${hm(rep.sentAt)}${(rep.sentTo || []).length ? ` · ${withCount(rep.sentTo.length, 'adresa', 'adrese', 'adresa')}` : ''}` };
  if (r.status === 'active') return { tone: 'info', text: 'smena traje', sub: 'šalje se posle odjave' };
  if (r.status === 'missed') return { tone: 'idle', text: 'nema izveštaja', sub: 'smena je propuštena' };
  if (rep.error) return { tone: 'bad', text: 'nije poslat', sub: rep.error };
  return { tone: 'warn', text: 'čeka slanje', sub: rep.attempts ? `pokušaja ${rep.attempts}` : '' };
}

export default function Reports() {
  const { facilities } = useSec();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [facility, setFacility] = useState(params.get('objekat') || '');
  const [preset, setPreset] = useState('7');
  const [from, setFrom] = useState(addDays(todayYmd(), -6));
  const [to, setTo] = useState(todayYmd());
  const [status, setStatus] = useState('all');
  const [only, setOnly] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(params.get('smena-izvestaj') || null);
  const list = usePoll(() => sec.reports({ facility: facility || undefined, from, to, page }), 60000, [facility, from, to, page]);
  const reloadList = list.reload;
  useEffect(() => { const h = () => reloadList(); window.addEventListener('sec:changed', h); return () => window.removeEventListener('sec:changed', h); }, [reloadList]);
  useEffect(() => { setPage(1); }, [facility, from, to]);
  const choose = (k) => { const p = PRESETS.find((x) => x.key === k); if (!p) return; const [a, b] = p.range(); setPreset(k); setFrom(a); setTo(b); };
  const data = list.data || { items: [], total: 0, pages: 0 };
  const is = {
    unsent: (r) => !(r.report && r.report.sentAt) && r.status === 'done',
    unreviewed: (r) => !r.review && r.status === 'done',
    authority: (r) => r.authority > 0
  };
  const counts = useMemo(() => ({ unsent: data.items.filter(is.unsent).length, unreviewed: data.items.filter(is.unreviewed).length, authority: data.items.filter(is.authority).length }), [data.items]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = data.items.filter((r) => (status === 'all' || r.status === status) && (!only || is[only](r)));

  const pdf = async (r) => {
    try { const res = await sec.reportPdf(r._id); const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch (e) { toast.bad('PDF nije napravljen', errText(e)); }
  };
  // dok se izveštaj šalje, ponovni klik ne šalje još jedan mejl
  const [sending, setSending] = useState(() => new Set());
  const resend = async (r) => {
    if (sending.has(r._id)) return;
    setSending((s) => new Set(s).add(r._id));
    try { const res = await sec.sendReport(r._id); toast.ok('Izveštaj je poslat', (res.to || []).join(', ')); list.reload(); } catch (e) { toast.bad('Slanje nije uspelo', errText(e)); }
    finally { setSending((s) => { const n = new Set(s); n.delete(r._id); return n; }); }
  };
  const closeReport = () => { setOpen(null); if (params.get('smena-izvestaj')) { const n = new URLSearchParams(params); n.delete('smena-izvestaj'); setParams(n, { replace: true }); } list.reload(); };

  return (
    <div className="sx-page sx-reports" data-testid="page-reports">
      <PageHead
        eyebrow="Security · Izveštaji"
        title="Izveštaji smena"
        lead="Posle svake odjave radnika izveštaj (Dnevnik rada) ide sam na adrese objekta. Ovde ga otvaraš, šalješ ponovo ili preuzimaš kao PDF, a koordinator ga pregleda."
      />

      <Toolbar testId="reports-toolbar">
        <Choice size="sm" scroll label="Period" value={preset} onChange={choose} layoutId="sx-rep-preset" options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
        <span className="sx-rep__range">
          <DateField compact value={from} max={to} onChange={(v) => { if (v) { setFrom(v); setPreset(''); } }} testId="rep-from" aria-label="Od dana" />
          <span className="sx-faint">do</span>
          <DateField compact value={to} min={from} onChange={(v) => { if (v) { setTo(v); setPreset(''); } }} testId="rep-to" aria-label="Do dana" />
        </span>
        <div className="sx-toolbar__end">
          <Select size="sm" value={facility} onChange={(e) => setFacility(e.target.value)} aria-label="Objekat" data-testid="rep-facility">
            <option value="">Svi objekti</option>
            {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </Select>
        </div>
      </Toolbar>
      <div className="sx-rep__filters">
        <Choice size="sm" label="Stanje smene" value={status} onChange={setStatus} layoutId="sx-rep-status"
          options={[{ value: 'all', label: 'Sve' }, { value: 'done', label: 'Završene' }, { value: 'active', label: 'U toku' }, { value: 'missed', label: 'Propuštene' }]} />
        <span className="sx-toolbar__sep" aria-hidden="true" />
        <Choice size="sm" scroll label="Samo" value={only} onChange={(v) => setOnly(only === v ? '' : v)} layoutId="sx-rep-only"
          options={[{ value: '', label: 'Svi izveštaji' }, { value: 'unsent', label: 'Nije poslat', count: counts.unsent, tone: counts.unsent ? 'warn' : null, testId: 'rep-only-unsent' }, { value: 'unreviewed', label: 'Bez kontrole', count: counts.unreviewed, testId: 'rep-only-unreviewed' }, { value: 'authority', label: 'Primena ovlašćenja', count: counts.authority, tone: counts.authority ? 'warn' : null, testId: 'rep-only-authority' }]} />
      </div>

      <Panel pad={false} testId="reports-panel"
        title={<span className="sx-panel__title-row">Smene <span className="sx-count">{data.total}</span></span>}
        sub={`Od ${fmtYmd(from)} do ${fmtYmd(to)}${facility ? `, ${(facilities.find((f) => f._id === facility) || {}).name || ''}` : ', svi objekti'}.`}>
        {list.loading && !list.data ? <div className="sx-stack" style={{ padding: 20 }}><Skeleton h={44} /><Skeleton h={44} /><Skeleton h={44} /></div> : !items.length ? (
          <div className="sx-empty-block">
            <b>Nema izveštaja</b>
            <span>{data.total ? 'Nijedna smena ne odgovara filteru. Probaj "Sve" ili drugi period.' : `Nema smena od ${fmtYmd(from)} do ${fmtYmd(to)}.`}</span>
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="reports-table">
              <thead><tr><th>Smena</th><th>Objekat</th><th>Radnik</th><th>Obilazak</th><th>Dolazak</th><th>Slanje</th><th>Kontrola</th><th className="is-end"><span className="sx-sr">Radnje</span></th></tr></thead>
              <tbody>
                {items.map((r, i) => {
                  const st = sendState(r);
                  const pct = r.roundsTotal ? Math.round((r.roundsDone / r.roundsTotal) * 100) : null;
                  const Icon = r.type === 'night' ? Moon : Sun;
                  return (
                    <tr key={r._id} className="is-click" style={{ '--i': i }} tabIndex={0} onClick={() => setOpen(r._id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(r._id); }} data-testid="report-row">
                      <td className="is-head"><div className="sx-cell sx-rep__shift"><span className={cx('sx-rep__icon', r.type === 'night' && 'is-night')}><Icon size={14} strokeWidth={2} aria-hidden="true" /></span><b>{dayWord(r.date)}</b><span>{r.label}</span></div></td>
                      <td data-label="Objekat">{r.facility ? r.facility.name : '-'}</td>
                      <td data-label="Radnik"><span className="sx-nowrap">{r.worker ? r.worker.name : '-'}</span>{r.authority > 0 && <span className="sx-tag is-warn sx-rep__auth" title="Primena ovlašćenja"><ShieldAlert aria-hidden="true" />{r.authority}</span>}</td>
                      <td data-label="Obilazak">{pct === null ? <span className="sx-faint">bez plana</span> : (
                        <span className="sx-rep__prog" title={`${r.roundsDone} od ${r.roundsTotal} tačaka`}>
                          <span className={cx('sx-rep__bar', pct < 100 && r.status !== 'active' && (pct < 70 ? 'is-bad' : 'is-warn'))}><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
                          <span className="sx-mono">{r.roundsDone}/{r.roundsTotal}</span>
                        </span>
                      )}</td>
                      <td data-label="Dolazak">{r.status === 'missed' ? <Sign tone="bad">propuštena</Sign> : r.status === 'active' && !r.lateMin ? <Sign tone="ok" live>u toku</Sign> : r.lateMin ? <Sign tone="warn">kasnio {r.lateMin} min</Sign> : <Sign tone="ok">na vreme</Sign>}</td>
                      <td data-label="Slanje"><span className="sx-rep__send" title={st.sub}><Sign tone={st.tone}>{st.text}</Sign>{st.sub && <small>{st.sub}</small>}</span></td>
                      <td data-label="Kontrola">{r.review ? <Sign tone={r.review.remark ? 'warn' : 'ok'} title={r.review.note}>{r.review.remark ? 'ima primedbu' : 'pregledano'}<small> · {r.review.byName}</small></Sign> : r.status === 'done' ? <span className="sx-faint sx-nowrap">čeka pregled</span> : <span className="sx-faint">-</span>}</td>
                      <td className="is-actions is-end" onClick={(e) => e.stopPropagation()}>
                        <span className="sx-rowacts">
                          {r.status !== 'missed' && <Btn size="sm" variant="ghost" icon={FileDown} onClick={() => pdf(r)} aria-label="Preuzmi PDF" title="PDF" />}
                          {r.status === 'done' && <Btn size="sm" variant="ghost" icon={Send} onClick={() => resend(r)} busy={sending.has(r._id)} disabled={sending.has(r._id)} aria-label="Pošalji ponovo" title="Pošalji ponovo" data-testid="rep-resend" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data.pages > 1 && (
          <div className="sx-pager">
            <span className="sx-field__hint">Strana {page} od {data.pages}</span>
            <div className="sx-inline">
              <Btn size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>Prethodna</Btn>
              <Btn size="sm" iconRight={ChevronRight} disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Sledeća</Btn>
            </div>
          </div>
        )}
      </Panel>
      {open && <ReportModal shiftId={open} onClose={closeReport} />}
    </div>
  );
}
