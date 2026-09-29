// Dosije radnika (fioka sa bilo koje stranice, ?radnik=ID): brojke za 30 dana, pa tabovi
// Dosije (hronologija + beleška), Podaci (lični, ugovor, satnica, objekti), Licence i dokumenti,
// Smene (sledeće i poslednjih 30 dana) i Nalog (aktivan, lozinka, uloga; samo administrator).
import React, { useCallback, useEffect, useState } from 'react';
import { Phone, Send, Upload, FileText, Download, Trash2, Plus, KeyRound, Copy, Check, Sun, Moon, Pencil, Smartphone, UserX, UserCheck, ShieldCheck } from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import Sheet, { SheetSection } from '../sx/Sheet';
import Dialog from '../sx/Dialog';
import { cx, Btn, Led, Sign, Skeleton, telOf, withCount } from '../sx/ui';
import { Tabs, Note, KV, Stat } from '../sx/layout';
import { Field, Input, Textarea, Choice, Switch, DateField, NumberField, Checkbox, ToggleChips, FileButton } from '../sx/forms';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import { fmtDate, fmtDateTime, hm, dayWord, rsd } from '../lib/time';

const DAY = 86400000;
const KIND = { late: 'Kašnjenje', master: 'MASTER ALARM', cp_late: 'Obilazak', cp_snooze: 'Odložen alarm', cp_admin: 'Obilazak, alarm adminu', early_leave: 'Rana odjava', no_clock_out: 'Bez odjave', missed: 'Propuštena smena', contract: 'Ugovor', license: 'Licenca', note: 'Beleška' };
const FILTERS = [
  { value: 'all', label: 'Sve' },
  { value: 'late', label: 'Kašnjenja', kinds: ['late', 'missed', 'early_leave', 'no_clock_out'] },
  { value: 'alarm', label: 'Alarmi', kinds: ['master', 'cp_late', 'cp_snooze', 'cp_admin'] },
  { value: 'note', label: 'Beleške', kinds: ['note'] },
  { value: 'docs', label: 'Ugovor i licence', kinds: ['contract', 'license'] }
];
const LEVEL_TONE = { critical: 'bad', warn: 'warn', ok: 'ok', info: 'info' };
const LICENSE_TYPES = ['Službenik obezbeđenja bez oružja', 'Službenik obezbeđenja sa oružjem', 'Lekarsko uverenje', 'Protivpožarna obuka', 'Prva pomoć'];
const ymdInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const daysLeft = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / DAY) : null);

export default function WorkerDrawer({ id, onClose }) {
  const { isAdmin } = useSec();
  const toast = useToast();
  const [w, setW] = useState(null);
  const [tab, setTab] = useState('dosije');
  const load = useCallback(() => (id ? sec.worker(id).then(setW).catch((e) => { toast.bad('Dosije nije učitan', errText(e)); onClose(); }) : null), [id, toast, onClose]);
  useEffect(() => { if (id) { setW(null); setTab('dosije'); load(); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tabs = w ? [
    { key: 'dosije', label: 'Dosije', count: (w.dossier || []).length, testId: 'wd-tab-dosije' },
    { key: 'podaci', label: 'Podaci', testId: 'wd-tab-podaci' },
    { key: 'licence', label: 'Licence', count: (w.licenses || []).length, tone: (w.licenses || []).some((l) => l.validUntil && daysLeft(l.validUntil) <= 60) ? 'warn' : null, testId: 'wd-tab-licence' },
    { key: 'smene', label: 'Smene', count: (w.upcomingShifts || []).length, testId: 'wd-tab-smene' },
    ...(isAdmin ? [{ key: 'nalog', label: 'Nalog', testId: 'wd-tab-nalog' }] : [])
  ] : [];
  const cd = w ? w.contractDaysLeft : null;
  const tel = w && telOf(w.phone);

  return (
    <Sheet open={!!id} onClose={onClose} size="lg" testId="worker-drawer"
      eyebrow={w ? `${w.role === 'coordinator' ? 'Koordinator' : 'Radnik obezbeđenja'}${(w.facilityIds || []).length ? ` · ${w.facilityIds.map((f) => f.name).join(', ')}` : ''}` : 'Dosije'}
      title={w ? <span data-testid="worker-drawer-name">{w.name}</span> : 'Učitavanje'}
      meta={w && <>
        {!w.isActive ? <Sign tone="idle">neaktivan nalog</Sign> : <Sign tone="ok">aktivan nalog</Sign>}
        {w.phone && <a className="sx-mono" href={tel}>{w.phone}</a>}
        {w.role === 'guard' && <span className="sx-sheet__when"><Smartphone size={14} strokeWidth={1.9} aria-hidden="true" />{w.appConnected ? 'aplikacija povezana' : 'aplikacija nije povezana'}</span>}
      </>}
      actions={w && tel ? <Btn size="sm" icon={Phone} href={tel}>Pozovi</Btn> : null}
      tabs={w && <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Delovi dosijea" layoutId="sx-wd-tabs" />}
    >
      {!w ? <div className="sx-stack"><Skeleton h={84} r={16} /><Skeleton h={220} r={16} /></div> : (
        <>
          <div className="sx-stats sx-wd__stats">
            <Stat label="Smene, 30 d" value={w.stats.shifts30} />
            <Stat label="Sati, 30 d" value={w.stats.hours30} small=" h" />
            <Stat label="Kašnjenja" value={w.stats.late30} tone={w.stats.late30 ? 'warn' : null} />
            <Stat label="Master i propuštene" value={w.stats.master30 + w.stats.missed30} tone={w.stats.master30 + w.stats.missed30 ? 'bad' : null} />
          </div>
          {cd !== null && cd <= 30 && <Note tone={cd < 0 ? 'bad' : 'warn'} className="sx-mb" testId="contract-warning">{cd < 0 ? `Ugovor je istekao ${fmtDate(w.contract.until)}.` : `Ugovor ističe ${fmtDate(w.contract.until)}, za ${withCount(cd, 'dan', 'dana', 'dana')}.`}{isAdmin && ' Produži ga na kartici Podaci.'}</Note>}
          <div key={tab} className="sx-wd__body">
            {tab === 'dosije' && <DossierTab w={w} reload={load} />}
            {tab === 'podaci' && <DataTab w={w} reload={load} isAdmin={isAdmin} />}
            {tab === 'licence' && <LicensesTab w={w} reload={load} isAdmin={isAdmin} />}
            {tab === 'smene' && <ShiftsTab w={w} />}
            {tab === 'nalog' && isAdmin && <AccountTab w={w} reload={load} />}
          </div>
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- dosije
function DossierTab({ w, reload }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    try { await sec.addDossierNote(w._id, text.trim()); setText(''); toast.ok('Beleška je upisana u dosije'); reload(); } catch (e) { toast.bad('Beleška nije upisana', errText(e)); } finally { setBusy(false); }
  };
  const f = FILTERS.find((x) => x.value === filter);
  const all = w.dossier || [];
  const list = all.filter((d) => !f.kinds || f.kinds.includes(d.kind));
  return (
    <>
      <SheetSection title="Nova beleška">
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= 3) add(); }}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Npr. razgovor posle kašnjenja, pohvala, upozorenje" data-testid="dossier-text"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim().length >= 3) add(); }} />
          <div className="sx-wd__composer">
            <span className="sx-field__hint">Upis ostaje trajno, sa tvojim imenom i vremenom.</span>
            <Btn type="submit" size="sm" variant="primary" icon={Send} disabled={text.trim().length < 3} busy={busy} data-testid="dossier-add">Upiši u dosije</Btn>
          </div>
        </form>
      </SheetSection>
      <SheetSection title="Hronologija" aside={<Choice size="sm" scroll label="Vrsta upisa" value={filter} onChange={setFilter} layoutId="sx-wd-filter"
        options={FILTERS.map((x) => ({ value: x.value, label: x.label, count: x.kinds ? all.filter((d) => x.kinds.includes(d.kind)).length : all.length }))} />}>
        {!list.length ? <p className="sx-ssec__lead">{filter === 'all' ? 'Dosije se puni sam: kašnjenja, alarmi, odlaganja i propuštene smene. Možeš dodati i belešku.' : 'Nema upisa ove vrste.'}</p> : (
          <ol className="sx-tl" data-testid="dossier-list">
            {list.map((d, i) => (
              <li key={d._id} className="sx-tl__item" style={{ '--i': i }}>
                <span className="sx-tl__mark"><Led tone={LEVEL_TONE[d.level] || 'idle'} /></span>
                <div className="sx-tl__body">
                  <span className="sx-tl__title"><span className="sx-tl__kind">{KIND[d.kind] || d.kind}</span>{d.text}</span>
                  <span className="sx-tl__meta"><span className="sx-mono">{fmtDateTime(d.at)}</span>{d.facilityName ? ` · ${d.facilityName}` : ''}{d.byName ? ` · ${d.byName}` : ''}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SheetSection>
    </>
  );
}

// ---------------------------------------------------------------- podaci
function DataTab({ w, reload, isAdmin }) {
  const { facilities } = useSec();
  const toast = useToast();
  const init = () => ({ name: w.name, phone: w.phone || '', email: w.email || '', address: w.address || '', birthDate: ymdInput(w.birthDate), jmbg: w.jmbg || '', notes: w.notes || '', from: ymdInput(w.contract && w.contract.from), until: ymdInput(w.contract && w.contract.until), indefinite: !!(w.contract && w.contract.from && !w.contract.until), hourlyRate: w.hourlyRate ?? '', facilityIds: (w.facilityIds || []).map((x) => x._id) });
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(init()), [w]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dirty = JSON.stringify(f) !== JSON.stringify(init());
  const ro = !isAdmin;
  const extend = (m) => { const base = f.until && new Date(f.until) > new Date() ? new Date(f.until) : new Date(); base.setMonth(base.getMonth() + m); setF({ ...f, indefinite: false, until: base.toISOString().slice(0, 10) }); };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name, phone: f.phone, email: f.email, address: f.address, birthDate: f.birthDate || null, notes: f.notes, contract: { from: f.from || null, until: f.indefinite ? null : f.until || null }, hourlyRate: f.hourlyRate === '' ? null : Number(f.hourlyRate), facilityIds: f.facilityIds };
      if (!/^•/.test(f.jmbg)) body.jmbg = f.jmbg;
      await sec.updateWorker(w._id, body); toast.ok('Podaci su sačuvani'); reload();
    } catch (e) { toast.bad('Podaci nisu sačuvani', errText(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <SheetSection title="Lični podaci">
        <div className="sx-form">
          <Field label="Ime i prezime" wide><Input value={f.name} onChange={set('name')} disabled={ro} data-testid="wd-name" /></Field>
          <Field label="Telefon"><Input value={f.phone} onChange={set('phone')} disabled={ro} inputMode="tel" data-testid="wd-phone" /></Field>
          <Field label="Email"><Input value={f.email} onChange={set('email')} disabled={ro} /></Field>
          <Field label="Adresa" wide><Input value={f.address} onChange={set('address')} disabled={ro} /></Field>
          <Field label="Datum rođenja"><DateField value={f.birthDate} onChange={(v) => setF({ ...f, birthDate: v })} disabled={ro} clearable aria-label="Datum rođenja" /></Field>
          <Field label="JMBG"><Input mono value={f.jmbg} onChange={set('jmbg')} disabled={ro} maxLength={13} inputMode="numeric" /></Field>
        </div>
      </SheetSection>
      <SheetSection title="Ugovor">
        <div className="sx-form">
          <Field label="Od"><DateField value={f.from} onChange={(v) => setF({ ...f, from: v })} disabled={ro} clearable testId="wd-contract-from" aria-label="Ugovor od" /></Field>
          <Field label="Do"><DateField value={f.indefinite ? '' : f.until} onChange={(v) => setF({ ...f, until: v })} disabled={ro || f.indefinite} clearable testId="wd-contract-until" aria-label="Ugovor do" /></Field>
        </div>
        {!ro && (
          <div className="sx-inline sx-mt">
            <Checkbox checked={f.indefinite} onChange={(v) => setF({ ...f, indefinite: v })}>na neodređeno</Checkbox>
            {!f.indefinite && <span className="sx-wd__extend">Produži za {[3, 6, 12].map((m) => <Btn key={m} size="sm" variant="ghost" onClick={() => extend(m)} data-testid={`extend-${m}`}>+{m} mes.</Btn>)}</span>}
          </div>
        )}
        <p className="sx-field__hint sx-mt">Adminima stiže alarm pre isteka ugovora. Rok se podešava na stranici Alarmi.</p>
      </SheetSection>
      {isAdmin && (
        <SheetSection title="Satnica">
          <Field hint="Prazno znači podrazumevana satnica iz obračuna."><NumberField value={f.hourlyRate} onChange={(v) => setF({ ...f, hourlyRate: v })} min={0} suffix="RSD/h" width={100} placeholder="podrazumevana" testId="wd-rate" aria-label="Satnica" /></Field>
        </SheetSection>
      )}
      <SheetSection title={w.role === 'coordinator' ? 'Objekti koje vodi' : 'Objekti na kojima radi'}>
        <ToggleChips label="Objekti" options={facilities.map((x) => ({ value: x._id, label: x.name }))} value={f.facilityIds} onChange={(v) => setF({ ...f, facilityIds: v })} disabled={ro} />
      </SheetSection>
      <SheetSection title="Napomena"><Textarea rows={3} value={f.notes} onChange={set('notes')} disabled={ro} /></SheetSection>
      {isAdmin && dirty && (
        <div className="sx-savebar" role="region" aria-label="Nesačuvane izmene">
          <Led tone="warn" />
          <span className="sx-savebar__text">Podaci su izmenjeni i nisu sačuvani.</span>
          <div className="sx-savebar__actions">
            <Btn variant="ghost" size="sm" onClick={() => setF(init())} disabled={busy}>Poništi</Btn>
            <Btn variant="primary" size="sm" onClick={save} busy={busy} disabled={f.name.trim().length < 3} data-testid="wd-save">Sačuvaj podatke</Btn>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- licence i dokumenti
async function openFile(workerId, fileId, name, toast) {
  try {
    const r = await sec.workerFile(workerId, fileId);
    const type = r.headers && r.headers['content-type'];
    const url = URL.createObjectURL(new Blob([r.data], { type }));
    if (/pdf|image/.test(type || '')) window.open(url, '_blank', 'noopener');
    else { const a = document.createElement('a'); a.href = url; a.download = name || 'dokument'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { toast.bad('Fajl nije otvoren', errText(e)); }
}

function LicenseDialog({ w, edit, setEdit, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      ['type', 'number', 'issuedAt', 'validUntil'].forEach((k) => form.append(k, edit[k] || ''));
      if (edit.file) form.append('file', edit.file);
      if (edit._id) await sec.updateLicense(w._id, edit._id, form); else await sec.addLicense(w._id, form);
      toast.ok(edit._id ? 'Licenca je izmenjena' : 'Licenca je dodata'); setEdit(null); onSaved();
    } catch (e) { toast.bad('Licenca nije sačuvana', errText(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog onClose={() => setEdit(null)} busy={busy} eyebrow={w.name} title={edit._id ? 'Izmeni licencu' : 'Nova licenca'} testId="license-modal"
      footer={<><Btn variant="ghost" onClick={() => setEdit(null)} disabled={busy}>Odustani</Btn><Btn variant="primary" onClick={save} busy={busy} disabled={edit.type.trim().length < 2} data-testid="license-save">Sačuvaj licencu</Btn></>}>
      <Field label="Vrsta"><Input autoFocus value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} placeholder="Izaberi ispod ili upiši" data-testid="license-type" /></Field>
      <div className="sx-suggest" aria-label="Česte vrste">{LICENSE_TYPES.map((t) => <button type="button" key={t} onClick={() => setEdit({ ...edit, type: t })}>{t}</button>)}</div>
      <div className="sx-form sx-mt">
        <Field label="Broj"><Input mono value={edit.number} onChange={(e) => setEdit({ ...edit, number: e.target.value })} /></Field>
        <Field label="Izdata"><DateField value={edit.issuedAt} onChange={(v) => setEdit({ ...edit, issuedAt: v })} clearable aria-label="Izdata" /></Field>
        <Field label="Važi do" hint="Prazno znači bez roka."><DateField value={edit.validUntil} onChange={(v) => setEdit({ ...edit, validUntil: v })} clearable testId="license-until" aria-label="Važi do" /></Field>
      </div>
      <Field label="Skeniran dokument" hint="Nije obavezan. PDF ili slika." className="sx-mt">
        <div className="sx-inline"><FileButton accept="image/*,application/pdf" icon={Upload} onFile={(file) => setEdit({ ...edit, file })}>{edit.file ? 'Izaberi drugi' : 'Izaberi fajl'}</FileButton>{edit.file && <span className="sx-field__hint">{edit.file.name}</span>}</div>
      </Field>
    </Dialog>
  );
}

function LicensesTab({ w, reload, isAdmin }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [docName, setDocName] = useState('');
  const delLicense = async (l) => {
    if (!(await confirm({ eyebrow: w.name, title: 'Obriši licencu?', text: `${l.type}${l.number ? ` · ${l.number}` : ''}. Briše se i skenirani dokument.`, tone: 'danger', confirmLabel: 'Obriši licencu' }))) return;
    try { await sec.deleteLicense(w._id, l._id); toast.ok('Licenca je obrisana'); reload(); } catch (e) { toast.bad('Licenca nije obrisana', errText(e)); }
  };
  const uploadDoc = async (file) => {
    const form = new FormData(); form.append('file', file); form.append('name', docName || file.name);
    try { await sec.addDocument(w._id, form); toast.ok('Dokument je dodat', docName || file.name); setDocName(''); reload(); } catch (e) { toast.bad('Dokument nije dodat', errText(e)); }
  };
  const delDoc = async (d) => {
    if (!(await confirm({ eyebrow: w.name, title: 'Obriši dokument?', text: d.name, tone: 'danger', confirmLabel: 'Obriši dokument' }))) return;
    try { await sec.deleteDocument(w._id, d._id); toast.ok('Dokument je obrisan'); reload(); } catch (e) { toast.bad('Dokument nije obrisan', errText(e)); }
  };
  return (
    <>
      <SheetSection title="Licence i uverenja" aside={isAdmin && <Btn size="sm" variant="primary" icon={Plus} onClick={() => setEdit({ type: '', number: '', issuedAt: '', validUntil: '' })} data-testid="license-add">Dodaj licencu</Btn>}>
        {!(w.licenses || []).length ? <p className="sx-ssec__lead">Nema licenci. Za licencu sa rokom, adminima stiže alarm pre isteka.</p> : (
          <div className="sx-list">
            {w.licenses.map((l) => {
              const dl = daysLeft(l.validUntil);
              const tone = dl === null ? 'idle' : dl < 0 ? 'bad' : dl <= 60 ? 'warn' : 'ok';
              return (
                <div key={l._id} className="sx-item" data-testid="license-row">
                  <span className={cx('sx-item__icon', tone === 'ok' && 'is-ink', tone === 'warn' && 'is-warn', tone === 'bad' && 'is-bad')}><ShieldCheck size={17} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div className="sx-item__main">
                    <b>{l.type}</b>
                    <span>{l.number ? <span className="sx-mono">{l.number}</span> : 'bez broja'}{l.issuedAt ? ` · izdata ${fmtDate(l.issuedAt)}` : ''}</span>
                    <Sign tone={tone}>{l.validUntil ? `važi do ${fmtDate(l.validUntil)}${dl < 0 ? ', istekla' : `, još ${dl} d`}` : 'bez roka važenja'}</Sign>
                  </div>
                  <div className="sx-item__side">
                    {l.docUrl && <Btn size="sm" icon={FileText} onClick={() => openFile(w._id, l._id, l.docName, toast)} title={l.docName}>Dokument</Btn>}
                    {isAdmin && <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => setEdit({ _id: l._id, type: l.type, number: l.number, issuedAt: ymdInput(l.issuedAt), validUntil: ymdInput(l.validUntil) })} aria-label="Izmeni licencu" title="Izmeni" />}
                    {isAdmin && <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => delLicense(l)} aria-label="Obriši licencu" title="Obriši" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetSection>
      <SheetSection title="Dokumenti">
        {isAdmin && (
          <div className="sx-inline sx-mb">
            <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Naziv, npr. Ugovor o radu 2026" data-testid="doc-name" aria-label="Naziv dokumenta" />
            <FileButton icon={Upload} onFile={uploadDoc} testId="doc-file">Otpremi fajl</FileButton>
          </div>
        )}
        {!(w.documents || []).length ? <p className="sx-ssec__lead">Nema dokumenata. Ugovor, lekarsko, uverenja: PDF ili slika do 15 MB.</p> : (
          <div className="sx-list">
            {w.documents.map((d) => (
              <div key={d._id} className="sx-item" data-testid="doc-row">
                <span className="sx-item__icon"><FileText size={17} strokeWidth={1.9} aria-hidden="true" /></span>
                <div className="sx-item__main"><b>{d.name}</b><span>{fmtDate(d.uploadedAt)}{d.fileSize ? ` · ${(d.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}</span></div>
                <div className="sx-item__side">
                  <Btn size="sm" icon={Download} onClick={() => openFile(w._id, d._id, d.name, toast)}>Otvori</Btn>
                  {isAdmin && <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => delDoc(d)} aria-label="Obriši dokument" title="Obriši" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetSection>
      {edit && <LicenseDialog w={w} edit={edit} setEdit={setEdit} onSaved={reload} />}
    </>
  );
}

// ---------------------------------------------------------------- smene
function ShiftRow({ s, onOpen }) {
  const Icon = s.type === 'night' ? Moon : Sun;
  const st = s.status === 'done' ? (s.lateMin ? { tone: 'warn', text: `kasnio ${s.lateMin} min` } : { tone: 'ok', text: 'uredno' })
    : s.status === 'active' ? { tone: 'ok', live: true, text: 'u toku' } : s.status === 'missed' ? { tone: 'bad', text: 'propuštena' }
      : s.published ? { tone: 'info', text: 'objavljena' } : { tone: 'idle', text: 'nacrt' };
  return (
    <div className="sx-item is-click" role="button" tabIndex={0} onClick={() => onOpen(s._id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(s._id); }} data-testid="wd-shift">
      <span className={cx('sx-item__icon', s.type === 'night' && 'is-ink')}><Icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
      <div className="sx-item__main">
        <b>{dayWord(s.date)} · <span className="sx-mono">{hm(s.plannedStart)}-{hm(s.plannedEnd)}</span></b>
        <span>{s.facilityId ? s.facilityId.name : ''}{s.clockIn ? ` · prijava ${hm(s.clockIn.at)}` : ''}{s.clockOut ? ` · odjava ${hm(s.clockOut.at)}` : ''}</span>
      </div>
      <div className="sx-item__side"><Sign tone={st.tone} live={st.live}>{st.text}</Sign></div>
    </div>
  );
}

function ShiftsTab({ w }) {
  const { openShift } = useSec();
  return (
    <>
      <SheetSection title="Sledeće smene">
        {(w.upcomingShifts || []).length ? <div className="sx-list">{w.upcomingShifts.map((s) => <ShiftRow key={s._id} s={s} onOpen={openShift} />)}</div> : <p className="sx-ssec__lead">Nema zakazanih smena.</p>}
      </SheetSection>
      <SheetSection title="Poslednjih 30 dana">
        {(w.recentShifts || []).length ? <div className="sx-list">{w.recentShifts.map((s) => <ShiftRow key={s._id} s={s} onOpen={openShift} />)}</div> : <p className="sx-ssec__lead">Nema smena u poslednjih 30 dana.</p>}
      </SheetSection>
    </>
  );
}

// ---------------------------------------------------------------- nalog
function AccountTab({ w, reload }) {
  const toast = useToast();
  const [pwd, setPwd] = useState('');
  const [shown, setShown] = useState(null);
  const [copied, setCopied] = useState(false);
  const gen = () => `${['sova', 'kula', 'most', 'reka', 'zora', 'luka'][Math.floor(Math.random() * 6)]}${Math.floor(1000 + Math.random() * 9000)}`;
  const savePwd = async () => {
    try { await sec.updateWorker(w._id, { password: pwd }); setShown(pwd); setPwd(''); toast.ok('Lozinka je promenjena', 'Radnik se od sada prijavljuje novom lozinkom.'); } catch (e) { toast.bad('Lozinka nije promenjena', errText(e)); }
  };
  const toggleActive = async () => {
    const ok = await confirm(w.isActive
      ? { eyebrow: w.name, title: 'Deaktiviraj nalog?', text: 'Radnik više ne može da se prijavi i ne dobija obaveštenja. Dosije, smene i izveštaji ostaju, a nalog možeš ponovo da aktiviraš.', tone: 'danger', confirmLabel: 'Deaktiviraj nalog' }
      : { eyebrow: w.name, title: 'Aktiviraj nalog?', text: 'Radnik ponovo može da se prijavi u aplikaciju.', confirmLabel: 'Aktiviraj nalog' });
    if (!ok) return;
    try { await sec.setWorkerActive(w._id, !w.isActive); toast.ok(w.isActive ? 'Nalog je deaktiviran' : 'Nalog je aktiviran'); reload(); window.dispatchEvent(new Event('sec:changed')); } catch (e) { toast.bad('Nije uspelo', errText(e)); }
  };
  const switchRole = async () => {
    const to = w.role === 'guard' ? 'coordinator' : 'guard';
    const ok = await confirm({ eyebrow: w.name, title: to === 'coordinator' ? 'Promeni u koordinatora?' : 'Promeni u radnika obezbeđenja?', text: to === 'coordinator' ? 'Prijavljuje se na sajt, vodi svoje objekte i dobija MASTER alarme. Buduće smene ostaju u rasporedu.' : 'Koristi aplikaciju na telefonu i dobija smene.', confirmLabel: 'Promeni ulogu' });
    if (!ok) return;
    try { await sec.updateWorker(w._id, { role: to }); toast.ok('Uloga je promenjena'); reload(); } catch (e) { toast.bad('Uloga nije promenjena', errText(e)); }
  };
  return (
    <>
      <SheetSection title="Pristup">
        <div className="sx-rulelist">
          <div className="sx-rulelist__row">
            <div><b>Nalog je {w.isActive ? 'aktivan' : 'neaktivan'}</b><span>{w.isActive ? 'Radnik može da se prijavi.' : 'Prijava je zabranjena.'}</span></div>
            <Switch checked={w.isActive} onChange={toggleActive} label="Aktivan nalog" testId="wd-active" />
          </div>
          <div className="sx-rulelist__row">
            <div><b>Uloga: {w.role === 'coordinator' ? 'koordinator' : 'radnik obezbeđenja'}</b><span>Promena uloge ne briše istoriju.</span></div>
            <Btn size="sm" icon={w.role === 'guard' ? UserCheck : UserX} onClick={switchRole}>{w.role === 'guard' ? 'U koordinatora' : 'U radnika'}</Btn>
          </div>
        </div>
      </SheetSection>
      <SheetSection title="Nova lozinka">
        <div className="sx-inline">
          <Input mono value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Najmanje 6 znakova" data-testid="wd-password" aria-label="Nova lozinka" />
          <Btn icon={KeyRound} onClick={() => setPwd(gen())} aria-label="Predloži lozinku" title="Predloži lozinku" />
          <Btn variant="primary" disabled={pwd.length < 6} onClick={savePwd} data-testid="wd-password-save">Postavi lozinku</Btn>
        </div>
        {shown && (
          <div className="sx-cred sx-mt">
            <KV items={[{ k: 'Ime', v: <b>{w.name}</b> }, { k: 'Nova lozinka', v: <b className="sx-mono">{shown}</b> }]} />
            <Btn size="sm" className="sx-mt" icon={copied ? Check : Copy} onClick={async () => { try { await navigator.clipboard.writeText(`Ime: ${w.name}\nLozinka: ${shown}`); setCopied(true); } catch (e) { /* ručno */ } }}>{copied ? 'Kopirano' : 'Kopiraj podatke'}</Btn>
          </div>
        )}
      </SheetSection>
      <p className="sx-field__hint">Dodat {fmtDate(w.createdAt)}{w.createdByName ? `, ${w.createdByName}` : ''}{w.hourlyRate != null ? ` · satnica ${rsd(w.hourlyRate)}` : ''}</p>
    </>
  );
}
