import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BrainIcon,
  TrendingUpIcon,
  RefreshIcon,
  LightbulbIcon,
  SettingsIcon,
  ZapIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '../icons/SvgIcons';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AIAnalysisCard = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ai-analysis/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data) {
        // Prikaži poslednju analizu, bez obzira da li je automatska ili manuelna
        setAnalysis(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-600">Učitavanje AI analize...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
            <BrainIcon size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Analiza Sistema</h3>
            <p className="text-sm text-slate-500">Automatska analiza svakog dana u 12:00</p>
          </div>
        </div>
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <BrainIcon size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-600 font-medium">Nema dostupnih analiza</p>
          <p className="text-xs text-slate-400 mt-2">Prva automatska analiza biće dostupna sutra u 12:00</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-100 rounded-lg">
            <BrainIcon size={22} className="text-slate-700" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">AI Analiza Sistema</h3>
            <p className="text-sm text-slate-500">
              {formatPeriod(analysis.periodStart, analysis.periodEnd)} • Generisano {formatDate(analysis.analysisDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats Preview */}
          {analysis.statistics && !isExpanded && (
            <div className="flex items-center gap-4 mr-4">
              <div className="text-center">
                <p className="text-xs text-slate-500">Logovi</p>
                <p className="text-sm font-semibold text-slate-900">{analysis.statistics.totalLogs || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Admin</p>
                <p className="text-sm font-semibold text-blue-600">{analysis.statistics.adminActivities || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Greške</p>
                <p className="text-sm font-semibold text-red-600">{analysis.statistics.errorLogs || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Avg</p>
                <p className="text-sm font-semibold text-green-600">{analysis.statistics.avgResponseTime?.toFixed(0) || 0}ms</p>
              </div>
            </div>
          )}
          <button
            onClick={fetchLatestAnalysis}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Osveži"
          >
            <RefreshIcon size={18} className="text-slate-600" />
          </button>
          <div className="p-2">
            {isExpanded ? (
              <ChevronUpIcon size={20} className="text-slate-600" />
            ) : (
              <ChevronDownIcon size={20} className="text-slate-600" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* Stats Bar */}
          {analysis.statistics && (
            <div className="bg-slate-50 px-6 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Ukupno Logova</p>
                  <p className="text-2xl font-bold text-slate-900">{analysis.statistics.totalLogs || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Admin Aktivnosti</p>
                  <p className="text-2xl font-bold text-blue-600">{analysis.statistics.adminActivities || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Greške</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.statistics.errorLogs || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">Prosečno Vreme</p>
                  <p className="text-2xl font-bold text-green-600">{analysis.statistics.avgResponseTime?.toFixed(0) || 0}ms</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Summary */}
            {analysis.analysis.summary && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <ZapIcon size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Kratak Pregled</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {analysis.analysis.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Analysis Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trends */}
              {analysis.analysis.trends && (
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
                    {analysis.analysis.trends}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {analysis.analysis.patterns && (
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
                    {analysis.analysis.patterns}
                  </div>
                </div>
              )}

              {/* Automation Suggestions */}
              {analysis.analysis.automationSuggestions && (
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
                    {analysis.analysis.automationSuggestions}
                  </div>
                </div>
              )}

              {/* Improvement Ideas */}
              {analysis.analysis.improvementIdeas && (
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
                    {analysis.analysis.improvementIdeas}
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

export default AIAnalysisCard;
