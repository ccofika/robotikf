// Prikazne labele za tipove poziva podršci (SupportCall.supportType sa backenda)
export const SUPPORT_TYPE_LABELS = {
  administrative: 'Administrativna podrška',
  super: 'Superpodrška'
};

export const supportTypeLabel = (type) => SUPPORT_TYPE_LABELS[type] || type;

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
