// Objekti: lista sa stanjem uživo (ko je sada na smeni) i putem pripreme (šta još fali da objekat radi
// bez greške: radno mesto, checkpointi, plan obilaska, radnici, koordinator, adrese za izveštaj).
// Gore su nepoznati tagovi koje su radnici očitali: registracija jednim klikom, sa objektom iz smene.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Nfc, ArrowRight } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { cx, Btn, Led, Sign, Skeleton, withCount, plural, agoText, useTick } from '../sx/ui';
import { PageHead, Toolbar, Panel } from '../sx/layout';
import { Field, Input, Textarea, Choice, SearchField } from '../sx/forms';
import Dialog from '../sx/Dialog';
import { useToast } from '../sx/toast';
import { hm, dayWord, ymdOf } from '../lib/time';
import TagWizard from './TagWizard';
import '../sx/facility.css';

// Put pripreme objekta: šest koraka, svaki sa kratkim opisom i tabom gde se sređuje
export function readiness(f) {
  const plan = f.roundPlan ? (f.roundPlan.day || []).length + (f.roundPlan.night || []).length : 0;
  const coords = (f.coordinators || []).length;
  const guards = f.guardCount !== undefined ? f.guardCount : (f.guards || []).length;
  const wp = f.workplaceTags !== undefined ? f.workplaceTags : (f.tags || []).filter((t) => t.status === 'active' && t.category === 'workplace').length;
  const cp = f.checkpointTags !== undefined ? f.checkpointTags : (f.tags || []).filter((t) => t.status === 'active' && t.category === 'checkpoint').length;
  const emails = (f.reportEmails || []).length;
  return [
    { key: 'wp', label: 'Radno mesto', ok: wp > 0, value: wp ? withCount(wp, 'tag', 'taga', 'tagova') : 'nema taga', why: 'Bez taga za radno mesto radnik ne može da se prijavi na smenu.', tab: 'tagovi' },
    { key: 'cp', label: 'Checkpointi', ok: cp > 0, value: cp ? withCount(cp, 'tačka', 'tačke', 'tačaka') : 'nema', why: 'Tačke obilaska koje radnik očitava.', tab: 'tagovi' },
    { key: 'plan', label: 'Plan obilaska', ok: plan > 0, value: plan ? withCount(plan, 'očitavanje', 'očitavanja', 'očitavanja') : 'nije napravljen', why: 'Bez plana nema alarma za propušten obilazak.', tab: 'obilazak' },
    { key: 'guards', label: 'Radnici', ok: guards > 0, value: guards ? withCount(guards, 'radnik', 'radnika', 'radnika') : 'nema', why: 'Radnici koji mogu da dobiju smenu na ovom objektu.', tab: 'radnici' },
    { key: 'coord', label: 'Koordinator', ok: coords > 0, value: coords ? (f.coordinators || []).map((c) => c.name).join(', ') : 'nema', why: 'Dobija MASTER ALARM za ovaj objekat. Bez njega samo administratori.', tab: 'radnici' },
    { key: 'mail', label: 'Izveštaj', ok: emails > 0, value: emails ? withCount(emails, 'adresa', 'adrese', 'adresa') : 'nema adrese', why: 'Posle svake smene izveštaj ide na ove adrese.', tab: 'izvestaj' }
  ];
}

// Put pripreme kao linija sa šest tačaka: kvadrat je sređeno, trougao fali
export function ReadyRoute({ steps, onStep, compact, testId }) {
  const missing = steps.filter((s) => !s.ok);
  return (
    <div className={cx('sx-ready', compact && 'is-compact')} data-testid={testId}>
      <ol className="sx-ready__line" aria-label="Priprema objekta">
        {steps.map((s, i) => {
          const Tag = onStep ? 'button' : 'span';
          return (
            <li key={s.key} className={cx('sx-ready__step', s.ok ? 'is-ok' : 'is-miss')} style={{ '--i': i }}>
              <Tag type={onStep ? 'button' : undefined} className="sx-ready__node" onClick={onStep ? (e) => { e.stopPropagation(); onStep(s); } : undefined}
                title={`${s.label}: ${s.value}${s.ok ? '' : `. ${s.why}`}`} aria-label={`${s.label}: ${s.value}`} />
              {!compact && <span className="sx-ready__label"><b>{s.label}</b><span>{s.value}</span></span>}
            </li>
          );
        })}
      </ol>
      {compact && (
        <span className={cx('sx-ready__text', missing.length && 'is-miss')}>
          {missing.length ? `Fali: ${missing.map((s) => s.label.toLowerCase()).join(', ')}` : 'Spreman za rad'}
        </span>
      )}
    </div>
  );
}

// Polja ove forme. Čuvaju se SAMO ona: ostalo (mejl adrese za izveštaj, plan obilaska, pravila) ima svoje
// kartice, a slanje celog objekta iz memorije strane bi pregazilo ono što je neko drugi u međuvremenu promenio.
const FORM_KEYS = ['name', 'type', 'address', 'city', 'description', 'instructions', 'contactName', 'contactPhone'];
const pickForm = (f) => Object.fromEntries(FORM_KEYS.map((k) => [k, f[k] == null ? '' : f[k]]));

export function FacilityForm({ initial = {}, onSave, onCancel, busy, submitText = 'Sačuvaj', lock = [], autoFocus = false, footer = true, formId }) {
  const [f, setF] = useState(() => pickForm(initial));
  useEffect(() => { setF(pickForm(initial)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial._id, initial.updatedAt]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ro = (k) => lock.includes(k);
  return (
    <form id={formId} onSubmit={(e) => { e.preventDefault(); if (f.name.trim().length >= 2) onSave(pickForm(f)); }} className="sx-facform">
      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">Osnovno</h3>
        <div className="sx-form">
          <Field label="Naziv objekta" wide><Input autoFocus={autoFocus} value={f.name} onChange={set('name')} disabled={ro('name')} placeholder="Npr. Hotel Aurora" data-testid="fac-name" /></Field>
          <Field label="Vrsta objekta"><Input value={f.type} onChange={set('type')} disabled={ro('type')} placeholder="Hotel, poslovna zgrada, magacin" data-testid="fac-type" /></Field>
          <Field label="Mesto"><Input value={f.city} onChange={set('city')} disabled={ro('city')} placeholder="Beograd" /></Field>
          <Field label="Adresa" wide><Input value={f.address} onChange={set('address')} disabled={ro('address')} placeholder="Ulica i broj" data-testid="fac-address" /></Field>
          <Field label="Opis" wide hint="Spratovi, ulazi, garaže, šta se čuva."><Textarea value={f.description} onChange={set('description')} disabled={ro('description')} rows={2} /></Field>
        </div>
      </div>
      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">Kontakt na objektu</h3>
        <div className="sx-form">
          <Field label="Ko je kontakt"><Input value={f.contactName} onChange={set('contactName')} placeholder="Recepcija, šef objekta" /></Field>
          <Field label="Telefon"><Input value={f.contactPhone} onChange={set('contactPhone')} placeholder="011 ..." inputMode="tel" /></Field>
        </div>
      </div>
      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">Uputstvo za radnike</h3>
        <Field hint="Radnik ga vidi u aplikaciji na početku svake smene."><Textarea value={f.instructions} onChange={set('instructions')} placeholder="Npr. PP centrala je na recepciji, ključevi su u kasi iza pulta" rows={3} data-testid="fac-instructions" /></Field>
      </div>
      {footer && (
        <div className="sx-facform__foot">
          {onCancel && <Btn variant="ghost" onClick={onCancel} disabled={busy}>Odustani</Btn>}
          <Btn type="submit" variant="primary" busy={busy} disabled={f.name.trim().length < 2} data-testid="fac-save">{submitText}</Btn>
        </div>
      )}
    </form>
  );
}

const STATE = {
  bad: { tone: 'bad', text: 'alarm' },
  warn: { tone: 'warn', text: 'kasni' },
  ok: { tone: 'ok', text: 'u redu' },
  waiting: { tone: 'info', text: 'smena počinje' },
  idle: { tone: 'idle', text: 'nema smene' }
};

export default function Facilities() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAdmin, refreshFacilities } = useSec();
  const toast = useToast();
  const now = useTick(30000);
  const [show, setShow] = useState('active');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(params.get('novi') === '1');
  const [wizard, setWizard] = useState(params.get('tag') === '1' ? { mode: 'create' } : null);
  const [busy, setBusy] = useState(false);
  const all = usePoll(() => sec.facilities({ all: '1' }), 60000, []);
  const live = usePoll(() => sec.live().catch(() => null), 30000, []);
  const unknown = usePoll(() => sec.unknownTags().catch(() => []), 30000, []);

  useEffect(() => {
    if (params.get('novi') || params.get('tag') || params.get('nepoznati')) {
      const n = new URLSearchParams(params); n.delete('novi'); n.delete('tag'); setParams(n, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = all.data || [];
  const liveBy = useMemo(() => new Map(((live.data && live.data.facilities) || []).map((f) => [String(f._id), f])), [live.data]);
  const counts = { active: list.filter((f) => f.active).length, archived: list.filter((f) => !f.active).length };
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const rows = list
    .filter((f) => (show === 'active' ? f.active : show === 'archived' ? !f.active : true))
    .filter((f) => !q || fold(`${f.name} ${f.city} ${f.address} ${f.type}`).includes(fold(q)));
  const unk = unknown.data || [];

  const create = async (data) => {
    setBusy(true);
    try {
      const f = await sec.createFacility(data);
      toast.ok('Objekat je dodat', 'Sledeće: tag za radno mesto, checkpointi i plan obilaska.');
      refreshFacilities();
      navigate(`/security/objekti/${f._id}?tab=tagovi`);
    } catch (e) { toast.bad('Objekat nije dodat', errText(e)); } finally { setBusy(false); }
  };
  const dismiss = async (u) => {
    try { await sec.dismissUnknown(u.uid); toast.ok('Tag je zanemaren', `${u.uid} više nije na listi.`); unknown.reload(); } catch (e) { toast.bad('Nije uspelo', errText(e)); }
  };

  return (
    <div className="sx-page sx-facs" data-testid="page-facilities">
      <PageHead
        eyebrow="Security · Objekti"
        title="Objekti"
        lead="Mesta gde radnici čuvaju. Za svaki objekat vidiš ko je sada na smeni i šta još fali u pripremi, a klikom ulaziš u tagove, obilazak, zadatke, radnike i izveštaj."
        actions={isAdmin ? <>
          <Btn icon={Nfc} onClick={() => setWizard({ mode: 'create' })} data-testid="add-tag-global">Dodaj NFC tag</Btn>
          <Btn variant="primary" icon={Plus} onClick={() => setCreating(true)} data-testid="add-facility">Novi objekat</Btn>
        </> : null}
      />

      {unk.length > 0 && (
        <Panel tone="warn" testId="unknown-tags" pad={false}
          title={<span className="sx-panel__title-row"><Led tone="warn" live />Nepoznati tagovi <span className="sx-count">{unk.length}</span></span>}
          sub="Radnici su očitali tagove koji nisu registrovani. Registruj ih, objekat se popuni iz smene radnika.">
          <div className="sx-tablewrap">
            <table className="sx-table">
              <thead><tr><th>Broj taga</th><th>Gde</th><th>Ko je očitao</th><th>Poslednji put</th><th className="is-end"><span className="sx-sr">Radnje</span></th></tr></thead>
              <tbody>
                {unk.map((u, i) => (
                  <tr key={u.uid} style={{ '--i': i }} data-testid="unknown-row">
                    <td className="is-head" data-label="Broj taga"><span className="sx-uid">{u.uid}</span></td>
                    <td data-label="Gde">{u.facilityName || <span className="sx-faint">nepoznato</span>}</td>
                    <td data-label="Ko je očitao">{u.workerName}{u.count > 1 && <span className="sx-faint"> · {u.count} puta</span>}</td>
                    <td data-label="Poslednji put"><span className="sx-mono">{dayWord(ymdOf(u.lastAt))} {hm(u.lastAt)}</span></td>
                    <td className="is-actions is-end">
                      <span className="sx-rowacts">
                        {isAdmin && <Btn size="sm" variant="primary" icon={Nfc} onClick={() => setWizard({ mode: 'create', uid: u.uid, facilityId: u.facilityId })} data-testid="register-unknown">Registruj</Btn>}
                        {isAdmin && <Btn size="sm" variant="ghost" onClick={() => dismiss(u)}>Zanemari</Btn>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Toolbar testId="facs-toolbar">
        <SearchField value={q} onChange={setQ} placeholder="Traži objekat, mesto ili adresu" testId="fac-search" />
        <Choice size="sm" label="Prikaz" value={show} onChange={setShow} layoutId="sx-facs-show"
          options={[{ value: 'active', label: 'Aktivni', count: counts.active }, { value: 'archived', label: 'Arhivirani', count: counts.archived }, { value: 'all', label: 'Svi', count: list.length }]} />
      </Toolbar>

      {!all.data ? (
        <div className="sx-card sx-facs__skel" aria-busy="true" aria-label="Učitavanje">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={84} r={0} />)}</div>
      ) : !rows.length ? (
        <Panel>
          <div className="sx-empty-block">
            <b>{list.length ? 'Nema objekata za ovaj filter' : 'Još nema objekata'}</b>
            <span>{list.length ? 'Promeni pretragu ili prikaz.' : 'Dodaj prvi objekat. Posle toga dodaješ NFC tagove, radnike, plan obilaska i adrese za izveštaj.'}</span>
            {!list.length && isAdmin && <Btn variant="primary" icon={Plus} onClick={() => setCreating(true)}>Novi objekat</Btn>}
          </div>
        </Panel>
      ) : (
        <div className="sx-card sx-facs__list" role="list" data-testid="facility-list">
          {rows.map((f, i) => {
            const lv = liveBy.get(String(f._id));
            const st = !f.active ? { tone: 'idle', text: 'arhiviran' } : STATE[lv ? lv.state : 'idle'] || STATE.idle;
            const cur = lv && lv.shifts && lv.shifts[0];
            const steps = readiness(f);
            return (
              <div key={f._id} role="listitem" className={cx('sx-facrow', !f.active && 'is-archived')} style={{ '--i': i }}
                tabIndex={0} onClick={() => navigate(`/security/objekti/${f._id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/security/objekti/${f._id}`); }} data-testid="facility-card">
                <div className="sx-facrow__id">
                  <b className="sx-facrow__name">{f.name}</b>
                  <span className="sx-facrow__sub">{[f.type, f.city || f.address].filter(Boolean).join(' · ') || 'bez opisa'}</span>
                </div>
                <div className="sx-facrow__now">
                  <span className="sx-label">Sada</span>
                  <Sign tone={st.tone} live={st.tone === 'bad' || st.tone === 'warn'}>{cur && cur.worker ? cur.worker.name : st.text}</Sign>
                  <span className="sx-facrow__nowsub">
                    {!f.active ? 'ne pojavljuje se u rasporedu'
                      : cur ? (cur.status === 'active' ? `od ${hm(cur.clockIn)} · obilazak ${cur.roundsDone}/${cur.roundsDue || 0}` : cur.status === 'missed' ? 'nije došao na smenu' : `${cur.label}, ${cur.minutesLate ? `kasni ${cur.minutesLate} min` : `počinje u ${hm(cur.plannedStart)}`}`)
                        : lv && lv.nextShift ? `sledeća: ${dayWord(ymdOf(lv.nextShift.plannedStart))} ${hm(lv.nextShift.plannedStart)}${lv.nextShift.workerName ? `, ${lv.nextShift.workerName}` : ''}` : 'nema zakazane smene'}
                  </span>
                </div>
                <div className="sx-facrow__ready">
                  <span className="sx-label">Priprema</span>
                  <ReadyRoute steps={steps} compact onStep={(s) => navigate(`/security/objekti/${f._id}?tab=${s.tab}`)} />
                </div>
                <div className="sx-facrow__people">
                  <span className="sx-label">Ljudi</span>
                  <span className="sx-facrow__pv">{withCount(f.guardCount, 'radnik', 'radnika', 'radnika')}</span>
                  <span className="sx-facrow__nowsub">{f.coordinators.length ? `koordinator ${f.coordinators.map((c) => c.name.split(' ')[0]).join(', ')}` : 'bez koordinatora'}</span>
                </div>
                <span className="sx-facrow__go" aria-hidden="true"><ArrowRight size={16} strokeWidth={1.9} /></span>
              </div>
            );
          })}
        </div>
      )}
      {live.data && <p className="sx-facs__foot"><Led tone="ok" live /> Kolona Sada se osvežava sama · {agoText(live.updatedAt || now, now)}</p>}

      {creating && (
        <Dialog onClose={() => setCreating(false)} busy={busy} size="lg" eyebrow="Objekti" title="Novi objekat"
          description="Posle čuvanja otvara se objekat, pa redom dodaješ tagove, plan obilaska, radnike i adrese za izveštaj." testId="facility-modal">
          <FacilityForm onSave={create} onCancel={() => setCreating(false)} busy={busy} submitText="Dodaj objekat" autoFocus />
        </Dialog>
      )}
      {wizard && <TagWizard mode="create" facilityId={wizard.facilityId} prefillUid={wizard.uid || ''} onClose={() => { setWizard(null); unknown.reload(); all.reload(); refreshFacilities(); }} onDone={() => { unknown.reload(); all.reload(); }} />}
      <span className="sx-sr" aria-live="polite">{rows.length} {plural(rows.length, 'objekat', 'objekta', 'objekata')}</span>
    </div>
  );
}

