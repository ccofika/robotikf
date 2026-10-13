// Umanjenje zarade tehničara zbog vraćanja radnog naloga na ispravku.
// Mora da prati backend (robotikb/services/workOrderFinanceService.js):
// 1. vraćanje -10%, 2. -20% ... 5. -50%; 6. i svako sledeće vraćanje: nalog se ne plaća (-100%).
export const PENALTY_STEP_PERCENT = 10;
export const PENALTY_MAX_STEPS = 5;

export const penaltyPercentForCount = (count) => {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  if (n > PENALTY_MAX_STEPS) return 100;
  return n * PENALTY_STEP_PERCENT;
};

// Stanje umanjenja za nalog i šta bi donelo sledeće vraćanje sa umanjenjem
export const getPenaltyInfo = (workOrder) => {
  const count = workOrder?.rejectionPenaltyCount || 0;
  const current = workOrder?.rejectionPenaltyPercent || 0;
  const next = penaltyPercentForCount(count + 1);
  const cycle = workOrder?.penaltyCycle || 0;
  const cycleRejections = (workOrder?.rejectionHistory || []).filter(r => (r.cycle || 0) === cycle);
  return {
    count,
    current,
    next,
    step: next - current,
    rejectionsInCycle: cycleRejections.length,
    alreadyNotPaid: current >= 100,
    nextMeansNotPaid: next >= 100 && current < 100
  };
};

// Minus koji superadmin može ručno da postavi (samo koraci od 10%, 100% = nalog se ne plaća)
export const PENALTY_OPTIONS = [0, 10, 20, 30, 40, 50, 100];

// Iznos posle minusa (isto zaokruživanje kao backend applyPenalty)
export const applyPenaltyPercent = (gross, percent) => {
  const p = Math.min(Math.max(Number(percent) || 0, 0), 100);
  const g = Math.round((Number(gross) || 0) * 100) / 100;
  return Math.round(g * (100 - p)) / 100;
};

export const formatRsd = (value) => {
  const amount = Math.round((Number(value) || 0) * 100) / 100;
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} RSD`;
};
