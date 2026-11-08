import React, { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Btn } from '../../security/sx/ui';
import { Field, DateField, TimeField } from '../../security/sx/forms';
import './DateTimePicker.mx.css';

// Datum + vreme (sx kalendar i lista vremena). Vrednost je kao kod datetime-local: 'GGGG-MM-DDTHH:MM' ili ''.
// Kao i datetime-local, vrednost se šalje tek kad su upisani i datum i vreme; brisanje datuma šalje ''.
const split = (v) => ({ d: v ? v.slice(0, 10) : '', t: v ? v.slice(11, 16) : '' });

export function DateTimeInput({ value, onChange, id, disabled, compact, clearable, 'aria-label': ariaLabel }) {
  const [part, setPart] = useState(() => split(value));
  useEffect(() => { setPart(split(value)); }, [value]);
  const set = (d, t) => {
    setPart({ d, t });
    if (d && t) onChange(`${d}T${t}`);
    else if (!d && value) onChange('');
  };
  return (
    <span className="mx-dtp__in">
      <DateField id={id} compact={compact} value={part.d} onChange={(d) => set(d, part.t)} disabled={disabled} aria-label={ariaLabel} />
      <TimeField compact={compact} value={part.t} onChange={(t) => set(part.d, t)} disabled={disabled} invalid={!!part.d && !part.t} aria-label="Vreme" />
      {clearable && (value || part.d) && (
        <Btn size="sm" variant="ghost" icon={X} onClick={() => set('', '')} disabled={disabled} aria-label="Obriši" title="Obriši" />
      )}
    </span>
  );
}

const DateTimePicker = ({
  value,
  onChange,
  label,
  className = ""
}) => {
  const id = useId();
  // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const setToday = () => {
    const now = new Date();
    onChange(formatDateTimeLocal(now.toISOString()));
  };

  const setTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onChange(formatDateTimeLocal(today.toISOString()));
  };

  const setTodayEnd = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    onChange(formatDateTimeLocal(today.toISOString()));
  };

  const setYesterdayStart = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    onChange(formatDateTimeLocal(yesterday.toISOString()));
  };

  const setLastWeekStart = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);
    onChange(formatDateTimeLocal(lastWeek.toISOString()));
  };

  const setLastMonthStart = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setHours(0, 0, 0, 0);
    onChange(formatDateTimeLocal(lastMonth.toISOString()));
  };

  return (
    <Field label={label} htmlFor={id} className={className}>
      <DateTimeInput id={id} value={value} onChange={onChange} clearable />

      {/* Brzi izbor */}
      <div className="mx-dtp__quick">
        <Btn size="sm" onClick={setToday}>Sada</Btn>
        <Btn size="sm" onClick={setTodayStart}>Danas 00:00</Btn>
        <Btn size="sm" onClick={setTodayEnd}>Danas 23:59</Btn>
        <Btn size="sm" onClick={setYesterdayStart}>Juče 00:00</Btn>
        <Btn size="sm" onClick={setLastWeekStart}>Pre 7 dana</Btn>
        <Btn size="sm" onClick={setLastMonthStart}>Pre 30 dana</Btn>
      </div>
    </Field>
  );
};

export default DateTimePicker;
