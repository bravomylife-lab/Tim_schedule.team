"use client";

import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";
import { TimTask } from "@/types/tim";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PRIMARY_COLOR = "#00897b";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/*  Form State                                                          */
/* ------------------------------------------------------------------ */

interface SessionFormState {
  title: string;
  startDate: string;
  description: string;
}

const EMPTY_FORM: SessionFormState = {
  title: "",
  startDate: "",
  description: "",
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function SongCampBoard() {
  const { tasks, deleteTask, addTask, updateTask } = useTaskContext();

  /* Filter tasks that contain "세션" in title or description */
  const sessionTasks = useMemo(
    () =>
      tasks.filter((t) =>
        `${t.title} ${t.description ?? ""}`.includes("세션")
      ),
    [tasks]
  );

  /* ---------- Calendar state ---------- */
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  /* ---------- Dialog state ---------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionFormState>(EMPTY_FORM);

  /* ---------------------------------------------------------------- */
  /*  Calendar helpers                                                  */
  /* ---------------------------------------------------------------- */

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const getEventsForDay = useCallback(
    (date: Date) =>
      sessionTasks.filter((task) => {
        try {
          return isSameDay(parseISO(task.startDate), date);
        } catch {
          return false;
        }
      }),
    [sessionTasks]
  );

  /* ---------------------------------------------------------------- */
  /*  Day click                                                         */
  /* ---------------------------------------------------------------- */

  const handleDayClick = (date: Date) => {
    const events = getEventsForDay(date);
    if (events.length > 0) {
      setSelectedDay(date);
    } else {
      openCreateDialog(date);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Dialog handlers                                                   */
  /* ---------------------------------------------------------------- */

  const openCreateDialog = (date?: Date) => {
    setEditingTaskId(null);
    setForm({
      ...EMPTY_FORM,
      startDate: date
        ? format(date, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (task: TimTask) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      startDate: task.startDate.slice(0, 10),
      description: task.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (
    field: keyof SessionFormState,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDialogSave = () => {
    if (!form.title.trim() || !form.startDate) return;

    if (editingTaskId) {
      updateTask(editingTaskId, {
        title: form.title.trim(),
        startDate: form.startDate,
        description: form.description,
      });
    } else {
      const newTask: TimTask = {
        id: `session-${Date.now()}`,
        title: form.title.trim(),
        startDate: form.startDate,
        description: form.description,
        category: "WEEKLY",
        userEdited: true,
      };
      addTask(newTask);
    }

    handleDialogClose();
  };

  /* ---------------------------------------------------------------- */
  /*  Derived                                                           */
  /* ---------------------------------------------------------------- */

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  /* ================================================================ */
  /*  RENDER                                                            */
  /* ================================================================ */

  return (
    <Box>
      <SectionHeader
        title="송캠프"
        subtitle="세션 일정을 캘린더로 관리합니다"
      />

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {/* Month navigation + Add button */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <IconButton onClick={handlePrevMonth}>
              <ChevronLeftIcon />
            </IconButton>

            <Typography variant="h4" fontWeight={700}>
              {format(currentMonth, "yyyy년 M월")}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openCreateDialog()}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  bgcolor: PRIMARY_COLOR,
                  "&:hover": { bgcolor: "#00695c" },
                }}
              >
                세션 추가
              </Button>
              <IconButton onClick={handleNextMonth}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Stack>

          {/* Calendar Grid */}
          <Box sx={{ width: "100%" }}>
            {/* Weekday headers */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0.5,
                mb: 1,
              }}
            >
              {WEEKDAYS.map((day) => (
                <Typography
                  key={day}
                  variant="body1"
                  align="center"
                  sx={{ fontSize: "0.9rem", fontWeight: 700 }}
                  color="text.secondary"
                >
                  {day}
                </Typography>
              ))}
            </Box>

            {/* Calendar days */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0.5,
              }}
            >
              {/* Empty cells before month starts */}
              {Array.from({ length: getDay(calendarDays[0]) }).map((_, i) => (
                <Box key={`empty-${i}`} sx={{ minHeight: 110 }} />
              ))}

              {/* Actual calendar days */}
              {calendarDays.map((date) => {
                const dayEvents = getEventsForDay(date);
                const today = isToday(date);
                const isSelected =
                  selectedDay !== null && isSameDay(date, selectedDay);

                return (
                  <Box
                    key={date.toISOString()}
                    onClick={() => handleDayClick(date)}
                    sx={{
                      minHeight: 110,
                      border: "2px solid",
                      borderColor: today
                        ? PRIMARY_COLOR
                        : isSelected
                        ? `${PRIMARY_COLOR}88`
                        : "divider",
                      borderRadius: 1,
                      p: 1,
                      bgcolor: today
                        ? PRIMARY_COLOR
                        : isSelected
                        ? `${PRIMARY_COLOR}14`
                        : "background.paper",
                      color: today ? "white" : "text.primary",
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        boxShadow: 3,
                        transform: "scale(1.02)",
                      },
                    }}
                  >
                    {/* Date number */}
                    <Typography
                      variant={today ? "h6" : "body1"}
                      fontWeight={today ? 700 : 600}
                      sx={{ mb: 0.5 }}
                    >
                      {format(date, "d")}
                    </Typography>

                    {/* Session event chips */}
                    {dayEvents.map((event) => (
                      <Box
                        key={event.id}
                        sx={{
                          mb: "3px",
                          bgcolor: today
                            ? "rgba(255,255,255,0.3)"
                            : `${PRIMARY_COLOR}22`,
                          borderLeft: `3px solid ${PRIMARY_COLOR}`,
                          borderRadius: "0 4px 4px 0",
                          px: 0.75,
                          py: "3px",
                          minHeight: 22,
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: today ? "white" : PRIMARY_COLOR,
                            lineHeight: 1.2,
                          }}
                        >
                          {event.title.substring(0, 16)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Selected Day Events Detail */}
      {selectedDay && selectedDayEvents.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" fontWeight={600}>
                {format(selectedDay, "yyyy년 MM월 dd일")} 세션
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedDay(null)}
                color="inherit"
              >
                닫기
              </Button>
            </Stack>

            <Stack spacing={2}>
              {selectedDayEvents.map((task) => (
                <Card
                  key={task.id}
                  variant="outlined"
                  sx={{ borderLeft: `4px solid ${PRIMARY_COLOR}` }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      spacing={2}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mb: 0.5 }}
                        >
                          <Chip
                            label="세션"
                            size="small"
                            sx={{
                              bgcolor: `${PRIMARY_COLOR}22`,
                              color: PRIMARY_COLOR,
                              fontWeight: 700,
                            }}
                          />
                          <Typography variant="subtitle1" fontWeight={600}>
                            {task.title}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          날짜: {format(parseISO(task.startDate), "yyyy-MM-dd")}
                        </Typography>
                        {task.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                          >
                            {task.description}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="수정">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(task);
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                              const remaining = selectedDayEvents.filter(
                                (t) => t.id !== task.id
                              );
                              if (remaining.length === 0)
                                setSelectedDay(null);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingTaskId ? "세션 수정" : "새 세션 추가"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="제목"
              fullWidth
              size="small"
              value={form.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              placeholder="예: 세션 – 홍길동 작곡가"
              autoFocus
            />
            <TextField
              label="날짜"
              type="date"
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.startDate}
              onChange={(e) => handleFormChange("startDate", e.target.value)}
            />
            <TextField
              label="메모 / 설명"
              fullWidth
              size="small"
              multiline
              minRows={3}
              maxRows={6}
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleDialogClose} color="inherit">
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleDialogSave}
            disabled={!form.title.trim() || !form.startDate}
            sx={{
              bgcolor: PRIMARY_COLOR,
              "&:hover": { bgcolor: "#00695c" },
            }}
          >
            {editingTaskId ? "저장" : "추가"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
