export type TaskCategory =
  | "URGENT"
  | "WEEKLY"
  | "COLLAB"
  | "HOLD_FIX"
  | "PERSONAL"
  | "STOCK";

export type CollabStatus = "REQUESTED" | "IN_PROGRESS" | "COMPLETED";

export type HoldFixType = "HOLD" | "FIX" | "RELEASE";

export type PitchingGrade = "S" | "A" | "A_JPN";

export type Currency = "KRW" | "USD" | "EUR";

export interface CollabDetails {
  trackName?: string;
  songName?: string;
  trackProducer: string;
  topLiner: string;
  targetArtist: string;
  deadline: string;
  requestedDate?: string;
  status: CollabStatus;
  mixMonitorSent?: boolean;
  notes?: string;
  publishingInfo?: string;
}

export interface HoldFixDetails {
  type: HoldFixType;
  demoName: string;
  writers: string[];
  splits: Record<string, number>;
  publishingInfo: string;
  email: string;
  productionFee?: number;
  currency?: Currency;
  holdRequestedDate?: string;
  holdPeriod?: string;
  releaseDate?: string;
  fixDate?: string;
  targetArtist?: string;
  notes?: string;
}

export interface PitchingIdea {
  id: string;
  demoName: string;
  writers: string[];
  publishingInfo: string;
  grade: PitchingGrade;
  sourceCollabId?: string;
  createdAt: string;
  notes?: string;
}

export interface StockDetails {
  ticker: string;
  relatedNewsTitle?: string;
  relatedNewsUrl?: string;
  note: string;
}

export interface TimTask {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  category: TaskCategory;
  subCategory?: "YOUTUBE" | "AUTOMATION" | "GENERAL";
  isStarred?: boolean;
  collabDetails?: CollabDetails;
  holdFixDetails?: HoldFixDetails;
  stockDetails?: StockDetails;
  googleEventId?: string;
  lastSyncedAt?: string;
  calendarModified?: boolean;
  userEdited?: boolean;
}

export interface GoogleEventSnapshot {
  id: string;
  title: string;
  description: string;
  startDate: string;
}
