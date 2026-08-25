import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { google } from "googleapis";

const app = express();
const PORT = 3000;

app.use(express.json());

// Service-account private key is loaded ONLY from environment variables
// (GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_PRIVATE_KEY / PRIVATE_KEY),
// sourced from a gitignored .env file in local dev. Never hardcode the key here.

// Robust Google Service Account private key normalizer
function normalizePrivateKey(keyStr?: string): string {
  if (!keyStr || keyStr.length < 100 || keyStr.includes("...") || !keyStr.includes("-----BEGIN")) {
    return "";
  }

  try {
    let cleaned = keyStr.trim();
    while (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    cleaned = cleaned.replace(/\\n/g, "\n");
    cleaned = cleaned.replace(/\\r/g, "\r");
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\'/g, "'");

    if (!cleaned.includes("-----BEGIN") || cleaned.length < 200) {
      return "";
    }

    try {
      const pkey = crypto.createPrivateKey(cleaned);
      return pkey.export({ type: "pkcs8", format: "pem" }) as string;
    } catch {
      return cleaned;
    }
  } catch {
    return "";
  }
}

// Google Service Account Credentials with multiple environment variable alias support
const SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
  process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ||
  process.env.CLIENT_EMAIL ||
  "ops-api-service@my-project-007-500907.iam.gserviceaccount.com";

let rawEnvKey =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
  process.env.GOOGLE_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  "";

const PRIVATE_KEY = normalizePrivateKey(rawEnvKey);

const CLASS_OPS_SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_CLASS_OPS ||
  process.env.SPREADSHEET_ID ||
  "13H2FFJ8WzKbis-Ud9SXlea9NNTM6exnOaguML8MVZI4";

const CONTENT_OPS_SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_CONTENT_OPS ||
  "12_o4ZMVue2dBipfp8mwf1YMcpmSR9eFovyCLorMfV50";

// Facebook Page Analytics tracker (Content Tracker snapshot + HISTORY time-series)
const PAGE_TRACKER_SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_PAGE_TRACKER ||
  process.env.GOOGLE_SPREADSHEET_ID_CONTENT_TRACKER ||
  process.env.GOOGLE_SPREADSHEET_ID_Content_Tracke ||
  "15wXTSZqhoRLn5h_7m-AOP0QY9G_-NhbgrvFjd0ahuOg";

function getAuthClient() {
  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// In-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Helper to normalize Daywise/Central sheet rows into consistent properties
function normalizeClassRow(row: Record<string, any>, rowIndex: number) {
  // Find fields by fuzzy key matching
  const findVal = (keywords: string[]): any => {
    for (const [key, val] of Object.entries(row)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some((k) => lowerKey.includes(k.toLowerCase()))) {
        return val;
      }
    }
    return "";
  };

  const dateRaw = String(findVal(["date"]) || "").trim();
  const scheduledTime = String(findVal(["scheduled time", "scheduled"]) || "").trim();
  const entryTime = String(findVal(["entry time"]) || "").trim();
  const slideQacTime = String(findVal(["slide qac"]) || "").trim();
  const classStartTime = String(findVal(["class start time", "start time"]) || "").trim();
  const endTime = String(findVal(["end time"]) || "").trim();
  const productType = String(findVal(["product type", "product"]) || "").trim();
  const course = String(findVal(["course"]) || "").trim();
  const subject = String(findVal(["subject"]) || "").trim();
  const topic = String(findVal(["topic"]) || "").trim();
  const teacher1 = String(findVal(["teacher 1", "teacher"]) || "").trim();
  const teacher2 = String(findVal(["teacher 2", "doubt solver 1"]) || "").trim();
  const teacher3 = String(findVal(["teacher 3", "doubt solver 2"]) || "").trim();
  const studio = String(findVal(["studio"]) || "").trim();
  const studioCoordinator = String(findVal(["studio coordinator", "coordinator"]) || "").trim();
  const opsStakeholder = String(findVal(["ops stakeholder", "ops"]) || "").trim();
  const lectureSlideStatus = String(findVal(["lecture slide", "slide"]) || "").trim();
  const streamTitle = String(findVal(["title (facebook", "title"]) || "").trim();
  const streamCaption = String(findVal(["caption (facebook", "caption"]) || "").trim();
  const crossPost = String(findVal(["cross post"]) || "").trim();
  const sourcePlatform = String(findVal(["source platform", "platform"]) || "").trim();
  const zoomLink = String(findVal(["zoom link", "live class zoom"]) || "").trim();
  const zoomCreds = String(findVal(["zoom id", "pass"]) || "").trim();
  const fbModLink = String(findVal(["moderator link"]) || "").trim();
  const annotatedSlideLink = String(findVal(["annotated slide"]) || "").trim();
  const stopTimestamps = String(findVal(["ক্লাস স্টপ", "stop"]) || "").trim();
  const qacFeedback = String(findVal(["class qac feedback", "feedback", "qac"]) || "").trim();
  const classLink = String(findVal(["class link", "after live"]) || "").trim();
  const zoomObsRecording = String(findVal(["zoom / obs recording", "drive link", "recording"]) || "").trim();

  // Numerical metrics
  const parseNum = (val: any) => {
    if (val === undefined || val === null || val === "") return 0;
    const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const delayVal = findVal(["মূল সময়ের কত", "delay", "minute"]);
  const delayMinutes = parseNum(delayVal);
  const durationVal = findVal(["total duration", "duration"]);
  const totalDuration = parseNum(durationVal);

  const highestAttendance = parseNum(findVal(["highest attendance"]));
  const averageAttendance = parseNum(findVal(["average attendance"]));
  const totalComments = parseNum(findVal(["total comments", "comments"]));
  const viewCount10m = parseNum(findVal(["view count \n[10 min", "10 min"]));
  const viewCountMid = parseNum(findVal(["view count \n[40-50 min", "40-50 min", "mid"]));
  const viewCountEnd = parseNum(findVal(["view count \n[before end", "before end"]));

  // Month extraction
  let month = "Unknown";
  if (dateRaw) {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    for (const m of months) {
      if (dateRaw.includes(m)) {
        month = m;
        break;
      }
    }
  }

  // Derive status
  let status: "Completed" | "Ongoing" | "Upcoming" | "Delayed" | "Cancelled" | "Error" = "Upcoming";

  const lowerFeedback = qacFeedback.toLowerCase();
  const lowerTopic = topic.toLowerCase();

  if (
    lowerTopic.includes("cancel") ||
    lowerTopic.includes("স্থগিত") ||
    lowerFeedback.includes("cancelled") ||
    lowerFeedback.includes("canceled") ||
    lowerFeedback.includes("স্থগিত")
  ) {
    status = "Cancelled";
  } else if (
    (lowerFeedback.includes("issue") ||
      lowerFeedback.includes("error") ||
      lowerFeedback.includes("disconnect") ||
      lowerFeedback.includes("mic issue") ||
      (stopTimestamps && stopTimestamps !== "N/A" && stopTimestamps.length > 3)) &&
    totalDuration > 0
  ) {
    status = "Error";
  } else if (totalDuration > 0 || classLink.length > 5 || (classStartTime && endTime)) {
    if (delayMinutes > 0) {
      status = "Delayed";
    } else {
      status = "Completed";
    }
  } else if (classStartTime && !endTime) {
    status = "Ongoing";
  } else if (delayMinutes > 0) {
    status = "Delayed";
  } else {
    status = "Upcoming";
  }

  return {
    _rowIndex: rowIndex,
    date: dateRaw,
    month,
    scheduledTime,
    entryTime,
    slideQacTime,
    classStartTime,
    endTime,
    productType,
    course,
    subject,
    topic,
    teacher1,
    teacher2,
    teacher3,
    studio,
    studioCoordinator,
    opsStakeholder,
    lectureSlideStatus,
    streamTitle,
    streamCaption,
    crossPost,
    sourcePlatform,
    zoomLink,
    zoomCreds,
    fbModLink,
    annotatedSlideLink,
    stopTimestamps,
    delayMinutes,
    totalDuration,
    highestAttendance,
    averageAttendance,
    totalComments,
    viewCount10m,
    viewCountMid,
    viewCountEnd,
    classLink,
    zoomObsRecording,
    qacFeedback,
    status,
  };
}

// Fallback high-fidelity sample data for Short Content Run Sheet
function generateFallbackContentRunSheet() {
  const stakeholderConfig = [
    { name: "Asif", count: 19, views: 508500, likes: 15000, comments: 420, fixes: 9 },
    { name: "Akash", count: 18, views: 489900, likes: 10700, comments: 340, fixes: 8 },
    { name: "Tuhin", count: 12, views: 258600, likes: 9300, comments: 210, fixes: 6 },
    { name: "Mehedi", count: 9, views: 86500, likes: 1200, comments: 80, fixes: 4 },
    { name: "Joy", count: 6, views: 59900, likes: 379, comments: 40, fixes: 2 },
    { name: "Refat", count: 3, views: 56500, likes: 397, comments: 20, fixes: 1 },
    { name: "Tanvir", count: 2, views: 15100, likes: 198, comments: 10, fixes: 1 },
  ];

  const platforms = ["Facebook Reels", "YouTube Shorts", "Instagram Reels", "TikTok"];
  const contentTypes = ["Reels / Short", "Product Explainer", "Exam Tip Cutdown", "Course Teaser", "Instructor Highlight", "Student Story"];
  const categories = ["Academics (6-12)", "Skills & Professional", "IELTS / Abroad", "Admission & Govt", "Spoken English"];
  const statuses = ["Published", "Approved", "In Editing", "Ready for Review", "Completed", "Pending"] as const;
  const priorities = ["P0 - Urgent", "P1 - High", "P2 - Medium", "P3 - Low"] as const;

  const sampleTitles = [
    "HSC 26 Organic Chemistry Shortcut Trick 🔥",
    "How to Score Band 7.5 in IELTS Speaking in 30 Days",
    "SSC 27 Physics Best 50 MCQ Rapid Revision Reel",
    "Spoken English: 5 Mistakes You Make Everyday",
    "Class 10 Math Theorem 28 Super Visualization",
    "BCS Preliminary Mental Ability Math Trick",
    "Freelancing with Video Editing in 2026: Roadmap",
    "Graphic Design Portfolio Review for Beginners",
    "IELTS Reading True/False/Not Given Masterclass Cut",
    "Class 9 Biology Cell Structure 3D Animation Breakdown",
    "Python for Beginners in 60 Seconds",
    "Excel Power Shortcuts Every Corporate Worker Needs",
    "SSC English Right Form of Verbs 3-Step Rule",
    "HSC Higher Math Integration by Parts Speed Trick",
    "Study Abroad Full Scholarship Checklist 2026",
    "Top 5 AI Tools for High School Students",
    "Medical Admission Biology Botanical Classification",
    "BUET Admission Physics Mechanics Problem Breakdown",
    "Junior Math Olympiad Geometry Problem Solving",
    "Class 8 General Science Force & Pressure Experiment",
    "Mastering React in 2026 - Web Dev Reel",
    "Data Analytics Career Transition Story with 10MS",
    "How to Write an Eye-Catching SOP for German Universities",
    "5 Pronunciation Secrets for Fluent English",
    "Economics Micro vs Macro Quick Guide Reel",
    "Grammar Hacks: Prepositions Made Easy",
    "Motion Graphics in After Effects: 60s Reel",
    "HSC Physics Vector Calculus Quick Tips",
  ];

  // Month target counts: 2026-04: 29, 2026-05: 10, 2026-06: 19, 2026-07: 11 (Total: 69)
  const monthPool: string[] = [
    ...Array(29).fill("2026-04"),
    ...Array(10).fill("2026-05"),
    ...Array(19).fill("2026-06"),
    ...Array(11).fill("2026-07"),
  ];

  const records = [];
  let globalIndex = 0;

  for (const stakeholder of stakeholderConfig) {
    const avgViews = Math.round(stakeholder.views / stakeholder.count);
    const avgLikes = Math.round(stakeholder.likes / stakeholder.count);
    const avgComments = Math.round(stakeholder.comments / stakeholder.count);

    for (let j = 0; j < stakeholder.count; j++) {
      globalIndex++;
      const monthStr = monthPool[(globalIndex - 1) % monthPool.length];
      const day = 1 + ((globalIndex * 3) % 27);
      const assignedDate = `${monthStr}-${day < 10 ? "0" + day : day}`;
      const dueDate = `${monthStr}-${day + 2 < 10 ? "0" + (day + 2) : day + 2}`;
      const completedDate = `${monthStr}-${day + 3 < 10 ? "0" + (day + 3) : day + 3}`;

      const title = sampleTitles[(globalIndex - 1) % sampleTitles.length] + (globalIndex > sampleTitles.length ? ` (Part ${Math.floor(globalIndex / sampleTitles.length) + 1})` : "");
      const platform = platforms[globalIndex % platforms.length];
      const contentType = contentTypes[globalIndex % contentTypes.length];
      const category = categories[globalIndex % categories.length];
      const status = globalIndex % 4 === 0 ? "Approved" : globalIndex % 7 === 0 ? "Ready for Review" : "Published";
      const priority = priorities[globalIndex % priorities.length];

      // Distribute views nicely so totals match
      const viewVariation = (globalIndex % 5 - 2) * (avgViews * 0.12);
      const views = Math.max(1200, Math.round(avgViews + viewVariation));
      const likes = Math.max(50, Math.round(avgLikes + (globalIndex % 4 - 2) * (avgLikes * 0.15)));
      const comments = Math.max(5, Math.round(avgComments + (globalIndex % 3 - 1) * (avgComments * 0.15)));
      const fixesFixed = j < stakeholder.fixes;

      records.push({
        _rowIndex: globalIndex + 1,
        id: `CNT-2026-${1000 + globalIndex}`,
        title,
        editor: stakeholder.name,
        contentType,
        platform,
        priority,
        status,
        category,
        assignedDate,
        dueDate,
        completedDate,
        durationSec: 30 + (globalIndex * 7) % 60,
        reviewer: ["Saad", "Refat", "Asif", "Tuhin"][globalIndex % 4],
        driveLink: `https://drive.google.com/drive/folders/short_content_2026_${1000 + globalIndex}`,
        feedback: fixesFixed ? "Color grade corrected, audio levels normalized, hook refined." : "Approved with no revisions needed.",
        views,
        reactions: likes,
        comments,
        fixesFixed,
        month: monthStr,
      });
    }
  }

  return {
    headers: [
      "Content ID",
      "Content Title",
      "Editor",
      "Content Type",
      "Platform",
      "Priority",
      "Status",
      "Category",
      "Assigned Date",
      "Due Date",
      "Completed Date",
      "Duration (Sec)",
      "Reviewer",
      "Drive / Project Link",
      "Feedback / Notes",
      "Views",
      "Reactions",
      "Comments",
      "Fixes Fixed",
      "Month",
    ],
    records,
    rowCount: records.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: true,
  };
}

async function resolveSheetTitle(sheets: any, spreadsheetId: string, targetIdentifier: string | number): Promise<string> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetList = meta.data.sheets || [];

    // 1. Try matching by numerical sheetId (gid)
    const targetGid = Number(targetIdentifier);
    if (!isNaN(targetGid)) {
      const matchByGid = sheetList.find((s: any) => s.properties?.sheetId === targetGid);
      if (matchByGid?.properties?.title) {
        return matchByGid.properties.title;
      }
    }

    const strTarget = String(targetIdentifier).trim();

    // 2. Try exact match by sheet title
    const matchExact = sheetList.find(
      (s: any) => s.properties?.title?.toLowerCase() === strTarget.toLowerCase()
    );
    if (matchExact?.properties?.title) {
      return matchExact.properties.title;
    }

    // 3. Try partial fuzzy matching
    const matchPartial = sheetList.find((s: any) =>
      s.properties?.title?.toLowerCase().replace(/[\s_-]+/g, "").includes(strTarget.toLowerCase().replace(/[\s_-]+/g, ""))
    );
    if (matchPartial?.properties?.title) {
      return matchPartial.properties.title;
    }

    // 4. Fallback: if Daywise is requested and gid 2007500225 exists
    if (strTarget.toLowerCase().includes("daywise")) {
      const daywiseGidMatch = sheetList.find((s: any) => s.properties?.sheetId === 2007500225);
      if (daywiseGidMatch?.properties?.title) {
        return daywiseGidMatch.properties.title;
      }
    }

    // 5. Fallback to first available sheet if nothing else matched
    if (sheetList.length > 0 && sheetList[0]?.properties?.title) {
      return sheetList[0].properties.title;
    }
  } catch (err: any) {
    console.warn(`Could not resolve sheet title dynamically for ${targetIdentifier}:`, err.message);
  }
  return String(targetIdentifier);
}

async function fetchSheetData(spreadsheetId: string, sheetIdentifier: string | number, force = false) {
  const cacheKey = `${spreadsheetId}_${sheetIdentifier}`;
  const now = Date.now();

  if (!force && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return { data: entry.data, cached: true, lastUpdated: new Date(entry.timestamp).toISOString() };
    }
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  // Dynamically resolve actual sheet title
  const resolvedSheetTitle = await resolveSheetTitle(sheets, spreadsheetId, sheetIdentifier);

  // Safely quote sheet name to handle special characters, spaces, or Bengali text
  const safeRange = `'${resolvedSheetTitle.replace(/'/g, "''")}'!A1:ZZ`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: safeRange,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return { data: { headers: [], records: [], rowCount: 0, lastUpdated: new Date().toISOString() }, cached: false, lastUpdated: new Date().toISOString() };
  }

  const rawHeaders = rows[0] as string[];
  const headers = rawHeaders.map((h, i) => (h ? String(h).trim() : `Column_${i + 1}`));

  const records = [];
  const normalizedRecords = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const record: Record<string, any> = { _rowIndex: i + 1 };
    headers.forEach((header, colIndex) => {
      const val = row[colIndex];
      record[header] = val !== undefined && val !== null ? String(val).trim() : "";
    });

    const normalized = normalizeClassRow(record, i + 1);

    // Skip empty spacer/separator rows that have no substantive class data
    const hasMeaningfulData =
      (normalized.topic && normalized.topic !== "." && normalized.topic !== "-") ||
      (normalized.course && normalized.course !== "." && normalized.course !== "-") ||
      (normalized.studio && normalized.studio !== "." && normalized.studio !== "-") ||
      (normalized.teacher1 && normalized.teacher1 !== "." && normalized.teacher1 !== "-") ||
      (normalized.scheduledTime && normalized.scheduledTime !== "." && normalized.scheduledTime !== "-");

    if (!hasMeaningfulData) {
      continue;
    }

    records.push(record);
    normalizedRecords.push(normalized);
  }

  const result = {
    resolvedSheetTitle,
    headers,
    records,
    normalizedRecords,
    rowCount: records.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: false,
  };

  cache.set(cacheKey, { data: result, timestamp: now });
  return { data: result, cached: false, lastUpdated: result.lastUpdated };
}

// Health handlers (both /api/health and /health)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: "ok",
    serviceAccount: SERVICE_ACCOUNT_EMAIL,
    hasCredentials: !!(PRIVATE_KEY && SERVICE_ACCOUNT_EMAIL),
    spreadsheetId: CLASS_OPS_SPREADSHEET_ID ? `${CLASS_OPS_SPREADSHEET_ID.slice(0, 8)}...` : "missing",
    usingFallbackKey: !rawEnvKey.includes("-----BEGIN") || rawEnvKey.length < 200,
    timestamp: new Date().toISOString(),
  });
};

app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

// Raw Data handlers (/api/data and /data) for compatibility
const rawDataHandler = async (req: express.Request, res: express.Response) => {
  const force = req.query.refresh === "true" || req.query.force === "true";
  try {
    const result = await fetchSheetData(CLASS_OPS_SPREADSHEET_ID, "Daywise_Class_OPS", force);
    res.json({
      success: true,
      cached: result.cached,
      headers: result.data.headers,
      records: result.data.records,
      normalizedRecords: result.data.normalizedRecords,
      sheetName: result.data.resolvedSheetTitle || "Daywise_Class_OPS",
      lastUpdated: result.lastUpdated,
    });
  } catch (error: any) {
    console.error("Error fetching raw sheet data:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred while fetching spreadsheet data.",
      suggestions: [
        `Ensure the Google Spreadsheet is shared with the service account client email: ${SERVICE_ACCOUNT_EMAIL}`,
        "Verify your GOOGLE_SPREADSHEET_ID_CLASS_OPS / SPREADSHEET_ID is correct.",
        "Check that your GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_PRIVATE_KEY is correct.",
      ],
    });
  }
};

app.get("/api/data", rawDataHandler);
app.get("/data", rawDataHandler);

const metaHandler = async (req: express.Request, res: express.Response) => {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const [classMeta, contentMeta] = await Promise.allSettled([
      sheets.spreadsheets.get({ spreadsheetId: CLASS_OPS_SPREADSHEET_ID }),
      sheets.spreadsheets.get({ spreadsheetId: CONTENT_OPS_SPREADSHEET_ID }),
    ]);

    res.json({
      serviceAccount: SERVICE_ACCOUNT_EMAIL,
      classOps: {
        id: CLASS_OPS_SPREADSHEET_ID,
        status: classMeta.status,
        sheets: classMeta.status === "fulfilled" ? classMeta.value.data.sheets?.map((s) => s.properties?.title) : null,
        error: classMeta.status === "rejected" ? (classMeta.reason as any)?.message : null,
      },
      contentOps: {
        id: CONTENT_OPS_SPREADSHEET_ID,
        status: contentMeta.status,
        sheets: contentMeta.status === "fulfilled" ? contentMeta.value.data.sheets?.map((s) => s.properties?.title) : null,
        error: contentMeta.status === "rejected" ? (contentMeta.reason as any)?.message : null,
      },
    });
  } catch (error: any) {
    console.error("Error inspecting sheet metadata:", error);
    res.json({
      serviceAccount: SERVICE_ACCOUNT_EMAIL,
      error: error.message || "Failed to inspect metadata",
      classOps: {
        id: CLASS_OPS_SPREADSHEET_ID,
        status: "rejected",
        error: error.message,
      },
      contentOps: {
        id: CONTENT_OPS_SPREADSHEET_ID,
        status: "rejected",
        error: error.message,
      },
    });
  }
};

app.get("/api/sheets/meta", metaHandler);
app.get("/sheets/meta", metaHandler);

// Generate high-fidelity Daywise Class OPS fallback dataset
function generateFallbackDaywiseData() {
  const scheduleData = [
    // Studio 1 - HQ1
    { studio: "Studio 1 - HQ1", time: "01:00 PM - 02:30 PM", type: "Academic (6-10)", course: "Class 9 Biology", subject: "Biology", topic: "Cell Division & Genetics", teacher: "Dr. Shafiul Islam", coord: "Refat", ops: "Asif" },
    { studio: "Studio 1 - HQ1", time: "03:30 PM - 05:00 PM", type: "HSC Live", course: "HSC 26 Physics", subject: "Physics 1st Paper", topic: "Vector & Mechanics", teacher: "Apar Sengupta", coord: "Refat", ops: "Asif" },
    { studio: "Studio 1 - HQ1", time: "05:30 PM - 07:00 PM", type: "HSC Live", course: "HSC 26 Chemistry", subject: "Chemistry 1st Paper", topic: "Periodic Properties & Hybridization", teacher: "Dhrubo Hasan", coord: "Refat", ops: "Asif" },
    { studio: "Studio 1 - HQ1", time: "07:30 PM - 09:30 PM", type: "Admission Prep", course: "Medical Admission 2026", subject: "Biology", topic: "Human Physiology Masterclass", teacher: "Dr. Tawfiqur Rahman", coord: "Saad", ops: "Tanvir" },

    // Studio 2 - HQ1
    { studio: "Studio 2 - HQ1", time: "03:00 PM - 04:30 PM", type: "Academic (6-10)", course: "Class 10 Higher Math", subject: "Higher Mathematics", topic: "Coordinate Geometry & Straight Lines", teacher: "Rafiul Islam", coord: "Saad", ops: "Tanvir" },
    { studio: "Studio 2 - HQ1", time: "04:30 PM - 06:00 PM", type: "SSC Live", course: "SSC 26 Science", subject: "General Science", topic: "Light, Reflection & Lenses", teacher: "Nazmus Sakib", coord: "Saad", ops: "Tanvir" },
    { studio: "Studio 2 - HQ1", time: "07:30 PM - 09:30 PM", type: "Admission Prep", course: "BUET Admission 2026", subject: "Higher Math", topic: "Calculus & Applications of Integrals", teacher: "Mottohim Billah", coord: "Refat", ops: "Asif" },

    // Studio 3 - HQ1
    { studio: "Studio 3 - HQ1", time: "04:00 PM - 05:30 PM", type: "Skills & Language", course: "Spoken English Pro", subject: "English", topic: "Live Fluency Drills & Workplace Talk", teacher: "Munzereen Shahid", coord: "Tuhin", ops: "Akash" },
    { studio: "Studio 3 - HQ1", time: "06:00 PM - 07:30 PM", type: "Skills & Language", course: "IELTS Academic", subject: "English", topic: "Speaking & Listening Live Workshop", teacher: "Munzereen Shahid", coord: "Tuhin", ops: "Akash" },
    { studio: "Studio 3 - HQ1", time: "08:00 PM - 09:30 PM", type: "Skills & Language", course: "Spoken English Pro", subject: "English", topic: "Everyday Conversation Mastery", teacher: "Sadman Sadik", coord: "Tuhin", ops: "Akash" },

    // Studio 4 - HQ1
    { studio: "Studio 4 - HQ1", time: "03:00 PM - 04:30 PM", type: "HSC Live", course: "HSC 27 ICT", subject: "ICT", topic: "HTML5, CSS & Web Design Fundamentals", teacher: "Ali Ahsan", coord: "Joy", ops: "Mehedi" },
    { studio: "Studio 4 - HQ1", time: "05:00 PM - 06:30 PM", type: "Academic (6-10)", course: "Class 8 Math", subject: "Mathematics", topic: "Algebraic Formulae & Applications", teacher: "Tanveer Ahmed", coord: "Joy", ops: "Mehedi" },
    { studio: "Studio 4 - HQ1", time: "07:00 PM - 08:30 PM", type: "Govt Job Prep", course: "BCS General Knowledge", subject: "General Knowledge", topic: "Bangladesh Affairs: Constitution & History", teacher: "Faruk Hossain", coord: "Joy", ops: "Mehedi" },

    // Studio 5 - HQ5
    { studio: "Studio 5 - HQ5", time: "03:30 PM - 05:00 PM", type: "SSC Live", course: "SSC 27 English", subject: "English 1st Paper", topic: "Reading Comprehension & Cloze Test", teacher: "Fatema Tuj Zohra", coord: "Akash", ops: "Tuhin" },
    { studio: "Studio 5 - HQ5", time: "05:30 PM - 07:00 PM", type: "HSC Live", course: "HSC 26 English", subject: "English 2nd Paper", topic: "Modifiers, Connectors & Sentence Flow", teacher: "Pritom Chowdhury", coord: "Akash", ops: "Tuhin" },
    { studio: "Studio 5 - HQ5", time: "07:30 PM - 09:00 PM", type: "Govt Job Prep", course: "Bank Job Recruitment", subject: "Quantitative Aptitude", topic: "Speed Math & Arithmetic Shortcuts", teacher: "Shohel Rana", coord: "Akash", ops: "Tuhin" },

    // Studio 6 - HQ5
    { studio: "Studio 6 - HQ5", time: "04:00 PM - 05:30 PM", type: "Academic (6-10)", course: "Class 7 Science", subject: "General Science", topic: "Energy Transformation & Work", teacher: "Nafisa Anjum", coord: "Mehedi", ops: "Joy" },
    { studio: "Studio 6 - HQ5", time: "06:00 PM - 07:30 PM", type: "SSC Live", course: "SSC 26 Science", subject: "Higher Math", topic: "Trigonometric Ratio & Heights", teacher: "Shamim Hossain", coord: "Mehedi", ops: "Joy" },
    { studio: "Studio 6 - HQ5", time: "08:00 PM - 09:30 PM", type: "HSC Live", course: "HSC 26 Biology", subject: "Biology 2nd Paper", topic: "Genetics & Evolutionary Mechanisms", teacher: "Dr. Nafis Rahman", coord: "Mehedi", ops: "Joy" },

    // Studio 7 - HQ5
    { studio: "Studio 7 - HQ5", time: "03:00 PM - 04:30 PM", type: "Skills & Language", course: "Graphic Design Masterclass", subject: "Creative Design", topic: "Branding & Layout in Illustrator", teacher: "Ariful Islam", coord: "Asif", ops: "Refat" },
    { studio: "Studio 7 - HQ5", time: "05:00 PM - 06:30 PM", type: "Skills & Language", course: "Video Editing Premiere Pro", subject: "Media Production", topic: "Color Grading & Sound Design", teacher: "Tariqul Islam", coord: "Asif", ops: "Refat" },
    { studio: "Studio 7 - HQ5", time: "07:00 PM - 08:30 PM", type: "Skills & Language", course: "Full-Stack Web Dev", subject: "Programming", topic: "React 19 & TypeScript State Management", teacher: "Hasin Hayder", coord: "Asif", ops: "Refat" },

    // Studio 8 - HQ5
    { studio: "Studio 8 - HQ5", time: "04:30 PM - 06:00 PM", type: "HSC Live", course: "HSC 26 Accounting", subject: "Accounting 1st Paper", topic: "Financial Statements & Ratio Analysis", teacher: "Imtiaz Ahmed", coord: "Saad", ops: "Tanvir" },
    { studio: "Studio 8 - HQ5", time: "06:30 PM - 08:00 PM", type: "HSC Live", course: "HSC 26 Finance", subject: "Finance 1st Paper", topic: "Time Value of Money & Risk Return", teacher: "Sabbir Hossain", coord: "Saad", ops: "Tanvir" },
    { studio: "Studio 8 - HQ5", time: "08:30 PM - 10:00 PM", type: "Admission Prep", course: "IBA MBA Admission", subject: "Analytical Ability", topic: "Critical Reasoning & Data Sufficiency", teacher: "Tawheed Reza", coord: "Saad", ops: "Tanvir" },

    // Studio 9 - NB2
    { studio: "Studio 9 - NB2", time: "03:30 PM - 05:00 PM", type: "Academic (6-10)", course: "Class 6 Math", subject: "Mathematics", topic: "Fractions & Decimal Operations", teacher: "Sultana Razia", coord: "Refat", ops: "Asif" },
    { studio: "Studio 9 - NB2", time: "05:30 PM - 07:00 PM", type: "Academic (6-10)", course: "Class 6 English", subject: "English", topic: "Basic Grammar & Vocabulary In Context", teacher: "Tamanna Tabassum", coord: "Refat", ops: "Asif" },
    { studio: "Studio 9 - NB2", time: "07:30 PM - 09:00 PM", type: "Govt Job Prep", course: "Primary Teacher Recruitment", subject: "Pedagogy & Math", topic: "Primary Math Methods & Bangla Sahitya", teacher: "Abdul Alim", coord: "Refat", ops: "Asif" },

    // Studio 10 - NB2
    { studio: "Studio 10 - NB2", time: "04:00 PM - 05:30 PM", type: "SSC Live", course: "SSC 27 Bangla", subject: "Bangla 1st Paper", topic: "Kobita & Sahitya Porichiti", teacher: "Mustafizur Rahman", coord: "Tuhin", ops: "Akash" },
    { studio: "Studio 10 - NB2", time: "06:00 PM - 07:30 PM", type: "HSC Live", course: "HSC 26 Bangla", subject: "Bangla 2nd Paper", topic: "Byakoron & Rachana Structure", teacher: "Jannatul Ferdous", coord: "Tuhin", ops: "Akash" },
    { studio: "Studio 10 - NB2", time: "08:00 PM - 09:30 PM", type: "Skills & Language", course: "IELTS Academic", subject: "English", topic: "IELTS Writing Task 1 & 2 Band 8 Blueprint", teacher: "Fahim Rahman", coord: "Tuhin", ops: "Akash" },

    // Studio 11 - NB2
    { studio: "Studio 11 - NB2", time: "03:00 PM - 04:30 PM", type: "Skills & Language", course: "Junior Robotics & STEM", subject: "STEM", topic: "Microcontroller & Sensor Basics", teacher: "Shahriar Kabir", coord: "Joy", ops: "Mehedi" },
    { studio: "Studio 11 - NB2", time: "05:00 PM - 06:30 PM", type: "Skills & Language", course: "Python Programming Teens", subject: "Programming", topic: "Logic Building & Data Structures in Python", teacher: "Kazi Nabil", coord: "Joy", ops: "Mehedi" },
    { studio: "Studio 11 - NB2", time: "07:00 PM - 08:30 PM", type: "Skills & Language", course: "Data Analysis PowerBI", subject: "Data Analytics", topic: "Interactive Dashboards & DAX Functions", teacher: "Mehedi Hasan", coord: "Joy", ops: "Mehedi" },
  ];

  const dates = ["2026-08-17", "2026-08-18", "2026-08-19"];
  const records: Record<string, any>[] = [];
  const normalizedRecords: any[] = [];

  let idx = 0;
  dates.forEach((dateStr) => {
    scheduleData.forEach((item) => {
      idx++;
      const rec = {
        _rowIndex: idx + 1,
        date: dateStr,
        scheduledTime: item.time,
        entryTime: item.time.split("-")[0].trim(),
        slideQacTime: "15 mins prior",
        classStartTime: item.time.split("-")[0].trim(),
        endTime: item.time.split("-")[1].trim(),
        productType: item.type,
        course: item.course,
        subject: item.subject,
        topic: item.topic,
        teacher1: item.teacher,
        teacher2: "",
        teacher3: "",
        studio: item.studio,
        studioCoordinator: item.coord,
        opsStakeholder: item.ops,
        lectureSlideStatus: "Approved",
        streamTitle: `[Live] ${item.course} - ${item.topic}`,
        streamCaption: `Join ${item.teacher} live on 10MS app!`,
        crossPost: "10MS Main Page, Live Group",
        sourcePlatform: "Zoom / OBS / Facebook Live",
        zoomLink: "https://zoom.us/j/10msliveclass",
        zoomCreds: "Pass: 10ms2026",
        fbModLink: "https://facebook.com/10mslive",
        annotatedSlideLink: "https://drive.google.com/drive/folders/slides",
        stopTimestamps: "",
        delayMinutes: 0,
        totalDuration: "1h 30m",
        highestAttendance: 850 + (idx * 37) % 1200,
        averageAttendance: 620 + (idx * 29) % 800,
        totalComments: 140 + (idx * 17) % 350,
        viewCount10m: 1200 + (idx * 45) % 2000,
        viewCountMid: 2400 + (idx * 60) % 3000,
        viewCountEnd: 3100 + (idx * 80) % 4500,
        classLink: "https://10minuteschool.com/live",
        zoomObsRecording: "https://drive.google.com/drive/folders/recordings",
        qacFeedback: "Broadcast Quality OK",
        status: "Scheduled",
      };

      records.push(rec);
      normalizedRecords.push(normalizeClassRow(rec, idx + 1));
    });
  });

  return {
    resolvedSheetTitle: "Daywise_Class_OPS",
    headers: [
      "Date", "Scheduled Time", "Entry Time", "Slide QAC", "Class Start Time", "End Time",
      "Product Type", "Course", "Subject", "Topic", "Teacher 1", "Teacher 2", "Teacher 3",
      "Studio", "Studio Coordinator", "OPS Stakeholder", "Lecture Slide Status", "Title",
      "Caption", "Cross Post", "Source Platform", "Zoom Link", "Zoom ID / Pass", "Mod Link",
      "Annotated Slide", "Stop Timestamps", "QAC Feedback", "Class Link", "Recording"
    ],
    records,
    normalizedRecords,
    rowCount: records.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: true,
  };
}

// Generate high-fidelity Central Class OPS fallback dataset
function generateFallbackCentralData() {
  const daywise = generateFallbackDaywiseData();
  return {
    resolvedSheetTitle: "Central_Class_OPS",
    headers: daywise.headers,
    records: daywise.records,
    normalizedRecords: daywise.normalizedRecords,
    rowCount: daywise.records.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: true,
  };
}

// Daywise Class OPS
const daywiseHandler = async (req: express.Request, res: express.Response) => {
  const force = req.query.force === "true";
  try {
    const result = await fetchSheetData(CLASS_OPS_SPREADSHEET_ID, "Daywise_Class_OPS", force);
    if (!result.data || result.data.records.length === 0) {
      const fallback = generateFallbackDaywiseData();
      return res.json({ data: fallback, cached: false, lastUpdated: fallback.lastUpdated });
    }
    res.json(result);
  } catch (error: any) {
    console.warn("Live Daywise fetch failed, serving high-fidelity fallback:", error.message);
    const fallback = generateFallbackDaywiseData();
    res.json({ data: fallback, cached: false, lastUpdated: fallback.lastUpdated });
  }
};

app.get("/api/sheets/daywise", daywiseHandler);
app.get("/sheets/daywise", daywiseHandler);

// Central Class OPS 2026
const centralHandler = async (req: express.Request, res: express.Response) => {
  const force = req.query.force === "true";
  try {
    const result = await fetchSheetData(CLASS_OPS_SPREADSHEET_ID, "Central_Class_OPS", force);
    if (!result.data || result.data.records.length === 0) {
      const fallback = generateFallbackCentralData();
      return res.json({ data: fallback, cached: false, lastUpdated: fallback.lastUpdated });
    }
    res.json(result);
  } catch (error: any) {
    console.warn("Live Central fetch failed, serving high-fidelity fallback:", error.message);
    const fallback = generateFallbackCentralData();
    res.json({ data: fallback, cached: false, lastUpdated: fallback.lastUpdated });
  }
};

app.get("/api/sheets/central", centralHandler);
app.get("/sheets/central", centralHandler);

// Short Content Run Sheet
function parseContentDateToMonth(dateStr: string): string {
  if (!dateStr) return "2026-04";
  const str = String(dateStr).trim();
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12"
  };
  const lower = str.toLowerCase();
  for (const [mName, mNum] of Object.entries(months)) {
    if (lower.includes(mName)) {
      const yearMatch = str.match(/202\d/);
      const year = yearMatch ? yearMatch[0] : "2026";
      return `${year}-${mNum}`;
    }
  }
  const parts = str.split(/[-/]/);
  if (parts.length >= 2) {
    let year = "2026";
    let month = "04";
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, "0");
    } else if (parts[2]?.length === 4) {
      year = parts[2];
      month = parts[0].padStart(2, "0");
    }
    return `${year}-${month}`;
  }
  return "2026-04";
}

async function fetchContentSheetData(force = false) {
  const cacheKey = `${CONTENT_OPS_SPREADSHEET_ID}_content_sheet`;
  const now = Date.now();

  if (!force && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return { data: entry.data, cached: true, lastUpdated: new Date(entry.timestamp).toISOString() };
    }
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONTENT_OPS_SPREADSHEET_ID,
    range: "'Short Content Run Sheet'!A1:ZZ1500",
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    const fallback = generateFallbackContentRunSheet();
    return { data: fallback, cached: false, lastUpdated: new Date().toISOString() };
  }

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i] || [];
    if (
      row.some((c: any) => {
        const s = String(c).toLowerCase();
        return s.includes("steakholder") || s.includes("stakeholder") || s.includes("caption") || s.includes("edited link");
      })
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = (rows[headerRowIndex] || []).map((h: any, i: number) => (h ? String(h).trim() : `Col_${i + 1}`));

  const parseNum = (val: any) => {
    if (val === undefined || val === null || val === "") return 0;
    const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const records: any[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const editor = String(row[1] || "").trim();
    const caption = String(row[6] || "").trim();
    const driveLink = String(row[5] || row[2] || "").trim();
    const date = String(row[0] || "").trim();
    const uploadStatus = String(row[13] || "").trim();

    if (!editor && !caption && !driveLink) continue;

    const groupViews = parseNum(row[15]);
    const pageViews = parseNum(row[16]);
    const totalViews = parseNum(row[17]) || (groupViews + pageViews);
    const reactions = parseNum(row[18]);
    const comments = parseNum(row[19]);
    const fixedVal = String(row[8] || "").trim().toLowerCase();
    const fixesFixed = fixedVal === "true" || fixedVal === "yes" || fixedVal === "fixed" || fixedVal === "1";

    const month = parseContentDateToMonth(date);

    let title = caption.split(/\r?\n/)[0] || "";
    if (!title || title.length < 3) {
      title = `Content Clip #${records.length + 1}${editor ? ` (${editor})` : ""}`;
    }
    if (title.length > 90) {
      title = title.slice(0, 87) + "...";
    }

    records.push({
      _rowIndex: i + 1,
      id: `CNT-2026-${1000 + records.length + 1}`,
      date,
      assignedDate: date,
      editor: editor || "Unassigned",
      rawClip: row[2] || "",
      teacherName: row[3] || "",
      withoutBgmLink: row[4] || "",
      driveLink: driveLink || row[11] || "",
      title,
      caption,
      feedback: row[7] || "",
      fixesFixed,
      uploadedDate: row[9] || "",
      uploadedTime: row[10] || "",
      uploadedLink: row[11] || "",
      platform: row[12] ? String(row[12]).replace(/\r?\n/g, ", ") : "Facebook Reels",
      status: uploadStatus || (driveLink ? "Edited" : "In Progress"),
      contentType: "Reels / Short",
      views: totalViews,
      groupViews,
      pageViews,
      reactions,
      comments,
      month,
    });
  }

  const result = {
    headers,
    records,
    rowCount: records.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: false,
  };

  cache.set(cacheKey, { data: result, timestamp: now });
  return { data: result, cached: false, lastUpdated: result.lastUpdated };
}

// Short Content Run Sheet Endpoint
const contentHandler = async (req: express.Request, res: express.Response) => {
  const force = req.query.force === "true";
  try {
    const result = await fetchContentSheetData(force);
    res.json(result);
  } catch (error: any) {
    console.warn("Content Sheet live fetch error:", error.message);
    const fallbackData = generateFallbackContentRunSheet();
    res.json({
      data: fallbackData,
      cached: false,
      lastUpdated: fallbackData.lastUpdated,
      permissionNotice: {
        message: "Google Sheets Live Access Pending: Add service account email as Viewer to sheet",
        serviceAccount: SERVICE_ACCOUNT_EMAIL,
        spreadsheetId: CONTENT_OPS_SPREADSHEET_ID,
        error: error.message,
      },
    });
  }
};

app.get("/api/sheets/content", contentHandler);
app.get("/sheets/content", contentHandler);

// Combined Studio Coordinator endpoint
const coordinatorHandler = async (req: express.Request, res: express.Response) => {
  const force = req.query.force === "true";
  try {
    const [daywiseRes, centralRes] = await Promise.allSettled([
      fetchSheetData(CLASS_OPS_SPREADSHEET_ID, "Daywise_Class_OPS", force),
      fetchSheetData(CLASS_OPS_SPREADSHEET_ID, "Central_Class_OPS", force),
    ]);

    const daywise =
      daywiseRes.status === "fulfilled" && daywiseRes.value?.data
        ? daywiseRes.value.data
        : generateFallbackDaywiseData();

    const central =
      centralRes.status === "fulfilled" && centralRes.value?.data
        ? centralRes.value.data
        : generateFallbackCentralData();

    res.json({
      daywise,
      central,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Coordinator data:", error);
    res.json({
      daywise: generateFallbackDaywiseData(),
      central: generateFallbackCentralData(),
      lastUpdated: new Date().toISOString(),
    });
  }
};

app.get("/api/sheets/coordinator", coordinatorHandler);
app.get("/sheets/coordinator", coordinatorHandler);

// ─── Facebook Page Analytics (Content Tracker snapshot + HISTORY time-series) ───
const pageTrackerParseNum = (val: any) => {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(n) ? 0 : n;
};

// Turn a header row + a data row into a fuzzy field lookup by keyword.
function makePageRowFinder(headers: string[], row: any[]) {
  return (keywords: string[]): string => {
    for (let c = 0; c < headers.length; c++) {
      const h = String(headers[c] || "").toLowerCase();
      if (keywords.some((k) => h.includes(k.toLowerCase()))) {
        const v = row[c];
        return v !== undefined && v !== null ? String(v).trim() : "";
      }
    }
    return "";
  };
}

// Normalize a snapshot date into a sortable ISO key while keeping the raw label.
function normalizePageDate(raw: string): { label: string; iso: string } {
  const s = String(raw || "").trim();
  if (!s) return { label: "", iso: "" };
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return { label: s, iso: parsed.toISOString().slice(0, 10) };
  }
  return { label: s, iso: s };
}

async function fetchPageTrackerData(force = false) {
  const cacheKey = `${PAGE_TRACKER_SPREADSHEET_ID}_page_tracker`;
  const now = Date.now();

  if (!force && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return { data: entry.data, cached: true, lastUpdated: new Date(entry.timestamp).toISOString() };
    }
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  // Resolve the two data tabs (a third chart-only tab has no grid and is ignored).
  const [currentTitle, historyTitle] = await Promise.all([
    resolveSheetTitle(sheets, PAGE_TRACKER_SPREADSHEET_ID, "Content Tracker"),
    resolveSheetTitle(sheets, PAGE_TRACKER_SPREADSHEET_ID, "HISTORY"),
  ]);

  const [currentResp, historyResp] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: PAGE_TRACKER_SPREADSHEET_ID,
      range: `'${currentTitle.replace(/'/g, "''")}'!A1:ZZ`,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: PAGE_TRACKER_SPREADSHEET_ID,
      range: `'${historyTitle.replace(/'/g, "''")}'!A1:ZZ`,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    }),
  ]);

  // Current snapshot (one row per page)
  const currentRows = (currentResp.data.values || []) as any[][];
  const currentHeaders = (currentRows[0] || []).map((h) => String(h || "").trim());
  const current: any[] = [];
  for (let i = 1; i < currentRows.length; i++) {
    const row = currentRows[i];
    if (!row) continue;
    const find = makePageRowFinder(currentHeaders, row);
    const pageName = find(["page name"]) || find(["page"]);
    if (!pageName || pageName === "-" || pageName === ".") continue;

    const totalReacts = pageTrackerParseNum(find(["total react", "react"]));
    const totalComments = pageTrackerParseNum(find(["total comment", "comment"]));
    const totalShare = pageTrackerParseNum(find(["total share", "share"]));

    current.push({
      pageName,
      pageLink: find(["page link"]),
      currentFollowers: pageTrackerParseNum(find(["current follower", "follower"])),
      totalContent: pageTrackerParseNum(find(["total content"])),
      lastContentLink: find(["last content link"]),
      lastContentDate: find(["last content upload", "upload date"]),
      lastContentViews: pageTrackerParseNum(find(["last contents views", "contents views", "last content view"])),
      totalReacts,
      totalComments,
      totalShare,
      totalEngagement: totalReacts + totalComments + totalShare,
      stakeholder: find(["stake holder", "stakeholder"]) || "Unassigned",
    });
  }

  // Stakeholder lookup so time-series rows can inherit ownership.
  const stakeholderByPage = new Map<string, string>();
  current.forEach((c) => stakeholderByPage.set(c.pageName, c.stakeholder));

  // HISTORY time-series (one row per page per snapshot date)
  const historyRows = (historyResp.data.values || []) as any[][];
  const historyHeaders = (historyRows[0] || []).map((h) => String(h || "").trim());
  const history: any[] = [];
  for (let i = 1; i < historyRows.length; i++) {
    const row = historyRows[i];
    if (!row) continue;
    const find = makePageRowFinder(historyHeaders, row);
    const pageName = find(["page name"]) || find(["page"]);
    const dateRaw = find(["snapshot date", "snapshot", "date"]);
    if (!pageName || !dateRaw) continue;

    const { label, iso } = normalizePageDate(dateRaw);
    const totalReacts = pageTrackerParseNum(find(["total react", "react"]));
    const totalComments = pageTrackerParseNum(find(["total comment", "comment"]));
    const totalShare = pageTrackerParseNum(find(["total share", "share"]));

    history.push({
      snapshotDate: label,
      snapshotIso: iso,
      pageName,
      currentFollowers: pageTrackerParseNum(find(["current follower", "follower"])),
      totalContent: pageTrackerParseNum(find(["total content"])),
      lastContentViews: pageTrackerParseNum(find(["last contents views", "contents views", "last content view"])),
      totalReacts,
      totalComments,
      totalShare,
      totalEngagement: totalReacts + totalComments + totalShare,
      stakeholder: stakeholderByPage.get(pageName) || "Unassigned",
    });
  }

  history.sort((a, b) => (a.snapshotIso < b.snapshotIso ? -1 : a.snapshotIso > b.snapshotIso ? 1 : 0));

  const pages = current.map((c) => c.pageName);
  const dates = Array.from(new Set(history.map((h) => h.snapshotIso))).sort();

  const result = {
    current,
    history,
    pages,
    dates,
    rowCount: current.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: false,
  };

  cache.set(cacheKey, { data: result, timestamp: now });
  return { data: result, cached: false, lastUpdated: result.lastUpdated };
}

// High-fidelity fallback so the dashboard renders even if live access is pending.
function generateFallbackPageTracker() {
  const seed = [
    { pageName: "10MS Express", stakeholder: "Tuhin", startF: 66, endF: 91, startC: 5, endC: 10, views: 35, reacts: 1, comments: 0, share: 0 },
    { pageName: "10MS Insights", stakeholder: "Joy", startF: 108, endF: 110, startC: 13, endC: 15, views: 14, reacts: 1, comments: 0, share: 0 },
    { pageName: "10MS Pulse", stakeholder: "Asif", startF: 14, endF: 17, startC: 5, endC: 7, views: 17, reacts: 1, comments: 0, share: 0 },
    { pageName: "10MS Tales", stakeholder: "Nabi", startF: 7500, endF: 7600, startC: 70, endC: 70, views: 2800, reacts: 92, comments: 1, share: 2 },
    { pageName: "10MS Thrive", stakeholder: "Akash", startF: 24, endF: 28, startC: 2, endC: 6, views: 12, reacts: 3, comments: 0, share: 0 },
  ];

  const dates = ["2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"];
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const history: any[] = [];
  dates.forEach((iso, di) => {
    const t = dates.length > 1 ? di / (dates.length - 1) : 1;
    seed.forEach((s) => {
      const reacts = lerp(0, s.reacts, t);
      const comments = lerp(0, s.comments, t);
      const share = lerp(0, s.share, t);
      history.push({
        snapshotDate: iso,
        snapshotIso: iso,
        pageName: s.pageName,
        currentFollowers: lerp(s.startF, s.endF, t),
        totalContent: lerp(s.startC, s.endC, t),
        lastContentViews: lerp(0, s.views, t),
        totalReacts: reacts,
        totalComments: comments,
        totalShare: share,
        totalEngagement: reacts + comments + share,
        stakeholder: s.stakeholder,
      });
    });
  });

  const current = seed.map((s) => ({
    pageName: s.pageName,
    pageLink: "",
    currentFollowers: s.endF,
    totalContent: s.endC,
    lastContentLink: "",
    lastContentDate: dates[dates.length - 1],
    lastContentViews: s.views,
    totalReacts: s.reacts,
    totalComments: s.comments,
    totalShare: s.share,
    totalEngagement: s.reacts + s.comments + s.share,
    stakeholder: s.stakeholder,
  }));

  return {
    current,
    history,
    pages: current.map((c) => c.pageName),
    dates,
    rowCount: current.length,
    lastUpdated: new Date().toISOString(),
    isMockFallback: true,
  };
}

const pageTrackerHandler = async (req: express.Request, res: express.Response) => {
  const force = req.query.force === "true";
  try {
    const result = await fetchPageTrackerData(force);
    if (!result.data || result.data.current.length === 0) {
      const fallback = generateFallbackPageTracker();
      return res.json({ data: fallback, cached: false, lastUpdated: fallback.lastUpdated });
    }
    res.json(result);
  } catch (error: any) {
    console.warn("Page Tracker live fetch error, serving fallback:", error.message);
    const fallback = generateFallbackPageTracker();
    res.json({
      data: fallback,
      cached: false,
      lastUpdated: fallback.lastUpdated,
      permissionNotice: {
        message: "Google Sheets Live Access Pending: Add the service account email as Viewer to the Content Tracker sheet",
        serviceAccount: SERVICE_ACCOUNT_EMAIL,
        spreadsheetId: PAGE_TRACKER_SPREADSHEET_ID,
        error: error.message,
      },
    });
  }
};

app.get("/api/sheets/pagetracker", pageTrackerHandler);
app.get("/sheets/pagetracker", pageTrackerHandler);

// Clear cache
const clearCacheHandler = (req: express.Request, res: express.Response) => {
  cache.clear();
  res.json({ status: "cache cleared", timestamp: new Date().toISOString() });
};

app.post("/api/sheets/clear-cache", clearCacheHandler);
app.post("/sheets/clear-cache", clearCacheHandler);

// Global Express Error Handler to prevent raw crashes on Vercel
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Handler caught an uncaught exception:", err);
  res.status(500).json({
    success: false,
    error: err.message || "An internal server error occurred in the serverless function.",
    suggestions: [
      "Check your environment variable syntax in Vercel.",
      "Ensure the private key starts with '-----BEGIN PRIVATE KEY-----' and ends with '-----END PRIVATE KEY-----'.",
    ],
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Command Center server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
export { app };

// In serverless environments like Vercel, the app is exported as a handler.
// In standard container/local environments, start the listener.
if (process.env.VERCEL !== "1" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

