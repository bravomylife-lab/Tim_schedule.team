"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import StarRounded from "@mui/icons-material/StarRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import SyncProblemRounded from "@mui/icons-material/SyncProblemRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import OpenInFullRounded from "@mui/icons-material/OpenInFullRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SectionHeader from "@/components/SectionHeader";
import { TimTask } from "@/types/tim";
import {
  isToday,
  isTomorrow,
  isPast,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  format,
} from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";

// Korean day names mapping
const KOREAN_DAYS: Record<string, string> = {
  Sunday: "일요일",
  Monday: "월요일",
  Tuesday: "화요일",
  Wednesday: "수요일",
  Thursday: "목요일",
  Friday: "금요일",
  Saturday: "토요일",
};

// ---- Report Item type ----
interface ReportItem {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
}

const LS_REPORT_ITEMS = "tim_report_items";

function loadReportItems(): ReportItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_REPORT_ITEMS);
    if (!raw) return [];
    return JSON.parse(raw) as ReportItem[];
  } catch {
    return [];
  }
}

function saveReportItems(items: ReportItem[]) {
  try {
    localStorage.setItem(LS_REPORT_ITEMS, JSON.stringify(items));
  } catch {
    // storage full
  }
}

// ---- SortableTaskCard with "Move to Personal" menu ----

interface SortableTaskCardProps {
  task: TimTask;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onDismissCalendarModified?: (id: string) => void;
  onMoveToPersonal: (
    id: string,
    subCategory: "GENERAL" | "YOUTUBE" | "AUTOMATION"
  ) => void;
}

function SortableTaskCard({
  task,
  onToggleStar,
  onDelete,
  onDismissCalendarModified,
  onMoveToPersonal,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleMove = (subCategory: "GENERAL" | "YOUTUBE" | "AUTOMATION") => {
    onMoveToPersonal(task.id, subCategory);
    handleMenuClose();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box {...attributes} {...listeners} sx={{ cursor: "grab", mt: 0.5 }}>
              <DragIndicatorRounded fontSize="small" color="action" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight={task.isStarred ? 600 : 400}>
                {task.title}
              </Typography>
              {task.startDate && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(task.startDate), "MMM d, yyyy")}
                  </Typography>
                  {isToday(parseISO(task.startDate)) && (
                    <Chip
                      label="오늘"
                      size="small"
                      color="primary"
                      sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                    />
                  )}
                </Stack>
              )}
            </Box>
            <Stack direction="row" spacing={0.5}>
              {task.calendarModified && (
                <Chip
                  icon={<SyncProblemRounded />}
                  label="Modified"
                  size="small"
                  color="warning"
                  variant="outlined"
                  onDelete={
                    onDismissCalendarModified
                      ? () => onDismissCalendarModified(task.id)
                      : undefined
                  }
                  sx={{ height: 24 }}
                />
              )}
              <IconButton
                size="small"
                onClick={() => onToggleStar(task.id)}
                color={task.isStarred ? "warning" : "default"}
              >
                <StarRounded fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(task.id)}
                color="error"
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
              <Tooltip title="개인 일정으로 이동">
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreVertRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem
                  dense
                  onClick={() => handleMove("GENERAL")}
                  sx={{ fontSize: "0.85rem" }}
                >
                  개인 일정으로 이동
                </MenuItem>
                <MenuItem
                  dense
                  onClick={() => handleMove("YOUTUBE")}
                  sx={{ fontSize: "0.85rem" }}
                >
                  YOUTUBE로 이동
                </MenuItem>
                <MenuItem
                  dense
                  onClick={() => handleMove("AUTOMATION")}
                  sx={{ fontSize: "0.85rem" }}
                >
                  AI 자동화로 이동
                </MenuItem>
              </Menu>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ---- ReportItemCard ----

interface ReportItemCardProps {
  item: ReportItem;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

function ReportItemCard({ item, onDelete, onUpdateNotes }: ReportItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes);
  const [dialogNotes, setDialogNotes] = useState(item.notes);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onUpdateNotes(item.id, value);
    }, 500);
  };

  const handleDialogOpen = () => {
    setDialogNotes(notes);
    setDialogOpen(true);
  };

  const handleDialogSave = () => {
    setNotes(dialogNotes);
    onUpdateNotes(item.id, dialogNotes);
    setDialogOpen(false);
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
          cursor: "default",
        }}
      >
        <CardContent sx={{ "&:last-child": { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{ flex: 1, cursor: "pointer" }}
              onClick={handleDialogOpen}
            >
              <Typography variant="body1" fontWeight={500}>
                {item.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(parseISO(item.createdAt), "MM/dd HH:mm")}
              </Typography>
              {notes && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "200px",
                    fontStyle: "italic",
                  }}
                >
                  {notes}
                </Typography>
              )}
            </Box>
            <Tooltip title="넓게 보기">
              <IconButton size="small" onClick={handleDialogOpen}>
                <OpenInFullRounded fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? (
                <ExpandLessRounded fontSize="small" />
              ) : (
                <ExpandMoreRounded fontSize="small" />
              )}
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(item.id)}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </Stack>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={6}
              size="small"
              placeholder="메모를 입력하세요..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              sx={{ mt: 1.5 }}
              onClick={(e) => e.stopPropagation()}
            />
          </Collapse>
        </CardContent>
      </Card>

      {/* Wide dialog view */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderTop: "4px solid #7b1fa2" } }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {item.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(parseISO(item.createdAt), "yyyy.MM.dd HH:mm")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                onDelete(item.id);
                setDialogOpen(false);
              }}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            minRows={10}
            placeholder="메모를 입력하세요..."
            value={dialogNotes}
            onChange={(e) => setDialogNotes(e.target.value)}
            variant="outlined"
            sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.95rem", lineHeight: 1.7 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">
            취소
          </Button>
          <Button onClick={handleDialogSave} variant="contained" sx={{ bgcolor: "#7b1fa2", "&:hover": { bgcolor: "#6a1b9a" } }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---- Main OverviewBoard ----

export default function OverviewBoard() {
  const { tasks, deleteTask, toggleStar, dismissCalendarModified, updateTask } =
    useTaskContext();
  const [mounted, setMounted] = useState(false);

  // Report items state
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [newReportTitle, setNewReportTitle] = useState("");
  const [showAddReport, setShowAddReport] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReportItems(loadReportItems());
  }, []);

  // Persist report items
  useEffect(() => {
    if (mounted) saveReportItems(reportItems);
  }, [reportItems, mounted]);

  // Exclude stock/finance/personal content from Overview
  const isStockContent = (task: TimTask) => {
    const text = `${task.title} ${task.description || ""}`.toLowerCase();
    const stockKeywords = [
      "fed", "연준", "fomc", "cpi", "ppi", "gdp", "금리", "인플레이션",
      "주식", "증권", "주가", "실적", "매출", "배당", "ipo", "earnings",
      "ticker", "nasdaq", "kospi", "kosdaq", "etf", "펀드", "차트",
      "에어쇼", "airshow", "고용보고서", "non-farm", "payrolls",
      "리밸런싱", "포트폴리오", "매매", "맥점", "복기", "수익률",
      "tsmc", "엔비디아", "msci", "설 연휴", "설연휴", "휴장",
    ];
    return stockKeywords.some((kw) => text.includes(kw));
  };

  // Sort helper: starred first, today next, then by date
  const sortTasks = (taskList: TimTask[]) => {
    return [...taskList].sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      const aIsToday = a.startDate ? isToday(parseISO(a.startDate)) : false;
      const bIsToday = b.startDate ? isToday(parseISO(b.startDate)) : false;
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  };

  // Filter urgent tasks: past, today, or tomorrow
  const urgentTasks = useMemo(() => {
    const musicTasks = tasks.filter(
      (task) => task.category === "WEEKLY" || task.category === "URGENT"
    );
    const filtered = musicTasks
      .filter((task) => !isStockContent(task))
      .filter((task) => !task.stockDetails)
      .filter((task) =>
        task.startDate
          ? isPast(parseISO(task.startDate)) ||
            isToday(parseISO(task.startDate)) ||
            isTomorrow(parseISO(task.startDate))
          : false
      );
    return sortTasks(filtered);
  }, [tasks]);

  // Filter weekly tasks: within 7 days but NOT urgent
  const weeklyTasks = useMemo(() => {
    const today = new Date();
    const weekEnd = endOfDay(addDays(today, 7));
    const musicTasks = tasks.filter(
      (task) => task.category === "WEEKLY" || task.category === "URGENT"
    );
    const filtered = musicTasks
      .filter((task) => !isStockContent(task))
      .filter((task) => !task.stockDetails)
      .filter((task) => {
        if (!task.startDate) return false;
        const date = parseISO(task.startDate);
        const inWindow = isWithinInterval(date, {
          start: startOfDay(today),
          end: weekEnd,
        });
        const isUrgent = isPast(date) || isToday(date) || isTomorrow(date);
        return inWindow && !isUrgent;
      });
    return sortTasks(filtered);
  }, [tasks]);

  const [urgentList, setUrgentList] = useState<TimTask[]>(urgentTasks);
  const [weeklyList, setWeeklyList] = useState<TimTask[]>(weeklyTasks);

  useEffect(() => {
    setUrgentList(urgentTasks);
  }, [urgentTasks]);

  useEffect(() => {
    setWeeklyList(weeklyTasks);
  }, [weeklyTasks]);

  const handleToggleStar = (id: string) => {
    toggleStar(id);
  };

  const handleMoveToPersonal = (
    id: string,
    subCategory: "GENERAL" | "YOUTUBE" | "AUTOMATION"
  ) => {
    updateTask(id, { category: "PERSONAL", subCategory });
  };

  const handleUrgentDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = urgentList.findIndex((item) => item.id === active.id);
    const newIndex = urgentList.findIndex((item) => item.id === over.id);
    setUrgentList((items) => arrayMove(items, oldIndex, newIndex));
  };

  const handleWeeklyDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = weeklyList.findIndex((item) => item.id === active.id);
    const newIndex = weeklyList.findIndex((item) => item.id === over.id);
    setWeeklyList((items) => arrayMove(items, oldIndex, newIndex));
  };

  // Report item handlers
  const handleAddReportItem = () => {
    const title = newReportTitle.trim();
    if (!title) return;
    const newItem: ReportItem = {
      id: `report-${Date.now()}`,
      title,
      notes: "",
      createdAt: new Date().toISOString(),
    };
    setReportItems((prev) => [newItem, ...prev]);
    setNewReportTitle("");
    setShowAddReport(false);
  };

  const handleDeleteReportItem = (id: string) => {
    setReportItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateReportNotes = (id: string, notes: string) => {
    setReportItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  // Get today's date formatted in Korean
  const todayDate = new Date();
  const dayName =
    KOREAN_DAYS[format(todayDate, "EEEE")] || format(todayDate, "EEEE");

  return (
    <Box>
      {/* Today's Date Display */}
      <Box sx={{ mb: 3, textAlign: "center" }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {format(todayDate, "yyyy년 M월 d일")}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {dayName}
        </Typography>
      </Box>

      <SectionHeader
        title="Overview"
        subtitle="오늘/내일 긴급 업무와 7일 내 TASK를 한 번에 관리합니다"
      />
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        {/* Urgent Tasks */}
        <Box sx={{ flex: 1 }}>
          <Paper
            sx={{
              overflow: "hidden",
              borderTop: "4px solid",
              borderTopColor: "error.main",
            }}
          >
            <Box
              sx={{
                bgcolor: "error.main",
                color: "error.contrastText",
                px: 3,
                py: 2,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Urgent
              </Typography>
              <Typography variant="caption">
                오늘 또는 내일까지 반드시 처리해야 할 업무
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              {mounted ? (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleUrgentDragEnd}
                >
                  <SortableContext
                    items={urgentList.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {urgentList.length > 0 ? (
                      urgentList.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onToggleStar={handleToggleStar}
                          onDelete={deleteTask}
                          onDismissCalendarModified={dismissCalendarModified}
                          onMoveToPersonal={handleMoveToPersonal}
                        />
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                      >
                        No urgent tasks
                      </Typography>
                    )}
                  </SortableContext>
                </DndContext>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  Loading...
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Weekly Tasks */}
        <Box sx={{ flex: 1 }}>
          <Paper
            sx={{
              overflow: "hidden",
              borderTop: "4px solid",
              borderTopColor: "primary.main",
            }}
          >
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                px: 3,
                py: 2,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Weekly Tasks
              </Typography>
              <Typography variant="caption">향후 7일 예정 업무</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              {mounted ? (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleWeeklyDragEnd}
                >
                  <SortableContext
                    items={weeklyList.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {weeklyList.length > 0 ? (
                      weeklyList.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onToggleStar={handleToggleStar}
                          onDelete={deleteTask}
                          onDismissCalendarModified={dismissCalendarModified}
                          onMoveToPersonal={handleMoveToPersonal}
                        />
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                      >
                        No weekly tasks
                      </Typography>
                    )}
                  </SortableContext>
                </DndContext>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  Loading...
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Things to Report */}
        <Box sx={{ flex: 1 }}>
          <Paper
            sx={{
              overflow: "hidden",
              borderTop: "4px solid",
              borderTopColor: "#7b1fa2",
            }}
          >
            <Box
              sx={{
                bgcolor: "#7b1fa2",
                color: "white",
                px: 3,
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Things to report
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  보고 / 공유할 내용 메모
                </Typography>
              </Box>
              <Tooltip title="항목 추가">
                <IconButton
                  size="small"
                  onClick={() => setShowAddReport((v) => !v)}
                  sx={{ color: "white" }}
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ p: 3 }}>
              {/* Add new report item form */}
              <Collapse in={showAddReport} timeout="auto" unmountOnExit>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="보고 항목 제목..."
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddReportItem();
                      if (e.key === "Escape") {
                        setShowAddReport(false);
                        setNewReportTitle("");
                      }
                    }}
                    autoFocus
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={handleAddReportItem}
                    disabled={!newReportTitle.trim()}
                  >
                    <AddRounded fontSize="small" />
                  </IconButton>
                </Stack>
                <Divider sx={{ mb: 2 }} />
              </Collapse>

              {mounted ? (
                reportItems.length > 0 ? (
                  reportItems.map((item) => (
                    <ReportItemCard
                      key={item.id}
                      item={item}
                      onDelete={handleDeleteReportItem}
                      onUpdateNotes={handleUpdateReportNotes}
                    />
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    보고할 항목이 없습니다
                  </Typography>
                )
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  Loading...
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
