import React from 'react';
import { CheckIcon, XIcon, AlertIcon } from './icons/SvgIcons';
import { Button } from './ui/button-1';
import { cn } from '../utils/cn';

const AIVerificationModal = ({
  isOpen,
  onClose,
  result,
  loading,
  onAccept,     // Callback kada admin prihvati AI preporuku
  onReject      // Callback kada admin odbije AI preporuku
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span>AI Verifikacija u toku...</span>
                </>
              ) : result?.verified ? (
                <>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckIcon size={24} className="text-green-600" />
                  </div>
                  <span>Radni nalog je verifikovan</span>
                </>
              ) : (
                <>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <XIcon size={24} className="text-red-600" />
                  </div>
                  <span>Radni nalog nije verifikovan</span>
                </>
              )}
            </h3>
            {!loading && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-600 text-lg mb-2">AI analizira radni nalog...</p>
              <p className="text-slate-500 text-sm">
                AI proverava opremu, slike, materijale i određuje ispravan status korisnika
              </p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Verification Status */}
              <div className={cn(
                "p-4 rounded-lg border-2",
                result.verified
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-start space-x-3">
                  {result.verified ? (
                    <CheckIcon size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XIcon size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className={cn(
                      "font-semibold mb-1",
                      result.verified ? "text-green-900" : "text-red-900"
                    )}>
                      {result.verified
                        ? "✓ Radni nalog je uspešno verifikovan"
                        : "✗ Radni nalog nije verifikovan"}
                    </h4>
                    <p className={cn(
                      "text-sm",
                      result.verified ? "text-green-700" : "text-red-700"
                    )}>
                      {result.verified
                        ? "Svi podaci su provereni i potvrđeni. Radni nalog je automatski verifikovan."
                        : "Radni nalog je automatski vraćen tehničaru za ispravku."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Status - prikaži samo ako je verifikovano */}
              {result.verified && result.customerStatus && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    Odabrani status korisnika:
                  </h4>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      {result.customerStatus}
                    </p>
                  </div>
                </div>
              )}

              {/* AI Confidence Level */}
              {result.confidence && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    Nivo pouzdanosti:
                  </h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          result.confidence === 'high' && "bg-green-500 w-full",
                          result.confidence === 'medium' && "bg-yellow-500 w-2/3",
                          result.confidence === 'low' && "bg-red-500 w-1/3"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      result.confidence === 'high' && "bg-green-100 text-green-700",
                      result.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
                      result.confidence === 'low' && "bg-red-100 text-red-700"
                    )}>
                      {result.confidence === 'high' && 'Visok'}
                      {result.confidence === 'medium' && 'Srednji'}
                      {result.confidence === 'low' && 'Nizak'}
                    </span>
                  </div>
                </div>
              )}

              {/* Checked Items */}
              {result.checkedItems && result.checkedItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    {result.verified ? "Šta je provereno:" : "Problemi koji su pronađeni:"}
                  </h4>
                  <ul className="space-y-2">
                    {result.checkedItems.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        {result.verified ? (
                          <CheckIcon size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XIcon size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-sm text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reason / Explanation */}
              {result.reason && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    {result.verified ? "Detaljno objašnjenje:" : "Poruka za tehničara:"}
                  </h4>
                  <div className={cn(
                    "p-4 rounded-lg border",
                    result.verified
                      ? "bg-slate-50 border-slate-200"
                      : "bg-yellow-50 border-yellow-200"
                  )}>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {result.reason}
                    </p>
                  </div>
                  {!result.verified && (
                    <p className="text-xs text-slate-500 mt-2">
                      Ova poruka će biti poslata tehničaru kao komentar administratora
                    </p>
                  )}
                </div>
              )}

              {/* Info message */}
              <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertIcon size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  {result.verified
                    ? "AI preporučuje VERIFIKACIJU ovog radnog naloga. Odaberite akciju ispod."
                    : "AI preporučuje VRAĆANJE ovog radnog naloga tehničaru. Odaberite akciju ispod."}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && result && (
          <div className="p-6 border-t border-slate-200">
            {result.verified ? (
              // Ako je AI preporučio verifikaciju
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Button
                    type="primary"
                    size="medium"
                    prefix={<CheckIcon size={16} />}
                    onClick={onAccept}
                    className="flex-1"
                  >
                    Prihvati i Verifikuj
                  </Button>
                  <Button
                    type="secondary"
                    size="medium"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Odustani
                  </Button>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Klikom na "Prihvati i Verifikuj" radni nalog će biti verifikovan i customerStatus će biti postavljen
                </p>
              </div>
            ) : (
              // Ako je AI preporučio vraćanje
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Button
                    type="error"
                    size="medium"
                    prefix={<XIcon size={16} />}
                    onClick={onReject}
                    className="flex-1"
                  >
                    Vrati Tehničaru
                  </Button>
                  <Button
                    type="secondary"
                    size="medium"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Odustani
                  </Button>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Klikom na "Vrati Tehničaru" radni nalog će biti vraćen sa AI komentarom
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIVerificationModal;
