import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  HardHatIcon,
  CalendarIcon,
  RefreshIcon,
  TrendingUpIcon,
  LightbulbIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckIcon,
  ZapIcon,
  AwardIcon,
  SettingsIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { toast } from '../../../components/ui/toast';

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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-600">Pokretanje AI analize tehničara...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Manual Analysis Card */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Manuelna AI Analiza Tehničara</h3>
          <p className="text-sm text-slate-600 mb-4">
            Pokrenite AI analizu rada tehničara za željeni period
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Od datuma:</label>
              <input
                type="datetime-local"
                value={customPeriodStart}
                onChange={(e) => setCustomPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Do datuma:</label>
              <input
                type="datetime-local"
                value={customPeriodEnd}
                onChange={(e) => setCustomPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <Button
            type="primary"
            size="medium"
            onClick={triggerManualAnalysis}
            disabled={loading || !customPeriodStart || !customPeriodEnd}
            className="w-full"
          >
            {loading ? 'Analiza u toku...' : 'Pokreni Analizu'}
          </Button>
        </div>

        {/* History Button */}
        <div className="sm:w-48">
          <Button
            type="secondary"
            size="medium"
            onClick={handleShowHistory}
            className="w-full h-full"
            prefix={<ClockIcon size={16} />}
          >
            {showHistory ? 'Sakrij Istoriju' : 'Prikaži Istoriju'}
          </Button>
        </div>
      </div>

      {/* History List */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Istorija AI Analiza Tehničara</h3>
          {analysisHistory.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Nema dostupnih analiza</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analysisHistory.map((analysis) => (
                <button
                  key={analysis._id}
                  onClick={() => handleSelectAnalysis(analysis._id)}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <HardHatIcon size={16} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatPeriod(analysis.periodStart, analysis.periodEnd)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(analysis.analysisDate)} • {analysis.analysisType === 'scheduled' ? 'Automatska' : 'Manuelna'}
                        </p>
                      </div>
                    </div>
                    {selectedAnalysis?._id === analysis._id && (
                      <div className="p-1.5 bg-orange-100 rounded-full">
                        <CheckIcon size={14} className="text-orange-600" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Analysis Display */}
      {selectedAnalysis ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-100 rounded-lg">
                  <HardHatIcon size={22} className="text-orange-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">AI Analiza Tehničara</h3>
                  <p className="text-sm text-slate-500">
                    {formatPeriod(selectedAnalysis.periodStart, selectedAnalysis.periodEnd)} •
                    Generisano {formatDate(selectedAnalysis.analysisDate)}
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Ukupno Logova</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedAnalysis.statistics.totalLogs || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Tehničari</p>
                  <p className="text-2xl font-bold text-orange-600">{selectedAnalysis.statistics.totalTechnicians || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Radni Nalozi</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedAnalysis.statistics.totalWorkOrders || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Material</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedAnalysis.statistics.totalMaterialUsage || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Equipment</p>
                  <p className="text-2xl font-bold text-green-600">{selectedAnalysis.statistics.totalEquipmentChanges || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Summary */}
            {selectedAnalysis.analysis.summary && (
              <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-l-4 border-orange-500">
                <div className="flex items-start gap-3">
                  <ZapIcon size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-orange-900 mb-2">Kratak Pregled</h4>
                    <p className="text-sm text-orange-800 leading-relaxed">
                      {selectedAnalysis.analysis.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Analysis Sections - 2x3 Grid (5 sekcija + app improvements) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Performers */}
              {selectedAnalysis.analysis.topPerformers && (
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <AwardIcon size={20} className="text-green-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Top Performeri</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.topPerformers}
                  </div>
                </div>
              )}

              {/* Problem Areas */}
              {selectedAnalysis.analysis.problemAreas && (
                <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangleIcon size={20} className="text-red-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Problem Areas</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.problemAreas}
                  </div>
                </div>
              )}

              {/* Training Needs */}
              {selectedAnalysis.analysis.trainingNeeds && (
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingUpIcon size={20} className="text-amber-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Training Needs</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.trainingNeeds}
                  </div>
                </div>
              )}

              {/* Best Practices */}
              {selectedAnalysis.analysis.bestPractices && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <LightbulbIcon size={20} className="text-blue-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Best Practices</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.bestPractices}
                  </div>
                </div>
              )}

              {/* App Improvements */}
              {selectedAnalysis.analysis.appImprovements && (
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200 lg:col-span-2">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <SettingsIcon size={20} className="text-purple-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Predlozi za Unapređenje Aplikacije</h4>
                  </div>
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6'
                    }}
                  >
                    {selectedAnalysis.analysis.appImprovements}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <HardHatIcon size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-600 font-medium">Nema dostupnih analiza</p>
            <p className="text-xs text-slate-400 mt-2">Automatska analiza se pokreće svakog ponedeljka u 06:00</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITechnicianAnalysisSection;
