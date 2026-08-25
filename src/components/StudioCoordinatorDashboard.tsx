import React, { useState, useMemo } from "react";
import {
  Users,
  Monitor,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Building,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { DaywiseClassRecord, CentralClassRecord } from "../types";

interface StudioCoordinatorDashboardProps {
  daywiseRecords: DaywiseClassRecord[];
  centralRecords: CentralClassRecord[];
  rawHeadersDaywise: string[];
  rawRecordsDaywise: Record<string, any>[];
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const StudioCoordinatorDashboard: React.FC<StudioCoordinatorDashboardProps> = ({
  daywiseRecords,
  centralRecords,
  rawHeadersDaywise,
  rawRecordsDaywise,
  lastUpdated,
  isLoading,
  onRefresh,
}) => {
  // Slicer States
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>("all");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>("all");
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("all");
  const [selectedStudio, setSelectedStudio] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Combine central and daywise records for comprehensive querying
  const allRecords = useMemo(() => {
    // If centralRecords is available and has rows, use it as base.
    if (centralRecords && centralRecords.length > 0) {
      return centralRecords;
    }
    return daywiseRecords || [];
  }, [centralRecords, daywiseRecords]);

  // Extract unique filter options from all records
  const slicerOptions = useMemo(() => {
    const months = new Set<string>();
    const daysOfWeek = new Set<string>();
    const dates = new Set<string>();
    const studios = new Set<string>();
    const coordinators = new Set<string>();

    const daysOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthsOrder = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    allRecords.forEach((r) => {
      // Month
      if (r.month && r.month !== "Unknown") {
        months.add(r.month);
      }
      
      // Date & Day of Week
      if (r.date) {
        dates.add(r.date);
        for (const d of daysOrder) {
          if (r.date.toLowerCase().includes(d.toLowerCase())) {
            daysOfWeek.add(d);
            break;
          }
        }
      }

      // Studio
      if (r.studio) {
        studios.add(r.studio.trim());
      }

      // Coordinator
      const coord = (r.studioCoordinator || "").trim();
      if (coord) {
        coordinators.add(coord.toUpperCase());
      } else {
        coordinators.add("UNKNOWN");
      }
    });

    const sortedMonths = Array.from(months).sort((a, b) => {
      const idxA = monthsOrder.indexOf(a);
      const idxB = monthsOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });

    const sortedDaysOfWeek = daysOrder.filter((d) => daysOfWeek.has(d));
    const sortedDates = Array.from(dates).sort();

    return {
      months: sortedMonths,
      daysOfWeek: sortedDaysOfWeek,
      dates: sortedDates,
      studios: Array.from(studios).sort(),
      coordinators: Array.from(coordinators).sort(),
    };
  }, [allRecords]);

  // Dynamic Filtering based on Day and Month Slicers
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      // Month Slicer
      if (selectedMonth !== "all") {
        const recordMonth = r.month || "";
        const recordDate = r.date || "";
        if (
          !recordMonth.toLowerCase().includes(selectedMonth.toLowerCase()) &&
          !recordDate.toLowerCase().includes(selectedMonth.toLowerCase())
        ) {
          return false;
        }
      }

      // Day of Week Slicer
      if (selectedDayOfWeek !== "all") {
        const recordDate = (r.date || "").toLowerCase();
        if (!recordDate.includes(selectedDayOfWeek.toLowerCase())) {
          return false;
        }
      }

      // Specific Date Slicer
      if (selectedSpecificDate !== "all") {
        if (r.date !== selectedSpecificDate) {
          return false;
        }
      }

      // Coordinator Slicer
      if (selectedCoordinator !== "all") {
        const coord = (r.studioCoordinator || "UNKNOWN").trim().toUpperCase();
        if (coord !== selectedCoordinator.toUpperCase()) {
          return false;
        }
      }

      // Studio Slicer
      if (selectedStudio !== "all") {
        const studioName = (r.studio || "UNKNOWN").trim().toUpperCase();
        if (studioName !== selectedStudio.toUpperCase()) {
          return false;
        }
      }

      // Keyword Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (r.topic || "").toLowerCase().includes(q) ||
          (r.subject || "").toLowerCase().includes(q) ||
          (r.teacher1 || "").toLowerCase().includes(q) ||
          (r.studio || "").toLowerCase().includes(q) ||
          (r.studioCoordinator || "").toLowerCase().includes(q) ||
          (r.course || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allRecords, selectedMonth, selectedDayOfWeek, selectedSpecificDate, selectedCoordinator, selectedStudio, search]);

  // 1. Studio Coordinator Stakeholder Class Count (Total, Record Shoot, Live Class)
  const coordinatorClassCounts = useMemo(() => {
    const map: Record<string, { count: number; recorded: number; live: number }> = {};

    // Standard expected coordinators list to preserve layout symmetry
    const standardCoordinators = [
      "TUHIN", "AKASH", "ASIF", "JOY", "TANVIR",
      "MEHEDI", "NAYEEM", "REFAT", "UNKNOWN", "NABI"
    ];

    standardCoordinators.forEach((c) => {
      map[c] = { count: 0, recorded: 0, live: 0 };
    });

    const isRecordShoot = (r: CentralClassRecord | DaywiseClassRecord) => {
      const p = (r.productType || "").toLowerCase();
      const t = (r.topic || "").toLowerCase();
      const c = (r.course || "").toLowerCase();
      return (
        p.includes("record") ||
        p.includes("shoot") ||
        t.includes("content shoot") ||
        t.includes("record") ||
        t.includes("shoot") ||
        t.includes("রেকর্ড") ||
        t.includes("শ্যুট") ||
        c.includes("record") ||
        c.includes("shoot")
      );
    };

    filteredRecords.forEach((r) => {
      let coord = (r.studioCoordinator || "").trim().toUpperCase();
      if (!coord || coord === "" || coord === "N/A") {
        coord = "UNKNOWN";
      }
      if (!map[coord]) {
        map[coord] = { count: 0, recorded: 0, live: 0 };
      }
      map[coord].count++;
      if (isRecordShoot(r)) {
        map[coord].recorded++;
      } else {
        map[coord].live++;
      }
    });

    // Convert to sorted array
    return Object.entries(map)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        recorded: stats.recorded,
        live: stats.live,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // 2. Studio Utilization Summary with Red Progress Bars
  const studioUtilization = useMemo(() => {
    const map: Record<string, number> = {};

    filteredRecords.forEach((r) => {
      let studio = (r.studio || "").trim().toUpperCase();
      if (!studio || studio === "" || studio === "N/A") {
        studio = "CANCELLED / UNASSIGNED";
      }
      map[studio] = (map[studio] || 0) + 1;
    });

    const entries = Object.entries(map).map(([name, count]) => ({
      name,
      count,
    }));

    // Sort descending by count
    entries.sort((a, b) => b.count - a.count);

    const maxCount = entries.length > 0 ? entries[0].count : 1;

    // Distribute into Left Column & Right Column
    const leftColumn: Array<{ name: string; count: number; percentage: number }> = [];
    const rightColumn: Array<{ name: string; count: number; percentage: number }> = [];

    entries.forEach((item, index) => {
      const percentage = Math.max(2, Math.min(100, (item.count / maxCount) * 100));
      const formattedItem = { ...item, percentage };
      if (index % 2 === 0) {
        leftColumn.push(formattedItem);
      } else {
        rightColumn.push(formattedItem);
      }
    });

    return {
      entries,
      maxCount,
      leftColumn,
      rightColumn,
      totalClasses: filteredRecords.length,
    };
  }, [filteredRecords]);

  // Clear all active slicers
  const handleResetFilters = () => {
    setSelectedMonth("all");
    setSelectedDayOfWeek("all");
    setSelectedSpecificDate("all");
    setSelectedCoordinator("all");
    setSelectedStudio("all");
    setSearch("");
  };

  const hasActiveSlicers =
    selectedMonth !== "all" ||
    selectedDayOfWeek !== "all" ||
    selectedSpecificDate !== "all" ||
    selectedCoordinator !== "all" ||
    selectedStudio !== "all" ||
    search.trim() !== "";

  return (
    <div className="space-y-6 pb-16 text-slate-100">
      {/* Slicers & Filter Controls Bar */}
      <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
                Studio Co-Ordinator Overview
              </h3>
              <p className="text-xs text-slate-400">
                Filter by Month, Day of Week, or Date across all {allRecords.length.toLocaleString()} class operations records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveSlicers && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Slicers
              </button>
            )}
            <span className="text-xs font-medium text-slate-400 bg-[#080d19] px-2.5 py-1.5 rounded-lg border border-slate-800">
              Showing <strong className="text-red-400">{filteredRecords.length.toLocaleString()}</strong> classes
            </span>
          </div>
        </div>

        {/* Month-wise Slicer Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-red-400" />
            <span>Month Slicer:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedMonth("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedMonth === "all"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-[#080d19] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              All Months
            </button>
            {slicerOptions.months.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedMonth === m
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "bg-[#080d19] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Day-of-Week & Date Dropdown Slicers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Day of Week Slicer */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Day-wise Slicer
            </label>
            <select
              value={selectedDayOfWeek}
              onChange={(e) => setSelectedDayOfWeek(e.target.value)}
              className="w-full bg-[#080d19] border border-slate-800 hover:border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
            >
              <option value="all">All Days (Sunday – Saturday)</option>
              {slicerOptions.daysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Date Slicer */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Exact Date Slicer
            </label>
            <select
              value={selectedSpecificDate}
              onChange={(e) => setSelectedSpecificDate(e.target.value)}
              className="w-full bg-[#080d19] border border-slate-800 hover:border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
            >
              <option value="all">All Dates ({slicerOptions.dates.length} Days)</option>
              {slicerOptions.dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinator Direct Slicer */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Coordinator Filter
            </label>
            <select
              value={selectedCoordinator}
              onChange={(e) => setSelectedCoordinator(e.target.value)}
              className="w-full bg-[#080d19] border border-slate-800 hover:border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
            >
              <option value="all">All Coordinators ({slicerOptions.coordinators.length})</option>
              {slicerOptions.coordinators.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Search Classes
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Topic, Teacher, Subject..."
                className="w-full bg-[#080d19] border border-slate-800 hover:border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TOP SECTION: Studio Coordinator Stakeholder Class Count */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-300" />
          <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            Studio Coordinator Stakeholder Class Count
          </h2>
        </div>

        {/* Coordinator Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {coordinatorClassCounts.map((coord) => {
            const isSelected = selectedCoordinator.toUpperCase() === coord.name;
            return (
              <button
                key={coord.name}
                onClick={() => {
                  if (isSelected) setSelectedCoordinator("all");
                  else setSelectedCoordinator(coord.name);
                }}
                className={`text-left p-4 rounded-xl transition-all border ${
                  isSelected
                    ? "bg-[#14213d] border-red-500 ring-2 ring-red-500/30"
                    : "bg-[#0c1424] hover:bg-[#101b30] border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  {coord.name}
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-red-500 font-mono tracking-tight">
                    {coord.count.toLocaleString()}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    Classes
                  </span>
                </div>

                {/* Record Shoot & Live Class Divided Breakdown */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-1.5">
                  <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-md px-2 py-1">
                    <span className="text-[10px] font-medium text-yellow-200/80 block leading-tight">
                      Record Shoot
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-yellow-400 font-mono mt-0.5 block">
                      {coord.recorded.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/25 rounded-md px-2 py-1">
                    <span className="text-[10px] font-medium text-red-300/80 block leading-tight">
                      Live Class
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-red-500 font-mono mt-0.5 block">
                      {coord.live.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SECTION: Studio Utilization Summary */}
      <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-300" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
              Studio Utilization Summary
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Total Slots Airing: <strong className="text-slate-200">{studioUtilization.totalClasses.toLocaleString()}</strong>
          </span>
        </div>

        {/* 2-Column Utilization Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">
          {/* Left Column */}
          <div className="space-y-4">
            {studioUtilization.leftColumn.map((studio) => {
              const isSelected = selectedStudio.toUpperCase() === studio.name;
              return (
                <div
                  key={studio.name}
                  onClick={() => {
                    if (isSelected) setSelectedStudio("all");
                    else setSelectedStudio(studio.name);
                  }}
                  className={`group cursor-pointer space-y-1.5 p-1.5 -m-1.5 rounded-lg transition-colors ${
                    isSelected ? "bg-[#14213d]/60 ring-1 ring-red-500/40" : "hover:bg-slate-800/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-[13px]">
                    <span className="font-bold text-slate-200 uppercase tracking-wide group-hover:text-red-400 transition-colors">
                      {studio.name}
                    </span>
                    <span className="font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                      {studio.count.toLocaleString()} classes
                    </span>
                  </div>
                  {/* Red Progress Bar */}
                  <div className="w-full bg-[#080d19] h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-500 ease-out shadow-xs shadow-red-600/50"
                      style={{ width: `${studio.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {studioUtilization.rightColumn.map((studio) => {
              const isSelected = selectedStudio.toUpperCase() === studio.name;
              return (
                <div
                  key={studio.name}
                  onClick={() => {
                    if (isSelected) setSelectedStudio("all");
                    else setSelectedStudio(studio.name);
                  }}
                  className={`group cursor-pointer space-y-1.5 p-1.5 -m-1.5 rounded-lg transition-colors ${
                    isSelected ? "bg-[#14213d]/60 ring-1 ring-red-500/40" : "hover:bg-slate-800/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-[13px]">
                    <span className="font-bold text-slate-200 uppercase tracking-wide group-hover:text-red-400 transition-colors">
                      {studio.name}
                    </span>
                    <span className="font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                      {studio.count.toLocaleString()} classes
                    </span>
                  </div>
                  {/* Red Progress Bar */}
                  <div className="w-full bg-[#080d19] h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-500 ease-out shadow-xs shadow-red-600/50"
                      style={{ width: `${studio.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
