// Kompletna zamena za fajl u: src/pages/WorkOrders/WorkOrdersUpload.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackIcon, UploadIcon, ExcelIcon, DownloadIcon } from '../../components/icons/SvgIcons';
import { toast } from 'react-toastify';
import axios from 'axios';
import './WorkOrdersModern.css'; 

const WorkOrdersUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [parseResults, setParseResults] = useState(null);
  const navigate = useNavigate();
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Validacija da li je Excel fajl
    const fileTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!fileTypes.includes(selectedFile.type)) {
      setError('Molimo odaberite Excel fajl (.xlsx ili .xls)');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setError('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Molimo odaberite Excel fajl');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setParseResults(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${apiUrl}/api/workorders/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      const { newWorkOrders, newUsers, existingUsers, errors } = response.data;
      
      setParseResults({
        workOrdersAdded: newWorkOrders?.length || 0,
        usersAdded: newUsers?.length || 0,
        usersUpdated: existingUsers?.length || 0,
        errors: errors || []
      });
      
      setSuccessMessage(`Uspešno dodato ${newWorkOrders?.length || 0} radnih naloga i ${newUsers?.length || 0} novih korisnika!`);
      toast.success('Uspešno dodavanje radnih naloga!');
      setFile(null);
      
      // Resetuj input polje za fajl
      const fileInput = document.getElementById('workorders-file');
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Greška pri upload-u radnih naloga:', error);
      setError(error.response?.data?.error || 'Greška pri upload-u radnih naloga. Pokušajte ponovo.');
      toast.error('Neuspešan upload radnih naloga!');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadTemplate = () => {
    // Kreiranje Excel šablona za download
    const link = document.createElement('a');
    link.href = `${apiUrl}/api/workorders/template`;
    link.download = 'radni-nalozi-sablon.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="work-orders-upload fade-in">
      <div className="page-header">
        <h1 className="page-title">Dodavanje radnih naloga putem Excel fajla</h1>
        <Link to="/work-orders" className="btn btn-sm">
          <BackIcon /> Povratak na listu
        </Link>
      </div>
      
      <div className="card">
        <div className="upload-instructions">
          <h2>Uputstvo za upload</h2>
          <p>
            Excel fajl mora sadržati sledeće kolone:
          </p>
          <ul>
            <li><strong>Tehnicar</strong> - ime tehničara kome je dodeljen nalog</li>
            <li><strong>Područje</strong> - područje/opština gde se izvodi intervencija</li>
            <li><strong>Početak instalacije</strong> - format: dd/mm/yyyy hh:mm</li>
            <li><strong>Tehnologija</strong> - HFC, GPON, itd.</li>
            <li><strong>TIS ID korisnika</strong> - jedinstveni ID korisnika</li>
            <li><strong>Adresa korisnika</strong> - puna adresa</li>
            <li><strong>Ime korisnika</strong> - ime i prezime korisnika</li>
            <li><strong>Kontakt telefon</strong> - broj telefona korisnika</li>
            <li><strong>TIS Posao ID</strong> - ID konkretnog zahteva</li>
            <li><strong>Paket</strong> - naziv paketa/usluge</li>
                        <li><strong>Dodatni poslovi</strong> - dodatni poslovi vezani za radni nalog (opciono)</li>
            <li><strong>Tip zahteva</strong> - nov korisnik, zamena uređaja, itd.</li>
          </ul>
          <button onClick={downloadTemplate} className="btn btn-sm template-btn">
            <DownloadIcon /> Preuzmi šablon
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="upload-form">
          {error && <div className="alert alert-danger">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}
          
          <div className="form-group file-upload-group">
            <label htmlFor="workorders-file">Odaberi Excel fajl:</label>
            <div className="file-input-container">
              <input
                type="file"
                id="workorders-file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="file-input"
              />
              <div className="file-input-label">
                <UploadIcon className="upload-icon" />
                <span>{file ? file.name : 'Odaberi fajl...'}</span>
              </div>
            </div>
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit" 
              className="btn btn-primary upload-btn"
              disabled={!file || loading}
            >
              {loading ? 'Upload u toku...' : 'Upload radnih naloga'}
            </button>
          </div>
        </form>
        
        {parseResults && (
          <div className="parse-results">
            <h3>Rezultat obrade:</h3>
            <ul>
              <li>Dodato radnih naloga: <strong>{parseResults.workOrdersAdded}</strong></li>
              <li>Dodato novih korisnika: <strong>{parseResults.usersAdded}</strong></li>
              <li>Ažurirano postojećih korisnika: <strong>{parseResults.usersUpdated}</strong></li>
            </ul>
            
            {parseResults.errors.length > 0 && (
              <div className="error-list">
                <h4>Greške prilikom obrade:</h4>
                <ul>
                  {parseResults.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersUpload;