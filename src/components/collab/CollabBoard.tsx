"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { DndContext, DragEndEvent, closestCorners, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CollabStatus, TimTask, PitchingGrade } from "@/types/tim";
import SectionHeader from "@/components/SectionHeader";
import { format, parseISO, differenceInCalendarDays, isValid } from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";

const columns: { id: CollabStatus; title: string }[] = [
  { id: "REQUESTED", title: "협업 의뢰중" },
  { id: "IN_PROGRESS", title: "협업 진행중" },
  { id: "COMPLETED", title: "협업 완료" },
];

const gradeLabels: Record<PitchingGrade, string> = {
  S: "S급",
  A: "A급",
  A_JPN: "A-급(JPN)",
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = parseISO(value);
  if (!isValid(parsed)) return "-";
  return format(parsed, "yyyy.MM.dd");
};

const parseISOIfValid = (value?: string) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

function CollabCard({
  task,
  onToggleMix,
  onMoveToPitching,
}: {
  task: TimTask;
  onToggleMix: (id: string) => void;
  onMoveToPitching: (taskId: string, grade: PitchingGrade) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const details = task.collabDetails;

  // D-Day 계산
  const deadlineDate = parseISOIfValid(details?.deadline);
  const dDay = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null;

  // 긴급(3일 이내) 또는 지연(Overdue) 상태 확인 (완료된 건은 제외)
  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";

  const isCompleted = details?.status === "COMPLETED";

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleGradeSelect = (event: React.MouseEvent, grade: PitchingGrade) => {
    event.stopPropagation();
    onMoveToPitching(task.id, grade);
    handleMenuClose();
  };

  return (
    <>
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
          border: isUrgent || isOverdue ? "2px solid #ef5350" : "1px solid transparent",
          transition: "border 0.2s ease"
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight="600">
            트랙명: {details?.trackName || task.title}
          </Typography>
          {details?.songName && details.songName !== details.trackName && (
            <Typography variant="body2" color="text.secondary">
              곡명: {details.songName}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            프로듀서: {details?.trackProducer}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            탑라이너: {details?.topLiner}
          </Typography>
          <Chip
            label={`타겟 아티스트: ${details?.targetArtist}`}
            size="small"
            color="primary"
          />
          <Typography variant="body2" color="text.secondary">
            의뢰일: {details?.requestedDate
              ? formatDate(details.requestedDate)
              : formatDate(task.startDate)}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              데드라인: {formatDate(details?.deadline)}
            </Typography>
            {isCompleted ? (
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
          {details?.notes && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontStyle: 'italic',
                mt: 1,
                p: 1,
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                whiteSpace: 'pre-wrap'
              }}
            >
              메모: {details.notes}
            </Typography>
          )}
          {isCompleted && (
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={handleMenuClick}
              sx={{ mt: 1 }}
            >
              피칭아이디어로 이동
            </Button>
          )}
        </Stack>
      </Paper>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => handleMenuClose()}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={(e) => handleGradeSelect(e, "S")}>
          {gradeLabels.S}
        </MenuItem>
        <MenuItem onClick={(e) => handleGradeSelect(e, "A")}>
          {gradeLabels.A}
        </MenuItem>
        <MenuItem onClick={(e) => handleGradeSelect(e, "A_JPN")}>
          {gradeLabels.A_JPN}
        </MenuItem>
      </Menu>
    </>
  );
}

function CollabCardStatic({ task }: { task: TimTask }) {
  const details = task.collabDetails;
  const deadlineDate = parseISOIfValid(details?.deadline);
  const dDay = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null;
  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";
  const isCompleted = details?.status === "COMPLETED";

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
        <Typography variant="subtitle1" fontWeight="600">
          트랙명: {details?.trackName || task.title}
        </Typography>
        {details?.songName && details.songName !== details.trackName && (
          <Typography variant="body2" color="text.secondary">
            곡명: {details.songName}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          프로듀서: {details?.trackProducer}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          탑라이너: {details?.topLiner}
        </Typography>
        <Chip label={`타겟 아티스트: ${details?.targetArtist}`} size="small" color="primary" />
        <Typography variant="body2" color="text.secondary">
          의뢰일: {details?.requestedDate
            ? formatDate(details.requestedDate)
            : formatDate(task.startDate)}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            데드라인: {formatDate(details?.deadline)}
          </Typography>
          {isCompleted ? (
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
        {details?.notes && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontStyle: 'italic',
              mt: 1,
              p: 1,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
              whiteSpace: 'pre-wrap'
            }}
          >
            메모: {details.notes}
          </Typography>
        )}
        {isCompleted && (
          <Button
            variant="outlined"
            size="small"
            fullWidth
            disabled
            sx={{ mt: 1 }}
          >
            피칭아이디어로 이동
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

export default function CollabBoard() {
  const { tasks: allTasks, moveToPitching } = useTaskContext();
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
      const updated = prev.map((task) => {
        if (task.id !== activeTask.id) return task;
        const details = task.collabDetails;
        if (!details) return task;
        return {
          ...task,
          collabDetails: {
            ...details,
            status: (nextStatus ?? "REQUESTED") as CollabStatus,
          },
        };
      });

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
      prev.map((task) => {
        if (task.id !== id) return task;
        const details = task.collabDetails;
        if (!details) return task;
        return {
          ...task,
          collabDetails: {
            ...details,
            mixMonitorSent: !details.mixMonitorSent,
          },
        };
      })
    );
  };

  const handleMoveToPitching = (taskId: string, grade: PitchingGrade) => {
    moveToPitching(taskId, grade);
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
                onMoveToPitching={handleMoveToPitching}
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
  onMoveToPitching,
}: {
  columnId: CollabStatus;
  title: string;
  tasks: TimTask[];
  onToggleMix: (id: string) => void;
  onMoveToPitching: (taskId: string, grade: PitchingGrade) => void;
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
            <CollabCard
              key={task.id}
              task={task}
              onToggleMix={onToggleMix}
              onMoveToPitching={onMoveToPitching}
            />
          ))}
        </Stack>
      </SortableContext>
    </Paper>
  );
}
