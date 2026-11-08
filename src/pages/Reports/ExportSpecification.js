// C:\Users\stefa\OneDrive\Desktop\transfer\frontend\src\pages\Reports\ExportSpecification.js
import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { DateRangePicker } from '../../components/ui/date-picker';
import { Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import './ExportSpecification.mx.css';

// Ikonica dugmeta dok se pravi fajl (okreće se)
const Spinner = (props) => <Loader2 {...props} className="mx-export-spin" />;

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
      console.log('ExportSpecification: Fetching evidence preview stats...');
      const startTime = Date.now();

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/export/evidence-preview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });

      if (response.ok) {
        const data = await response.json();
        setStats(data);

        const endTime = Date.now();
        console.log(`ExportSpecification: Stats fetched in ${endTime - startTime}ms`);
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

    console.log('ExportSpecification: Starting Excel export...');
    const exportStartTime = Date.now();

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

      const exportEndTime = Date.now();
      console.log(`ExportSpecification: Excel export completed in ${exportEndTime - exportStartTime}ms`);

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
    <div className="sx-page mx-export" data-testid="page-export">
      <PageHead
        eyebrow="Montaža · Export"
        title="Export Evidencije"
        lead="Kreirajte Excel evidenciju radnih naloga sa detaljnim podacima o instaliranim i uklonjenim uređajima"
        actions={(
          <Btn icon={RefreshCw} onClick={handleRefresh} busy={isRefreshing} title="Osvežiti statistike">
            Osveži
          </Btn>
        )}
      />

      <Panel title="Vremenski period" sub="Odaberite period za koji želite da eksportujete evidenciju">
        <div className="mx-export-period">
          <h3 className="sx-field__label">Izaberite vremenski period:</h3>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateSelect={(date) => setStartDate(date)}
            onEndDateSelect={(date) => setEndDate(date)}
            startPlaceholder="Početni datum"
            endPlaceholder="Krajnji datum"
          />
          {formatPeriod() && (
            <Note tone="info">Izabrani period: <b>{formatPeriod()}</b></Note>
          )}
        </div>
      </Panel>

      <Panel title="Pregled podataka" sub="Broj zapisa koji će biti uključen u evidenciju">
        <div className="sx-stats mx-export-stats">
          <Stat label="Radni nalozi" value={stats.workOrders} />
          <Stat label="Aktivni tehničari" value={stats.technicians} />
          <Stat label="Utrošeni materijali" value={stats.materials} />
          <Stat label="Instalirana oprema" value={stats.equipment} />
        </div>
      </Panel>

      <Panel title="Evidencija radnih naloga" sub="Detaljan tabelarni prikaz svih radnih naloga sa kategorizovanom opremom iz WorkOrderEvidence baze">
        <div className="mx-export-sheet">
          <h4 className="mx-export-sheet__title">Tabelarni pregled</h4>
          <p className="mx-export-sheet__text">Kompletna evidencija sa svim detaljima: datum, status, korisnik, adresa, tehničari, instalirana i uklonjena oprema sa serijskim brojevima (ONT/HFC, Hybrid, STB/CAM, Kartice, Mini node)</p>
          <div className="mx-export-tags">
            <span className="sx-tag">ONT/HFC</span>
            <span className="sx-tag">Hybrid</span>
            <span className="sx-tag">STB/CAM</span>
            <span className="sx-tag">Kartice</span>
            <span className="sx-tag">Mini node</span>
            <span className="sx-tag">Demontaža</span>
            <span className="sx-tag">Serijski brojevi</span>
            <span className="sx-tag">N/R Status</span>
          </div>
        </div>

        <div className="mx-export-go">
          <Btn
            variant="primary"
            size="lg"
            icon={loading ? Spinner : Download}
            onClick={handleExport}
            disabled={loading || !startDate || !endDate}
            data-testid="export-download"
          >
            {loading ? 'Kreiranje Excel evidencije...' : 'Preuzmi Excel evidenciju (WorkOrderEvidence)'}
          </Btn>

          {stats.workOrders === 0 && (
            <Note tone="warn">Nema radnih naloga u izabranom periodu</Note>
          )}
        </div>
      </Panel>
    </div>
  );
};

export default ExportSpecification;
