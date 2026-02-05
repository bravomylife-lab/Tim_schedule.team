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
import { TimTask } from "@/types/tim";
import { classifyWithGemini } from "@/lib/gemini";

const LOCAL_STORAGE_KEY = "tim_deleted_google_ids";

interface TaskContextType {
  tasks: TimTask[];
  setTasks: React.Dispatch<React.SetStateAction<TimTask[]>>;
  deleteTask: (id: string) => void;
  syncWithGoogleEvents: (googleEvents: any[]) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TimTask[]>(sampleTasks);
  const [deletedGoogleEventIds, setDeletedGoogleEventIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setDeletedGoogleEventIds(parsed);
      }
    } catch (error) {
      console.error("Failed to parse deleted Google event IDs", error);
    }
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const taskToDelete = prev.find((task) => task.id === id);
      const googleEventId = taskToDelete?.googleEventId;

      if (googleEventId) {
        setDeletedGoogleEventIds((current) => {
          const nextDeletedIds = current.includes(googleEventId)
            ? current
            : [...current, googleEventId];
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextDeletedIds));
          return nextDeletedIds;
        });
      }

      return prev.filter((task) => task.id !== id);
    });
  }, []);

  const classifyByKeywords = useCallback((text: string) => {
    const normalized = text.toLowerCase();

    const matches = (keywords: string[]) =>
      keywords.some((keyword) => normalized.includes(keyword));

    const strongStockKeywords = [
      "주식",
      "증권",
      "주가",
      "실적",
      "매출",
      "배당",
      "ipo",
      "earnings",
      "ticker",
      "nasdaq",
      "kospi",
      "kosdaq",
      "finance",
    ];

    const weakStockKeywords = [
      "수익",
      "미국",
      "고용",
      "msci",
      "tsmc",
      "엔비디아",
      "물가",
      "소비자",
      "발표",
      "개최",
    ];

    const musicKeywords = [
      "음악",
      "a&r",
      "song",
      "demo",
      "track",
      "topline",
      "mix",
      "master",
      "session",
      "vocal",
      "writer",
      "release",
      "발매",
      "작곡",
      "작사",
      "송캠프",
      "리스닝",
      "싱글",
      "앨범",
      "피드백",
    ];

    if (
      matches([
        "개인",
        "운동",
        "월세",
        "금전",
        "금전적",
        "세금",
        "비용",
        "법인",
        "대출",
        "카드",
        "보험",
        "재무",
        "레슨",
        "세무사",
        "빌리",
        "갚",
        "브라보팝",
        "app",
        "테스트",
        "youtube",
        "유투브",
      ])
    ) {
      return "PERSONAL" as const;
    }

    if (matches(["협업", "collab", "collaboration", "cowrite", "co-write"])) {
      return "COLLAB" as const;
    }

    if (matches(["홀드", "hold", "픽스", "fix", "release"])) {
      return "HOLD_FIX" as const;
    }

    const hasStrongStock = matches(strongStockKeywords) || matches(["stock", "주식"]);
    const hasWeakStock = matches(weakStockKeywords);
    const hasMusic = matches(musicKeywords);

    if (hasStrongStock || (hasWeakStock && !hasMusic)) {
      return "STOCK" as const;
    }

    if (hasMusic) {
      return "MUSIC" as const;
    }

    return null;
  }, []);

  const extractTicker = useCallback((text: string) => {
    const match = text.match(/\b[A-Z]{2,5}\b/);
    return match?.[0] ?? undefined;
  }, []);

  const buildHoldFixDetails = useCallback(
    (title: string, startDate: string) => {
      const lower = title.toLowerCase();
      const type: "RELEASE" | "FIX" | "HOLD" =
        lower.includes("release") || title.includes("발매")
          ? "RELEASE"
          : lower.includes("fix") || title.includes("픽스")
          ? "FIX"
          : "HOLD";
      const writers: string[] = [];
      const splits: Record<string, number> = {};

      return {
        type,
        demoName: title,
        writers,
        splits,
        publishingInfo: "",
        email: "",
        holdRequestedDate: startDate,
      };
    },
    []
  );

  const buildCollabDetails = useCallback((startDate: string) => {
    return {
      trackProducer: "TBD",
      topLiner: "TBD",
      targetArtist: "TBD",
      deadline: startDate,
      status: "REQUESTED" as const,
      mixMonitorSent: false,
    };
  }, []);

  const buildStockDetails = useCallback((title: string, ticker?: string) => {
    return {
      ticker: ticker || "STOCK",
      relatedNewsTitle: title,
      relatedNewsUrl: "",
      note: "",
    };
  }, []);

  const syncWithGoogleEvents = useCallback(
    async (googleEvents: any[]) => {
      const today = new Date();
      const syncStart = startOfDay(subDays(today, 3));
      const syncEnd = endOfDay(addDays(today, 14));
      const googleEventIds = new Set(googleEvents.map((event) => event.id));

      const classificationResults = await Promise.all(
        googleEvents.map(async (gEvent) => {
          const gTitle = gEvent.summary || "(No Title)";
          const gDesc = gEvent.description || "";
          const combined = `${gTitle}\n${gDesc}`;
          const keywordCategory = classifyByKeywords(combined);

          try {
            const modelResult = await classifyWithGemini(gTitle, gDesc);
            const modelCategory = (modelResult?.category as TimTask["category"]) ?? "MUSIC";
            // 키워드 분류가 있으면 우선순위, 없으면 AI 분류 사용
            const finalCategory = keywordCategory ?? modelCategory;
            return {
              id: gEvent.id,
              title: gTitle,
              description: gDesc,
              category: finalCategory,
              summary: modelResult?.summary ?? gTitle,
              subCategory: modelResult?.subCategory, // Gemini가 분석한 서브 카테고리 저장
              aiDetails: modelResult,
            };
          } catch (error) {
            console.error("Failed to classify event", error);
            return {
              id: gEvent.id,
              title: gTitle,
              description: gDesc,
              category: keywordCategory ?? "MUSIC",
              summary: gTitle,
            };
          }
        })
      );

      setTasks((prevTasks) => {
        const tasksToKeep = prevTasks.filter((task) => {
          if (!task.googleEventId) {
            return true;
          }

          try {
            const taskDate = parseISO(task.startDate);
            const inRange = isWithinInterval(taskDate, { start: syncStart, end: syncEnd });

            if (inRange && !googleEventIds.has(task.googleEventId)) {
              return false;
            }
          } catch (error) {
            console.warn("Failed to parse task date", error);
          }

          return true;
        });

        const updatedTasks = [...tasksToKeep];

        googleEvents.forEach((gEvent) => {
          if (deletedGoogleEventIds.includes(gEvent.id)) {
            return;
          }

          const existingTaskIndex = updatedTasks.findIndex(
            (task) => task.googleEventId === gEvent.id
          );

          const gDate = gEvent.start?.dateTime || gEvent.start?.date;
          if (!gDate) {
            return;
          }

          const classification = classificationResults.find((item) => item.id === gEvent.id);
          const rawCategory = classification?.category ?? "MUSIC";
          // MUSIC 카테고리는 Overview(WEEKLY)로 매핑, 나머지는 그대로 사용
          const category = rawCategory === "MUSIC" ? "WEEKLY" : (rawCategory as TimTask["category"]);
          const fallbackTicker = extractTicker(
            `${classification?.title ?? ""} ${classification?.description ?? ""}`
          );

          const baseTask = {
            title: classification?.title ?? gEvent.summary ?? "(No Title)",
            description: classification?.description ?? gEvent.description ?? "",
            startDate: gDate,
            category,
            googleEventId: gEvent.id,
            subCategory: classification?.subCategory, // Task 객체에 서브 카테고리 추가
            lastSyncedAt: new Date().toISOString(),
          };

          if (existingTaskIndex >= 0) {
            const existing = updatedTasks[existingTaskIndex];
            updatedTasks[existingTaskIndex] = {
              ...existing,
              ...baseTask,
              collabDetails:
                category === "COLLAB"
                  ? existing.collabDetails ?? buildCollabDetails(gDate)
                  : existing.collabDetails,
              holdFixDetails:
                category === "HOLD_FIX"
                  ? existing.holdFixDetails ?? buildHoldFixDetails(baseTask.title, gDate)
                  : existing.holdFixDetails,
              stockDetails:
                category === "STOCK"
                  ? existing.stockDetails ??
                    buildStockDetails(baseTask.title, classification?.aiDetails?.ticker ?? fallbackTicker)
                  : existing.stockDetails,
            };
          } else {
            updatedTasks.push({
              id: `google-${gEvent.id}`,
              ...baseTask,
              collabDetails:
                category === "COLLAB" ? buildCollabDetails(gDate) : undefined,
              holdFixDetails:
                category === "HOLD_FIX" ? buildHoldFixDetails(baseTask.title, gDate) : undefined,
              stockDetails:
                category === "STOCK"
                  ? buildStockDetails(baseTask.title, classification?.aiDetails?.ticker ?? fallbackTicker)
                  : undefined,
            });
          }
        });

        updatedTasks.sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        return updatedTasks;
      });
    },
    [
      buildCollabDetails,
      buildHoldFixDetails,
      buildStockDetails,
      classifyByKeywords,
      deletedGoogleEventIds,
      extractTicker,
    ]
  );

  return (
    <TaskContext.Provider value={{ tasks, setTasks, deleteTask, syncWithGoogleEvents }}>
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
