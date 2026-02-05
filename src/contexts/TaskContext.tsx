"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { addDays, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { sampleTasks } from "@/lib/sampleData";
import { TimTask } from "@/types/tim";

const LOCAL_STORAGE_KEY = "tim_deleted_google_ids";

interface TaskContextType {
  tasks: TimTask[];
  setTasks: React.Dispatch<React.SetStateAction<TimTask[]>>;
  deleteTask: (id: string) => void;
  syncWithGoogleEvents: (googleEvents: any[]) => void;
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

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const taskToDelete = prev.find((task) => task.id === id);

        if (taskToDelete?.googleEventId) {
          const nextDeletedIds = [...deletedGoogleEventIds, taskToDelete.googleEventId];
          setDeletedGoogleEventIds(nextDeletedIds);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextDeletedIds));
        }

        return prev.filter((task) => task.id !== id);
      });
    },
    [deletedGoogleEventIds]
  );

  const syncWithGoogleEvents = useCallback(
    (googleEvents: any[]) => {
      setTasks((prevTasks) => {
        const today = new Date();
        const syncStart = startOfDay(subDays(today, 3));
        const syncEnd = endOfDay(addDays(today, 14));
        const googleEventIds = new Set(googleEvents.map((event) => event.id));

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

          const gTitle = gEvent.summary || "(No Title)";
          const gDesc = gEvent.description || "";
          const gDate = gEvent.start?.dateTime || gEvent.start?.date;

          if (!gDate) {
            return;
          }

          if (existingTaskIndex >= 0) {
            updatedTasks[existingTaskIndex] = {
              ...updatedTasks[existingTaskIndex],
              title: gTitle,
              description: gDesc || updatedTasks[existingTaskIndex].description,
              startDate: gDate,
              lastSyncedAt: new Date().toISOString(),
            };
          } else {
            updatedTasks.push({
              id: `google-${gEvent.id}`,
              title: gTitle,
              description: gDesc,
              startDate: gDate,
              category: "PERSONAL",
              googleEventId: gEvent.id,
              lastSyncedAt: new Date().toISOString(),
            });
          }
        });

        updatedTasks.sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        return updatedTasks;
      });
    },
    [deletedGoogleEventIds]
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
