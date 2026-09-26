import React, { useEffect, useState } from 'react';
import { XIcon, AlertIcon } from './icons/SvgIcons';
import { workOrdersAPI } from '../services/api';
import { toast } from '../utils/toast';
import { getPenaltyInfo } from '../utils/rejectionPenalty';

// Potvrda vraćanja radnog naloga tehničaru. Checkbox za umanjenje zarade je podrazumevano
// označen — admin ga odčekira ako za ovo vraćanje ne želi da skine procenat.
const ReturnWorkOrderModal = ({
  isOpen,
  workOrderId,
  workOrder,
  initialComment = '',
  source = 'manual',
  onClose,
  onReturned
}) => {
  const [comment, setComment] = useState(initialComment);
  const [applyPenalty, setApplyPenalty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [penaltySource, setPenaltySource] = useState(workOrder || null);

  useEffect(() => {
    if (!isOpen) return;
    setComment(initialComment);
    setApplyPenalty(true);
    setPenaltySource(workOrder || null);

    // Uvek sveže stanje minusa (nalog je u međuvremenu mogao da vrati i drugi admin)
    let cancelled = false;
    if (workOrderId) {
      workOrdersAPI.getOne(workOrderId)
        .then(res => { if (!cancelled) setPenaltySource(res.data); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workOrderId]);

  if (!isOpen) return null;

  const info = getPenaltyInfo(penaltySource);

  const penaltyLabel = info.alreadyNotPaid
    ? 'Računaj i ovo vraćanje u umanjenje'
    : info.nextMeansNotPaid
      ? 'Računaj umanjenje — nalog se neće platiti tehničaru'
      : `Računaj -${info.step}%`;

  const handleSubmit = async () => {
    if (!comment.trim() || !workOrderId) return;
    setSubmitting(true);
    try {
      const response = await workOrdersAPI.returnIncorrect(workOrderId, {
        adminComment: comment.trim(),
        applyPenalty,
        source
      });
      const data = response.data || {};
      toast.success(
        data.penaltyApplied
          ? `Radni nalog je vraćen tehničaru (minus: ${data.penaltyPercentAfter}%)`
          : 'Radni nalog je vraćen tehničaru bez umanjenja'
      );
      if (onReturned) await onReturned(data);
    } catch (error) {
      console.error('Greška pri vraćanju radnog naloga:', error);
      toast.error(error.response?.data?.error || 'Neuspešno vraćanje radnog naloga!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10050]" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4" role="dialog" aria-modal="true" aria-labelledby="return-work-order-title">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 id="return-work-order-title" className="text-lg font-semibold text-slate-900">Vraćanje radnog naloga</h3>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <XIcon size={20} className="text-slate-400" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Unesite razlog vraćanja radnog naloga tehničaru
          </p>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Razlog vraćanja radnog naloga..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
            rows={source === 'ai' ? 7 : 4}
            autoFocus
          />

          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            applyPenalty ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={applyPenalty}
              onChange={(e) => setApplyPenalty(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm">
              <span className={`font-semibold ${applyPenalty ? 'text-red-800' : 'text-slate-700'}`}>
                {penaltyLabel}
              </span>
              <span className="text-slate-600"> (trenutni minus: {info.current}%)</span>
              <span className="block text-xs text-slate-500 mt-1">
                {applyPenalty
                  ? (info.alreadyNotPaid
                    ? 'Nalog se već ne plaća tehničaru.'
                    : `Posle vraćanja minus na zaradu za ovaj nalog: ${info.next}%.`)
                  : 'Vraćanje se beleži u istoriju, bez umanjenja zarade.'}
                {info.rejectionsInCycle > 0 && ` Nalog je do sada vraćen ${info.rejectionsInCycle} ${info.rejectionsInCycle === 1 ? 'put' : 'puta'}.`}
              </span>
            </span>
          </label>

          {info.nextMeansNotPaid && applyPenalty && (
            <div className="flex items-start gap-2 text-xs text-red-700">
              <AlertIcon size={14} className="mt-0.5 flex-shrink-0" />
              <span>Ovo je 6. vraćanje sa umanjenjem — nalog se tehničarima neće platiti.</span>
            </div>
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
            disabled={submitting || !comment.trim()}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Vraćanje...' : 'Vrati nalog'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnWorkOrderModal;
