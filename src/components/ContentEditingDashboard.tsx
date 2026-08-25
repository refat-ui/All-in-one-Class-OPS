import React, { useState, useMemo } from "react";
import {
  Video,
  Users,
  Eye,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  BarChart2,
  Layers,
  Plus,
  Search,
  Filter,
  X,
  ExternalLink,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  Film,
  Check,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  LayoutGrid,
  ChevronDown,
  SlidersHorizontal,
  Share2,
} from "lucide-react";
import { ContentRunSheetRecord } from "../types";
import { DataTable, ColumnDef } from "./common/DataTable";
import { AddContentModal } from "./AddContentModal";
import { PageAnalyticsSection } from "./PageAnalyticsSection";

interface ContentDashboardProps {
  records: ContentRunSheetRecord[];
  rawHeaders: string[];
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  permissionNotice?: {
    message: string;
    serviceAccount: string;
    spreadsheetId: string;
    error: string;
  };
}

type MetricType = "count" | "views" | "reactions" | "comments";
type ActiveTabType = "overview" | "stakeholders" | "table" | "pages";

// Formatter for numbers e.g. 508.5K, 1.5M, etc.
function formatMetricNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString();
}

export const ContentEditingDashboard: React.FC<ContentDashboardProps> = ({
  records: initialRecords,
  rawHeaders,
  lastUpdated,
  isLoading,
  onRefresh,
}) => {
  // Navigation & Sub-Tabs
  const [activeTab, setActiveTab] = useState<ActiveTabType>("overview");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("count");

  // Local additions
  const [localRecords, setLocalRecords] = useState<ContentRunSheetRecord[]>([]);

  // Slicers & Filters
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStakeholder, setSelectedStakeholder] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals & Inspect
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentRunSheetRecord | null>(null);

  // Combine initial records with locally added items
  const allRecords = useMemo(() => {
    return [...localRecords, ...initialRecords];
  }, [initialRecords, localRecords]);

  // Extract filter lists
  const filterOptions = useMemo(() => {
    const stakeholders = new Set<string>();
    const months = new Set<string>();
    const platforms = new Set<string>();
    const types = new Set<string>();
    const statuses = new Set<string>();

    allRecords.forEach((r) => {
      if (r.editor && r.editor.trim()) stakeholders.add(r.editor.trim());
      if (r.month && r.month.trim()) months.add(r.month.trim());
      else if (r.assignedDate) {
        const parts = r.assignedDate.split("-");
        if (parts.length >= 2) months.add(`${parts[0]}-${parts[1]}`);
      }
      if (r.platform && r.platform.trim()) platforms.add(r.platform.trim());
      if (r.contentType && r.contentType.trim()) types.add(r.contentType.trim());
      if (r.status && r.status.trim()) statuses.add(r.status.trim());
    });

    return {
      stakeholders: Array.from(stakeholders).sort(),
      months: Array.from(months).sort(),
      platforms: Array.from(platforms).sort(),
      types: Array.from(types).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [allRecords]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      if (selectedStakeholder !== "all" && r.editor !== selectedStakeholder) return false;
      
      const recordMonth = r.month || (r.assignedDate ? r.assignedDate.slice(0, 7) : "");
      if (selectedMonth !== "all" && recordMonth !== selectedMonth) return false;
      if (selectedPlatform !== "all" && r.platform !== selectedPlatform) return false;
      if (selectedType !== "all" && r.contentType !== selectedType) return false;
      if (selectedStatus !== "all" && r.status !== selectedStatus) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          (r.title && r.title.toLowerCase().includes(query)) ||
          (r.editor && r.editor.toLowerCase().includes(query)) ||
          (r.contentType && r.contentType.toLowerCase().includes(query)) ||
          (r.platform && r.platform.toLowerCase().includes(query)) ||
          (r.reviewer && r.reviewer.toLowerCase().includes(query)) ||
          (r.feedback && r.feedback.toLowerCase().includes(query));
        if (!matches) return false;
      }

      return true;
    });
  }, [
    allRecords,
    selectedStakeholder,
    selectedMonth,
    selectedPlatform,
    selectedType,
    selectedStatus,
    search,
  ]);

  // Aggregated KPIs
  const metrics = useMemo(() => {
    const totalContent = filteredRecords.length;
    const stakeholdersSet = new Set<string>();
    let totalViews = 0;
    let totalReactions = 0;
    let totalComments = 0;
    let fixesFixedCount = 0;

    filteredRecords.forEach((r) => {
      if (r.editor && r.editor.trim()) stakeholdersSet.add(r.editor.trim());
      totalViews += r.views || 0;
      totalReactions += r.reactions || 0;
      totalComments += r.comments || 0;
      if (r.fixesFixed || (r.feedback && r.feedback.toLowerCase().includes("corrected"))) {
        fixesFixedCount++;
      }
    });

    const avgViewsPerVideo = totalContent > 0 ? Math.round(totalViews / totalContent) : 0;

    return {
      totalContent,
      stakeholdersCount: stakeholdersSet.size,
      totalViews,
      avgViewsPerVideo,
      totalReactions,
      totalComments,
      fixesFixedCount,
    };
  }, [filteredRecords]);

  // Stakeholder aggregated performance stats
  const stakeholderStats = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        count: number;
        views: number;
        reactions: number;
        comments: number;
        fixes: number;
      }
    > = {};

    filteredRecords.forEach((r) => {
      const name = (r.editor || "Unassigned").trim();
      if (!map[name]) {
        map[name] = {
          name,
          count: 0,
          views: 0,
          reactions: 0,
          comments: 0,
          fixes: 0,
        };
      }
      map[name].count += 1;
      map[name].views += r.views || 0;
      map[name].reactions += r.reactions || 0;
      map[name].comments += r.comments || 0;
      if (r.fixesFixed || (r.feedback && r.feedback.toLowerCase().includes("corrected"))) {
        map[name].fixes += 1;
      }
    });

    const list = Object.values(map);
    // Sort primarily by count descending
    list.sort((a, b) => b.count - a.count);
    return list;
  }, [filteredRecords]);

  // Monthly upload stats
  const monthlyStats = useMemo(() => {
    const map: Record<string, { month: string; count: number; views: number }> = {};

    filteredRecords.forEach((r) => {
      const monthKey = r.month || (r.assignedDate ? r.assignedDate.slice(0, 7) : "2026-04");
      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, count: 0, views: 0 };
      }
      map[monthKey].count += 1;
      map[monthKey].views += r.views || 0;
    });

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredRecords]);

  // Max value for comparison horizontal bar
  const maxComparisonValue = useMemo(() => {
    if (stakeholderStats.length === 0) return 1;
    if (selectedMetric === "count") {
      return Math.max(...stakeholderStats.map((s) => s.count), 1);
    }
    if (selectedMetric === "views") {
      return Math.max(...stakeholderStats.map((s) => s.views), 1);
    }
    if (selectedMetric === "reactions") {
      return Math.max(...stakeholderStats.map((s) => s.reactions), 1);
    }
    return Math.max(...stakeholderStats.map((s) => s.comments), 1);
  }, [stakeholderStats, selectedMetric]);

  // Max value for monthly bars
  const maxMonthlyCount = useMemo(() => {
    if (monthlyStats.length === 0) return 1;
    return Math.max(...monthlyStats.map((m) => m.count), 1);
  }, [monthlyStats]);

  // Add new content item handler
  const handleAddContent = (newRecord: ContentRunSheetRecord) => {
    setLocalRecords((prev) => [newRecord, ...prev]);
  };

  const clearFilters = () => {
    setSelectedStakeholder("all");
    setSelectedMonth("all");
    setSelectedPlatform("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSearch("");
  };

  const hasActiveFilters =
    selectedStakeholder !== "all" ||
    selectedMonth !== "all" ||
    selectedPlatform !== "all" ||
    selectedType !== "all" ||
    selectedStatus !== "all" ||
    search.trim() !== "";

  // Columns for Content DataTable
  const tableColumns: ColumnDef<ContentRunSheetRecord>[] = [
    {
      key: "id",
      header: "ID",
      width: "110px",
      render: (r) => (
        <span className="font-mono text-slate-400 text-xs font-semibold">
          {r.id}
        </span>
      ),
    },
    {
      key: "title",
      header: "Content Title",
      render: (r) => (
        <div className="max-w-[340px]">
          <p className="font-bold text-white text-xs truncate" title={r.title}>
            {r.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-400 font-medium">
              {r.platform}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400 font-medium">
              {r.contentType}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "editor",
      header: "Stakeholder",
      width: "130px",
      render: (r) => (
        <span className="font-semibold text-slate-200 uppercase text-xs">
          {r.editor}
        </span>
      ),
    },
    {
      key: "views",
      header: "Views",
      width: "100px",
      render: (r) => (
        <span className="font-mono text-emerald-400 font-bold text-xs">
          {formatMetricNumber(r.views || 0)}
        </span>
      ),
    },
    {
      key: "reactions",
      header: "Reactions",
      width: "90px",
      render: (r) => (
        <span className="font-mono text-amber-400 font-bold text-xs">
          {formatMetricNumber(r.reactions || 0)}
        </span>
      ),
    },
    {
      key: "comments",
      header: "Comments",
      width: "90px",
      render: (r) => (
        <span className="font-mono text-red-400 font-bold text-xs">
          {r.comments || 0}
        </span>
      ),
    },
    {
      key: "fixesFixed",
      header: "Fixes",
      width: "90px",
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
            r.fixesFixed
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          {r.fixesFixed ? "Fixed" : "Clear"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (r) => (
        <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-full text-[11px] font-semibold">
          {r.status}
        </span>
      ),
    },
    {
      key: "driveLink",
      header: "Link",
      width: "70px",
      render: (r) => (
        <a
          href={r.driveLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Open Asset Drive Link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e11d48] flex items-center justify-center text-white shadow-lg shadow-rose-950/50 shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Content & Stakeholder Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Track content distribution, engagement metrics, and stakeholder performance
            </p>
          </div>
        </div>

        {/* Top Right Action: Add Content */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[#e11d48] hover:bg-[#be123c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </button>
      </div>

      {/* Top KPI Cards Row (6 Cards matching exact layout and color themes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: TOTAL CONTENT */}
        <div className="bg-[#0b1324] border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col justify-between border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              TOTAL CONTENT
            </span>
            <div className="p-2 rounded-xl bg-red-950/30 border border-red-900/20 text-red-500">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white block">
              {metrics.totalContent}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Uploaded clips
            </span>
          </div>
        </div>

        {/* Card 2: STAKEHOLDERS */}
        <div className="bg-[#0b1324] border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col justify-between border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              STAKEHOLDERS
            </span>
            <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-900/20 text-amber-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white block">
              {metrics.stakeholdersCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Active contributors
            </span>
          </div>
        </div>

        {/* Card 3: TOTAL VIEWS */}
        <div className="bg-[#0b1324] border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col justify-between border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              TOTAL VIEWS
            </span>
            <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-900/20 text-emerald-500">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white block">
              {formatMetricNumber(metrics.totalViews)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              ~{formatMetricNumber(metrics.avgViewsPerVideo)} / video
            </span>
          </div>
        </div>

        {/* Card 4: REACTIONS */}
        <div className="bg-[#0b1324] border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col justify-between border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              REACTIONS
            </span>
            <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-900/20 text-amber-500">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white block">
              {formatMetricNumber(metrics.totalReactions)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Total audience likes
            </span>
          </div>
        </div>

        {/* Card 5: COMMENTS */}
        <div className="bg-[#0b1324] border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col justify-between border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              COMMENTS
            </span>
            <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-900/20 text-amber-500">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white block">
              {formatMetricNumber(metrics.totalComments)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Engagements
            </span>
          </div>
        </div>

        {/* Card 6: FIXES FIXED */}
        <div className="bg-[#0b1324] border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col justify-between border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              FIXES FIXED
            </span>
            <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-900/20 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white block">
              {metrics.fixesFixedCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Feedback addressed
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar + Slicers Trigger */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          {/* Tab 1: Dashboard Overview */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#0b1324] text-amber-500 border border-slate-700 shadow-md ring-1 ring-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <BarChart2 className="w-4 h-4 text-amber-500" />
            Dashboard Overview
          </button>

          {/* Tab 2: Stakeholder Wise Breakdown */}
          <button
            onClick={() => setActiveTab("stakeholders")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "stakeholders"
                ? "bg-[#0b1324] text-white border border-slate-700 shadow-md ring-1 ring-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <Users className="w-4 h-4 text-slate-400" />
            Stakeholder Wise Breakdown
            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold">
              {metrics.stakeholdersCount}
            </span>
          </button>

          {/* Tab 3: Content Matrix & Table */}
          <button
            onClick={() => setActiveTab("table")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "table"
                ? "bg-[#0b1324] text-white border border-slate-700 shadow-md ring-1 ring-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <Layers className="w-4 h-4 text-slate-400" />
            Content Matrix & Table
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full text-[10px] font-bold">
              {metrics.totalContent}
            </span>
          </button>

          {/* Tab 4: Facebook Page Analytics */}
          <button
            onClick={() => setActiveTab("pages")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "pages"
                ? "bg-[#0b1324] text-sky-400 border border-slate-700 shadow-md ring-1 ring-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <Share2 className="w-4 h-4 text-sky-400" />
            Page Analytics
          </button>
        </div>

        {/* Slicer Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showFilters || hasActiveFilters
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : "bg-[#0b1324] text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Slicers & Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {/* Slicers & Filters Bar (Collapsible with smooth view) */}
      {showFilters && (
        <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Stakeholder Slicer */}
            <div>
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
                STAKEHOLDER FILTER
              </label>
              <select
                value={selectedStakeholder}
                onChange={(e) => setSelectedStakeholder(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Stakeholders</option>
                {filterOptions.stakeholders.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Slicer */}
            <div>
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
                MONTH FILTER
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Months</option>
                {filterOptions.months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform Slicer */}
            <div>
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
                PLATFORM FILTER
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Platforms</option>
                {filterOptions.platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Type Slicer */}
            <div>
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
                CONTENT TYPE
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Types</option>
                {filterOptions.types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div>
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
                SEARCH CLIPS
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, reviewer..."
                  className="w-full bg-[#070d18] border border-slate-800 text-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing <strong className="text-white">{filteredRecords.length}</strong> of {allRecords.length} content deliverables
              </span>
              <button
                onClick={clearFilters}
                className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Main Section: Stakeholder Performance Comparison */}
          <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5">
            {/* Header with Metric Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-500" />
                  Stakeholder Performance Comparison
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compare volume and engagement metrics across team members
                </p>
              </div>

              {/* Metric Toggle Buttons (Content Count | Total Views | Reactions | Comments) */}
              <div className="flex items-center bg-[#070d18] p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setSelectedMetric("count")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedMetric === "count"
                      ? "bg-slate-800 text-amber-400 border border-amber-500/30 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Content Count
                </button>
                <button
                  onClick={() => setSelectedMetric("views")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedMetric === "views"
                      ? "bg-slate-800 text-amber-400 border border-amber-500/30 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Total Views
                </button>
                <button
                  onClick={() => setSelectedMetric("reactions")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedMetric === "reactions"
                      ? "bg-slate-800 text-amber-400 border border-amber-500/30 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Reactions
                </button>
                <button
                  onClick={() => setSelectedMetric("comments")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedMetric === "comments"
                      ? "bg-slate-800 text-amber-400 border border-amber-500/30 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Comments
                </button>
              </div>
            </div>

            {/* Performance Progress Bars List */}
            <div className="space-y-4 pt-1">
              {stakeholderStats.map((s) => {
                let currentVal = s.count;
                let valLabel = `${s.count} videos`;
                if (selectedMetric === "views") {
                  currentVal = s.views;
                  valLabel = `${formatMetricNumber(s.views)} views`;
                } else if (selectedMetric === "reactions") {
                  currentVal = s.reactions;
                  valLabel = `${formatMetricNumber(s.reactions)} likes`;
                } else if (selectedMetric === "comments") {
                  currentVal = s.comments;
                  valLabel = `${s.comments} comments`;
                }

                const percentage = Math.min(
                  100,
                  Math.max(3, (currentVal / maxComparisonValue) * 100)
                );

                return (
                  <div key={s.name} className="space-y-1">
                    {/* Top Label & Right Value */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        <strong className="text-slate-200 font-semibold">{s.name}</strong> ({s.count} videos)
                      </span>
                      <span className="text-slate-200 font-semibold text-xs">
                        {valLabel}
                      </span>
                    </div>

                    {/* Gradient Progress Track - Slim and vibrant */}
                    <div className="w-full bg-[#070d18] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          background:
                            "linear-gradient(90deg, #ef4444 0%, #ea580c 25%, #eab308 50%, #10b981 100%)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Split Row: Stakeholder Contribution Rank & Monthly Upload Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: Stakeholder Contribution Rank */}
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Stakeholder Contribution Rank
                </h3>
              </div>

              {/* Ranked Stakeholder List */}
              <div className="space-y-3 divide-y divide-slate-800/60">
                {stakeholderStats.map((s, idx) => {
                  const sharePercentage =
                    metrics.totalContent > 0
                      ? Math.round((s.count / metrics.totalContent) * 100)
                      : 0;

                  // Rank Badge colors
                  let badgeBg = "bg-slate-800 text-slate-400 border-slate-700";
                  if (idx === 0) badgeBg = "bg-red-950/60 text-red-500 border-red-800/60";
                  else if (idx === 1) badgeBg = "bg-amber-950/60 text-amber-500 border-amber-800/60";
                  else if (idx === 2) badgeBg = "bg-emerald-950/60 text-emerald-500 border-emerald-800/60";

                  return (
                    <div
                      key={s.name}
                      onClick={() => {
                        setSelectedStakeholder(s.name);
                        setShowFilters(true);
                      }}
                      className="pt-3 first:pt-0 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#070d18] -mx-2 px-2 py-1.5 rounded-xl transition-colors"
                    >
                      {/* Left: Rank Badge + Name + Uploads share */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold border shrink-0 ${badgeBg}`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs group-hover:text-red-400 transition-colors">
                            {s.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {s.count} uploads ({sharePercentage}% of total)
                          </p>
                        </div>
                      </div>

                      {/* Right: Views (emerald) + Likes (amber) */}
                      <div className="text-right">
                        <p className="font-mono text-emerald-400 font-bold text-xs">
                          {formatMetricNumber(s.views)} views
                        </p>
                        <p className="font-mono text-amber-500 text-[11px] font-medium">
                          {formatMetricNumber(s.reactions)} likes
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Box: Monthly Upload Activity */}
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Monthly Upload Activity
                </h3>
              </div>

              {/* Monthly progress timeline */}
              <div className="space-y-4 pt-1">
                {monthlyStats.map((m) => {
                  const widthPercent = Math.min(
                    100,
                    Math.max(6, (m.count / maxMonthlyCount) * 100)
                  );

                  return (
                    <div key={m.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-medium text-slate-300">
                          {m.month}
                        </span>
                        <span className="text-slate-300 font-medium text-xs">
                          {m.count} videos{" "}
                          <span className="text-slate-400 font-normal">
                            ({formatMetricNumber(m.views)} views)
                          </span>
                        </span>
                      </div>

                      {/* Green Progress Bar - Slim */}
                      <div className="w-full bg-[#070d18] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAKEHOLDER WISE BREAKDOWN */}
      {activeTab === "stakeholders" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stakeholderStats.map((s, idx) => {
              const avgViews = Math.round(s.views / s.count);
              const fixRate = Math.round((s.fixes / s.count) * 100);

              return (
                <div
                  key={s.name}
                  className="bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center font-bold text-red-400 text-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase">
                            {s.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Core Contributor
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-800">
                        {s.count} clips
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#070d18] border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Total Views
                        </span>
                        <span className="font-mono text-emerald-400 font-bold text-sm block mt-0.5">
                          {formatMetricNumber(s.views)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#070d18] border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Total Likes
                        </span>
                        <span className="font-mono text-amber-400 font-bold text-sm block mt-0.5">
                          {formatMetricNumber(s.reactions)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#070d18] border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Avg / Video
                        </span>
                        <span className="font-mono text-slate-200 font-bold text-xs block mt-0.5">
                          ~{formatMetricNumber(avgViews)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#070d18] border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Fix Rate
                        </span>
                        <span className="font-mono text-emerald-400 font-bold text-xs block mt-0.5">
                          {fixRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStakeholder(s.name);
                      setActiveTab("table");
                    }}
                    className="w-full py-2 bg-[#070d18] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    View {s.name}&apos;s Deliverables
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CONTENT MATRIX & TABLE */}
      {activeTab === "table" && (
        <DataTable
          id="table-short-content-analytics"
          data={filteredRecords}
          columns={tableColumns}
          title="Content Run Sheet & Stakeholder Matrix"
          subtitle="Searchable repository of all short content videos, engagement analytics, and review feedback"
          rawHeaders={rawHeaders}
          rawRecords={filteredRecords as any}
          onRowClick={(rec) => setSelectedItem(rec)}
          exportFilename="10MS_Content_Stakeholder_Analytics_2026.csv"
          dark={true}
        />
      )}

      {/* TAB 4: FACEBOOK PAGE ANALYTICS */}
      {activeTab === "pages" && <PageAnalyticsSection />}

      {/* Add Content Modal */}
      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddContent={handleAddContent}
      />

      {/* Video Details Quick Inspector Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#070d18]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">
                  {selectedItem.id}
                </span>
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  {selectedItem.platform}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedItem.title}
                </h3>
                <p className="text-slate-400 mt-0.5">
                  Editor: <strong className="text-white uppercase">{selectedItem.editor}</strong> • Reviewer: <span className="text-slate-300">{selectedItem.reviewer || "Saad"}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Views</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">{formatMetricNumber(selectedItem.views || 0)}</span>
                </div>
                <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Likes</span>
                  <span className="font-mono text-amber-400 font-bold text-sm">{formatMetricNumber(selectedItem.reactions || 0)}</span>
                </div>
                <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Comments</span>
                  <span className="font-mono text-red-400 font-bold text-sm">{selectedItem.comments || 0}</span>
                </div>
              </div>

              <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Quality & Feedback Notes</span>
                <p className="text-slate-300 font-medium">{selectedItem.feedback || "No feedback logged."}</p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href={selectedItem.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#e11d48] hover:bg-[#be123c] text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Drive
                </a>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
