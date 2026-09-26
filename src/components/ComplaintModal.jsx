import React, { useEffect, useMemo, useState } from 'react';
import { XIcon, AlertIcon } from './icons/SvgIcons';
import { workOrdersAPI } from '../services/api';
import { toast } from '../utils/toast';
import { formatRsd } from '../utils/rejectionPenalty';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10050] p-4" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full flex flex-col" style={{ maxHeight: '90vh' }} role="dialog" aria-modal="true" aria-labelledby="complaint-modal-title">
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 id="complaint-modal-title" className="text-lg font-semibold text-slate-900">Reklamacija</h3>
            <button onClick={onClose} disabled={submitting} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <XIcon size={20} className="text-slate-400" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Radovi kod korisnika su loše izvedeni — izaberite koga sklanjate sa naloga i kome dodeljujete ispravku.
          </p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Koga sklanjamo */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
              {currentTechs.length > 1 ? 'Koga sklanjate sa naloga (jednog ili oba)' : 'Tehničar koji se sklanja sa naloga'}
            </p>
            <div className="space-y-2">
              {currentTechs.map(tech => {
                const checked = removeIds.includes(tech.id);
                const techPreview = previewByTech.get(tech.id);
                return (
                  <label
                    key={tech.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      checked ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
                    } ${currentTechs.length === 1 ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={currentTechs.length === 1}
                      onChange={() => toggleRemove(tech.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm flex-1">
                      <span className="font-semibold text-slate-900">{tech.name}</span>
                      {techPreview && !checked && (
                        <span className="block text-xs text-slate-500 mt-1">
                          {techPreview.paidAmount > 0 ? `Plaćen za nalog: ${formatRsd(techPreview.paidAmount)}.` : 'Nalog još nije plaćen.'}
                        </span>
                      )}
                      {techPreview && checked && (
                        <span className="block text-xs text-slate-600 mt-1 space-y-0.5">
                          <span className="block">
                            {techPreview.paidAmount > 0
                              ? <>Ovaj nalog se ne plaća: <span className="text-red-700 font-semibold">-{formatRsd(techPreview.orderDeductionAmount)}</span> (bio plaćen {formatRsd(techPreview.paidAmount)})</>
                              : 'Ovaj nalog još nije plaćen — tehničar ga neće dobiti.'}
                          </span>
                          <span className="block">
                            {techPreview.extraDeduction?.kind === 'complaint_extra' ? (
                              <>
                                Skida se i poslednji nalog iste kategorije:{' '}
                                <span className="font-semibold text-slate-800">
                                  {techPreview.extraDeduction.tisJobId || techPreview.extraDeduction.tisId}
                                </span>
                                {techPreview.extraDeduction.address && ` · ${techPreview.extraDeduction.address}`}{' '}
                                <span className="text-red-700 font-semibold">-{formatRsd(techPreview.extraDeduction.amount)}</span>
                              </>
                            ) : techPreview.extraDeduction?.amount > 0 ? (
                              <>
                                Nema drugog plaćenog naloga iste kategorije — skida se iznos jednog takvog naloga:{' '}
                                <span className="text-red-700 font-semibold">-{formatRsd(techPreview.extraDeduction.amount)}</span>
                              </>
                            ) : (
                              <span className="text-amber-700">{techPreview.note}</span>
                            )}
                          </span>
                          {techPreview.potentialDeductionAmount > 0 && (
                            <span className="block font-semibold text-red-700">
                              Ukupan odbitak: -{formatRsd(techPreview.potentialDeductionAmount)}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Novi tehničar */}
          <div>
            <p id="complaint-new-technician-label" className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Tehničar koji ispravlja nalog</p>
            <select
              aria-labelledby="complaint-new-technician-label"
              value={newTechnicianId}
              onChange={(e) => setNewTechnicianId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Izaberite tehničara</option>
              {availableTechnicians.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            {preview?.newTechnician && (
              <p className="text-xs text-slate-500 mt-1.5">
                {preview.newTechnician.expectedPay
                  ? `Za ispravku dobija ${formatRsd(preview.newTechnician.expectedPay)} kada nalog bude verifikovan.`
                  : preview.newTechnician.paymentType === 'plata'
                    ? 'Tehničar je na platu — ispravka se računa ka mesečnoj plati.'
                    : 'Cena ovog tehničara za tip usluge nije postavljena na stranici Finansije.'}
              </p>
            )}
          </div>

          {/* Termin ispravke */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Termin ispravke</p>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="Datum ispravke"
                value={fixDate}
                onChange={(e) => setFixDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                aria-label="Vreme ispravke"
                value={fixTime}
                onChange={(e) => setFixTime(e.target.value)}
                className="w-32 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Opis */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Opis reklamacije (vidi ga tehničar koji ispravlja)</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Šta je loše urađeno kod korisnika..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertIcon size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              Sklonjenim tehničarima se ovaj nalog ne plaća, a skida im se i poslednji plaćeni nalog iste kategorije
              (obe stavke se vide u finansijama i mesečnom obračunu). Nalog se vraća u status „Nezavršen“ i plaća se
              tehničaru koji ga ispravi, kada ispravka bude verifikovana.
              {loadingPreview && ' Računam iznose...'}
            </span>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Odustani
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Čuvanje...' : 'Evidentiraj reklamaciju'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintModal;
