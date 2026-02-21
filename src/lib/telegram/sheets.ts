/**
 * Google Sheets JWT 인증 + 읽기
 * node:crypto 만 사용 (추가 패키지 불필요)
 *
 * 환경변수:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   GOOGLE_SPREADSHEET_ID
 */

export const runtime = 'nodejs';

import { createSign } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────────────
// JWT / OAuth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Service Account JWT를 생성하고 Google OAuth2 토큰 엔드포인트에서
 * access_token 을 받아 반환합니다.
 */
export async function getServiceAccountToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      '환경변수 GOOGLE_SERVICE_ACCOUNT_EMAIL 또는 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 가 설정되지 않았습니다.',
    );
  }

  const key = rawKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  ).toString('base64url');

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(key, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Google OAuth 토큰 취득 실패: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheets API helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 지정한 시트 이름의 모든 셀을 2D 배열로 반환합니다.
 * 첫 번째 행은 헤더, 데이터는 index 1부터 시작합니다.
 */
export async function readSheet(sheetName: string): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('환경변수 GOOGLE_SPREADSHEET_ID 가 설정되지 않았습니다.');
  }

  const token = await getServiceAccountToken();
  const range = encodeURIComponent(`'${sheetName}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API 오류 (${sheetName}): ${text}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 전체 시트 일괄 읽기
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_NAMES = ['협업', '홀드_픽스', '릴리즈_스케줄', '피칭_아이디어', 'DEMO_음원_관리'] as const;
export type SheetName = (typeof SHEET_NAMES)[number];

/**
 * 모든 주요 시트를 병렬로 읽어 Record 로 반환합니다.
 */
export async function readAllSheets(): Promise<Record<string, string[][]>> {
  const results = await Promise.allSettled(
    SHEET_NAMES.map(async (name) => {
      const rows = await readSheet(name);
      return { name, rows };
    }),
  );

  const record: Record<string, string[][]> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      record[result.value.name] = result.value.rows;
    } else {
      console.error('readAllSheets 일부 실패:', result.reason);
    }
  }
  return record;
}

// ─────────────────────────────────────────────────────────────────────────────
// 마지막 동기화 타임스탬프 추론
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 협업 시트의 데이터가 마지막으로 업데이트된 시각을 추론합니다.
 * 실제 타임스탬프 컬럼이 없으므로 데이터 존재 여부만 확인합니다.
 * 데이터가 있으면 현재 시각의 ISO 문자열을, 없으면 null 을 반환합니다.
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    const rows = await readSheet('협업');
    if (rows.length > 1) {
      // 헤더 이후 데이터가 있으면 현재 시각 반환
      return new Date().toISOString();
    }
    return null;
  } catch {
    return null;
  }
}
