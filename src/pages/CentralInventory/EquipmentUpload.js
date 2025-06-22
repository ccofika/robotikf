import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadIcon, BackIcon, ExcelIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import { toast } from 'react-toastify';
import './EquipmentUpload.css';

const EquipmentUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${apiUrl}/api/equipment/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setSuccessMessage(`${response.data.message}${response.data.ignoredItems > 0 ? ` (${response.data.ignoredItems} duplikata ignorisano)` : ''}`);
      toast.success('Uspešno dodavanje opreme!');
      setFile(null);
      
      // Resetuj input polje za fajl
      const fileInput = document.getElementById('equipment-file');
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Greška pri upload-u opreme:', error);
      setError(error.response?.data?.error || 'Greška pri upload-u opreme. Pokušajte ponovo.');
      toast.error('Neuspešan upload opreme!');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadTemplate = () => {
    // Kreiranje primera Excel uzorka za download
    // U pravoj implementaciji, ovo bi bio unapred pripremljen fajl
    toast.info('Preuzimanje šablona će uskoro biti omogućeno');
  };
  
  return (
    <div className="equipment-upload fade-in">
      <div className="page-header">
        <h1 className="page-title">Dodavanje opreme putem Excel fajla</h1>
        <Link to="/equipment" className="btn btn-sm">
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
            <li>Kategorija - kategorija opreme (npr. "CAM", "modem", "STB", itd.)</li>
            <li>MODEL - naziv modela opreme</li>
            <li>SN - jedinstveni serijski broj opreme</li>
          </ul>
          <button onClick={downloadTemplate} className="btn btn-sm template-btn">
            <ExcelIcon /> Preuzmi šablon
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="upload-form">
          {error && <div className="alert alert-danger">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}
          
          <div className="form-group file-upload-group">
            <label htmlFor="equipment-file">Odaberi Excel fajl:</label>
            <div className="file-input-container">
              <input
                type="file"
                id="equipment-file"
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
              {loading ? 'Upload u toku...' : 'Upload opreme'}
            </button>
          </div>
        </form>
      </div>
    </div>
    );
};

export default EquipmentUpload;