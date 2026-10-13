import React, { useEffect, useState } from 'react';
import { XIcon } from './icons/SvgIcons';
import { workOrdersAPI } from '../services/api';
import { toast } from '../utils/toast';
import { PENALTY_OPTIONS, applyPenaltyPercent, formatRsd } from '../utils/rejectionPenalty';

const optionCaption = (percent) => (percent === 0 ? 'bez minusa' : percent >= 100 ? 'ne plaća se' : 'minus');

// Superadmin menja minus naloga: poništava ga (0%) ili bira drugi procenat. Važi i za verifikovan nalog —
// isplata se preračunava, pa finansije, mesečni obračun i aplikacija tehničara pokazuju novi iznos.
const PenaltyAdjustModal = ({ isOpen, workOrderId, onClose, onAdjusted }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !workOrderId) return;
    let cancelled = false;
    setPreview(null);
    setSelected(null);
    setReason('');
    setLoading(true);
    workOrdersAPI.getRejectionPenalty(workOrderId)
      .then(res => {
        if (cancelled) return;
        setPreview(res.data);
        setSelected(res.data.currentPercent || 0);
      })
      .catch(error => {
        if (!cancelled) toast.error(error.response?.data?.error || 'Greška pri učitavanju minusa naloga');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, workOrderId]);

  if (!isOpen) return null;

  const current = preview?.currentPercent || 0;
  const options = preview?.options || PENALTY_OPTIONS;
  const payment = preview?.payment || null;
  const unchanged = selected === null || (selected === current && (!payment || payment.penaltyPercent === selected));

  const handleSubmit = async () => {
    if (unchanged || !workOrderId) return;
    setSubmitting(true);
    try {
      const response = await workOrdersAPI.updateRejectionPenalty(workOrderId, {
        percent: selected,
        reason: reason.trim()
      });
      const data = response.data || {};
      toast.success(data.financeUpdated
        ? `Minus je promenjen na ${data.percentAfter}% — isplata je preračunata`
        : `Minus je promenjen na ${data.percentAfter}% — primeniće se pri verifikaciji`);
      if (onAdjusted) await onAdjusted(data);
    } catch (error) {
      console.error('Greška pri promeni minusa:', error);
      toast.error(error.response?.data?.error || 'Neuspešna promena minusa!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10050]" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4" role="dialog" aria-modal="true" aria-labelledby="penalty-adjust-title">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 id="penalty-adjust-title" className="text-lg font-semibold text-slate-900">Promena minusa</h3>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <XIcon size={20} className="text-slate-400" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Minus se primenjuje na zaradu svih tehničara na nalogu. Ako tehničar nije kriv za vraćanje, izaberite 0%.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {loading || !preview ? (
            <p className="text-sm text-slate-500">{loading ? 'Učitavanje...' : 'Minus nije učitan.'}</p>
          ) : (
            <>
              <div role="radiogroup" aria-label="Minus na zaradu" className="grid grid-cols-4 gap-2">
                {options.map(percent => {
                  const isSelected = selected === percent;
                  return (
                    <label
                      key={percent}
                      className={`relative flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? (percent === 0 ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200' : 'bg-red-50 border-red-400 ring-2 ring-red-200')
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="penalty-percent"
                        value={percent}
                        checked={isSelected}
                        onChange={() => setSelected(percent)}
                        aria-label={`${percent}%`}
                        className="sr-only"
                      />
                      <span className={`text-base font-bold ${isSelected ? (percent === 0 ? 'text-emerald-800' : 'text-red-800') : 'text-slate-800'}`}>
                        {percent}%
                      </span>
                      <span className="text-[10px] text-slate-500">{optionCaption(percent)}</span>
                      {percent === current && (
                        <span className="absolute -top-2 right-1 text-[9px] font-semibold uppercase tracking-wide bg-slate-700 text-white px-1.5 rounded">
                          sada
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {payment ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">
                    {payment.entryType === 'complaint_fix' ? 'Isplata za ispravku po reklamaciji' : 'Nalog je plaćen'} — isplata se preračunava:
                  </p>
                  {payment.technicians.map(tech => {
                    const after = applyPenaltyPercent(tech.grossEarnings, selected ?? current);
                    return (
                      <div key={String(tech.technicianId)} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-800 font-medium truncate">{tech.name}</span>
                        <span className="text-slate-600 whitespace-nowrap">
                          {formatRsd(tech.earnings)}
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className={`font-semibold ${after < tech.earnings ? 'text-red-700' : after > tech.earnings ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {formatRsd(after)}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-slate-500">Finansije i mesečni obračun se odmah ažuriraju.</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  Nalog još nije plaćen — novi minus će se primeniti kada nalog bude verifikovan.
                </p>
              )}

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Razlog izmene (opciono), npr. tehničar nije kriv za vraćanje"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                rows={2}
              />
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex space-x-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Odustani
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || unchanged}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Čuvanje...' : 'Sačuvaj minus'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PenaltyAdjustModal;
