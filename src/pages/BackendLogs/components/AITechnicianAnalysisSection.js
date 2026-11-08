import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HardHat, RefreshCw, TrendingUp, Lightbulb, TriangleAlert, Clock, Check, Zap, Award, Settings } from 'lucide-react';
import { toast } from '../../../components/ui/toast';
import { Btn, cx } from '../../../security/sx/ui';
import { Panel, Note, Stat } from '../../../security/sx/layout';
import { Field } from '../../../security/sx/forms';
import { Loading } from '../../../montaza/ui';
import { DateTimeInput } from '../../../components/ui/DateTimePicker';
import { AISekcija } from './AIAnalysisSection';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AITechnicianAnalysisSection = () => {
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
      const response = await axios.get(`${API_URL}/api/ai-technician-analysis/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data) {
        setLatestAnalysis(response.data.data);
        setSelectedAnalysis(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching latest technician analysis:', error);
    }
  };

  const fetchAnalysisHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ai-technician-analysis/history?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAnalysisHistory(response.data.data.analyses);
      }
    } catch (error) {
      console.error('Error fetching technician analysis history:', error);
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
      toast.info('AI analiza tehničara u toku... Ovo može potrajati 30-60 sekundi.');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/ai-technician-analysis/analyze`,
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
        toast.success('AI analiza tehničara uspešno završena!');
        setLatestAnalysis(response.data.data);
        setSelectedAnalysis(response.data.data);

        // Reset custom period
        setCustomPeriodStart('');
        setCustomPeriodEnd('');
      }
    } catch (error) {
      console.error('Error triggering AI technician analysis:', error);
      toast.error(error.response?.data?.message || 'Greška pri pokretanju AI analize tehničara');
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
      const response = await axios.get(`${API_URL}/api/ai-technician-analysis/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSelectedAnalysis(response.data.data);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error fetching technician analysis:', error);
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

  if (loading) {
    return (
      <Panel pad={false}>
        <Loading text="Pokretanje AI analize tehničara..." />
      </Panel>
    );
  }

  return (
    <div className="sx-stack">
      {/* Manual Analysis Card + History Button */}
      <Panel
        title="Manuelna AI Analiza Tehničara"
        sub="Pokrenite AI analizu rada tehničara za željeni period"
        actions={
          <Btn size="sm" icon={Clock} onClick={handleShowHistory}>
            {showHistory ? 'Sakrij Istoriju' : 'Prikaži Istoriju'}
          </Btn>
        }
        footer={
          <Btn variant="primary" icon={HardHat} onClick={triggerManualAnalysis} disabled={loading || !customPeriodStart || !customPeriodEnd}>
            {loading ? 'Analiza u toku...' : 'Pokreni Analizu'}
          </Btn>
        }
      >
        <div className="sx-form">
          <Field label="Od datuma:" htmlFor="mx-bl-tai-start">
            <DateTimeInput id="mx-bl-tai-start" value={customPeriodStart} onChange={setCustomPeriodStart} />
          </Field>
          <Field label="Do datuma:" htmlFor="mx-bl-tai-end">
            <DateTimeInput id="mx-bl-tai-end" value={customPeriodEnd} onChange={setCustomPeriodEnd} />
          </Field>
        </div>
      </Panel>

      {/* History List */}
      {showHistory && (
        <Panel title="Istorija AI Analiza Tehničara">
          {analysisHistory.length === 0 ? (
            <p className="sx-muted">Nema dostupnih analiza</p>
          ) : (
            <div className="sx-list mx-bl-histlist">
              {analysisHistory.map((analysis) => (
                <button
                  key={analysis._id}
                  type="button"
                  onClick={() => handleSelectAnalysis(analysis._id)}
                  className={cx('sx-item is-click mx-bl-hist', selectedAnalysis?._id === analysis._id && 'is-on')}
                >
                  <span className="sx-item__icon"><HardHat size={17} strokeWidth={1.9} aria-hidden="true" /></span>
                  <span className="sx-item__main">
                    <b>{formatPeriod(analysis.periodStart, analysis.periodEnd)}</b>
                    <span>{formatDate(analysis.analysisDate)} • {analysis.analysisType === 'scheduled' ? 'Automatska' : 'Manuelna'}</span>
                  </span>
                  {selectedAnalysis?._id === analysis._id && (
                    <span className="sx-item__side"><Check size={18} strokeWidth={2} className="mx-bl-hist__check" aria-hidden="true" /></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Main Analysis Display */}
      {selectedAnalysis ? (
        <Panel
          title="AI Analiza Tehničara"
          sub={`${formatPeriod(selectedAnalysis.periodStart, selectedAnalysis.periodEnd)} • Generisano ${formatDate(selectedAnalysis.analysisDate)}`}
          actions={<Btn size="sm" variant="ghost" icon={RefreshCw} onClick={fetchLatestAnalysis} aria-label="Osveži" title="Osveži" />}
        >
          {/* Stats Bar */}
          {selectedAnalysis.statistics && (
            <div className="sx-stats mx-bl-aistats">
              <Stat label="Ukupno Logova" value={selectedAnalysis.statistics.totalLogs || 0} />
              <Stat label="Tehničari" value={selectedAnalysis.statistics.totalTechnicians || 0} />
              <Stat label="Radni Nalozi" value={selectedAnalysis.statistics.totalWorkOrders || 0} />
              <Stat label="Material" value={selectedAnalysis.statistics.totalMaterialUsage || 0} />
              <Stat label="Equipment" value={selectedAnalysis.statistics.totalEquipmentChanges || 0} />
            </div>
          )}

          {/* Summary */}
          {selectedAnalysis.analysis.summary && (
            <Note tone="info" icon={Zap} className="mx-bl-summary">
              <h4 className="mx-bl-summary__title">Kratak Pregled</h4>
              <p>{selectedAnalysis.analysis.summary}</p>
            </Note>
          )}

          {/* Main Analysis Sections (5 sekcija + app improvements preko cele širine) */}
          <div className="mx-bl-aigrid">
            {selectedAnalysis.analysis.topPerformers && (
              <AISekcija icon={Award} title="Top Performeri">{selectedAnalysis.analysis.topPerformers}</AISekcija>
            )}
            {selectedAnalysis.analysis.problemAreas && (
              <AISekcija icon={TriangleAlert} tone="bad" title="Problem Areas">{selectedAnalysis.analysis.problemAreas}</AISekcija>
            )}
            {selectedAnalysis.analysis.trainingNeeds && (
              <AISekcija icon={TrendingUp} tone="warn" title="Training Needs">{selectedAnalysis.analysis.trainingNeeds}</AISekcija>
            )}
            {selectedAnalysis.analysis.bestPractices && (
              <AISekcija icon={Lightbulb} title="Best Practices">{selectedAnalysis.analysis.bestPractices}</AISekcija>
            )}
            {selectedAnalysis.analysis.appImprovements && (
              <AISekcija icon={Settings} wide title="Predlozi za Unapređenje Aplikacije">{selectedAnalysis.analysis.appImprovements}</AISekcija>
            )}
          </div>
        </Panel>
      ) : (
        <Panel pad={false}>
          <div className="sx-empty-block">
            <b>Nema dostupnih analiza</b>
            <span>Automatska analiza se pokreće svakog ponedeljka u 06:00</span>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default AITechnicianAnalysisSection;
