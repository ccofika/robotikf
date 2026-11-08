import React, { useEffect, useMemo, useState } from 'react';
import { workOrdersAPI } from '../services/api';
import { toast } from '../utils/toast';
import { formatRsd } from '../utils/rejectionPenalty';
import Dialog from '../security/sx/Dialog';
import { cx, Btn } from '../security/sx/ui';
import { Note } from '../security/sx/layout';
import { Field, Select, Textarea, Checkbox, DateField, TimeField } from '../security/sx/forms';
import './WorkOrderDialogs.mx.css';

const ADMIN_ROLES = ['admin', 'superadmin', 'supervisor'];

const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const idOf = (value) => (value && value._id ? value._id : value) || null;

// Reklamacija: radovi kod korisnika su loše izvedeni. Admin bira koga sklanja sa naloga (jednog ili
// oba tehničara) i kome dodeljuje ispravku. Sklonjenim tehničarima se nalog ne plaća i skida se
// iznos dva takva naloga; nalog se plaća tehničaru koji ga ispravi.
const ComplaintModal = ({ isOpen, workOrder, technicians = [], onClose, onFiled }) => {
  const currentTechs = useMemo(() => {
    if (!workOrder) return [];
    return [workOrder.technicianId, workOrder.technician2Id]
      .filter(Boolean)
      .map(t => {
        const id = String(idOf(t));
        const name = t.name || technicians.find(x => x._id === id)?.name || 'Nepoznat tehničar';
        return { id, name };
      });
  }, [workOrder, technicians]);

  const [removeIds, setRemoveIds] = useState([]);
  const [newTechnicianId, setNewTechnicianId] = useState('');
  const [fixDate, setFixDate] = useState(tomorrowIso());
  const [fixTime, setFixTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Jedan tehničar na nalogu: on se sklanja. Dva: admin bira jednog ili oba.
    setRemoveIds(currentTechs.length === 1 ? [currentTechs[0].id] : []);
    setNewTechnicianId('');
    setFixDate(tomorrowIso());
    setFixTime('09:00');
    setReason('');
    setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workOrder?._id]);

  // Pregled iznosa odbitaka i isplate za izabranu kombinaciju
  useEffect(() => {
    if (!isOpen || !workOrder?._id) return;
    let cancelled = false;
    setLoadingPreview(true);
    workOrdersAPI.getComplaintPreview(workOrder._id, {
      remove: removeIds.join(','),
      newTechnicianId: newTechnicianId || undefined
    })
      .then(res => { if (!cancelled) setPreview(res.data); })
      .catch(() => { if (!cancelled) setPreview(null); })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [isOpen, workOrder?._id, removeIds, newTechnicianId]);

  const availableTechnicians = useMemo(() => {
    const currentIds = currentTechs.map(t => t.id);
    return technicians
      .filter(t => !ADMIN_ROLES.includes(t.role) && t.isActive !== false && !currentIds.includes(t._id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sr'));
  }, [technicians, currentTechs]);

  if (!isOpen || !workOrder) return null;

  const toggleRemove = (techId) => {
    if (currentTechs.length === 1) return;
    setRemoveIds(prev => prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]);
  };

  const canSubmit = removeIds.length > 0 && newTechnicianId && fixDate && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await workOrdersAPI.fileComplaint(workOrder._id, {
        reason: reason.trim(),
        removeTechnicianIds: removeIds,
        newTechnicianId,
        fixDate,
        fixTime
      });
      toast.success(response.data?.message || 'Reklamacija je evidentirana');
      if (onFiled) await onFiled(response.data);
    } catch (error) {
      console.error('Greška pri evidentiranju reklamacije:', error);
      toast.error(error.response?.data?.error || 'Neuspešno evidentiranje reklamacije');
    } finally {
      setSubmitting(false);
    }
  };

  const previewByTech = new Map((preview?.technicians || []).map(t => [t.technicianId, t]));

  return (
    <Dialog
      onClose={onClose}
      busy={submitting}
      size="lg"
      title="Reklamacija"
      description="Radovi kod korisnika su loše izvedeni - izaberite koga sklanjate sa naloga i kome dodeljujete ispravku."
      testId="complaint-dialog"
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Odustani</Btn>
        <Btn variant="danger" onClick={handleSubmit} disabled={!canSubmit} data-testid="complaint-submit">
          {submitting ? 'Čuvanje...' : 'Evidentiraj reklamaciju'}
        </Btn>
      </>}
    >
      <div className="mx-wodlg-stack">
        {/* Koga sklanjamo */}
        <Field label={currentTechs.length > 1 ? 'Koga sklanjate sa naloga (jednog ili oba)' : 'Tehničar koji se sklanja sa naloga'}>
          <div className="mx-wodlg-list">
            {currentTechs.map(tech => {
              const checked = removeIds.includes(tech.id);
              const techPreview = previewByTech.get(tech.id);
              return (
                <div key={tech.id} className={cx('mx-wodlg-choice', checked && 'is-on')}>
                  <Checkbox checked={checked} disabled={currentTechs.length === 1} onChange={() => toggleRemove(tech.id)} tone="danger">
                    <span className="mx-wodlg-choice__title">{tech.name}</span>
                    {techPreview && !checked && (
                      <span className="mx-wodlg-hint">
                        {techPreview.paidAmount > 0 ? `Plaćen za nalog: ${formatRsd(techPreview.paidAmount)}.` : 'Nalog još nije plaćen.'}
                      </span>
                    )}
                    {techPreview && checked && (
                      <span className="mx-wodlg-hint mx-wodlg-lines">
                        <span>
                          {techPreview.paidAmount > 0
                            ? <>Ovaj nalog se ne plaća: <b className="mx-wodlg-bad">-{formatRsd(techPreview.orderDeductionAmount)}</b> (bio plaćen {formatRsd(techPreview.paidAmount)})</>
                            : 'Ovaj nalog još nije plaćen - tehničar ga neće dobiti.'}
                        </span>
                        <span>
                          {techPreview.extraDeduction?.kind === 'complaint_extra' ? (
                            <>
                              Skida se i poslednji nalog iste kategorije:{' '}
                              <b>{techPreview.extraDeduction.tisJobId || techPreview.extraDeduction.tisId}</b>
                              {techPreview.extraDeduction.address && ` · ${techPreview.extraDeduction.address}`}{' '}
                              <b className="mx-wodlg-bad">-{formatRsd(techPreview.extraDeduction.amount)}</b>
                            </>
                          ) : techPreview.extraDeduction?.amount > 0 ? (
                            <>
                              Nema drugog plaćenog naloga iste kategorije - skida se iznos jednog takvog naloga:{' '}
                              <b className="mx-wodlg-bad">-{formatRsd(techPreview.extraDeduction.amount)}</b>
                            </>
                          ) : (
                            <span className="mx-wodlg-warn">{techPreview.note}</span>
                          )}
                        </span>
                        {techPreview.potentialDeductionAmount > 0 && (
                          <b className="mx-wodlg-bad">
                            Ukupan odbitak: -{formatRsd(techPreview.potentialDeductionAmount)}
                          </b>
                        )}
                      </span>
                    )}
                  </Checkbox>
                </div>
              );
            })}
          </div>
        </Field>

        {/* Novi tehničar */}
        <Field
          label={<span id="complaint-new-technician-label">Tehničar koji ispravlja nalog</span>}
          hint={preview?.newTechnician && (
            preview.newTechnician.expectedPay
              ? `Za ispravku dobija ${formatRsd(preview.newTechnician.expectedPay)} kada nalog bude verifikovan.`
              : preview.newTechnician.paymentType === 'plata'
                ? 'Tehničar je na platu - ispravka se računa ka mesečnoj plati.'
                : 'Cena ovog tehničara za tip usluge nije postavljena na stranici Finansije.'
          )}
        >
          <Select
            aria-labelledby="complaint-new-technician-label"
            value={newTechnicianId}
            onChange={(e) => setNewTechnicianId(e.target.value)}
            data-testid="complaint-new-technician"
          >
            <option value="">Izaberite tehničara</option>
            {availableTechnicians.map(t => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </Select>
        </Field>

        {/* Termin ispravke */}
        <Field label="Termin ispravke">
          <div className="mx-wodlg-when">
            <DateField value={fixDate} onChange={setFixDate} aria-label="Datum ispravke" testId="complaint-fix-date" />
            <TimeField value={fixTime} onChange={setFixTime} aria-label="Vreme ispravke" testId="complaint-fix-time" />
          </div>
        </Field>

        {/* Opis */}
        <Field label="Opis reklamacije (vidi ga tehničar koji ispravlja)">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Šta je loše urađeno kod korisnika..."
            rows={3}
          />
        </Field>

        <Note tone="warn">
          Sklonjenim tehničarima se ovaj nalog ne plaća, a skida im se i poslednji plaćeni nalog iste kategorije
          (obe stavke se vide u finansijama i mesečnom obračunu). Nalog se vraća u status „Nezavršen“ i plaća se
          tehničaru koji ga ispravi, kada ispravka bude verifikovana.
          {loadingPreview && ' Računam iznose...'}
        </Note>
      </div>
    </Dialog>
  );
};

export default ComplaintModal;
