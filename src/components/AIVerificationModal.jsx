import React from 'react';
import { Check, X, Info } from 'lucide-react';
import Dialog from '../security/sx/Dialog';
import { cx, Btn, Sign } from '../security/sx/ui';
import { Note } from '../security/sx/layout';
import './WorkOrderDialogs.mx.css';

// Nivo pouzdanosti AI procene: ton i deo trake
const CONFIDENCE = {
  high: { tone: 'ok', label: 'Visok', width: '100%' },
  medium: { tone: 'warn', label: 'Srednji', width: '66%' },
  low: { tone: 'bad', label: 'Nizak', width: '33%' }
};

const AIVerificationModal = ({
  isOpen,
  onClose,
  result,
  loading,
  onAccept,     // Callback kada admin prihvati AI preporuku
  onReject      // Callback kada admin odbije AI preporuku
}) => {
  if (!isOpen) return null;

  const confidence = result && CONFIDENCE[result.confidence];

  return (
    <Dialog
      onClose={onClose}
      busy={loading}
      size="lg"
      testId="ai-verification-dialog"
      title={loading
        ? 'AI Verifikacija u toku...'
        : result?.verified
          ? 'Radni nalog je verifikovan'
          : 'Radni nalog nije verifikovan'}
      footer={!loading && result && (
        <>
          {result.verified ? (
            // Ako je AI preporučio verifikaciju
            <Btn variant="primary" icon={Check} onClick={onAccept} data-testid="ai-accept">Prihvati i Verifikuj</Btn>
          ) : (
            // Ako je AI preporučio vraćanje
            <Btn variant="danger" icon={X} onClick={onReject} data-testid="ai-reject">Vrati Tehničaru</Btn>
          )}
          <Btn onClick={onClose}>Odustani</Btn>
          <p className="mx-wodlg-foothint">
            {result.verified
              ? 'Klikom na "Prihvati i Verifikuj" radni nalog će biti verifikovan i customerStatus će biti postavljen'
              : 'Klikom na "Vrati Tehničaru" radni nalog će biti vraćen sa AI komentarom'}
          </p>
        </>
      )}
    >
      {loading ? (
        <div className="mx-wodlg-busy" role="status" aria-live="polite">
          <span className="mx-wodlg-spinner" aria-hidden="true" />
          <p className="mx-wodlg-busy__title">AI analizira radni nalog...</p>
          <p className="mx-wodlg-muted">
            AI proverava opremu, slike, materijale i određuje ispravan status korisnika
          </p>
        </div>
      ) : result ? (
        <div className="mx-wodlg-stack">
          {/* Ishod provere */}
          <Note tone={result.verified ? 'ok' : 'bad'}>
            <b>
              {result.verified
                ? '✓ Radni nalog je uspešno verifikovan'
                : '✗ Radni nalog nije verifikovan'}
            </b>
            <span className="mx-wodlg-block">
              {result.verified
                ? 'Svi podaci su provereni i potvrđeni. Radni nalog je automatski verifikovan.'
                : 'Radni nalog je automatski vraćen tehničaru za ispravku.'}
            </span>
          </Note>

          {/* Status korisnika - samo ako je verifikovano */}
          {result.verified && result.customerStatus && (
            <section className="mx-wodlg-sec">
              <h4 className="mx-wodlg-sec__title">Odabrani status korisnika:</h4>
              <div className="mx-wodlg-box is-info">{result.customerStatus}</div>
            </section>
          )}

          {/* Nivo pouzdanosti */}
          {result.confidence && (
            <section className="mx-wodlg-sec">
              <h4 className="mx-wodlg-sec__title">Nivo pouzdanosti:</h4>
              <div className="mx-wodlg-meter">
                <span className="mx-wodlg-meter__track">
                  {confidence && <span className={cx('mx-wodlg-meter__bar', `is-${confidence.tone}`)} style={{ width: confidence.width }} />}
                </span>
                {confidence && <Sign tone={confidence.tone}>{confidence.label}</Sign>}
              </div>
            </section>
          )}

          {/* Šta je provereno ili šta nije u redu */}
          {result.checkedItems && result.checkedItems.length > 0 && (
            <section className="mx-wodlg-sec">
              <h4 className="mx-wodlg-sec__title">
                {result.verified ? 'Šta je provereno:' : 'Problemi koji su pronađeni:'}
              </h4>
              <ul className="mx-wodlg-checks">
                {result.checkedItems.map((item, index) => (
                  <li key={index} className={result.verified ? 'is-ok' : 'is-bad'}>
                    {result.verified
                      ? <Check size={16} strokeWidth={2} aria-hidden="true" />
                      : <X size={16} strokeWidth={2} aria-hidden="true" />}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Objašnjenje ili poruka za tehničara */}
          {result.reason && (
            <section className="mx-wodlg-sec">
              <h4 className="mx-wodlg-sec__title">
                {result.verified ? 'Detaljno objašnjenje:' : 'Poruka za tehničara:'}
              </h4>
              <div className={cx('mx-wodlg-box mx-wodlg-pre', !result.verified && 'is-warn')}>{result.reason}</div>
              {!result.verified && (
                <p className="mx-wodlg-hint">Ova poruka će biti poslata tehničaru kao komentar administratora</p>
              )}
            </section>
          )}

          <Note tone="info" icon={Info}>
            {result.verified
              ? 'AI preporučuje VERIFIKACIJU ovog radnog naloga. Odaberite akciju ispod.'
              : 'AI preporučuje VRAĆANJE ovog radnog naloga tehničaru. Odaberite akciju ispod.'}
          </Note>
        </div>
      ) : null}
    </Dialog>
  );
};

export default AIVerificationModal;
