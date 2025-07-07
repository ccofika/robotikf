// C:\Users\stefa\OneDrive\Desktop\transfer\frontend\src\pages\Reports\ExportSpecification.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { DownloadIcon, CalendarIcon, ExcelIcon, SpinnerIcon, TableIcon, UsersIcon, SettingsIcon, ClipboardIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import 'react-datepicker/dist/react-datepicker.css';
import './ExportSpecificationModern.css';

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
    <div className="export-container fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <TableIcon className="title-icon" />
          Export Evidencije
        </h1>
        <p className="page-subtitle">
          Kreirajte Excel evidenciju radnih naloga sa detaljnim podacima o instaliranim i uklonjenim uređajima
        </p>
        <button 
          onClick={handleRefresh}
          className="refresh-btn"
          disabled={isRefreshing}
          title="Osvežiti statistike"
        >
          <RefreshIcon className={`icon ${isRefreshing ? 'spinning' : ''}`} />
        </button>
      </div>

      <div className="export-specification">
        <div className="export-card">
          <div className="card-header">
            <h2>
              <CalendarIcon />
              Vremenski period
            </h2>
            <p>Odaberite period za koji želite da eksportujete evidenciju</p>
          </div>

          <div className="date-selection">
            <div className="date-input-group">
              <label htmlFor="startDate">Početni datum:</label>
              <DatePicker
                id="startDate"
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                dateFormat="dd.MM.yyyy"
                className="date-picker"
                placeholderText="Odaberite početni datum"
              />
            </div>

            <div className="date-separator">do</div>

            <div className="date-input-group">
              <label htmlFor="endDate">Krajnji datum:</label>
              <DatePicker
                id="endDate"
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="dd.MM.yyyy"
                className="date-picker"
                placeholderText="Odaberite krajnji datum"
              />
            </div>
          </div>

          {formatPeriod() && (
            <div className="selected-period">
              <strong>Izabrani period: {formatPeriod()}</strong>
            </div>
          )}
        </div>

        <div className="export-card">
          <div className="card-header">
            <h2>Pregled podataka</h2>
            <p>Broj zapisa koji će biti uključen u evidenciju</p>
          </div>

          <div className="stats-preview">
            <div className="stat-item">
              <div className="stat-icon workorders">
                <ClipboardIcon />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.workOrders}</div>
                <div className="stat-label">Radni nalozi</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon technicians">
                <UsersIcon />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.technicians}</div>
                <div className="stat-label">Aktivni tehničari</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon materials">
                <SettingsIcon />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.materials}</div>
                <div className="stat-label">Utrošeni materijali</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon equipment">
                <ExcelIcon />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.equipment}</div>
                <div className="stat-label">Instalirana oprema</div>
              </div>
            </div>
          </div>
        </div>

        <div className="export-card">
          <div className="card-header">
            <h2>Evidencija radnih naloga</h2>
            <p>Detaljan tabelarni prikaz svih radnih naloga sa kategorizovanom opremom iz WorkOrderEvidence baze</p>
          </div>

          <div className="sheet-info">
            <div className="sheet-item">
              <div className="sheet-number">
                <TableIcon />
              </div>
              <div className="sheet-details">
                <h4>Tabelarni pregled</h4>
                <p>Kompletna evidencija sa svim detaljima: datum, status, korisnik, adresa, tehničari, instalirana i uklonjena oprema sa serijskim brojevima (ONT/HFC, Hybrid, STB/CAM, Kartice, Mini node)</p>
                <div className="equipment-categories">
                  <span className="category-tag">ONT/HFC</span>
                  <span className="category-tag">Hybrid</span>
                  <span className="category-tag">STB/CAM</span>
                  <span className="category-tag">Kartice</span>
                  <span className="category-tag">Mini node</span>
                  <span className="category-tag">Demontaža</span>
                  <span className="category-tag">Serijski brojevi</span>
                  <span className="category-tag">N/R Status</span>
                </div>
              </div>
            </div>
          </div>

          <div className="export-actions">
            <button 
              onClick={handleExport} 
              disabled={loading || !startDate || !endDate}
              className="export-btn"
            >
              {loading ? (
                <>
                  <SpinnerIcon className="spinner" />
                  Kreiranje Excel evidencije...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Preuzmi Excel evidenciju (WorkOrderEvidence)
                </>
              )}
            </button>
          </div>

          {stats.workOrders === 0 && (
            <div className="no-data-warning">
              <p>⚠️ Nema radnih naloga u izabranom periodu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportSpecification;