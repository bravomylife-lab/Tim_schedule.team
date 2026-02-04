"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    // TODO: 실제 Gemini API 연동 시 이곳에서 호출
    // 현재는 UX 시뮬레이션을 위해 2초 딜레이
    setTimeout(() => {
      setIsSyncing(false);
      alert("Gemini가 캘린더 분석을 완료했습니다! (샘플)");
    }, 2000);
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Google Calendar & Gemini
      </Typography>
      <Button
        variant="contained"
        color="primary"
        disabled={isSyncing}
        startIcon={
          isSyncing ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <AutoAwesomeRounded />
          )
        }
        onClick={handleSync}
      >
        {isSyncing ? "AI 분석중..." : "스케줄 동기화"}
      </Button>
      {isSyncing ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarMonthRounded fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Gemini가 캘린더를 분석 중입니다...
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
