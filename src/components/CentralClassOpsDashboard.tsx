import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Video,
  Film,
  Users,
  Search,
  FileText,
  Plus,
  Radio,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
  X,
  List,
  BarChart3,
  Layers,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { CentralClassRecord, DaywiseClassRecord } from "../types";
import { DataTable, ColumnDef } from "./common/DataTable";
import { ClassDetailsModal } from "./ClassDetailsModal";
import { AddClassModal } from "./AddClassModal";
import { PDFReportModal } from "./PDFReportModal";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

interface CentralDashboardProps {
  records: CentralClassRecord[];
  rawHeaders: string[];
  rawRecords: Record<string, any>[];
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_COLORS: Record<string, string> = {
  Completed: "#10b981",
  Delayed: "#f59e0b",
  Cancelled: "#ef4444",
  Error: "#dc2626",
  Scheduled: "#64748b",
};

export const CentralClassOpsDashboard: React.FC<CentralDashboardProps> = ({
  records: initialRecords,
  rawHeaders,
  rawRecords,
  lastUpdated,
  isLoading,
  onRefresh,
}) => {
  // Local addition list
  const [localRecords, setLocalRecords] = useState<CentralClassRecord[]>([]);

  // Search & Slicers
  const [search, setSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStakeholder, setSelectedStakeholder] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals & Inspection
  const [selectedClass, setSelectedClass] = useState<CentralClassRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [showChartsView, setShowChartsView] = useState(false);

  // Combine initial records with newly added
  const records = useMemo(() => {
    return [...localRecords, ...initialRecords];
  }, [initialRecords, localRecords]);

  // Extract unique slicer filter options
  const filterOptions = useMemo(() => {
    const teachers = new Set<string>();
    const products = new Set<string>();
    const courses = new Set<string>();
    const stakeholders = new Set<string>();
    const months = new Set<string>();

    records.forEach((r) => {
      if (r.teacher1 && r.teacher1.trim()) teachers.add(r.teacher1.trim());
      if (r.productType && r.productType.trim()) products.add(r.productType.trim());
      if (r.course && r.course.trim()) courses.add(r.course.trim());
      if (r.opsStakeholder && r.opsStakeholder.trim()) stakeholders.add(r.opsStakeholder.trim());
      else if (r.studioCoordinator && r.studioCoordinator.trim()) stakeholders.add(r.studioCoordinator.trim());
      if (r.month && r.month !== "Unknown") months.add(r.month.trim());
    });

    const sortedMonths = Array.from(months).sort(
      (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
    );

    return {
      teachers: Array.from(teachers).sort(),
      products: Array.from(products).sort(),
      courses: Array.from(courses).sort(),
      stakeholders: Array.from(stakeholders).sort(),
      months: sortedMonths.length > 0 ? sortedMonths : MONTH_ORDER,
    };
  }, [records]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedTeacher !== "all" && r.teacher1 !== selectedTeacher) return false;
      if (selectedProduct !== "all" && r.productType !== selectedProduct) return false;
      if (selectedCourse !== "all" && r.course !== selectedCourse) return false;
      if (selectedStakeholder !== "all") {
        const matchesStakeholder =
          r.opsStakeholder === selectedStakeholder ||
          r.studioCoordinator === selectedStakeholder;
        if (!matchesStakeholder) return false;
      }
      if (selectedMonth !== "all" && r.month !== selectedMonth) return false;
      if (selectedStatus !== "all" && r.status !== selectedStatus) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          (r.course && r.course.toLowerCase().includes(query)) ||
          (r.teacher1 && r.teacher1.toLowerCase().includes(query)) ||
          (r.topic && r.topic.toLowerCase().includes(query)) ||
          (r.subject && r.subject.toLowerCase().includes(query)) ||
          (r.studio && r.studio.toLowerCase().includes(query)) ||
          (r.date && r.date.toLowerCase().includes(query));
        if (!matches) return false;
      }
      return true;
    });
  }, [
    records,
    selectedTeacher,
    selectedProduct,
    selectedCourse,
    selectedStakeholder,
    selectedMonth,
    selectedStatus,
    search,
  ]);

  // Overall KPIs calculation (matching image metrics format)
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    let recordShootCount = 0;
    let liveCount = 0;
    const activeTeachersSet = new Set<string>();

    filteredRecords.forEach((r) => {
      if (r.teacher1 && r.teacher1.trim()) {
        activeTeachersSet.add(r.teacher1.trim().toLowerCase());
      }
      const courseLower = (r.course || "").toLowerCase();
      const topicLower = (r.topic || "").toLowerCase();
      const productLower = (r.productType || "").toLowerCase();
      const studioLower = (r.studio || "").toLowerCase();

      const isShoot =
        courseLower.includes("shoot") ||
        topicLower.includes("shoot") ||
        productLower.includes("shoot") ||
        studioLower.includes("shoot") ||
        courseLower.includes("record") ||
        topicLower.includes("record") ||
        productLower.includes("record") ||
        productLower.includes("content");

      if (isShoot) {
        recordShootCount++;
      } else {
        liveCount++;
      }
    });

    return {
      total,
      liveCount,
      recordShootCount,
      activeTeachersCount: activeTeachersSet.size,
    };
  }, [filteredRecords]);

  // Course Wise Class Count (sorted descending)
  const courseWiseDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const c = (r.course || "OTHER").trim();
      map[c] = (map[c] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Teacher Wise Class Count (sorted descending)
  const teacherWiseDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const t = (r.teacher1 || "UNASSIGNED").trim();
      map[t] = (map[t] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Monthly Operations Trend Data (Connected with Slicers)
  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { month: string; fullName: string; live: number; shoot: number; total: number }>();

    MONTH_ORDER.forEach((m) => {
      monthMap.set(m, { month: m.slice(0, 3), fullName: m, live: 0, shoot: 0, total: 0 });
    });

    filteredRecords.forEach((r) => {
      const m = r.month || "August";
      if (!monthMap.has(m)) {
        monthMap.set(m, { month: m.slice(0, 3), fullName: m, live: 0, shoot: 0, total: 0 });
      }
      const item = monthMap.get(m)!;
      const courseLower = (r.course || "").toLowerCase();
      const topicLower = (r.topic || "").toLowerCase();
      const productLower = (r.productType || "").toLowerCase();
      const studioLower = (r.studio || "").toLowerCase();
      const isShoot =
        courseLower.includes("shoot") ||
        topicLower.includes("shoot") ||
        productLower.includes("shoot") ||
        studioLower.includes("shoot") ||
        courseLower.includes("record") ||
        topicLower.includes("record") ||
        productLower.includes("record") ||
        productLower.includes("content");

      if (isShoot) {
        item.shoot++;
      } else {
        item.live++;
      }
      item.total++;
    });

    const list = Array.from(monthMap.values());
    const active = list.filter((d) => d.total > 0);
    return active.length > 0 ? active : list.slice(0, 6);
  }, [filteredRecords]);

  // Top Courses Bar Chart Data (Connected with Slicers)
  const topCoursesChartData = useMemo(() => {
    return courseWiseDistribution.slice(0, 7).map((c) => ({
      name: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name,
      fullName: c.name,
      count: c.count,
    }));
  }, [courseWiseDistribution]);

  // Product Distribution Donut Chart Data (Connected with Slicers)
  const productDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const p = (r.productType || "Standard").trim();
      map[p] = (map[p] || 0) + 1;
    });

    const palette = ["#ef4444", "#eab308", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];
    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: palette[idx % palette.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // Add Class handler
  const handleAddClass = (newClass: DaywiseClassRecord) => {
    const centralRec: CentralClassRecord = {
      ...newClass,
      parsedDate: newClass.date,
      month: "August",
      viewCount10m: Number(newClass.viewCount10m) || 0,
      viewCountMid: Number(newClass.viewCountMid) || 0,
      viewCountEnd: Number(newClass.viewCountEnd) || 0,
      status: "Scheduled",
    };
    setLocalRecords((prev) => [centralRec, ...prev]);
  };

  const clearFilters = () => {
    setSelectedTeacher("all");
    setSelectedProduct("all");
    setSelectedCourse("all");
    setSelectedStakeholder("all");
    setSelectedMonth("all");
    setSelectedStatus("all");
    setSearch("");
  };

  const hasActiveFilters =
    selectedTeacher !== "all" ||
    selectedProduct !== "all" ||
    selectedCourse !== "all" ||
    selectedStakeholder !== "all" ||
    selectedMonth !== "all" ||
    selectedStatus !== "all" ||
    search.trim() !== "";

  // Columns definition for DataTable
  const columns: ColumnDef<CentralClassRecord>[] = [
    {
      key: "date",
      header: "Date",
      width: "120px",
      render: (r) => (
        <span className="font-semibold text-slate-200 text-xs font-mono">
          {r.date || "-"}
        </span>
      ),
    },
    {
      key: "scheduledTime",
      header: "Time",
      width: "90px",
      render: (r) => (
        <span className="font-mono text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-xs">
          {r.scheduledTime || "-"}
        </span>
      ),
    },
    {
      key: "course",
      header: "Course & Topic",
      render: (r) => (
        <div className="max-w-[320px]">
          <p className="font-bold text-white text-xs truncate" title={r.course}>
            {r.course}
          </p>
          <p className="text-slate-400 text-xs truncate" title={r.topic}>
            {r.topic || r.subject || "Untitled Session"}
          </p>
        </div>
      ),
    },
    {
      key: "teacher1",
      header: "Teacher",
      render: (r) => (
        <span className="font-medium text-slate-200 uppercase text-xs">
          {r.teacher1 || "-"}
        </span>
      ),
    },
    {
      key: "productType",
      header: "Product",
      render: (r) => (
        <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
          {r.productType || "-"}
        </span>
      ),
    },
    {
      key: "studio",
      header: "Studio",
      render: (r) => <span className="font-medium text-slate-300 text-xs">{r.studio || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        let badge = "bg-slate-800 text-slate-300 border-slate-700";
        if (r.status === "Completed") badge = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        else if (r.status === "Delayed") badge = "bg-amber-500/20 text-amber-400 border-amber-500/30";
        else if (r.status === "Cancelled") badge = "bg-rose-500/20 text-rose-400 border-rose-500/30";
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>
            {r.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Class Operational Dashboard 2026
          </h1>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Generate PDF Report Button */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 bg-[#0b1324] hover:bg-[#111c35] text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Generate PDF Report
          </button>
        </div>
      </div>

      {/* Slicers / Filters Bar (5 Filter Columns matching screenshot) */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* TEACHER FILTER */}
          <div>
            <label className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1.5">
              TEACHER FILTER
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500/60 cursor-pointer"
            >
              <option value="all">All Teachers</option>
              {filterOptions.teachers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* PRODUCT FILTER */}
          <div>
            <label className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1.5">
              PRODUCT FILTER
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500/60 cursor-pointer"
            >
              <option value="all">All Products</option>
              {filterOptions.products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* COURSE FILTER */}
          <div>
            <label className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1.5">
              COURSE FILTER
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500/60 cursor-pointer"
            >
              <option value="all">All Courses</option>
              {filterOptions.courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* STAKEHOLDER FILTER */}
          <div>
            <label className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1.5">
              STAKEHOLDER FILTER
            </label>
            <select
              value={selectedStakeholder}
              onChange={(e) => setSelectedStakeholder(e.target.value)}
              className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500/60 cursor-pointer"
            >
              <option value="all">All Stakeholders</option>
              {filterOptions.stakeholders.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* MONTH FILTER */}
          <div>
            <label className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1.5">
              MONTH FILTER
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500/60 cursor-pointer"
            >
              <option value="all">All Months</option>
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Filtered: <strong className="text-white">{filteredRecords.length}</strong> of {records.length} records
            </span>
            <button
              onClick={clearFilters}
              className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Top 4 KPI Cards Row (Matching exact layout and icons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Classes */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Total Classes
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {metrics.total.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/30 text-red-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: LIVE Class Count */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              LIVE Class Count
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {metrics.liveCount.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 shrink-0">
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Record Shoot Count */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Record Shoot Count
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {metrics.recordShootCount.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-900/30 text-purple-400 shrink-0">
            <Film className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Active Teachers */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Active Teachers
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {metrics.activeTeachersCount.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/30 text-red-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Section: Course Wise Class Count (5 columns wide, scrollable) */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            Course Wise Class Count
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {courseWiseDistribution.length} Active Courses
          </span>
        </div>

        {/* Scrollable Course Cards Grid */}
        <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {courseWiseDistribution.map((c) => {
              const isSelected = selectedCourse === c.name;
              return (
                <div
                  key={c.name}
                  onClick={() =>
                    setSelectedCourse(isSelected ? "all" : c.name)
                  }
                  className={`bg-[#070d18] border rounded-xl p-3.5 flex flex-col justify-between min-h-[82px] cursor-pointer transition-all ${
                    isSelected
                      ? "border-red-500 bg-red-950/20 shadow-md ring-1 ring-red-500"
                      : "border-slate-800 hover:border-red-500/50 hover:bg-[#0c1527]"
                  }`}
                >
                  <span
                    className="text-[11px] font-bold text-slate-300 uppercase tracking-tight line-clamp-2"
                    title={c.name}
                  >
                    {c.name}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-red-500 font-mono">
                      {c.count}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      Classes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Teacher Wise Class Count (Full Width Extended) */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Teacher Wise Class Count
          </h2>
          <div className="flex items-center gap-3">
            {selectedTeacher !== "all" && (
              <button
                onClick={() => setSelectedTeacher("all")}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                Clear Teacher Filter
              </button>
            )}
            <span className="text-xs font-semibold text-slate-400">
              {teacherWiseDistribution.length} Teachers Listed
            </span>
          </div>
        </div>

        {/* Scrollable Teacher Cards Grid (Extended across full container width) */}
        <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {teacherWiseDistribution.map((t) => {
              const isSelected = selectedTeacher === t.name;
              return (
                <div
                  key={t.name}
                  onClick={() =>
                    setSelectedTeacher(isSelected ? "all" : t.name)
                  }
                  className={`bg-[#070d18] border rounded-xl p-3.5 text-center flex flex-col items-center justify-center min-h-[82px] cursor-pointer transition-all ${
                    isSelected
                      ? "border-red-500 bg-red-950/20 shadow-md ring-1 ring-red-500"
                      : "border-slate-800 hover:border-red-500/50 hover:bg-[#0c1527]"
                  }`}
                >
                  <span className="text-lg font-black text-red-500 font-mono">
                    {t.count}
                  </span>
                  <span
                    className="text-[11px] font-bold text-slate-300 mt-1 uppercase tracking-tight truncate max-w-full px-1"
                    title={t.name}
                  >
                    {t.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slicer-Connected Operations Visual Graph Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Monthly Operations Trend (LIVE vs Record Shoot) */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-400" />
                Monthly Trend (Live vs Record Shoot)
              </h3>
              <p className="text-[11px] text-slate-400">
                Connected to active slicers • Click a month to filter
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                <span>LIVE ({metrics.liveCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Record Shoot ({metrics.recordShootCount})</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const monthObj = e.activePayload[0].payload;
                    if (monthObj && monthObj.fullName) {
                      setSelectedMonth(selectedMonth === monthObj.fullName ? "all" : monthObj.fullName);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#070d18] border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5">
                          <p className="font-bold text-white border-b border-slate-800 pb-1">
                            {data.fullName || label}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-red-400 font-semibold">
                            <span>LIVE Classes:</span>
                            <span className="font-mono">{data.live}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-amber-400 font-semibold">
                            <span>Record Shoot:</span>
                            <span className="font-mono">{data.shoot}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-white font-bold border-t border-slate-800 pt-1">
                            <span>Total Volume:</span>
                            <span className="font-mono">{data.total}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="live"
                  name="LIVE Class"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
                <Bar
                  dataKey="shoot"
                  name="Record Shoot"
                  fill="#eab308"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Courses Volume & Product Breakdown */}
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Top Courses Distribution
              </h3>
              <p className="text-[11px] text-slate-400">
                Volume of classes by course • Click bar to filter
              </p>
            </div>
            {selectedCourse !== "all" && (
              <button
                onClick={() => setSelectedCourse("all")}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                Reset Course ({selectedCourse})
              </button>
            )}
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {topCoursesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCoursesChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const courseObj = e.activePayload[0].payload;
                      if (courseObj && courseObj.fullName) {
                        setSelectedCourse(selectedCourse === courseObj.fullName ? "all" : courseObj.fullName);
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: "#cbd5e1", fontSize: 10 }}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#070d18] border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                            <p className="font-bold text-white">{data.fullName}</p>
                            <p className="text-red-400 font-semibold font-mono">
                              {data.count} Classes
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                    cursor="pointer"
                  >
                    {topCoursesChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={selectedCourse === entry.fullName ? "#ef4444" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No course data matching filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Collapsible View Toggles: Full Registry Database Table */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setShowTableView((prev) => !prev)}
          className="px-3.5 py-2 rounded-xl bg-[#0b1324] hover:bg-[#111c35] border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <List className="w-4 h-4 text-slate-400" />
          {showTableView ? "Hide 2026 Registry Table" : "Show Full 2026 Registry Table"}
        </button>

        <button
          onClick={() => setShowChartsView((prev) => !prev)}
          className="px-3.5 py-2 rounded-xl bg-[#0b1324] hover:bg-[#111c35] border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-slate-400" />
          {showChartsView ? "Hide Yearly Analytics Charts" : "Show Yearly Analytics Charts"}
        </button>
      </div>

      {/* Full Registry Database Table (when expanded) */}
      {showTableView && (
        <DataTable
          id="table-central-ops-2026"
          data={filteredRecords}
          columns={columns}
          title="2026 Central Operations Database"
          subtitle="Searchable archive of all class operations in 2026 with filter by month, instructor, and course"
          rawHeaders={rawHeaders}
          rawRecords={rawRecords}
          onRowClick={(rec) => setSelectedClass(rec)}
          exportFilename="10MS_Central_Class_OPS_2026_Export.csv"
          dark={true}
        />
      )}

      {/* Class Inspector Modal */}
      <ClassDetailsModal
        record={selectedClass}
        onClose={() => setSelectedClass(null)}
      />

      {/* Add Class Modal */}
      <AddClassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClass={handleAddClass}
      />

      {/* PDF Report Generation Modal */}
      <PDFReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        metrics={metrics}
        filterState={{
          teacher: selectedTeacher === "all" ? "All Teachers" : selectedTeacher,
          product: selectedProduct === "all" ? "All Products" : selectedProduct,
          course: selectedCourse === "all" ? "All Courses" : selectedCourse,
          stakeholder: selectedStakeholder === "all" ? "All Stakeholders" : selectedStakeholder,
          month: selectedMonth === "all" ? "All Months" : selectedMonth,
        }}
        courseDistribution={courseWiseDistribution}
        teacherDistribution={teacherWiseDistribution}
        recentActivities={filteredRecords.slice(0, 30)}
      />
    </div>
  );
};
