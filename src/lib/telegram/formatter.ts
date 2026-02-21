/**
 * 텔레그램 응답 포맷터
 * - MarkdownV2 이스케이프 처리
 * - 각 시트 데이터를 사람이 읽기 좋게 포맷
 * - 4096자 초과 시 자동 페이지네이션 (1페이지 최대 10건)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 4096;
const MAX_ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownV2 이스케이프
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Telegram MarkdownV2 에서 특수문자를 백슬래시로 이스케이프합니다.
 * 이스케이프 대상: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 메시지가 4096자를 초과하면 자릅니다.
 */
function truncate(text: string): string {
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  const suffix = '\n\n_\\.\\.\\. 너무 많아서 잘렸습니다\\._';
  return text.slice(0, MAX_MESSAGE_LENGTH - suffix.length) + suffix;
}

/**
 * 날짜 문자열(YYYY-MM-DD)을 MarkdownV2 이스케이프된 형태로 반환합니다.
 */
function fmtDate(dateStr: string): string {
  if (!dateStr) return escapeMarkdown('(날짜 없음)');
  // YYYY-MM-DD → YYYY\-MM\-DD
  return escapeMarkdown(dateStr);
}

/**
 * 빈 값 표시용 fallback
 */
function orEmpty(val: string | undefined, fallback = '\\-'): string {
  const v = (val ?? '').trim();
  return v ? escapeMarkdown(v) : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// 릴리즈 목록
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 릴리즈_스케줄 시트 컬럼 인덱스
 * [Album, Artist, Song, Lyric by, Composed by, Arranged by, Release Date, Label, Track #, YouTube, 메모]
 *  0       1       2     3         4            5            6              7      8         9        10
 */
const COL_RELEASE = {
  album: 0, artist: 1, song: 2, lyricBy: 3, composedBy: 4,
  arrangedBy: 5, releaseDate: 6, label: 7, trackNum: 8, youtube: 9, notes: 10,
} as const;

export function formatReleaseList(
  rows: string[][],
  month?: number,
  year?: number,
): string {
  const dataRows = rows.slice(1); // 헤더 제외

  let filtered = dataRows;
  if (month !== undefined && year !== undefined) {
    filtered = dataRows.filter((row) => {
      const dateStr = row[COL_RELEASE.releaseDate] ?? '';
      const d = new Date(dateStr);
      return (
        !isNaN(d.getTime()) &&
        d.getFullYear() === year &&
        d.getMonth() + 1 === month
      );
    });
  }

  const paged = filtered.slice(0, MAX_ITEMS_PER_PAGE);
  const total = filtered.length;

  const monthLabel =
    month !== undefined && year !== undefined
      ? `${escapeMarkdown(String(year))}년 ${escapeMarkdown(String(month))}월 `
      : '';

  const header = `🎵 *${monthLabel}발매 목록* \\(${escapeMarkdown(String(total))}건\\)\n`;

  if (paged.length === 0) {
    return `${header}\n해당 기간에 발매된 곡이 없습니다\\.`;
  }

  const lines: string[] = [header];
  paged.forEach((row, i) => {
    const song    = orEmpty(row[COL_RELEASE.song], '(제목 없음)');
    const artist  = orEmpty(row[COL_RELEASE.artist]);
    const album   = orEmpty(row[COL_RELEASE.album]);
    const label   = orEmpty(row[COL_RELEASE.label]);
    const lyric   = orEmpty(row[COL_RELEASE.lyricBy]);
    const composed = orEmpty(row[COL_RELEASE.composedBy]);
    const date    = fmtDate(row[COL_RELEASE.releaseDate] ?? '');
    const youtube = (row[COL_RELEASE.youtube] ?? '').trim();

    lines.push(`${escapeMarkdown(String(i + 1))}\\. *${song}* \\— ${artist}`);
    lines.push(`   Album: ${album} \\| Label: ${label}`);
    lines.push(`   작사: ${lyric} \\| 작곡: ${composed}`);
    lines.push(`   발매일: ${date}`);
    if (youtube) {
      lines.push(`   🔗 [YouTube](${escapeMarkdown(youtube)})`);
    }
    lines.push('');
  });

  if (total > MAX_ITEMS_PER_PAGE) {
    lines.push(
      `_\\.\\.\\. ${escapeMarkdown(String(total - MAX_ITEMS_PER_PAGE))}건 더 있습니다\\._`,
    );
  }

  return truncate(lines.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 협업 목록
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 협업 시트 컬럼 인덱스
 * [제목, 상태, 트랙명, 프로듀서, 탑라이너, 타겟아티스트, 퍼블리싱, 데드라인, 메모, 믹스본전달, 별표]
 *  0     1     2       3        4          5              6        7        8    9         10
 */
const COL_COLLAB = {
  title: 0, status: 1, trackName: 2, producer: 3, topLiner: 4,
  targetArtist: 5, publishing: 6, deadline: 7, notes: 8, mixSent: 9, star: 10,
} as const;

export function formatCollabList(rows: string[][], status?: string): string {
  const dataRows = rows.slice(1);

  let filtered = dataRows;
  if (status && status !== 'ALL') {
    filtered = dataRows.filter((row) => {
      const s = (row[COL_COLLAB.status] ?? '').toUpperCase().trim();
      return s === status;
    });
  }

  const paged = filtered.slice(0, MAX_ITEMS_PER_PAGE);
  const total = filtered.length;

  const statusLabel =
    status === 'IN_PROGRESS' ? '진행중'
    : status === 'REQUESTED' ? '요청됨'
    : '전체';

  const header = `🤝 *협업 ${escapeMarkdown(statusLabel)}* \\(${escapeMarkdown(String(total))}건\\)\n`;

  if (paged.length === 0) {
    return `${header}\n해당 협업 항목이 없습니다\\.`;
  }

  const lines: string[] = [header];
  paged.forEach((row, i) => {
    const title       = orEmpty(row[COL_COLLAB.title], '(제목 없음)');
    const producer    = orEmpty(row[COL_COLLAB.producer]);
    const topLiner    = orEmpty(row[COL_COLLAB.topLiner]);
    const target      = orEmpty(row[COL_COLLAB.targetArtist]);
    const deadline    = fmtDate(row[COL_COLLAB.deadline] ?? '');
    const mixSent     = (row[COL_COLLAB.mixSent] ?? '').trim().toUpperCase();
    const mixIcon     = mixSent === 'O' || mixSent === 'TRUE' || mixSent === '✅' ? '✅' : '❌';
    const star        = (row[COL_COLLAB.star] ?? '').trim() ? ' ⭐' : '';
    const trackName   = (row[COL_COLLAB.trackName] ?? '').trim();
    const statusStr   = orEmpty(row[COL_COLLAB.status]);

    lines.push(`${escapeMarkdown(String(i + 1))}\\. *${title}*${star}`);
    if (trackName) lines.push(`   트랙명: ${escapeMarkdown(trackName)}`);
    lines.push(`   상태: ${statusStr}`);
    lines.push(`   프로듀서: ${producer} \\| 탑라이너: ${topLiner}`);
    lines.push(`   타겟: ${target} \\| 데드라인: ${deadline}`);
    lines.push(`   믹스본: ${mixIcon}`);
    lines.push('');
  });

  if (total > MAX_ITEMS_PER_PAGE) {
    lines.push(
      `_\\.\\.\\. ${escapeMarkdown(String(total - MAX_ITEMS_PER_PAGE))}건 더 있습니다\\._`,
    );
  }

  return truncate(lines.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 홀드/픽스 목록
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 홀드_픽스 시트 컬럼 인덱스
 * [제목, 유형, 데모명, 작가, 퍼블리싱, 프로덕션피, Mech피, 통화, 홀드날짜, 홀드기간, 타겟아티스트, 메모, 별표]
 *  0     1     2       3    4         5           6       7    8         9        10              11    12
 */
const COL_HOLD = {
  title: 0, type: 1, demoName: 2, writers: 3, publishing: 4,
  productionFee: 5, mechFee: 6, currency: 7,
  holdDate: 8, holdPeriod: 9, targetArtist: 10, notes: 11, star: 12,
} as const;

export function formatHoldList(rows: string[][], holdType?: string): string {
  const dataRows = rows.slice(1);

  let filtered = dataRows;
  if (holdType) {
    filtered = dataRows.filter((row) => {
      const t = (row[COL_HOLD.type] ?? '').toUpperCase().trim();
      return t === holdType;
    });
  }

  const paged = filtered.slice(0, MAX_ITEMS_PER_PAGE);
  const total = filtered.length;

  const typeLabel =
    holdType === 'HOLD' ? '홀드'
    : holdType === 'FIX' ? '픽스'
    : holdType === 'RELEASE' ? '릴리즈'
    : '전체';

  const header = `📌 *홀드\\_픽스 ${escapeMarkdown(typeLabel)}* \\(${escapeMarkdown(String(total))}건\\)\n`;

  if (paged.length === 0) {
    return `${header}\n해당 항목이 없습니다\\.`;
  }

  const lines: string[] = [header];
  paged.forEach((row, i) => {
    const title      = orEmpty(row[COL_HOLD.title], '(제목 없음)');
    const type       = orEmpty(row[COL_HOLD.type]);
    const demoName   = orEmpty(row[COL_HOLD.demoName]);
    const writers    = orEmpty(row[COL_HOLD.writers]);
    const publishing = orEmpty(row[COL_HOLD.publishing]);
    const currency   = orEmpty(row[COL_HOLD.currency]);
    const holdDate   = fmtDate(row[COL_HOLD.holdDate] ?? '');
    const holdPeriod = orEmpty(row[COL_HOLD.holdPeriod]);
    const target     = orEmpty(row[COL_HOLD.targetArtist]);
    const prodFee    = (row[COL_HOLD.productionFee] ?? '').trim();
    const mechFee    = (row[COL_HOLD.mechFee] ?? '').trim();
    const star       = (row[COL_HOLD.star] ?? '').trim() ? ' ⭐' : '';

    lines.push(`${escapeMarkdown(String(i + 1))}\\. *${title}*${star} \\[${type}\\]`);
    lines.push(`   데모명: ${demoName}`);
    lines.push(`   작가: ${writers} \\| 퍼블리싱: ${publishing}`);
    lines.push(`   타겟: ${target}`);
    lines.push(`   홀드날짜: ${holdDate} \\| 홀드기간: ${holdPeriod}`);
    if (prodFee || mechFee) {
      lines.push(`   프로덕션피: ${escapeMarkdown(prodFee || '\\-')} \\| Mech피: ${escapeMarkdown(mechFee || '\\-')} ${currency}`);
    }
    lines.push('');
  });

  if (total > MAX_ITEMS_PER_PAGE) {
    lines.push(
      `_\\.\\.\\. ${escapeMarkdown(String(total - MAX_ITEMS_PER_PAGE))}건 더 있습니다\\._`,
    );
  }

  return truncate(lines.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 피칭 아이디어 목록
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 피칭_아이디어 시트 컬럼 인덱스
 * [데모명, 작가, 퍼블리싱, 등급, 메모, 생성일]
 *  0       1    2         3    4    5
 */
const COL_PITCHING = {
  demoName: 0, writers: 1, publishing: 2, grade: 3, notes: 4, createdAt: 5,
} as const;

export function formatPitchingList(rows: string[][], grade?: string): string {
  const dataRows = rows.slice(1);

  let filtered = dataRows;
  if (grade) {
    filtered = dataRows.filter((row) => {
      const g = (row[COL_PITCHING.grade] ?? '').toUpperCase().trim();
      return g === grade.toUpperCase();
    });
  }

  const paged = filtered.slice(0, MAX_ITEMS_PER_PAGE);
  const total = filtered.length;

  const gradeLabel = grade ? ` \\[${escapeMarkdown(grade)}\\]` : '';
  const header = `💡 *피칭 아이디어${gradeLabel}* \\(${escapeMarkdown(String(total))}건\\)\n`;

  if (paged.length === 0) {
    return `${header}\n피칭 아이디어가 없습니다\\.`;
  }

  const lines: string[] = [header];
  paged.forEach((row, i) => {
    const demoName   = orEmpty(row[COL_PITCHING.demoName], '(데모명 없음)');
    const writers    = orEmpty(row[COL_PITCHING.writers]);
    const publishing = orEmpty(row[COL_PITCHING.publishing]);
    const gradeStr   = orEmpty(row[COL_PITCHING.grade]);
    const createdAt  = fmtDate(row[COL_PITCHING.createdAt] ?? '');

    lines.push(`${escapeMarkdown(String(i + 1))}\\. *${demoName}* \\[${gradeStr}\\]`);
    lines.push(`   작가: ${writers} \\| 퍼블리싱: ${publishing}`);
    lines.push(`   생성일: ${createdAt}`);
    lines.push('');
  });

  if (total > MAX_ITEMS_PER_PAGE) {
    lines.push(
      `_\\.\\.\\. ${escapeMarkdown(String(total - MAX_ITEMS_PER_PAGE))}건 더 있습니다\\._`,
    );
  }

  return truncate(lines.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 전체 검색
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 모든 시트에서 keyword 를 포함하는 행을 찾아 포맷합니다.
 */
export function formatSearchResults(
  allSheets: Record<string, string[][]>,
  keyword: string,
): string {
  const kw = keyword.toLowerCase();
  const results: { sheet: string; row: string[] }[] = [];

  for (const [sheetName, rows] of Object.entries(allSheets)) {
    const dataRows = rows.slice(1); // 헤더 제외
    for (const row of dataRows) {
      const combined = row.join(' ').toLowerCase();
      if (combined.includes(kw)) {
        results.push({ sheet: sheetName, row });
      }
    }
  }

  const paged = results.slice(0, MAX_ITEMS_PER_PAGE);
  const total = results.length;

  const header = `🔍 *"${escapeMarkdown(keyword)}" 검색 결과* \\(${escapeMarkdown(String(total))}건\\)\n`;

  if (paged.length === 0) {
    return `${header}\n검색 결과가 없습니다\\.`;
  }

  const lines: string[] = [header];
  paged.forEach((result, i) => {
    const sheetLabel = escapeMarkdown(result.sheet);
    // 각 시트별로 첫 번째 컬럼(제목/데모명/곡명 등)을 제목으로 사용
    const title = orEmpty(result.row[0], '(제목 없음)');
    // 나머지 컬럼 중 비어있지 않은 것을 요약으로 표시 (최대 3개)
    const summary = result.row
      .slice(1)
      .filter((v) => v && v.trim())
      .slice(0, 3)
      .map((v) => escapeMarkdown(v.trim()))
      .join(' \\| ');

    lines.push(`${escapeMarkdown(String(i + 1))}\\. \\[${sheetLabel}\\] *${title}*`);
    if (summary) {
      lines.push(`   ${summary}`);
    }
    lines.push('');
  });

  if (total > MAX_ITEMS_PER_PAGE) {
    lines.push(
      `_\\.\\.\\. ${escapeMarkdown(String(total - MAX_ITEMS_PER_PAGE))}건 더 있습니다\\._`,
    );
  }

  return truncate(lines.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 도움말
// ─────────────────────────────────────────────────────────────────────────────

export function formatHelp(): string {
  return `📖 *Tim Schedul 봇 사용법*

*발매 목록*
• \`이번달 발매\` — 이번 달 발매 목록
• \`다음달 발매\` — 다음 달 발매 목록
• \`2026년 3월 발매\` — 특정 월 발매 목록

*협업*
• \`협업 목록\` — 전체 협업 목록
• \`협업 진행중\` — 진행중인 협업만 표시
• \`협업 요청\` — 요청된 협업만 표시

*홀드\_픽스*
• \`홀드\` — 홀드 항목 목록
• \`픽스\` or \`fix\` — 픽스 항목 목록

*피칭 아이디어*
• \`피칭\` — 전체 피칭 아이디어
• \`피칭 S급\` — S 등급만 표시
• \`피칭 A급\` — A 등급만 표시

*검색*
• \`[곡명] 정보\` — 특정 곡 검색
• \`[키워드] 찾아줘\` — 키워드로 전체 검색

*기타*
• \`/help\` — 이 도움말 표시`;
}
