// Mesečni obračun tehničara: isti raspored kao ranije (zaglavlje sa povratkom i slanjem, period, brojke, tabela),
// u izgledu Security dela. Slanje obračuna na email samo superadmin.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { toast } from '../../utils/toast';
import { financesAPI } from '../../services/api';
import { formatRsd } from '../../utils/rejectionPenalty';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { Field, Input, Choice, DateField } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { Loading, LinkBtn } from '../../montaza/ui';
import './TechnicianMonthlyStatement.mx.css';

const MONTH_NAMES = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kratka oznaka u koloni "Minus" za odbitke po reklamaciji
const deductionMinusLabel = (row) => {
  if (row.deductionKind === 'complaint_order') return 'ne plaća se';
  if (row.deductionKind === 'complaint_extra') return 'skinut';
  return 'odbitak';
};

const toIsoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Poslednjih 12 meseci, tekući mesec prvi
const buildMonthOptions = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    return {
      key: `${first.getFullYear()}-${first.getMonth() + 1}`,
      label: `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`,
      dateFrom: toIsoDate(first),
      dateTo: toIsoDate(last)
    };
  });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const TechnicianMonthlyStatement = () => {
  const { id } = useParams();
  const monthOptions = useMemo(buildMonthOptions, []);

  const storedUser = localStorage.getItem('user');
  const currentUserRole = storedUser ? JSON.parse(storedUser).role : null;
  const canSend = currentUserRole === 'superadmin';

  const [mode, setMode] = useState('month'); // 'month' | 'custom'
  const [selectedMonthKey, setSelectedMonthKey] = useState(monthOptions[0].key);
  const [customFrom, setCustomFrom] = useState(monthOptions[0].dateFrom);
  const [customTo, setCustomTo] = useState(toIsoDate(new Date()));
  const [period, setPeriod] = useState({ dateFrom: monthOptions[0].dateFrom, dateTo: monthOptions[0].dateTo });

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Slanje: 'confirm' (email postoji), 'enterEmail' (tehničar nema email), 'askDefault' (sačuvati kao podrazumevani?)
  const [sendStep, setSendStep] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const fetchStatement = useCallback(async (dateFrom, dateTo) => {
    setLoading(true);
    setError('');
    try {
      const response = await financesAPI.getTechnicianStatement(id, { dateFrom, dateTo });
      setStatement(response.data);
    } catch (err) {
      console.error('Greška pri učitavanju obračuna:', err);
      setError(err.response?.data?.error || 'Greška pri učitavanju obračuna');
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStatement(period.dateFrom, period.dateTo);
  }, [fetchStatement, period]);

  const selectMonth = (option) => {
    setMode('month');
    setSelectedMonthKey(option.key);
    setPeriod({ dateFrom: option.dateFrom, dateTo: option.dateTo });
  };

  const applyCustomPeriod = () => {
    if (!customFrom || !customTo) {
      toast.error('Izaberite datum od i do');
      return;
    }
    if (customFrom > customTo) {
      toast.error('Datum "od" ne može biti posle datuma "do"');
      return;
    }
    setPeriod({ dateFrom: customFrom, dateTo: customTo });
  };

  const technician = statement?.technician;
  const rows = statement?.rows || [];
  const summary = statement?.summary || {};
  const periodLabel = statement?.periodLabel || '';

  const openSend = () => {
    if (!statement) return;
    if (technician?.gmail) {
      setSendStep('confirm');
    } else {
      setEmailInput('');
      setSendStep('enterEmail');
    }
  };

  const closeSend = () => {
    if (sending) return;
    setSendStep(null);
  };

  const sendStatement = async ({ email, saveAsDefault }) => {
    setSending(true);
    try {
      const response = await financesAPI.sendTechnicianStatement(id, {
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        ...(email ? { email } : {}),
        saveAsDefault: !!saveAsDefault
      });
      toast.success(response.data?.message || 'Obračun je poslat');
      if (response.data?.savedAsDefault) {
        setStatement(prev => prev ? { ...prev, technician: { ...prev.technician, gmail: response.data.recipient } } : prev);
      }
      setSendStep(null);
    } catch (err) {
      console.error('Greška pri slanju obračuna:', err);
      if (err.response?.data?.code === 'NO_EMAIL') {
        setEmailInput('');
        setSendStep('enterEmail');
      } else {
        toast.error(err.response?.data?.error || 'Slanje obračuna nije uspelo');
      }
    } finally {
      setSending(false);
    }
  };

  const confirmEnteredEmail = () => {
    const trimmed = emailInput.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      toast.error('Email nije u ispravnom formatu (npr. ime@domen.com)');
      return;
    }
    setEmailInput(trimmed);
    setSendStep('askDefault');
  };

  return (
    <div className="sx-page mx-tobr" data-testid="page-technician-obracun">
      <PageHead
        eyebrow="Montaža · Tehničari"
        title="Mesečni obračun"
        lead={`${technician?.name || 'Tehničar'}${periodLabel ? ` · ${periodLabel}` : ''}`}
        actions={<>
          <LinkBtn to={`/technicians/${id}`} icon={ArrowLeft}>Nazad na tehničara</LinkBtn>
          {canSend && <Btn variant="primary" icon={Send} onClick={openSend} disabled={loading || !statement}>Pošalji</Btn>}
        </>}
      />

      <div className="sx-stack">
        {/* Period: meseci kao pilule, prilagođeni period sa datumima od i do */}
        <Panel title="Period" testId="statement-period">
          <Choice
            value={mode === 'custom' ? 'custom' : selectedMonthKey}
            onChange={(value) => (value === 'custom' ? setMode('custom') : selectMonth(monthOptions.find((o) => o.key === value)))}
            options={[...monthOptions.map((o) => ({ value: o.key, label: o.label })), { value: 'custom', label: 'Prilagođeni period' }]}
            label="Period"
            size="sm"
          />
          {mode === 'custom' && (
            <div className="mx-tobr-custom">
              <Field label="Od" htmlFor="obracun-od">
                <DateField id="obracun-od" value={customFrom} onChange={setCustomFrom} clearable />
              </Field>
              <Field label="Do" htmlFor="obracun-do">
                <DateField id="obracun-do" value={customTo} onChange={setCustomTo} clearable />
              </Field>
              <Btn icon={RefreshCw} onClick={applyCustomPeriod}>Prikaži</Btn>
            </div>
          )}
        </Panel>

        {error && <Note tone="bad">{error}</Note>}

        {/* Rezime */}
        {statement && (
          <div className="sx-stats mx-tobr-stats">
            <Stat label="Naloga" value={summary.ordersCount || 0} />
            <Stat label="Ukupno za isplatu" value={formatRsd(summary.totalEarnings)} tone={summary.totalEarnings < 0 ? 'bad' : null} />
            <Stat
              label="Umanjenja (vraćanja)"
              value={summary.totalPenalties > 0 ? `-${formatRsd(summary.totalPenalties)}` : formatRsd(0)}
              sub={`${summary.penalizedCount || 0} naloga sa minusom`}
              tone={summary.totalPenalties > 0 ? 'bad' : null}
            />
            <Stat
              label="Odbici (reklamacije)"
              value={formatRsd(summary.complaintDeductions || 0)}
              sub={`${summary.complaintDeductionsCount || 0} odbitaka`}
              tone={summary.complaintDeductions ? 'bad' : null}
            />
          </div>
        )}

        {/* Tabela */}
        <Panel pad={false} testId="statement-table">
          {loading ? (
            <Loading text="Učitavanje obračuna..." />
          ) : rows.length === 0 ? (
            <div className="sx-empty-block">
              <b>Nema obračunatih naloga za izabrani period</b>
            </div>
          ) : (
            <div className="sx-tablewrap">
              <table className="sx-table">
                <thead>
                  <tr>
                    <th>TIS ID</th>
                    <th>Job ID</th>
                    <th>Datum</th>
                    <th>Adresa</th>
                    <th className="is-num">Zarada</th>
                    <th>Minus</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isDeduction = row.entryType === 'complaint_deduction';
                    const isFix = row.entryType === 'complaint_fix';
                    return (
                      <tr key={row.transactionId} style={{ '--i': index }} className={isDeduction ? 'mx-tobr-ded' : undefined}>
                        <td className="is-head"><b className="sx-mono mx-strong">{row.tisId || '-'}</b></td>
                        <td data-label="Job ID"><span className="sx-mono">{row.tisJobId || '-'}</span></td>
                        <td data-label="Datum" className="sx-nowrap">{formatDate(row.workOrderDate)}</td>
                        <td data-label="Adresa" className="is-wide">
                          {row.address || '-'}
                          {isDeduction && <span className="mx-tobr-tag is-bad">{row.label || 'Reklamacija - odbitak'}</span>}
                          {isFix && <span className="mx-tobr-tag is-info">Ispravka po reklamaciji</span>}
                        </td>
                        <td data-label="Zarada" className={cx('is-num', row.earnings < 0 && 'mx-tobr-neg')}>
                          {formatRsd(row.earnings)}
                          {row.penaltyPercent > 0 && <span className="mx-tobr-gross">{formatRsd(row.grossEarnings)}</span>}
                        </td>
                        <td data-label="Minus">
                          {isDeduction
                            ? <Sign tone="bad">{deductionMinusLabel(row)}</Sign>
                            : row.penaltyPercent > 0
                              ? <span className="sx-tag is-bad">-{row.penaltyPercent}%</span>
                              : <span className="sx-faint">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="is-end">Ukupno</td>
                    <td className={cx('is-num', summary.totalEarnings < 0 && 'mx-tobr-neg')}>{formatRsd(summary.totalEarnings)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>

        {technician?.paymentType === 'plata' && (
          <p className="mx-tobr-hint">
            Tehničar je na platu ({formatRsd(technician.monthlySalary)} mesečno) - iznosi u tabeli su deo prihoda koji se računa ka plati.
          </p>
        )}
      </div>

      {/* Slanje obračuna */}
      <Dialog
        open={!!sendStep}
        onClose={closeSend}
        busy={sending}
        title={sendStep === 'askDefault' ? 'Podrazumevani email' : 'Slanje obračuna'}
        testId="statement-send"
        footer={<>
          {sendStep === 'confirm' && (
            <>
              <Btn variant="ghost" onClick={closeSend} disabled={sending}>Odustani</Btn>
              <Btn variant="primary" icon={Send} onClick={() => sendStatement({})} disabled={sending}>
                {sending ? 'Slanje...' : 'Pošalji'}
              </Btn>
            </>
          )}
          {sendStep === 'enterEmail' && (
            <>
              <Btn variant="ghost" onClick={closeSend}>Odustani</Btn>
              <Btn variant="primary" onClick={confirmEnteredEmail} disabled={!emailInput.trim()}>Dalje</Btn>
            </>
          )}
          {sendStep === 'askDefault' && (
            <>
              <Btn onClick={() => sendStatement({ email: emailInput, saveAsDefault: false })} disabled={sending}>Ne, samo pošalji</Btn>
              <Btn variant="primary" onClick={() => sendStatement({ email: emailInput, saveAsDefault: true })} disabled={sending}>
                {sending ? 'Slanje...' : 'Da, podesi i pošalji'}
              </Btn>
            </>
          )}
        </>}
      >
        {sendStep === 'confirm' && (
          <p>
            Poslati obračun za period <strong>{periodLabel}</strong> tehničaru <strong>{technician?.name}</strong> na{' '}
            <strong>{technician?.gmail}</strong>?
          </p>
        )}

        {sendStep === 'enterEmail' && (
          <>
            <p>
              Tehničar nema unet email. Unesite na koji email želite da pošaljete obračun za period <strong>{periodLabel}</strong>.
            </p>
            <Input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmEnteredEmail(); }}
              placeholder="ime@domen.com"
              autoFocus
              aria-label="Email"
              className="mx-mt"
            />
          </>
        )}

        {sendStep === 'askDefault' && (
          <p>
            Da li želite da podesite <strong>{emailInput}</strong> kao podrazumevani email tehničara{' '}
            <strong>{technician?.name}</strong>? Sledeći obračun će se tada automatski slati na ovaj email.
          </p>
        )}
      </Dialog>
    </div>
  );
};

export default TechnicianMonthlyStatement;
