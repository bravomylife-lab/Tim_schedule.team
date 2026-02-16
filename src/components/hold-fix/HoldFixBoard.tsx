"use client";

import { useState } from "react";
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
import Collapse from "@mui/material/Collapse";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
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

interface CompactCardProps {
  task: TimTask;
  onUpdate: (updates: Partial<HoldFixDetails>) => void;
  onDelete: () => void;
  isDragging?: boolean;
}

function CompactCard({ task, onUpdate, onDelete, isDragging }: CompactCardProps) {
  const [expanded, setExpanded] = useState(false);
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

  const formatWritersCompact = () => {
    if (!details.writers || details.writers.length === 0) return "—";
    if (details.writers.length <= 2) return details.writers.join(", ");
    return `${details.writers[0]}, ${details.writers[1]} +${details.writers.length - 2}`;
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
        border: `1px solid ${borderColor}`,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: expanded ? undefined : 2,
        },
      }}
    >
      <Box
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, textarea")) return;
          setExpanded(!expanded);
        }}
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          minHeight: 56,
          cursor: "pointer",
          "&:hover": {
            bgcolor: expanded ? undefined : "rgba(0, 0, 0, 0.02)",
          },
        }}
      >
        <Chip label={type} color={chipColor} size="small" sx={{ minWidth: 80, fontWeight: 700 }} />

        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
            {details.demoName || "Untitled Demo"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.85rem" }} noWrap>
            {formatWritersCompact()}
            {details.targetArtist && ` → ${details.targetArtist}`}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          sx={{ flexShrink: 0 }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>

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
      </Box>

      <Collapse in={expanded} timeout="auto">
        <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: "1px solid rgba(0, 0, 0, 0.08)" }}>
          <Stack spacing={1.5}>
            <TextField
              label="데모명"
              size="small"
              fullWidth
              value={details.demoName || ""}
              onChange={(e) => onUpdate({ demoName: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />

            <TextField
              label="타겟 아티스트"
              size="small"
              fullWidth
              value={details.targetArtist || ""}
              onChange={(e) => onUpdate({ targetArtist: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />

            <TextField
              label="작곡가 (쉼표 구분)"
              size="small"
              fullWidth
              value={details.writers?.join(", ") || ""}
              onChange={(e) => handleWritersChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <TextField
              label="지분 (예: John 50%, Jane 50%)"
              size="small"
              fullWidth
              value={details.splits ? formatSplits(details.splits) : ""}
              onChange={(e) => handleSplitsChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
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
              label="퍼블리싱 정보"
              size="small"
              fullWidth
              value={details.publishingInfo || ""}
              onChange={(e) => onUpdate({ publishingInfo: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />

            <TextField
              label="이메일"
              size="small"
              fullWidth
              type="email"
              value={details.email || ""}
              onChange={(e) => onUpdate({ email: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />

            <TextField
              label="메모"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={details.notes || ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />

            {type === "HOLD" && (
              <>
                <Box onClick={(e) => e.stopPropagation()}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                    홀드 요청일
                  </Typography>
                  <DateSelect
                    value={details.holdRequestedDate}
                    onChange={(date) => onUpdate({ holdRequestedDate: date })}
                  />
                </Box>

                <TextField
                  label="홀드 기간"
                  size="small"
                  fullWidth
                  value={details.holdPeriod || ""}
                  onChange={(e) => onUpdate({ holdPeriod: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
              </>
            )}

            {type === "FIX" && (
              <>
                <Box onClick={(e) => e.stopPropagation()}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                    픽스 날짜
                  </Typography>
                  <DateSelect
                    value={details.fixDate}
                    onChange={(date) => onUpdate({ fixDate: date })}
                  />
                </Box>

                <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                  <TextField
                    label="프로덕션 비용"
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
                <Box onClick={(e) => e.stopPropagation()}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                    발매일
                  </Typography>
                  <DateSelect
                    value={details.releaseDate}
                    onChange={(date) => onUpdate({ releaseDate: date })}
                  />
                </Box>

                <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                  <TextField
                    label="프로덕션 비용"
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
        </Box>
      </Collapse>
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
      <CompactCard task={task} onUpdate={onUpdate} onDelete={onDelete} isDragging={isDragging} />
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, px: 1 }}>
        <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
          {title}
        </Typography>
        <Chip label={count} size="small" color={type === "FIX" ? "warning" : type === "RELEASE" ? "primary" : "default"} />
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
              onUpdate={(updates) => onUpdate(task.id, updates)}
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
            <Column type="HOLD" tasks={holdItems} onUpdate={handleUpdate} onDelete={handleDelete} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Column type="FIX" tasks={fixItems} onUpdate={handleUpdate} onDelete={handleDelete} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Column type="RELEASE" tasks={releaseItems} onUpdate={handleUpdate} onDelete={handleDelete} />
          </Box>
        </Stack>
        <DragOverlay>
          {activeTask ? (
            <CompactCard
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
