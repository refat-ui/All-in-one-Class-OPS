import React from "react";
import { DaywiseClassRecord, CentralClassRecord } from "../types";
import {
  X,
  Radio,
  Clock,
  User,
  Building,
  Video,
  FileText,
  ExternalLink,
  MessageSquare,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
} from "lucide-react";

interface ClassDetailsModalProps {
  record: DaywiseClassRecord | CentralClassRecord | any | null;
  onClose: () => void;
}

export const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-[#070d18]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {record.productType || "Live Class"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {record.studio || "Studio 1 - HQ1"}
              </span>
              <span className="font-mono text-xs text-slate-400">
                {record.date} • {record.scheduledTime}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white leading-snug">
              {record.course}: {record.topic}
            </h3>
            {record.subject && (
              <p className="text-xs text-slate-400">Subject: {record.subject}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] text-xs sm:text-sm">
          {/* Key Instructors & Coordinator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Primary Instructor
              </span>
              <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-400" />
                {record.teacher1 || "—"}
              </p>
            </div>

            <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Studio Coordinator
              </span>
              <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-400" />
                {record.studioCoordinator || "Lead Coordinator"}
              </p>
            </div>

            <div className="p-3 bg-[#070d18] rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Slide QAC Status
              </span>
              <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {record.lectureSlideStatus || "Passed"}
              </p>
            </div>
          </div>

          {/* Quick Links Action Bar */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Broadcast & Meeting Links
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {record.zoomLink ? (
                <a
                  href={record.zoomLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-700/60 rounded-xl text-blue-300 font-semibold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    <span>Join Zoom Broadcast</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl text-slate-500 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span>No Zoom link provided</span>
                </div>
              )}

              {record.classLink ? (
                <a
                  href={record.classLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-red-950/40 hover:bg-red-900/50 border border-red-700/60 rounded-xl text-red-300 font-semibold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-red-400" />
                    <span>Watch Facebook Stream</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl text-slate-500 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  <span>No Stream link provided</span>
                </div>
              )}

              {record.annotatedSlideLink && (
                <a
                  href={record.annotatedSlideLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-medium flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Annotated Slides</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {record.zoomObsRecording && (
                <a
                  href={record.zoomObsRecording}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-medium flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>OBS Recording Archive</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Audience & Engagement Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Peak Attendance
                </span>
                <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5 block">
                  {record.highestAttendance ? record.highestAttendance.toLocaleString() : "—"}
                </span>
              </div>

              <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Average Attendance
                </span>
                <span className="text-lg font-mono font-bold text-blue-400 mt-0.5 block">
                  {record.averageAttendance ? record.averageAttendance.toLocaleString() : "—"}
                </span>
              </div>

              <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  10m View Count
                </span>
                <span className="text-lg font-mono font-bold text-purple-400 mt-0.5 block">
                  {record.viewCount10m || "—"}
                </span>
              </div>

              <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Total Comments
                </span>
                <span className="text-lg font-mono font-bold text-amber-400 mt-0.5 block">
                  {record.totalComments ? record.totalComments.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Broadcast Caption & Details */}
          {record.streamCaption && (
            <div className="p-3.5 bg-[#070d18] rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Live Broadcast Caption
              </span>
              <p className="text-xs text-slate-300 whitespace-pre-line">
                {record.streamCaption}
              </p>
            </div>
          )}

          {/* QAC Feedback */}
          {record.qacFeedback && (
            <div className="p-3.5 bg-[#070d18] rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                QAC & Coordinator Notes
              </span>
              <p className="text-xs text-slate-300">
                {record.qacFeedback}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#070d18] flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Sheet Row #{record._rowIndex || 1}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
