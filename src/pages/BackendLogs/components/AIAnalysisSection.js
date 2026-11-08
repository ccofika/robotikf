import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, RefreshCw, TrendingUp, Lightbulb, Settings, Clock, Check, Zap } from 'lucide-react';
import { toast } from '../../../components/ui/toast';
import { Btn, cx } from '../../../security/sx/ui';
import { Panel, Note, Stat } from '../../../security/sx/layout';
import { Field } from '../../../security/sx/forms';
import { DateTimeInput } from '../../../components/ui/DateTimePicker';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AIAnalysisSection = () => {
  const [loading, setLoading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  // Custom period
  const [customPeriodStart, setCustomPeriodStart] = useState('');
  const [customPeriodEnd, setCustomPeriodEnd] = useState('');

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ai-analysis/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data) {
        setLatestAnalysis(response.data.data);
        setSelectedAnalysis(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching latest analysis:', error);
    }
  };

  const fetchAnalysisHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ai-analysis/history?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAnalysisHistory(response.data.data.analyses);
      }
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      toast.error('Greška pri učitavanju istorije analiza');
    }
  };

  const triggerManualAnalysis = async () => {
    if (!customPeriodStart || !customPeriodEnd) {
      toast.error('Molimo unesite početni i krajnji datum');
      return;
    }

    const start = new Date(customPeriodStart);
    const end = new Date(customPeriodEnd);

    if (start >= end) {
      toast.error('Početni datum mora biti pre krajnjeg datuma');
      return;
    }

    try {
      setLoading(true);
      toast.info('AI analiza u toku... Ovo može potrajati 30-60 sekundi.');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/ai-analysis/analyze`,
        {
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          analysisType: 'manual'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('AI analiza uspešno završena!');
        setLatestAnalysis(response.data.data);
        setSelectedAnalysis(response.data.data);

        // Reset custom period
        setCustomPeriodStart('');
        setCustomPeriodEnd('');
      }
    } catch (error) {
      console.error('Error triggering AI analysis:', error);
      toast.error(error.response?.data?.message || 'Greška pri pokretanju AI analize');
    } finally {
      setLoading(false);
    }
  };

  const handleShowHistory = async () => {
    if (!showHistory) {
      await fetchAnalysisHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleSelectAnalysis = async (analysisId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ai-analysis/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSelectedAnalysis(response.data.data);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast.error('Greška pri učitavanju analize');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPeriod = (start, end) => {
    const startDate = new Date(start).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
    const endDate = new Date(end).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `${startDate} - ${endDate}`;
  };

  if (!selectedAnalysis && !loading) {
    return (
      <div className="sx-stack">
        {/* Manual Analysis Trigger */}
        <Panel title="Manuelna AI Analiza" sub="Pokrenite analizu za specifičan period">
          <div className="sx-form mx-bl-aiform">
            <Field label="Početni datum i vreme" htmlFor="mx-bl-ai-start">
              <DateTimeInput id="mx-bl-ai-start" value={customPeriodStart} onChange={setCustomPeriodStart} disabled={loading} />
            </Field>
            <Field label="Krajnji datum i vreme" htmlFor="mx-bl-ai-end">
              <DateTimeInput id="mx-bl-ai-end" value={customPeriodEnd} onChange={setCustomPeriodEnd} disabled={loading} />
            </Field>
          </div>
          <Btn variant="primary" icon={Brain} onClick={triggerManualAnalysis} disabled={loading || !customPeriodStart || !customPeriodEnd} className="mx-bl-runbtn">
            {loading ? 'Analiza u toku...' : 'Pokreni AI Analizu'}
          </Btn>
        </Panel>

        {/* Empty State */}
        <Panel pad={false}>
          <div className="sx-empty-block">
            <b>Nema dostupnih AI analiza</b>
            <span>Pokrenite manuelnu analizu ili sačekajte automatsku analizu u 12:00</span>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="sx-stack">
      {/* Controls */}
      <div className="mx-bl-controls">
        {/* Manual Analysis Trigger */}
        <Panel title="Manuelna Analiza" className="mx-bl-controls__main">
          <div className="mx-bl-runrow">
            <DateTimeInput compact value={customPeriodStart} onChange={setCustomPeriodStart} disabled={loading} aria-label="Početni datum i vreme" />
            <DateTimeInput compact value={customPeriodEnd} onChange={setCustomPeriodEnd} disabled={loading} aria-label="Krajnji datum i vreme" />
          </div>
          <Btn variant="primary" icon={Brain} onClick={triggerManualAnalysis} disabled={loading || !customPeriodStart || !customPeriodEnd} className="mx-bl-runbtn">
            {loading ? 'Analiza u toku...' : 'Pokreni Analizu'}
          </Btn>
        </Panel>

        {/* History Button */}
        <div className="sx-card mx-bl-controls__side">
          <button type="button" onClick={handleShowHistory} className="mx-bl-histbtn">
            <Clock size={20} strokeWidth={1.9} aria-hidden="true" />
            <span>{showHistory ? 'Sakrij Istoriju' : 'Prikaži Istoriju'}</span>
          </button>
        </div>
      </div>

      {/* History List */}
      {showHistory && (
        <Panel title="Istorija AI Analiza">
          {analysisHistory.length === 0 ? (
            <p className="sx-muted">Nema dostupnih analiza</p>
          ) : (
            <div className="sx-list">
              {analysisHistory.map((analysis) => (
                <button
                  key={analysis._id}
                  type="button"
                  onClick={() => handleSelectAnalysis(analysis._id)}
                  className={cx('sx-item is-click mx-bl-hist', selectedAnalysis?._id === analysis._id && 'is-on')}
                >
                  <span className="sx-item__main">
                    <b>{formatDate(analysis.analysisDate)}</b>
                    <span>Period: {formatDate(analysis.periodStart)} - {formatDate(analysis.periodEnd)}</span>
                  </span>
                  <span className="sx-item__side">
                    <span className={cx('sx-tag', analysis.analysisType === 'scheduled' ? 'is-info' : 'is-ok')}>
                      {analysis.analysisType === 'scheduled' ? 'Automatska' : 'Manuelna'}
                    </span>
                    {selectedAnalysis?._id === analysis._id && (
                      <Check size={18} strokeWidth={2} className="mx-bl-hist__check" aria-hidden="true" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Analysis Results - Always Expanded */}
      {selectedAnalysis && (
        <Panel
          title="AI Analiza Sistema"
          sub={`${formatPeriod(selectedAnalysis.periodStart, selectedAnalysis.periodEnd)} • Generisano ${formatDate(selectedAnalysis.analysisDate)}`}
          actions={<Btn size="sm" variant="ghost" icon={RefreshCw} onClick={fetchLatestAnalysis} aria-label="Osveži" title="Osveži" />}
        >
          {/* Stats Bar */}
          {selectedAnalysis.statistics && (
            <div className="sx-stats mx-bl-aistats">
              <Stat label="Ukupno Logova" value={selectedAnalysis.statistics.totalLogs || 0} />
              <Stat label="Admin Aktivnosti" value={selectedAnalysis.statistics.adminActivities || 0} />
              <Stat label="Greške" value={selectedAnalysis.statistics.errorLogs || 0} tone={selectedAnalysis.statistics.errorLogs ? 'bad' : null} />
              <Stat label="Prosečno Vreme" value={selectedAnalysis.statistics.avgResponseTime?.toFixed(0) || 0} small="ms" />
            </div>
          )}

          {/* Summary */}
          {selectedAnalysis.analysis.summary && (
            <Note tone="info" icon={Zap} className="mx-bl-summary">
              <h4 className="mx-bl-summary__title">Kratak Pregled</h4>
              <p>{selectedAnalysis.analysis.summary}</p>
            </Note>
          )}

          {/* Main Analysis Sections */}
          <div className="mx-bl-aigrid">
            {selectedAnalysis.analysis.trends && (
              <AISekcija icon={TrendingUp} title="Uočeni Trendovi">{selectedAnalysis.analysis.trends}</AISekcija>
            )}
            {selectedAnalysis.analysis.patterns && (
              <AISekcija icon={RefreshCw} title="Ponavljajući Obrasci">{selectedAnalysis.analysis.patterns}</AISekcija>
            )}
            {selectedAnalysis.analysis.automationSuggestions && (
              <AISekcija icon={Settings} title="Predlozi za Automatizaciju">{selectedAnalysis.analysis.automationSuggestions}</AISekcija>
            )}
            {selectedAnalysis.analysis.improvementIdeas && (
              <AISekcija icon={Lightbulb} title="Ideje za Unapređenje">{selectedAnalysis.analysis.improvementIdeas}</AISekcija>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};

// Odeljak AI analize: ikonica, naslov i tekst (redovi kao u odgovoru)
export function AISekcija({ icon: Icon, title, tone, wide, children }) {
  return (
    <section className={cx('mx-bl-aisec', wide && 'is-wide')}>
      <div className="mx-bl-aisec__head">
        <span className={cx('sx-item__icon', tone && `is-${tone}`)}><Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>
        <h4 className="mx-bl-aisec__title">{title}</h4>
      </div>
      <div className="mx-bl-aitext">{children}</div>
    </section>
  );
}

export default AIAnalysisSection;
