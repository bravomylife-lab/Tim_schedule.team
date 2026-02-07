"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import StarRounded from "@mui/icons-material/StarRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import SyncProblemRounded from "@mui/icons-material/SyncProblemRounded";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SectionHeader from "@/components/SectionHeader";
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
  format,
} from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";

interface SortableTaskCardProps {
  task: TimTask;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onDismissCalendarModified?: (id: string) => void;
}

function SortableTaskCard({
  task,
  onToggleStar,
  onDelete,
  onDismissCalendarModified,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box {...attributes} {...listeners} sx={{ cursor: "grab", mt: 0.5 }}>
              <DragIndicatorRounded fontSize="small" color="action" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight={task.isStarred ? 600 : 400}>
                {task.title}
              </Typography>
              {task.startDate && (
                <Typography variant="caption" color="text.secondary">
                  {format(parseISO(task.startDate), "MMM d, yyyy")}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.5}>
              {task.calendarModified && (
                <Chip
                  icon={<SyncProblemRounded />}
                  label="Modified"
                  size="small"
                  color="warning"
                  variant="outlined"
                  onDelete={
                    onDismissCalendarModified
                      ? () => onDismissCalendarModified(task.id)
                      : undefined
                  }
                  sx={{ height: 24 }}
                />
              )}
              <IconButton
                size="small"
                onClick={() => onToggleStar(task.id)}
                color={task.isStarred ? "warning" : "default"}
              >
                <StarRounded fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(task.id)}
                color="error"
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function OverviewBoard() {
  const { tasks, deleteTask, toggleStar, dismissCalendarModified } =
    useTaskContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter urgent tasks: past, today, or tomorrow
  const urgentTasks = useMemo(() => {
    const musicTasks = tasks.filter(
      (task) => task.category === "WEEKLY" || task.category === "URGENT"
    );

    return musicTasks.filter((task) =>
      task.startDate
        ? isPast(parseISO(task.startDate)) ||
          isToday(parseISO(task.startDate)) ||
          isTomorrow(parseISO(task.startDate))
        : false
    );
  }, [tasks]);

  // Filter weekly tasks: within 7 days but NOT urgent
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
    toggleStar(id);
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
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        {/* Urgent Tasks - 50% */}
        <Box sx={{ flex: 1 }}>
          <Paper
            sx={{
              overflow: "hidden",
              borderTop: "4px solid",
              borderTopColor: "error.main",
            }}
          >
            <Box sx={{ bgcolor: "error.main", color: "error.contrastText", px: 3, py: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Urgent
              </Typography>
              <Typography variant="caption">
                오늘 또는 내일까지 반드시 처리해야 할 업무
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              {mounted ? (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleUrgentDragEnd}
                >
                  <SortableContext
                    items={urgentList.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {urgentList.length > 0 ? (
                      urgentList.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onToggleStar={handleToggleStar}
                          onDelete={deleteTask}
                          onDismissCalendarModified={dismissCalendarModified}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        No urgent tasks
                      </Typography>
                    )}
                  </SortableContext>
                </DndContext>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  Loading...
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Weekly Tasks - 50% */}
        <Box sx={{ flex: 1 }}>
          <Paper
            sx={{
              overflow: "hidden",
              borderTop: "4px solid",
              borderTopColor: "primary.main",
            }}
          >
            <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", px: 3, py: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Weekly Tasks
              </Typography>
              <Typography variant="caption">향후 7일 예정 업무</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              {mounted ? (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleWeeklyDragEnd}
                >
                  <SortableContext
                    items={weeklyList.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {weeklyList.length > 0 ? (
                      weeklyList.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onToggleStar={handleToggleStar}
                          onDelete={deleteTask}
                          onDismissCalendarModified={dismissCalendarModified}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        No weekly tasks
                      </Typography>
                    )}
                  </SortableContext>
                </DndContext>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  Loading...
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
