// C:\Users\stefa\OneDrive\Desktop\transfer\frontend\src\pages\Reports\ExportSpecification.js
import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { DownloadIcon, CalendarIcon, ExcelIcon, SpinnerIcon, TableIcon, UsersIcon, SettingsIcon, ClipboardIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { DateRangePicker } from '../../components/ui/date-picker';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const ExportSpecification = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    workOrders: 0,
    technicians: 0,
    materials: 0,
    equipment: 0
  });

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/export/evidence-preview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Greška pri učitavanju statistika:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
    toast.success('Statistike su osvežene!');
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Molimo odaberite vremenski period');
      return;
    }

    if (startDate > endDate) {
      toast.error('Početni datum ne može biti veći od krajnjeg datuma');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const endpoint = '/api/export/evidencija-new';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Greška pri generisanju Excel fajla: ${response.status} ${response.statusText}`);
      }

      // Kreiranje blob-a za download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generisanje naziva fajla sa datumima
      const startDateStr = startDate.toLocaleDateString('sr-RS').replace(/\./g, '.');
      const endDateStr = endDate.toLocaleDateString('sr-RS').replace(/\./g, '.');
      link.download = `${startDateStr}.evidencija.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel evidencija je uspešno kreirana i preuzeta!');
    } catch (error) {
      console.error('Greška pri export-u:', error);
      toast.error('Greška pri kreiranju Excel fajla: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.toLocaleDateString('sr-RS')} - ${endDate.toLocaleDateString('sr-RS')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <TableIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Export Evidencije</h1>
              <p className="text-slate-600 mt-1">
                Kreirajte Excel evidenciju radnih naloga sa detaljnim podacima o instaliranim i uklonjenim uređajima
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center space-x-2"
              disabled={isRefreshing}
              title="Osvežiti statistike"
            >
              <RefreshIcon size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Osveži</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-md border border-white/30 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <CalendarIcon size={20} className="text-slate-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Vremenski period</h2>
                <p className="text-slate-600 text-sm font-normal">Odaberite period za koji želite da eksportujete evidenciju</p>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <h3 className="text-sm font-medium text-slate-700">Izaberite vremenski period:</h3>
                <div className="flex items-center justify-center w-full">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateSelect={(date) => setStartDate(date)}
                    onEndDateSelect={(date) => setEndDate(date)}
                    startPlaceholder="Početni datum"
                    endPlaceholder="Krajnji datum"
                    className="w-full max-w-lg"
                  />
                </div>
              </div>

              {formatPeriod() && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Izabrani period: {formatPeriod()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-md border border-white/30 shadow-lg">
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold text-slate-900">Pregled podataka</h2>
              <p className="text-slate-600 text-sm font-normal mt-1">Broj zapisa koji će biti uključen u evidenciju</p>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ClipboardIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Radni nalozi</p>
                    <h3 className="text-lg font-bold text-slate-900">{stats.workOrders}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <UsersIcon size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Aktivni tehničari</p>
                    <h3 className="text-lg font-bold text-slate-900">{stats.technicians}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <SettingsIcon size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Utrošeni materijali</p>
                    <h3 className="text-lg font-bold text-slate-900">{stats.materials}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <ExcelIcon size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Instalirana oprema</p>
                    <h3 className="text-lg font-bold text-slate-900">{stats.equipment}</h3>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-md border border-white/30 shadow-lg">
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold text-slate-900">Evidencija radnih naloga</h2>
              <p className="text-slate-600 text-sm font-normal mt-1">Detaljan tabelarni prikaz svih radnih naloga sa kategorizovanom opremom iz WorkOrderEvidence baze</p>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-xl">
                <TableIcon size={24} className="text-slate-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-slate-900 mb-2">Tabelarni pregled</h4>
                <p className="text-slate-600 text-sm mb-4">Kompletna evidencija sa svim detaljima: datum, status, korisnik, adresa, tehničari, instalirana i uklonjena oprema sa serijskim brojevima (ONT/HFC, Hybrid, STB/CAM, Kartice, Mini node)</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">ONT/HFC</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Hybrid</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">STB/CAM</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Kartice</span>
                  <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">Mini node</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Demontaža</span>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">Serijski brojevi</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">N/R Status</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={handleExport}
                disabled={loading || !startDate || !endDate}
                className="flex items-center space-x-3 px-8 py-4 text-base"
                size="lg"
              >
                {loading ? (
                  <>
                    <SpinnerIcon size={18} className="animate-spin" />
                    <span>Kreiranje Excel evidencije...</span>
                  </>
                ) : (
                  <>
                    <DownloadIcon size={18} />
                    <span>Preuzmi Excel evidenciju (WorkOrderEvidence)</span>
                  </>
                )}
              </Button>

              {stats.workOrders === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium">⚠️ Nema radnih naloga u izabranom periodu</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportSpecification;