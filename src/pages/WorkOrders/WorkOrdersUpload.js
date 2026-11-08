import React, { useState } from 'react';
import { ArrowLeft, Upload, Download } from 'lucide-react';
import { toast } from '../../utils/toast';
import { workOrdersAPI, exportAPI } from '../../services/api';
import { cx, Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note, KV, Stat } from '../../security/sx/layout';
import { LinkBtn } from '../../montaza/ui';
import './WorkOrdersUpload.mx.css';

// Kolone Excel fajla (uputstvo): naziv i opis, kao ranije
const COLUMNS = [
  ['Tehnicar 1', 'ime prvog tehničara kome je dodeljen nalog'],
  ['Tehnicar 2', 'ime drugog tehničara (opciono)'],
  ['Tim', null],
  ['Područje', 'područje/opština gde se izvodi intervencija'],
  ['Početak instalacije', 'format: dd/mm/yyyy hh:mm'],
  ['Tehnologija', 'HFC, GPON, itd.'],
  ['TIS ID korisnika', 'jedinstveni ID korisnika'],
  ['Adresa korisnika', 'puna adresa'],
  ['Ime korisnika', 'ime i prezime korisnika'],
  ['Kontakt telefon 1', 'broj telefona korisnika'],
  ['TIS Posao ID', 'ID konkretnog zahteva'],
  ['Paket', 'naziv paketa/usluge'],
  ['Dodatni poslovi', 'dodatni poslovi vezani za radni nalog (opciono)'],
  ['Tip zahteva', 'nov korisnik, zamena uređaja, itd.']
];

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

      const { newWorkOrders, newUsers, existingUsers, errors, duplicates, timWarnings, timSummary, skippedSheets } = response.data;

      setParseResults({
        workOrdersAdded: newWorkOrders?.length || 0,
        usersAdded: newUsers?.length || 0,
        usersUpdated: existingUsers?.length || 0,
        errors: errors || [],
        duplicates: duplicates || [],
        timWarnings: timWarnings || [],
        timSummary: timSummary || null,
        skippedSheets: skippedSheets || []
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
    <div className="sx-page" data-testid="page-work-orders-upload">
      <PageHead
        eyebrow="Montaža · Radni nalozi"
        title="Import radnih naloga"
        lead="Dodavanje radnih naloga putem Excel fajla"
        actions={<LinkBtn to="/work-orders" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
      />

      <div className="sx-stack">
        {/* Uputstvo */}
        <Panel title="Uputstvo za upload">
          <p className="mx-woup__lead">
            Excel fajl mora sadržati sledeće kolone (obrađuju se <b>svi sheet-ovi</b> u fajlu):
          </p>
          <ul className="mx-woup__cols">
            {COLUMNS.map(([name, text]) => (
              <li key={name}>
                <b>{name}</b>
                {name === 'Tim'
                  ? <span>tim u koji se nalog svrstava: <b className="mx-woup__tim is-robotik">Robotik</b> (i "Robotik 1", "Robotik 2") ili <b className="mx-woup__tim is-mtel">mtel</b> (i "M telecommunication")</span>
                  : <span>{text}</span>}
              </li>
            ))}
          </ul>
          <Btn icon={Download} onClick={downloadTemplate}>Preuzmi šablon</Btn>
        </Panel>

        {/* Upload */}
        <Panel>
          <form onSubmit={handleSubmit} className="mx-woup__form">
            {error && <Note tone="bad">{error}</Note>}
            {successMessage && <Note tone="ok">{successMessage}</Note>}

            <div className="sx-field">
              <label htmlFor="workorders-file" className="sx-field__label">Odaberi Excel fajl</label>
              <input
                type="file"
                id="workorders-file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="sx-sr"
              />
              <label htmlFor="workorders-file" className={cx('mx-woup__drop', file && 'has-file', loading && 'is-disabled')}>
                <Upload size={28} strokeWidth={1.6} aria-hidden="true" />
                <b>{file ? file.name : 'Kliknite da odaberete Excel fajl'}</b>
                <span>ili prevucite fajl ovde</span>
              </label>
            </div>

            <div className="mx-woup__submit">
              <Btn variant="primary" icon={Upload} disabled={!file || loading} onClick={handleSubmit} data-testid="work-orders-upload-submit">
                {loading ? 'Upload u toku...' : 'Upload radnih naloga'}
              </Btn>
            </div>
          </form>
        </Panel>

        {/* Rezultat obrade */}
        {parseResults && (
          <Panel title="Rezultat obrade" testId="upload-results">
            <div className="sx-stats mx-woup__stats">
              <Stat label="Dodato radnih naloga" value={parseResults.workOrdersAdded} />
              <Stat label="Dodato novih korisnika" value={parseResults.usersAdded} />
              <Stat label="Ažurirano korisnika" value={parseResults.usersUpdated} />
            </div>

            {/* Tim statistika */}
            {parseResults.timSummary && (
              <div className="sx-stats mx-woup__stats">
                <Stat label="Tim Robotik" value={parseResults.timSummary.robotik} />
                <Stat label="Tim mtel" value={parseResults.timSummary.mtel} />
                <Stat label="Bez tima" value={parseResults.timSummary.bezTima} />
              </div>
            )}

            <div className="mx-gap">
              {/* Preskočeni sheet-ovi */}
              {parseResults.skippedSheets?.length > 0 && (
                <Note tone="idle">
                  <b>Preskočeni sheet-ovi</b> (ne sadrže kolone radnih naloga): {parseResults.skippedSheets.join(', ')}
                </Note>
              )}

              {/* Tim upozorenja */}
              {parseResults.timWarnings?.length > 0 && (
                <Note tone="warn">
                  <h4 className="mx-woup__title">Upozorenja za kolonu "Tim" ({parseResults.timWarnings.length}):</h4>
                  <p>Sledeći nalozi su uvezeni, ali tim nije prepoznat pa neće imati boju tima u tabelama. Tim možete naknadno postaviti u detaljima naloga:</p>
                  <div className="mx-woup__items">
                    {parseResults.timWarnings.map((warning, index) => (
                      <div key={index} className="mx-woup__item">
                        <KV cols={2} items={[
                          { k: 'Sheet / red', v: `"${warning.sheet}" - red ${warning.excelRow}` },
                          { k: 'Adresa', v: warning.address || '-' },
                          { k: 'Korisnik', v: warning.userName || '-' },
                          { k: 'TIS Posao ID', v: warning.tisJobId || '-' },
                          { k: 'Uneta vrednost', v: warning.value || 'prazno' }
                        ]} />
                        <span className="mx-woup__reason">{warning.reason}</span>
                      </div>
                    ))}
                  </div>
                </Note>
              )}

              {parseResults.errors.length > 0 && (
                <Note tone="bad">
                  <h4 className="mx-woup__title">Greške prilikom obrade:</h4>
                  <ul className="mx-woup__errors">
                    {parseResults.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </Note>
              )}

              {parseResults.duplicates.length > 0 && (
                <Note tone="warn">
                  <h4 className="mx-woup__title">Duplikati pronađeni ({parseResults.duplicates.length}):</h4>
                  <p>Sledeći radni nalozi već postoje u sistemu i nisu dodati:</p>
                  <div className="mx-woup__items">
                    {parseResults.duplicates.map((duplicate, index) => (
                      <div key={index} className="mx-woup__item">
                        <KV cols={2} items={[
                          { k: 'Adresa', v: duplicate.address },
                          { k: 'Korisnik', v: duplicate.userName },
                          { k: 'TIS ID', v: duplicate.tisId },
                          { k: 'Datum i vreme', v: `${duplicate.date} ${duplicate.time}` },
                          { k: 'Tehničar', v: `${duplicate.technicianName1}${duplicate.technicianName2 ? `, ${duplicate.technicianName2}` : ''}` },
                          { k: 'Paket', v: duplicate.packageName },
                          { k: 'Tim', v: duplicate.tim || '-' },
                          duplicate.sheet && { k: 'Sheet / red', v: `"${duplicate.sheet}" - red ${duplicate.excelRow}` }
                        ]} />
                        <span className="mx-woup__reason">{duplicate.reason}</span>
                      </div>
                    ))}
                  </div>
                </Note>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersUpload;
