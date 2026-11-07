// Kalendarski dan po lokalnom vremenu (Srbija) kao 'YYYY-MM-DD'.
// toISOString() daje UTC dan, pa između ponoći i 01:00 (02:00 leti) vraća jučerašnji datum.
export const localYmd = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
