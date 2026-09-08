// Prikazne labele za tipove poziva (SupportCall.supportType sa backenda).
// Mora da prati SUPPORT_TYPES u robotikb/routes/supportCalls.js i SUPPORT_LINES
// u mobilnoj aplikaciji.
export const SUPPORT_TYPE_LABELS = {
  administrative: 'Administrativna podrška',
  super: 'Superpodrška',
  marko: 'Marko',
  ana: 'Ana'
};

// Redosled prikaza u zbirnom pregledu po tehničaru
export const SUPPORT_TYPES = ['administrative', 'super', 'marko', 'ana'];

export const supportTypeLabel = (type) => SUPPORT_TYPE_LABELS[type] || type;

// Boje po tipu poziva — iste kao dugmad u mobilnoj aplikaciji.
// `box/icon/badge` za timeline, `tile/tileText` za zbirne pločice.
export const SUPPORT_TYPE_STYLES = {
  administrative: {
    box: 'bg-violet-50 border-violet-100', icon: 'bg-violet-500', badge: 'text-violet-700 bg-violet-100',
    tile: 'from-violet-50 to-violet-100/50', tileText: 'text-violet-700'
  },
  super: {
    box: 'bg-orange-50 border-orange-100', icon: 'bg-orange-500', badge: 'text-orange-700 bg-orange-100',
    tile: 'from-orange-50 to-orange-100/50', tileText: 'text-orange-700'
  },
  marko: {
    box: 'bg-cyan-50 border-cyan-100', icon: 'bg-cyan-500', badge: 'text-cyan-700 bg-cyan-100',
    tile: 'from-cyan-50 to-cyan-100/50', tileText: 'text-cyan-700'
  },
  ana: {
    box: 'bg-pink-50 border-pink-100', icon: 'bg-pink-500', badge: 'text-pink-700 bg-pink-100',
    tile: 'from-pink-50 to-pink-100/50', tileText: 'text-pink-700'
  }
};

const FALLBACK_SUPPORT_STYLE = {
  box: 'bg-slate-50 border-slate-100', icon: 'bg-slate-500', badge: 'text-slate-700 bg-slate-100',
  tile: 'from-slate-50 to-slate-100/50', tileText: 'text-slate-700'
};

export const supportTypeStyle = (type) => SUPPORT_TYPE_STYLES[type] || FALLBACK_SUPPORT_STYLE;

// Labele izvora klika za pozive korisniku (WorkOrder.customerCallSource / ContactEvent.source)
export const CALL_SOURCE_LABELS = {
  banner: 'baner',
  order_card: 'kartica naloga',
  detail_screen: 'detalji naloga',
  notification_action: 'dugme u notifikaciji'
};

export const callSourceLabel = (source) => CALL_SOURCE_LABELS[source] || source || '';

// Kratke labele tipova događaja u objedinjenom timeline-u kontakata
export const EVENT_TYPE_BADGES = {
  support_call: 'Podrška',
  customer_call: 'Korisnik',
  reminder_sent: 'Podsetnik',
  uncontacted_alert: 'Alert'
};
