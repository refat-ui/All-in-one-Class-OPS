export interface DaywiseClassRecord {
  _rowIndex: number;
  date: string;
  scheduledTime: string;
  entryTime: string;
  slideQacTime: string;
  classStartTime: string;
  productType: string;
  course: string;
  subject: string;
  topic: string;
  teacher1: string;
  teacher2: string;
  teacher3: string;
  studio: string;
  studioCoordinator: string;
  opsStakeholder: string;
  lectureSlideStatus: string;
  streamTitle: string;
  streamCaption: string;
  crossPost: string;
  sourcePlatform: string;
  zoomLink: string;
  zoomCreds: string;
  fbModLink: string;
  annotatedSlideLink: string;
  stopTimestamps: string;
  delayMinutes: number;
  totalDuration: number;
  viewCount10m: number | string;
  viewCountMid: number | string;
  viewCountEnd: number | string;
  highestAttendance: number;
  averageAttendance: number;
  totalComments: number;
  classLink: string;
  zoomObsRecording: string;
  qacFeedback: string;
  endTime: string;
  status: "Completed" | "Ongoing" | "Upcoming" | "Delayed" | "Cancelled" | "Error";
}

export interface CentralClassRecord {
  _rowIndex: number;
  date: string;
  parsedDate: string; // YYYY-MM-DD
  month: string;
  scheduledTime: string;
  entryTime: string;
  slideQacTime: string;
  classStartTime: string;
  productType: string;
  course: string;
  subject: string;
  topic: string;
  teacher1: string;
  teacher2: string;
  teacher3: string;
  studio: string;
  studioCoordinator: string;
  opsStakeholder: string;
  lectureSlideStatus: string;
  streamTitle: string;
  streamCaption: string;
  sourcePlatform: string;
  annotatedSlideLink: string;
  stopTimestamps: string;
  delayMinutes: number;
  totalDuration: number;
  viewCount10m: number;
  viewCountMid: number;
  viewCountEnd: number;
  highestAttendance: number;
  averageAttendance: number;
  totalComments: number;
  classLink: string;
  zoomObsRecording: string;
  qacFeedback: string;
  endTime: string;
  status: "Completed" | "Delayed" | "Cancelled" | "Error" | "Scheduled";
}

export interface ContentRunSheetRecord {
  _rowIndex: number;
  id: string;
  title: string;
  editor: string;
  contentType: string;
  platform: string;
  priority?: "P0 - Urgent" | "P1 - High" | "P2 - Medium" | "P3 - Low" | string;
  status: "Completed" | "In Editing" | "Ready for Review" | "Scripting" | "Approved" | "Published" | "Overdue" | "Pending" | "Uploaded" | "Edited" | string;
  category?: string;
  assignedDate?: string;
  dueDate?: string;
  completedDate?: string;
  durationSec?: number;
  reviewer?: string;
  driveLink: string;
  feedback?: string;
  views?: number;
  reactions?: number;
  comments?: number;
  fixesFixed?: boolean;
  month?: string;
  rawClip?: string;
  teacherName?: string;
  withoutBgmLink?: string;
  caption?: string;
  uploadedDate?: string;
  uploadedTime?: string;
  uploadedLink?: string;
  groupViews?: number;
  pageViews?: number;
}

// Facebook Page Analytics — current snapshot (one row per page)
export interface PageTrackerRecord {
  pageName: string;
  pageLink: string;
  currentFollowers: number;
  totalContent: number;
  lastContentLink: string;
  lastContentDate: string;
  lastContentViews: number;
  totalReacts: number;
  totalComments: number;
  totalShare: number;
  totalEngagement: number;
  stakeholder: string;
}

// Facebook Page Analytics — daily time-series (one row per page per snapshot date)
export interface PageHistoryRecord {
  snapshotDate: string;
  snapshotIso: string;
  pageName: string;
  currentFollowers: number;
  totalContent: number;
  lastContentViews: number;
  totalReacts: number;
  totalComments: number;
  totalShare: number;
  totalEngagement: number;
  stakeholder: string;
}

export interface SheetFetchResult<T> {
  data: {
    headers: string[];
    records: T[];
    rowCount: number;
    lastUpdated: string;
  };
  cached: boolean;
  lastUpdated: string;
}

export interface DashboardFilterState {
  search: string;
  date: string;
  month: string;
  studio: string;
  teacher: string;
  course: string;
  subject: string;
  productType: string;
  status: string;
  coordinator: string;
  editor: string;
  contentType: string;
  priority: string;
  platform: string;
}
