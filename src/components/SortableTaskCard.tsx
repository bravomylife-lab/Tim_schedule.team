"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import Box from "@mui/material/Box";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import IconButton from "@mui/material/IconButton";
import TaskCard from "@/components/TaskCard";
import { TimTask } from "@/types/tim";

interface SortableTaskCardProps {
  task: TimTask;
  onToggleStar?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function SortableTaskCard({ task, onToggleStar, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: "flex", alignItems: "center" }}>
      <IconButton {...attributes} {...listeners} sx={{ mr: 1 }} aria-label="drag handle">
        <DragIndicatorRounded />
      </IconButton>
      <Box sx={{ flex: 1 }}>
        <TaskCard task={task} onToggleStar={onToggleStar} onDelete={onDelete} />
      </Box>
    </Box>
  );
}
