"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import SyncProblemRounded from "@mui/icons-material/SyncProblemRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
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

// Publishing company detection and chip styling
const detectPublishingCompany = (task: TimTask): { name: string; color: string } => {
  const text = [
    task.collabDetails?.publishingInfo || "",
    task.title,
    task.description || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("soundgraphics") || text.includes("사운드그래픽스")) {
    return { name: "SG", color: "#1976d2" }; // blue
  }
  if (text.includes("faar") || text.includes("파")) {
    return { name: "FAAR", color: "#f57c00" }; // orange
  }
  if (text.includes("cosmos") || text.includes("코스모스")) {
    return { name: "COSMOS", color: "#7b1fa2" }; // purple
  }
  if (text.includes("gl") || text.includes("지엘")) {
    return { name: "GL", color: "#388e3c" }; // green
  }
  if (text.includes("wavecandy") || text.includes("웨이브캔디")) {
    return { name: "Wave", color: "#e91e63" }; // pink
  }

  // Unknown - extract first 2-3 chars from publishingInfo or use fallback
  const pubInfo = task.collabDetails?.publishingInfo || "";
  if (pubInfo) {
    const shortName = pubInfo.substring(0, 3).toUpperCase();
    return { name: shortName, color: "#9e9e9e" }; // gray
  }

  return { name: "—", color: "#9e9e9e" };
};

function CollabCard({
  task,
  onToggleMix,
  onMoveToPitching,
  onDelete,
  onDismissModified,
}: {
  task: TimTask;
  onToggleMix: (id: string) => void;
  onMoveToPitching: (taskId: string, grade: PitchingGrade) => void;
  onDelete: (id: string) => void;
  onDismissModified: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [gradeMenuAnchorEl, setGradeMenuAnchorEl] = useState<null | HTMLElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const details = task.collabDetails;

  // D-Day calculation
  const deadlineDate = parseISOIfValid(details?.deadline);
  const dDay = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null;

  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";
  const isCompleted = details?.status === "COMPLETED";

  const publishingCompany = detectPublishingCompany(task);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(task.id);
    handleMenuClose();
  };

  const handleMoveToPitchingOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    setGradeMenuAnchorEl(event.currentTarget as HTMLElement);
  };

  const handleGradeMenuClose = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setGradeMenuAnchorEl(null);
  };

  const handleGradeSelect = (event: React.MouseEvent, grade: PitchingGrade) => {
    event.stopPropagation();
    onMoveToPitching(task.id, grade);
    handleGradeMenuClose();
  };

  const handleDismissModified = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDismissModified(task.id);
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
          border: isUrgent || isOverdue ? "2px solid #ef5350" : "1px solid #e0e0e0",
          transition: "border 0.2s ease",
        }}
      >
        <Stack spacing={1.5}>
          {/* Title line: Publishing chip + Producer name + Menu */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label={publishingCompany.name}
                size="small"
                sx={{
                  backgroundColor: publishingCompany.color,
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  height: 22,
                }}
              />
              <Typography variant="subtitle1" fontWeight="700">
                {details?.trackProducer || "TBD"}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertRounded fontSize="small" />
            </IconButton>
          </Stack>

          {/* Subtitle: Track/song name */}
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            Track: {details?.trackName || task.title}
          </Typography>

          {/* Compact info row: Topliner | Artist */}
          <Typography variant="caption" color="text.secondary">
            탑라이너: {details?.topLiner || "TBD"} | 아티스트: {details?.targetArtist || "TBD"}
          </Typography>

          {/* Dates with D-day */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary">
              의뢰: {formatDate(details?.requestedDate || task.startDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              |
            </Typography>
            <Typography variant="caption" color="text.secondary">
              마감: {formatDate(details?.deadline)}
            </Typography>
            {dDay !== null && dDay >= 0 && !isCompleted && (
              <Chip
                label={`D-${dDay}`}
                color={isUrgent ? "error" : "default"}
                size="small"
                sx={{ height: 20, fontSize: "0.7rem", fontWeight: "bold" }}
              />
            )}
            {isOverdue && (
              <Chip
                label="Overdue"
                color="error"
                size="small"
                sx={{ height: 20, fontSize: "0.7rem", fontWeight: "bold" }}
              />
            )}
          </Stack>

          {/* Modified badge */}
          {task.calendarModified && (
            <Chip
              label="Modified"
              icon={<SyncProblemRounded fontSize="small" />}
              size="small"
              color="warning"
              onClick={handleDismissModified}
              sx={{ width: "fit-content", cursor: "pointer" }}
            />
          )}

          {/* Mix monitor chip (completed only) */}
          {isCompleted && (
            <Chip
              label={`믹스 모니터 ${details?.mixMonitorSent ? "O" : "X"}`}
              color={details?.mixMonitorSent ? "success" : "default"}
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onToggleMix(task.id);
              }}
              sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold", cursor: "pointer" }}
            />
          )}

          {/* Memo section */}
          {details?.notes && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "600", mt: 0.5 }}
              >
                ─── 메모 ───
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontStyle: "italic",
                  p: 1,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                  whiteSpace: "pre-wrap",
                }}
              >
                {details.notes}
              </Typography>
            </>
          )}

          {/* Move to pitching button (completed only) */}
          {isCompleted && (
            <Chip
              label="피칭아이디어로 이동"
              icon={<ArrowForwardRounded fontSize="small" />}
              onClick={handleMoveToPitchingOpen}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ width: "fit-content", cursor: "pointer", fontWeight: "600" }}
            />
          )}
        </Stack>
      </Paper>

      {/* Main menu: Delete, Move to Pitching */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => handleMenuClose()}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleDelete}>
          <DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} />
          삭제
        </MenuItem>
        {isCompleted && (
          <MenuItem onClick={handleMoveToPitchingOpen}>
            <ArrowForwardRounded fontSize="small" sx={{ mr: 1 }} />
            피칭으로 이동
          </MenuItem>
        )}
      </Menu>

      {/* Grade selection menu */}
      <Menu
        anchorEl={gradeMenuAnchorEl}
        open={Boolean(gradeMenuAnchorEl)}
        onClose={() => handleGradeMenuClose()}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={(e) => handleGradeSelect(e, "S")}>{gradeLabels.S}</MenuItem>
        <MenuItem onClick={(e) => handleGradeSelect(e, "A")}>{gradeLabels.A}</MenuItem>
        <MenuItem onClick={(e) => handleGradeSelect(e, "A_JPN")}>{gradeLabels.A_JPN}</MenuItem>
      </Menu>
    </>
  );
}

function CollabCardStatic({
  task,
  onDelete,
  onDismissModified,
}: {
  task: TimTask;
  onDelete: (id: string) => void;
  onDismissModified: (id: string) => void;
}) {
  const details = task.collabDetails;
  const deadlineDate = parseISOIfValid(details?.deadline);
  const dDay = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null;
  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";
  const isCompleted = details?.status === "COMPLETED";

  const publishingCompany = detectPublishingCompany(task);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(task.id);
    handleMenuClose();
  };

  const handleDismissModified = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDismissModified(task.id);
  };

  return (
    <>
      <Paper
        sx={{
          p: 2,
          borderRadius: 4,
          backgroundColor: "#fff",
          border: isUrgent || isOverdue ? "2px solid #ef5350" : "1px solid #e0e0e0",
        }}
      >
        <Stack spacing={1.5}>
          {/* Title line */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label={publishingCompany.name}
                size="small"
                sx={{
                  backgroundColor: publishingCompany.color,
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  height: 22,
                }}
              />
              <Typography variant="subtitle1" fontWeight="700">
                {details?.trackProducer || "TBD"}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertRounded fontSize="small" />
            </IconButton>
          </Stack>

          {/* Subtitle */}
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            Track: {details?.trackName || task.title}
          </Typography>

          {/* Info row */}
          <Typography variant="caption" color="text.secondary">
            탑라이너: {details?.topLiner || "TBD"} | 아티스트: {details?.targetArtist || "TBD"}
          </Typography>

          {/* Dates */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary">
              의뢰: {formatDate(details?.requestedDate || task.startDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              |
            </Typography>
            <Typography variant="caption" color="text.secondary">
              마감: {formatDate(details?.deadline)}
            </Typography>
            {dDay !== null && dDay >= 0 && !isCompleted && (
              <Chip
                label={`D-${dDay}`}
                color={isUrgent ? "error" : "default"}
                size="small"
                sx={{ height: 20, fontSize: "0.7rem", fontWeight: "bold" }}
              />
            )}
            {isOverdue && (
              <Chip
                label="Overdue"
                color="error"
                size="small"
                sx={{ height: 20, fontSize: "0.7rem", fontWeight: "bold" }}
              />
            )}
          </Stack>

          {/* Modified badge */}
          {task.calendarModified && (
            <Chip
              label="Modified"
              icon={<SyncProblemRounded fontSize="small" />}
              size="small"
              color="warning"
              onClick={handleDismissModified}
              sx={{ width: "fit-content", cursor: "pointer" }}
            />
          )}

          {/* Mix monitor */}
          {isCompleted && (
            <Chip
              label={`믹스 모니터 ${details?.mixMonitorSent ? "O" : "X"}`}
              color={details?.mixMonitorSent ? "success" : "default"}
              size="small"
              sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold" }}
            />
          )}

          {/* Memo */}
          {details?.notes && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "600", mt: 0.5 }}
              >
                ─── 메모 ───
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontStyle: "italic",
                  p: 1,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                  whiteSpace: "pre-wrap",
                }}
              >
                {details.notes}
              </Typography>
            </>
          )}

          {/* Move button disabled */}
          {isCompleted && (
            <Chip
              label="피칭아이디어로 이동"
              icon={<ArrowForwardRounded fontSize="small" />}
              disabled
              size="small"
              variant="outlined"
              sx={{ width: "fit-content" }}
            />
          )}
        </Stack>
      </Paper>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => handleMenuClose()}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleDelete}>
          <DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>
    </>
  );
}

export default function CollabBoard() {
  const { tasks: allTasks, moveToPitching, deleteTask, dismissCalendarModified, updateTask } =
    useTaskContext();
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

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleDismissModified = (taskId: string) => {
    dismissCalendarModified(taskId);
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
                onDelete={handleDelete}
                onDismissModified={handleDismissModified}
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
                  <CollabCardStatic
                    key={task.id}
                    task={task}
                    onDelete={handleDelete}
                    onDismissModified={handleDismissModified}
                  />
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
  onDelete,
  onDismissModified,
}: {
  columnId: CollabStatus;
  title: string;
  tasks: TimTask[];
  onToggleMix: (id: string) => void;
  onMoveToPitching: (taskId: string, grade: PitchingGrade) => void;
  onDelete: (id: string) => void;
  onDismissModified: (id: string) => void;
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
              onDelete={onDelete}
              onDismissModified={onDismissModified}
            />
          ))}
        </Stack>
      </SortableContext>
    </Paper>
  );
}
