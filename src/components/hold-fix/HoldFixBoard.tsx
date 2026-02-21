"use client";

import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import AddRounded from "@mui/icons-material/AddRounded";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";
import { TimTask, HoldFixType, HoldFixDetails, Currency } from "@/types/tim";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable, DraggableAttributes } from "@dnd-kit/core";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface DateSelectProps {
  value?: string;
  onChange: (isoDate: string) => void;
}

function DateSelect({ value, onChange }: DateSelectProps) {
  const parseDate = (isoString?: string) => {
    if (!isoString) return { year: "", month: "", day: "" };
    const date = new Date(isoString);
    return {
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString(),
      day: date.getDate().toString(),
    };
  };

  const [dateState, setDateState] = useState(() => parseDate(value));

  const handleChange = (field: "year" | "month" | "day", val: string) => {
    const newState = { ...dateState, [field]: val };
    setDateState(newState);

    if (newState.year && newState.month && newState.day) {
      const isoDate = `${newState.year}-${newState.month.padStart(2, "0")}-${newState.day.padStart(2, "0")}`;
      onChange(isoDate);
    }
  };

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <Stack direction="row" spacing={1}>
      <FormControl size="small" sx={{ minWidth: 90 }}>
        <InputLabel>Year</InputLabel>
        <Select
          value={dateState.year}
          label="Year"
          onChange={(e) => handleChange("year", e.target.value)}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y.toString()}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 70 }}>
        <InputLabel>Month</InputLabel>
        <Select
          value={dateState.month}
          label="Month"
          onChange={(e) => handleChange("month", e.target.value)}
        >
          {months.map((m) => (
            <MenuItem key={m} value={m.toString()}>
              {m}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 70 }}>
        <InputLabel>Day</InputLabel>
        <Select
          value={dateState.day}
          label="Day"
          onChange={(e) => handleChange("day", e.target.value)}
        >
          {days.map((d) => (
            <MenuItem key={d} value={d.toString()}>
              {d}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}

interface DetailDialogProps {
  open: boolean;
  task: TimTask | null;
  onClose: () => void;
  onSave: (updates: Partial<HoldFixDetails>) => void;
  onDelete: () => void;
}

function DetailDialog({ open, task, onClose, onSave, onDelete }: DetailDialogProps) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [localDetails, setLocalDetails] = useState<HoldFixDetails | null>(
    task?.holdFixDetails ?? null
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    if (task?.holdFixDetails) {
      setLocalDetails(task.holdFixDetails);
    }
  }, [task]);

  if (!task || !task.holdFixDetails || !localDetails) return null;

  const type = localDetails.type;

  const handleWritersChange = (value: string) => {
    const writers = value.split(",").map((w) => w.trim()).filter((w) => w);
    setLocalDetails({ ...localDetails, writers });
  };

  const handleSave = () => {
    onSave(localDetails);
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {type} - {localDetails.demoName || "Untitled Demo"}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <TextField
            label="데모명"
            size="small"
            fullWidth
            value={localDetails.demoName || ""}
            onChange={(e) => setLocalDetails({ ...localDetails, demoName: e.target.value })}
          />

          <TextField
            label="타겟 아티스트"
            size="small"
            fullWidth
            value={localDetails.targetArtist || ""}
            onChange={(e) => setLocalDetails({ ...localDetails, targetArtist: e.target.value })}
          />

          <TextField
            label="작곡가 (쉼표 구분)"
            size="small"
            fullWidth
            value={localDetails.writers?.join(", ") || ""}
            onChange={(e) => handleWritersChange(e.target.value)}
          />

          <TextField
            label="지분"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={localDetails.splitsNote || ""}
            onChange={(e) => setLocalDetails({ ...localDetails, splitsNote: e.target.value })}
            placeholder="자유롭게 지분 관계를 작성하세요"
          />

          {localDetails.writers && localDetails.writers.length > 0 && (
            <Box sx={{ p: 1.5, bgcolor: "rgba(0, 0, 0, 0.03)", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Writers & Splits
              </Typography>
              <Typography variant="body2">
                {localDetails.writers.join(", ")}
              </Typography>
            </Box>
          )}

          <TextField
            label="퍼블리싱 정보"
            size="small"
            fullWidth
            value={localDetails.publishingInfo || ""}
            onChange={(e) => setLocalDetails({ ...localDetails, publishingInfo: e.target.value })}
          />

          <TextField
            label="이메일"
            size="small"
            fullWidth
            type="email"
            value={localDetails.email || ""}
            onChange={(e) => setLocalDetails({ ...localDetails, email: e.target.value })}
          />

          <TextField
            label="메모"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={localDetails.notes || ""}
            onChange={(e) => setLocalDetails({ ...localDetails, notes: e.target.value })}
          />

          {type === "HOLD" && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  홀드 요청일
                </Typography>
                <DateSelect
                  value={localDetails.holdRequestedDate}
                  onChange={(date) => setLocalDetails({ ...localDetails, holdRequestedDate: date })}
                />
              </Box>

              <TextField
                label="홀드 기간"
                size="small"
                fullWidth
                value={localDetails.holdPeriod || ""}
                onChange={(e) => setLocalDetails({ ...localDetails, holdPeriod: e.target.value })}
              />
            </>
          )}

          {type === "FIX" && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  픽스 날짜
                </Typography>
                <DateSelect
                  value={localDetails.fixDate}
                  onChange={(date) => setLocalDetails({ ...localDetails, fixDate: date })}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="프로덕션 비용"
                  size="small"
                  type="number"
                  value={localDetails.productionFee || ""}
                  onChange={(e) => setLocalDetails({ ...localDetails, productionFee: parseFloat(e.target.value) || 0 })}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={localDetails.currency || "KRW"}
                    label="Currency"
                    onChange={(e) => setLocalDetails({ ...localDetails, currency: e.target.value as Currency })}
                  >
                    <MenuItem value="KRW">KRW</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Mechanical 비용"
                  size="small"
                  type="number"
                  value={localDetails.mechanicalFee || ""}
                  onChange={(e) => setLocalDetails({ ...localDetails, mechanicalFee: parseFloat(e.target.value) || 0 })}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                  {localDetails.currency === "USD" ? "USD" : localDetails.currency === "EUR" ? "EUR" : "KRW"}
                </Typography>
              </Stack>
            </>
          )}

          {type === "RELEASE" && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  발매일
                </Typography>
                <DateSelect
                  value={localDetails.releaseDate}
                  onChange={(date) => setLocalDetails({ ...localDetails, releaseDate: date })}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="프로덕션 비용"
                  size="small"
                  type="number"
                  value={localDetails.productionFee || ""}
                  onChange={(e) => setLocalDetails({ ...localDetails, productionFee: parseFloat(e.target.value) || 0 })}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={localDetails.currency || "KRW"}
                    label="Currency"
                    onChange={(e) => setLocalDetails({ ...localDetails, currency: e.target.value as Currency })}
                  >
                    <MenuItem value="KRW">KRW</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Mechanical 비용"
                  size="small"
                  type="number"
                  value={localDetails.mechanicalFee || ""}
                  onChange={(e) => setLocalDetails({ ...localDetails, mechanicalFee: parseFloat(e.target.value) || 0 })}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                  {localDetails.currency === "USD" ? "USD" : localDetails.currency === "EUR" ? "EUR" : "KRW"}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDelete} color="error">
          삭제
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>
          취소
        </Button>
        <Button onClick={handleSave} variant="contained">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface CompactCardProps {
  task: TimTask;
  onCardClick: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
}

function CompactCard({ task, onCardClick, onDelete, isDragging, dragAttributes, dragListeners }: CompactCardProps) {
  const details = task.holdFixDetails!;
  const type = details.type;

  const borderColor =
    type === "HOLD"
      ? "rgba(0, 0, 0, 0.12)"
      : type === "FIX"
      ? "#F4B400"
      : "#1976d2";

  const chipColor = type === "FIX" ? "warning" : type === "RELEASE" ? "primary" : "default";

  const formatWritersCompact = () => {
    if (!details.writers || details.writers.length === 0) return "—";
    if (details.writers.length <= 2) return details.writers.join(", ");
    return `${details.writers[0]}, ${details.writers[1]} +${details.writers.length - 2}`;
  };

  const formatFee = () => {
    if (!details.productionFee) return null;
    const currency = details.currency || "KRW";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₩";
    return `${symbol}${details.productionFee.toLocaleString()}`;
  };

  const formatMechanicalFee = () => {
    if (!details.mechanicalFee) return null;
    const currency = details.currency || "KRW";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₩";
    return `${symbol}${details.mechanicalFee.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  };

  const displayDate = type === "HOLD" ? formatDate(details.holdRequestedDate)
    : type === "FIX" ? formatDate(details.fixDate)
    : formatDate(details.releaseDate);

  return (
    <Card
      sx={{
        border: `1px solid ${borderColor}`,
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: 2,
        },
      }}
    >
      <Box
        {...(dragAttributes || {})}
        {...(dragListeners || {})}
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          minHeight: 60,
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip label={type} color={chipColor} size="small" sx={{ minWidth: 70, fontWeight: 700, fontSize: "0.7rem" }} />
          <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }} noWrap onClick={onCardClick}>
            {details.demoName || "Untitled Demo"}
            {details.targetArtist && ` (${details.targetArtist})`}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            color="error"
            sx={{ flexShrink: 0 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.75rem", cursor: "pointer" }}
          noWrap
          onClick={onCardClick}
        >
          작곡가: {formatWritersCompact()}
          {formatFee() && ` • 곡비: ${formatFee()}`}
          {formatMechanicalFee() && ` • Mech: ${formatMechanicalFee()}`}
        </Typography>

        {(details.publishingInfo || displayDate) && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.75rem", cursor: "pointer" }}
            noWrap
            onClick={onCardClick}
          >
            {details.publishingInfo && `퍼블리싱: ${details.publishingInfo}`}
            {details.publishingInfo && displayDate && " • "}
            {displayDate && displayDate}
          </Typography>
        )}
      </Box>
    </Card>
  );
}

interface DraggableCardProps {
  task: TimTask;
  onCardClick: () => void;
  onDelete: () => void;
}

function DraggableCard({ task, onCardClick, onDelete }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div ref={setNodeRef}>
      <CompactCard
        task={task}
        onCardClick={onCardClick}
        onDelete={onDelete}
        isDragging={isDragging}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

interface ColumnProps {
  type: HoldFixType;
  tasks: TimTask[];
  onCardClick: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onCreateNew: (type: HoldFixType) => void;
}

function Column({ type, tasks, onCardClick, onDelete, onCreateNew }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: type,
  });

  const title = type === "HOLD" ? "HOLD" : type === "FIX" ? "FIX" : "RELEASE";
  const count = tasks.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, px: 1 }}>
        <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
          {title}
        </Typography>
        <Chip label={count} size="small" color={type === "FIX" ? "warning" : type === "RELEASE" ? "primary" : "default"} />
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          onClick={() => onCreateNew(type)}
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
        ref={setNodeRef}
        sx={{
          flex: 1,
          p: 1,
          bgcolor: "rgba(0, 0, 0, 0.02)",
          borderRadius: 1,
          maxHeight: "calc(100vh - 250px)",
          overflowY: "auto",
          minHeight: 300,
          "&::-webkit-scrollbar": {
            width: 8,
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0, 0, 0, 0.2)",
            borderRadius: 4,
            "&:hover": {
              bgcolor: "rgba(0, 0, 0, 0.3)",
            },
          },
        }}
      >
        <Stack spacing={1}>
          {tasks.map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              onCardClick={() => onCardClick(task.id)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body2">
                여기에 카드를 드래그하세요
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default function HoldFixBoard() {
  const { tasks, updateTask, deleteTask, moveHoldFixType, addTask } = useTaskContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimTask | null>(null);
  const [createMode, setCreateMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const items = tasks.filter((task) => task.category === "HOLD_FIX");
  const holdItems = items.filter((task) => task.holdFixDetails?.type === "HOLD");
  const fixItems = items.filter((task) => task.holdFixDetails?.type === "FIX");
  const releaseItems = items.filter((task) => task.holdFixDetails?.type === "RELEASE");

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newType = over.id as HoldFixType;

    const task = items.find((t) => t.id === taskId);
    if (task && task.holdFixDetails?.type !== newType) {
      moveHoldFixType(taskId, newType);
    }
  };

  const handleCardClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setCreateMode(false);
      setDialogOpen(true);
    }
  };

  const handleCreateNew = (type: HoldFixType) => {
    setCreateMode(true);
    setSelectedTask({
      id: `holdfix-${Date.now()}`,
      title: "새 홀드/픽스",
      startDate: new Date().toISOString(),
      category: "HOLD_FIX" as const,
      userEdited: true,
      holdFixDetails: {
        type,
        demoName: "",
        writers: [],
        splits: {},
        publishingInfo: "",
        email: "",
      },
    });
    setDialogOpen(true);
  };

  const handleUpdate = (updates: Partial<HoldFixDetails>) => {
    if (createMode && selectedTask) {
      const newTask: TimTask = {
        ...selectedTask,
        id: `holdfix-${Date.now()}`,
        holdFixDetails: {
          ...(selectedTask.holdFixDetails as HoldFixDetails),
          ...updates,
        },
      };
      addTask(newTask);
    } else if (selectedTask && selectedTask.holdFixDetails) {
      updateTask(selectedTask.id, {
        holdFixDetails: {
          ...selectedTask.holdFixDetails,
          ...updates,
        },
      });
    }
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleDialogDelete = () => {
    if (selectedTask) {
      deleteTask(selectedTask.id);
    }
  };

  const activeTask = activeId ? items.find((t) => t.id === activeId) : null;

  return (
    <Box>
      <SectionHeader
        title="Hold / Fix"
        subtitle="홀드 및 픽스된 데모의 지분/퍼블리싱 정보를 관리합니다"
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Stack direction="row" spacing={2} sx={{ height: "calc(100vh - 180px)" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Column type="HOLD" tasks={holdItems} onCardClick={handleCardClick} onDelete={handleDelete} onCreateNew={handleCreateNew} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Column type="FIX" tasks={fixItems} onCardClick={handleCardClick} onDelete={handleDelete} onCreateNew={handleCreateNew} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Column type="RELEASE" tasks={releaseItems} onCardClick={handleCardClick} onDelete={handleDelete} onCreateNew={handleCreateNew} />
          </Box>
        </Stack>
        <DragOverlay>
          {activeTask ? (
            <CompactCard
              task={activeTask}
              onCardClick={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <DetailDialog
        open={dialogOpen}
        task={selectedTask}
        onClose={() => setDialogOpen(false)}
        onSave={handleUpdate}
        onDelete={handleDialogDelete}
      />
    </Box>
  );
}
