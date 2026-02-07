const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiClassificationResult {
  category: "PERSONAL" | "COLLAB" | "HOLD_FIX" | "STOCK" | "MUSIC";
  subCategory?: "YOUTUBE" | "AUTOMATION" | "GENERAL";
  summary: string;
  ticker?: string;
  artist?: string;
  // Collab details
  trackProducer?: string;
  topLiner?: string;
  targetArtist?: string;
  trackName?: string;
  songName?: string;
  requestedDate?: string;
  // HoldFix details
  holdFixType?: "HOLD" | "FIX" | "RELEASE";
  demoName?: string;
  writers?: { name: string; split?: number }[];
  publishingInfo?: string;
  notes?: string;
}

export async function classifyWithGemini(
  title: string,
  description: string
): Promise<GeminiClassificationResult | null> {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API Key is missing");
    return null;
  }

  const prompt = `
You are an AI assistant for a Music A&R scheduler at PEERMUSIC.
Analyze the following calendar event and classify it into one of these categories:

## Categories (Priority Order):

1. **COLLAB** (Music collaboration)
   - Keywords: "협업", "collab", "co-write", "의뢰", "세션", "topline"
   - Extract: trackProducer (트랙 만든 작곡가/프로듀서), topLiner (멜로디메이킹 작가들), targetArtist (겨냥 아티스트), trackName (트랙명/BPM 포함), requestedDate (의뢰 날짜), notes (부연설명)

2. **HOLD_FIX** (Song hold, fix, release)
   - Keywords: "홀드", "hold", "픽스", "fix", "release", "발매"
   - Extract: holdFixType ("HOLD"/"FIX"/"RELEASE"), demoName/songName, writers with splits (e.g. "MOGT (Solcire) 33.33%"), publishingInfo, targetArtist, notes
   - Writer format example: "Writers: MOGT (Solcire) 33.33%, Chris Alice (Solcire) 33.33%, Adam Wolf (Tonefish) 33.33%"
   - Parse each writer name and their percentage split
   - "(Solcire)" or "(Tonefish)" after a writer name means their publishing company

3. **PERSONAL** (Personal life)
   - Keywords: "개인", "운동", "월세", "금전", "세금", "보험", "레슨", "세무사", "대출", "메모장", "정리", "목표", "단기", "중기", "연간", "계획", "복습", "독서", "루틴", "건강", "취미"
   - Sub-categories: YOUTUBE (브라보팝), AUTOMATION (APP/테스트/AI/Code), GENERAL (others)
   - Personal goal-setting, memo organization, life planning = PERSONAL

4. **STOCK** (Stock market, macro events, economic indicators)
   - Keywords: "주식", "증권", "주가", "실적", "매출", "배당", "IPO", "NASDAQ", "KOSPI", "KOSDAQ", "MSCI", "TSMC", "엔비디아", "에어쇼", "airshow", "고용보고서", "Non-farm", "Payrolls", "올림픽", "맥점", "복기", "매매", "차트", "수익률", "포트폴리오", "리밸런싱", "ETF", "펀드", "CPI", "PPI", "FOMC", "금리", "인플레이션", "GDP"
   - International events (airshows, Olympics) = STOCK (economic/investment relevance)
   - "복기" (매매 검증) = STOCK
   - "맥점" (chart analysis point) = STOCK
   - Extract: ticker if available

5. **MUSIC** (General music A&R work - DEFAULT for work items)
   - Keywords: "희선씨", "대표님", "A&R", "보고", "솔로앨범", "마감", "피드백", "작가", "LEAD", "송캠프", "타이틀곡", "수급", "리스닝", "앨범", "싱글", "발매"
   - Only for music work without explicit collab/hold/fix context

## CRITICAL Rules:
- If it looks like non-music event (airshow, job report, Olympics, macro economics) → STOCK
- If it mentions personal goals, planning, organization → PERSONAL
- "프로듀서" = person who made the track (beat maker)
- Other writers = usually topliners (melody/lyric writers)
- Parse writer splits carefully: "Name (Publisher) XX.XX%" format

Event Title: ${title}
Event Description: ${description}

Return ONLY a JSON object:
{
  "category": "CATEGORY_NAME",
  "subCategory": "SUB_CATEGORY_IF_PERSONAL",
  "summary": "Concise Korean summary (max 10 words)",
  "ticker": "STOCK_TICKER_IF_APPLICABLE",
  "holdFixType": "HOLD_or_FIX_or_RELEASE",
  "demoName": "SONG_NAME_IF_APPLICABLE",
  "trackName": "TRACK_NAME_IF_APPLICABLE",
  "trackProducer": "PRODUCER_NAME",
  "topLiner": "TOPLINER_NAMES_COMMA_SEPARATED",
  "targetArtist": "TARGET_ARTIST",
  "requestedDate": "REQUESTED_DATE_IF_MENTIONED",
  "writers": [{"name": "Writer Name (Publisher)", "split": 33.33}],
  "publishingInfo": "PUBLISHING_COMPANY",
  "notes": "ADDITIONAL_NOTES_OR_CONTEXT",
  "artist": "ARTIST_NAME"
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Gemini classification failed", error);
    return null;
  }
}
