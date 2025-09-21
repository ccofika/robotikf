"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { CalendarDate, parseDate, getLocalTimeZone, today, DateValue } from "@internationalized/date"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar, RangeCalendar } from "./calendar-rac"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function dateToCalendarDate(date: Date | undefined): CalendarDate | undefined {
  if (!date) return undefined

  const year = date.getFullYear()
  const month = date.getMonth() + 1 // getMonth() returns 0-11, CalendarDate expects 1-12
  const day = date.getDate()

  return new CalendarDate(year, month, day)
}

function calendarDateToDate(calendarDate: CalendarDate | undefined): Date | undefined {
  if (!calendarDate) return undefined

  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const calendarDate = dateToCalendarDate(date)

  const handleSelection = (selectedDate: DateValue | null) => {
    if (selectedDate && 'year' in selectedDate) {
      const newDate = calendarDateToDate(selectedDate as CalendarDate)
      onSelect?.(newDate)
    } else {
      onSelect?.(undefined)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? date.toLocaleDateString('sr-RS') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 z-50" align="start" side="bottom" sideOffset={5}>
        <Calendar
          value={calendarDate}
          onChange={handleSelection}
        />
      </PopoverContent>
    </Popover>
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
    <div className={cn("flex items-center space-x-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[200px] justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? startDate.toLocaleDateString('sr-RS') : <span>{startPlaceholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 z-50" align="start" side="bottom" sideOffset={5}>
          <Calendar
            value={dateToCalendarDate(startDate)}
            onChange={(selectedDate) => {
              if (selectedDate && 'year' in selectedDate) {
                const newDate = calendarDateToDate(selectedDate as CalendarDate)
                onStartDateSelect?.(newDate)
              } else {
                onStartDateSelect?.(undefined)
              }
            }}
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">do</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[200px] justify-start text-left font-normal",
              !endDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? endDate.toLocaleDateString('sr-RS') : <span>{endPlaceholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 z-50" align="start" side="bottom" sideOffset={5}>
          <Calendar
            value={dateToCalendarDate(endDate)}
            onChange={(selectedDate) => {
              if (selectedDate && 'year' in selectedDate) {
                const newDate = calendarDateToDate(selectedDate as CalendarDate)
                onEndDateSelect?.(newDate)
              } else {
                onEndDateSelect?.(undefined)
              }
            }}
            minValue={dateToCalendarDate(startDate)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}