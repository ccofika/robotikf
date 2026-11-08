import React, { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';
import axios from 'axios';
import { Btn } from '../security/sx/ui';
import { Panel, Note } from '../security/sx/layout';
import { Loading } from '../montaza/ui';

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
    const downloadUrl = 'https://drive.google.com/file/d/1zqYreqFT9l9v_apzoKSH6sdSS2LMy1qh/view?usp=sharing';
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
      <Panel className={className} pad={false}>
        <Loading rows={1} text="Učitavanje informacija o aplikaciji..." />
      </Panel>
    );
  }

  if (error || !apkInfo) {
    return <Note tone="idle" className={className}>{error || 'Aplikacija nije dostupna'}</Note>;
  }

  return (
    <Panel className={className} testId="apk-download">
      <div className="sx-item">
        <span className="sx-item__icon is-ink"><Smartphone size={18} strokeWidth={1.8} aria-hidden="true" /></span>
        <div className="sx-item__main">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="sx-card__title">Robotik Mobile App</h3>
            <span className="sx-tag">v3.0.0</span>
          </div>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Veličina: {formatFileSize(apkInfo.fileSize)}</span>
            <span>Objavljena: {formatDate(apkInfo.publishedAt)}</span>
            <span>Preuzimanja: {apkInfo.downloadCount}</span>
          </span>
          {/* dugme ispod podataka o verziji, kao ranije */}
          <div className="mt-3">
            <Btn variant="primary" icon={Download} onClick={handleDownload}>Preuzmi aplikaciju</Btn>
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default TechnicianAPKDownload;
