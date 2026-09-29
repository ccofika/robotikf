// Novi NFC tag i zamena oštećenog: korak po korak (vrsta, naziv i mesto, očitavanje, gotovo).
// Tag se očitava telefonom (Web NFC u Chrome-u na Androidu), USB čitačem (kuca broj u polje) ili upisom broja.
// Svaki broj se odmah proverava: slobodan, već registrovan, ranije uklonjen ili zamenjen čip.
import React, { useEffect, useRef, useState } from 'react';
import { LogIn, Flag, Nfc, Check, ArrowRight, ChevronLeft, RotateCcw, Keyboard } from 'lucide-react';
import { sec, errText, errData } from '../api';
import { useSec } from '../SecurityApp';
import Dialog from '../sx/Dialog';
import { cx, Btn } from '../sx/ui';
import { Note } from '../sx/layout';
import { Field, Input, Select, Textarea, Choice, Checkbox } from '../sx/forms';
import { useToast } from '../sx/toast';
import { webNfcSupported, readTagOnce, writeAppLink, normalizeUid, currentGeo } from '../components/nfc';

const REASONS = ['Oštećen', 'Izgubljen ili skinut', 'Ne očitava se', 'Drugo'];

// Koraci kao tačke na liniji (motiv obilaska): pređeni kvadrat sa kvačicom, trenutni plavi krug
function Steps({ steps, index }) {
  return (
    <ol className="sx-steps" aria-label="Koraci">
      {steps.map((s, i) => (
        <li key={s} className={cx('sx-steps__item', i < index && 'is-done', i === index && 'is-on')} aria-current={i === index ? 'step' : undefined}>
          <span className="sx-steps__node">{i < index ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : i + 1}</span>
          <span className="sx-steps__label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function UidReader({ uid, setUid, excludeId, onStatus }) {
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState(null);
  const ctrl = useRef(null);
  const nfc = webNfcSupported();
  useEffect(() => {
    const n = normalizeUid(uid);
    if (!n) { setInfo(null); if (onStatus) onStatus(null); return undefined; }
    const t = setTimeout(() => sec.lookupTag(n).then((r) => {
      const st = r.tag && excludeId && String(r.tag._id) === String(excludeId) ? 'self' : r.status;
      setInfo({ ...r, status: st }); if (onStatus) onStatus({ ...r, status: st });
    }).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [uid, excludeId, onStatus]);
  useEffect(() => () => ctrl.current && ctrl.current.abort(), []);
  const scan = async () => {
    setErr(''); setScanning(true);
    ctrl.current = new AbortController();
    try { const r = await readTagOnce({ signal: ctrl.current.signal }); setUid(r.uid); if (navigator.vibrate) navigator.vibrate(60); }
    catch (e) { if (e.message !== 'Otkazano') setErr(e.message); }
    finally { setScanning(false); }
  };
  const n = normalizeUid(uid);
  const free = n && info && info.status === 'free';
  return (
    <div className="sx-stack" style={{ gap: 14 }}>
      <div className={cx('sx-scan', scanning && 'is-scanning', free && 'is-ok', err && 'is-err')}>
        <span className="sx-scan__icon" aria-hidden="true">{free ? <Check size={22} strokeWidth={2.4} /> : <Nfc size={22} strokeWidth={1.9} />}<i /><i /></span>
        <div className="sx-scan__text">
          <b>{scanning ? 'Prisloni telefon na tag' : free ? 'Tag je očitan i slobodan' : n ? 'Broj taga je upisan' : 'Očitaj tag'}</b>
          <span>{nfc ? 'Pritisni dugme i prisloni poleđinu telefona na tag 1-2 sekunde.' : 'Na računaru: klikni u polje ispod i prisloni tag na USB čitač, ili prepiši broj sa taga. U Chrome-u na Android telefonu tag se očitava direktno.'}</span>
        </div>
        {nfc && <Btn variant="primary" icon={Nfc} onClick={scan} disabled={scanning} data-testid="nfc-scan">{scanning ? 'Čekam tag' : n ? 'Očitaj ponovo' : 'Očitaj telefonom'}</Btn>}
      </div>
      <Field label="Broj taga (UID)" hint="NTAG215 ima 7 bajtova, npr. 04:A2:1F:9B:5C:3E:80. Razmaci i dvotačke nisu bitni.">
        <div className="sx-uidfield"><Keyboard size={16} strokeWidth={1.9} aria-hidden="true" /><Input mono value={uid} onChange={(e) => setUid(e.target.value)} placeholder="04:A2:1F:9B:5C:3E:80" autoFocus={!nfc} data-testid="tag-uid" /></div>
      </Field>
      {err && <Note tone="warn">{err}</Note>}
      {free && <Note tone="ok" testId="uid-free"><b className="sx-uid">{n}</b> nije korišćen ni na jednom objektu.</Note>}
      {n && info && info.status === 'active' && <Note tone="bad" testId="uid-taken">Ovaj tag je već registrovan: <b>{info.tag.name}</b>{info.tag.facilityId ? ` (${info.tag.facilityId.name})` : ''}.</Note>}
      {n && info && info.status === 'self' && <Note tone="warn">To je trenutni tag. Prisloni telefon na novi tag.</Note>}
      {n && info && info.status === 'retired' && <Note tone="warn">Ovaj tag je ranije uklonjen iz upotrebe ({info.tag.name}). Možeš da ga vratiš u upotrebu.</Note>}
      {n && info && info.status === 'replaced' && <Note tone="warn">Ovaj čip je ranije zamenjen na tagu {info.tag.name}. Može da se koristi ponovo, uz potvrdu.</Note>}
    </div>
  );
}

export default function TagWizard({ facilityId: initialFacility, mode = 'create', tag, prefillUid = '', onClose, onDone }) {
  const { facilities, isAdmin } = useSec();
  const toast = useToast();
  const [step, setStep] = useState(mode === 'replace' ? 3 : 1);
  const [f, setF] = useState({ facilityId: initialFacility || (facilities[0] && facilities[0]._id) || '', category: '', name: '', location: '', note: '' });
  const [uid, setUid] = useState(prefillUid);
  const [status, setStatus] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [write, setWrite] = useState(false);
  const [lock, setLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const [err, setErr] = useState(null);
  const n = normalizeUid(uid);
  const canSave = n && status && (status.status === 'free' || status.status === 'replaced');

  const save = async (force = false) => {
    setBusy(true); setErr(null);
    try {
      let ndef = { written: false, locked: false };
      if (write && webNfcSupported()) {
        try { toast.info('Prisloni telefon na tag', 'Upisujem link za automatsko otvaranje aplikacije.'); await writeAppLink({ lock }); ndef = { written: true, locked: lock }; }
        catch (e) { toast.warn('Link nije upisan', 'Tag radi i bez linka, može da se upiše kasnije.'); }
      }
      const geo = webNfcSupported() ? await currentGeo() : null;
      const res = mode === 'replace'
        ? await sec.replaceTag(tag._id, { uid: n, reason, ndef })
        : await sec.createTag({ ...f, uid: n, geo, ndef, chip: 'NTAG215', force, source: webNfcSupported() ? 'Web NFC' : 'upis broja' });
      setSaved(res); setStep(4);
      if (onDone) onDone(res);
    } catch (e) {
      const d = errData(e);
      if (d.code === 'replaced') setErr({ text: d.error, force: true });
      else if (d.code === 'retired') setErr({ text: d.error, reactivate: d.tagId });
      else setErr({ text: errText(e) });
    } finally { setBusy(false); }
  };
  const reactivate = async (tagId) => {
    setBusy(true);
    try { const res = await sec.reactivateTag(tagId, { facilityId: f.facilityId, category: f.category, name: f.name, location: f.location }); setSaved(res); setStep(4); if (onDone) onDone(res); }
    catch (e) { setErr({ text: errText(e) }); } finally { setBusy(false); }
  };

  const steps = mode === 'replace' ? ['Novi čip', 'Gotovo'] : ['Vrsta', 'Naziv i mesto', 'Očitavanje', 'Gotovo'];
  const stepIndex = mode === 'replace' ? (step === 4 ? 1 : 0) : step - 1;
  const fac = facilities.find((x) => x._id === f.facilityId);
  const title = mode === 'replace' ? `Zameni čip · ${tag.name}` : 'Dodaj NFC tag';

  let body, footer;
  if (step === 1) {
    body = <>
      <Field label="Objekat"><Select value={f.facilityId} onChange={(e) => setF({ ...f, facilityId: e.target.value })} data-testid="wiz-facility">{facilities.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</Select></Field>
      <div className="sx-field"><span className="sx-field__label">Vrsta taga</span>
        <div className="sx-tiles">
          <button type="button" className={cx('sx-tile', f.category === 'workplace' && 'is-on')} onClick={() => setF({ ...f, category: 'workplace' })} aria-pressed={f.category === 'workplace'} data-testid="cat-workplace">
            <span className="sx-tile__icon"><LogIn size={18} strokeWidth={1.9} /></span><b>Radno mesto</b><span>Prijava i odjava sa smene. Obično jedan tag na pultu obezbeđenja.</span>
          </button>
          <button type="button" className={cx('sx-tile', f.category === 'checkpoint' && 'is-on')} onClick={() => setF({ ...f, category: 'checkpoint' })} disabled={!isAdmin} aria-pressed={f.category === 'checkpoint'} data-testid="cat-checkpoint">
            <span className="sx-tile__icon"><Flag size={18} strokeWidth={1.9} /></span><b>Checkpoint</b><span>{isAdmin ? 'Tačka obilaska koju radnik očitava u zadato vreme.' : 'Checkpointe dodaju administrator i superadmin.'}</span>
          </button>
        </div>
      </div>
    </>;
    footer = <><Btn variant="ghost" onClick={onClose}>Odustani</Btn><Btn variant="primary" iconRight={ArrowRight} onClick={() => setStep(2)} disabled={!f.category || !f.facilityId} data-testid="wiz-next">Dalje</Btn></>;
  } else if (step === 2) {
    body = <>
      <Field label="Naziv taga" hint="Tako ga radnik vidi u aplikaciji."><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={f.category === 'checkpoint' ? 'Npr. Garaža -2, ulaz' : 'Npr. Recepcija, pult obezbeđenja'} data-testid="wiz-name" /></Field>
      <Field label="Gde tačno stoji" hint="Sprat, zona, pored čega. Pomaže kod zamene i premeštanja."><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Npr. 6. sprat, levo od lifta" data-testid="wiz-location" /></Field>
      <Field label="Napomena" hint="Nije obavezna."><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      {f.category === 'checkpoint' && <Note tone="info" className="sx-mt">Vreme obilaska zadaješ posle, u planu obilaska objekta.</Note>}
    </>;
    footer = <><Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(1)}>Nazad</Btn><Btn variant="primary" iconRight={ArrowRight} onClick={() => setStep(3)} disabled={f.name.trim().length < 2} data-testid="wiz-next">Dalje</Btn></>;
  } else if (step === 3) {
    body = <>
      {mode === 'replace' && <Note tone="info" className="sx-mb">Novi čip preuzima naziv, mesto, vrstu, plan obilaska i istoriju starog. Stari broj ostaje u istoriji i više ne važi.</Note>}
      <UidReader uid={uid} setUid={setUid} excludeId={tag && tag._id} onStatus={setStatus} />
      {mode === 'replace' && (
        <Field label="Zašto se menja" className="sx-mt"><Choice size="sm" label="Razlog zamene" value={reason} onChange={setReason} layoutId="sx-wiz-reason" options={REASONS.map((r) => ({ value: r, label: r }))} /></Field>
      )}
      {webNfcSupported() && (
        <div className="sx-stack sx-mt" style={{ gap: 10 }}>
          <Checkbox checked={write} onChange={setWrite}>Upiši link, da dodir taga sam otvori aplikaciju radnika</Checkbox>
          {write && <Checkbox checked={lock} onChange={setLock} tone="danger">Zaključaj tag posle upisa (trajno, više se ne može prepisati)</Checkbox>}
        </div>
      )}
      {err && (
        <Note tone="bad" className="sx-mt" actions={(err.force || err.reactivate) && <>
          {err.force && <Btn size="sm" onClick={() => save(true)} busy={busy}>Koristi ipak</Btn>}
          {err.reactivate && <Btn size="sm" icon={RotateCcw} onClick={() => reactivate(err.reactivate)} busy={busy} data-testid="wiz-reactivate">Vrati u upotrebu sa ovim podacima</Btn>}
        </>}>{err.text}</Note>
      )}
      {status && status.status === 'retired' && !err && <div className="sx-mt"><Btn size="sm" icon={RotateCcw} onClick={() => reactivate(status.tag._id)} busy={busy} data-testid="wiz-reactivate">Vrati stari tag u upotrebu</Btn></div>}
    </>;
    footer = <>
      {mode === 'replace' ? <Btn variant="ghost" onClick={onClose}>Odustani</Btn> : <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(2)}>Nazad</Btn>}
      <Btn variant="primary" icon={Check} onClick={() => save(false)} busy={busy} disabled={!canSave} data-testid="wiz-save">{mode === 'replace' ? 'Zameni čip' : 'Sačuvaj tag'}</Btn>
    </>;
  } else {
    body = (
      <div className="sx-done" data-testid="wiz-done">
        <span className="sx-done__icon"><Check size={26} strokeWidth={2.4} aria-hidden="true" /></span>
        <b>{mode === 'replace' ? 'Čip je zamenjen' : `${saved ? saved.name : f.name} je dodat`}</b>
        <span>{mode === 'replace' ? 'Radnici od sada očitavaju novi čip. Plan obilaska i istorija su isti.' : `${f.category === 'checkpoint' ? 'Checkpoint' : 'Radno mesto'} · ${fac ? fac.name : ''}. ${f.category === 'checkpoint' ? 'Dodaj ga u plan obilaska kad odrediš vreme.' : 'Radnici ovog objekta od sada mogu da se prijave na ovaj tag.'}`}</span>
      </div>
    );
    footer = <>
      {mode === 'create' && <Btn variant="ghost" onClick={() => { setStep(1); setUid(''); setStatus(null); setSaved(null); setErr(null); setF({ ...f, name: '', location: '', note: '' }); }} data-testid="wiz-another">Dodaj još jedan</Btn>}
      <Btn variant="primary" onClick={onClose} data-testid="wiz-close">Gotovo</Btn>
    </>;
  }

  return (
    <Dialog onClose={onClose} busy={busy} size="lg" eyebrow={fac ? `${fac.name} · NFC tagovi` : 'NFC tagovi'} title={title} testId="tag-wizard" footer={footer}>
      <Steps steps={steps} index={stepIndex} />
      <div className="sx-wiz__body" key={step}>{body}</div>
    </Dialog>
  );
}
