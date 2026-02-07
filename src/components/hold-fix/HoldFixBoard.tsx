"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
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
import { useDraggable } from "@dnd-kit/core";

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

interface HoldFixCardProps {
  task: TimTask;
  onUpdate: (updates: Partial<HoldFixDetails>) => void;
  onDelete: () => void;
  isDragging?: boolean;
}

function HoldFixCard({ task, onUpdate, onDelete, isDragging }: HoldFixCardProps) {
  const details = task.holdFixDetails!;
  const type = details.type;

  const borderColor =
    type === "HOLD"
      ? "rgba(0, 0, 0, 0.12)"
      : type === "FIX"
      ? "#F4B400"
      : "#1976d2";

  const chipColor = type === "FIX" ? "warning" : type === "RELEASE" ? "primary" : "default";

  const handleWritersChange = (value: string) => {
    const writers = value.split(",").map((w) => w.trim()).filter((w) => w);
    onUpdate({ writers });
  };

  const handleSplitsChange = (value: string) => {
    const splits: Record<string, number> = {};
    value.split(",").forEach((part) => {
      const match = part.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%?$/);
      if (match) {
        splits[match[1].trim()] = parseFloat(match[2]);
      }
    });
    onUpdate({ splits });
  };

  const formatSplits = (splits: Record<string, number>) => {
    return Object.entries(splits)
      .map(([name, value]) => `${name} ${value}%`)
      .join(", ");
  };

  const formatWritersWithSplits = () => {
    if (!details.writers || details.writers.length === 0) return null;

    if (details.splits && Object.keys(details.splits).length > 0) {
      return details.writers.map(writer => {
        const split = details.splits[writer];
        return split !== undefined ? `${writer} - ${split.toFixed(2)}%` : writer;
      }).join(", ");
    }

    return details.writers.join(", ");
  };

  return (
    <Card
      sx={{
        border: `2px solid ${borderColor}`,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
              <Chip label={type} color={chipColor} size="small" />
            </Stack>
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>

          <TextField
            label="Demo Name"
            size="small"
            fullWidth
            value={details.demoName || ""}
            onChange={(e) => onUpdate({ demoName: e.target.value })}
          />

          <TextField
            label="Target Artist"
            size="small"
            fullWidth
            value={details.targetArtist || ""}
            onChange={(e) => onUpdate({ targetArtist: e.target.value })}
          />

          <TextField
            label="Writers (comma-separated)"
            size="small"
            fullWidth
            value={details.writers?.join(", ") || ""}
            onChange={(e) => handleWritersChange(e.target.value)}
          />

          <TextField
            label="Splits (e.g., John 50%, Jane 50%)"
            size="small"
            fullWidth
            value={details.splits ? formatSplits(details.splits) : ""}
            onChange={(e) => handleSplitsChange(e.target.value)}
          />

          {formatWritersWithSplits() && (
            <Box sx={{ p: 1.5, bgcolor: "rgba(0, 0, 0, 0.03)", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Writers & Splits
              </Typography>
              <Typography variant="body2">
                {formatWritersWithSplits()}
              </Typography>
            </Box>
          )}

          <TextField
            label="Publishing Info"
            size="small"
            fullWidth
            value={details.publishingInfo || ""}
            onChange={(e) => onUpdate({ publishingInfo: e.target.value })}
          />

          <TextField
            label="Email"
            size="small"
            fullWidth
            type="email"
            value={details.email || ""}
            onChange={(e) => onUpdate({ email: e.target.value })}
          />

          <TextField
            label="Notes / 메모"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={details.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
          />

          {type === "HOLD" && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  Hold Requested Date
                </Typography>
                <DateSelect
                  value={details.holdRequestedDate}
                  onChange={(date) => onUpdate({ holdRequestedDate: date })}
                />
              </Box>

              <TextField
                label="Hold Period"
                size="small"
                fullWidth
                value={details.holdPeriod || ""}
                onChange={(e) => onUpdate({ holdPeriod: e.target.value })}
              />
            </>
          )}

          {type === "FIX" && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  Fix Date
                </Typography>
                <DateSelect
                  value={details.fixDate}
                  onChange={(date) => onUpdate({ fixDate: date })}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="Production Fee"
                  size="small"
                  type="number"
                  value={details.productionFee || ""}
                  onChange={(e) => onUpdate({ productionFee: parseFloat(e.target.value) || 0 })}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={details.currency || "KRW"}
                    label="Currency"
                    onChange={(e) => onUpdate({ currency: e.target.value as Currency })}
                  >
                    <MenuItem value="KRW">KRW</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </>
          )}

          {type === "RELEASE" && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  Release Date
                </Typography>
                <DateSelect
                  value={details.releaseDate}
                  onChange={(date) => onUpdate({ releaseDate: date })}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="Production Fee"
                  size="small"
                  type="number"
                  value={details.productionFee || ""}
                  onChange={(e) => onUpdate({ productionFee: parseFloat(e.target.value) || 0 })}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={details.currency || "KRW"}
                    label="Currency"
                    onChange={(e) => onUpdate({ currency: e.target.value as Currency })}
                  >
                    <MenuItem value="KRW">KRW</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

interface DraggableCardProps {
  task: TimTask;
  onUpdate: (updates: Partial<HoldFixDetails>) => void;
  onDelete: () => void;
}

function DraggableCard({ task, onUpdate, onDelete }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <HoldFixCard task={task} onUpdate={onUpdate} onDelete={onDelete} isDragging={isDragging} />
    </div>
  );
}

interface ColumnProps {
  type: HoldFixType;
  tasks: TimTask[];
  onUpdate: (taskId: string, updates: Partial<HoldFixDetails>) => void;
  onDelete: (taskId: string) => void;
}

function Column({ type, tasks, onUpdate, onDelete }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: type,
  });

  const title = type === "HOLD" ? "HOLD" : type === "FIX" ? "FIX" : "RELEASE";
  const count = tasks.length;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Chip label={count} size="small" />
      </Stack>
      <Box
        ref={setNodeRef}
        sx={{
          minHeight: 400,
          p: 2,
          bgcolor: "rgba(0, 0, 0, 0.02)",
          borderRadius: 1,
        }}
      >
        <Stack spacing={2}>
          {tasks.map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              onUpdate={(updates) => onUpdate(task.id, updates)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default function HoldFixBoard() {
  const { tasks, updateTask, deleteTask, moveHoldFixType } = useTaskContext();
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleUpdate = (taskId: string, updates: Partial<HoldFixDetails>) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.holdFixDetails) {
      updateTask(taskId, {
        holdFixDetails: {
          ...task.holdFixDetails,
          ...updates,
        },
      });
    }
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  const activeTask = activeId ? items.find((t) => t.id === activeId) : null;

  return (
    <Box>
      <SectionHeader
        title="Hold / Fix"
        subtitle="홀드 및 픽스된 데모 정보와 지분/퍼블리싱 정보를 빠르게 확인합니다"
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Stack direction="row" spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Column type="HOLD" tasks={holdItems} onUpdate={handleUpdate} onDelete={handleDelete} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Column type="FIX" tasks={fixItems} onUpdate={handleUpdate} onDelete={handleDelete} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Column type="RELEASE" tasks={releaseItems} onUpdate={handleUpdate} onDelete={handleDelete} />
          </Box>
        </Stack>
        <DragOverlay>
          {activeTask ? (
            <HoldFixCard
              task={activeTask}
              onUpdate={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}
