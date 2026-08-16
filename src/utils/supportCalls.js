// Prikazne labele za tipove poziva podršci (SupportCall.supportType sa backenda)
export const SUPPORT_TYPE_LABELS = {
  administrative: 'Administrativna podrška',
  super: 'Superpodrška'
};

export const supportTypeLabel = (type) => SUPPORT_TYPE_LABELS[type] || type;
