// Prikaz vremena zaduženja opreme (Equipment.assignedAt sa backenda).
//
// Oprema zadužena pre uvođenja praćenja nema `assignedAt` pečat i nema je smisla
// backfill-ovati — za nju prikazujemo objašnjenje umesto datuma.

export const ASSIGNED_AT_LEGACY_LABEL = 'Zaduženo pre uvođenja praćenja';
export const ASSIGNED_AT_EMPTY_LABEL = '—';

// DD.MM.YYYY. HH:mm — isti format koji se već koristi drugde u aplikaciji.
export const formatAssignedAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isAssignedToTechnician = (item) =>
  Boolean(item?.assignedTo) ||
  (typeof item?.location === 'string' && item.location.startsWith('tehnicar'));

// Vraća { text, variant } za ćeliju "Zaduženo".
//   'none'    - oprema uopšte nije zadužena (u magacinu)
//   'legacy'  - zadužena je, ali pre uvođenja praćenja (nema pečat)
//   'stamped' - zadužena je i imamo tačan datum i vreme
//
// `assumeAssigned` za tabele koje po definiciji prikazuju samo zaduženu opremu
// (detalji tehničara, tab za razduženje) — tamo `location` ume da bude
// optimistički izmenjen pa provera lokacije nije pouzdana.
export const describeAssignment = (item, { assumeAssigned = false } = {}) => {
  if (!assumeAssigned && !isAssignedToTechnician(item)) {
    return { text: ASSIGNED_AT_EMPTY_LABEL, variant: 'none' };
  }

  const formatted = formatAssignedAt(item?.assignedAt);
  if (!formatted) {
    return { text: ASSIGNED_AT_LEGACY_LABEL, variant: 'legacy' };
  }

  return { text: formatted, variant: 'stamped' };
};
