import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

const DAY_MS = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);
const parseDate = (value) => new Date(`${value}T00:00:00.000Z`);
const toDateString = (date) => date.toISOString().slice(0, 10);
const firstOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const addMonths = (date, amount) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
const monthLabel = (date) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(date);
const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 3 days", days: 2 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 1 year", months: 12 },
];

function CalendarMonth({ month, fromDate, toDate, onSelect, onChangeMonth, label }) {
  const firstDay = firstOfMonth(month);
  const offset = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= daysInMonth ? new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day)) : null;
  });
  const todayValue = today();
  return <section className="range-calendar" aria-label={`${label}: ${monthLabel(month)} ${month.getUTCFullYear()}`}>
    <header className="range-calendar-heading">
      <button type="button" className="range-month-select" onClick={() => onChangeMonth(addMonths(month, -1))} aria-label={`Previous ${label.toLowerCase()} month`}><ChevronDown size={14} className="rotate-90" /></button>
      <strong>{monthLabel(month)} <span>{month.getUTCFullYear()}</span></strong>
      <button type="button" className="range-month-select" onClick={() => onChangeMonth(addMonths(month, 1))} aria-label={`Next ${label.toLowerCase()} month`}><ChevronDown size={14} className="-rotate-90" /></button>
    </header>
    <div className="range-calendar-grid" role="grid" aria-label={monthLabel(month)}>
      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span className="range-weekday" key={day}>{day}</span>)}
      {cells.map((date, index) => {
        if (!date) return <span className="range-day-empty" key={`empty-${index}`} />;
        const value = toDateString(date);
        const selected = value === fromDate || value === toDate;
        const inRange = fromDate && toDate && value > fromDate && value < toDate;
        return <button
          key={value}
          type="button"
          role="gridcell"
          aria-label={date.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}
          aria-pressed={selected}
          disabled={value > todayValue}
          className={`range-day${selected ? " is-selected" : ""}${inRange ? " is-in-range" : ""}`}
          onClick={() => onSelect(value)}
        >{date.getUTCDate()}</button>;
      })}
    </div>
  </section>;
}

export default function DateRangePicker({ fromDate, toDate, onApply }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);
  const [leftMonth, setLeftMonth] = useState(() => firstOfMonth(parseDate(fromDate)));
  const containerRef = useRef(null);
  const rightMonth = addMonths(leftMonth, 1);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const choosePreset = ({ days, months }) => {
    const end = parseDate(today());
    const start = new Date(end);
    if (months) start.setUTCMonth(start.getUTCMonth() - months);
    else start.setTime(start.getTime() - days * DAY_MS);
    const startValue = toDateString(start);
    setDraftFrom(startValue);
    setDraftTo(toDateString(end));
    setLeftMonth(firstOfMonth(start));
  };

  const selectDate = (value) => {
    if (!draftFrom || draftTo || value < draftFrom) {
      setDraftFrom(value);
      setDraftTo("");
    } else {
      setDraftTo(value);
    }
  };

  const cancel = () => {
    setDraftFrom(fromDate);
    setDraftTo(toDate);
    setOpen(false);
  };

  const apply = () => {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    onApply(draftFrom, draftTo);
    setOpen(false);
  };

  const selectedPreset = PRESETS.find(({ days, months }) => {
    if (!draftFrom || !draftTo) return false;
    const end = parseDate(draftTo);
    const start = new Date(end);
    if (months) start.setUTCMonth(start.getUTCMonth() - months);
    else start.setTime(start.getTime() - days * DAY_MS);
    return draftFrom === toDateString(start) && draftTo === toDateString(end);
  });
  const visibleFrom = parseDate(fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const visibleTo = parseDate(toDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  return <div className="date-range-picker" ref={containerRef}>
    <button type="button" className="date-range-trigger" aria-expanded={open} aria-haspopup="dialog" onClick={() => {
      setDraftFrom(fromDate);
      setDraftTo(toDate);
      setLeftMonth(firstOfMonth(parseDate(fromDate)));
      setOpen((value) => !value);
    }}>
      <CalendarDays size={15} aria-hidden="true" />
      <span>{visibleFrom}<span className="range-separator">—</span>{visibleTo}</span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <div className="date-range-popover" role="dialog" aria-label="Choose date range">
      <nav className="range-presets" aria-label="Date range presets">
        <strong>Quick ranges</strong>
        {PRESETS.map((preset) => <button key={preset.label} type="button" className={selectedPreset?.label === preset.label ? "is-active" : ""} onClick={() => choosePreset(preset)}>{preset.label}</button>)}
      </nav>
      <div className="range-picker-content">
        <div className="range-picker-summary"><span>{draftFrom || "Start date"} <span className="range-separator">—</span> {draftTo || "End date"}</span><button type="button" onClick={() => choosePreset(PRESETS[3])}>Reset</button></div>
        <div className="range-calendars">
          <CalendarMonth label="From" month={leftMonth} fromDate={draftFrom} toDate={draftTo} onSelect={selectDate} onChangeMonth={(month) => setLeftMonth(firstOfMonth(month))} />
          <CalendarMonth label="To" month={rightMonth} fromDate={draftFrom} toDate={draftTo} onSelect={selectDate} onChangeMonth={(month) => setLeftMonth(addMonths(firstOfMonth(month), -1))} />
        </div>
        <footer className="range-picker-actions">
          <button type="button" className="range-cancel-button" onClick={cancel}>Cancel</button>
          <button type="button" className="range-apply-button" onClick={apply} disabled={!draftFrom || !draftTo || draftFrom > draftTo}>Apply range</button>
        </footer>
      </div>
    </div>}
  </div>;
}
