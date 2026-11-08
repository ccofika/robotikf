import React, { useEffect, useState } from 'react';
import { workOrdersAPI } from '../services/api';
import { toast } from '../utils/toast';
import { PENALTY_OPTIONS, applyPenaltyPercent, formatRsd } from '../utils/rejectionPenalty';
import Dialog from '../security/sx/Dialog';
import { cx, Btn } from '../security/sx/ui';
import { Textarea } from '../security/sx/forms';
import './WorkOrderDialogs.mx.css';

const optionCaption = (percent) => (percent === 0 ? 'bez minusa' : percent >= 100 ? 'ne plaća se' : 'minus');

// Superadmin menja minus naloga: poništava ga (0%) ili bira drugi procenat. Važi i za verifikovan nalog -
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
        ? `Minus je promenjen na ${data.percentAfter}% - isplata je preračunata`
        : `Minus je promenjen na ${data.percentAfter}% - primeniće se pri verifikaciji`);
      if (onAdjusted) await onAdjusted(data);
    } catch (error) {
      console.error('Greška pri promeni minusa:', error);
      toast.error(error.response?.data?.error || 'Neuspešna promena minusa!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      onClose={onClose}
      busy={submitting}
      title="Promena minusa"
      description="Minus se primenjuje na zaradu svih tehničara na nalogu. Ako tehničar nije kriv za vraćanje, izaberite 0%."
      testId="penalty-adjust-dialog"
      initialFocus={false}
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Odustani</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={submitting || loading || unchanged} data-testid="penalty-submit">
          {submitting ? 'Čuvanje...' : 'Sačuvaj minus'}
        </Btn>
      </>}
    >
      {loading || !preview ? (
        <p className="mx-wodlg-muted">{loading ? 'Učitavanje...' : 'Minus nije učitan.'}</p>
      ) : (
        <div className="mx-wodlg-stack">
          <div role="radiogroup" aria-label="Minus na zaradu" className="mx-wodlg-pcts">
            {options.map(percent => {
              const isSelected = selected === percent;
              return (
                <label key={percent} className={cx('mx-wodlg-pct', isSelected && (percent === 0 ? 'is-ok' : 'is-bad'))}>
                  <input
                    type="radio"
                    name="penalty-percent"
                    value={percent}
                    checked={isSelected}
                    onChange={() => setSelected(percent)}
                    aria-label={`${percent}%`}
                    className="sx-sr"
                  />
                  <span className="mx-wodlg-pct__num">{percent}%</span>
                  <span className="mx-wodlg-pct__cap">{optionCaption(percent)}</span>
                  {percent === current && (
                    <span className="mx-wodlg-pct__now">sada</span>
                  )}
                </label>
              );
            })}
          </div>

          {payment ? (
            <div className="mx-wodlg-box">
              <p className="mx-wodlg-box__title">
                {payment.entryType === 'complaint_fix' ? 'Isplata za ispravku po reklamaciji' : 'Nalog je plaćen'} - isplata se preračunava:
              </p>
              {payment.technicians.map(tech => {
                const after = applyPenaltyPercent(tech.grossEarnings, selected ?? current);
                return (
                  <div key={String(tech.technicianId)} className="mx-wodlg-pay">
                    <span className="mx-wodlg-pay__name">{tech.name}</span>
                    <span className="mx-wodlg-pay__sum">
                      {formatRsd(tech.earnings)}
                      <span className="mx-wodlg-faint"> → </span>
                      <b className={after < tech.earnings ? 'mx-wodlg-bad' : after > tech.earnings ? 'mx-wodlg-ok' : undefined}>
                        {formatRsd(after)}
                      </b>
                    </span>
                  </div>
                );
              })}
              <p className="mx-wodlg-hint">Finansije i mesečni obračun se odmah ažuriraju.</p>
            </div>
          ) : (
            <p className="mx-wodlg-box mx-wodlg-hint">
              Nalog još nije plaćen - novi minus će se primeniti kada nalog bude verifikovan.
            </p>
          )}

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Razlog izmene (opciono), npr. tehničar nije kriv za vraćanje"
            rows={2}
          />
        </div>
      )}
    </Dialog>
  );
};

export default PenaltyAdjustModal;
