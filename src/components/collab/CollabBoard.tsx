"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Menu from "@mui/material/Menu";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { DndContext, DragEndEvent, closestCorners, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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

interface DetailDialogProps {
  open: boolean;
  task: TimTask | null;
  onClose: () => void;
  onSave: (updates: Partial<TimTask>) => void;
  onDelete: (id: string) => void;
  onMoveToPitching?: (taskId: string, grade: PitchingGrade) => void;
}

function DetailDialog({ open, task, onClose, onSave, onDelete, onMoveToPitching }: DetailDialogProps) {
  const details = task?.collabDetails;
  const isCompleted = details?.status === "COMPLETED";

  const [trackName, setTrackName] = useState(details?.trackName || "");
  const [songName, setSongName] = useState(details?.songName || "");
  const [trackProducer, setTrackProducer] = useState(details?.trackProducer || "");
  const [topLiner, setTopLiner] = useState(details?.topLiner || "");
  const [targetArtist, setTargetArtist] = useState(details?.targetArtist || "");
  const [publishingInfo, setPublishingInfo] = useState(details?.publishingInfo || "");
  const [deadline, setDeadline] = useState(details?.deadline || "");
  const [requestedDate, setRequestedDate] = useState(details?.requestedDate || "");
  const [status, setStatus] = useState<CollabStatus>(details?.status || "REQUESTED");
  const [mixMonitorSent, setMixMonitorSent] = useState(details?.mixMonitorSent || false);
  const [notes, setNotes] = useState(details?.notes || "");

  const [gradeMenuAnchorEl, setGradeMenuAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (task) {
      setTrackName(details?.trackName || "");
      setSongName(details?.songName || "");
      setTrackProducer(details?.trackProducer || "");
      setTopLiner(details?.topLiner || "");
      setTargetArtist(details?.targetArtist || "");
      setPublishingInfo(details?.publishingInfo || "");
      setDeadline(details?.deadline || "");
      setRequestedDate(details?.requestedDate || "");
      setStatus(details?.status || "REQUESTED");
      setMixMonitorSent(details?.mixMonitorSent || false);
      setNotes(details?.notes || "");
    }
  }, [task, details]);

  const handleSave = () => {
    if (!task) return;
    onSave({
      collabDetails: {
        trackName,
        songName,
        trackProducer,
        topLiner,
        targetArtist,
        publishingInfo,
        deadline,
        requestedDate,
        status,
        mixMonitorSent,
        notes,
      },
    });
    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    onDelete(task.id);
    onClose();
  };

  const handleMoveToPitchingOpen = (event: React.MouseEvent<HTMLElement>) => {
    setGradeMenuAnchorEl(event.currentTarget);
  };

  const handleGradeMenuClose = () => {
    setGradeMenuAnchorEl(null);
  };

  const handleGradeSelect = (grade: PitchingGrade) => {
    if (task && onMoveToPitching) {
      onMoveToPitching(task.id, grade);
      handleGradeMenuClose();
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          협업 상세
          <IconButton onClick={onClose} size="small">
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="트랙명"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              fullWidth
            />
            <TextField
              label="곡명"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              fullWidth
            />
            <TextField
              label="트랙 프로듀서"
              value={trackProducer}
              onChange={(e) => setTrackProducer(e.target.value)}
              fullWidth
            />
            <TextField
              label="탑라이너"
              value={topLiner}
              onChange={(e) => setTopLiner(e.target.value)}
              fullWidth
            />
            <TextField
              label="타겟 아티스트"
              value={targetArtist}
              onChange={(e) => setTargetArtist(e.target.value)}
              fullWidth
            />
            <TextField
              label="퍼블리싱 정보"
              value={publishingInfo}
              onChange={(e) => setPublishingInfo(e.target.value)}
              fullWidth
            />
            <TextField
              label="마감일"
              type="date"
              value={deadline ? deadline.split("T")[0] : ""}
              onChange={(e) => setDeadline(e.target.value ? new Date(e.target.value).toISOString() : "")}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="의뢰일"
              type="date"
              value={requestedDate ? requestedDate.split("T")[0] : ""}
              onChange={(e) => setRequestedDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as CollabStatus)}
              >
                <MenuItem value="REQUESTED">협업 의뢰중</MenuItem>
                <MenuItem value="IN_PROGRESS">협업 진행중</MenuItem>
                <MenuItem value="COMPLETED">협업 완료</MenuItem>
              </Select>
            </FormControl>
            {isCompleted && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mixMonitorSent}
                    onChange={(e) => setMixMonitorSent(e.target.checked)}
                  />
                }
                label="Mix Monitor Sent"
              />
            )}
            <TextField
              label="메모"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleDelete} color="error" variant="outlined">
            삭제
          </Button>
          {isCompleted && onMoveToPitching && (
            <Button onClick={handleMoveToPitchingOpen} variant="outlined" color="primary">
              피칭으로 이동
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} variant="outlined">
            취소
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={gradeMenuAnchorEl}
        open={Boolean(gradeMenuAnchorEl)}
        onClose={handleGradeMenuClose}
      >
        <MenuItem onClick={() => handleGradeSelect("S")}>{gradeLabels.S}</MenuItem>
        <MenuItem onClick={() => handleGradeSelect("A")}>{gradeLabels.A}</MenuItem>
        <MenuItem onClick={() => handleGradeSelect("A_JPN")}>{gradeLabels.A_JPN}</MenuItem>
      </Menu>
    </>
  );
}

function CompactCollabCard({
  task,
  onClick,
  onDelete,
  onDismissModified,
}: {
  task: TimTask;
  onClick: () => void;
  onDelete: (id: string) => void;
  onDismissModified: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const details = task.collabDetails;

  const deadlineDate = parseISOIfValid(details?.deadline);
  const dDay = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null;

  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";

  const publishingCompany = detectPublishingCompany(task);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  const handleDismissModified = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismissModified(task.id);
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: "pointer",
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        borderLeft: isUrgent || isOverdue ? "4px solid #ef5350" : "1px solid #e0e0e0",
        transition: "all 0.2s ease",
        position: "relative",
        minHeight: "60px",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Stack spacing={0.5}>
        {/* Line 1: Publishing chip + Producer + Track/Song + D-day + Delete */}
        <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, overflow: "hidden" }}>
            <Chip
              label={publishingCompany.name}
              size="small"
              sx={{
                backgroundColor: publishingCompany.color,
                color: "#fff",
                fontWeight: "bold",
                fontSize: "0.8rem",
                height: 22,
                minWidth: 40,
              }}
            />
            <Typography variant="body1" fontWeight="700" noWrap>
              {details?.trackProducer || "TBD"}
            </Typography>
            <Typography variant="body1" color="text.secondary" noWrap sx={{ flex: 1 }}>
              — {details?.trackName || task.title}
            </Typography>
            {dDay !== null && dDay >= 0 && details?.status !== "COMPLETED" && (
              <Chip
                label={`D-${dDay}`}
                color={isUrgent ? "error" : "default"}
                size="small"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold" }}
              />
            )}
            {isOverdue && (
              <Chip
                label="Overdue"
                color="error"
                size="small"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold" }}
              />
            )}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {task.calendarModified && (
              <Box
                onClick={handleDismissModified}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ff9800",
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "#f57c00" },
                }}
              />
            )}
            <IconButton size="small" onClick={handleDelete}>
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Line 2: Caption: Topliner | Target Artist | 의뢰일 | 데드라인 */}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          탑라이너: {details?.topLiner || "TBD"} | 타겟: {details?.targetArtist || "TBD"}
        </Typography>

        {/* Line 3: Caption: 의뢰일 | 데드라인 */}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          의뢰: {formatDate(details?.requestedDate || task.startDate)}
          {details?.deadline && ` | 데드라인: ${formatDate(details.deadline)}`}
        </Typography>
      </Stack>
    </Paper>
  );
}

function CompactCollabCardStatic({
  task,
  onClick,
  onDelete,
  onDismissModified,
}: {
  task: TimTask;
  onClick: () => void;
  onDelete: (id: string) => void;
  onDismissModified: (id: string) => void;
}) {
  const details = task.collabDetails;
  const deadlineDate = parseISOIfValid(details?.deadline);
  const dDay = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null;
  const isUrgent = dDay !== null && dDay <= 3 && dDay >= 0 && details?.status !== "COMPLETED";
  const isOverdue = dDay !== null && dDay < 0 && details?.status !== "COMPLETED";
  const publishingCompany = detectPublishingCompany(task);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  const handleDismissModified = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismissModified(task.id);
  };

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: "pointer",
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        borderLeft: isUrgent || isOverdue ? "4px solid #ef5350" : "1px solid #e0e0e0",
        minHeight: "60px",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, overflow: "hidden" }}>
            <Chip
              label={publishingCompany.name}
              size="small"
              sx={{
                backgroundColor: publishingCompany.color,
                color: "#fff",
                fontWeight: "bold",
                fontSize: "0.8rem",
                height: 22,
                minWidth: 40,
              }}
            />
            <Typography variant="body1" fontWeight="700" noWrap>
              {details?.trackProducer || "TBD"}
            </Typography>
            <Typography variant="body1" color="text.secondary" noWrap sx={{ flex: 1 }}>
              — {details?.trackName || task.title}
            </Typography>
            {dDay !== null && dDay >= 0 && details?.status !== "COMPLETED" && (
              <Chip
                label={`D-${dDay}`}
                color={isUrgent ? "error" : "default"}
                size="small"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold" }}
              />
            )}
            {isOverdue && (
              <Chip
                label="Overdue"
                color="error"
                size="small"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: "bold" }}
              />
            )}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {task.calendarModified && (
              <Box
                onClick={handleDismissModified}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ff9800",
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "#f57c00" },
                }}
              />
            )}
            <IconButton size="small" onClick={handleDelete}>
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          탑라이너: {details?.topLiner || "TBD"} | 타겟: {details?.targetArtist || "TBD"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          의뢰: {formatDate(details?.requestedDate || task.startDate)}
          {details?.deadline && ` | 데드라인: ${formatDate(details.deadline)}`}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function CollabBoard() {
  const {
    tasks: allTasks,
    moveToPitching,
    deleteTask,
    dismissCalendarModified,
    updateTask,
    addTask,
  } = useTaskContext();
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimTask | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [createColumnStatus, setCreateColumnStatus] = useState<CollabStatus>("REQUESTED");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

    // PERSISTENCE FIX: update context as well
    if (nextStatus && activeTask.collabDetails) {
      updateTask(activeTask.id, {
        collabDetails: {
          ...activeTask.collabDetails,
          status: nextStatus as CollabStatus,
        },
      });
    }
  };

  const handleCardClick = (task: TimTask) => {
    setSelectedTask(task);
    setCreateMode(false);
    setDialogOpen(true);
  };

  const handleCreateNew = (columnStatus: CollabStatus) => {
    setSelectedTask({
      id: `collab-${Date.now()}`,
      title: "새 협업",
      startDate: new Date().toISOString(),
      category: "COLLAB",
      userEdited: true,
      collabDetails: {
        trackName: "",
        songName: "",
        trackProducer: "",
        topLiner: "",
        targetArtist: "",
        publishingInfo: "",
        deadline: new Date().toISOString(),
        requestedDate: new Date().toISOString(),
        status: columnStatus,
        notes: "",
      },
    });
    setCreateMode(true);
    setCreateColumnStatus(columnStatus);
    setDialogOpen(true);
  };

  const handleSave = (updates: Partial<TimTask>) => {
    if (createMode && selectedTask) {
      // Create new task
      const newTask: TimTask = {
        ...selectedTask,
        ...updates,
        id: `collab-${Date.now()}`,
        title: updates.collabDetails?.trackName || "새 협업",
        startDate: new Date().toISOString(),
        category: "COLLAB",
        userEdited: true,
      };
      addTask(newTask);
    } else if (selectedTask) {
      // Update existing task
      updateTask(selectedTask.id, updates);
    }
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
        subtitle="협업 의뢰부터 완료까지 단계별 진행 상황을 확인하고 팀과 함께 관리합니다"
      />
      {mounted ? (
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd} sensors={sensors}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {columns.map((column) => (
              <CollabColumn
                key={column.id}
                columnId={column.id}
                title={column.title}
                tasks={groupedTasks[column.id]}
                onCardClick={handleCardClick}
                onDelete={handleDelete}
                onDismissModified={handleDismissModified}
                onCreateNew={handleCreateNew}
              />
            ))}
          </Box>
        </DndContext>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {columns.map((column) => (
            <Paper key={column.id} sx={{ p: 2, backgroundColor: "#f8f9ff" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {column.title} ({groupedTasks[column.id].length})
                </Typography>
                <IconButton size="small" onClick={() => handleCreateNew(column.id)}>
                  <AddRounded />
                </IconButton>
              </Stack>
              <Stack spacing={2}>
                {groupedTasks[column.id].map((task) => (
                  <CompactCollabCardStatic
                    key={task.id}
                    task={task}
                    onClick={() => handleCardClick(task)}
                    onDelete={handleDelete}
                    onDismissModified={handleDismissModified}
                  />
                ))}
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      <DetailDialog
        open={dialogOpen}
        task={selectedTask}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onMoveToPitching={moveToPitching}
      />
    </Box>
  );
}

function CollabColumn({
  columnId,
  title,
  tasks,
  onCardClick,
  onDelete,
  onDismissModified,
  onCreateNew,
}: {
  columnId: CollabStatus;
  title: string;
  tasks: TimTask[];
  onCardClick: (task: TimTask) => void;
  onDelete: (id: string) => void;
  onDismissModified: (id: string) => void;
  onCreateNew: (columnStatus: CollabStatus) => void;
}) {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: 2,
        backgroundColor: "#f8f9ff",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 240px)",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="600">
          {title} ({tasks.length})
        </Typography>
        <IconButton
          size="small"
          onClick={() => onCreateNew(columnId)}
          sx={{
            backgroundColor: "primary.main",
            color: "#fff",
            "&:hover": { backgroundColor: "primary.dark" },
          }}
        >
          <AddRounded fontSize="small" />
        </IconButton>
      </Stack>
      <Box
        sx={{
          overflowY: "auto",
          flex: 1,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#bdbdbd",
            borderRadius: "3px",
            "&:hover": {
              backgroundColor: "#9e9e9e",
            },
          },
        }}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={2}>
            {tasks.map((task) => (
              <CompactCollabCard
                key={task.id}
                task={task}
                onClick={() => onCardClick(task)}
                onDelete={onDelete}
                onDismissModified={onDismissModified}
              />
            ))}
          </Stack>
        </SortableContext>
      </Box>
    </Paper>
  );
}
