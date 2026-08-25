import React, { useState, useMemo, useEffect } from "react";
import {
  Radio,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Grid,
  List,
  Plus,
  Tv,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  BookOpen,
  SlidersHorizontal,
  Building,
} from "lucide-react";
import { DaywiseClassRecord } from "../types";
import { DataTable, ColumnDef } from "./common/DataTable";
import { StudioTimelineView } from "./StudioTimelineView";
import { StudioCardsView } from "./StudioCardsView";
import { ClassDetailsModal } from "./ClassDetailsModal";
import { AddClassModal } from "./AddClassModal";
import { CalendarDatePicker } from "./CalendarDatePicker";
import {
  getCurrentBSTTime,
  normalizeDateStr,
  parseTimeToDecimalRange,
  formatDecimalToTime,
  getBSTDateIso,
  PrimeTimeSlot,
  isClassInPrimeSlot,
} from "../utils/timeUtils";

interface DaywiseDashboardProps {
  records: DaywiseClassRecord[];
  rawHeaders: string[];
  rawRecords: Record<string, any>[];
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

type ViewMode = "timeline" | "studios" | "table";

export const DaywiseRealtimeDashboard: React.FC<DaywiseDashboardProps> = ({
  records: initialRecords,
  rawHeaders,
  rawRecords,
  lastUpdated,
  isLoading,
  onRefresh,
}) => {
  // Local list to allow additions in preview
  const [localRecords, setLocalRecords] = useState<DaywiseClassRecord[]>([]);

  // View Mode: 'timeline' | 'studios' | 'table'
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  // Combined records - filter out empty/spacer rows with no substantive class data
  const allRecords = useMemo(() => {
    return [...localRecords, ...initialRecords].filter((r) => {
      const hasTopic = Boolean(r.topic && r.topic.trim() && r.topic.trim() !== "." && r.topic.trim() !== "-");
      const hasCourse = Boolean(r.course && r.course.trim() && r.course.trim() !== "." && r.course.trim() !== "-");
      const hasStudio = Boolean(r.studio && r.studio.trim() && r.studio.trim() !== "." && r.studio.trim() !== "-");
      const hasTeacher = Boolean(r.teacher1 && r.teacher1.trim() && r.teacher1.trim() !== "." && r.teacher1.trim() !== "-");
      const hasTime = Boolean(r.scheduledTime && r.scheduledTime.trim() && r.scheduledTime.trim() !== "." && r.scheduledTime.trim() !== "-");
      return hasTopic || hasCourse || hasStudio || hasTeacher || hasTime;
    });
  }, [initialRecords, localRecords]);

  // Dynamic BST today ISO string (UTC+6)
  const todayIso = useMemo(() => getBSTDateIso(0), []);

  // Extract and normalize all unique dates, ensuring baseline Today is navigable
  const availableDates = useMemo(() => {
    const map = new Map<string, { iso: string; label: string; raw: string; count: number; dateObj: Date | null; dayOfWeek: string; formattedDay: string }>();

    allRecords.forEach((r) => {
      if (r.date && r.date.trim()) {
        const norm = normalizeDateStr(r.date);
        if (norm.iso) {
          if (!map.has(norm.iso)) {
            const dateObj = norm.dateObj;
            let formattedDay = norm.label;
            if (dateObj) {
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              formattedDay = `${norm.dayOfWeek ? norm.dayOfWeek.slice(0, 3) + ", " : ""}${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
            }
            map.set(norm.iso, { ...norm, count: 0, formattedDay });
          }
          map.get(norm.iso)!.count++;
        }
      }
    });

    // Ensure baseline today exists
    if (!map.has(todayIso)) {
      const todayNorm = normalizeDateStr(todayIso);
      map.set(todayIso, { ...todayNorm, count: 0, formattedDay: "Today" });
    }

    // Sort chronologically
    return Array.from(map.values()).sort((a, b) => {
      if (a.dateObj && b.dateObj) {
        return a.dateObj.getTime() - b.dateObj.getTime();
      }
      return a.iso.localeCompare(b.iso);
    });
  }, [allRecords, todayIso]);

  // Default to Today's date in BST
  const defaultDateIso = useMemo(() => {
    const foundToday = availableDates.find((d) => d.iso === todayIso);
    if (foundToday) return foundToday.iso;
    return availableDates.length > 0 ? availableDates[0].iso : todayIso;
  }, [availableDates, todayIso]);

  // Active Date Selection
  const [selectedDateIso, setSelectedDateIso] = useState<string>(defaultDateIso);
  const [isCalendarPickerOpen, setIsCalendarPickerOpen] = useState<boolean>(false);

  const isToday = selectedDateIso === todayIso;

  // Keep selectedDateIso in sync if initial load completes
  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDateIso || !availableDates.some((d) => d.iso === selectedDateIso))) {
      setSelectedDateIso(defaultDateIso);
    }
  }, [availableDates, defaultDateIso]);

  // Other Slicers
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStudio, setSelectedStudio] = useState<string>("all");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<PrimeTimeSlot>("all");
  const [search, setSearch] = useState<string>("");

  // Modals
  const [selectedClass, setSelectedClass] = useState<DaywiseClassRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Time: Continuous real-time BST tracking
  const [ticker, setTicker] = useState<number>(0);

  // Precision 1-second interval ticker for continuous real-time BST tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute active decimal time in BST
  const activeTimeDecimal = useMemo(() => {
    const realBST = getCurrentBSTTime(null);
    return realBST.decimal;
  }, [ticker]);

  // Compute live BST time object with seconds
  const bstTime = useMemo(() => {
    return getCurrentBSTTime(null);
  }, [ticker]);

  // Filter options dynamically populated based on current selected date
  const dateSpecificRecords = useMemo(() => {
    return allRecords.filter((r) => {
      if (!selectedDateIso || selectedDateIso === "all") return true;
      const norm = normalizeDateStr(r.date);
      return norm.iso === selectedDateIso;
    });
  }, [allRecords, selectedDateIso]);

  // Extract filter options dynamically with graceful fallback across all records
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const courses = new Set<string>();
    const studios = new Set<string>();

    const targetSet = dateSpecificRecords.length > 0 ? dateSpecificRecords : allRecords;

    targetSet.forEach((r) => {
      if (r.productType && r.productType.trim()) types.add(r.productType.trim());
      if (r.course && r.course.trim()) courses.add(r.course.trim());
      if (r.studio && r.studio.trim() && r.studio.toLowerCase() !== "cancelled") {
        studios.add(r.studio.trim());
      }
    });

    // Also include standard studio list
    const standardStudios = [
      "Studio 1 - HQ1",
      "Studio 2 - HQ1",
      "Studio 3 - HQ1",
      "Studio 4 - HQ1",
      "Studio 5 - HQ5",
      "Studio 6 - HQ5",
      "Studio 7 - HQ5",
      "Studio 8 - HQ5",
      "Studio 9 - NB2",
      "Studio 10 - NB2",
      "Studio 11 - NB2",
    ];
    standardStudios.forEach((s) => studios.add(s));

    // Ensure all unique courses and types from all records are available in dropdown
    allRecords.forEach((r) => {
      if (r.productType && r.productType.trim()) types.add(r.productType.trim());
      if (r.course && r.course.trim()) courses.add(r.course.trim());
    });

    return {
      types: Array.from(types).filter(Boolean).sort(),
      courses: Array.from(courses).filter(Boolean).sort(),
      studios: Array.from(studios).filter(Boolean).sort(),
    };
  }, [dateSpecificRecords, allRecords]);

  // Peak Prime Time Slot Counts (computed for the selected day across current type/course/studio filters)
  const primeSlotCounts = useMemo(() => {
    let all = 0;
    let slot430 = 0;
    let slot630 = 0;
    let slot830 = 0;

    dateSpecificRecords.forEach((r) => {
      // Check if matches other active filters
      let matchOther = true;
      if (
        selectedType !== "all" &&
        (r.productType || "").trim().toLowerCase() !== selectedType.trim().toLowerCase()
      ) {
        matchOther = false;
      }
      if (
        selectedCourse !== "all" &&
        (r.course || "").trim().toLowerCase() !== selectedCourse.trim().toLowerCase()
      ) {
        matchOther = false;
      }
      if (
        selectedStudio !== "all" &&
        (r.studio || "").trim().toLowerCase() !== selectedStudio.trim().toLowerCase()
      ) {
        matchOther = false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          (r.topic || "").toLowerCase().includes(q) ||
          (r.subject || "").toLowerCase().includes(q) ||
          (r.teacher1 || "").toLowerCase().includes(q) ||
          (r.studio || "").toLowerCase().includes(q) ||
          (r.course || "").toLowerCase().includes(q) ||
          (r.productType || "").toLowerCase().includes(q) ||
          (r.scheduledTime || "").toLowerCase().includes(q);
        if (!matches) matchOther = false;
      }

      if (matchOther) {
        all++;
        if (isClassInPrimeSlot(r.scheduledTime, "4:30 PM")) slot430++;
        if (isClassInPrimeSlot(r.scheduledTime, "6:30 PM")) slot630++;
        if (isClassInPrimeSlot(r.scheduledTime, "8:30 PM")) slot830++;
      }
    });

    return { all, slot430, slot630, slot830 };
  }, [dateSpecificRecords, selectedType, selectedCourse, selectedStudio, search]);

  // Applied filtered records
  const filteredRecords = useMemo(() => {
    return dateSpecificRecords.filter((r) => {
      if (
        selectedType !== "all" &&
        (r.productType || "").trim().toLowerCase() !== selectedType.trim().toLowerCase()
      ) {
        return false;
      }

      if (
        selectedCourse !== "all" &&
        (r.course || "").trim().toLowerCase() !== selectedCourse.trim().toLowerCase()
      ) {
        return false;
      }

      if (
        selectedStudio !== "all" &&
        (r.studio || "").trim().toLowerCase() !== selectedStudio.trim().toLowerCase()
      ) {
        return false;
      }

      if (selectedTimeSlot !== "all") {
        if (!isClassInPrimeSlot(r.scheduledTime, selectedTimeSlot)) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          (r.topic || "").toLowerCase().includes(q) ||
          (r.subject || "").toLowerCase().includes(q) ||
          (r.teacher1 || "").toLowerCase().includes(q) ||
          (r.studio || "").toLowerCase().includes(q) ||
          (r.course || "").toLowerCase().includes(q) ||
          (r.productType || "").toLowerCase().includes(q) ||
          (r.scheduledTime || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [dateSpecificRecords, selectedType, selectedCourse, selectedStudio, selectedTimeSlot, search]);

  // 5 Operational KPI Metrics matching Screenshot
  const metrics = useMemo(() => {
    const scheduled = filteredRecords.length;
    let runningNow = 0;
    let upcoming = 0;
    let completed = 0;
    const activeStudiosSet = new Set<string>();

    filteredRecords.forEach((r) => {
      // Calculate Active Studios (excluding cancelled)
      if (r.studio && r.studio.trim() && r.studio.toLowerCase() !== "cancelled") {
        activeStudiosSet.add(r.studio.trim());
      }

      if (isToday) {
        const parsed = parseTimeToDecimalRange(r.scheduledTime);
        if (parsed) {
          if (activeTimeDecimal >= parsed.start && activeTimeDecimal < parsed.end) {
            runningNow++;
          } else if (activeTimeDecimal < parsed.start) {
            upcoming++;
          } else {
            completed++;
          }
        } else {
          if (r.status === "Ongoing") runningNow++;
          else if (r.status === "Completed") completed++;
          else upcoming++;
        }
      } else {
        // If viewing next day or future day, all classes are upcoming unless explicitly completed
        if (r.status === "Completed") {
          completed++;
        } else {
          upcoming++;
        }
      }
    });

    return {
      scheduled,
      runningNow,
      upcoming,
      completed,
      activeStudios: activeStudiosSet.size,
    };
  }, [filteredRecords, activeTimeDecimal, isToday]);

  // Date Navigation Handlers (< Prev, Today, Next >)
  const currentIndex = availableDates.findIndex((d) => d.iso === selectedDateIso);

  // Active date presentation: synced with real calendar (BST Today or selected calendar date)
  const activeDateInfo = useMemo(() => {
    const isToday = selectedDateIso === todayIso;

    const matched = availableDates.find((d) => d.iso === selectedDateIso);
    let formatted = matched?.formattedDay || matched?.label;

    if (!formatted || formatted === "Today" || formatted === "Tomorrow" || formatted === "Yesterday") {
      const parts = selectedDateIso.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        formatted = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
      } else {
        formatted = selectedDateIso;
      }
    }

    if (isToday) {
      return {
        isToday: true,
        mainTitle: "Today",
        subTitle: formatted && formatted !== "Today" ? formatted : todayIso,
      };
    }

    return {
      isToday: false,
      mainTitle: formatted,
      subTitle: selectedDateIso,
    };
  }, [selectedDateIso, todayIso, availableDates]);

  const handleAddClass = (newClass: DaywiseClassRecord) => {
    setLocalRecords((prev) => [newClass, ...prev]);
  };

  // Table columns definition
  const tableColumns: ColumnDef<DaywiseClassRecord>[] = [
    {
      key: "scheduledTime",
      header: "Time",
      width: "110px",
      render: (r) => (
        <span className="font-semibold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">
          {r.scheduledTime || "-"}
        </span>
      ),
    },
    {
      key: "studio",
      header: "Studio",
      width: "140px",
      render: (r) => (
        <span className="text-xs font-bold text-slate-200 uppercase">
          {r.studio || "Unassigned"}
        </span>
      ),
    },
    {
      key: "topic",
      header: "Subject & Topic",
      render: (r) => (
        <div className="max-w-[320px]">
          <p className="font-semibold text-slate-100 text-xs truncate" title={r.topic}>
            {r.topic || "Untitled Topic"}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {r.subject} {r.course ? `• ${r.course}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "teacher1",
      header: "Teacher",
      width: "150px",
      render: (r) => (
        <span className="text-xs font-medium text-slate-300">
          {r.teacher1 || "-"}
        </span>
      ),
    },
    {
      key: "studioCoordinator",
      header: "Coordinator",
      width: "120px",
      render: (r) => (
        <span className="text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
          {r.studioCoordinator || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (r) => {
        const parsed = parseTimeToDecimalRange(r.scheduledTime);
        const isLive = isToday && (parsed
          ? activeTimeDecimal >= parsed.start && activeTimeDecimal < parsed.end
          : r.status === "Ongoing");

        return (
          <span
            className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isLive
                ? "bg-red-950/70 text-red-400 border border-red-700/80 animate-pulse"
                : r.status === "Completed"
                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            {isLive ? "LIVE NOW" : r.status || "Scheduled"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 sm:pb-16 text-slate-100">
      {/* 1. TOP HEADER BAR */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
        {/* Title & Live BST Clock */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-red-950/40 shrink-0">
              <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight">
                  10MS Class Schedule Ops
                </h1>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/40">
                  BST Control
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Live studio schedule & class operations dashboard
              </p>
            </div>
          </div>

          {/* Live BST Clock Pill */}
          <div className="bg-[#070d18] border border-slate-800/90 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-2.5 shadow-inner">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 animate-ping shadow-[0_0_8px_rgba(239,68,68,0.9)] shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-mono font-bold text-white tracking-wider block leading-none">
                {bstTime.clock12} <span className="text-blue-400 text-[10px] sm:text-[11px] font-sans">BST</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block leading-none mt-0.5 font-medium">
                UTC+06:00 (Bangladesh Time)
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <div className="bg-[#070d18] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-800 flex items-center gap-1 w-full sm:w-auto justify-stretch sm:justify-start">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Studio Timeline</span>
            </button>
            <button
              onClick={() => setViewMode("studios")}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "studios"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Studio Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DATE & SLICERS FILTER BAR */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left Slicers: Date, Type, Course, Studio */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap flex-1">
            {/* Direct Calendar Date Selector */}
            <button
              onClick={() => setIsCalendarPickerOpen(true)}
              className="flex items-center gap-2 bg-[#070d18] border border-slate-800 hover:border-slate-700/80 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs shadow-sm transition-all shrink-0 cursor-pointer group"
              title="Click to open calendar and select date"
            >
              <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-xs font-bold tracking-tight ${
                    activeDateInfo.isToday ? "text-white" : "text-blue-400"
                  }`}
                >
                  {activeDateInfo.mainTitle}
                </span>
                {activeDateInfo.subTitle && (
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium group-hover:text-slate-300">
                    • {activeDateInfo.subTitle}
                  </span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-colors ml-0.5" />
            </button>

            {/* TYPE Slicer */}
            <div
              className={`flex items-center gap-1 sm:gap-1.5 border rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs transition-all relative ${
                selectedType !== "all"
                  ? "bg-blue-950/50 border-blue-500/70 text-blue-200 ring-1 ring-blue-500/30"
                  : "bg-[#070d18] border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <Layers className={`w-3.5 h-3.5 shrink-0 ${selectedType !== "all" ? "text-blue-400" : "text-slate-500"}`} />
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">TYPE:</span>
              <div className="relative flex items-center">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-100 outline-none cursor-pointer pr-3.5 appearance-none hover:text-white max-w-[100px] sm:max-w-[130px] truncate"
                >
                  <option value="all" className="bg-[#0b1324] text-slate-300">All</option>
                  {filterOptions.types.map((t) => (
                    <option key={t} value={t} className="bg-[#0b1324] text-slate-100">{t}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
              </div>
              {selectedType !== "all" && (
                <button
                  onClick={() => setSelectedType("all")}
                  className="p-0.5 text-blue-400 hover:text-white hover:bg-blue-800/50 rounded-full transition-colors ml-0.5 cursor-pointer"
                  title="Clear Type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* COURSE Slicer */}
            <div
              className={`flex items-center gap-1 sm:gap-1.5 border rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs transition-all relative ${
                selectedCourse !== "all"
                  ? "bg-blue-950/50 border-blue-500/70 text-blue-200 ring-1 ring-blue-500/30"
                  : "bg-[#070d18] border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${selectedCourse !== "all" ? "text-blue-400" : "text-slate-500"}`} />
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">COURSE:</span>
              <div className="relative flex items-center">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-100 outline-none cursor-pointer pr-3.5 appearance-none hover:text-white max-w-[110px] sm:max-w-[140px] md:max-w-[160px] truncate"
                >
                  <option value="all" className="bg-[#0b1324] text-slate-300">All</option>
                  {filterOptions.courses.map((c) => (
                    <option key={c} value={c} className="bg-[#0b1324] text-slate-100 truncate">{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
              </div>
              {selectedCourse !== "all" && (
                <button
                  onClick={() => setSelectedCourse("all")}
                  className="p-0.5 text-blue-400 hover:text-white hover:bg-blue-800/50 rounded-full transition-colors ml-0.5 cursor-pointer"
                  title="Clear Course filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* STUDIO Slicer */}
            <div
              className={`flex items-center gap-1 sm:gap-1.5 border rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs transition-all relative ${
                selectedStudio !== "all"
                  ? "bg-blue-950/50 border-blue-500/70 text-blue-200 ring-1 ring-blue-500/30"
                  : "bg-[#070d18] border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <Tv className={`w-3.5 h-3.5 shrink-0 ${selectedStudio !== "all" ? "text-blue-400" : "text-slate-500"}`} />
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">STUDIO:</span>
              <div className="relative flex items-center">
                <select
                  value={selectedStudio}
                  onChange={(e) => setSelectedStudio(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-100 outline-none cursor-pointer pr-3.5 appearance-none hover:text-white max-w-[100px] sm:max-w-[130px] md:max-w-[150px] truncate"
                >
                  <option value="all" className="bg-[#0b1324] text-slate-300">All</option>
                  {filterOptions.studios.map((s) => (
                    <option key={s} value={s} className="bg-[#0b1324] text-slate-100">{s}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
              </div>
              {selectedStudio !== "all" && (
                <button
                  onClick={() => setSelectedStudio("all")}
                  className="p-0.5 text-blue-400 hover:text-white hover:bg-blue-800/50 rounded-full transition-colors ml-0.5 cursor-pointer"
                  title="Clear Studio filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Clear All Filters Button */}
            {(selectedType !== "all" || selectedCourse !== "all" || selectedStudio !== "all" || selectedTimeSlot !== "all" || search.trim() !== "") && (
              <button
                onClick={() => {
                  setSelectedType("all");
                  setSelectedCourse("all");
                  setSelectedStudio("all");
                  setSelectedTimeSlot("all");
                  setSearch("");
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 transition-all cursor-pointer shadow-sm"
                title="Clear all active filters"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right Section: Peak Slots Tracker & Live BST Time Indicator */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0 self-start xl:self-auto">
            {/* PEAK SLOTS TIME SLICER & TRACKER */}
            <div className="flex items-center gap-1 bg-[#070d18] border border-slate-800 rounded-lg p-1 text-xs shadow-inner">
              <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">PEAK SLOTS:</span>
              </div>

              {/* All Day */}
              <button
                onClick={() => setSelectedTimeSlot("all")}
                className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedTimeSlot === "all"
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title="View all classes across the full day"
              >
                <span>All Day</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    selectedTimeSlot === "all"
                      ? "bg-blue-950 text-blue-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {primeSlotCounts.all}
                </span>
              </button>

              {/* 4:30 PM */}
              <button
                onClick={() => setSelectedTimeSlot(selectedTimeSlot === "4:30 PM" ? "all" : "4:30 PM")}
                className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedTimeSlot === "4:30 PM"
                    ? "bg-red-600 text-white shadow-sm font-bold ring-1 ring-red-400/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
                title="Filter to classes at 4:30 PM"
              >
                <span>4:30 PM</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    selectedTimeSlot === "4:30 PM"
                      ? "bg-red-950 text-red-100"
                      : primeSlotCounts.slot430 > 0
                      ? "bg-red-950/70 text-red-400 border border-red-800/50"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {primeSlotCounts.slot430}
                </span>
              </button>

              {/* 6:30 PM */}
              <button
                onClick={() => setSelectedTimeSlot(selectedTimeSlot === "6:30 PM" ? "all" : "6:30 PM")}
                className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedTimeSlot === "6:30 PM"
                    ? "bg-red-600 text-white shadow-sm font-bold ring-1 ring-red-400/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
                title="Filter to classes at 6:30 PM"
              >
                <span>6:30 PM</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    selectedTimeSlot === "6:30 PM"
                      ? "bg-red-950 text-red-100"
                      : primeSlotCounts.slot630 > 0
                      ? "bg-red-950/70 text-red-400 border border-red-800/50"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {primeSlotCounts.slot630}
                </span>
              </button>

              {/* 8:30 PM */}
              <button
                onClick={() => setSelectedTimeSlot(selectedTimeSlot === "8:30 PM" ? "all" : "8:30 PM")}
                className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedTimeSlot === "8:30 PM"
                    ? "bg-red-600 text-white shadow-sm font-bold ring-1 ring-red-400/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
                title="Filter to classes at 8:30 PM"
              >
                <span>8:30 PM</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    selectedTimeSlot === "8:30 PM"
                      ? "bg-red-950 text-red-100"
                      : primeSlotCounts.slot830 > 0
                      ? "bg-red-950/70 text-red-400 border border-red-800/50"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {primeSlotCounts.slot830}
                </span>
              </button>
            </div>

            {/* Live BST Time Indicator */}
            <div className="flex items-center gap-2 bg-[#070d18] border border-slate-800 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] sm:text-[11px] bg-emerald-950/60 border border-emerald-800/60 px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live BST</span>
              </div>
              <span className="font-mono text-slate-200 text-[11px] sm:text-xs font-semibold">
                {bstTime.clock12}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 5 KPI CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-4">
        {/* 1. SCHEDULED */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-xl p-3.5 sm:p-4 md:p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              SCHEDULED
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-mono">
              {metrics.scheduled}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* 2. RUNNING NOW */}
        <div className="bg-[#121626] border-2 border-red-500/80 rounded-xl p-3.5 sm:p-4 md:p-5 flex items-center justify-between shadow-xl shadow-red-950/30 ring-1 sm:ring-2 ring-red-500/20">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] sm:text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                RUNNING NOW
              </span>
            </div>
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-red-500 font-mono">
              {metrics.runningNow}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-950/70 border border-red-700/60 text-red-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
        </div>

        {/* 3. UPCOMING */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-xl p-3.5 sm:p-4 md:p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              UPCOMING
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-mono">
              {metrics.upcoming}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* 4. COMPLETED */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-xl p-3.5 sm:p-4 md:p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              COMPLETED
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-mono">
              {metrics.completed}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* 5. ACTIVE STUDIOS */}
        <div className="col-span-2 sm:col-span-1 bg-[#0b1324] border border-slate-800 rounded-xl p-3.5 sm:p-4 md:p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ACTIVE STUDIOS
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-mono">
              {metrics.activeStudios}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
            <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* 4. MAIN OPERATIONAL VIEWS */}
      {viewMode === "timeline" && (
        <StudioTimelineView
          records={filteredRecords}
          currentTimeDecimal={activeTimeDecimal}
          isToday={isToday}
          onSelectClass={(rec) => setSelectedClass(rec)}
        />
      )}

      {viewMode === "studios" && (
        <StudioCardsView
          records={filteredRecords}
          currentTimeDecimal={activeTimeDecimal}
          isToday={isToday}
          onSelectClass={(rec) => setSelectedClass(rec)}
        />
      )}

      {viewMode === "table" && (
        <DataTable
          id="table-daywise-schedule-data"
          data={filteredRecords}
          columns={tableColumns}
          title={`Daywise Operations Registry (${filteredRecords.length} classes)`}
          subtitle={`Class schedule records for ${selectedDateIso}`}
          rawHeaders={rawHeaders}
          rawRecords={rawRecords}
          exportFilename={`10MS_Schedule_${selectedDateIso}.csv`}
        />
      )}

      {/* Class Details Modal */}
      {selectedClass && (
        <ClassDetailsModal
          record={selectedClass}
          onClose={() => setSelectedClass(null)}
        />
      )}

      {/* Add Class Modal */}
      {isAddModalOpen && (
        <AddClassModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddClass}
        />
      )}

      {/* Synchronized Calendar Date Picker Popover */}
      <CalendarDatePicker
        isOpen={isCalendarPickerOpen}
        onClose={() => setIsCalendarPickerOpen(false)}
        selectedDateIso={selectedDateIso}
        onSelectDate={(iso) => setSelectedDateIso(iso)}
        availableDates={availableDates}
        todayIso={todayIso}
      />
    </div>
  );
};
