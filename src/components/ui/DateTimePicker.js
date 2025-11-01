import React from 'react';

const DateTimePicker = ({
  value,
  onChange,
  label,
  placeholder = "Izaberite datum i vreme",
  className = ""
}) => {
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

  const handleChange = (e) => {
    onChange(e.target.value);
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

  const clearValue = () => {
    onChange('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="datetime-local"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full h-10 px-3 pr-10 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-slate-400"
        />
        {value && (
          <button
            type="button"
            onClick={clearValue}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            title="Obriši"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={setToday}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
        >
          Sada
        </button>
        <button
          type="button"
          onClick={setTodayStart}
          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
        >
          Danas 00:00
        </button>
        <button
          type="button"
          onClick={setTodayEnd}
          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
        >
          Danas 23:59
        </button>
        <button
          type="button"
          onClick={setYesterdayStart}
          className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
        >
          Juče 00:00
        </button>
        <button
          type="button"
          onClick={setLastWeekStart}
          className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
        >
          Pre 7 dana
        </button>
        <button
          type="button"
          onClick={setLastMonthStart}
          className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
        >
          Pre 30 dana
        </button>
      </div>
    </div>
  );
};

export default DateTimePicker;
