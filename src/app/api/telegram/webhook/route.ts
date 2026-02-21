/**
 * POST /api/telegram/webhook
 * 텔레그램 봇 웹훅 핸들러
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/telegram/parser';
import { readSheet } from '@/lib/telegram/sheets';
import {
  formatReleaseList,
  formatCollabList,
  formatHoldList,
  formatPitchingList,
  formatSearchResults,
  formatHelp,
  escapeMarkdown,
} from '@/lib/telegram/formatter';

// ─────────────────────────────────────────────────────────────────────────────
// 환경변수
// ─────────────────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// 텔레그램 API 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 지정한 chatId 에 MarkdownV2 메시지를 전송합니다.
 */
async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN 이 설정되지 않았습니다.');
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`sendMessage 실패 (chatId=${chatId}):`, body);
  }
}

/**
 * 에러 발생 시 사용자에게 한국어로 안내합니다.
 * MarkdownV2 이스케이프 없이 일반 텍스트로 전송합니다.
 */
async function sendErrorMessage(chatId: number, err: unknown): Promise<void> {
  if (!BOT_TOKEN) return;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const errMsg =
    err instanceof Error ? err.message : String(err);

  const text =
    '❌ 오류가 발생했습니다.\n' +
    'Google Sheets 조회 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.\n\n' +
    `상세: ${errMsg.slice(0, 200)}`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 웹훅 핸들러
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      message?: {
        text?: string;
        chat: { id: number };
        from?: { id: number; username?: string };
      };
    };

    const message = body?.message;

    // 메시지가 없거나 텍스트가 없으면 무시
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = message.text;
    const userId = String(chatId);

    // ── 접근 제어 ─────────────────────────────────────────────────────────────
    if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(userId)) {
      await sendMessage(
        chatId,
        `⛔ 접근이 허용되지 않습니다\\.\nChat ID: \`${escapeMarkdown(userId)}\`\n\n관리자에게 Chat ID를 알려주세요\\.`,
      );
      return NextResponse.json({ ok: true });
    }

    // ── 의도 파싱 ─────────────────────────────────────────────────────────────
    const intent = parseQuery(text);
    let response = '';

    switch (intent.type) {
      // 도움말
      case 'HELP': {
        response = formatHelp();
        break;
      }

      // 발매 목록
      case 'RELEASE_LIST': {
        let rows: string[][];
        try {
          rows = await readSheet('릴리즈_스케줄');
        } catch (err) {
          await sendErrorMessage(chatId, err);
          return NextResponse.json({ ok: true });
        }
        response = formatReleaseList(rows, intent.month, intent.year);
        break;
      }

      // 협업 목록
      case 'COLLAB_LIST': {
        let rows: string[][];
        try {
          rows = await readSheet('협업');
        } catch (err) {
          await sendErrorMessage(chatId, err);
          return NextResponse.json({ ok: true });
        }
        response = formatCollabList(rows, intent.status);
        break;
      }

      // 홀드/픽스 목록
      case 'HOLD_LIST': {
        let rows: string[][];
        try {
          rows = await readSheet('홀드_픽스');
        } catch (err) {
          await sendErrorMessage(chatId, err);
          return NextResponse.json({ ok: true });
        }
        response = formatHoldList(rows, intent.holdType);
        break;
      }

      // 피칭 아이디어 목록
      case 'PITCHING_LIST': {
        let rows: string[][];
        try {
          rows = await readSheet('피칭_아이디어');
        } catch (err) {
          await sendErrorMessage(chatId, err);
          return NextResponse.json({ ok: true });
        }
        response = formatPitchingList(rows, intent.grade);
        break;
      }

      // 전체 검색 (모든 시트 병렬 조회)
      case 'SEARCH': {
        let collab: string[][];
        let holdFix: string[][];
        let release: string[][];
        let pitching: string[][];

        try {
          [collab, holdFix, release, pitching] = await Promise.all([
            readSheet('협업'),
            readSheet('홀드_픽스'),
            readSheet('릴리즈_스케줄'),
            readSheet('피칭_아이디어'),
          ]);
        } catch (err) {
          await sendErrorMessage(chatId, err);
          return NextResponse.json({ ok: true });
        }

        const allSheets: Record<string, string[][]> = {
          협업: collab,
          홀드_픽스: holdFix,
          릴리즈_스케줄: release,
          피칭_아이디어: pitching,
        };
        response = formatSearchResults(allSheets, intent.keyword);
        break;
      }

      // 알 수 없는 명령
      default: {
        response =
          '❓ 이해하지 못했습니다\\. `/help` 를 입력하면 사용법을 안내해 드립니다\\.';
        break;
      }
    }

    await sendMessage(chatId, response);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // 웹훅은 항상 200 OK 를 반환해야 Telegram 이 재시도를 멈춥니다
    console.error('Telegram webhook 처리 오류:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
