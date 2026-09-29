// Tabovi objekta: NFC tagovi (puna kontrola: zamena čipa, premeštanje, preimenovanje, vrsta, prelazak na
// drugi objekat, uklanjanje i vraćanje, brisanje neočitanog), plan obilaska (tačke na liniji smene) i zadaci.
import React, { useEffect, useMemo, useState } from 'react';
import { LogIn, Flag, Plus, RefreshCw, Pencil, Archive, RotateCcw, Trash2, History, MapPin, ArrowUp, ArrowDown, X, Wand2, Copy, Sun, Moon, Link2, Lock, Building2, ClipboardList, Nfc } from 'lucide-react';
import { sec, errText, errData } from '../api';
import { useSec } from '../SecurityApp';
import { cx, Btn, Led, withCount } from '../sx/ui';
import { Panel, Note, KV, SaveBar } from '../sx/layout';
import { Field, Input, Select, Textarea, TimeField, Choice, Switch, SearchField } from '../sx/forms';
import Sheet, { SheetSection } from '../sx/Sheet';
import Dialog from '../sx/Dialog';
import { confirm } from '../sx/confirm';
import { useToast } from '../sx/toast';
import { hm, dayWord, ymdOf, fmtDateTime, relText, todayYmd, addDays } from '../lib/time';
import { webNfcSupported, writeAppLink, currentGeo } from '../components/nfc';
import TagWizard from './TagWizard';

const CAT = { workplace: { label: 'Radno mesto', icon: LogIn, sub: 'prijava i odjava sa smene' }, checkpoint: { label: 'Checkpoint', icon: Flag, sub: 'tačka obilaska' } };
const ACTION = { created: 'Dodat', renamed: 'Preimenovan', moved: 'Premešten', category: 'Promenjena vrsta', transferred: 'Prebačen na drugi objekat', replaced: 'Zamenjen čip', retired: 'Uklonjen iz upotrebe', reactivated: 'Vraćen u upotrebu', ndef: 'Link za aplikaciju', note: 'Napomena' };
const ACTION_TONE = { created: 'ok', replaced: 'info', retired: 'bad', reactivated: 'ok', transferred: 'warn' };

// ======================================================================= NFC TAGOVI
export function TagsTab({ f, reload, isAdmin }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [wizard, setWizard] = useState(null);
  const [openId, setOpenId] = useState(null);
  const inPlan = useMemo(() => {
    const m = new Map();
    [...f.roundPlan.day, ...f.roundPlan.night].forEach((p) => m.set(String(p.tagId), (m.get(String(p.tagId)) || 0) + 1));
    return m;
  }, [f.roundPlan]);
  const match = (t) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [t.name, t.location, t.note].some((x) => (x || '').toLowerCase().includes(s)) || (t.uid || '').replace(/:/g, '').toLowerCase().includes(s.replace(/[:\s-]/g, ''));
  };
  const all = f.tags;
  const cnt = {
    workplace: all.filter((t) => t.status === 'active' && t.category === 'workplace').length,
    checkpoint: all.filter((t) => t.status === 'active' && t.category === 'checkpoint').length,
    retired: all.filter((t) => t.status === 'retired').length
  };
  const tags = all.filter(match);
  const groups = [
    { key: 'workplace', title: 'Radno mesto', sub: 'Radnik se ovde prijavljuje i odjavljuje sa smene.', list: tags.filter((t) => t.status === 'active' && t.category === 'workplace'), empty: 'Nema taga za radno mesto. Bez njega radnici ne mogu da se prijave na smenu.' },
    { key: 'checkpoint', title: 'Checkpointi', sub: 'Tačke obilaska. Vreme obilaska se zadaje u tabu Obilazak.', list: tags.filter((t) => t.status === 'active' && t.category === 'checkpoint'), empty: 'Nema checkpointa.' },
    { key: 'retired', title: 'Uklonjeni iz upotrebe', sub: 'Ne mogu da se očitaju, istorija ostaje. Svaki može da se vrati ili zameni novim čipom.', list: tags.filter((t) => t.status === 'retired'), empty: 'Nema uklonjenih tagova.' }
  ].filter((g) => (cat === 'all' ? g.key !== 'retired' || g.list.length : cat === g.key));
  const open = all.find((t) => t._id === openId);

  return (
    <div className="sx-stack" data-testid="tags-tab">
      <div className="sx-tabbar">
        <SearchField value={q} onChange={setQ} placeholder="Traži po nazivu, mestu ili broju taga" testId="tag-search" />
        <Choice size="sm" scroll label="Vrsta taga" value={cat} onChange={setCat} layoutId="sx-tags-cat"
          options={[{ value: 'all', label: 'Svi', count: cnt.workplace + cnt.checkpoint }, { value: 'workplace', label: 'Radno mesto', count: cnt.workplace, tone: cnt.workplace ? null : 'warn' }, { value: 'checkpoint', label: 'Checkpointi', count: cnt.checkpoint }, { value: 'retired', label: 'Uklonjeni', count: cnt.retired }]} />
        {isAdmin && <Btn variant="primary" icon={Plus} onClick={() => setWizard({ mode: 'create' })} className="sx-tabbar__end" data-testid="tag-add">Dodaj tag</Btn>}
      </div>

      {!all.length ? (
        <Panel>
          <div className="sx-empty-block">
            <b>Objekat još nema NFC tagove</b>
            <span>Dodaj tag za radno mesto (prijava na smenu) i checkpointe za obilazak. Tag se očitava telefonom, USB čitačem ili se upiše broj sa taga.</span>
            {isAdmin && <Btn variant="primary" icon={Nfc} onClick={() => setWizard({ mode: 'create' })}>Dodaj prvi tag</Btn>}
          </div>
        </Panel>
      ) : groups.map((g) => (
        <Panel key={g.key} testId={`tags-${g.key}`}
          title={<span className="sx-panel__title-row">{g.key === 'retired' ? <Archive size={16} strokeWidth={1.9} aria-hidden="true" /> : React.createElement(CAT[g.key].icon, { size: 16, strokeWidth: 1.9, 'aria-hidden': true })}{g.title} <span className="sx-count">{g.list.length}</span></span>}
          sub={g.sub}>
          {!g.list.length ? <p className={cx('sx-ssec__lead', g.key === 'workplace' && !q && 'is-warn')}>{q ? 'Nema tagova za ovu pretragu.' : g.empty}</p> : (
            <div className="sx-list">
              {g.list.map((t, i) => <TagRow key={t._id} t={t} i={i} plan={inPlan.get(String(t._id)) || 0} isAdmin={isAdmin} onOpen={() => setOpenId(t._id)} onReplace={() => setWizard({ mode: 'replace', tag: t })} />)}
            </div>
          )}
        </Panel>
      ))}

      <TagSheet t={open} f={f} plan={open ? inPlan.get(String(open._id)) || 0 : 0} isAdmin={isAdmin} onClose={() => setOpenId(null)} reload={reload} onReplace={() => open && setWizard({ mode: 'replace', tag: open })} />
      {wizard && <TagWizard mode={wizard.mode} tag={wizard.tag} facilityId={f._id} onClose={() => { setWizard(null); reload(); }} onDone={() => reload()} />}
    </div>
  );
}

function TagRow({ t, i, plan, isAdmin, onOpen, onReplace }) {
  const C = CAT[t.category];
  const retired = t.status === 'retired';
  return (
    <div className={cx('sx-item is-click sx-tagitem', retired && 'is-retired')} style={{ '--i': i }} onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }} data-testid="tag-row" data-uid={t.uid}>
      <span className={cx('sx-item__icon', t.category === 'workplace' && !retired && 'is-ink')}><C.icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
      <div className="sx-item__main">
        <b>{t.name}{retired && <span className="sx-tag is-bad" style={{ marginLeft: 8 }}>uklonjen</span>}</b>
        <span>{t.location || 'mesto nije upisano'} · <span className="sx-uid">{t.uid}</span></span>
        <span className="sx-faint">{t.lastScanAt ? `očitan ${relText(t.lastScanAt)}${t.lastScanByName ? `, ${t.lastScanByName}` : ''}` : 'još nije očitan'}</span>
      </div>
      <div className="sx-item__side" onClick={(e) => e.stopPropagation()}>
        {t.category === 'checkpoint' && !retired && (plan ? <span className="sx-tag">u planu {plan}×</span> : <span className="sx-tag is-warn">nije u planu</span>)}
        {t.ndef && t.ndef.locked && <span className="sx-tag" title="Tag je zaključan"><Lock aria-hidden="true" />zaključan</span>}
        {isAdmin && !retired && <Btn size="sm" icon={RefreshCw} onClick={onReplace} title="Novi čip na istom mestu, plan i istorija ostaju" data-testid="tag-replace">Zameni čip</Btn>}
        <Btn size="sm" variant="ghost" icon={isAdmin ? Pencil : History} onClick={onOpen} data-testid="tag-open">{isAdmin ? 'Uredi' : 'Istorija'}</Btn>
      </div>
    </div>
  );
}

function TagSheet({ t, f, plan, isAdmin, onClose, reload, onReplace }) {
  const { facilities } = useSec();
  const toast = useToast();
  const init = (x) => (x ? { name: x.name, location: x.location || '', note: x.note || '', category: x.category, facilityId: String(x.facilityId) } : null);
  const [form, setForm] = useState(init(t));
  const [geo, setGeo] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (t) { setForm(init(t)); setGeo(null); } }, [t]);
  const cur = t;
  const dirty = !!(cur && form) && (form.name !== cur.name || form.location !== (cur.location || '') || form.note !== (cur.note || '') || form.category !== cur.category || form.facilityId !== String(cur.facilityId) || !!geo);
  const moving = !!(cur && form) && form.facilityId !== String(cur.facilityId);
  const catChange = !!(cur && form) && form.category !== cur.category;

  const run = async (fn, okText, after) => {
    setBusy(true);
    try { await fn(); toast.ok(okText); await reload(); if (after) after(); } catch (e) { toast.bad('Nije uspelo', errText(e)); } finally { setBusy(false); }
  };
  const save = async () => {
    if ((moving || (catChange && cur.category === 'checkpoint')) && plan) {
      const ok = await confirm({ eyebrow: cur.name, title: 'Tag je u planu obilaska', text: `Tag je u planu ${plan}×. ${moving ? 'Prelaskom na drugi objekat' : 'Promenom vrste'} izlazi iz plana obilaska ovog objekta.`, confirmLabel: 'Nastavi' });
      if (!ok) return;
    }
    const body = {};
    ['name', 'location', 'note', 'category', 'facilityId'].forEach((k) => { if (form[k] !== (k === 'facilityId' ? String(cur.facilityId) : (cur[k] || ''))) body[k] = form[k]; });
    if (geo) body.geo = geo;
    run(() => sec.updateTag(cur._id, body), moving ? 'Tag je prebačen na drugi objekat' : 'Tag je sačuvan', moving ? onClose : null);
  };
  const retire = async () => {
    const reason = await confirm({ eyebrow: cur.name, title: 'Ukloni tag iz upotrebe?', text: plan ? `Tag više ne može da se očita i izlazi iz plana obilaska (${plan}×). Istorija ostaje, a tag možeš da vratiš.` : 'Tag više ne može da se očita. Istorija ostaje, a tag možeš da vratiš.', input: 'Razlog', placeholder: 'Npr. skinut sa zida, prostor se renovira', tone: 'danger', confirmLabel: 'Ukloni iz upotrebe' });
    if (reason === null) return;
    run(() => sec.retireTag(cur._id, reason), 'Tag je uklonjen iz upotrebe');
  };
  const remove = async () => {
    const ok = await confirm({ eyebrow: cur.name, title: 'Obriši tag?', text: 'Brisanje je trajno i moguće samo za tag koji nikad nije očitan, na primer greškom dodat.', tone: 'danger', confirmLabel: 'Obriši tag' });
    if (!ok) return;
    setBusy(true);
    try { await sec.deleteTag(cur._id); toast.ok('Tag je obrisan'); await reload(); onClose(); }
    catch (e) {
      if (errData(e).code === 'has_scans') {
        const r = await confirm({ eyebrow: cur.name, title: 'Tag ima očitavanja', text: 'Tag sa istorijom se ne briše, da izveštaji ostanu tačni. Možeš da ga ukloniš iz upotrebe.', confirmLabel: 'Ukloni iz upotrebe' });
        if (r) { await sec.retireTag(cur._id, 'Uklonjen umesto brisanja'); toast.ok('Tag je uklonjen iz upotrebe'); await reload(); }
      } else toast.bad('Tag nije obrisan', errText(e));
    } finally { setBusy(false); }
  };
  const writeLink = async (lock) => {
    try { toast.info('Prisloni telefon na tag', 'Upisujem link za aplikaciju.'); await writeAppLink({ lock }); await sec.setTagNdef(cur._id, { written: true, locked: lock }); toast.ok('Link je upisan'); reload(); }
    catch (e) { toast.bad('Link nije upisan', e.message || errText(e)); }
  };

  const C = cur ? CAT[cur.category] : CAT.checkpoint;
  const history = cur ? [...(cur.history || [])].reverse() : [];
  const retired = cur && cur.status === 'retired';
  return (
    <Sheet open={!!t} onClose={onClose} busy={busy} testId="tag-drawer"
      eyebrow={cur ? `${C.label} · ${f.name}` : 'Tag'}
      title={cur ? cur.name : ''}
      meta={cur && <><span className="sx-uid" data-testid="drawer-uid">{cur.uid}</span>{retired ? <span className="sx-tag is-bad">uklonjen iz upotrebe</span> : <span className="sx-tag is-ok">u upotrebi</span>}</>}
      actions={cur && isAdmin && (retired ? <>
        <Btn size="sm" variant="primary" icon={RotateCcw} onClick={() => run(() => sec.reactivateTag(cur._id), 'Tag je vraćen u upotrebu')} data-testid="tag-reactivate">Vrati u upotrebu</Btn>
        <Btn size="sm" icon={RefreshCw} onClick={onReplace}>Vrati sa novim čipom</Btn>
      </> : <>
        <Btn size="sm" variant="primary" icon={RefreshCw} onClick={onReplace} data-testid="drawer-replace">Zameni čip</Btn>
        {webNfcSupported() && !(cur.ndef && cur.ndef.locked) && <Btn size="sm" icon={Link2} onClick={() => writeLink(false)}>Upiši link</Btn>}
        <Btn size="sm" variant="ghost" icon={Archive} onClick={retire} data-testid="drawer-retire">Ukloni iz upotrebe</Btn>
        <Btn size="sm" variant="ghost" icon={Trash2} onClick={remove} data-testid="drawer-delete">Obriši</Btn>
      </>)}
      footer={cur && isAdmin && dirty && <><Btn variant="ghost" onClick={() => { setForm(init(cur)); setGeo(null); }} disabled={busy}>Poništi</Btn><Btn variant="primary" onClick={save} busy={busy} disabled={form.name.trim().length < 2} data-testid="tag-save">Sačuvaj izmene</Btn></>}
    >
      {cur && form && (
        <>
          <SheetSection title="Podaci">
            <KV items={[
              { k: 'Broj taga (UID)', v: <span className="sx-uid">{cur.uid}</span> },
              { k: 'Čip', v: cur.chip || 'NTAG215' },
              { k: 'Poslednje očitavanje', v: cur.lastScanAt ? `${fmtDateTime(cur.lastScanAt)}${cur.lastScanByName ? `, ${cur.lastScanByName}` : ''}` : 'nije očitan' },
              cur.category === 'checkpoint' ? { k: 'Plan obilaska', v: plan ? `${plan}× u smeni` : 'nije u planu', tone: plan ? null : 'warn' } : null,
              { k: 'Link za aplikaciju', v: cur.ndef && cur.ndef.written ? `upisan${cur.ndef.locked ? ', zaključan' : ''}` : 'nije upisan (nije obavezan)' },
              (cur.previousUids || []).length ? { k: 'Raniji čipovi', v: <span className="sx-uid">{cur.previousUids.map((p) => p.uid).join(', ')}</span> } : null
            ]} />
          </SheetSection>

          {isAdmin ? (
            <SheetSection title="Izmena" testId="tag-edit">
              <div className="sx-form">
                <Field label="Naziv" wide><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="tag-name" /></Field>
                <Field label="Gde tačno stoji" wide hint="Kad tag premestiš, upiši novo mesto. Stari opis ostaje u istoriji.">
                  <div className="sx-inline">
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sprat, zona, pored čega" data-testid="tag-location" />
                    {webNfcSupported() && <Btn icon={MapPin} onClick={async () => { const g = await currentGeo(); if (g) { setGeo(g); toast.ok('GPS je zabeležen', `tačnost ${g.acc} m`); } else toast.warn('GPS nije dostupan'); }} title="Zabeleži GPS telefona" aria-label="Zabeleži GPS telefona" />}
                  </div>
                </Field>
                <Field label="Vrsta"><Choice size="sm" label="Vrsta taga" value={form.category} onChange={(v) => setForm({ ...form, category: v })} layoutId="sx-tag-cat" options={[{ value: 'workplace', label: 'Radno mesto', testId: 'tag-cat-workplace' }, { value: 'checkpoint', label: 'Checkpoint', testId: 'tag-cat-checkpoint' }]} /></Field>
                <Field label="Objekat"><Select value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })} data-testid="tag-facility">{facilities.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</Select></Field>
                <Field label="Napomena" wide><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Nije obavezna" /></Field>
              </div>
              {catChange && cur.category === 'checkpoint' && plan > 0 && <Note tone="warn" className="sx-mt">Tag izlazi iz plana obilaska ({plan}×).</Note>}
              {moving && <Note tone="warn" icon={Building2} className="sx-mt">Tag prelazi na drugi objekat{plan ? ` i izlazi iz plana obilaska (${plan}×)` : ''}.</Note>}
            </SheetSection>
          ) : (
            <SheetSection title="Opis"><KV items={[{ k: 'Mesto', v: cur.location }, { k: 'Napomena', v: cur.note }]} /></SheetSection>
          )}

          <SheetSection title="Istorija taga">
            <ol className="sx-tl" data-testid="tag-history">
              {history.map((h, i) => (
                <li key={i} className="sx-tl__item" style={{ '--i': i }}>
                  <span className="sx-tl__mark"><Led tone={ACTION_TONE[h.action] || 'idle'} /></span>
                  <div className="sx-tl__body">
                    <span className="sx-tl__title">{ACTION[h.action] || h.action}{h.details ? <span className="sx-tl__text"> · {h.details}</span> : null}</span>
                    <span className="sx-tl__meta"><span className="sx-mono">{fmtDateTime(h.at)}</span>{h.byName ? ` · ${h.byName}` : ''}</span>
                  </div>
                </li>
              ))}
            </ol>
          </SheetSection>
        </>
      )}
    </Sheet>
  );
}

// ======================================================================= PLAN OBILASKA
const validHm = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
const toHm = (min) => { const m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

// Plan jedne smene kao linija sa tačkama (isti jezik kao tabla obilazaka): tačka van smene je trougao
function PlanLine({ type, win, items, tagName }) {
  const len = win[1] - win[0];
  const off = (time) => (validHm(time) ? ((toMin(time) - win[0]) + 1440) % 1440 : null);
  return (
    <div className="sx-planline" aria-hidden="true">
      <div className="sx-planline__bar">
        <span className="sx-planline__track" />
        {items.map((p, i) => {
          const o = off(p.time);
          if (o === null) return null;
          const bad = o >= len;
          return <span key={`${p.time}-${i}`} className={cx('sx-planline__node', bad && 'is-bad')} style={{ left: `${Math.min(100, (o / len) * 100)}%`, '--n': i }} title={`${p.time} · ${tagName(p.tagId)}${bad ? ' · van smene' : ''}`} />;
        })}
      </div>
      <div className="sx-planline__hours">{[0, 3, 6, 9, 12].map((h) => <span key={h} style={{ left: `${(h / 12) * 100}%` }}>{toHm(win[0] + h * 60)}</span>)}</div>
    </div>
  );
}

export function RoundTab({ f, reload, isAdmin, goTags }) {
  const toast = useToast();
  const [settings, setSettings] = useState({ dayStart: '07:00', nightStart: '19:00' });
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(null);
  useEffect(() => { sec.settings().then((s) => setSettings({ dayStart: s.dayStart, nightStart: s.nightStart })).catch(() => {}); }, []);
  const fromServer = () => ({
    day: f.roundPlan.day.filter((p) => p.tagStatus === 'active').map((p) => ({ tagId: String(p.tagId), time: p.time })),
    night: f.roundPlan.night.filter((p) => p.tagStatus === 'active').map((p) => ({ tagId: String(p.tagId), time: p.time }))
  });
  useEffect(() => { setPlan(fromServer()); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);
  const checkpoints = f.tags.filter((t) => t.status === 'active' && t.category === 'checkpoint');
  if (!plan) return null;
  const dirty = JSON.stringify(plan) !== JSON.stringify(fromServer());
  const win = { day: [toMin(settings.dayStart), toMin(settings.nightStart)], night: [toMin(settings.nightStart), toMin(settings.dayStart) + 1440] };
  const offset = (type, time) => { if (!validHm(time)) return 99999; return ((toMin(time) - win[type][0]) + 1440) % 1440; };
  const len = (type) => win[type][1] - win[type][0];
  const inShift = (type, time) => offset(type, time) < len(type);
  const sorted = (type) => plan[type].map((p, i) => ({ ...p, i })).sort((a, b) => offset(type, a.time) - offset(type, b.time));
  const tagName = (id) => (checkpoints.find((t) => String(t._id) === String(id)) || {}).name || 'Uklonjen tag';

  const setItem = (type, i, patch) => setPlan({ ...plan, [type]: plan[type].map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const removeItem = (type, i) => setPlan({ ...plan, [type]: plan[type].filter((_, j) => j !== i) });
  const addItem = (type) => {
    const list = sorted(type);
    const last = list.length ? offset(type, list[list.length - 1].time) : -60;
    const next = Math.min(last + 60, len(type) - 30);
    setPlan({ ...plan, [type]: [...plan[type], { tagId: checkpoints[0] ? String(checkpoints[0]._id) : '', time: toHm(win[type][0] + Math.max(next, 0)) }] });
  };
  const copyTo = (from, to) => {
    const shift = win[to][0] - win[from][0];
    setPlan({ ...plan, [to]: plan[from].map((p) => ({ ...p, time: toHm(toMin(p.time) + shift) })) });
    toast.info(`Kopirano u ${to === 'night' ? 'noćnu' : 'dnevnu'} smenu`, 'Ista vremena pomerena za 12 h. Proveri i sačuvaj plan.');
  };
  const save = async () => {
    const bad = ['day', 'night'].flatMap((type) => plan[type].filter((p) => !p.tagId || !validHm(p.time) || !inShift(type, p.time)).map((p) => `${type === 'day' ? 'dnevna' : 'noćna'} ${p.time || '?'}`));
    if (bad.length) { toast.warn('Proveri vremena', `Van smene ili bez taga: ${bad.join(', ')}`); return; }
    setBusy(true);
    try { await sec.setRoundPlan(f._id, plan); toast.ok('Plan obilaska je sačuvan', 'Važi od sledeće smene, radnici ga vide u aplikaciji.'); reload(); }
    catch (e) { toast.bad('Plan nije sačuvan', errText(e)); } finally { setBusy(false); }
  };

  if (!checkpoints.length && !plan.day.length && !plan.night.length) {
    return (
      <Panel>
        <div className="sx-empty-block">
          <b>Nema checkpointa</b>
          <span>Plan obilaska se pravi od checkpoint tagova. Prvo ih dodaj u tabu NFC tagovi.</span>
          <Btn variant="primary" icon={Nfc} onClick={goTags}>NFC tagovi</Btn>
        </div>
      </Panel>
    );
  }

  const column = (type) => {
    const Icon = type === 'day' ? Sun : Moon;
    const list = sorted(type);
    const range = type === 'day' ? `${settings.dayStart}-${settings.nightStart}` : `${settings.nightStart}-${settings.dayStart}`;
    return (
      <Panel key={type} testId={`plan-${type}`}
        title={<span className="sx-panel__title-row"><Icon size={16} strokeWidth={1.9} aria-hidden="true" />{type === 'day' ? 'Dnevna smena' : 'Noćna smena'} <span className="sx-mono sx-faint">{range}</span></span>}
        sub={list.length ? `${withCount(list.length, 'očitavanje', 'očitavanja', 'očitavanja')} u smeni` : 'Nema obilaska u ovoj smeni.'}
        actions={isAdmin && <>
          <Btn size="sm" variant="ghost" icon={Copy} onClick={() => copyTo(type, type === 'day' ? 'night' : 'day')} title="Ista vremena pomerena za 12 h" disabled={!list.length}>U {type === 'day' ? 'noćnu' : 'dnevnu'}</Btn>
          <Btn size="sm" icon={Wand2} onClick={() => setGen({ type })} data-testid={`gen-${type}`}>Napravi krug</Btn>
        </>}>
        <PlanLine type={type} win={win[type]} items={list} tagName={tagName} />
        <div className="sx-planrows">
          {list.map((p) => {
            const bad = !inShift(type, p.time);
            return (
              <div key={p.i} className={cx('sx-planrow', bad && 'is-bad')} data-testid="plan-row">
                {isAdmin ? <TimeField value={p.time} onChange={(v) => setItem(type, p.i, { time: v })} invalid={bad} compact testId="plan-time" aria-label="Vreme očitavanja" /> : <span className="sx-mono">{p.time}</span>}
                {isAdmin ? (
                  <Select size="sm" value={p.tagId} onChange={(e) => setItem(type, p.i, { tagId: e.target.value })} data-testid="plan-tag" aria-label="Tačka obilaska">
                    {!checkpoints.some((t) => String(t._id) === p.tagId) && <option value={p.tagId}>{tagName(p.tagId)}</option>}
                    {checkpoints.map((t) => <option key={t._id} value={t._id}>{t.name}{t.location ? ` · ${t.location}` : ''}</option>)}
                  </Select>
                ) : <span>{tagName(p.tagId)}</span>}
                {isAdmin && <Btn size="sm" variant="ghost" icon={X} onClick={() => removeItem(type, p.i)} aria-label="Ukloni tačku" title="Ukloni tačku" />}
                {bad && <span className="sx-planrow__why">Vreme nije u ovoj smeni.</span>}
              </div>
            );
          })}
        </div>
        {isAdmin && <Btn size="sm" icon={Plus} onClick={() => addItem(type)} disabled={!checkpoints.length} className="sx-mt" data-testid={`plan-add-${type}`}>Dodaj tačku</Btn>}
      </Panel>
    );
  };

  return (
    <div className="sx-stack" data-testid="round-tab">
      {!isAdmin && <Note>Plan obilaska menjaju administrator i superadmin.</Note>}
      <div className="sx-cols sx-cols--2">{column('day')}{column('night')}</div>
      <Note tone="idle">Radnik dobija alarm ako tačku ne očita u roku tolerancije. Prvi alarm može da odloži jednom, uz obavezan razlog; drugi ide administratoru.</Note>
      {isAdmin && <SaveBar show={dirty} text="Plan obilaska je izmenjen i nije sačuvan." onReset={() => setPlan(fromServer())} onSave={save} busy={busy} saveLabel="Sačuvaj plan" testId="plan-savebar" />}
      {gen && <RoundGenerator type={gen.type} win={win[gen.type]} checkpoints={checkpoints} onClose={() => setGen(null)}
        onApply={(items, replace) => { setPlan({ ...plan, [gen.type]: replace ? items : [...plan[gen.type], ...items] }); setGen(null); toast.info('Krug je dodat u plan', 'Proveri i sačuvaj plan.'); }} />}
    </div>
  );
}

function RoundGenerator({ type, win, checkpoints, onClose, onApply }) {
  const [start, setStart] = useState(toHm(win[0] + 60));
  const [every, setEvery] = useState('2');
  const [gap, setGap] = useState('10');
  const [ids, setIds] = useState(checkpoints.map((t) => String(t._id)));
  const [replace, setReplace] = useState(true);
  const move = (i, d) => { const n = [...ids]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setIds(n); };
  const { items, rounds } = useMemo(() => {
    const out = [], starts = [];
    const len = win[1] - win[0];
    if (!validHm(start)) return { items: out, rounds: starts };
    let s = ((toMin(start) - win[0]) + 1440) % 1440;
    while (s < len && starts.length < 48) {
      starts.push(toHm(win[0] + s));
      for (let k = 0; k < ids.length; k++) { const o = s + k * Number(gap || 0); if (o < len) out.push({ tagId: ids[k], time: toHm(win[0] + o) }); }
      if (!Number(every)) break;
      s += Number(every) * 60;
    }
    return { items: out, rounds: starts };
  }, [start, every, gap, ids, win]);
  const name = (id) => (checkpoints.find((t) => String(t._id) === id) || {}).name || '';
  return (
    <Dialog onClose={onClose} size="lg" eyebrow="Plan obilaska" title={`Napravi krug · ${type === 'day' ? 'dnevna' : 'noćna'} smena`}
      description="Izaberi tačke i redosled, kada kreće prvi krug i koliko se često ponavlja. Pregled ispod pokazuje sve tačke u smeni."
      testId="round-gen"
      footer={<><Btn variant="ghost" onClick={onClose}>Odustani</Btn><Btn variant="primary" onClick={() => onApply(items, replace)} disabled={!items.length} data-testid="gen-apply">Dodaj {withCount(items.length, 'tačku', 'tačke', 'tačaka')}</Btn></>}>
      <div className="sx-form">
        <Field label="Prvi krug počinje"><TimeField value={start} onChange={setStart} testId="gen-start" aria-label="Prvi krug počinje" /></Field>
        <Field label="Krug se ponavlja"><Select value={every} onChange={(e) => setEvery(e.target.value)} data-testid="gen-every"><option value="0">samo jednom</option>{[1, 2, 3, 4, 6].map((h) => <option key={h} value={String(h)}>na svaka {h} h</option>)}</Select></Field>
        <Field label="Razmak između tačaka" hint="Koliko radniku treba od jedne do druge."><Select value={gap} onChange={(e) => setGap(e.target.value)}>{[0, 5, 10, 15, 20, 30].map((m) => <option key={m} value={String(m)}>{m ? `${m} min` : 'bez razmaka'}</option>)}</Select></Field>
        <Field label="Postojeći plan"><Choice size="sm" label="Postojeći plan" value={replace} onChange={setReplace} layoutId="sx-gen-replace" options={[{ value: true, label: 'Zameni' }, { value: false, label: 'Dodaj na njega' }]} /></Field>
      </div>
      <div className="sx-field sx-mt"><span className="sx-field__label">Tačke u krugu i redosled</span>
        <div className="sx-genlist">
          {checkpoints.map((t) => {
            const on = ids.includes(String(t._id));
            const i = ids.indexOf(String(t._id));
            return (
              <div key={t._id} className={cx('sx-genrow', !on && 'is-off')}>
                <Switch checked={on} onChange={(v) => setIds(v ? [...ids, String(t._id)] : ids.filter((x) => x !== String(t._id)))} label={t.name} />
                <span className="sx-genrow__name">{on && <b className="sx-mono">{i + 1}.</b>}{t.name}{t.location && <span className="sx-faint"> · {t.location}</span>}</span>
                {on && <span className="sx-genrow__move"><Btn size="sm" variant="ghost" icon={ArrowUp} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Pomeri gore" /><Btn size="sm" variant="ghost" icon={ArrowDown} onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label="Pomeri dole" /></span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="sx-genpreview" data-testid="gen-preview">
        <PlanLine type={type} win={win} items={items} tagName={name} />
        <p className="sx-field__hint">{items.length ? `${withCount(rounds.length, 'krug', 'kruga', 'krugova')}: ${rounds.join(', ')}` : !ids.length ? 'Izaberi bar jednu tačku.' : 'Početak kruga nije u ovoj smeni.'}</p>
      </div>
    </Dialog>
  );
}

// ======================================================================= ZADACI
function StandingRow({ t, i, count, set, move, remove }) {
  return (
    <div className="sx-standrow" data-testid="standing-row">
      <span className="sx-standrow__move">
        <Btn size="sm" variant="ghost" icon={ArrowUp} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Pomeri gore" />
        <Btn size="sm" variant="ghost" icon={ArrowDown} onClick={() => move(i, 1)} disabled={i === count - 1} aria-label="Pomeri dole" />
      </span>
      <div className="sx-standrow__main">
        <Input value={t.text} onChange={(e) => set(i, { text: e.target.value })} placeholder="Opis zadatka, npr. provera PP centrale" data-testid="standing-text" aria-label="Opis zadatka" />
        <Switch checked={t.requireComment} onChange={(v) => set(i, { requireComment: v })} label="Obavezan komentar radnika" testId="standing-comment">Obavezan komentar radnika</Switch>
      </div>
      <Btn size="sm" variant="ghost" icon={X} onClick={() => remove(i)} aria-label="Ukloni zadatak" title="Ukloni zadatak" />
    </div>
  );
}

export function TasksTab({ f, reload }) {
  const { openQuickTask } = useSec();
  const toast = useToast();
  const toList = () => (f.standingTasks || []).map((t) => ({ _id: t._id, text: t.text, requireComment: !!t.requireComment }));
  const [standing, setStanding] = useState(toList);
  const [busy, setBusy] = useState(false);
  const [past, setPast] = useState(null);
  const [editing, setEditing] = useState(null);
  const orig = JSON.stringify(toList());
  const dirty = JSON.stringify(standing) !== orig;
  useEffect(() => { setStanding(toList()); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.standingTasks]);
  const loadPast = () => sec.tasks({ facility: f._id, from: addDays(todayYmd(), -14), to: todayYmd() }).then((l) => setPast(l.filter((t) => t.status !== 'open').reverse())).catch(() => setPast([]));
  useEffect(() => {
    loadPast();
    const h = () => { reload(); loadPast(); };
    window.addEventListener('sec:changed', h);
    return () => window.removeEventListener('sec:changed', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f._id]);

  const set = (i, patch) => setStanding(standing.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const move = (i, d) => { const n = [...standing]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setStanding(n); };
  const saveStanding = async () => {
    setBusy(true);
    try { await sec.setStandingTasks(f._id, standing.filter((t) => t.text.trim().length >= 2)); toast.ok('Stalni zadaci su sačuvani', 'Važe od sledeće smene.'); reload(); }
    catch (e) { toast.bad('Zadaci nisu sačuvani', errText(e)); } finally { setBusy(false); }
  };
  const cancel = async (t) => {
    const ok = await confirm({ eyebrow: f.name, title: 'Otkaži zadatak?', text: `„${t.text}”, ${dayWord(ymdOf(t.dueAt))} u ${hm(t.dueAt)}. Radnik ga više ne vidi.`, tone: 'danger', confirmLabel: 'Otkaži zadatak' });
    if (!ok) return;
    try { await sec.cancelTask(t._id); toast.ok('Zadatak je otkazan'); reload(); loadPast(); } catch (e) { toast.bad('Zadatak nije otkazan', errText(e)); }
  };
  const saveEdit = async () => {
    try { await sec.updateTask(editing._id, { text: editing.text }); toast.ok('Zadatak je izmenjen'); setEditing(null); reload(); } catch (e) { toast.bad('Izmena nije sačuvana', errText(e)); }
  };

  return (
    <div className="sx-cols sx-cols--2" data-testid="tasks-tab">
      <Panel title={<span className="sx-panel__title-row">Stalni zadaci <span className="sx-count">{standing.length}</span></span>} sub="Radnik ih potvrđuje u svakoj smeni na ovom objektu." testId="standing-tasks"
        footer={dirty ? <><Btn variant="ghost" size="sm" onClick={() => setStanding(JSON.parse(orig))} disabled={busy}>Poništi</Btn><Btn variant="primary" size="sm" busy={busy} onClick={saveStanding} data-testid="standing-save">Sačuvaj zadatke</Btn></> : null}>
        <div className="sx-standlist">
          {!standing.length && <p className="sx-ssec__lead">Nema stalnih zadataka. Na primer: „Provera PP centrale na početku smene”.</p>}
          {standing.map((t, i) => <StandingRow key={t._id || `n${i}`} t={t} i={i} count={standing.length} set={set} move={move} remove={(k) => setStanding(standing.filter((_, j) => j !== k))} />)}
        </div>
        <Btn size="sm" icon={Plus} onClick={() => setStanding([...standing, { text: '', requireComment: false }])} className="sx-mt" data-testid="standing-add">Dodaj stalni zadatak</Btn>
      </Panel>

      <div className="sx-stack">
        <Panel title={<span className="sx-panel__title-row">Povremeni zadaci <span className="sx-count">{f.upcomingTasks.length}</span></span>} sub="Za tačno vreme u smeni. Radnik ga zatvara uz obavezan komentar." testId="occasional-tasks"
          actions={<Btn size="sm" variant="primary" icon={ClipboardList} onClick={() => openQuickTask({ facilityId: f._id })} data-testid="occasional-add">Novi zadatak</Btn>}>
          {!f.upcomingTasks.length ? <p className="sx-ssec__lead">Nema otvorenih zadataka. Na primer: u 23:30 proveri da li je sala na 1. spratu zaključana.</p> : (
            <div className="sx-list">
              {f.upcomingTasks.map((t) => {
                const late = new Date(t.dueAt) < new Date();
                return (
                  <div key={t._id} className="sx-item sx-occ" data-testid="occasional-row">
                    <span className={cx('sx-occ__time', late && 'is-late')}><b className="sx-mono">{hm(t.dueAt)}</b><span>{dayWord(ymdOf(t.dueAt))}</span></span>
                    {editing && editing._id === t._id ? (
                      <form className="sx-inline" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                        <Input autoFocus value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); } }} aria-label="Tekst zadatka" />
                        <Btn type="submit" size="sm" variant="primary">Sačuvaj</Btn>
                      </form>
                    ) : (
                      <div className="sx-item__main"><b>{t.text}</b><span>{t.shiftId ? 'dodeljen smeni' : 'čeka smenu u to vreme'}{late ? ' · rok je prošao' : ''} · {t.createdByName}</span></div>
                    )}
                    <div className="sx-item__side">
                      {!(editing && editing._id === t._id) && <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ _id: t._id, text: t.text })} aria-label="Izmeni zadatak" title="Izmeni" />}
                      <Btn size="sm" variant="ghost" icon={X} onClick={() => cancel(t)} aria-label="Otkaži zadatak" title="Otkaži" data-testid="occasional-cancel" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Urađeni i otkazani" sub="Poslednjih 14 dana, sa komentarom radnika.">
          {past === null ? <p className="sx-ssec__lead">Učitavam...</p> : !past.length ? <p className="sx-ssec__lead">Nema zadataka u poslednjih 14 dana.</p> : (
            <ol className="sx-tl">
              {past.slice(0, 30).map((t, i) => (
                <li key={t._id} className="sx-tl__item" style={{ '--i': i }}>
                  <span className="sx-tl__mark"><Led tone={t.status === 'done' ? 'ok' : 'idle'} /></span>
                  <div className="sx-tl__body">
                    <span className="sx-tl__title">{t.text}</span>
                    {t.status === 'done' ? <><span className="sx-tl__text">„{t.comment || 'bez komentara'}”</span><span className="sx-tl__meta">{t.doneByName} · <span className="sx-mono">{fmtDateTime(t.doneAt)}</span></span></> : <span className="sx-tl__meta">otkazan · zadat za <span className="sx-mono">{fmtDateTime(t.dueAt)}</span></span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

