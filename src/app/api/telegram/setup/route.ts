/**
 * GET /api/telegram/setup?secret=XXX
 * 텔레그램 웹훅 URL 을 등록합니다.
 *
 * 환경변수:
 *   TELEGRAM_BOT_TOKEN       — 봇 토큰
 *   TELEGRAM_SETUP_SECRET    — 이 엔드포인트 접근 시크릿 키
 *   NEXT_PUBLIC_APP_URL      — 배포된 앱의 기본 URL (예: https://example.com)
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

interface TelegramSetWebhookResponse {
  ok: boolean;
  result?: boolean;
  description?: string;
  error_code?: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── 인증 확인 ──────────────────────────────────────────────────────────────
  const secret = req.nextUrl.searchParams.get('secret');
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;

  if (!setupSecret) {
    return NextResponse.json(
      { error: '서버에 TELEGRAM_SETUP_SECRET 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  if (secret !== setupSecret) {
    return NextResponse.json(
      { error: '인증 실패: secret 이 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  // ── 환경변수 검증 ──────────────────────────────────────────────────────────
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_APP_URL 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  // ── 웹훅 등록 ──────────────────────────────────────────────────────────────
  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      },
    );

    const data = (await res.json()) as TelegramSetWebhookResponse;

    return NextResponse.json({
      ...data,
      registered_webhook_url: webhookUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `웹훅 등록 요청 실패: ${msg}` },
      { status: 500 },
    );
  }
}
