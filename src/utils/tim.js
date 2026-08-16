// Pomoćne funkcije za "Tim" polje radnog naloga (robotik | mtel)

export const TIM_LABELS = { robotik: 'Robotik', mtel: 'mtel' };

// Labela za prikaz u detaljima
export const getTimLabel = (tim) => TIM_LABELS[tim] || 'Nije definisan';

// Jako blaga pozadina reda/kartice u tabelama radnih naloga:
// robotik = svetlo plava, mtel = svetlo crvena.
// fallbackHover je postojeća hover klasa reda kada tim nije definisan.
export const getTimRowClasses = (tim, fallbackHover = '') => {
  if (tim === 'robotik') return 'bg-blue-50/80 hover:bg-blue-100/60';
  if (tim === 'mtel') return 'bg-red-50/80 hover:bg-red-100/60';
  return fallbackHover;
};

// Varijanta bez hover efekta (kartice, ćelije, modali)
export const getTimBgClass = (tim) => {
  if (tim === 'robotik') return 'bg-blue-50/80';
  if (tim === 'mtel') return 'bg-red-50/80';
  return '';
};

// Inline stil za mesta gde Tailwind klase nisu pouzdane (legacy CSS tabele)
export const getTimRowStyle = (tim) => {
  if (tim === 'robotik') return { backgroundColor: 'rgba(59, 130, 246, 0.08)' };
  if (tim === 'mtel') return { backgroundColor: 'rgba(239, 68, 68, 0.08)' };
  return {};
};

// Klase za mali badge sa nazivom tima u detail view-ovima
export const getTimBadgeClasses = (tim) => {
  if (tim === 'robotik') return 'bg-blue-100 text-blue-700 border border-blue-200';
  if (tim === 'mtel') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-slate-100 text-slate-500 border border-slate-200';
};
