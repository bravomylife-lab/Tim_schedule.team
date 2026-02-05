"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sampleTasks, Task } from '@/lib/sampleData';
import { addDays, subDays, formatISO, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface TaskContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  deleteTask: (id: string) => void;
  syncWithGoogleEvents: (googleEvents: any[]) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [deletedGoogleEventIds, setDeletedGoogleEventIds] = useState<string[]>([]);

  // Load deleted event IDs from local storage to prevent resurrection
  useEffect(() => {
    const stored = localStorage.getItem('tim_deleted_google_ids');
    if (stored) {
      try {
        setDeletedGoogleEventIds(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse deleted event IDs", e);
      }
    }
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const taskToDelete = prev.find(t => t.id === id);
      
      // If this task was synced from Google, remember its ID so we don't re-sync it
      if (taskToDelete?.googleEventId) {
        const newDeletedIds = [...deletedGoogleEventIds, taskToDelete.googleEventId];
        setDeletedGoogleEventIds(newDeletedIds);
        localStorage.setItem('tim_deleted_google_ids', JSON.stringify(newDeletedIds));
      }
      
      return prev.filter(t => t.id !== id);
    });
  }, [deletedGoogleEventIds]);

  const syncWithGoogleEvents = useCallback((googleEvents: any[]) => {
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      const today = new Date();
      const syncStart = startOfDay(subDays(today, 3));
      const syncEnd = endOfDay(addDays(today, 14));

      // 1. Create a Set of Google Event IDs for quick lookup
      const googleEventIds = new Set(googleEvents.map(e => e.id));

      // 2. Handle Deletions from Google Calendar
      // If a task has a googleEventId, is within the sync range, but is NOT in the fetched list,
      // it means it was deleted (or moved) in Google Calendar. We should remove it.
      const tasksToKeep = newTasks.filter(task => {
        if (!task.googleEventId) return true; // Keep local-only tasks
        
        const taskDate = parseISO(task.startDate);
        const isInRange = isWithinInterval(taskDate, { start: syncStart, end: syncEnd });
        
        if (isInRange && !googleEventIds.has(task.googleEventId)) {
          return false; // Deleted in Google Calendar
        }
        return true;
      });

      // 3. Handle Updates and New Events
      const updatedTasks = [...tasksToKeep];

      googleEvents.forEach(gEvent => {
        // SKIP if this event was previously deleted in the Web App
        if (deletedGoogleEventIds.includes(gEvent.id)) {
          return;
        }

        const existingTaskIndex = updatedTasks.findIndex(t => t.googleEventId === gEvent.id);
        
        // Google Event Data
        const gTitle = gEvent.summary || '(No Title)';
        const gDesc = gEvent.description || '';
        // Handle all-day events vs timed events
        const gDate = gEvent.start.dateTime || gEvent.start.date; 

        if (existingTaskIndex >= 0) {
          // UPDATE existing task
          // We overwrite time/title/desc from Google as it's the source of truth for schedule
          updatedTasks[existingTaskIndex] = {
            ...updatedTasks[existingTaskIndex],
            title: gTitle,
            description: gDesc || updatedTasks[existingTaskIndex].description, // Keep local desc if Google is empty
            startDate: gDate,
            lastSyncedAt: new Date().toISOString(),
          };
        } else {
          // CREATE new task
          updatedTasks.push({
            id: `google-${gEvent.id}`,
            title: gTitle,
            description: gDesc,
            startDate: gDate,
            category: 'PERSONAL', // Default category for imported events
            googleEventId: gEvent.id,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      });

      // Sort by date
      updatedTasks.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      return updatedTasks;
    });
  }, [deletedGoogleEventIds]);

  return (
    <TaskContext.Provider value={{ tasks, setTasks, deleteTask, syncWithGoogleEvents }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}