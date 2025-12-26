import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TechnicianAPKDownload = ({ className = '' }) => {
  const [apkInfo, setApkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLatestAPK();
  }, []);

  const fetchLatestAPK = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/apk/latest`);
      setApkInfo(response.data);
    } catch (err) {
      console.error('Error fetching APK info:', err);
      setError('Trenutno nije dostupna najnovija verzija aplikacije');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Google Drive direktan download link za APK
    const downloadUrl = 'https://drive.google.com/file/d/17MgJD-NXonbGfH27UUdOaSfZEaixc9s-/view?usp=sharing';
    window.open(downloadUrl, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`bg-purple-50 border border-purple-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Smartphone className="text-purple-600 animate-pulse" size={24} />
          <div className="flex-1">
            <p className="text-sm text-gray-600">Učitavanje informacija o aplikaciji...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !apkInfo) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="text-gray-400" size={24} />
          <div className="flex-1">
            <p className="text-sm text-gray-500">{error || 'Aplikacija nije dostupna'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
          <Smartphone className="text-white" size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Robotik Mobile App
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              v1.0.4
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              <span>Veličina: {formatFileSize(apkInfo.fileSize)}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              <span>Objavljena: {formatDate(apkInfo.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download size={14} className="text-blue-500" />
              <span>Preuzimanja: {apkInfo.downloadCount}</span>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download size={16} />
            Preuzmi aplikaciju
          </button>
        </div>
      </div>

    </div>
  );
};

export default TechnicianAPKDownload;
