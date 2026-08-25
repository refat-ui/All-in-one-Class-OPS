import React from "react";
import {
  CalendarDays,
  LayoutGrid,
  Video,
  RefreshCw,
  Clock,
  Database,
  Radio,
  GraduationCap,
} from "lucide-react";
import { SheetsMetaResponse } from "../services/api";

export type ActiveTab = "daywise" | "central" | "coordinator" | "content" | "teacher";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  onOpenConnectionModal: () => void;
  meta: SheetsMetaResponse | null;
}

const TABS: { id: ActiveTab; label: string; shortLabel: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
  {
    id: "daywise",
    label: "Class OPS Realtime",
    shortLabel: "Class OPS",
    icon: Radio,
    badge: "LIVE",
  },
  {
    id: "central",
    label: "Operations 2026",
    shortLabel: "Ops 2026",
    icon: CalendarDays,
    badge: "Archive",
  },
  {
    id: "coordinator",
    label: "Studio Co-Ordinator Overview",
    shortLabel: "Co-Ordinator",
    icon: LayoutGrid,
    badge: "Allocations",
  },
  {
    id: "content",
    label: "Content Editing",
    shortLabel: "Content",
    icon: Video,
    badge: "Run Sheet",
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lastUpdated: _lastUpdated,
  isLoading,
  onRefresh,
  autoRefreshInterval,
  setAutoRefreshInterval,
  onOpenConnectionModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#070d18]/95 backdrop-blur-md border-b border-slate-800 shadow-md text-slate-200">
      <div className="max-w-[1520px] mx-auto px-3 sm:px-5 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-md shadow-red-950/50">
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base md:text-lg tracking-tight text-white block leading-tight">
                ClassOps
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wide uppercase hidden sm:block">
                10MS Command
              </span>
            </div>
          </div>

          {/* Clean Navigation Tabs for Desktop & Tablet Large */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 h-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-full flex items-center gap-2 px-3 xl:px-4 text-xs xl:text-sm font-medium transition-colors relative cursor-pointer ${
                    isActive
                      ? "text-red-500 font-bold"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-red-500" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                  {tab.id === "daywise" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                  )}
                </button>
              );
            })}

            {/* Teacher Dashboard Overview — embedded in-app via iframe (no longer opens a new tab) */}
            <button
              id="tab-teacher"
              onClick={() => setActiveTab("teacher")}
              className={`h-full flex items-center gap-2 px-3 xl:px-4 text-xs xl:text-sm font-medium transition-colors relative cursor-pointer ${
                activeTab === "teacher"
                  ? "text-red-500 font-bold"
                  : "text-slate-400 hover:text-slate-100"
              }`}
              title="Open Teacher Dashboard Overview inside this site"
            >
              <GraduationCap className={`w-4 h-4 ${activeTab === "teacher" ? "text-red-500" : "text-slate-500"}`} />
              <span>Teacher Dashboard Overview</span>
              {activeTab === "teacher" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
              )}
            </button>
          </nav>

          {/* Header Controls & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
            {/* Merged Refresh & Auto-Refresh Control */}
            <div
              id="merged-refresh-control"
              className="flex items-center bg-[#0b1324] border border-slate-700/70 hover:border-slate-600 rounded-lg overflow-hidden shadow-sm transition-all text-xs"
            >
              {/* Manual Refresh Button */}
              <button
                id="btn-refresh-data"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                title="Force refresh data from Google Sheets"
              >
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isLoading ? "animate-spin text-red-400" : "text-slate-300"}`} />
                <span className="hidden sm:inline text-xs">Sync</span>
              </button>

              {/* Inline Divider */}
              <div className="h-4 w-[1px] bg-slate-700/80" />

              {/* Auto Refresh Dropdown */}
              <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-[#0b1324]">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <select
                  id="select-auto-refresh"
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  className="bg-transparent text-slate-300 text-[11px] focus:outline-none cursor-pointer font-medium hover:text-white transition-colors"
                  title="Auto-refresh frequency"
                >
                  <option value={0} className="bg-[#0b1324] text-slate-200">Off</option>
                  <option value={15} className="bg-[#0b1324] text-slate-200">15s</option>
                  <option value={30} className="bg-[#0b1324] text-slate-200">30s</option>
                  <option value={60} className="bg-[#0b1324] text-slate-200">60s</option>
                  <option value={300} className="bg-[#0b1324] text-slate-200">5m</option>
                </select>
              </div>
            </div>

            {/* Sheets Connection modal trigger */}
            <button
              id="btn-connection-status"
              onClick={onOpenConnectionModal}
              className="p-1.5 sm:px-3 sm:py-2 text-slate-300 bg-[#0b1324] hover:bg-[#101b33] border border-slate-800 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Google Sheets Connection Details"
            >
              <Database className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="hidden xl:inline">Connection</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Row */}
        <div className="flex lg:hidden border-t border-slate-800/80 overflow-x-auto no-scrollbar py-2 gap-1.5 -mx-1 px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-red-600 text-white font-bold shadow-md shadow-red-950/40"
                    : "bg-[#0b1324] text-slate-400 hover:text-slate-200 border border-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.shortLabel}</span>
                {tab.id === "daywise" && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-emerald-400 animate-pulse"}`} />
                )}
              </button>
            );
          })}

          {/* Teacher Dashboard Overview — embedded in-app via iframe */}
          <button
            onClick={() => setActiveTab("teacher")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "teacher"
                ? "bg-red-600 text-white font-bold shadow-md shadow-red-950/40"
                : "bg-[#0b1324] text-slate-400 hover:text-slate-200 border border-slate-800/60"
            }`}
          >
            <GraduationCap className={`w-3.5 h-3.5 ${activeTab === "teacher" ? "text-white" : "text-slate-400"}`} />
            <span>Teacher Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
