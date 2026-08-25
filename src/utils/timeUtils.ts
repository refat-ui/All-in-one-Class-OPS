/**
 * Time utility functions for Bangladesh Standard Time (BST, UTC+06:00)
 * and schedule timeline calculations.
 */

export interface BSTTimeObject {
  dateObj: Date;
  iso: string;
  clock24: string; // e.g. "15:24:08"
  clock12: string; // e.g. "03:24 PM"
  shortTime: string; // e.g. "15:24"
  decimal: number; // e.g. 15.4
  dayName: string; // e.g. "Monday"
  formattedDate: string; // e.g. "17 Aug 2026"
  fullDisplay: string;
}

/**
 * Returns current Bangladesh Standard Time (BST, UTC+6) or calculates simulated BST.
 */
export function getCurrentBSTTime(simulatedHour: number | null = null): BSTTimeObject {
  const now = new Date();

  // Calculate real BST date (UTC + 6 hours)
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const bstOffsetMs = 6 * 60 * 60 * 1000;
  const bstDate = new Date(utcTime + bstOffsetMs);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // If simulation hour is provided (e.g. 16.5 for 4:30 PM)
  if (simulatedHour !== null && simulatedHour >= 0 && simulatedHour < 24) {
    const totalSeconds = Math.round(simulatedHour * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    bstDate.setHours(hours, minutes, seconds, 0);

    const hStr = String(hours).padStart(2, "0");
    const mStr = String(minutes).padStart(2, "0");
    const sStr = String(seconds).padStart(2, "0");

    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    const clock12 = `${String(hour12).padStart(2, "0")}:${mStr}:${sStr} ${ampm}`;

    const dayName = days[bstDate.getDay()];
    const formattedDate = `${bstDate.getDate()} ${months[bstDate.getMonth()]} ${bstDate.getFullYear()}`;

    return {
      dateObj: bstDate,
      iso: bstDate.toISOString(),
      clock24: `${hStr}:${mStr}:${sStr}`,
      clock12,
      shortTime: `${hStr}:${mStr}`,
      decimal: simulatedHour,
      dayName,
      formattedDate,
      fullDisplay: `${formattedDate}, ${clock12} BST`,
    };
  }

  const hours = bstDate.getHours();
  const minutes = bstDate.getMinutes();
  const seconds = bstDate.getSeconds();

  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  const clock12 = `${String(hour12).padStart(2, "0")}:${mStr}:${sStr} ${ampm}`;

  const dayName = days[bstDate.getDay()];
  const formattedDate = `${bstDate.getDate()} ${months[bstDate.getMonth()]} ${bstDate.getFullYear()}`;

  return {
    dateObj: bstDate,
    iso: bstDate.toISOString(),
    clock24: `${hStr}:${mStr}:${sStr}`,
    clock12,
    shortTime: `${hStr}:${mStr}`,
    decimal: hours + minutes / 60 + seconds / 3600,
    dayName,
    formattedDate,
    fullDisplay: `${formattedDate}, ${clock12} BST`,
  };
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for BST time with optional day offset.
 * e.g., offsetDays = 0 for Today, 1 for Tomorrow, -1 for Yesterday.
 */
export function getBSTDateIso(offsetDays = 0): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const bstOffsetMs = (6 * 60 * 60 * 1000) + (offsetDays * 24 * 60 * 60 * 1000);
  const bstDate = new Date(utcTime + bstOffsetMs);

  const yyyy = bstDate.getFullYear();
  const mm = String(bstDate.getMonth() + 1).padStart(2, "0");
  const dd = String(bstDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses time string like "3:00 PM - 4:30 PM", "15:00-16:30", "3.00 PM - 4.30 PM", "7:30 PM"
 * Returns start and end in decimal hours (e.g. 15.0 to 16.5).
 */
export function parseTimeToDecimalRange(timeStr?: string): { start: number; end: number; duration: number } | null {
  if (!timeStr || typeof timeStr !== "string") return null;

  const clean = timeStr.trim();
  if (!clean) return null;

  // Split by hyphen, en-dash, em-dash, to
  const parts = clean.split(/[-–—]|to/i).map((s) => s.trim());

  if (parts.length >= 2) {
    const start = parseSingleTimeToDecimal(parts[0]);
    let end = parseSingleTimeToDecimal(parts[1]);

    if (start !== null) {
      if (end === null || end <= start) {
        // Default duration 1.5 hours if end is missing or invalid
        end = start + 1.5;
      }
      return { start, end, duration: Math.max(0.5, end - start) };
    }
  } else if (parts.length === 1) {
    const start = parseSingleTimeToDecimal(parts[0]);
    if (start !== null) {
      return { start, end: start + 1.5, duration: 1.5 };
    }
  }

  return null;
}

/**
 * Parses single time token like "3:00 PM", "15:30", "3.30 PM", "7 PM" to decimal hour (0 - 24)
 */
export function parseSingleTimeToDecimal(token: string): number | null {
  if (!token) return null;
  const str = token.trim();

  // Check 12-hour AM/PM format
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);

  // Extract digits and colon/dot
  const match = str.match(/(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (isPM && hour < 12) {
    hour += 12;
  } else if (isAM && hour === 12) {
    hour = 0;
  } else if (!isPM && !isAM && hour >= 1 && hour <= 11) {
    // If no AM/PM is specified and hour is 1-11, check typical live class afternoon/evening schedule
    // Live studio classes at 10MS typically run between 12:00 PM and 11:00 PM
    if (hour >= 1 && hour <= 11) {
      hour += 12;
    }
  }

  return hour + minutes / 60;
}

/**
 * Format decimal hour (e.g. 15.5) to formatted string (e.g. "3:30 PM", "3:30:15 PM" or "15:30:15")
 */
export function formatDecimalToTime(decimal: number, use12Hour = true, includeSeconds = false): string {
  const normalized = ((decimal % 24) + 24) % 24;
  const totalSeconds = Math.round(normalized * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (use12Hour) {
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? "PM" : "AM";
    if (includeSeconds) {
      return `${hour12}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${ampm}`;
    }
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  if (includeSeconds) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type PrimeTimeSlot = "all" | "4:30 PM" | "6:30 PM" | "8:30 PM";

/**
 * Checks whether a class schedule falls within or covers a prime time slot (4:30 PM, 6:30 PM, 8:30 PM)
 * or matches All Day.
 */
export function isClassInPrimeSlot(scheduledTimeStr?: string, slot: PrimeTimeSlot = "all"): boolean {
  if (!slot || slot === "all") return true;
  if (!scheduledTimeStr) return false;

  const parsed = parseTimeToDecimalRange(scheduledTimeStr);
  if (!parsed) {
    const clean = scheduledTimeStr.toLowerCase();
    if (slot === "4:30 PM") {
      return (
        clean.includes("4:30") ||
        clean.includes("4.30") ||
        clean.includes("16:30") ||
        clean.includes("4:00") ||
        clean.includes("4.00")
      );
    }
    if (slot === "6:30 PM") {
      return (
        clean.includes("6:30") ||
        clean.includes("6.30") ||
        clean.includes("18:30") ||
        clean.includes("6:00") ||
        clean.includes("6.00")
      );
    }
    if (slot === "8:30 PM") {
      return (
        clean.includes("8:30") ||
        clean.includes("8.30") ||
        clean.includes("20:30") ||
        clean.includes("8:00") ||
        clean.includes("8.00")
      );
    }
    return true;
  }

  let targetDecimal = 0;
  if (slot === "4:30 PM") targetDecimal = 16.5; // 4:30 PM
  else if (slot === "6:30 PM") targetDecimal = 18.5; // 6:30 PM
  else if (slot === "8:30 PM") targetDecimal = 20.5; // 8:30 PM
  else return true;

  // Active during this slot time (e.g. 4:00-5:30 covers 4:30; 4:30-6:00 covers 4:30; 3:00-4:30 covers 4:30)
  return (
    (parsed.start <= targetDecimal + 0.05 && parsed.end >= targetDecimal - 0.05) ||
    Math.abs(parsed.start - targetDecimal) <= 0.5
  );
}

/**
 * Normalizes various raw date formats from Google Sheets into standard ISO date and display label.
 * Handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, month text, Bengali numerals, and Excel serial numbers.
 * Defaults empty/missing dates to Today (2026-08-17).
 */
export function normalizeDateStr(raw?: string | number): {
  iso: string;
  label: string;
  raw: string;
  dayOfWeek: string;
  dateObj: Date | null;
} {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return {
      iso: "",
      label: "",
      raw: "",
      dayOfWeek: "",
      dateObj: null,
    };
  }

  let str = String(raw).trim();

  // Convert Bengali numerals to English
  const bengaliNums: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  };
  str = str.replace(/[০-৯]/g, (w) => bengaliNums[w] || w);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Handle Excel serial date number (e.g. 46251)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      return {
        iso,
        label: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`,
        raw: str,
        dayOfWeek: fullDays[d.getDay()],
        dateObj: d,
      };
    }
  }

  // Remove weekday names anywhere in the string (Monday, Tuesday, etc.)
  const weekdays = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "mon", "tue", "wed", "thu", "fri", "sat", "sun"
  ];
  let cleaned = str;
  for (const wd of weekdays) {
    const reg = new RegExp(`\\b${wd}\\b,?`, "gi");
    cleaned = cleaned.replace(reg, " ");
  }
  cleaned = cleaned.replace(/,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "").trim();

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      return {
        iso,
        label: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`,
        raw: str,
        dayOfWeek: fullDays[d.getDay()],
        dateObj: d,
      };
    }
  }

  // Try standard Date parsing directly
  const d = new Date(cleaned);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2035) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    return {
      iso,
      label: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`,
      raw: str,
      dayOfWeek: fullDays[d.getDay()],
      dateObj: d,
    };
  }

  // Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    // Check if format is MM/DD/YYYY instead
    if (month > 11 && day <= 12) {
      const temp = day;
      day = month + 1;
      month = temp - 1;
    }

    const dObj = new Date(year, month, day);
    if (!isNaN(dObj.getTime())) {
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dObj.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      return {
        iso,
        label: `${days[dObj.getDay()]}, ${months[dObj.getMonth()]} ${dObj.getDate()}`,
        raw: str,
        dayOfWeek: fullDays[dObj.getDay()],
        dateObj: dObj,
      };
    }
  }

  // Fallback: unable to parse as a valid date
  return {
    iso: "",
    label: str,
    raw: str,
    dayOfWeek: "",
    dateObj: null,
  };
}
