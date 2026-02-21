/**
 * 텔레그램 쿼리 의도 파싱
 * 규칙 기반(rule-based) — 외부 라이브러리 없음
 */

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

export type QueryIntent =
  | { type: 'RELEASE_LIST'; month?: number; year?: number }
  | { type: 'COLLAB_LIST'; status?: 'IN_PROGRESS' | 'REQUESTED' | 'ALL' }
  | { type: 'HOLD_LIST'; holdType?: 'HOLD' | 'FIX' | 'RELEASE' }
  | { type: 'PITCHING_LIST'; grade?: string }
  | { type: 'DEMO_BY_TITLE'; title: string }
  | { type: 'DEMO_BY_PUBLISHING'; publishingCompany: string }
  | { type: 'DEMO_BY_RATING'; ratingScore: number }
  | { type: 'SEARCH'; keyword: string }
  | { type: 'HELP' }
  | { type: 'UNKNOWN' };

// ─────────────────────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 텍스트에서 "YYYY년 MM월" 패턴을 찾아 { year, month } 를 반환합니다.
 * 없으면 null 반환.
 */
function extractYearMonth(text: string): { year: number; month: number } | null {
  const match = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
  if (match) {
    return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
  }
  return null;
}

/**
 * 현재 날짜 기준으로 다음 달의 { year, month } 를 반환합니다.
 */
function getNextMonth(): { year: number; month: number } {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: nextMonth.getFullYear(), month: nextMonth.getMonth() + 1 };
}

/**
 * 현재 날짜 기준으로 이번 달의 { year, month } 를 반환합니다.
 */
function getCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 파서
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사용자 텍스트를 분석해 QueryIntent 를 반환합니다.
 */
export function parseQuery(text: string): QueryIntent {
  const t = text.trim().toLowerCase();

  // ── 도움말 ──────────────────────────────────────────────────────────────────
  if (t === '/help' || t === '/도움말' || t === '도움말' || t.includes('/help')) {
    return { type: 'HELP' };
  }

  // ── 발매 목록 ───────────────────────────────────────────────────────────────
  if (t.includes('발매')) {
    // "YYYY년 MM월 발매" 패턴
    const specific = extractYearMonth(text);
    if (specific) {
      return { type: 'RELEASE_LIST', month: specific.month, year: specific.year };
    }

    // "다음달 발매" / "다음 달 발매"
    if (t.includes('다음달') || t.includes('다음 달')) {
      const next = getNextMonth();
      return { type: 'RELEASE_LIST', month: next.month, year: next.year };
    }

    // "이번달 발매" / "이번 달 발매" / "발매된 곡" / "발매 목록" 등
    const current = getCurrentMonth();
    return { type: 'RELEASE_LIST', month: current.month, year: current.year };
  }

  // ── 릴리즈 (발매 동의어) ────────────────────────────────────────────────────
  if (t.includes('릴리즈') || t.includes('release') || t.includes('릴리스')) {
    const specific = extractYearMonth(text);
    if (specific) {
      return { type: 'RELEASE_LIST', month: specific.month, year: specific.year };
    }
    if (t.includes('다음달') || t.includes('다음 달')) {
      const next = getNextMonth();
      return { type: 'RELEASE_LIST', month: next.month, year: next.year };
    }
    const current = getCurrentMonth();
    return { type: 'RELEASE_LIST', month: current.month, year: current.year };
  }

  // ── 협업 목록 ───────────────────────────────────────────────────────────────
  if (t.includes('협업')) {
    if (t.includes('진행중') || t.includes('진행 중') || t.includes('in_progress') || t.includes('in progress')) {
      return { type: 'COLLAB_LIST', status: 'IN_PROGRESS' };
    }
    if (t.includes('요청') || t.includes('requested')) {
      return { type: 'COLLAB_LIST', status: 'REQUESTED' };
    }
    // "목록", "리스트", "전체", "모두", "다" → ALL
    if (
      t.includes('목록') ||
      t.includes('리스트') ||
      t.includes('전체') ||
      t.includes('모두') ||
      t === '협업'
    ) {
      return { type: 'COLLAB_LIST', status: 'ALL' };
    }
    return { type: 'COLLAB_LIST', status: 'ALL' };
  }

  // ── 홀드 / 픽스 / 릴리즈(홀드픽스 컨텍스트) ────────────────────────────────
  if (t.includes('홀드') || t.includes('hold')) {
    return { type: 'HOLD_LIST', holdType: 'HOLD' };
  }

  if (t.includes('픽스') || t.includes('fix')) {
    return { type: 'HOLD_LIST', holdType: 'FIX' };
  }

  if (t.includes('홀드픽스') || t.includes('홀드_픽스') || t.includes('hold_fix')) {
    return { type: 'HOLD_LIST' };
  }

  // ── 피칭 아이디어 ──────────────────────────────────────────────────────────
  if (t.includes('피칭') || t.includes('pitching')) {
    // 등급 추출 (S, A, A_JPN)
    if (t.includes('a_jpn') || t.includes('a jpn') || t.includes('a-jpn') || t.includes('jpn')) {
      return { type: 'PITCHING_LIST', grade: 'A_JPN' };
    }
    if (t.match(/\bs\b/) || t.includes('s급') || t.includes('s 급')) {
      return { type: 'PITCHING_LIST', grade: 'S' };
    }
    if (t.match(/\ba\b/) || t.includes('a급') || t.includes('a 급')) {
      return { type: 'PITCHING_LIST', grade: 'A' };
    }
    return { type: 'PITCHING_LIST' };
  }

  // ── 데모 음원 관리 ──────────────────────────────────────────────────────────
  if (t.includes('데모') || t.includes('음원') || t.includes('demo')) {
    // 평점/평가 점수 필터: "평점이 [점수]", "평가 점수 [점수]", "rating [점수]"
    const ratingMatch = text.match(/(?:평점이?\s*|평가\s*점수\s*|rating\s*)([\d.]+)/i);
    if (ratingMatch) {
      const ratingScore = parseFloat(ratingMatch[1]);
      if (!isNaN(ratingScore)) {
        return { type: 'DEMO_BY_RATING', ratingScore };
      }
    }

    // 퍼블리싱 업체 필터: "퍼블리싱 업체 [업체명]", "퍼블리싱 [업체명]"
    const publishingMatch = text.match(/퍼블리싱\s*(?:업체\s+)?([^\s\n]+)/i);
    if (publishingMatch) {
      const company = publishingMatch[1].trim();
      if (company) {
        return { type: 'DEMO_BY_PUBLISHING', publishingCompany: company };
      }
    }

    // 곡 제목 필터: "[곡명]이라는 곡 제목 찾아서", "데모명 [곡명]", "곡명 [곡명]"
    const titleByNameMatch = text.match(/(?:데모명|곡명)\s+(.+?)(?:\s|$)/i);
    if (titleByNameMatch) {
      const title = titleByNameMatch[1].trim();
      if (title) {
        return { type: 'DEMO_BY_TITLE', title };
      }
    }
    const titleByPhraseMatch = text.match(/(.+?)(?:이라는|라는)\s*곡\s*제목/);
    if (titleByPhraseMatch) {
      const title = titleByPhraseMatch[1].trim();
      if (title) {
        return { type: 'DEMO_BY_TITLE', title };
      }
    }

    // 데모 키워드가 있는데 다른 패턴에 안 걸리면 → DEMO_BY_TITLE로 텍스트 전달
    // (더 구체적인 의도 파악 불가 시 전체 텍스트를 제목 검색으로)
    const trimmedForDemo = text.trim();
    if (trimmedForDemo.length > 0) {
      return { type: 'DEMO_BY_TITLE', title: trimmedForDemo };
    }
  }

  // ── 검색 ────────────────────────────────────────────────────────────────────
  // "[키워드] 정보" / "[키워드] 찾아줘" / "[키워드] 검색" 패턴
  const searchPatterns = [
    /^(.+?)\s*(정보|찾아줘|찾아|검색|알려줘|알려|보여줘|보여)$/,
    /^(검색|찾기|search)\s+(.+)$/i,
  ];

  for (const pattern of searchPatterns) {
    const match = text.trim().match(pattern);
    if (match) {
      // 첫 번째 패턴: 키워드가 group 1
      // 두 번째 패턴: 키워드가 group 2
      const keyword = (match[1] === '검색' || match[1] === '찾기' || match[1].toLowerCase() === 'search')
        ? match[2]
        : match[1];
      if (keyword && keyword.trim().length > 0) {
        return { type: 'SEARCH', keyword: keyword.trim() };
      }
    }
  }

  // 슬래시 커맨드가 아닌데 아무 조건에도 안 걸리면 텍스트 전체를 키워드로 SEARCH
  const trimmed = text.trim();
  if (trimmed.length > 0 && !trimmed.startsWith('/')) {
    return { type: 'SEARCH', keyword: trimmed };
  }

  return { type: 'UNKNOWN' };
}
