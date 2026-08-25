import React from "react";
import { X, Printer, Download, FileText, CheckCircle2, Video, Film, Users, Calendar } from "lucide-react";
import { CentralClassRecord } from "../types";

interface PDFReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: {
    total: number;
    liveCount: number;
    recordShootCount: number;
    activeTeachersCount: number;
  };
  filterState: {
    teacher: string;
    product: string;
    course: string;
    stakeholder: string;
    month: string;
  };
  courseDistribution: { name: string; count: number }[];
  teacherDistribution: { name: string; count: number }[];
  recentActivities: CentralClassRecord[];
}

export const PDFReportModal: React.FC<PDFReportModalProps> = ({
  isOpen,
  onClose,
  metrics,
  filterState,
  courseDistribution,
  teacherDistribution,
  recentActivities,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#070d18] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Operational PDF Report Preview
              </h3>
              <p className="text-xs text-slate-400">
                10MS Class Operational Performance 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-80px)] bg-slate-950 text-slate-100 print:p-0 print:bg-white print:text-black">
          {/* Document Header */}
          <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                <span className="text-xs uppercase tracking-widest font-bold text-red-400">
                  10 Minute School Operations
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">
                Class Operational Dashboard 2026
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Central Class OPS Summary • Generated on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
              </p>
            </div>

            {/* Active Slicers */}
            <div className="bg-[#0b1324] p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">
                Applied Filters
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                <div><span className="text-slate-500">Teacher:</span> <strong className="text-white">{filterState.teacher}</strong></div>
                <div><span className="text-slate-500">Product:</span> <strong className="text-white">{filterState.product}</strong></div>
                <div><span className="text-slate-500">Course:</span> <strong className="text-white">{filterState.course}</strong></div>
                <div><span className="text-slate-500">Month:</span> <strong className="text-white">{filterState.month}</strong></div>
              </div>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-[#0b1324] rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Classes</span>
              <p className="text-2xl font-black text-white mt-1">{metrics.total.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[#0b1324] rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">LIVE Class Count</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.liveCount.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[#0b1324] rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Record Shoot Count</span>
              <p className="text-2xl font-black text-purple-400 mt-1">{metrics.recordShootCount.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[#0b1324] rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Teachers</span>
              <p className="text-2xl font-black text-red-400 mt-1">{metrics.activeTeachersCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Top Courses Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Course Wise Class Volume
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {courseDistribution.slice(0, 16).map((c) => (
                <div key={c.name} className="p-2.5 bg-[#0b1324] border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold truncate max-w-[130px]">{c.name}</span>
                  <span className="font-mono text-red-400 font-bold">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Instructors */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Teacher Wise Class Count
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {teacherDistribution.slice(0, 12).map((t) => (
                <div key={t.name} className="p-2.5 bg-[#0b1324] border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold truncate max-w-[130px] uppercase">{t.name}</span>
                  <span className="font-mono text-red-400 font-bold">{t.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Operations Activity */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Sample Recent Operations Log
            </h3>
            <div className="divide-y divide-slate-800/80 bg-[#0b1324] rounded-xl border border-slate-800 text-xs">
              {recentActivities.slice(0, 8).map((r, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                    <span className="text-slate-200 font-medium truncate">
                      {r.course} - {r.topic}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">
                    {r.date || "2026"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
