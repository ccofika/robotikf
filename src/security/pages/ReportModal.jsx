// Izveštaj smene: digitalni Dnevnik rada (ista polja kao papirni obrazac), pregled mejla sa slanjem
// na druge adrese i kontrola koordinatora (zamenjuje potpis kontrolora). PDF je uvek dostupan.
import React, { useEffect, useState } from 'react';
import { Moon, Sun, Check, Send, FileDown } from 'lucide-react';
import { sec, errText, fileUrl } from '../api';
import Dialog from '../sx/Dialog';
import { Btn, Skeleton, Sign } from '../sx/ui';
import { Tabs, Note } from '../sx/layout';
import { Field, Input, Textarea, Switch } from '../sx/forms';
import { useToast } from '../sx/toast';
import { hoursText, rsd } from '../lib/time';
import '../sx/reports.css';

export default function ReportModal({ shiftId, onClose }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [view, setView] = useState('doc');
  const [emails, setEmails] = useState('');
  const [review, setReview] = useState({ remark: false, note: '' });
  const [busy, setBusy] = useState(false);
  const load = () => sec.report(shiftId).then((r) => { setD(r); setEmails((r.emails || []).join(', ')); if (r.review) setReview({ remark: r.review.remark, note: r.review.note || '' }); }).catch((e) => { toast.bad('Izveštaj nije učitan', errText(e)); onClose(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [shiftId]);

  const openPdf = async () => {
    try {
      const r = await sec.reportPdf(shiftId);
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast.bad('PDF nije napravljen', errText(e)); }
  };
  const send = async () => {
    setBusy(true);
    try {
      const list = emails.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
      const r = await sec.sendReport(shiftId, list);
      toast.ok('Izveštaj je poslat', (r.to || list).join(', '));
      load(); window.dispatchEvent(new Event('sec:changed'));
    } catch (e) { toast.bad('Slanje nije uspelo', errText(e)); } finally { setBusy(false); }
  };
  const saveReview = async () => {
    setBusy(true);
    try { await sec.reviewShift(shiftId, review); toast.ok('Kontrola je sačuvana', review.remark ? 'Izveštaj je označen sa primedbom.' : 'Izveštaj je pregledan bez primedbe.'); load(); window.dispatchEvent(new Event('sec:changed')); }
    catch (e) { toast.bad('Kontrola nije sačuvana', errText(e)); } finally { setBusy(false); }
  };

  const footer = d && (
    <>
      <Btn icon={FileDown} onClick={openPdf} data-testid="report-pdf">PDF</Btn>
      {view === 'doc' && <Btn variant="primary" icon={Send} onClick={() => setView('mail')}>Pošalji mejlom</Btn>}
      {view === 'mail' && <Btn variant="primary" icon={Send} onClick={send} busy={busy} disabled={!emails.trim()} data-testid="report-send">Pošalji izveštaj</Btn>}
      {view === 'review' && <Btn variant="primary" icon={Check} onClick={saveReview} busy={busy} data-testid="review-save">Sačuvaj kontrolu</Btn>}
    </>
  );

  return (
    <Dialog onClose={onClose} busy={busy} size="xl" testId="report-modal"
      eyebrow={d ? `Izveštaj smene${d.clockOut ? '' : ' · smena još traje'}` : 'Izveštaj smene'}
      title={d ? `${d.facility.name} · ${d.date}` : 'Učitavanje'}
      footer={footer}>
      {!d ? <Skeleton h={360} r={16} /> : (
        <>
          <Tabs items={[{ key: 'doc', label: 'Dnevnik rada', testId: 'rep-view-doc' }, { key: 'mail', label: 'Mejl', testId: 'rep-view-mail' }, { key: 'review', label: 'Kontrola', testId: 'rep-view-review' }]}
            value={view} onChange={setView} ariaLabel="Prikaz izveštaja" layoutId="sx-rep-view" className="sx-repmodal__tabs" />
          <div key={view} className="sx-fac__body">
            {view === 'doc' && <Doc d={d} />}
            {view === 'mail' && (
              <div className="sx-stack">
                <div className="sx-mail">
                  <div className="sx-mail__head">
                    <div><span>Za</span>{d.emails.join(', ') || <em>objekat nema adrese</em>}</div>
                    <div><span>Naslov</span><b>Dnevnik rada · {d.facility.name} · {d.date} {d.shiftLabel} · {d.extraordinary === 'Nema' ? 'bez vanrednih događaja' : 'ima vanrednih događaja'}</b></div>
                    <div><span>Prilog</span>PDF Dnevnika rada</div>
                  </div>
                  <p className="sx-mail__body">Poštovani, u prilogu je izveštaj smene na objektu {d.facility.name} ({d.date}, {d.shiftLabel.toLowerCase()}). Smenu je preuzeo {d.worker.name}{d.clockIn ? ` u ${d.clockIn.time}` : ''}{d.clockOut ? `, a predao u ${d.clockOut.time}` : ''}. Obilazak: {d.roundsDone} od {d.rounds.length} tačaka. Vanredni događaji: {d.extraordinary.toLowerCase()}.</p>
                </div>
                {d.sent ? <Note tone="ok">Poslato {d.sent.at} na: {(d.sent.to || []).join(', ')}.</Note> : <Note>Izveštaj se šalje sam posle odjave radnika. Ovde možeš da ga pošalješ ručno ili na druge adrese.</Note>}
                <Field label="Pošalji na" hint="Više adresa odvoji zarezom."><Input value={emails} onChange={(e) => setEmails(e.target.value)} data-testid="report-emails" /></Field>
              </div>
            )}
            {view === 'review' && (
              <div className="sx-stack">
                <p className="sx-ssec__lead">Kontrola zamenjuje potpis kontrolora sa papirnog dnevnika. Ostaje zapisano ko je i kada pregledao izveštaj.</p>
                {d.review && <Note tone={d.review.remark ? 'warn' : 'ok'}>Pregledao {d.review.byName}, {d.review.time}. Primedba: {d.review.remark ? 'da' : 'ne'}{d.review.note ? `. „${d.review.note}”` : ''}</Note>}
                <Switch checked={review.remark} onChange={(v) => setReview({ ...review, remark: v })} label="Ima primedbu" testId="review-remark">Izveštaj ima primedbu</Switch>
                <Field label="Napomena" hint="Nije obavezna."><Textarea value={review.note} onChange={(e) => setReview({ ...review, note: e.target.value })} data-testid="review-note" /></Field>
              </div>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}

// Dnevnik rada: raspored kao papirni obrazac (blokovi sa natpisom, parovi naziv/vrednost u tri kolone)
function Block({ label, value, sub }) {
  return <div className="sx-doc__cell"><span className="sx-label">{label}</span><b>{value}</b>{sub && <span>{sub}</span>}</div>;
}

function Doc({ d }) {
  return (
    <article className="sx-doc" data-testid="report-doc">
      <header className="sx-doc__head">
        <div>
          <span className="sx-eyebrow">Dnevnik rada</span>
          <h4 className="sx-doc__title">{d.facility.name}</h4>
          {d.facility.address && <span className="sx-doc__addr">{d.facility.address}</span>}
        </div>
        <div className="sx-doc__tags">
          <span className="sx-tag">{d.date}</span>
          <span className="sx-tag is-ink">{d.type === 'night' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}{d.shiftLabel}</span>
          {d.sent ? <Sign tone="ok">poslat {d.sent.at}</Sign> : d.clockOut ? <Sign tone="warn">nije poslat</Sign> : <Sign tone="info">smena u toku</Sign>}
        </div>
      </header>
      <section className="sx-doc__sec"><div className="sx-doc__grid">
        <Block label="Smenu preuzeo" value={d.worker.name} sub={d.clockIn ? `prijava ${d.clockIn.time}${d.clockIn.lateMin ? `, kašnjenje ${d.clockIn.lateMin} min` : ''}${d.clockIn.source === 'manual' ? `, ručno (${d.clockIn.byName})` : ''}` : 'nema prijave'} />
        <Block label="Preuzeta oprema" value={`Radio stanica: ${d.handover ? d.handover.radio || '-' : '-'}`} sub={`Ostalo: ${d.handover ? (d.handover.items || []).join(', ') || '-' : 'radnik nije uneo primopredaju'}`} />
        <Block label="Stanje opreme" value={d.handover ? (d.handover.condition === 'ok' ? 'Ispravna' : 'Neispravna, oštećena') : '-'} sub={d.handover && d.handover.condition !== 'ok' ? d.handover.note : 'bez posebnog izveštaja'} />
      </div></section>
      <section className="sx-doc__sec">
        <span className="sx-label">Tekući događaji i zapažanja</span>
        {!d.events.length && <p className="sx-ssec__lead">Još nema događaja.</p>}
        <ol className="sx-doc__events">
          {d.events.map((e, i) => (
            <li key={i} className={`sx-doc__ev is-${e.kind}`}>
              <time className="sx-mono">{e.time}</time>
              <span>{e.text}{e.kind !== 'guard' && <em>{e.kind === 'alarm' ? 'alarm' : 'sistem'}</em>}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="sx-doc__sec"><div className="sx-doc__grid">
        <Block label="Obilazak" value={`${d.roundsDone} od ${d.rounds.length} tačaka`} sub={d.roundsLate ? `${d.roundsLate} sa kašnjenjem` : 'sve u toleranciji'} />
        <Block label="Zadaci" value={`Stalni ${d.standing.filter((t) => t.done).length}/${d.standing.length} · povremeni ${d.occasional.filter((t) => t.done).length}/${d.occasional.length}`} sub={d.occasional.filter((t) => t.comment).map((t) => t.comment).slice(0, 1).join('') || 'iz aplikacije radnika'} />
        <Block label="Vanredni događaji" value={d.extraordinary} sub={d.authority.length ? `${d.authority.length} izveštaj o primeni ovlašćenja` : 'bez primene ovlašćenja'} />
      </div></section>
      {d.authority.length > 0 && (
        <section className="sx-doc__sec">
          <span className="sx-label">Primenjena ovlašćenja</span>
          {d.authority.map((a, i) => (
            <div key={i} className="sx-doc__auth">
              <b><span className="sx-mono">{a.time}</span> · {a.power}{a.subject && <span className="sx-faint"> · lice: {a.subject}</span>}</b>
              <span>{a.text}</span>
              {a.witnesses && <span className="sx-faint">Svedoci: {a.witnesses}</span>}
              {a.photos.length > 0 && <div className="sx-thumbs">{a.photos.map((p, k) => <a key={k} href={fileUrl(p.url)} target="_blank" rel="noreferrer"><img src={fileUrl(p.url)} alt={`Fotografija ${k + 1} od ${a.photos.length}`} /></a>)}</div>}
            </div>
          ))}
        </section>
      )}
      <section className="sx-doc__sec">
        <span className="sx-label">Kontrola i primopredaja</span>
        <div className="sx-doc__grid">
          <Block label="Smenu predao" value={d.worker.name} sub={d.clockOut ? `odjava ${d.clockOut.time}${d.clockOut.early ? `, ${d.clockOut.earlyLeaveMin} min pre kraja` : ''}` : d.noClockOut ? 'radnik se nije odjavio' : 'smena u toku'} />
          <Block label="Kontrola" value={d.review ? `Primedba: ${d.review.remark ? 'da' : 'ne'}` : 'Čeka pregled'} sub={d.review ? d.review.byName : 'potvrđuje koordinator'} />
          <Block label="Smenu primio" value={d.receivedBy ? d.receivedBy.name : '-'} sub={d.receivedBy ? `prijava ${d.receivedBy.time}` : 'popunjava se prijavom sledećeg radnika'} />
        </div>
      </section>
      <section className="sx-doc__sec"><div className="sx-doc__grid">
        <Block label="Plaćeno vreme" value={`${hoursText(d.pay.paidMin)} h`} sub={`noću ${hoursText(d.pay.nightMin)} h${d.pay.holidayMin ? `, praznik ${hoursText(d.pay.holidayMin)} h` : ''}`} />
        <Block label="Zarada za smenu" value={rsd(d.pay.amount)} sub={`${d.pay.rate} RSD/h + ${d.pay.nightPct}% noću`} />
        <Block label="Ide na" value={`${d.emails.length} ${d.emails.length === 1 ? 'adresu' : 'adrese'}`} sub={d.emails.join(', ') || 'dodaj adrese na stranici objekta'} />
      </div></section>
    </article>
  );
}
