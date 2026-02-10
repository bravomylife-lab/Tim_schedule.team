"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
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
import DeleteIcon from "@mui/icons-material/Delete";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function StockBoard() {
  const { tasks, deleteTask } = useTaskContext();
  const stockTasks = tasks.filter((task) => task.category === "STOCK");

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const getEventsForDay = (date: Date) => {
    return stockTasks.filter((task) => {
      const start = parseISO(task.startDate);
      if (task.endDate) {
        const end = parseISO(task.endDate);
        return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
      }
      return isSameDay(start, date);
    });
  };

  const handleDayClick = (date: Date) => {
    const events = getEventsForDay(date);
    if (events.length > 0) {
      setSelectedDay(date);
    }
  };

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
              "MMM dd, yyyy"
            )}${task.stockDetails?.note ? ` - ${task.stockDetails.note}` : ""}`
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            tools: [{ googleSearch: {} }],
          }),
        }
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

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <Box>
      <SectionHeader
        title="주식 일정"
        subtitle="실적 발표, 주요 이슈를 캘린더와 AI 어시스턴트로 관리합니다"
      />

      {/* Full-width Large Calendar */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <IconButton onClick={handlePrevMonth}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h5" fontWeight={600}>
                  {format(currentMonth, "MMMM yyyy")}
                </Typography>
                <IconButton onClick={handleNextMonth}>
                  <ChevronRightIcon />
                </IconButton>
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
                      fontWeight={700}
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
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: getDay(calendarDays[0]) }).map((_, i) => (
                    <Box key={`empty-${i}`} sx={{ minHeight: 110 }} />
                  ))}

                  {/* Actual calendar days */}
                  {calendarDays.map((date) => {
                    const dayEvents = getEventsForDay(date);
                    const hasEvent = dayEvents.length > 0;

                    return (
                      <Box
                        key={date.toISOString()}
                        onClick={() => handleDayClick(date)}
                        sx={{
                          minHeight: 110,
                          border: "2px solid",
                          borderColor: isToday(date) ? "primary.main" : "divider",
                          borderRadius: 1,
                          p: 1,
                          bgcolor: isToday(date)
                            ? "primary.main"
                            : "background.paper",
                          color: isToday(date) ? "white" : "text.primary",
                          position: "relative",
                          overflow: "hidden",
                          cursor: hasEvent ? "pointer" : "default",
                          transition: "all 0.2s",
                          "&:hover": {
                            boxShadow: hasEvent ? 4 : 0,
                            transform: hasEvent ? "scale(1.02)" : "none",
                          },
                        }}
                      >
                        <Typography
                          variant="body1"
                          fontWeight={isToday(date) ? 700 : 500}
                          sx={{ mb: 0.5 }}
                        >
                          {format(date, "d")}
                        </Typography>

                        {/* Show event ticker/title */}
                        {dayEvents.map((event, idx) => (
                          <Box key={event.id} sx={{ mb: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "-webkit-box",
                                fontSize: "0.7rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                bgcolor: isToday(date)
                                  ? "rgba(255, 255, 255, 0.3)"
                                  : "rgba(13, 202, 240, 0.15)",
                                color: isToday(date) ? "white" : "#0a7ea3",
                                px: 0.75,
                                py: 0.5,
                                borderRadius: 0.5,
                                fontWeight: 600,
                              }}
                            >
                              {event.stockDetails?.ticker ? `${event.stockDetails.ticker} ${event.title.substring(0, 15)}` : event.title.substring(0, 20)}
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
        </Grid>

        {/* Selected Day Details */}
        {selectedDay && selectedDayEvents.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Events on {format(selectedDay, "MMMM dd, yyyy")}
                  </Typography>
                  <IconButton size="small" onClick={() => setSelectedDay(null)}>
                    <CloseIcon />
                  </IconButton>
                </Stack>
                <Stack spacing={2}>
                  {selectedDayEvents.map((task) => (
                    <Card key={task.id} variant="outlined">
                      <CardContent>
                        <Stack direction="row" alignItems="flex-start" spacing={2}>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                              <Chip
                                label={task.stockDetails?.ticker || "N/A"}
                                size="small"
                                sx={{
                                  bgcolor: "rgba(13, 202, 240, 0.15)",
                                  color: "#0a7ea3",
                                  fontWeight: 700,
                                }}
                              />
                              <Typography variant="subtitle1" fontWeight={600}>
                                {task.title}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              Date: {format(parseISO(task.startDate), "MMM dd, yyyy")}
                            </Typography>
                            {task.stockDetails?.note && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Note: {task.stockDetails.note}
                              </Typography>
                            )}
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              deleteTask(task.id);
                              if (selectedDayEvents.length === 1) {
                                setSelectedDay(null);
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Floating Chatbot Toggle Button */}
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

      {/* Floating Chatbot Drawer */}
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
            <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: "white" }}>
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
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                Ask me anything about your stock schedule or market insights!
              </Typography>
            )}
            {chatMessages.map((message, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  bgcolor:
                    message.role === "user"
                      ? "#1976d2"
                      : "white",
                  color: message.role === "user" ? "white" : "text.primary",
                  maxWidth: "85%",
                  ml: message.role === "user" ? "auto" : 0,
                  mr: message.role === "assistant" ? "auto" : 0,
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  {message.role === "user" ? "You" : "Tim AI"}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {message.content}
                </Typography>
              </Paper>
            ))}
            {isLoading && (
              <Paper sx={{ p: 1.5, mb: 1.5, bgcolor: "white", maxWidth: "85%", borderRadius: 2 }}>
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
                onKeyPress={handleKeyPress}
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
