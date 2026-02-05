export type TaskCategory =
  | "URGENT"
  | "WEEKLY"
  | "COLLAB"
  | "HOLD_FIX"
  | "PERSONAL"
  | "STOCK";

export type CollabStatus = "REQUESTED" | "IN_PROGRESS" | "COMPLETED";

export interface CollabDetails {
  trackProducer: string;
  topLiner: string;
  targetArtist: string;
  deadline: string;
  status: CollabStatus;
  mixMonitorSent?: boolean;
}

export interface HoldFixDetails {
  type: "HOLD" | "FIX" | "RELEASE";
  demoName: string;
  writers: string[];
  splits: Record<string, number>;
  publishingInfo: string;
  email: string;
  productionFee?: number;
  holdRequestedDate?: string;
  holdPeriod?: string;
  manager?: string;
  releaseDate?: string;
}

export interface StockDetails {
  ticker: string;
  relatedNewsTitle: string;
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
  isStarred?: boolean;
  collabDetails?: CollabDetails;
  holdFixDetails?: HoldFixDetails;
  stockDetails?: StockDetails;
  googleEventId?: string;
  lastSyncedAt?: string;
}
