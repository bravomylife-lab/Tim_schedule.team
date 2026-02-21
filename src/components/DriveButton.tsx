"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import GoogleIcon from "@mui/icons-material/Google";
import { useTaskContext } from "@/contexts/TaskContext";
import { ReleaseItem, PitchingIdea } from "@/types/tim";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY   = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

// Spreadsheet ID cached in localStorage
const LS_SHEET_ID = "tim_gsheet_id";

// Requires both calendar (already in SyncButton) + spreadsheets scopes.
// We use a separate token client so the user sees a single "allow Sheets" consent when first clicking.
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function loadReleaseItems(): ReleaseItem[] {
  try {
    return JSON.parse(localStorage.getItem("tim_release_items") ?? "[]");
  } catch { return []; }
}

function loadPitchingIdeas(): PitchingIdea[] {
  try {
    return JSON.parse(localStorage.getItem("tim_pitching_ideas") ?? "[]");
  } catch { return []; }
}

function loadReportItems(): { id: string; notes: string }[] {
  try {
    return JSON.parse(localStorage.getItem("tim_report_items") ?? "[]");
  } catch { return []; }
}

// ────────────────────────────────────────────────
// Sheet data builders — each returns [header, ...rows] as string[][]
// ────────────────────────────────────────────────
function buildCollabRows(tasks: ReturnType<typeof useTaskContext>["tasks"]) {
  const cols = ["제목", "상태", "트랙명", "프로듀서", "탑라이너", "타겟아티스트", "퍼블리싱", "데드라인", "메모", "믹스본전달", "별표"];
  const rows = tasks
    .filter((t) => t.category === "COLLAB")
    .map((t) => [
      t.title,
      t.collabDetails?.status ?? "",
      t.collabDetails?.trackName ?? t.collabDetails?.songName ?? "",
      t.collabDetails?.trackProducer ?? "",
      t.collabDetails?.topLiner ?? "",
      t.collabDetails?.targetArtist ?? "",
      t.collabDetails?.publishingInfo ?? "",
      t.collabDetails?.deadline ?? t.endDate ?? "",
      t.collabDetails?.notes ?? "",
      t.collabDetails?.mixMonitorSent ? "O" : "X",
      t.isStarred ? "★" : "",
    ]);
  return [cols, ...rows];
}

function buildHoldFixRows(tasks: ReturnType<typeof useTaskContext>["tasks"]) {
  const cols = ["제목", "유형", "데모명", "작가", "퍼블리싱", "프로덕션피", "Mech피", "통화", "홀드날짜", "홀드기간", "타겟아티스트", "메모", "별표"];
  const rows = tasks
    .filter((t) => t.category === "HOLD_FIX")
    .map((t) => [
      t.title,
      t.holdFixDetails?.type ?? "",
      t.holdFixDetails?.demoName ?? "",
      (t.holdFixDetails?.writers ?? []).join(", "),
      t.holdFixDetails?.publishingInfo ?? "",
      String(t.holdFixDetails?.productionFee ?? ""),
      String(t.holdFixDetails?.mechanicalFee ?? ""),
      t.holdFixDetails?.currency ?? "",
      t.holdFixDetails?.holdRequestedDate ?? "",
      t.holdFixDetails?.holdPeriod ?? "",
      t.holdFixDetails?.targetArtist ?? "",
      t.holdFixDetails?.notes ?? "",
      t.isStarred ? "★" : "",
    ]);
  return [cols, ...rows];
}

function buildReleaseRows(items: ReleaseItem[]) {
  const cols = ["Album", "Artist", "Song", "Lyric by", "Composed by", "Arranged by", "Release Date", "Label", "Track #", "YouTube", "메모"];
  const rows = items.map((r) => [
    r.album, r.artist, r.song,
    r.lyricBy, r.composedBy, r.arrangedBy,
    r.releaseDate, r.label, r.trackNumber,
    r.youtubeUrl, r.notes ?? "",
  ]);
  return [cols, ...rows];
}

function buildPitchingRows(ideas: PitchingIdea[]) {
  const cols = ["데모명", "작가", "퍼블리싱", "등급", "메모", "생성일"];
  const rows = ideas.map((p) => [
    p.demoName,
    (p.writers ?? []).join(", "),
    p.publishingInfo ?? "",
    p.grade,
    p.notes ?? "",
    p.createdAt ? p.createdAt.slice(0, 10) : "",
  ]);
  return [cols, ...rows];
}

function buildPersonalRows(tasks: ReturnType<typeof useTaskContext>["tasks"]) {
  const cols = ["제목", "서브카테고리", "설명", "날짜", "별표"];
  const rows = tasks
    .filter((t) => t.category === "PERSONAL")
    .map((t) => [
      t.title,
      (t as any).subCategory ?? "",
      t.description ?? "",
      t.startDate ?? "",
      t.isStarred ? "★" : "",
    ]);
  return [cols, ...rows];
}

function buildStockRows(tasks: ReturnType<typeof useTaskContext>["tasks"]) {
  const cols = ["제목", "설명", "날짜", "별표"];
  const rows = tasks
    .filter((t) => t.category === "STOCK")
    .map((t) => [
      t.title, t.description ?? "", t.startDate ?? "", t.isStarred ? "★" : "",
    ]);
  return [cols, ...rows];
}

function buildReportRows(items: { id: string; notes: string }[]) {
  const cols = ["ID", "내용"];
  const rows = items.map((r) => [r.id, r.notes ?? ""]);
  return [cols, ...rows];
}

// ────────────────────────────────────────────────
// Sheets REST API helpers (direct fetch — bypasses gapi API key restrictions)
// ────────────────────────────────────────────────
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

function getToken(): string {
  const tok = window.gapi?.client?.getToken?.();
  if (!tok?.access_token) throw new Error("OAuth 토큰이 없습니다. 다시 로그인해주세요.");
  return tok.access_token as string;
}

async function sheetsRequest(method: string, url: string, body?: unknown) {
  const token = getToken();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

async function ensureSpreadsheet(title: string): Promise<string> {
  const cached = localStorage.getItem(LS_SHEET_ID);
  if (cached) {
    try {
      await sheetsRequest("GET", `${SHEETS_BASE}/${cached}`);
      return cached;
    } catch {
      localStorage.removeItem(LS_SHEET_ID);
    }
  }
  const res = await sheetsRequest("POST", SHEETS_BASE, { properties: { title } });
  const id = res.spreadsheetId as string;
  localStorage.setItem(LS_SHEET_ID, id);
  return id;
}

interface SheetSection {
  title: string;
  data: string[][];
}

async function syncAllSheets(spreadsheetId: string, sections: SheetSection[]) {
  // Get existing sheets
  const meta = await sheetsRequest("GET", `${SHEETS_BASE}/${spreadsheetId}`);
  const existingSheets: { title: string; sheetId: number }[] =
    (meta.sheets ?? []).map((s: any) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
    }));

  // Add missing sheets
  const addRequests = sections
    .filter((sec) => !existingSheets.find((e) => e.title === sec.title))
    .map((sec) => ({ addSheet: { properties: { title: sec.title } } }));

  if (addRequests.length > 0) {
    await sheetsRequest("POST", `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
      requests: addRequests,
    });
  }

  // Re-fetch to get updated sheetIds
  const metaAfter = await sheetsRequest("GET", `${SHEETS_BASE}/${spreadsheetId}`);
  const sheetMap: Record<string, number> = {};
  for (const s of metaAfter.sheets ?? []) {
    sheetMap[s.properties.title] = s.properties.sheetId;
  }

  // Clear existing content
  const clearRequests = sections.map((sec) => ({
    updateCells: {
      range: { sheetId: sheetMap[sec.title] },
      fields: "userEnteredValue",
    },
  }));
  await sheetsRequest("POST", `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
    requests: clearRequests,
  });

  // Write all data
  await sheetsRequest(
    "POST",
    `${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      valueInputOption: "RAW",
      data: sections.map((sec) => ({
        range: `'${sec.title}'!A1`,
        majorDimension: "ROWS",
        values: sec.data,
      })),
    }
  );
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────
export default function DriveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const [sheetsReady, setSheetsReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { tasks } = useTaskContext();
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Wait until gapi is available (loaded by SyncButton) — no Sheets discovery needed for fetch approach
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.gapi?.client) {
        clearInterval(interval);
        setSheetsReady(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Init GIS token client for Sheets scope
  useEffect(() => {
    const tryInit = () => {
      if (!window.google?.accounts?.oauth2 || !CLIENT_ID) return;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SHEETS_SCOPE,
        callback: async (resp: any) => {
          if (resp.error) { setIsSaving(false); return; }
          // Store token via gapi so getToken() works in sheetsRequest helper
          if (window.gapi?.client?.setToken) window.gapi.client.setToken(resp);
          await doSync();
        },
      });
      setTokenClient(client);
    };

    // Poll until GIS is loaded
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval);
        tryInit();
      }
    }, 500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSync = async () => {
    try {
      const t = tasksRef.current;
      const release  = loadReleaseItems();
      const pitching = loadPitchingIdeas();
      const report   = loadReportItems();

      const sections: SheetSection[] = [
        { title: "협업",         data: buildCollabRows(t) },
        { title: "홀드_픽스",    data: buildHoldFixRows(t) },
        { title: "릴리즈_스케줄", data: buildReleaseRows(release) },
        { title: "피칭_아이디어", data: buildPitchingRows(pitching) },
        { title: "개인_스케줄",  data: buildPersonalRows(t) },
        { title: "주식_일정",    data: buildStockRows(t) },
        { title: "리포트",       data: buildReportRows(report) },
      ];

      const spreadsheetId = await ensureSpreadsheet("Tim Schedul Agent — PEERMUSIC");
      await syncAllSheets(spreadsheetId, sections);

      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      const now = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setLastSaved(now);
      alert(`Google Drive 저장 완료 ✓\n${url}`);
    } catch (err: any) {
      console.error("Drive sync error", err);
      const msg = err?.result?.error?.message ?? String(err);
      alert(`저장 실패: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (!sheetsReady || !tokenClient) {
      alert("Google Sheets API가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setIsSaving(true);
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      tokenClient.requestAccessToken({ prompt: "" });
    }
  };

  return (
    <Stack spacing={0.5}>
      <Tooltip title="모든 섹션 데이터를 Google Sheets로 내보냅니다" placement="right">
        <span>
          <Button
            variant="outlined"
            size="small"
            disabled={isSaving || !sheetsReady}
            startIcon={
              isSaving ? <CircularProgress size={16} color="inherit" /> : <GoogleIcon fontSize="small" />
            }
            onClick={handleSave}
            sx={{
              width: "100%",
              borderColor: "rgba(66,133,244,0.5)",
              color: "#4285f4",
              fontSize: "0.78rem",
              "&:hover": { borderColor: "#4285f4", backgroundColor: "rgba(66,133,244,0.06)" },
            }}
          >
            {isSaving ? "저장 중..." : "Drive 저장"}
          </Button>
        </span>
      </Tooltip>
      {lastSaved && (
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: "center" }}>
          마지막 저장: {lastSaved}
        </Typography>
      )}
    </Stack>
  );
}
