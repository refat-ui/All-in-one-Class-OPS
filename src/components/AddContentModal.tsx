import React, { useState } from "react";
import { X, Plus, Video, Film, User, Tag, Calendar, Globe, Sparkles, MessageSquare, ThumbsUp, Eye } from "lucide-react";
import { ContentRunSheetRecord } from "../types";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContent: (newContent: ContentRunSheetRecord) => void;
}

export const AddContentModal: React.FC<AddContentModalProps> = ({
  isOpen,
  onClose,
  onAddContent,
}) => {
  const [title, setTitle] = useState("");
  const [editor, setEditor] = useState("Asif");
  const [contentType, setContentType] = useState("Reels / Short");
  const [platform, setPlatform] = useState("Facebook Reels");
  const [priority, setPriority] = useState<"P0 - Urgent" | "P1 - High" | "P2 - Medium" | "P3 - Low">("P1 - High");
  const [status, setStatus] = useState<ContentRunSheetRecord["status"]>("Published");
  const [category, setCategory] = useState("Academics (6-12)");
  const [month, setMonth] = useState("2026-07");
  const [views, setViews] = useState("24500");
  const [reactions, setReactions] = useState("650");
  const [comments, setComments] = useState("45");
  const [fixesFixed, setFixesFixed] = useState(true);
  const [reviewer, setReviewer] = useState("Saad");
  const [driveLink, setDriveLink] = useState("");
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dateStr = `${month}-15`;
    const newRecord: ContentRunSheetRecord = {
      _rowIndex: Date.now(),
      id: `CNT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      editor,
      contentType,
      platform,
      priority,
      status,
      category,
      assignedDate: dateStr,
      dueDate: dateStr,
      completedDate: dateStr,
      durationSec: 45,
      reviewer,
      driveLink: driveLink.trim() || `https://drive.google.com/drive/folders/short_content_${Date.now()}`,
      feedback: feedback.trim() || (fixesFixed ? "Color grade corrected, audio levels normalized." : "Approved with no revisions needed."),
      views: Number(views) || 0,
      reactions: Number(reactions) || 0,
      comments: Number(comments) || 0,
      fixesFixed,
      month,
    };

    onAddContent(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#070d18]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Add New Content Item
              </h3>
              <p className="text-xs text-slate-400">
                Log a video reel, short clip, or stakeholder deliverable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-120px)] custom-scrollbar text-xs">
          <div>
            <label className="block text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">
              Content Title / Topic *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HSC 26 Organic Chemistry Shortcut Trick 🔥"
              className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3.5 py-2 text-white font-medium focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Editor / Stakeholder
              </label>
              <select
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="Asif">Asif</option>
                <option value="Akash">Akash</option>
                <option value="Tuhin">Tuhin</option>
                <option value="Mehedi">Mehedi</option>
                <option value="Joy">Joy</option>
                <option value="Refat">Refat</option>
                <option value="Tanvir">Tanvir</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="2026-04">2026-04</option>
                <option value="2026-05">2026-05</option>
                <option value="2026-06">2026-06</option>
                <option value="2026-07">2026-07</option>
                <option value="2026-08">2026-08</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="Facebook Reels">Facebook Reels</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="Reels / Short">Reels / Short</option>
                <option value="Product Explainer">Product Explainer</option>
                <option value="Exam Tip Cutdown">Exam Tip Cutdown</option>
                <option value="Course Teaser">Course Teaser</option>
                <option value="Instructor Highlight">Instructor Highlight</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Views
              </label>
              <input
                type="number"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Likes / Reactions
              </label>
              <input
                type="number"
                value={reactions}
                onChange={(e) => setReactions(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Comments
              </label>
              <input
                type="number"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-800 rounded-xl px-3 py-2 text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[#070d18] rounded-xl border border-slate-800">
            <input
              type="checkbox"
              id="chk-fix-addressed"
              checked={fixesFixed}
              onChange={(e) => setFixesFixed(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 cursor-pointer"
            />
            <label htmlFor="chk-fix-addressed" className="text-xs text-slate-300 font-medium cursor-pointer">
              Fixes / Feedback addressed by editor
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-950/50 transition-all cursor-pointer"
            >
              Save Content Clip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
