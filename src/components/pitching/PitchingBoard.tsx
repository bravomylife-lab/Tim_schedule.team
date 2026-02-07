"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useTaskContext } from "@/contexts/TaskContext";
import { PitchingIdea, PitchingGrade } from "@/types/tim";
import SectionHeader from "@/components/SectionHeader";

interface GradeColumn {
  id: PitchingGrade;
  title: string;
}

const GRADE_COLUMNS: GradeColumn[] = [
  { id: "S", title: "S급" },
  { id: "A", title: "A급" },
  { id: "A_JPN", title: "A-급(JPN)" },
];

interface PitchingCardProps {
  idea: PitchingIdea;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PitchingIdea>) => void;
}

function PitchingCard({ idea, onDelete, onUpdate }: PitchingCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = (field: string) => {
    if (field === "writers") {
      onUpdate(idea.id, { writers: editValue.split(",").map((w) => w.trim()) });
    } else {
      onUpdate(idea.id, { [field]: editValue });
    }
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 1.5,
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        touchAction: "none",
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              {editingField === "demoName" ? (
                <TextField
                  size="small"
                  fullWidth
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveEdit("demoName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit("demoName");
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="h6" component="div">
                    {idea.demoName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit("demoName", idea.demoName);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Box>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idea.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <DeleteIcon />
            </IconButton>
          </Stack>

          <Box>
            {editingField === "writers" ? (
              <TextField
                size="small"
                fullWidth
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveEdit("writers")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit("writers");
                  if (e.key === "Escape") handleCancelEdit();
                }}
                autoFocus
                placeholder="Comma separated"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Writers: {idea.writers.join(", ")}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit("writers", idea.writers.join(", "));
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Box>

          <Box>
            {editingField === "publishingInfo" ? (
              <TextField
                size="small"
                fullWidth
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveEdit("publishingInfo")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit("publishingInfo");
                  if (e.key === "Escape") handleCancelEdit();
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Publishing: {idea.publishingInfo}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit("publishingInfo", idea.publishingInfo);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Box>

          {idea.notes && (
            <Box>
              {editingField === "notes" ? (
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveEdit("notes")}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Notes: {idea.notes}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit("notes", idea.notes || "");
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

interface DroppableColumnProps {
  column: GradeColumn;
  ideas: PitchingIdea[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PitchingIdea>) => void;
}

function DroppableColumn({ column, ideas, onDelete, onUpdate }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: 2,
        minHeight: 400,
        flex: 1,
        backgroundColor: "background.default",
      }}
    >
      <Typography variant="h6" gutterBottom>
        {column.title}
      </Typography>
      <Box>
        {ideas.map((idea) => (
          <PitchingCard
            key={idea.id}
            idea={idea}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </Box>
    </Paper>
  );
}

interface AddPitchingDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (idea: Omit<PitchingIdea, "id" | "createdAt">) => void;
}

function AddPitchingDialog({ open, onClose, onAdd }: AddPitchingDialogProps) {
  const [demoName, setDemoName] = useState("");
  const [writers, setWriters] = useState("");
  const [publishingInfo, setPublishingInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [grade, setGrade] = useState<PitchingGrade>("A");

  const handleSubmit = () => {
    if (!demoName.trim() || !writers.trim() || !publishingInfo.trim()) {
      return;
    }

    onAdd({
      demoName: demoName.trim(),
      writers: writers.split(",").map((w) => w.trim()).filter(Boolean),
      publishingInfo: publishingInfo.trim(),
      grade,
      notes: notes.trim() || undefined,
    });

    setDemoName("");
    setWriters("");
    setPublishingInfo("");
    setNotes("");
    setGrade("A");
    onClose();
  };

  const handleClose = () => {
    setDemoName("");
    setWriters("");
    setPublishingInfo("");
    setNotes("");
    setGrade("A");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Pitching Idea</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Demo Name"
            fullWidth
            value={demoName}
            onChange={(e) => setDemoName(e.target.value)}
            required
          />
          <TextField
            label="Writers"
            fullWidth
            value={writers}
            onChange={(e) => setWriters(e.target.value)}
            placeholder="Comma separated"
            required
          />
          <TextField
            label="Publishing Info"
            fullWidth
            value={publishingInfo}
            onChange={(e) => setPublishingInfo(e.target.value)}
            required
          />
          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Select
            value={grade}
            onChange={(e) => setGrade(e.target.value as PitchingGrade)}
            fullWidth
          >
            <MenuItem value="S">S급</MenuItem>
            <MenuItem value="A">A급</MenuItem>
            <MenuItem value="A_JPN">A-급(JPN)</MenuItem>
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!demoName.trim() || !writers.trim() || !publishingInfo.trim()}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PitchingBoard() {
  const { pitchingIdeas, addPitchingIdea, deletePitchingIdea, movePitchingGrade, updatePitchingIdea } = useTaskContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const targetGrade = over.id as PitchingGrade;
      if (["S", "A", "A_JPN"].includes(targetGrade)) {
        movePitchingGrade(active.id as string, targetGrade);
      }
    }

    setActiveId(null);
  };

  const handleAddIdea = (idea: Omit<PitchingIdea, "id" | "createdAt">) => {
    addPitchingIdea(idea);
  };

  const activeIdea = activeId ? pitchingIdeas.find((i) => i.id === activeId) : null;

  return (
    <Box>
      <SectionHeader
        title="Pitching Board"
        subtitle="Manage your pitching ideas by grade"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add Pitching Idea
          </Button>
        }
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Stack direction="row" spacing={2}>
          {GRADE_COLUMNS.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              ideas={pitchingIdeas.filter((idea) => idea.grade === column.id)}
              onDelete={deletePitchingIdea}
              onUpdate={updatePitchingIdea}
            />
          ))}
        </Stack>

        <DragOverlay>
          {activeIdea ? (
            <Card sx={{ opacity: 0.9, cursor: "grabbing" }}>
              <CardContent>
                <Typography variant="h6">{activeIdea.demoName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Writers: {activeIdea.writers.join(", ")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Publishing: {activeIdea.publishingInfo}
                </Typography>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddPitchingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAddIdea}
      />
    </Box>
  );
}
