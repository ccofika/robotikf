import React, { useState, useEffect } from 'react';
import { Upload, Download, Trash2, CheckCircle, AlertCircle, Smartphone, Calendar, HardDrive } from 'lucide-react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ApkManagement = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    version: '',
    versionCode: '',
    changelog: '',
    isMandatory: false,
    apkFile: null
  });

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/apk/list`);
      setVersions(response.data.versions);
    } catch (error) {
      console.error('Error fetching APK versions:', error);
      toast.error('Greška pri učitavanju verzija');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.apk')) {
      setFormData({ ...formData, apkFile: file });
    } else {
      toast.error('Molimo odaberite validan APK fajl');
      e.target.value = null;
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.version || !formData.versionCode || !formData.changelog || !formData.apkFile) {
      toast.error('Sva polja su obavezna');
      return;
    }

    try {
      setUploading(true);

      const uploadFormData = new FormData();
      uploadFormData.append('apk', formData.apkFile);
      uploadFormData.append('version', formData.version);
      uploadFormData.append('versionCode', formData.versionCode);
      uploadFormData.append('changelog', formData.changelog);
      uploadFormData.append('isMandatory', formData.isMandatory);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/apk/upload`,
        uploadFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload Progress: ${percentCompleted}%`);
          }
        }
      );

      toast.success('APK uspešno upload-ovan!');

      // Reset form
      setFormData({
        version: '',
        versionCode: '',
        changelog: '',
        isMandatory: false,
        apkFile: null
      });
      document.getElementById('apk-file-input').value = null;

      // Refresh list
      fetchVersions();

    } catch (error) {
      console.error('Error uploading APK:', error);
      const errorMsg = error.response?.data?.error || 'Greška pri upload-ovanju APK-a';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeactivate = async (id, version) => {
    if (!window.confirm(`Da li ste sigurni da želite da deaktivirate verziju ${version}?`)) {
      return;
    }

    try {
      await axios.put(`${API_URL}/api/apk/${id}/deactivate`);
      toast.success('Verzija deaktivirana');
      fetchVersions();
    } catch (error) {
      console.error('Error deactivating APK:', error);
      toast.error('Greška pri deaktivaciji verzije');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Smartphone className="text-purple-600" size={28} />
          APK Menadžment
        </h1>
        <p className="text-gray-600 mt-1">
          Upload i upravljanje verzijama Android aplikacije
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload className="text-purple-600" size={20} />
          Upload Nova Verzija
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verzija (npr. 1.0.1)
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version Code (broj)
              </label>
              <input
                type="number"
                value={formData.versionCode}
                onChange={(e) => setFormData({ ...formData, versionCode: e.target.value })}
                placeholder="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                disabled={uploading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Changelog (svaka linija je nova stavka)
            </label>
            <textarea
              value={formData.changelog}
              onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
              placeholder="Popravljen bug sa notifikacijama&#10;Dodata nova funkcionalnost&#10;Poboljšan UI"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Svaka linija predstavlja jednu stavku u changelog-u
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              APK Fajl
            </label>
            <input
              id="apk-file-input"
              type="file"
              accept=".apk"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              disabled={uploading}
            />
            {formData.apkFile && (
              <p className="text-xs text-gray-600 mt-1">
                Odabran fajl: {formData.apkFile.name} ({formatFileSize(formData.apkFile.size)})
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="mandatory-checkbox"
              type="checkbox"
              checked={formData.isMandatory}
              onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              disabled={uploading}
            />
            <label htmlFor="mandatory-checkbox" className="text-sm text-gray-700">
              Obavezno ažuriranje (korisnici moraju da ažuriraju)
            </label>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white font-medium transition-colors ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Upload-ovanje na Cloudinary...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload APK
              </>
            )}
          </button>
        </form>
      </div>

      {/* Versions List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Postojeće Verzije</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Učitavanje verzija...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={48} />
            <p className="text-gray-600">Nema upload-ovanih verzija</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version._id}
                className={`border rounded-lg p-4 ${
                  version.isActive
                    ? 'border-purple-200 bg-purple-50'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-semibold text-gray-900">
                        v{version.version}
                      </span>
                      <span className="text-sm text-gray-500">
                        (Code: {version.versionCode})
                      </span>
                      {version.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} />
                          Aktivna
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Neaktivna
                        </span>
                      )}
                      {version.isMandatory && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Obavezna
                        </span>
                      )}
                    </div>

                    {/* Changelog */}
                    {Array.isArray(version.changelog) && version.changelog.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Promene:</p>
                        <ul className="text-sm text-gray-600 space-y-0.5 ml-4">
                          {version.changelog.map((item, index) => (
                            <li key={index} className="list-disc">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <HardDrive size={14} />
                        <span>{formatFileSize(version.fileSize)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(version.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download size={14} />
                        <span>{version.downloadCount} preuzimanja</span>
                      </div>
                      {version.cloudinaryUrl && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <CheckCircle size={14} />
                          <span>Cloudinary</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <a
                      href={`${API_URL}/api/apk/download/${version._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                    {version.isActive && (
                      <button
                        onClick={() => handleDeactivate(version._id, version.version)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Deaktiviraj"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApkManagement;
