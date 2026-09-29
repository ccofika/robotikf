// Web NFC: radi u Chrome-u na Android telefonu, preko HTTPS-a ili localhost-a.
// Čita fabrički broj taga (serialNumber) i po želji upisuje link koji otvara aplikaciju radnika.
export const webNfcSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window;

export const normalizeUid = (raw) => {
  const hex = String(raw || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (hex.length < 8 || hex.length > 20 || hex.length % 2) return null;
  return hex.match(/.{2}/g).join(':');
};

// Čeka jedno prislanjanje taga. Vraća { uid } ili baca grešku sa porukom za korisnika.
export async function readTagOnce({ signal } = {}) {
  if (!webNfcSupported()) throw new Error('Ovaj pregledač ne može da čita NFC. Otvori stranicu u Chrome-u na Android telefonu ili upiši broj taga.');
  // eslint-disable-next-line no-undef
  const reader = new NDEFReader();
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const stop = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', () => { stop(); reject(new Error('Otkazano')); });
    reader.onreading = (ev) => { stop(); resolve({ uid: normalizeUid(ev.serialNumber) || ev.serialNumber, records: ev.message ? ev.message.records.length : 0 }); };
    reader.onreadingerror = () => { stop(); reject(new Error('Tag nije pročitan. Drži telefon mirno uz tag 1-2 sekunde i probaj ponovo.')); };
    reader.scan({ signal: ctrl.signal }).catch((e) => {
      reject(new Error(e && e.name === 'NotAllowedError' ? 'Dozvoli pristup NFC-u u pregledaču i uključi NFC na telefonu.' : 'NFC nije dostupan. Uključi NFC u podešavanjima telefona.'));
    });
  });
}

// Upisuje link (otvara aplikaciju radnika) i po želji zaključava tag. Zaključavanje je trajno.
export async function writeAppLink({ lock = false } = {}) {
  if (!webNfcSupported()) throw new Error('Upis radi samo u Chrome-u na Android telefonu.');
  // eslint-disable-next-line no-undef
  const writer = new NDEFReader();
  const enc = new TextEncoder();
  await writer.write({
    records: [
      { recordType: 'url', data: 'https://administracija.robotik.rs/nfc' },
      { recordType: 'android.com:pkg', data: enc.encode('com.robotik.mobile') }
    ]
  });
  if (lock && writer.makeReadOnly) await writer.makeReadOnly();
  return true;
}

// GPS telefona za lokaciju taga (nije obavezan)
export const currentGeo = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
  );
});
