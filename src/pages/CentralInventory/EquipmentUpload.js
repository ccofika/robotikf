import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadIcon, BackIcon, ExcelIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { toast } from '../../utils/toast';
import { cn } from '../../utils/cn';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <ExcelIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dodavanje opreme putem Excel fajla</h1>
              <p className="text-slate-600 mt-1">Upload Excel fajla sa listom opreme</p>
            </div>
          </div>
          <div>
            <Link to="/equipment">
              <Button 
                type="secondary"
                size="medium"
                prefix={<BackIcon size={16} />}
              >
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* Instructions Section */}
        <div className="p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Uputstvo za upload</h2>
              <p className="text-slate-600 mb-4">
                Excel fajl mora sadržati sledeće kolone:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span><strong>Kategorija</strong> - kategorija opreme (npr. "CAM", "modem", "STB", itd.)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span><strong>MODEL</strong> - naziv modela opreme</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span><strong>SN</strong> - jedinstveni serijski broj opreme</span>
                  </li>
                </ul>
              </div>
              <Button 
                type="tertiary"
                size="medium"
                onClick={downloadTemplate}
                prefix={<ExcelIcon size={16} />}
              >
                Preuzmi šablon
              </Button>
          </div>
        </div>
        
        {/* Upload Form Section */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {successMessage}
              </div>
            )}
            
            {/* File Upload Section */}
            <div>
              <label htmlFor="equipment-file" className="block text-sm font-medium text-slate-700 mb-2">
                Odaberi Excel fajl:
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="equipment-file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="sr-only"
                />
                <div 
                  className={cn(
                    "relative w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden",
                    file ? "border-green-300 bg-green-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100",
                    loading && "cursor-not-allowed opacity-50"
                  )}
                  onClick={() => !loading && document.getElementById('equipment-file').click()}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4">
                    <UploadIcon size={24} className={file ? "text-green-600" : "text-slate-400"} />
                    <div className="text-center">
                      <p className={cn(
                        "text-sm font-medium",
                        file ? "text-green-700" : "text-slate-600"
                      )}>
                        {file ? file.name : 'Kliknite da odaberete Excel fajl'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Podržani formati: .xlsx, .xls
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type={file && !loading ? "primary" : "secondary"}
                size="medium"
                onClick={handleSubmit}
                disabled={!file || loading}
                loading={loading}
                prefix={<UploadIcon size={16} />}
              >
                {loading ? 'Upload u toku...' : 'Upload opreme'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
    );
};

export default EquipmentUpload;