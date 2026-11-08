// Izbor datuma u izgledu Security dela: polje sa kucanjem (dd.mm.gggg.) i sopstvenim kalendarom (security/sx/forms).
// API je isti kao ranije: vrednosti su Date objekti (lokalna ponoć), onSelect dobija Date ili undefined.
import * as React from "react"
import { DateField } from "../../security/sx/forms"
import { cn } from "../../lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")
const toYmd = (d?: Date) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "")
const fromYmd = (ymd: string) => {
  if (!ymd) return undefined
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y, m - 1, d)
}

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ date, onSelect, placeholder = "Pick a date", className, disabled = false }: DatePickerProps) {
  return (
    <span className={cn("mx-datepick", className)}>
      <DateField value={toYmd(date)} onChange={(v: string) => onSelect?.(fromYmd(v))} clearable disabled={disabled}
        placeholder={placeholder} aria-label={placeholder} />
    </span>
  )
}

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateSelect?: (date: Date | undefined) => void
  onEndDateSelect?: (date: Date | undefined) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateSelect,
  onEndDateSelect,
  startPlaceholder = "Start date",
  endPlaceholder = "End date",
  className,
  disabled = false,
}: DateRangePickerProps) {
  return (
    <div className={cn("mx-daterange", className)}>
      <DateField value={toYmd(startDate)} onChange={(v: string) => onStartDateSelect?.(fromYmd(v))} clearable disabled={disabled}
        placeholder={startPlaceholder} aria-label={startPlaceholder} compact />
      <span className="mx-daterange__sep">do</span>
      <DateField value={toYmd(endDate)} onChange={(v: string) => onEndDateSelect?.(fromYmd(v))} clearable disabled={disabled}
        min={toYmd(startDate) || undefined} placeholder={endPlaceholder} aria-label={endPlaceholder} compact />
    </div>
  )
}
