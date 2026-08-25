import React, { useState } from "react";
import { DaywiseClassRecord } from "../types";
import { X, Plus, Calendar, Clock, User, Building, Layers, CheckCircle2 } from "lucide-react";

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClass: (record: DaywiseClassRecord) => void;
}

const STUDIOS = [
  "Studio 1 - HQ1",
  "Studio 2 - HQ1",
  "Studio 3 - HQ1",
  "Studio 4 - HQ1",
  "Studio 5 - HQ5",
  "Studio 6 - HQ5",
  "Studio 7 - HQ5",
  "Studio 8 - HQ5",
  "Studio 9 - HQ5",
  "Studio 10 - HQ1",
  "Studio 11 - HQ5",
  "Studio 12 - HQ5",
  "Studio 13 - HQ1",
  "Studio 14 - HQ1",
];

const PRODUCT_TYPES = [
  "Online Batch (OB)",
  "English Medium",
  "Crash Course",
  "Admission",
  "HSC",
  "SSC",
  "Skills",
  "Free Live",
];

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen,
  onClose,
  onAddClass,
}) => {
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [teacher1, setTeacher1] = useState("");
  const [studio, setStudio] = useState("Studio 1 - HQ1");
  const [productType, setProductType] = useState("Online Batch (OB)");
  const [scheduledTime, setScheduledTime] = useState("3:00 PM - 4:30 PM");
  const [date, setDate] = useState("2026-08-17");
  const [studioCoordinator, setStudioCoordinator] = useState("Coordinator 1");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course.trim() || !topic.trim()) {
      alert("Please fill in course and topic.");
      return;
    }

    const newRecord: DaywiseClassRecord = {
      _rowIndex: Date.now(),
      date,
      scheduledTime,
      entryTime: scheduledTime.split("-")[0]?.trim() || "15:00",
      slideQacTime: "14:45",
      classStartTime: scheduledTime.split("-")[0]?.trim() || "15:00",
      course,
      subject: subject || course,
      topic,
      teacher1: teacher1 || "Assigned Instructor",
      teacher2: "",
      teacher3: "",
      studio,
      studioCoordinator,
      opsStakeholder: "Operations Lead",
      productType,
      lectureSlideStatus: "Slide Ready & QAC Passed",
      streamTitle: `${course} - ${topic}`,
      streamCaption: `${course} Live Class with ${teacher1 || "Instructor"}`,
      crossPost: "10MS App & Web Portal",
      sourcePlatform: "Zoom + Facebook Live",
      zoomLink: "https://10ms.zoom.us/j/85000000000",
      zoomCreds: "Passcode: 10MS2026",
      fbModLink: "https://facebook.com/groups/10ms/mod",
      annotatedSlideLink: "https://drive.google.com/drive/folders/slides_2026",
      stopTimestamps: "",
      delayMinutes: 0,
      totalDuration: 90,
      highestAttendance: 0,
      averageAttendance: 0,
      totalComments: 0,
      viewCount10m: 0,
      viewCountMid: 0,
      viewCountEnd: 0,
      classLink: "https://facebook.com/10minuteschool/live",
      zoomObsRecording: "https://drive.google.com/drive/folders/recordings",
      qacFeedback: "Scheduled via Realtime OPS Control Center",
      endTime: scheduledTime.split("-")[1]?.trim() || "16:30",
      status: "Upcoming",
    };

    onAddClass(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#070d18]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Add Live Class to Ops Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Register a new studio broadcast slot
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Course Name *
              </label>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. HSC 26 Online Batch"
                className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Higher Math, Physics"
                className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Topic / Chapter *
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Chapter 4: Quadratic Equations - Lecture 03"
              className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Instructor
              </label>
              <input
                type="text"
                value={teacher1}
                onChange={(e) => setTeacher1(e.target.value)}
                placeholder="e.g. Abid Hasan"
                className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Product Type
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
              >
                {PRODUCT_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Studio Allocation
              </label>
              <select
                value={studio}
                onChange={(e) => setStudio(e.target.value)}
                className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
              >
                {STUDIOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Scheduled Time (BST)
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="3:00 PM - 4:30 PM"
                className="w-full bg-[#070d18] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Add to Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
