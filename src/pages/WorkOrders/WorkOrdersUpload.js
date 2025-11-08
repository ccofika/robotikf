import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackIcon, UploadIcon, ExcelIcon, DownloadIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { toast } from '../../utils/toast';
import { workOrdersAPI, exportAPI } from '../../services/api'; 

const WorkOrdersUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [parseResults, setParseResults] = useState(null);
  // Removed unused hook - navigate

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
      const response = await workOrdersAPI.createBulk(formData);

      const { newWorkOrders, newUsers, existingUsers, errors, duplicates } = response.data;

      setParseResults({
        workOrdersAdded: newWorkOrders?.length || 0,
        usersAdded: newUsers?.length || 0,
        usersUpdated: existingUsers?.length || 0,
        errors: errors || [],
        duplicates: duplicates || []
      });
      
      const duplicateMessage = duplicates?.length > 0 ? ` (${duplicates.length} duplikat${duplicates.length === 1 ? '' : 'a'} preskočen${duplicates.length === 1 ? '' : 'o'})` : '';
      setSuccessMessage(`Uspešno dodato ${newWorkOrders?.length || 0} radnih naloga i ${newUsers?.length || 0} novih korisnika!${duplicateMessage}`);
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
  
  const downloadTemplate = async () => {
    try {
      const response = await exportAPI.exportTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'radni-nalozi-sablon.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Greška pri preuzimanju šablona:', error);
      toast.error('Greška pri preuzimanju šablona');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UploadIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Import radnih naloga</h1>
              <p className="text-slate-600 mt-1">Dodavanje radnih naloga putem Excel fajla</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/work-orders">
              <Button type="secondary" size="medium" prefix={<BackIcon size={16} />}>
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Instructions Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <ExcelIcon size={20} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Uputstvo za upload</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 mb-4">
            Excel fajl mora sadržati sledeće kolone:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Tehnicar 1</span>
                  <p className="text-sm text-slate-600">ime prvog tehničara kome je dodeljen nalog</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Tehnicar 2</span>
                  <p className="text-sm text-slate-600">ime drugog tehničara (opciono)</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Područje</span>
                  <p className="text-sm text-slate-600">područje/opština gde se izvodi intervencija</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Početak instalacije</span>
                  <p className="text-sm text-slate-600">format: dd/mm/yyyy hh:mm</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Tehnologija</span>
                  <p className="text-sm text-slate-600">HFC, GPON, itd.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">TIS ID korisnika</span>
                  <p className="text-sm text-slate-600">jedinstveni ID korisnika</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Adresa korisnika</span>
                  <p className="text-sm text-slate-600">puna adresa</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Ime korisnika</span>
                  <p className="text-sm text-slate-600">ime i prezime korisnika</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Kontakt telefon 1</span>
                  <p className="text-sm text-slate-600">broj telefona korisnika</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">TIS Posao ID</span>
                  <p className="text-sm text-slate-600">ID konkretnog zahteva</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Paket</span>
                  <p className="text-sm text-slate-600">naziv paketa/usluge</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Dodatni poslovi</span>
                  <p className="text-sm text-slate-600">dodatni poslovi vezani za radni nalog (opciono)</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-900">Tip zahteva</span>
                  <p className="text-sm text-slate-600">nov korisnik, zamena uređaja, itd.</p>
                </div>
              </div>
            </div>
          </div>
          <Button 
            type="secondary" 
            size="medium" 
            prefix={<DownloadIcon size={16} />}
            onClick={downloadTemplate}
          >
            Preuzmi šablon
          </Button>
        </div>
      </div>
      
      {/* Upload Form Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
            
            {/* File Upload */}
            <div className="space-y-2">
              <label htmlFor="workorders-file" className="block text-sm font-medium text-slate-700">Odaberi Excel fajl</label>
              <div className="relative">
                <input
                  type="file"
                  id="workorders-file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="sr-only"
                />
                <label 
                  htmlFor="workorders-file"
                  className="relative w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center"
                >
                  <div className="flex flex-col items-center space-y-3 p-4">
                    <UploadIcon size={32} className="text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600">
                        {file ? file.name : 'Kliknite da odaberete Excel fajl'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">ili prevucite fajl ovde</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Upload Button */}
            <div className="flex items-center justify-center pt-4">
              <Button 
                type="primary" 
                size="medium"
                prefix={<UploadIcon size={16} />}
                disabled={!file || loading}
                onClick={handleSubmit}
              >
                {loading ? 'Upload u toku...' : 'Upload radnih naloga'}
              </Button>
            </div>
          </form>
          
          {/* Parse Results */}
          {parseResults && (
            <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Rezultat obrade</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-600">Dodato radnih naloga</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{parseResults.workOrdersAdded}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-slate-600">Dodato novih korisnika</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{parseResults.usersAdded}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="text-sm text-slate-600">Ažurirano korisnika</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{parseResults.usersUpdated}</p>
                </div>
              </div>
              
              {parseResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-red-800 mb-2">Greške prilikom obrade:</h4>
                  <ul className="space-y-1">
                    {parseResults.errors.map((err, index) => (
                      <li key={index} className="text-sm text-red-700 flex items-start space-x-2">
                        <div className="w-1 h-1 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parseResults.duplicates.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Duplikati pronađeni ({parseResults.duplicates.length}):</h4>
                  <p className="text-sm text-orange-700 mb-3">Sledeći radni nalozi već postoje u sistemu i nisu dodati:</p>
                  <div className="space-y-3">
                    {parseResults.duplicates.map((duplicate, index) => (
                      <div key={index} className="bg-white border border-orange-200 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-slate-700">Adresa:</span>
                            <p className="text-slate-600">{duplicate.address}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Korisnik:</span>
                            <p className="text-slate-600">{duplicate.userName}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">TIS ID:</span>
                            <p className="text-slate-600">{duplicate.tisId}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Datum i vreme:</span>
                            <p className="text-slate-600">{duplicate.date} {duplicate.time}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Tehničar:</span>
                            <p className="text-slate-600">{duplicate.technicianName1}{duplicate.technicianName2 ? `, ${duplicate.technicianName2}` : ''}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Paket:</span>
                            <p className="text-slate-600">{duplicate.packageName}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-orange-100">
                          <span className="text-xs text-orange-700">{duplicate.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkOrdersUpload;