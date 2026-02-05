"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { DndContext, DragEndEvent, closestCorners, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CollabStatus, TimTask } from "@/types/tim";
import SectionHeader from "@/components/SectionHeader";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";

const columns: { id: CollabStatus; title: string }[] = [
  { id: "REQUESTED", title: "협업 의뢰중" },
  { id: "IN_PROGRESS", title: "협업 진행중" },
  { id: "COMPLETED", title: "협업 완료" },
];

function CollabCard({
  task,
  onToggleMix,
}: {
  task: TimTask;
  onToggleMix: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const details = task.collabDetails;
  
  // D-Day 계산
  const dDay = details?.deadline 
    ? differenceInCalendarDays(parseISO(details.deadline), new Date()) 
    : null;

  // 긴급(3일 이내) 또는 지연(Overdue) 상태 확인 (완료된 건은 제외)
  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{ 
        p: 2, 
        borderRadius: 4, 
        cursor: "grab", 
        backgroundColor: "#fff",
        border: isUrgent || isOverdue ? "2px solid #ef5350" : "1px solid transparent", // 긴급 시 붉은 테두리
        transition: "border 0.2s ease"
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle1">{task.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          의뢰일: {task.startDate ? format(parseISO(task.startDate), "MM.dd") : "-"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Producer: {details?.trackProducer}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Topliner: {details?.topLiner}
        </Typography>
        <Chip
          label={`Target: ${details?.targetArtist}`}
          size="small"
          color="primary"
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Deadline: {details?.deadline ? format(parseISO(details.deadline), "MM.dd") : "-"}
          </Typography>
          {details?.status === "COMPLETED" ? (
            <Chip
              label={`믹스 모니터 ${details.mixMonitorSent ? "O" : "X"}`}
              color={details.mixMonitorSent ? "success" : "default"}
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onToggleMix(task.id);
              }}
              sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold" }}
            />
          ) : null}
          {isUrgent && <Chip label={`D-${dDay}`} color="error" size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 'bold' }} />}
          {isOverdue && <Chip label="Overdue" color="error" size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 'bold' }} />}
        </Stack>
      </Stack>
    </Paper>
  );
}

function CollabCardStatic({ task }: { task: TimTask }) {
  const details = task.collabDetails;
  const dDay = details?.deadline
    ? differenceInCalendarDays(parseISO(details.deadline), new Date())
    : null;
  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 4,
        backgroundColor: "#fff",
        border: isUrgent || isOverdue ? "2px solid #ef5350" : "1px solid transparent",
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle1">{task.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          의뢰일: {task.startDate ? format(parseISO(task.startDate), "MM.dd") : "-"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Producer: {details?.trackProducer}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Topliner: {details?.topLiner}
        </Typography>
        <Chip label={`Target: ${details?.targetArtist}`} size="small" color="primary" />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Deadline: {details?.deadline ? format(parseISO(details.deadline), "MM.dd") : "-"}
          </Typography>
          {details?.status === "COMPLETED" ? (
            <Chip
              label={`믹스 모니터 ${details.mixMonitorSent ? "O" : "X"}`}
              color={details.mixMonitorSent ? "success" : "default"}
              size="small"
              sx={{ height: 20, fontSize: "0.75rem", fontWeight: "bold" }}
            />
          ) : null}
          {isUrgent ? (
            <Chip
              label={`D-${dDay}`}
              color="error"
              size="small"
              sx={{ height: 20, fontSize: "0.75rem", fontWeight: "bold" }}
            />
          ) : null}
          {isOverdue ? (
            <Chip
              label="Overdue"
              color="error"
              size="small"
              sx={{ height: 20, fontSize: "0.75rem", fontWeight: "bold" }}
            />
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function CollabBoard() {
  const { tasks: allTasks } = useTaskContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initialTasks = useMemo(
    () => allTasks.filter((task) => task.category === "COLLAB"),
    [allTasks]
  );
  const [tasks, setTasks] = useState<TimTask[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const groupedTasks = useMemo(() => {
    const map: Record<CollabStatus, TimTask[]> = {
      REQUESTED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
    };
    tasks.forEach((task) => {
      const status = task.collabDetails?.status ?? "REQUESTED";
      map[status].push(task);
    });
    return map;
  }, [tasks]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeTask = tasks.find((task) => task.id === active.id);
    if (!activeTask) return;

    const overColumn = columns.find((column) => column.id === over.id);
    const overTask = tasks.find((task) => task.id === over.id);

    const nextStatus = overColumn?.id ?? overTask?.collabDetails?.status;

    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === activeTask.id
          ? {
              ...task,
              collabDetails: {
                ...task.collabDetails,
                status: nextStatus ?? "REQUESTED",
              },
            }
          : task
      );

      if (overTask) {
        const currentIndex = updated.findIndex((task) => task.id === active.id);
        const overIndex = updated.findIndex((task) => task.id === over.id);
        return arrayMove(updated, currentIndex, overIndex);
      }

      return updated;
    });
  };

  const handleToggleMix = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              collabDetails: {
                ...task.collabDetails,
                mixMonitorSent: !task.collabDetails?.mixMonitorSent,
              },
            }
          : task
      )
    );
  };

  return (
    <Box>
      <SectionHeader
        title="협업"
        subtitle="협업 의뢰부터 완료까지 단계별 진행 상황을 확인합니다"
      />
      {mounted ? (
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {columns.map((column) => (
              <CollabColumn
                key={column.id}
                columnId={column.id}
                title={column.title}
                tasks={groupedTasks[column.id]}
                onToggleMix={handleToggleMix}
              />
            ))}
          </Box>
        </DndContext>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
          {columns.map((column) => (
            <Paper key={column.id} sx={{ p: 2, backgroundColor: "#f8f9ff" }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {column.title}
              </Typography>
              <Stack spacing={2}>
                {groupedTasks[column.id].map((task) => (
                  <CollabCardStatic key={task.id} task={task} />
                ))}
              </Stack>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

function CollabColumn({
  columnId,
  title,
  tasks,
  onToggleMix,
}: {
  columnId: CollabStatus;
  title: string;
  tasks: TimTask[];
  onToggleMix: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <Paper ref={setNodeRef} sx={{ p: 2, backgroundColor: "#f8f9ff" }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={2}>
          {tasks.map((task) => (
            <CollabCard key={task.id} task={task} onToggleMix={onToggleMix} />
          ))}
        </Stack>
      </SortableContext>
    </Paper>
  );
}
