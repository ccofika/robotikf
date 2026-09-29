// Radnici obezbeđenja i koordinatori: brojke su ujedno filteri (na smeni, kasne, ugovor ili licenca
// ističe), pretraga, uloga, objekat; tabela sa stanjem "sada". Klik na radnika otvara dosije.
// Novi radnik dobija nalog za aplikaciju (ime + lozinka), a podaci za prijavu se kopiraju jednim klikom.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserPlus, KeyRound, Copy, Check } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll } from '../hooks';
import { cx, Btn, Avatar, Sign, Skeleton, telOf } from '../sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat, KV } from '../sx/layout';
import { Field, Input, Select, Choice, Switch, SearchField, DateField, NumberField, Checkbox, ToggleChips } from '../sx/forms';
import Dialog from '../sx/Dialog';
import { useToast } from '../sx/toast';
import { fmtDate, rsd } from '../lib/time';

const ROLE = { guard: 'Radnik obezbeđenja', coordinator: 'Koordinator objekta' };
const DAY = 86400000;
const FOCUS_TEXT = { on: 'na smeni sada', late: 'koji kasne na smenu', contract: 'kojima ugovor ističe za 30 dana', license: 'kojima licenca ističe za 60 dana' };

// Najbliži istek licence (u danima), null ako nema licenci sa rokom
export function licenseDaysLeft(w) {
  const d = (w.licenses || []).filter((l) => l.validUntil).map((l) => Math.ceil((new Date(l.validUntil) - Date.now()) / DAY));
  return d.length ? Math.min(...d) : null;
}
export const dutyStatus = (w) => (!w.isActive ? { tone: 'idle', text: 'neaktivan' }
  : w.duty && w.duty.status === 'on' ? { tone: 'ok', live: true, text: 'na smeni', sub: w.duty.facilityName }
    : w.duty && w.duty.status === 'late' ? { tone: 'bad', live: true, text: `kasni ${w.duty.minutes} min`, sub: w.duty.facilityName }
      : { tone: 'idle', text: 'nije na smeni' });

export default function Workers() {
  const { isAdmin, facilities, openWorker } = useSec();
  const [params, setParams] = useSearchParams();
  const [role, setRole] = useState('all');
  const [facility, setFacility] = useState('');
  const [q, setQ] = useState('');
  const [inactive, setInactive] = useState(false);
  const [focus, setFocus] = useState(params.get('filter') || '');
  const [creating, setCreating] = useState(params.get('novi') === '1');
  const list = usePoll(() => sec.workers({ active: inactive ? 'all' : undefined }), 30000, [inactive]);
  const all = useMemo(() => list.data || [], [list.data]);

  const counts = useMemo(() => ({
    on: all.filter((w) => w.duty && w.duty.status === 'on').length,
    late: all.filter((w) => w.duty && w.duty.status === 'late').length,
    contract: all.filter((w) => w.isActive && w.contractDaysLeft !== null && w.contractDaysLeft !== undefined && w.contractDaysLeft <= 30).length,
    license: all.filter((w) => w.isActive && licenseDaysLeft(w) !== null && licenseDaysLeft(w) <= 60).length,
    guard: all.filter((w) => w.role === 'guard').length,
    coordinator: all.filter((w) => w.role === 'coordinator').length
  }), [all]);

  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const rows = all.filter((w) => {
    if (role !== 'all' && w.role !== role) return false;
    if (facility && !(w.facilityIds || []).some((f) => f._id === facility)) return false;
    if (q && !fold(w.name).includes(fold(q)) && !(w.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))) return false;
    if (focus === 'on' && !(w.duty && w.duty.status === 'on')) return false;
    if (focus === 'late' && !(w.duty && w.duty.status === 'late')) return false;
    if (focus === 'contract' && !(w.contractDaysLeft !== null && w.contractDaysLeft !== undefined && w.contractDaysLeft <= 30)) return false;
    if (focus === 'license' && !(licenseDaysLeft(w) !== null && licenseDaysLeft(w) <= 60)) return false;
    return true;
  });
  const toggleFocus = (k) => setFocus(focus === k ? '' : k);
  const closeCreate = () => { setCreating(false); if (params.get('novi')) { const n = new URLSearchParams(params); n.delete('novi'); setParams(n, { replace: true }); } };

  return (
    <div className="sx-page sx-workers" data-testid="page-workers">
      <PageHead
        eyebrow="Security · Radnici"
        title="Radnici"
        lead="Radnici obezbeđenja i koordinatori objekata. Klik na radnika otvara dosije: kašnjenja, alarmi, beleške, licence, ugovor i smene."
        actions={isAdmin ? <Btn variant="primary" icon={UserPlus} onClick={() => setCreating(true)} data-testid="add-worker">Novi radnik</Btn> : null}
      />

      <div className="sx-stats">
        <Stat label="Na smeni sada" value={counts.on} tone={counts.on ? 'ok' : null} sub="prijavljeni NFC tagom" onClick={() => toggleFocus('on')} selected={focus === 'on'} testId="kpi-on" />
        <Stat label="Kasne na smenu" value={counts.late} tone={counts.late ? 'bad' : null} sub={counts.late ? 'nisu se prijavili' : 'svi su stigli'} onClick={() => toggleFocus('late')} selected={focus === 'late'} testId="kpi-late" />
        <Stat label="Ugovor ističe" value={counts.contract} tone={counts.contract ? 'warn' : null} sub="u narednih 30 dana" onClick={() => toggleFocus('contract')} selected={focus === 'contract'} testId="kpi-contract" />
        <Stat label="Licenca ističe" value={counts.license} tone={counts.license ? 'warn' : null} sub="u narednih 60 dana" onClick={() => toggleFocus('license')} selected={focus === 'license'} testId="kpi-license" />
      </div>

      <Toolbar testId="workers-toolbar">
        <SearchField value={q} onChange={setQ} placeholder="Ime ili telefon" testId="worker-search" />
        <Choice size="sm" label="Uloga" value={role} onChange={setRole} layoutId="sx-workers-role"
          options={[{ value: 'all', label: 'Svi', count: all.length }, { value: 'guard', label: 'Radnici', count: counts.guard }, { value: 'coordinator', label: 'Koordinatori', count: counts.coordinator }]} />
        <div className="sx-toolbar__end">
          <Select size="sm" value={facility} onChange={(e) => setFacility(e.target.value)} aria-label="Objekat" data-testid="worker-facility">
            <option value="">Svi objekti</option>
            {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </Select>
          <Switch checked={inactive} onChange={setInactive} label="Prikaži i neaktivne" testId="show-inactive">Neaktivni</Switch>
        </div>
      </Toolbar>

      {focus && <Note tone="info" className="sx-mb" actions={<Btn size="sm" onClick={() => setFocus('')}>Prikaži sve</Btn>}>Prikazani su samo radnici {FOCUS_TEXT[focus]}.</Note>}

      <Panel pad={false} testId="workers-panel">
        {list.loading && !list.data ? <div className="sx-stack" style={{ padding: 20 }}><Skeleton h={44} /><Skeleton h={44} /><Skeleton h={44} /></div> : !rows.length ? (
          <div className="sx-empty-block">
            <b>{all.length ? 'Nema radnika za ovaj filter' : 'Još nema radnika'}</b>
            <span>{all.length ? 'Promeni pretragu ili filter.' : 'Dodaj radnika: dobija nalog za aplikaciju Robotik i prijavljuje se imenom i lozinkom.'}</span>
            {!all.length && isAdmin && <Btn variant="primary" icon={UserPlus} onClick={() => setCreating(true)}>Novi radnik</Btn>}
          </div>
        ) : (
          <div className="sx-tablewrap">
            <table className="sx-table" data-testid="workers-table">
              <thead><tr><th>Radnik</th><th>Sada</th><th>Objekti</th><th>Telefon</th><th>Ugovor</th><th>Licenca</th>{isAdmin && <th className="is-num">Satnica</th>}</tr></thead>
              <tbody>
                {rows.map((w, i) => {
                  const st = dutyStatus(w);
                  const lic = licenseDaysLeft(w);
                  const cd = w.contractDaysLeft;
                  return (
                    <tr key={w._id} className={cx('is-click', !w.isActive && 'is-dim')} style={{ '--i': i }} tabIndex={0}
                      onClick={() => openWorker(w._id)} onKeyDown={(e) => { if (e.key === 'Enter') openWorker(w._id); }} data-testid="worker-row">
                      <td className="is-head"><div className="sx-cell sx-cell--who"><Avatar name={w.name} /><b>{w.name}</b><span>{ROLE[w.role]}</span></div></td>
                      <td data-label="Sada"><Sign tone={st.tone} live={st.live} sub={st.sub ? ` · ${st.sub}` : null}>{st.text}</Sign></td>
                      <td data-label="Objekti" className="is-wide"><span className="sx-cell__clip">{(w.facilityIds || []).map((f) => f.name).join(', ') || <span className="sx-faint">nije dodeljen</span>}</span></td>
                      <td data-label="Telefon">{w.phone ? <a className="sx-mono sx-nowrap" href={telOf(w.phone)} onClick={(e) => e.stopPropagation()}>{w.phone}</a> : <span className="sx-faint">-</span>}</td>
                      <td data-label="Ugovor">{!w.contract || !w.contract.until ? <span className="sx-faint">{w.contract && w.contract.from ? 'na neodređeno' : '-'}</span> : (
                        cd <= 30 ? <Sign tone={cd < 0 ? 'bad' : 'warn'} sub={cd < 0 ? ' · istekao' : ` · za ${cd} d`}><span className="sx-mono">{fmtDate(w.contract.until)}</span></Sign>
                        : <span className="sx-datecell"><span className="sx-mono">{fmtDate(w.contract.until)}</span><small>za {cd} d</small></span>
                      )}</td>
                      <td data-label="Licenca">{lic === null ? <span className="sx-faint">{(w.licenses || []).length ? 'bez roka' : 'nema'}</span> : <Sign tone={lic < 0 ? 'bad' : lic <= 60 ? 'warn' : 'ok'}>{lic < 0 ? 'istekla' : `još ${lic} d`}</Sign>}</td>
                      {isAdmin && <td data-label="Satnica" className="is-num">{w.hourlyRate != null ? rsd(w.hourlyRate) : <span className="sx-faint">podrazumevana</span>}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && <NewWorkerDialog onClose={closeCreate} onCreated={(w) => { list.reload(); openWorker(w._id); }} />}
    </div>
  );
}

const genPassword = () => {
  const words = ['sova', 'kula', 'most', 'reka', 'sever', 'jug', 'zora', 'stena', 'luka', 'grad'];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}`;
};

export function NewWorkerDialog({ onClose, onCreated }) {
  const { facilities } = useSec();
  const toast = useToast();
  const [f, setF] = useState({ name: '', role: 'guard', password: genPassword(), phone: '', email: '', facilityIds: [], from: '', until: '', indefinite: false, hourlyRate: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setBusy(true);
    try {
      const w = await sec.createWorker({
        name: f.name.trim(), role: f.role, password: f.password, phone: f.phone, email: f.email, facilityIds: f.facilityIds,
        contract: { from: f.from || null, until: f.indefinite ? null : f.until || null }, hourlyRate: f.hourlyRate === '' ? null : Number(f.hourlyRate)
      });
      setDone(w); if (onCreated) onCreated(w);
    } catch (e) { toast.bad('Radnik nije dodat', errText(e)); } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`Robotik aplikacija\nIme: ${done.name}\nLozinka: ${f.password}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { toast.warn('Kopiranje nije uspelo', 'Prepiši podatke ručno.'); }
  };

  if (done) {
    return (
      <Dialog onClose={onClose} eyebrow="Nalog za aplikaciju" title="Radnik je dodat" size="md" testId="worker-created"
        description={done.role === 'guard' ? 'Radnik instalira aplikaciju Robotik na Android telefon i prijavljuje se ovim imenom i lozinkom.' : 'Koordinator se prijavljuje na sajt ovim imenom i lozinkom i vidi samo svoje objekte.'}
        footer={<><Btn icon={copied ? Check : Copy} onClick={copy} data-testid="copy-credentials">{copied ? 'Kopirano' : 'Kopiraj podatke za prijavu'}</Btn><Btn variant="primary" onClick={onClose}>Gotovo</Btn></>}>
        <div className="sx-cred">
          <KV items={[
            { k: 'Ime za prijavu', v: <b>{done.name}</b> },
            { k: 'Lozinka', v: <b className="sx-mono" data-testid="created-password">{f.password}</b> },
            { k: 'Uloga', v: ROLE[done.role] }
          ]} />
        </div>
        <p className="sx-field__hint sx-mt">Lozinku možeš da promeniš u dosijeu radnika, na kartici Nalog.</p>
      </Dialog>
    );
  }
  const nameOk = f.name.trim().split(/\s+/).length >= 2;
  const datesOk = !f.until || !f.from || f.until >= f.from;
  const valid = nameOk && f.password.length >= 6 && datesOk;
  return (
    <Dialog onClose={onClose} busy={busy} size="lg" eyebrow="Radnici" title="Novi radnik" testId="worker-modal"
      description="Radnik dobija nalog za aplikaciju. Objekte, ugovor i satnicu možeš da menjaš i kasnije u dosijeu."
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>Odustani</Btn><Btn variant="primary" icon={UserPlus} onClick={submit} busy={busy} disabled={!valid} data-testid="worker-save">Dodaj radnika</Btn></>}>
      <div className="sx-fieldset" style={{ paddingTop: 0 }}>
        <Field label="Uloga">
          <Choice label="Uloga" value={f.role} onChange={(v) => setF({ ...f, role: v })} layoutId="sx-new-role"
            options={[{ value: 'guard', label: 'Radnik obezbeđenja', testId: 'role-guard' }, { value: 'coordinator', label: 'Koordinator objekta', testId: 'role-coordinator' }]} />
        </Field>
      </div>
      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">Nalog</h3>
        <div className="sx-form">
          <Field label="Ime i prezime" wide hint="Njime se prijavljuje u aplikaciju, mora biti jedinstveno." error={f.name && !nameOk ? 'Upiši ime i prezime.' : null}>
            <Input autoFocus value={f.name} onChange={set('name')} placeholder="Npr. Stefan Jovanović" data-testid="worker-name" />
          </Field>
          <Field label="Lozinka" hint="Najmanje 6 znakova.">
            <div className="sx-inline"><Input mono value={f.password} onChange={set('password')} data-testid="worker-password" aria-label="Lozinka" /><Btn icon={KeyRound} onClick={() => setF({ ...f, password: genPassword() })} title="Nova lozinka" aria-label="Nova lozinka" /></div>
          </Field>
        </div>
      </div>
      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">Kontakt i ugovor</h3>
        <div className="sx-form">
          <Field label="Telefon"><Input value={f.phone} onChange={set('phone')} placeholder="06x ..." inputMode="tel" data-testid="worker-phone" /></Field>
          <Field label="Email" hint="Nije obavezan."><Input type="email" value={f.email} onChange={set('email')} placeholder="ime@primer.rs" /></Field>
          <Field label="Ugovor od"><DateField value={f.from} onChange={(v) => setF({ ...f, from: v })} clearable testId="worker-contract-from" aria-label="Ugovor od" /></Field>
          <Field label="Ugovor do" error={!datesOk ? 'Ugovor ne može da ističe pre početka.' : null} hint={f.until && !f.indefinite ? 'Adminima stiže alarm pre isteka.' : null}>
            <DateField value={f.indefinite ? '' : f.until} onChange={(v) => setF({ ...f, until: v })} disabled={f.indefinite} clearable min={f.from || undefined} testId="worker-contract-until" aria-label="Ugovor do" />
            <Checkbox checked={f.indefinite} onChange={(v) => setF({ ...f, indefinite: v })}>na neodređeno</Checkbox>
          </Field>
          <Field label="Satnica" hint="Prazno znači podrazumevana."><NumberField value={f.hourlyRate} onChange={(v) => setF({ ...f, hourlyRate: v })} min={0} suffix="RSD/h" width={96} placeholder="podrazumevana" aria-label="Satnica" /></Field>
        </div>
      </div>
      <div className="sx-fieldset">
        <h3 className="sx-fieldset__title">{f.role === 'guard' ? 'Objekti na kojima radi' : 'Objekti koje vodi'}</h3>
        <p className="sx-fieldset__sub">{f.role === 'coordinator' ? 'Koordinator vidi samo ove objekte i dobija njihove MASTER alarme.' : 'Može i kasnije, na stranici objekta.'}</p>
        <ToggleChips label="Objekti" options={facilities.map((x) => ({ value: x._id, label: x.name }))} value={f.facilityIds} onChange={(v) => setF({ ...f, facilityIds: v })} testId="worker-fac" empty="Još nema objekata." />
      </div>
    </Dialog>
  );
}

