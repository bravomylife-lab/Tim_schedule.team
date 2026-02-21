"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  addDays,
  subDays,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { sampleTasks } from "@/lib/sampleData";
import {
  TimTask,
  PitchingIdea,
  PitchingGrade,
  HoldFixType,
  GoogleEventSnapshot,
} from "@/types/tim";
import { classifyWithGemini } from "@/lib/gemini";

const LS_TASKS = "tim_tasks";
const LS_DELETED_IDS = "tim_deleted_google_ids";
const LS_PITCHING = "tim_pitching_ideas";
const LS_SNAPSHOTS = "tim_google_snapshots";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full
  }
}

interface TaskContextType {
  tasks: TimTask[];
  pitchingIdeas: PitchingIdea[];
  setTasks: React.Dispatch<React.SetStateAction<TimTask[]>>;
  deleteTask: (id: string) => void;
  addTask: (task: TimTask) => void;
  updateTask: (id: string, updates: Partial<TimTask>) => void;
  toggleStar: (id: string) => void;
  moveHoldFixType: (taskId: string, newType: HoldFixType) => void;
  moveToPitching: (taskId: string, grade: PitchingGrade) => void;
  addPitchingIdea: (idea: Omit<PitchingIdea, "id" | "createdAt">) => void;
  updatePitchingIdea: (id: string, updates: Partial<PitchingIdea>) => void;
  deletePitchingIdea: (id: string) => void;
  movePitchingGrade: (id: string, grade: PitchingGrade) => void;
  dismissCalendarModified: (taskId: string) => void;
  syncWithGoogleEvents: (googleEvents: any[]) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TimTask[]>([]);
  const [pitchingIdeas, setPitchingIdeas] = useState<PitchingIdea[]>([]);
  const [deletedGoogleEventIds, setDeletedGoogleEventIds] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, GoogleEventSnapshot>>({});
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedTasks = loadJSON<TimTask[]>(LS_TASKS, []);
    const storedPitching = loadJSON<PitchingIdea[]>(LS_PITCHING, []);
    const storedDeleted = loadJSON<string[]>(LS_DELETED_IDS, []);
    const storedSnapshots = loadJSON<Record<string, GoogleEventSnapshot>>(LS_SNAPSHOTS, {});

    setTasks(storedTasks.length > 0 ? storedTasks : sampleTasks);
    setPitchingIdeas(storedPitching);
    setDeletedGoogleEventIds(storedDeleted);
    setSnapshots(storedSnapshots);
    setInitialized(true);
  }, []);

  // Persist tasks
  useEffect(() => {
    if (initialized) saveJSON(LS_TASKS, tasks);
  }, [tasks, initialized]);

  useEffect(() => {
    if (initialized) saveJSON(LS_PITCHING, pitchingIdeas);
  }, [pitchingIdeas, initialized]);

  useEffect(() => {
    if (initialized) saveJSON(LS_DELETED_IDS, deletedGoogleEventIds);
  }, [deletedGoogleEventIds, initialized]);

  useEffect(() => {
    if (initialized) saveJSON(LS_SNAPSHOTS, snapshots);
  }, [snapshots, initialized]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task?.googleEventId) {
        setDeletedGoogleEventIds((cur) => {
          if (cur.includes(task.googleEventId!)) return cur;
          return [...cur, task.googleEventId!];
        });
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addTask = useCallback((task: TimTask) => {
    setTasks((prev) => [...prev, { ...task, userEdited: true }]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<TimTask>) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...updates, userEdited: true, calendarModified: false } : t
      )
    );
  }, []);

  const toggleStar = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isStarred: !t.isStarred } : t))
    );
  }, []);

  const moveHoldFixType = useCallback((taskId: string, newType: HoldFixType) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId && t.holdFixDetails
          ? { ...t, holdFixDetails: { ...t.holdFixDetails, type: newType } }
          : t
      )
    );
  }, []);

  const moveToPitching = useCallback(
    (taskId: string, grade: PitchingGrade) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task) return prev;

        const demoName = task.collabDetails?.trackName
          || task.collabDetails?.songName
          || task.title;

        const writers = [
          task.collabDetails?.trackProducer,
          task.collabDetails?.topLiner,
        ]
          .filter(Boolean)
          .filter((w) => w !== "TBD") as string[];

        const idea: PitchingIdea = {
          id: `pitch-${Date.now()}`,
          demoName,
          writers,
          publishingInfo: task.collabDetails?.publishingInfo || "",
          grade,
          sourceCollabId: taskId,
          createdAt: new Date().toISOString(),
          notes: task.collabDetails?.notes || undefined,
        };

        setPitchingIdeas((cur) => {
          // Deduplicate: if already exists for this collab, just update grade
          const existingIdx = cur.findIndex((p) => p.sourceCollabId === taskId);
          if (existingIdx >= 0) {
            const updated = [...cur];
            updated[existingIdx] = { ...updated[existingIdx], grade };
            return updated;
          }
          return [...cur, idea];
        });

        // Remove from collab list after moving to pitching
        return prev.filter((t) => t.id !== taskId);
      });
    },
    []
  );

  const addPitchingIdea = useCallback(
    (idea: Omit<PitchingIdea, "id" | "createdAt">) => {
      setPitchingIdeas((prev) => [
        ...prev,
        { ...idea, id: `pitch-${Date.now()}`, createdAt: new Date().toISOString() },
      ]);
    },
    []
  );

  const updatePitchingIdea = useCallback((id: string, updates: Partial<PitchingIdea>) => {
    setPitchingIdeas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePitchingIdea = useCallback((id: string) => {
    setPitchingIdeas((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const movePitchingGrade = useCallback((id: string, grade: PitchingGrade) => {
    setPitchingIdeas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, grade } : p))
    );
  }, []);

  const dismissCalendarModified = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, calendarModified: false } : t))
    );
  }, []);

  // ---------- Classification ----------

  const classifyByKeywords = useCallback((text: string) => {
    const normalized = text.toLowerCase();
    const matches = (kws: string[]) => kws.some((k) => normalized.includes(k));

    if (matches(["협업", "collab", "collaboration", "cowrite", "co-write"])) {
      return "COLLAB" as const;
    }
    if (matches(["홀드", "hold", "픽스", "fix"])) {
      return "HOLD_FIX" as const;
    }
    if (
      matches([
        "개인", "운동", "월세", "금전", "세금", "비용", "법인",
        "대출", "카드", "보험", "재무", "레슨", "세무사", "빌리",
        "갚", "브라보팝", "app", "테스트", "youtube", "유투브",
        "메모장", "목표", "단기", "중기", "연간", "계획", "루틴",
        "건강", "취미", "독서", "정리",
      ])
    ) {
      return "PERSONAL" as const;
    }

    const strongStock = [
      "주식", "증권", "주가", "실적", "매출", "배당", "ipo",
      "earnings", "ticker", "nasdaq", "kospi", "kosdaq", "finance",
      "에어쇼", "airshow", "복기", "맥점", "매매",
      "고용보고서", "non-farm", "payrolls", "올림픽",
      "cpi", "ppi", "fomc", "gdp", "금리", "인플레이션",
      "etf", "펀드", "리밸런싱", "포트폴리오", "차트",
    ];
    const weakStock = [
      "수익", "미국", "고용", "msci", "tsmc", "엔비디아",
      "물가", "소비자", "발표", "개최", "수익률",
    ];
    const musicKws = [
      "희선", "대표님", "a&r", "보고", "솔로앨범", "마감",
      "피드백", "작가", "lead", "송캠프", "타이틀곡", "수급",
      "음악", "song", "demo", "track", "topline", "mix",
      "master", "session", "vocal", "writer", "release",
      "발매", "작곡", "작사", "리스닝", "싱글", "앨범",
    ];

    if (matches(strongStock) || (matches(weakStock) && !matches(musicKws))) {
      return "STOCK" as const;
    }
    if (matches(musicKws)) {
      return "MUSIC" as const;
    }
    return null;
  }, []);

  const extractTicker = useCallback((text: string) => {
    const match = text.match(/\b[A-Z]{2,5}\b/);
    return match?.[0] ?? undefined;
  }, []);

  const buildHoldFixDetails = useCallback((title: string, startDate: string, aiDetails?: any) => {
    const lower = title.toLowerCase();
    const type: HoldFixType =
      aiDetails?.holdFixType ??
      (lower.includes("release") || title.includes("발매")
        ? "RELEASE"
        : lower.includes("fix") || title.includes("픽스")
        ? "FIX"
        : "HOLD");

    const writers: string[] = [];
    const splits: Record<string, number> = {};
    if (aiDetails?.writers && Array.isArray(aiDetails.writers)) {
      aiDetails.writers.forEach((w: { name: string; split?: number }) => {
        writers.push(w.name);
        if (w.split) splits[w.name] = w.split;
      });
    }

    return {
      type,
      demoName: aiDetails?.demoName || aiDetails?.songName || title,
      writers,
      splits,
      publishingInfo: aiDetails?.publishingInfo || "",
      email: "",
      holdRequestedDate: startDate,
      targetArtist: aiDetails?.targetArtist || aiDetails?.artist || "",
      notes: aiDetails?.notes || "",
    };
  }, []);

  const buildCollabDetails = useCallback((title: string, startDate: string, aiDetails?: any) => {
    return {
      trackName: aiDetails?.trackName || title,
      songName: aiDetails?.songName || aiDetails?.demoName || "",
      trackProducer: aiDetails?.trackProducer || "TBD",
      topLiner: aiDetails?.topLiner || "TBD",
      targetArtist: aiDetails?.targetArtist || aiDetails?.artist || "TBD",
      deadline: startDate,
      requestedDate: aiDetails?.requestedDate || startDate,
      status: "REQUESTED" as const,
      notes: aiDetails?.notes || "",
      publishingInfo: aiDetails?.publishingInfo || aiDetails?.publishingCompany || "",
    };
  }, []);

  const buildStockDetails = useCallback((title: string, ticker?: string) => {
    return { ticker: ticker || "STOCK", note: "" };
  }, []);

  // ---------- Smart Sync ----------

  const syncWithGoogleEvents = useCallback(
    async (googleEvents: any[]) => {
      const today = new Date();
      const syncStart = startOfDay(subDays(today, 5));
      const syncEnd = endOfDay(addDays(today, 14));
      const googleEventIds = new Set(googleEvents.map((e: any) => e.id));

      const newSnapshots: Record<string, GoogleEventSnapshot> = {};
      googleEvents.forEach((e: any) => {
        const gDate = e.start?.dateTime || e.start?.date || "";
        newSnapshots[e.id] = {
          id: e.id,
          title: e.summary || "",
          description: e.description || "",
          startDate: gDate,
        };
      });

      const classificationResults = await Promise.all(
        googleEvents.map(async (gEvent: any) => {
          const gTitle = gEvent.summary || "(No Title)";
          const gDesc = gEvent.description || "";
          const combined = `${gTitle}\n${gDesc}`;
          const keywordCategory = classifyByKeywords(combined);
          try {
            const modelResult = await classifyWithGemini(gTitle, gDesc);
            const modelCategory = (modelResult?.category as TimTask["category"]) ?? "MUSIC";
            return {
              id: gEvent.id,
              title: gTitle,
              description: gDesc,
              category: keywordCategory ?? modelCategory,
              summary: modelResult?.summary ?? gTitle,
              subCategory: modelResult?.subCategory,
              aiDetails: modelResult,
            };
          } catch {
            return {
              id: gEvent.id,
              title: gTitle,
              description: gDesc,
              category: keywordCategory ?? ("MUSIC" as const),
              summary: gTitle,
            };
          }
        })
      );

      setTasks((prevTasks) => {
        const tasksToKeep = prevTasks.filter((task) => {
          if (!task.googleEventId) return true;
          try {
            const taskDate = parseISO(task.startDate);
            const inRange = isWithinInterval(taskDate, { start: syncStart, end: syncEnd });
            if (inRange && !googleEventIds.has(task.googleEventId)) return false;
          } catch { /* keep */ }
          return true;
        });

        const updatedTasks = [...tasksToKeep];

        googleEvents.forEach((gEvent: any) => {
          if (deletedGoogleEventIds.includes(gEvent.id)) return;

          const existingIdx = updatedTasks.findIndex((t) => t.googleEventId === gEvent.id);
          const gDate = gEvent.start?.dateTime || gEvent.start?.date;
          const gEndDate = gEvent.end?.dateTime || gEvent.end?.date;
          if (!gDate) return;

          const classification = classificationResults.find((c) => c.id === gEvent.id);
          const rawCategory = classification?.category ?? "MUSIC";
          const category = rawCategory === "MUSIC" ? "WEEKLY" : (rawCategory as TimTask["category"]);
          const fallbackTicker = extractTicker(
            `${classification?.title ?? ""} ${classification?.description ?? ""}`
          );

          if (existingIdx >= 0) {
            const existing = updatedTasks[existingIdx];
            if (existing.userEdited) return;

            // If task already has collab or holdfix details, preserve them
            const hasExistingDetails = existing.collabDetails || existing.holdFixDetails;
            if (hasExistingDetails) {
              // Only update sync metadata, don't touch content
              updatedTasks[existingIdx] = {
                ...existing,
                lastSyncedAt: new Date().toISOString(),
                endDate: gEndDate || existing.endDate,
              };
              return;
            }

            const oldSnap = snapshots[gEvent.id];
            const gTitle = gEvent.summary || "(No Title)";
            const gDesc = gEvent.description || "";
            const changed = oldSnap && (
              oldSnap.title !== gTitle || oldSnap.description !== gDesc || oldSnap.startDate !== gDate
            );

            const ai = (classification as any)?.aiDetails;
            updatedTasks[existingIdx] = {
              ...existing,
              title: gTitle,
              description: gDesc,
              startDate: gDate,
              endDate: gEndDate || undefined,
              category,
              subCategory: classification?.subCategory as TimTask["subCategory"],
              lastSyncedAt: new Date().toISOString(),
              calendarModified: !!changed,
              collabDetails: category === "COLLAB"
                ? existing.collabDetails ?? buildCollabDetails(gTitle, gDate, ai)
                : existing.collabDetails,
              holdFixDetails: category === "HOLD_FIX"
                ? existing.holdFixDetails ?? buildHoldFixDetails(gTitle, gDate, ai)
                : existing.holdFixDetails,
              stockDetails: category === "STOCK"
                ? existing.stockDetails ?? buildStockDetails(gTitle, ai?.ticker ?? fallbackTicker)
                : existing.stockDetails,
            };
          } else {
            const gTitle = classification?.title ?? gEvent.summary ?? "(No Title)";
            const ai = (classification as any)?.aiDetails;
            updatedTasks.push({
              id: `google-${gEvent.id}`,
              title: gTitle,
              description: classification?.description ?? gEvent.description ?? "",
              startDate: gDate,
              endDate: gEndDate || undefined,
              category,
              googleEventId: gEvent.id,
              subCategory: classification?.subCategory as TimTask["subCategory"],
              lastSyncedAt: new Date().toISOString(),
              collabDetails: category === "COLLAB" ? buildCollabDetails(gTitle, gDate, ai) : undefined,
              holdFixDetails: category === "HOLD_FIX" ? buildHoldFixDetails(gTitle, gDate, ai) : undefined,
              stockDetails: category === "STOCK"
                ? buildStockDetails(gTitle, ai?.ticker ?? fallbackTicker)
                : undefined,
            });
          }
        });

        updatedTasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        return updatedTasks;
      });

      setSnapshots(newSnapshots);
    },
    [buildCollabDetails, buildHoldFixDetails, buildStockDetails, classifyByKeywords, deletedGoogleEventIds, extractTicker, snapshots]
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        pitchingIdeas,
        setTasks,
        deleteTask,
        addTask,
        updateTask,
        toggleStar,
        moveHoldFixType,
        moveToPitching,
        addPitchingIdea,
        updatePitchingIdea,
        deletePitchingIdea,
        movePitchingGrade,
        dismissCalendarModified,
        syncWithGoogleEvents,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}
