"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
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
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS: Record<string, string> = {
  EARNINGS: "#4CAF50",
  ECONOMIC: "#2196F3",
  HOLIDAY: "#FF9800",
  IPO: "#9C27B0",
  DIVIDEND: "#00BCD4",
  DEFAULT: "#607D8B",
};

const COLOR_PALETTE = [
  { label: "Earnings", value: "#4CAF50" },
  { label: "Economic", value: "#2196F3" },
  { label: "Holiday", value: "#FF9800" },
  { label: "IPO", value: "#9C27B0" },
  { label: "Dividend", value: "#00BCD4" },
  { label: "Default", value: "#607D8B" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function detectEventCategory(title: string, description?: string): string {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  if (/실적|earnings|revenue|매출/.test(text)) return "EARNINGS";
  if (/cpi|ppi|fomc|gdp|금리|고용|인플레이션|경제/.test(text)) return "ECONOMIC";
  if (/휴장|설|추석|holiday|연휴|공휴/.test(text)) return "HOLIDAY";
  if (/ipo|상장/.test(text)) return "IPO";
  if (/배당|dividend/.test(text)) return "DIVIDEND";
  return "DEFAULT";
}

function getEventColor(task: TimTask): string {
  if (task.stockDetails?.eventColor) return task.stockDetails.eventColor;
  const cat = detectEventCategory(task.title, task.description);
  return EVENT_COLORS[cat] ?? EVENT_COLORS.DEFAULT;
}

interface SpanInfo {
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
  isSingleDay: boolean;
}

function getSpanInfo(task: TimTask, date: Date): SpanInfo {
  const start = startOfDay(parseISO(task.startDate));
  const end = task.endDate ? startOfDay(parseISO(task.endDate)) : start;

  const isStart = isSameDay(date, start);
  const isEnd = isSameDay(date, end);
  const isSingleDay = isStart && isEnd;
  const isMiddle = !isStart && !isEnd;

  return { isStart, isEnd, isMiddle, isSingleDay };
}

function spanBorderRadius(info: SpanInfo): string {
  if (info.isSingleDay) return "4px";
  if (info.isStart) return "4px 0 0 4px";
  if (info.isEnd) return "0 4px 4px 0";
  return "0";
}

/* ------------------------------------------------------------------ */
/*  Chat Types                                                         */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Dialog form state                                                  */
/* ------------------------------------------------------------------ */

interface EventFormState {
  title: string;
  ticker: string;
  startDate: string;
  endDate: string;
  color: string;
  note: string;
}

const EMPTY_FORM: EventFormState = {
  title: "",
  ticker: "",
  startDate: "",
  endDate: "",
  color: EVENT_COLORS.DEFAULT,
  note: "",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StockBoard() {
  const { tasks, deleteTask, addTask, updateTask } = useTaskContext();
  const stockTasks = tasks.filter((task) => task.category === "STOCK");

  /* ---------- Calendar state ---------- */
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  /* ---------- Dialog state ---------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  /* ---------- Chatbot state ---------- */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ---------------------------------------------------------------- */
  /*  Calendar helpers                                                 */
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
      stockTasks.filter((task) => {
        const start = parseISO(task.startDate);
        if (task.endDate) {
          const end = parseISO(task.endDate);
          return isWithinInterval(date, {
            start: startOfDay(start),
            end: endOfDay(end),
          });
        }
        return isSameDay(start, date);
      }),
    [stockTasks],
  );

  /* ---------------------------------------------------------------- */
  /*  Day click handler                                                */
  /* ---------------------------------------------------------------- */

  const handleDayClick = (date: Date) => {
    const events = getEventsForDay(date);
    if (events.length > 0) {
      setSelectedDay(date);
    } else {
      // Open create dialog for this date
      openCreateDialog(date);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Dialog handlers                                                  */
  /* ---------------------------------------------------------------- */

  const openCreateDialog = (date?: Date) => {
    setEditingTaskId(null);
    setForm({
      ...EMPTY_FORM,
      startDate: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (task: TimTask) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      ticker: task.stockDetails?.ticker ?? "",
      startDate: task.startDate.slice(0, 10),
      endDate: task.endDate?.slice(0, 10) ?? "",
      color: getEventColor(task),
      note: task.stockDetails?.note ?? "",
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (field: keyof EventFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDialogSave = () => {
    if (!form.title.trim()) return;

    if (editingTaskId) {
      // Edit existing
      updateTask(editingTaskId, {
        title: form.title.trim(),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        stockDetails: {
          ticker: form.ticker.trim() || "EVENT",
          note: form.note,
          eventColor: form.color,
        },
      });
    } else {
      // Create new
      const newTask: TimTask = {
        id: `stock-${Date.now()}`,
        title: form.title.trim(),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        category: "STOCK",
        userEdited: true,
        stockDetails: {
          ticker: form.ticker.trim() || "EVENT",
          note: form.note,
          eventColor: form.color,
        },
      };
      addTask(newTask);
    }

    handleDialogClose();
  };

  const handleDeleteFromDetail = (taskId: string) => {
    deleteTask(taskId);
    const remaining = selectedDayEvents.filter((t) => t.id !== taskId);
    if (remaining.length === 0) setSelectedDay(null);
  };

  /* ---------------------------------------------------------------- */
  /*  Chatbot                                                          */
  /* ---------------------------------------------------------------- */

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");

    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const stockContext = stockTasks
        .map(
          (task) =>
            `${task.stockDetails?.ticker || "N/A"}: ${task.title} on ${format(
              parseISO(task.startDate),
              "MMM dd, yyyy",
            )}${task.stockDetails?.note ? ` - ${task.stockDetails.note}` : ""}`,
        )
        .join("\n");

      const prompt = `Stock Schedule Context:\n${stockContext}\n\nUser Question: ${userMessage}`;

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Derived                                                          */
  /* ---------------------------------------------------------------- */

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <Box>
      <SectionHeader
        title="주식 일정"
        subtitle="실적 발표, 주요 이슈를 캘린더와 AI 어시스턴트로 관리합니다"
      />

      {/* ---- Full-width Large Calendar ---- */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
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
                  {format(currentMonth, "MMMM yyyy")}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => openCreateDialog()}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    일정 추가
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
                    <Box key={`empty-${i}`} sx={{ minHeight: 130 }} />
                  ))}

                  {/* Actual calendar days */}
                  {calendarDays.map((date) => {
                    const dayEvents = getEventsForDay(date);
                    const today = isToday(date);

                    return (
                      <Box
                        key={date.toISOString()}
                        onClick={() => handleDayClick(date)}
                        sx={{
                          minHeight: 130,
                          border: "2px solid",
                          borderColor: today ? "primary.main" : "divider",
                          borderRadius: 1,
                          p: 1,
                          bgcolor: today ? "primary.main" : "background.paper",
                          color: today ? "white" : "text.primary",
                          position: "relative",
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            boxShadow: 4,
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

                        {/* Event bars */}
                        {dayEvents.map((event) => {
                          const color = getEventColor(event);
                          const span = getSpanInfo(event, date);
                          const showLabel = span.isStart || span.isSingleDay;

                          return (
                            <Box
                              key={event.id}
                              sx={{
                                mb: "3px",
                                bgcolor: today
                                  ? "rgba(255,255,255,0.35)"
                                  : `${color}22`,
                                borderLeft: span.isStart || span.isSingleDay
                                  ? `3px solid ${color}`
                                  : "none",
                                borderRadius: spanBorderRadius(span),
                                px: 0.75,
                                py: "3px",
                                minHeight: 22,
                                display: "flex",
                                alignItems: "center",
                                overflow: "hidden",
                              }}
                            >
                              {showLabel && (
                                <Typography
                                  variant="caption"
                                  noWrap
                                  sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: today ? "white" : color,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {event.stockDetails?.ticker
                                    ? `${event.stockDetails.ticker} ${event.title.substring(0, 12)}`
                                    : event.title.substring(0, 18)}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ---- Selected Day Details ---- */}
        {selectedDay && selectedDayEvents.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    {format(selectedDay, "yyyy년 MM월 dd일")} 일정
                  </Typography>
                  <IconButton size="small" onClick={() => setSelectedDay(null)}>
                    <CloseIcon />
                  </IconButton>
                </Stack>

                <Stack spacing={2}>
                  {selectedDayEvents.map((task) => {
                    const color = getEventColor(task);
                    return (
                      <Card
                        key={task.id}
                        variant="outlined"
                        sx={{ borderLeft: `4px solid ${color}` }}
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
                                sx={{ mb: 1 }}
                              >
                                <Chip
                                  label={task.stockDetails?.ticker || "N/A"}
                                  size="small"
                                  sx={{
                                    bgcolor: `${color}22`,
                                    color,
                                    fontWeight: 700,
                                  }}
                                />
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={600}
                                >
                                  {task.title}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                날짜:{" "}
                                {format(
                                  parseISO(task.startDate),
                                  "yyyy-MM-dd",
                                )}
                                {task.endDate &&
                                  ` ~ ${format(parseISO(task.endDate), "yyyy-MM-dd")}`}
                              </Typography>
                              {task.stockDetails?.note && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5 }}
                                >
                                  메모: {task.stockDetails.note}
                                </Typography>
                              )}
                            </Box>

                            {/* Edit + Delete buttons */}
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="수정">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(task);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="삭제">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFromDetail(task.id);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ================================================================ */}
      {/*  Create / Edit Dialog                                             */}
      {/* ================================================================ */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingTaskId ? "일정 수정" : "새 일정 추가"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Title */}
            <TextField
              label="제목"
              fullWidth
              size="small"
              value={form.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              autoFocus
            />

            {/* Ticker */}
            <TextField
              label="티커 (선택)"
              fullWidth
              size="small"
              value={form.ticker}
              onChange={(e) =>
                handleFormChange("ticker", e.target.value.toUpperCase())
              }
              placeholder="예: AAPL, TSLA"
            />

            {/* Dates */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="시작일"
                type="date"
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.startDate}
                onChange={(e) => handleFormChange("startDate", e.target.value)}
              />
              <TextField
                label="종료일 (선택)"
                type="date"
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.endDate}
                onChange={(e) => handleFormChange("endDate", e.target.value)}
              />
            </Stack>

            {/* Color picker */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                색상
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                {COLOR_PALETTE.map((c) => (
                  <Tooltip key={c.value} title={c.label}>
                    <Box
                      onClick={() => handleFormChange("color", c.value)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: c.value,
                        cursor: "pointer",
                        border:
                          form.color === c.value
                            ? "3px solid #000"
                            : "2px solid transparent",
                        transition: "border 0.15s",
                        "&:hover": { opacity: 0.8 },
                      }}
                    />
                  </Tooltip>
                ))}
                {/* Custom color input */}
                <Tooltip title="커스텀 색상">
                  <Box
                    component="input"
                    type="color"
                    value={form.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleFormChange("color", e.target.value)
                    }
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "2px solid #ccc",
                      cursor: "pointer",
                      padding: 0,
                      appearance: "none",
                      WebkitAppearance: "none",
                      "&::-webkit-color-swatch-wrapper": { padding: 0 },
                      "&::-webkit-color-swatch": {
                        border: "none",
                        borderRadius: "50%",
                      },
                    }}
                  />
                </Tooltip>
              </Stack>
            </Box>

            {/* Note */}
            <TextField
              label="메모"
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={5}
              value={form.note}
              onChange={(e) => handleFormChange("note", e.target.value)}
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
            disabled={!form.title.trim()}
          >
            {editingTaskId ? "저장" : "추가"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================ */}
      {/*  Floating Chatbot Toggle Button                                   */}
      {/* ================================================================ */}
      {!chatOpen && (
        <Fab
          color="primary"
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          onClick={() => setChatOpen(true)}
        >
          <SmartToyIcon />
        </Fab>
      )}

      {/* ================================================================ */}
      {/*  Floating Chatbot Drawer                                          */}
      {/* ================================================================ */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 400,
            maxWidth: "100vw",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Chat Header */}
          <Box
            sx={{
              bgcolor: "#1a1a1a",
              color: "white",
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <SmartToyIcon />
              <Typography variant="h6" fontWeight={600}>
                Tim AI Assistant
              </Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setChatOpen(false)}
              sx={{ color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider />

          {/* Chat Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
              bgcolor: "#f5f5f5",
            }}
          >
            {chatMessages.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ mt: 4 }}
              >
                Ask me anything about your stock schedule or market insights!
              </Typography>
            )}
            {chatMessages.map((message, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  bgcolor: message.role === "user" ? "#1976d2" : "white",
                  color: message.role === "user" ? "white" : "text.primary",
                  maxWidth: "85%",
                  ml: message.role === "user" ? "auto" : 0,
                  mr: message.role === "assistant" ? "auto" : 0,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  display="block"
                  sx={{ mb: 0.5 }}
                >
                  {message.role === "user" ? "You" : "Tim AI"}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {message.content}
                </Typography>
              </Paper>
            ))}
            {isLoading && (
              <Paper
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  bgcolor: "white",
                  maxWidth: "85%",
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Thinking...
                </Typography>
              </Paper>
            )}
            <div ref={chatEndRef} />
          </Box>

          <Divider />

          {/* Chat Input */}
          <Box sx={{ p: 2, bgcolor: "white" }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask about stocks, earnings, or market trends..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isLoading}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}
