import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, CalendarIcon, DollarSignIcon, XIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { financesAPI } from '../../services/api';
import { formatRsd } from '../../utils/rejectionPenalty';

const MONTH_NAMES = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Klasa .text-center je globalno pregažena u nekoliko CSS fajlova (padding, kurziv), pa se centrira inline
const CENTER = { textAlign: 'center' };

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
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <DollarSignIcon size={24} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mesečni obračun</h1>
              <p className="text-slate-600 mt-1">{technician?.name || 'Tehničar'}{periodLabel ? ` · ${periodLabel}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/technicians/${id}`}>
              <Button type="secondary" size="medium" prefix={<BackIcon size={16} />}>
                Nazad na tehničara
              </Button>
            </Link>
            {canSend && (
              <button
                onClick={openSend}
                disabled={loading || !statement}
                className="h-10 px-5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
              >
                Pošalji
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Period */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Period</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {monthOptions.map(option => (
            <button
              key={option.key}
              onClick={() => selectMonth(option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'month' && selectedMonthKey === option.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={() => setMode('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              mode === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
            }`}
          >
            Prilagođeni period
          </button>
        </div>

        {mode === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 mt-4">
            <label className="text-sm text-slate-600">
              <span className="block mb-1">Od</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm text-slate-600">
              <span className="block mb-1">Do</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <Button type="secondary" size="medium" onClick={applyCustomPeriod} prefix={<RefreshIcon size={16} />}>
              Prikaži
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* Rezime */}
      {statement && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Naloga</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.ordersCount || 0}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Ukupno za isplatu</div>
            <div className={`text-2xl font-bold mt-1 ${summary.totalEarnings < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {formatRsd(summary.totalEarnings)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Umanjenja (vraćanja)</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              {summary.totalPenalties > 0 ? `-${formatRsd(summary.totalPenalties)}` : formatRsd(0)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{summary.penalizedCount || 0} naloga sa minusom</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Odbici (reklamacije)</div>
            <div className="text-2xl font-bold text-red-700 mt-1">{formatRsd(summary.complaintDeductions || 0)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{summary.complaintDeductionsCount || 0} odbitaka</div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm font-medium">Učitavanje obračuna...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">TIS ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Job ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Datum</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresa</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Zarada</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider" style={CENTER}>Minus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-slate-500 text-sm" style={CENTER}>
                      Nema obračunatih naloga za izabrani period
                    </td>
                  </tr>
                ) : rows.map(row => {
                  const isDeduction = row.entryType === 'complaint_deduction';
                  const isFix = row.entryType === 'complaint_fix';
                  return (
                    <tr key={row.transactionId} className={isDeduction ? 'bg-red-50/60' : 'hover:bg-slate-50'}>
                      <td className="px-5 py-3 text-sm font-mono text-slate-800">{row.tisId || '—'}</td>
                      <td className="px-5 py-3 text-sm font-mono text-slate-800">{row.tisJobId || '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-700 whitespace-nowrap">{formatDate(row.workOrderDate)}</td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {row.address || '—'}
                        {isDeduction && (
                          <span className="block text-[11px] font-semibold text-red-700 mt-0.5">{row.label || 'Reklamacija — odbitak'}</span>
                        )}
                        {isFix && (
                          <span className="block text-[11px] font-semibold text-blue-700 mt-0.5">Ispravka po reklamaciji</span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-sm text-right font-mono font-semibold whitespace-nowrap ${row.earnings < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                        {formatRsd(row.earnings)}
                        {row.penaltyPercent > 0 && (
                          <span className="block text-[11px] font-normal text-slate-400 line-through">{formatRsd(row.grossEarnings)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap" style={CENTER}>
                        {isDeduction
                          ? <span className="text-xs font-semibold text-red-700">{deductionMinusLabel(row)}</span>
                          : row.penaltyPercent > 0
                            ? <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">-{row.penaltyPercent}%</span>
                            : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan="4" className="px-5 py-3 text-sm font-semibold text-right text-slate-700">Ukupno</td>
                    <td className={`px-5 py-3 text-sm text-right font-mono font-bold whitespace-nowrap ${summary.totalEarnings < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                      {formatRsd(summary.totalEarnings)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {technician?.paymentType === 'plata' && (
        <p className="text-xs text-slate-500 mt-3">
          Tehničar je na platu ({formatRsd(technician.monthlySalary)} mesečno) — iznosi u tabeli su deo prihoda koji se računa ka plati.
        </p>
      )}

      {/* Slanje obračuna */}
      {sendStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeSend(); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="statement-send-title">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 id="statement-send-title" className="text-lg font-semibold text-slate-900">
                {sendStep === 'askDefault' ? 'Podrazumevani email' : 'Slanje obračuna'}
              </h3>
              <button onClick={closeSend} disabled={sending} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <XIcon size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6">
              {sendStep === 'confirm' && (
                <p className="text-sm text-slate-700">
                  Poslati obračun za period <strong>{periodLabel}</strong> tehničaru <strong>{technician?.name}</strong> na{' '}
                  <strong>{technician?.gmail}</strong>?
                </p>
              )}

              {sendStep === 'enterEmail' && (
                <>
                  <p className="text-sm text-slate-700 mb-3">
                    Tehničar nema unet email. Unesite na koji email želite da pošaljete obračun za period <strong>{periodLabel}</strong>.
                  </p>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmEnteredEmail(); }}
                    placeholder="ime@domen.com"
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}

              {sendStep === 'askDefault' && (
                <p className="text-sm text-slate-700">
                  Da li želite da podesite <strong>{emailInput}</strong> kao podrazumevani email tehničara{' '}
                  <strong>{technician?.name}</strong>? Sledeći obračun će se tada automatski slati na ovaj email.
                </p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              {sendStep === 'confirm' && (
                <>
                  <button onClick={closeSend} disabled={sending} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50">
                    Odustani
                  </button>
                  <button onClick={() => sendStatement({})} disabled={sending} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50">
                    {sending ? 'Slanje...' : 'Pošalji'}
                  </button>
                </>
              )}
              {sendStep === 'enterEmail' && (
                <>
                  <button onClick={closeSend} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg">
                    Odustani
                  </button>
                  <button onClick={confirmEnteredEmail} disabled={!emailInput.trim()} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50">
                    Dalje
                  </button>
                </>
              )}
              {sendStep === 'askDefault' && (
                <>
                  <button onClick={() => sendStatement({ email: emailInput, saveAsDefault: false })} disabled={sending} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50">
                    Ne, samo pošalji
                  </button>
                  <button onClick={() => sendStatement({ email: emailInput, saveAsDefault: true })} disabled={sending} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50">
                    {sending ? 'Slanje...' : 'Da, podesi i pošalji'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianMonthlyStatement;
