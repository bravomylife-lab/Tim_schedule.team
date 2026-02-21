"use client";

import React, { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Fab from "@mui/material/Fab";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isValid,
} from "date-fns";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { ReleaseItem } from "@/types/tim";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";
import EventNoteRounded from "@mui/icons-material/EventNoteRounded";

const LS_KEY = "tim_release_items";
const PRIMARY_COLOR = "#e91e63";

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────
function loadReleaseItems(): ReleaseItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReleaseItem[];
  } catch {
    return [];
  }
}

function saveReleaseItems(items: ReleaseItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // storage full
  }
}

// ──────────────────────────────────────────────
// Empty form factory
// ──────────────────────────────────────────────
function emptyForm(): Omit<ReleaseItem, "id" | "createdAt"> {
  return {
    album: "",
    artist: "",
    song: "",
    lyricBy: "",
    composedBy: "",
    arrangedBy: "",
    releaseDate: format(new Date(), "yyyy-MM-dd"),
    label: "",
    trackNumber: "",
    youtubeUrl: "",
    notes: "",
  };
}

// ──────────────────────────────────────────────
// Word export
// ──────────────────────────────────────────────
async function exportToWord(releases: ReleaseItem[], month: Date) {
  const monthTitle = `*${format(month, "yyyy")}년 ${format(month, "M")}월 발매 곡 정리`;

  const children: Paragraph[] = [
    new Paragraph({ text: monthTitle, heading: HeadingLevel.HEADING_1 }),
  ];

  releases.forEach((item) => {
    const separator = "─".repeat(40);
    children.push(new Paragraph({ text: separator }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Album: ${item.album}` })],
      })
    );
    children.push(new Paragraph({ text: `Artist: ${item.artist}` }));
    children.push(new Paragraph({ text: `Song: ${item.song}` }));
    children.push(new Paragraph({ text: "Writers" }));
    children.push(
      new Paragraph({
        text: `  • Lyric by: ${item.lyricBy}`,
        bullet: { level: 0 },
      })
    );
    children.push(
      new Paragraph({
        text: `  • Composed by: ${item.composedBy}`,
        bullet: { level: 0 },
      })
    );
    children.push(
      new Paragraph({
        text: `  • Arranged by: ${item.arrangedBy}`,
        bullet: { level: 0 },
      })
    );
    const releaseDateParsed = parseISO(item.releaseDate);
    const releaseDateStr = isValid(releaseDateParsed)
      ? format(releaseDateParsed, "yyyy.MM.dd")
      : item.releaseDate;
    children.push(new Paragraph({ text: `Release Date: ${releaseDateStr}` }));
    children.push(new Paragraph({ text: `Label: ${item.label}` }));
    children.push(new Paragraph({ text: `Track Number: ${item.trackNumber}` }));
    children.push(new Paragraph({ text: `YouTube: ${item.youtubeUrl}` }));
    if (item.notes) {
      children.push(new Paragraph({ text: `Notes: ${item.notes}` }));
    }
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `릴리즈스케줄_${format(month, "yyyy-MM")}.docx`);
}

// ──────────────────────────────────────────────
// Edit / Create Dialog
// ──────────────────────────────────────────────
interface EditDialogProps {
  open: boolean;
  initial: Omit<ReleaseItem, "id" | "createdAt">;
  onClose: () => void;
  onSave: (data: Omit<ReleaseItem, "id" | "createdAt">) => void;
}

function EditDialog({ open, initial, onClose, onSave }: EditDialogProps) {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial, open]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        릴리즈 정보 입력
        <IconButton size="small" onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Album" size="small" fullWidth value={form.album} onChange={set("album")} />
          <TextField label="Artist" size="small" fullWidth value={form.artist} onChange={set("artist")} />
          <TextField label="Song" size="small" fullWidth value={form.song} onChange={set("song")} />
          <TextField
            label="Release Date"
            size="small"
            fullWidth
            type="date"
            value={form.releaseDate}
            onChange={set("releaseDate")}
            InputLabelProps={{ shrink: true }}
          />
          <TextField label="Label" size="small" fullWidth value={form.label} onChange={set("label")} />
          <TextField
            label="Track Number (e.g. 4, Digital Single)"
            size="small"
            fullWidth
            value={form.trackNumber}
            onChange={set("trackNumber")}
          />
          <TextField label="YouTube URL" size="small" fullWidth value={form.youtubeUrl} onChange={set("youtubeUrl")} />
          <Divider>Writers</Divider>
          <TextField label="Lyric by" size="small" fullWidth value={form.lyricBy} onChange={set("lyricBy")} />
          <TextField label="Composed by" size="small" fullWidth value={form.composedBy} onChange={set("composedBy")} />
          <TextField label="Arranged by" size="small" fullWidth value={form.arrangedBy} onChange={set("arrangedBy")} />
          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={form.notes || ""}
            onChange={set("notes")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" onClick={() => onSave(form)} sx={{ backgroundColor: PRIMARY_COLOR, "&:hover": { backgroundColor: "#c2185b" } }}>
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Detail / View Dialog
// ──────────────────────────────────────────────
interface DetailDialogProps {
  open: boolean;
  item: ReleaseItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DetailDialog({ open, item, onClose, onEdit, onDelete }: DetailDialogProps) {
  if (!item) return null;

  const releaseDateParsed = parseISO(item.releaseDate);
  const releaseDateStr = isValid(releaseDateParsed)
    ? format(releaseDateParsed, "yyyy.MM.dd")
    : item.releaseDate;

  const separator = "─".repeat(32);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Stack spacing={0.25}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {item.album}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.artist}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="수정">
            <IconButton size="small" onClick={onEdit}>
              <EditRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="삭제">
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.25 }}>
              {item.song}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Song
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: "text.secondary", letterSpacing: 1 }}>
            {separator}
          </Typography>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Writers
            </Typography>
            <Stack spacing={0.5} sx={{ pl: 1 }}>
              <Typography variant="body2">
                • Lyric by: {item.lyricBy || "—"}
              </Typography>
              <Typography variant="body2">
                • Composed by: {item.composedBy || "—"}
              </Typography>
              <Typography variant="body2">
                • Arranged by: {item.arrangedBy || "—"}
              </Typography>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ color: "text.secondary", letterSpacing: 1 }}>
            {separator}
          </Typography>

          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1}>
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                Release Date
              </Typography>
              <Typography variant="body2">{releaseDateStr}</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                Label
              </Typography>
              <Typography variant="body2">{item.label || "—"}</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                Track Number
              </Typography>
              <Typography variant="body2">{item.trackNumber || "—"}</Typography>
            </Stack>
            {item.youtubeUrl && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                  YouTube
                </Typography>
                <Button
                  size="small"
                  endIcon={<OpenInNewRounded fontSize="small" />}
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textTransform: "none", p: 0, color: PRIMARY_COLOR, fontSize: "0.8rem" }}
                >
                  링크 열기
                </Button>
              </Stack>
            )}
            {item.notes && (
              <Stack direction="row" spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {item.notes}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Google Calendar event text parser
// 사용자 작성 패턴: "2026.02.19 발매 가수COII,노래제목typing, 저작자정보Oliver..."
// ──────────────────────────────────────────────
interface ParsedGcalEvent {
  releaseDate: string | null; // "yyyy-MM-dd"
  artist: string;
  song: string;
  writers: string; // raw writers string, goes into all three writer fields
}

function parseGcalEventText(text: string): ParsedGcalEvent {
  // 1. Extract date: YYYY.MM.DD or YYYY.M.D anywhere in text
  const dateMatch = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  let releaseDate: string | null = null;
  if (dateMatch) {
    releaseDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
  }

  // 2. Use indexOf to locate keyword positions
  const KW_ARTIST  = "가수";     // length 2
  const KW_SONG    = "노래제목"; // length 4
  const KW_WRITERS = "저작자정보"; // length 5

  const artistIdx  = text.indexOf(KW_ARTIST);
  const songIdx    = text.indexOf(KW_SONG);
  const writersIdx = text.indexOf(KW_WRITERS);

  function sliceBetween(start: number, kwLen: number, ...ends: number[]): string {
    const from = start + kwLen;
    const validEnds = ends.filter((e) => e > from).sort((a, b) => a - b);
    const raw = validEnds.length > 0 ? text.slice(from, validEnds[0]) : text.slice(from);
    return raw.replace(/^[\s,]+/, "").replace(/[\s,]+$/, ""); // trim leading/trailing space & comma
  }

  const artist  = artistIdx  !== -1 ? sliceBetween(artistIdx,  KW_ARTIST.length,  songIdx, writersIdx) : "";
  const song    = songIdx    !== -1 ? sliceBetween(songIdx,    KW_SONG.length,    artistIdx, writersIdx) : "";
  const writers = writersIdx !== -1 ? text.slice(writersIdx + KW_WRITERS.length).replace(/^[\s,]+/, "").trim() : "";

  return { releaseDate, artist, song, writers };
}

// ──────────────────────────────────────────────
// Google Calendar task detail dialog (read-only)
// ──────────────────────────────────────────────
const GCAL_COLOR = "#ff6d00"; // deep orange

interface GCalTaskDialogProps {
  open: boolean;
  title: string;
  date: string;
  description?: string;
  onClose: () => void;
}

function GCalTaskDialog({ open, title, date, description, onClose }: GCalTaskDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <EventNoteRounded sx={{ color: GCAL_COLOR }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Google Calendar 일정
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {date}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {description}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
            * Google Calendar에서 동기화된 읽기 전용 일정입니다.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Calendar helpers
// ──────────────────────────────────────────────
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

function itemsOnDay(items: ReleaseItem[], day: Date): ReleaseItem[] {
  return items.filter((item) => {
    const d = parseISO(item.releaseDate);
    return isValid(d) && isSameDay(d, day);
  });
}

function itemsInMonth(items: ReleaseItem[], month: Date): ReleaseItem[] {
  return items.filter((item) => {
    const d = parseISO(item.releaseDate);
    return isValid(d) && isSameMonth(d, month);
  });
}

// ──────────────────────────────────────────────
// Main Board
// ──────────────────────────────────────────────
export default function ReleaseScheduleBoard() {
  const { tasks } = useTaskContext();
  const [items, setItems] = useState<ReleaseItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReleaseItem | null>(null);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [editInitial, setEditInitial] = useState<Omit<ReleaseItem, "id" | "createdAt">>(emptyForm());

  // GCal task dialog state (read-only, kept for fallback)
  const [gcalOpen, setGcalOpen] = useState(false);
  const [gcalTask, setGcalTask] = useState<{ title: string; date: string; description?: string } | null>(null);

  // Filter Google Calendar tasks with "릴리즈" or "발매" keywords
  const gcalReleaseTasks = tasks.filter((t) => {
    const text = `${t.title} ${t.description ?? ""}`;
    return text.includes("릴리즈") || text.includes("발매");
  });

  // GCal task pending ID (used when creating a ReleaseItem from a GCal task)
  const [pendingGcalTaskId, setPendingGcalTaskId] = useState<string | null>(null);

  const handleGcalChipClick = (taskId: string, title: string, startDate: string, description?: string) => {
    // Check if there's already a ReleaseItem linked to this GCal task
    const existing = items.find((i) => i.gcalTaskId === taskId);
    if (existing) {
      setSelectedItem(existing);
      setDetailOpen(true);
    } else {
      // Parse structured data from event text (title + description)
      const fullText = `${title} ${description ?? ""}`;
      const parsed = parseGcalEventText(fullText);
      setPendingGcalTaskId(taskId);
      setEditMode("create");
      setEditInitial({
        ...emptyForm(),
        artist: parsed.artist,
        song: parsed.song,
        lyricBy: parsed.writers,
        composedBy: parsed.writers,
        arrangedBy: parsed.writers,
        releaseDate: parsed.releaseDate ?? startDate.slice(0, 10),
        notes: description ?? "",
      });
      setEditOpen(true);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    setItems(loadReleaseItems());
  }, []);

  const persist = useCallback((next: ReleaseItem[]) => {
    setItems(next);
    saveReleaseItems(next);
  }, []);

  // ── Handlers ──

  const handleOpenCreate = () => {
    setEditMode("create");
    setEditInitial(emptyForm());
    setEditOpen(true);
  };

  const handleEventClick = (item: ReleaseItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleEditFromDetail = () => {
    if (!selectedItem) return;
    setDetailOpen(false);
    setEditMode("edit");
    setEditInitial({
      album: selectedItem.album,
      artist: selectedItem.artist,
      song: selectedItem.song,
      lyricBy: selectedItem.lyricBy,
      composedBy: selectedItem.composedBy,
      arrangedBy: selectedItem.arrangedBy,
      releaseDate: selectedItem.releaseDate,
      label: selectedItem.label,
      trackNumber: selectedItem.trackNumber,
      youtubeUrl: selectedItem.youtubeUrl,
      notes: selectedItem.notes,
    });
    setEditOpen(true);
  };

  const handleDeleteFromDetail = () => {
    if (!selectedItem) return;
    persist(items.filter((i) => i.id !== selectedItem.id));
    setDetailOpen(false);
    setSelectedItem(null);
  };

  const handleSave = (data: Omit<ReleaseItem, "id" | "createdAt">) => {
    if (editMode === "create") {
      const newItem: ReleaseItem = {
        ...data,
        id: `release-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...(pendingGcalTaskId ? { gcalTaskId: pendingGcalTaskId } : {}),
      };
      persist([...items, newItem]);
    } else if (editMode === "edit" && selectedItem) {
      persist(
        items.map((i) => (i.id === selectedItem.id ? { ...selectedItem, ...data } : i))
      );
      setSelectedItem((prev) => (prev ? { ...prev, ...data } : prev));
    }
    setPendingGcalTaskId(null);
    setEditOpen(false);
  };

  const handleExportWord = async () => {
    const monthReleases = itemsInMonth(items, currentMonth).sort(
      (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    );
    await exportToWord(monthReleases, currentMonth);
  };

  const calDays = getCalendarDays(currentMonth);

  return (
    <Box sx={{ pb: 8 }}>
      <SectionHeader
        title="릴리즈 스케줄"
        subtitle="월별 발매 곡 일정을 캘린더 형태로 관리하고 Word로 내보냅니다"
      />

      {/* Month navigation */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <IconButton onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
          <ChevronLeftRounded />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 160, textAlign: "center" }}>
          {format(currentMonth, "yyyy년 M월")}
        </Typography>
        <IconButton onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
          <ChevronRightRounded />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<DownloadRounded />}
          onClick={handleExportWord}
          sx={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR, "&:hover": { borderColor: "#c2185b", color: "#c2185b" } }}
        >
          Word로 내보내기
        </Button>
      </Stack>

      {/* Calendar grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
          backgroundColor: "divider",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Day headers */}
        {DAY_HEADERS.map((d) => (
          <Box
            key={d}
            sx={{
              backgroundColor: "background.paper",
              p: 1,
              textAlign: "center",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: d === "Sun" ? "#e91e63" : d === "Sat" ? "#1976d2" : "text.primary" }}>
              {d}
            </Typography>
          </Box>
        ))}

        {/* Calendar cells */}
        {calDays.map((day) => {
          const dayItems = itemsOnDay(items, day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const dayOfWeek = day.getDay();

          // Google Calendar tasks on this day (exclude those already linked to a ReleaseItem)
          // Use parsed date from event text, not startDate
          const linkedGcalIds = new Set(items.map((i) => i.gcalTaskId).filter(Boolean));
          const dayGcalTasks = gcalReleaseTasks.filter((t) => {
            if (linkedGcalIds.has(t.id)) return false;
            const fullText = `${t.title} ${t.description ?? ""}`;
            const parsed = parseGcalEventText(fullText);
            const d = parsed.releaseDate ? parseISO(parsed.releaseDate) : parseISO(t.startDate);
            return isValid(d) && isSameDay(d, day);
          });

          return (
            <Box
              key={day.toISOString()}
              sx={{
                backgroundColor: isCurrentMonth ? "background.paper" : "rgba(0,0,0,0.02)",
                minHeight: 90,
                p: 0.75,
                position: "relative",
                "&:hover": isCurrentMonth ? { backgroundColor: "rgba(0,0,0,0.02)" } : {},
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: isToday ? PRIMARY_COLOR : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isToday ? 700 : 400,
                    color: isToday
                      ? "#fff"
                      : !isCurrentMonth
                      ? "text.disabled"
                      : dayOfWeek === 0
                      ? "#e91e63"
                      : dayOfWeek === 6
                      ? "#1976d2"
                      : "text.primary",
                  }}
                >
                  {format(day, "d")}
                </Typography>
              </Box>

              <Stack spacing={0.25}>
                {/* Manually added release items */}
                {dayItems.map((item) => (
                  <Chip
                    key={item.id}
                    label={`${item.artist} - ${item.song}`}
                    size="small"
                    onClick={() => handleEventClick(item)}
                    sx={{
                      backgroundColor: PRIMARY_COLOR,
                      color: "#fff",
                      fontSize: "0.65rem",
                      height: 18,
                      cursor: "pointer",
                      "& .MuiChip-label": { px: 0.75 },
                      "&:hover": { backgroundColor: "#c2185b" },
                      maxWidth: "100%",
                    }}
                  />
                ))}
                {/* Google Calendar synced release tasks */}
                {dayGcalTasks.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.title}
                    size="small"
                    variant="outlined"
                    onClick={() => handleGcalChipClick(t.id, t.title, t.startDate, t.description ?? undefined)}
                    sx={{
                      borderColor: GCAL_COLOR,
                      color: GCAL_COLOR,
                      fontSize: "0.65rem",
                      height: 18,
                      cursor: "pointer",
                      "& .MuiChip-label": { px: 0.75 },
                      "&:hover": { backgroundColor: "rgba(255,109,0,0.08)" },
                      maxWidth: "100%",
                    }}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* FAB */}
      <Fab
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          backgroundColor: PRIMARY_COLOR,
          color: "#fff",
          "&:hover": { backgroundColor: "#c2185b" },
        }}
        onClick={handleOpenCreate}
      >
        <AddRounded />
      </Fab>

      {/* Edit / Create Dialog */}
      <EditDialog
        open={editOpen}
        initial={editInitial}
        onClose={() => { setPendingGcalTaskId(null); setEditOpen(false); }}
        onSave={handleSave}
      />

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        item={selectedItem}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      {/* Google Calendar Task Dialog */}
      <GCalTaskDialog
        open={gcalOpen}
        title={gcalTask?.title ?? ""}
        date={gcalTask?.date ?? ""}
        description={gcalTask?.description}
        onClose={() => { setGcalOpen(false); setGcalTask(null); }}
      />
    </Box>
  );
}
