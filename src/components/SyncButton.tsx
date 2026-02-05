"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import { subDays, addDays } from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";

const CLIENT_ID = "670765876376-t2u3cobc54nu20l2r5cnpkpqrfnvvbpb.apps.googleusercontent.com";
const API_KEY = "AIzaSyD9Ok8rE5FwKmeJtrr9gVe2w3gS03J8ixk";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

// Window 객체 타입 확장 (TypeScript용)
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const { syncWithGoogleEvents } = useTaskContext();
  
  // 최신 sync 함수를 콜백에서 참조하기 위한 Ref
  const syncRef = useRef(syncWithGoogleEvents);
  useEffect(() => {
    syncRef.current = syncWithGoogleEvents;
  }, [syncWithGoogleEvents]);

  // 1. Google API 스크립트 로드
  useEffect(() => {
    const initClient = async () => {
      if (!window.gapi?.client) {
        setInitError("Google API 클라이언트를 찾을 수 없습니다.");
        return;
      }

      try {
        // setApiKey + load 대신 init 사용 (Discovery Doc 명시적 로드 및 에러 핸들링 강화)
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        });
        setGapiLoaded(true);
      } catch (error: any) {
        console.error("Failed to load discovery doc", error);
        // 에러 발생 시 구체적인 메시지를 표시 (예: The caller does not have permission)
        const msg = error?.result?.error?.message || error?.message || "API 키 설정 또는 제한을 확인해주세요.";
        setInitError(`Google API 초기화 실패: ${msg}`);
      }
    };

    const existingGapiScript = document.getElementById("gapi-script");
    if (existingGapiScript) {
      if (window.gapi?.load) {
        window.gapi.load("client", {
          callback: initClient,
          onerror: () => setInitError("Google API 로드에 실패했습니다."),
          timeout: 5000,
          ontimeout: () => setInitError("Google API 로드가 시간 초과되었습니다."),
        });
      }
    } else {
      const script = document.createElement("script");
      script.id = "gapi-script";
      script.src = "https://apis.google.com/js/api.js";
      script.onerror = () => {
        setInitError("Google API 스크립트를 불러오지 못했습니다.");
      };
      script.onload = () => {
        window.gapi.load("client", {
          callback: initClient,
          onerror: () => setInitError("Google API 로드에 실패했습니다."),
          timeout: 5000,
          ontimeout: () => setInitError("Google API 로드가 시간 초과되었습니다."),
        });
      };
      document.body.appendChild(script);
    }

    const gisScript = document.createElement("script");
    gisScript.id = "gis-script";
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.onerror = () => {
      setInitError("Google OAuth 스크립트를 불러오지 못했습니다.");
    };
    gisScript.onload = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            setIsSyncing(false);
            return;
          }
          
          try {
            window.gapi.client.setToken(resp);
            const today = new Date();
            const timeMin = subDays(today, 3).toISOString();
            const timeMax = addDays(today, 14).toISOString();

            const response = await window.gapi.client.calendar.events.list({
              calendarId: "primary",
              timeMin,
              timeMax,
              showDeleted: false,
              singleEvents: true,
              orderBy: "startTime",
            });

            const events = response.result.items ?? [];
            syncRef.current(events);
            alert(`동기화 완료! ${events.length}개의 일정을 가져왔습니다.`);
          } catch (err: any) {
            console.error("Error fetching events", err);
            const message = err?.result?.error?.message ?? "일정을 가져오는 중 오류가 발생했습니다.";
            alert(message);
          } finally {
            setIsSyncing(false);
          }
        },
      });
      setTokenClient(client);
    };

    document.body.appendChild(gisScript);

    return () => {
      // 스크립트를 제거하면 재로드 시 문제가 생길 수 있으므로 유지합니다.
    };
  }, []);

  const handleSync = () => {
    if (!CLIENT_ID || !API_KEY) {
      alert("Google API 키 설정이 필요합니다. 환경 변수를 확인해주세요.");
      return;
    }

    if (initError) {
      alert(initError);
      return;
    }

    if (!gapiLoaded || !tokenClient) {
      alert("Google API 스크립트가 아직 로딩 중입니다. 3초 후 다시 시도해주세요.");
      return;
    }

    setIsSyncing(true);

    // 토큰 요청 (로그인 팝업)
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      tokenClient.requestAccessToken({ prompt: "" });
    }
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
