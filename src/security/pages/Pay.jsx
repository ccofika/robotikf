// Satnica: mesečni obračun iz NFC prijave i odjave (u okviru plana smene), noćni rad 22-06 i praznici.
// Satnica radnika se menja direktno u tabeli (Enter ili izlazak iz polja čuva), izvoz u Excel.
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { cx, Btn, Led, Skeleton, withCount } from '../sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat } from '../sx/layout';
import { Select, NumberField } from '../sx/forms';
import { useToast } from '../sx/toast';
import { todayYmd, monthOf, addMonths, monthLabel, hoursText, rsd, fmtYmd, DAY_SHORT, dowOfYmd } from '../lib/time';
import '../sx/reports.css';

function RateCell({ row, def, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState(row.customRate ? row.rate : '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setV(row.customRate ? row.rate : ''); }, [row.rate, row.customRate]);
  const commit = async () => {
    const next = v === '' ? null : Number(v);
    const cur = row.customRate ? row.rate : null;
    if (next === cur) return;
    setBusy(true);
    try { await sec.setRate(row.workerId, next); toast.ok('Satnica je sačuvana', `${row.name}: ${next === null ? `podrazumevana (${rsd(def)})` : rsd(next)}`); onSaved(); }
    catch (e) { toast.bad('Satnica nije sačuvana', errText(e)); } finally { setBusy(false); }
  };
  return (
    <span className="sx-ratecell" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setV(row.customRate ? row.rate : ''); }} onBlur={commit}>
      <NumberField value={v} onChange={setV} min={0} suffix="RSD/h" width={64} placeholder={String(def)} disabled={busy} className={cx(!row.customRate && 'is-default')} testId="rate-input" aria-label={`Satnica, ${row.name}`} />
    </span>
  );
}

export default function Pay() {
  const { facilities, openWorker } = useSec();
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(todayYmd()));
  const [facility, setFacility] = useState('');
  const data = usePoll(() => sec.timesheet({ month, facility: facility || undefined }), 0, [month, facility]);
  const t = data.data;
  const [rules, setRules] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (t && !rules) setRules({ defaultRate: t.pay.defaultRate, nightPct: t.pay.nightPct, holidayPct: t.pay.holidayPct }); }, [t, rules]);
  const rulesDirty = t && rules && (Number(rules.defaultRate) !== t.pay.defaultRate || Number(rules.nightPct) !== t.pay.nightPct || Number(rules.holidayPct) !== t.pay.holidayPct);

  const saveRules = async () => {
    setBusy(true);
    try { await sec.saveSettings({ pay: { defaultRate: Number(rules.defaultRate), nightPct: Number(rules.nightPct), holidayPct: Number(rules.holidayPct) } }); toast.ok('Pravila obračuna su sačuvana', 'Obračun je preračunat za ceo mesec.'); setRules(null); data.reload(); }
    catch (e) { toast.bad('Pravila nisu sačuvana', errText(e)); } finally { setBusy(false); }
  };
  const exportXlsx = () => {
    const rows = t.rows.map((r) => ({
      Radnik: r.name, Objekti: r.facilities.join(', '), 'Smene završene': r.done, 'Smene planirane': r.planned, Propuštene: r.missed, Kašnjenja: r.late, 'Kašnjenje (min)': r.lateMin,
      Sati: +(r.paidMin / 60).toFixed(2), 'Noćni sati': +(r.nightMin / 60).toFixed(2), 'Praznični sati': +(r.holidayMin / 60).toFixed(2),
      'Satnica (RSD)': r.rate, 'Osnovno (RSD)': Math.round(r.basePay), 'Noćni dodatak (RSD)': Math.round(r.nightPay), 'Praznik dodatak (RSD)': Math.round(r.holidayPay), 'Ukupno (RSD)': Math.round(r.total)
    }));
    rows.push({ Radnik: 'UKUPNO', 'Smene završene': t.totals.done, Sati: +(t.totals.paidMin / 60).toFixed(2), 'Noćni sati': +(t.totals.nightMin / 60).toFixed(2), 'Praznični sati': +(t.totals.holidayMin / 60).toFixed(2), 'Ukupno (RSD)': Math.round(t.totals.total) });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(10, k.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Satnica');
    const fac = facilities.find((f) => f._id === facility);
    XLSX.writeFile(wb, `satnica-${month}${fac ? `-${fac.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''}.xlsx`);
    toast.ok('Excel je preuzet', `Satnica za ${monthLabel(month)}`);
  };
  const isCurrent = month === monthOf(todayYmd());

  return (
    <div className="sx-page sx-pay" data-testid="page-pay">
      <PageHead
        eyebrow="Security · Satnica"
        title="Satnica"
        lead="Plaćeno vreme ide iz NFC prijave i odjave, u okviru plana smene: rani dolazak se ne plaća, a kašnjenje i rana odjava umanjuju sate. Satnicu radnika menjaš direktno u tabeli."
        actions={<Btn icon={FileSpreadsheet} onClick={exportXlsx} disabled={!t || !t.rows.length} data-testid="pay-export">Preuzmi Excel</Btn>}
      />

      <Toolbar testId="pay-toolbar">
        <div className="sx-weeknav">
          <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setMonth(addMonths(month, -1))} aria-label="Prethodni mesec" title="Prethodni mesec" data-testid="month-prev" />
          <span className="sx-weeknav__label sx-pay__month" data-testid="month-label">{monthLabel(month)}</span>
          <Btn size="sm" variant="ghost" icon={ChevronRight} onClick={() => setMonth(addMonths(month, 1))} aria-label="Sledeći mesec" title="Sledeći mesec" disabled={isCurrent} data-testid="month-next" />
          {!isCurrent && <Btn size="sm" onClick={() => setMonth(monthOf(todayYmd()))}>Ovaj mesec</Btn>}
        </div>
        <div className="sx-toolbar__end">
          <Select size="sm" value={facility} onChange={(e) => setFacility(e.target.value)} aria-label="Objekat" data-testid="pay-facility">
            <option value="">Svi objekti</option>
            {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </Select>
        </div>
      </Toolbar>

      {!t ? <div className="sx-stack"><Skeleton h={110} r={18} /><Skeleton h={360} r={18} /></div> : (
        <>
          <div className="sx-stats">
            <Stat label="Ukupno za isplatu" value={Math.round(t.totals.total).toLocaleString('sr-Latn-RS')} small=" RSD" sub={withCount(t.totals.done, 'završena smena', 'završene smene', 'završenih smena')} testId="kpi-total" />
            <Stat label="Plaćeni sati" value={hoursText(t.totals.paidMin)} small=" h" sub={withCount(t.rows.length, 'radnik', 'radnika', 'radnika')} />
            <Stat label="Noćni rad" value={hoursText(t.totals.nightMin)} small=" h" sub={`22-06, dodatak ${t.pay.nightPct}%`} />
            <Stat label="Praznici" value={hoursText(t.totals.holidayMin)} small=" h" sub={t.holidays.length ? `dodatak ${t.pay.holidayPct}%, ${withCount(t.holidays.length, 'praznik', 'praznika', 'praznika')} u mesecu` : 'nema praznika u mesecu'} />
          </div>
          <div className="sx-cols sx-cols--main">
            <Panel pad={false} title="Obračun po radniku" sub={isCurrent ? 'Mesec je u toku: smena ulazi u obračun posle odjave.' : 'Zaključen mesec.'} testId="pay-panel">
              {!t.rows.length ? (
                <div className="sx-empty-block"><b>Nema smena u ovom mesecu</b><span>Obračun se pravi sam iz smena i NFC prijava.</span></div>
              ) : (
                <div className="sx-tablewrap">
                  <table className="sx-table" data-testid="pay-table">
                    <thead><tr><th>Radnik</th><th className="is-num">Smene</th><th className="is-num">Kašnj.</th><th className="is-num">Sati</th><th className="is-num">Noću</th><th className="is-num">Praznik</th><th className="is-num">Satnica</th><th className="is-num">Osnovno</th><th className="is-num">Dodaci</th><th className="is-num">Ukupno</th></tr></thead>
                    <tbody>
                      {t.rows.map((r, i) => (
                        <tr key={r.workerId} className="is-click" style={{ '--i': i }} tabIndex={0} onClick={() => openWorker(r.workerId)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openWorker(r.workerId); }} data-testid="pay-row">
                          <td className="is-head"><div className="sx-cell"><b className="sx-nowrap">{r.name}</b><span>{r.facilities.join(', ')}</span></div></td>
                          <td data-label="Smene" className="is-num">{r.done}<span className="sx-faint">/{r.planned}</span>{r.missed ? <span className="sx-pay__bad" title="propuštene"> · {r.missed}</span> : null}</td>
                          <td data-label="Kašnjenja" className={cx('is-num', r.late && 'sx-pay__warn')} title={r.late ? `${r.lateMin} min ukupno` : ''}>{r.late || <span className="sx-faint">0</span>}</td>
                          <td data-label="Sati" className="is-num">{hoursText(r.paidMin)}</td>
                          <td data-label="Noću" className="is-num">{r.nightMin ? hoursText(r.nightMin) : <span className="sx-faint">-</span>}</td>
                          <td data-label="Praznik" className="is-num">{r.holidayMin ? hoursText(r.holidayMin) : <span className="sx-faint">-</span>}</td>
                          <td data-label="Satnica" className="is-num"><RateCell row={r} def={t.pay.defaultRate} onSaved={data.reload} /></td>
                          <td data-label="Osnovno" className="is-num">{rsd(r.basePay)}</td>
                          <td data-label="Dodaci" className="is-num">{r.nightPay + r.holidayPay ? rsd(r.nightPay + r.holidayPay) : <span className="sx-faint">-</span>}</td>
                          <td data-label="Ukupno" className="is-num sx-pay__total">{rsd(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td>Ukupno</td><td className="is-num">{t.totals.done}</td><td /><td className="is-num">{hoursText(t.totals.paidMin)}</td><td className="is-num">{hoursText(t.totals.nightMin)}</td><td className="is-num">{hoursText(t.totals.holidayMin)}</td><td /><td /><td /><td className="is-num" data-testid="pay-total">{rsd(t.totals.total)}</td></tr></tfoot>
                  </table>
                </div>
              )}
            </Panel>
            <div className="sx-stack">
              <Panel title="Pravila obračuna" sub="Važe za ceo mesec, i unazad." testId="pay-rules"
                footer={rulesDirty && <><Btn variant="ghost" size="sm" onClick={() => setRules({ defaultRate: t.pay.defaultRate, nightPct: t.pay.nightPct, holidayPct: t.pay.holidayPct })} disabled={busy}>Poništi</Btn><Btn variant="primary" size="sm" busy={busy} onClick={saveRules} data-testid="pay-rules-save">Sačuvaj pravila</Btn></>}>
                {rules && (
                  <div className="sx-rulelist">
                    <div className="sx-rulelist__row"><div><b>Podrazumevana satnica</b><span>Za radnike bez svoje satnice.</span></div><NumberField value={rules.defaultRate} onChange={(v) => setRules({ ...rules, defaultRate: v })} min={0} suffix="RSD/h" width={64} testId="pay-default" aria-label="Podrazumevana satnica" /></div>
                    <div className="sx-rulelist__row"><div><b>Noćni rad (22-06)</b><span>Dodatak na satnicu.</span></div><NumberField value={rules.nightPct} onChange={(v) => setRules({ ...rules, nightPct: v })} min={0} max={300} suffix="%" width={52} testId="pay-night" aria-label="Dodatak za noćni rad" /></div>
                    <div className="sx-rulelist__row"><div><b>Rad na praznik</b><span>Dodatak na satnicu.</span></div><NumberField value={rules.holidayPct} onChange={(v) => setRules({ ...rules, holidayPct: v })} min={0} max={300} suffix="%" width={52} testId="pay-holiday" aria-label="Dodatak za rad na praznik" /></div>
                  </div>
                )}
              </Panel>
              <Panel title="Praznici u mesecu" sub="Državni praznici se računaju sami, i Uskrs.">
                {!t.holidays.length ? <p className="sx-ssec__lead">Nema praznika u mesecu {monthLabel(month)}</p> : (
                  <ol className="sx-tl">
                    {t.holidays.map((h, i) => <li className="sx-tl__item" key={h.date} style={{ '--i': i }}><span className="sx-tl__mark"><Led tone="warn" /></span><div className="sx-tl__body"><span className="sx-tl__title">{h.name}</span><span className="sx-tl__meta">{DAY_SHORT[dowOfYmd(h.date)]} <span className="sx-mono">{fmtYmd(h.date)}</span></span></div></li>)}
                  </ol>
                )}
              </Panel>
              <Note tone="idle">Plaćeno vreme: od kasnijeg (plan ili prijava) do ranijeg (plan ili odjava). Ručni upis vremena radi se u detaljima smene.</Note>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
