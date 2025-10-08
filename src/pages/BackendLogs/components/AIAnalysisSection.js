import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BrainIcon,
  CalendarIcon,
  RefreshIcon,
  TrendingUpIcon,
  LightbulbIcon,
  SettingsIcon,
  ClockIcon,
  CheckIcon,
  ZapIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { toast } from '../../../components/ui/toast';

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
      <div className="space-y-6">
        {/* Manual Analysis Trigger */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-slate-100 rounded-lg">
              <CalendarIcon size={22} className="text-slate-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Manuelna AI Analiza</h3>
              <p className="text-sm text-slate-500">Pokrenite analizu za specifičan period</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Početni datum i vreme
                </label>
                <input
                  type="datetime-local"
                  value={customPeriodStart}
                  onChange={(e) => setCustomPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Krajnji datum i vreme
                </label>
                <input
                  type="datetime-local"
                  value={customPeriodEnd}
                  onChange={(e) => setCustomPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
            </div>
            <Button
              onClick={triggerManualAnalysis}
              disabled={loading || !customPeriodStart || !customPeriodEnd}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshIcon className="w-4 h-4 mr-2 animate-spin" />
                  Analiza u toku...
                </>
              ) : (
                <>
                  <BrainIcon className="w-4 h-4 mr-2" />
                  Pokreni AI Analizu
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <BrainIcon size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Nema dostupnih AI analiza
          </h3>
          <p className="text-slate-500">
            Pokrenite manuelnu analizu ili sačekajte automatsku analizu u 12:00
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Manual Analysis Trigger */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 rounded-lg">
              <CalendarIcon size={18} className="text-slate-700" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Manuelna Analiza</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={customPeriodStart}
                onChange={(e) => setCustomPeriodStart(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              <input
                type="datetime-local"
                value={customPeriodEnd}
                onChange={(e) => setCustomPeriodEnd(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              onClick={triggerManualAnalysis}
              disabled={loading || !customPeriodStart || !customPeriodEnd}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshIcon size={14} className="animate-spin" />
                  <span>Analiza u toku...</span>
                </>
              ) : (
                <>
                  <BrainIcon size={14} />
                  <span>Pokreni Analizu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* History Button */}
        <div className="sm:w-48 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <button
            onClick={handleShowHistory}
            className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ClockIcon size={20} className="text-slate-600" />
            <span className="text-sm font-medium text-slate-900">
              {showHistory ? 'Sakrij Istoriju' : 'Prikaži Istoriju'}
            </span>
          </button>
        </div>
      </div>

      {/* History List */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Istorija AI Analiza</h3>
          {analysisHistory.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nema dostupnih analiza</p>
          ) : (
            <div className="space-y-2">
              {analysisHistory.map((analysis) => (
                <button
                  key={analysis._id}
                  onClick={() => handleSelectAnalysis(analysis._id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                    selectedAnalysis?._id === analysis._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatDate(analysis.analysisDate)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Period: {formatDate(analysis.periodStart)} - {formatDate(analysis.periodEnd)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          analysis.analysisType === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {analysis.analysisType === 'scheduled' ? 'Automatska' : 'Manuelna'}
                      </span>
                      {selectedAnalysis?._id === analysis._id && (
                        <CheckIcon size={20} className="text-blue-600" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis Results - Always Expanded */}
      {selectedAnalysis && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <BrainIcon size={22} className="text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">AI Analiza Sistema</h3>
                  <p className="text-sm text-slate-500">
                    {formatPeriod(selectedAnalysis.periodStart, selectedAnalysis.periodEnd)} • Generisano {formatDate(selectedAnalysis.analysisDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchLatestAnalysis}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Osveži"
              >
                <RefreshIcon size={18} className="text-slate-600" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {selectedAnalysis.statistics && (
            <div className="bg-slate-50 px-6 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Ukupno Logova</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedAnalysis.statistics.totalLogs || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Admin Aktivnosti</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedAnalysis.statistics.adminActivities || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Greške</p>
                  <p className="text-2xl font-bold text-red-600">{selectedAnalysis.statistics.errorLogs || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Prosečno Vreme</p>
                  <p className="text-2xl font-bold text-green-600">{selectedAnalysis.statistics.avgResponseTime?.toFixed(0) || 0}ms</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Summary */}
            {selectedAnalysis.analysis.summary && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <ZapIcon size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Kratak Pregled</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {selectedAnalysis.analysis.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Analysis Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trends */}
              {selectedAnalysis.analysis.trends && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUpIcon size={20} className="text-blue-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Uočeni Trendovi</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.trends}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {selectedAnalysis.analysis.patterns && (
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <RefreshIcon size={20} className="text-amber-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Ponavljajući Obrasci</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.patterns}
                  </div>
                </div>
              )}

              {/* Automation Suggestions */}
              {selectedAnalysis.analysis.automationSuggestions && (
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <SettingsIcon size={20} className="text-green-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Predlozi za Automatizaciju</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.automationSuggestions}
                  </div>
                </div>
              )}

              {/* Improvement Ideas */}
              {selectedAnalysis.analysis.improvementIdeas && (
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <LightbulbIcon size={20} className="text-purple-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Ideje za Unapređenje</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.improvementIdeas}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisSection;
