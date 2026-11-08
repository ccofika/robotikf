import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileSpreadsheet, Tag, Box, Hash } from 'lucide-react';
import { toast } from '../../utils/toast';
import { equipmentAPI } from '../../services/api';
import { cx, Btn, Led } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat, KV } from '../../security/sx/layout';
import { Field } from '../../security/sx/forms';
import { LinkBtn } from '../../montaza/ui';
import './EquipmentUpload.mx.css';

const EquipmentUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [parseResults, setParseResults] = useState(null);
  const [invalidCategoriesError, setInvalidCategoriesError] = useState(null);
  const navigate = useNavigate();
  
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
    setInvalidCategoriesError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await equipmentAPI.uploadExcel(formData);

      const { message, totalProcessed, addedCount, duplicates, errors } = response.data;

      setParseResults({
        totalProcessed: totalProcessed || 0,
        equipmentAdded: addedCount || 0,
        duplicates: duplicates || [],
        errors: errors || []
      });

      const duplicateMessage = duplicates?.length > 0 ? ` (${duplicates.length} duplikat${duplicates.length === 1 ? '' : 'a'} preskočen${duplicates.length === 1 ? '' : 'o'})` : '';
      const errorsExist = errors && errors.length > 0;

      if (errorsExist) {
        setSuccessMessage(`${message}${duplicateMessage}`);
        setError(`${errors.length} stavk${errors.length === 1 ? 'a' : 'i'} iz Excel fajla nije moglo biti dodato zbog grešaka. Pogledajte detalje ispod.`);
        toast.warning ? toast.warning('Upload završen sa greškama') : toast.error(`Upload završen - ${errors.length} grešaka`);
      } else {
        setSuccessMessage(`${message}${duplicateMessage}`);
        toast.success('Uspešno dodavanje opreme!');
      }
      setFile(null);
      
      // Resetuj input polje za fajl
      const fileInput = document.getElementById('equipment-file');
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Greška pri upload-u opreme:', error);

      // Proveri da li je greška zbog nevalidnih kategorija
      if (error.response?.data?.invalidCategories) {
        setInvalidCategoriesError({
          invalidCategories: error.response.data.invalidCategories,
          invalidRows: error.response.data.invalidRows || [],
          validCategories: error.response.data.validCategories || []
        });
        setError(error.response.data.error);
        toast.error('Pronađene nevalidne kategorije!');
      } else {
        setError(error.response?.data?.error || 'Greška pri upload-u opreme. Pokušajte ponovo.');
        toast.error('Neuspešan upload opreme!');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const downloadTemplate = async () => {
    // Šablon ide kroz api instancu (ruta traži token), pa se preuzima kao blob
    try {
      const response = await equipmentAPI.getTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oprema-sablon.xlsx';
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
    <div className="sx-page" data-testid="page-equipment-upload">
      <PageHead
        eyebrow="Montaža · Inventar"
        title="Dodavanje opreme putem Excel fajla"
        lead="Upload Excel fajla sa listom opreme"
        actions={<LinkBtn to="/equipment" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
      />

      <div className="sx-stack">
        <Panel
          title="Uputstvo za upload"
          sub="Excel fajl mora sadržati sledeće kolone:"
          actions={<Btn variant="ghost" icon={FileSpreadsheet} onClick={downloadTemplate}>Preuzmi šablon</Btn>}
        >
          <div className="sx-list">
            <div className="sx-item">
              <span className="sx-item__icon"><Tag size={17} strokeWidth={1.8} aria-hidden="true" /></span>
              <div className="sx-item__main"><b>Kategorija</b><span>kategorija opreme (npr. "CAM", "modem", "STB", itd.)</span></div>
            </div>
            <div className="sx-item">
              <span className="sx-item__icon"><Box size={17} strokeWidth={1.8} aria-hidden="true" /></span>
              <div className="sx-item__main"><b>MODEL</b><span>naziv modela opreme</span></div>
            </div>
            <div className="sx-item">
              <span className="sx-item__icon"><Hash size={17} strokeWidth={1.8} aria-hidden="true" /></span>
              <div className="sx-item__main"><b>SN</b><span>jedinstveni serijski broj opreme</span></div>
            </div>
          </div>
        </Panel>

        <Panel>
          {/* dugme je kao ranije "submit" dugme forme sa onClick (handleSubmit sprečava dupli poziv) */}
          <form onSubmit={handleSubmit} className="mx-up-form">
            {error && <Note tone="bad">{error}</Note>}

            {invalidCategoriesError && (
              <div className="mx-up-box is-bad">
                <h4 className="mx-up-h"><Led tone="bad" />Pronađene nevalidne kategorije:</h4>

                <div className="mx-up-part">
                  <p className="mx-up-p">Sledeće kategorije nisu prepoznate:</p>
                  <div className="sx-chips">
                    {invalidCategoriesError.invalidCategories.map((cat, index) => (
                      <span key={index} className="sx-tag is-bad">"{cat}"</span>
                    ))}
                  </div>
                </div>

                {invalidCategoriesError.invalidRows.length > 0 && (
                  <div className="mx-up-part">
                    <p className="mx-up-p">Redovi sa nevalidnim kategorijama:</p>
                    <div className="mx-up-scroll is-sm">
                      <div className="sx-tablewrap">
                        <table className="sx-table">
                          <thead>
                            <tr>
                              <th>Red</th>
                              <th>Kategorija</th>
                              <th>Serijski broj</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invalidCategoriesError.invalidRows.map((row, index) => (
                              <tr key={index} style={{ '--i': index }}>
                                <td className="is-head"><span className="sx-mono">{row.row}</span></td>
                                <td data-label="Kategorija"><b className="mx-strong">{row.category}</b></td>
                                <td data-label="Serijski broj"><span className="sx-mono">{row.serialNumber}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mx-up-part mx-up-valid">
                  <p className="mx-up-p has-led"><Led tone="ok" />Validne kategorije koje možete koristiti:</p>
                  <div className="sx-chips">
                    {invalidCategoriesError.validCategories.map((cat, index) => (
                      <span key={index} className="sx-tag is-ok">{cat}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {successMessage && <Note tone="ok">{successMessage}</Note>}

            <Field label="Odaberi Excel fajl:" htmlFor="equipment-file">
              <input
                type="file"
                id="equipment-file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="sx-sr mx-up-input"
              />
              <div
                className={cx('mx-up-drop', file && 'is-picked', loading && 'is-disabled')}
                onClick={() => !loading && document.getElementById('equipment-file').click()}
              >
                <Upload size={22} strokeWidth={1.8} aria-hidden="true" />
                <b>{file ? file.name : 'Kliknite da odaberete Excel fajl'}</b>
                <span>Podržani formati: .xlsx, .xls</span>
              </div>
            </Field>

            <div className="mx-up-actions">
              <Btn
                type="submit"
                variant="primary"
                icon={Upload}
                onClick={handleSubmit}
                disabled={!file || loading}
                busy={loading}
              >
                {loading ? 'Upload u toku...' : 'Upload opreme'}
              </Btn>
            </div>
          </form>
        </Panel>

        {parseResults && (
          <Panel title="Rezultat obrade">
            <div className="sx-stats mx-up-stats">
              <Stat label="Ukupno redova u fajlu" value={parseResults.totalProcessed} />
              <Stat label="Uspešno dodato" value={parseResults.equipmentAdded} tone={parseResults.equipmentAdded > 0 ? 'ok' : null} />
              <Stat label="Preskočeni duplikati" value={parseResults.duplicates.length} tone={parseResults.duplicates.length > 0 ? 'warn' : null} />
              {parseResults.errors.length > 0 && <Stat label="Greške" value={parseResults.errors.length} tone="bad" />}
            </div>

            {parseResults.errors.length > 0 && (
              <div className="mx-up-box is-bad">
                <h4 className="mx-up-h"><Led tone="bad" />Greške prilikom obrade ({parseResults.errors.length}):</h4>
                <p className="mx-up-p">
                  Sledeći redovi iz Excel fajla nisu mogli biti dodati. Proverite da li svaki red ima popunjene kolone <strong>Kategorija</strong>, <strong>MODEL</strong> i <strong>SN</strong>.
                </p>
                <div className="mx-up-scroll">
                  <div className="sx-tablewrap">
                    <table className="sx-table">
                      <thead>
                        <tr>
                          <th>Red u Excel-u</th>
                          <th>Kategorija</th>
                          <th>Model</th>
                          <th>Serijski broj</th>
                          <th>Problem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResults.errors.map((err, index) => {
                          const isStructured = typeof err === 'object' && err !== null;
                          return (
                            <tr key={index} style={{ '--i': index }}>
                              <td className="is-head"><span className="sx-mono">{isStructured && err.row ? err.row : '-'}</span></td>
                              <td data-label="Kategorija">{isStructured && err.rawData ? err.rawData.kategorija : '-'}</td>
                              <td data-label="Model">{isStructured && err.rawData ? err.rawData.model : '-'}</td>
                              <td data-label="Serijski broj"><span className="sx-mono">{isStructured && err.rawData ? err.rawData.sn : '-'}</span></td>
                              <td data-label="Problem" className="is-wide mx-up-problem">{isStructured ? err.message : String(err)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="sx-field__hint">
                  Ispravite Excel fajl i ponovo ga upload-ujte da biste dodali ove stavke.
                </p>
              </div>
            )}

            {parseResults.duplicates.length > 0 && (
              <div className="mx-up-box is-warn">
                <h4 className="mx-up-h"><Led tone="warn" />Duplikati pronađeni ({parseResults.duplicates.length}):</h4>
                <p className="mx-up-p">Sledeća oprema već postoji u sistemu i nije dodana:</p>
                <div className="mx-up-dups">
                  {parseResults.duplicates.map((duplicate, index) => (
                    <div key={index} className="sx-cred">
                      <KV
                        cols={2}
                        items={[
                          { k: 'Kategorija', v: duplicate.category || 'N/A' },
                          { k: 'Model', v: duplicate.model || 'N/A' },
                          { k: 'Serijski broj', v: duplicate.serialNumber || 'N/A', mono: true },
                          { k: 'Status', v: duplicate.status || 'N/A' },
                          { k: 'Lokacija', v: duplicate.location || 'N/A' },
                          (duplicate.assignedTo || duplicate.assignedToUser) && { k: 'Dodeljena', v: duplicate.assignedToUser || duplicate.assignedTo || 'N/A' }
                        ]}
                      />
                      {duplicate.reason && <p className="mx-up-reason">{duplicate.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
};

export default EquipmentUpload;