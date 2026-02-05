"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SectionHeader from "@/components/SectionHeader";
import SortableTaskCard from "@/components/SortableTaskCard";
import TaskCard from "@/components/TaskCard";
import { TimTask } from "@/types/tim";
import {
  isToday,
  isTomorrow,
  isPast,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";

function sortStarredFirst(tasks: TimTask[]) {
  return [...tasks].sort((a, b) => Number(b.isStarred) - Number(a.isStarred));
}

export default function OverviewBoard() {
  const { tasks, deleteTask } = useTaskContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const urgentTasks = useMemo(() => {
    const musicTasks = tasks.filter(
      (task) => task.category === "WEEKLY" || task.category === "URGENT"
    );

    return sortStarredFirst(
      musicTasks.filter((task) =>
        task.startDate
          ? isPast(parseISO(task.startDate)) ||
            isToday(parseISO(task.startDate)) ||
            isTomorrow(parseISO(task.startDate))
          : false
      )
    );
  }, [tasks]);

  const weeklyTasks = useMemo(() => {
    const today = new Date();
    const weekEnd = endOfDay(addDays(today, 7));
    const musicTasks = tasks.filter(
      (task) => task.category === "WEEKLY" || task.category === "URGENT"
    );

    return musicTasks.filter((task) => {
      if (!task.startDate) {
        return false;
      }

      const date = parseISO(task.startDate);
      const inWindow = isWithinInterval(date, {
        start: startOfDay(today),
        end: weekEnd,
      });
      const isUrgent = isPast(date) || isToday(date) || isTomorrow(date);
      return inWindow && !isUrgent;
    });
  }, [tasks]);

  const [urgentList, setUrgentList] = useState<TimTask[]>(urgentTasks);
  const [weeklyList, setWeeklyList] = useState<TimTask[]>(weeklyTasks);

  useEffect(() => {
    setUrgentList(urgentTasks);
  }, [urgentTasks]);

  useEffect(() => {
    setWeeklyList(weeklyTasks);
  }, [weeklyTasks]);

  const handleToggleStar = (id: string) => {
    setUrgentList((prev) => {
      const updated = prev.map((task) =>
        task.id === id ? { ...task, isStarred: !task.isStarred } : task
      );
      const target = updated.find((task) => task.id === id);
      if (target?.isStarred) {
        return [target, ...updated.filter((task) => task.id !== id)];
      }
      return updated;
    });
  };

  const handleUrgentDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = urgentList.findIndex((item) => item.id === active.id);
    const newIndex = urgentList.findIndex((item) => item.id === over.id);
    setUrgentList((items) => arrayMove(items, oldIndex, newIndex));
  };

  const handleWeeklyDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = weeklyList.findIndex((item) => item.id === active.id);
    const newIndex = weeklyList.findIndex((item) => item.id === over.id);
    setWeeklyList((items) => arrayMove(items, oldIndex, newIndex));
  };

  return (
    <Box>
      <SectionHeader
        title="Overview"
        subtitle="오늘/내일 긴급 업무와 7일 내 TASK를 한 번에 관리합니다"
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader
              title="Urgent"
              subtitle="오늘 또는 내일까지 반드시 처리해야 할 업무"
            />
            {mounted ? (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleUrgentDragEnd}>
                <SortableContext
                  items={urgentList.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {urgentList.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      onToggleStar={handleToggleStar}
                      onDelete={deleteTask}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              urgentList.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleStar={handleToggleStar}
                  onDelete={deleteTask}
                />
              ))
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Weekly Tasks" subtitle="향후 7일 예정 업무" />
            {mounted ? (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleWeeklyDragEnd}>
                <SortableContext
                  items={weeklyList.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {weeklyList.map((task) => (
                    <SortableTaskCard key={task.id} task={task} onDelete={deleteTask} />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              weeklyList.map((task) => (
                <TaskCard key={task.id} task={task} onDelete={deleteTask} />
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
