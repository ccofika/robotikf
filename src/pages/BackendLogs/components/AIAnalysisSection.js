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
  CheckIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { toast } from '../../../components/ui/toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <BrainIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Analiza Sistema</h2>
            <p className="text-sm text-gray-500">
              Automatska analiza aktivnosti i preporuke za unapređenje
            </p>
          </div>
        </div>
        <Button
          onClick={handleShowHistory}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ClockIcon className="w-4 h-4" />
          {showHistory ? 'Sakrij istoriju' : 'Prikaži istoriju'}
        </Button>
      </div>

      {/* History List */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Istorija AI Analiza</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nema dostupnih analiza</p>
            ) : (
              <div className="space-y-2">
                {analysisHistory.map((analysis) => (
                  <button
                    key={analysis._id}
                    onClick={() => handleSelectAnalysis(analysis._id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                      selectedAnalysis?._id === analysis._id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(analysis.analysisDate)}
                        </p>
                        <p className="text-sm text-gray-500">
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
                          <CheckIcon className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Analysis Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Manuelna AI Analiza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Početni datum i vreme
                </label>
                <input
                  type="datetime-local"
                  value={customPeriodStart}
                  onChange={(e) => setCustomPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Krajnji datum i vreme
                </label>
                <input
                  type="datetime-local"
                  value={customPeriodEnd}
                  onChange={(e) => setCustomPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>
            <Button
              onClick={triggerManualAnalysis}
              disabled={loading || !customPeriodStart || !customPeriodEnd}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
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
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {selectedAnalysis && (
        <div className="space-y-4">
          {/* Header Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Datum analize</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(selectedAnalysis.analysisDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Analizirani period</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(selectedAnalysis.periodStart)} - {formatDate(selectedAnalysis.periodEnd)}
                  </p>
                </div>
                <div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      selectedAnalysis.analysisType === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {selectedAnalysis.analysisType === 'scheduled' ? 'Automatska analiza' : 'Manuelna analiza'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {selectedAnalysis.analysis.summary && (
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainIcon className="w-5 h-5 text-indigo-600" />
                  Kratak Pregled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{selectedAnalysis.analysis.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Trends */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-blue-600" />
                Uočeni Trendovi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAnalysis.analysis.trends}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Patterns */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshIcon className="w-5 h-5 text-amber-600" />
                Ponavljajući Obrasci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAnalysis.analysis.patterns}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Automation Suggestions */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-green-600" />
                Predlozi za Automatizaciju
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAnalysis.analysis.automationSuggestions}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Improvement Ideas */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LightbulbIcon className="w-5 h-5 text-purple-600" />
                Ideje za Unapređenje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAnalysis.analysis.improvementIdeas}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {selectedAnalysis.statistics && (
            <Card>
              <CardHeader>
                <CardTitle>Statistika Analiziranih Podataka</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Ukupno logova</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedAnalysis.statistics.totalLogs || 0}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Admin aktivnosti</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedAnalysis.statistics.adminActivities || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-600">Greške</p>
                    <p className="text-2xl font-bold text-red-900">
                      {selectedAnalysis.statistics.errorLogs || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Prosečno vreme</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedAnalysis.statistics.avgResponseTime?.toFixed(0) || 0}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedAnalysis && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BrainIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nema dostupnih AI analiza
              </h3>
              <p className="text-gray-500 mb-6">
                Pokrenite manuelnu analizu ili sačekajte automatsku analizu u 12:00
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAnalysisSection;
