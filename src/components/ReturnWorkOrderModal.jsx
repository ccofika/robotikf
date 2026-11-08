import React, { useEffect, useState } from 'react';
import { workOrdersAPI } from '../services/api';
import { toast } from '../utils/toast';
import { getPenaltyInfo } from '../utils/rejectionPenalty';
import Dialog from '../security/sx/Dialog';
import { cx, Btn } from '../security/sx/ui';
import { Note } from '../security/sx/layout';
import { Textarea, Checkbox } from '../security/sx/forms';
import './WorkOrderDialogs.mx.css';

// Potvrda vraćanja radnog naloga tehničaru. Checkbox za umanjenje zarade je podrazumevano
// označen - admin ga odčekira ako za ovo vraćanje ne želi da skine procenat.
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
      ? 'Računaj umanjenje - nalog se neće platiti tehničaru'
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
    <Dialog
      onClose={onClose}
      busy={submitting}
      title="Vraćanje radnog naloga"
      description="Unesite razlog vraćanja radnog naloga tehničaru"
      testId="return-work-order-dialog"
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Odustani</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={submitting || !comment.trim()} data-testid="return-work-order-submit">
          {submitting ? 'Vraćanje...' : 'Vrati nalog'}
        </Btn>
      </>}
    >
      <div className="mx-wodlg-stack">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Razlog vraćanja radnog naloga..."
          rows={source === 'ai' ? 7 : 4}
          autoFocus
        />

        <div className={cx('mx-wodlg-choice', applyPenalty && 'is-on')}>
          <Checkbox checked={applyPenalty} onChange={setApplyPenalty} tone="danger" testId="return-apply-penalty">
            <span className="mx-wodlg-choice__title">{penaltyLabel}</span>
            <span className="mx-wodlg-muted"> (trenutni minus: {info.current}%)</span>
            <span className="mx-wodlg-hint">
              {applyPenalty
                ? (info.alreadyNotPaid
                  ? 'Nalog se već ne plaća tehničaru.'
                  : `Posle vraćanja minus na zaradu za ovaj nalog: ${info.next}%.`)
                : 'Vraćanje se beleži u istoriju, bez umanjenja zarade.'}
              {info.rejectionsInCycle > 0 && ` Nalog je do sada vraćen ${info.rejectionsInCycle} ${info.rejectionsInCycle === 1 ? 'put' : 'puta'}.`}
            </span>
          </Checkbox>
        </div>

        {info.nextMeansNotPaid && applyPenalty && (
          <Note tone="bad">Ovo je 6. vraćanje sa umanjenjem - nalog se tehničarima neće platiti.</Note>
        )}
      </div>
    </Dialog>
  );
};

export default ReturnWorkOrderModal;
