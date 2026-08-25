import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check, Clock, Sparkles } from "lucide-react";

interface CalendarDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateIso: string;
  onSelectDate: (iso: string) => void;
  availableDates: Array<{
    iso: string;
    label: string;
    count: number;
    formattedDay?: string;
  }>;
  todayIso: string;
  tomorrowIso?: string;
  yesterdayIso?: string;
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  isOpen,
  onClose,
  selectedDateIso,
  onSelectDate,
  availableDates,
  todayIso,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date for calendar view month/year
  const initialDate = useMemo(() => {
    if (selectedDateIso) {
      const parts = selectedDateIso.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    return new Date();
  }, [selectedDateIso]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Keep view month in sync when opening with a selected date
  useEffect(() => {
    if (isOpen && selectedDateIso) {
      const parts = selectedDateIso.split("-");
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [isOpen, selectedDateIso]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Map of class counts by ISO date
  const classCountMap = useMemo(() => {
    const map = new Map<string, number>();
    availableDates.forEach((d) => {
      map.set(d.iso, d.count);
    });
    return map;
  }, [availableDates]);

  // Calendar month navigation
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Compute days matrix for the current viewMonth/viewYear
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      month: number;
      year: number;
      iso: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      classCount: number;
    }> = [];

    // Previous month filler days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dayNumber: dayNum,
        month: m,
        year: y,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === selectedDateIso,
        classCount: classCountMap.get(iso) || 0,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        month: viewMonth,
        year: viewYear,
        iso,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        isSelected: iso === selectedDateIso,
        classCount: classCountMap.get(iso) || 0,
      });
    }

    // Next month filler days to complete 42 cells (6 rows) or 35 cells
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        month: m,
        year: y,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === selectedDateIso,
        classCount: classCountMap.get(iso) || 0,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDateIso, todayIso, classCountMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center sm:items-start justify-center sm:justify-start pt-0 sm:pt-36 sm:pl-8 md:pl-12 p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={popoverRef}
        className="w-full max-w-[340px] bg-[#0b1324] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col ring-1 ring-blue-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title & Close */}
        <div className="bg-[#070d18] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-tight">Calendar Date Selector</h3>
              <p className="text-[10px] text-slate-400">Select any date to view class operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Today Quick Shortcut */}
        <div className="p-3 bg-[#081020] border-b border-slate-800/80">
          <button
            onClick={() => {
              onSelectDate(todayIso);
              onClose();
            }}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
              selectedDateIso === todayIso
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40 ring-1 ring-blue-400/50"
                : "bg-[#0c162d] text-slate-200 border-slate-800 hover:border-slate-700 hover:bg-[#111e3d]"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <div className="text-left truncate">
                <span className="block leading-tight font-extrabold">Today</span>
                <span className="text-[10px] text-slate-400 font-medium block truncate">
                  {todayIso}
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-mono shrink-0 ml-1">
              {classCountMap.get(todayIso) || 0} classes
            </span>
          </button>
        </div>

        {/* Month Navigation */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800/60">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white tracking-wide">
            {months[viewMonth]} {viewYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 7x6 Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 p-3 pt-1">
          {calendarDays.map((d) => {
            const hasClasses = d.classCount > 0;
            return (
              <button
                key={d.iso}
                onClick={() => {
                  onSelectDate(d.iso);
                  onClose();
                }}
                className={`h-8 rounded-lg flex flex-col items-center justify-center relative text-xs transition-all cursor-pointer ${
                  d.isSelected
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/40 ring-2 ring-blue-400"
                    : d.isToday
                    ? "border border-red-500/80 bg-red-950/20 text-red-300 font-bold hover:bg-red-900/30"
                    : d.isCurrentMonth
                    ? "text-slate-200 hover:bg-slate-800/80"
                    : "text-slate-600 hover:text-slate-400 hover:bg-slate-800/40"
                }`}
                title={`${d.iso} ${hasClasses ? `(${d.classCount} classes)` : ""}`}
              >
                <span className="leading-none">{d.dayNumber}</span>
                {/* Dot / Indicator for scheduled classes */}
                {hasClasses && (
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      d.isSelected
                        ? "bg-white"
                        : d.isToday
                        ? "bg-red-400"
                        : "bg-emerald-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-2.5 bg-[#070d18] border-t border-slate-800 flex items-center justify-between text-[11px]">
          <div className="truncate mr-2">
            <span className="text-slate-400">Selected: </span>
            <span className="text-blue-300 font-semibold truncate">
              {selectedDateIso === todayIso ? "Today" : selectedDateIso}
            </span>
            <span className="text-slate-400 ml-1">
              ({classCountMap.get(selectedDateIso) || 0} classes)
            </span>
          </div>
          {selectedDateIso !== todayIso && (
            <button
              onClick={() => {
                onSelectDate(todayIso);
                onClose();
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] tracking-wide transition-colors shrink-0 cursor-pointer"
            >
              Jump to Today
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
