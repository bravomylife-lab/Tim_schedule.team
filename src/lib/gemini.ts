const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

export interface GeminiClassificationResult {
  category: "PERSONAL" | "COLLAB" | "HOLD_FIX" | "STOCK" | "MUSIC";
  subCategory?: "YOUTUBE" | "AUTOMATION" | "GENERAL";
  summary: string;
  ticker?: string; // For STOCK
  artist?: string; // For COLLAB
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
You are an AI assistant for a Music A&R scheduler.
Analyze the following calendar event and classify it into one of these categories:
- PERSONAL: Personal life, gym, finance, tax, rent, insurance, private appointments. 
  * SUB-CATEGORIES for PERSONAL:
    - YOUTUBE: If keywords like "브라보팝" (Bravo Pop) appear.
    - AUTOMATION: If keywords like "APP", "테스트" (Test), "AI", "Code" appear.
    - GENERAL: Lessons (레슨), Tax (세무사), Loans/Debt (대출, 빌리, 갚), General life.
- COLLAB: Music collaboration, co-writing, sessions, topline, track production.
- HOLD_FIX: Song hold, fix, release, publishing deals.
- STOCK: Stock market, earnings calls, IPO, financial news, dividends.
  * KEYWORDS for STOCK: "주식", "증권", "주가", "실적", "매출", "배당", "IPO", "Ticker", "NASDAQ", "KOSPI", "KOSDAQ", "MSCI", "TSMC", "엔비디아".
- MUSIC: General music work, meetings, listening sessions, A&R work (Default for work items).

Important: If the event is music work and has no explicit stock/finance terms, choose MUSIC.

Also extract relevant details like Stock Ticker or Target Artist if available.

Event Title: ${title}
Event Description: ${description}

Return ONLY a JSON object with this structure:
{
  "category": "CATEGORY_NAME",
  "subCategory": "SUB_CATEGORY_IF_PERSONAL",
  "summary": "Concise summary (max 10 words)",
  "ticker": "STOCK_TICKER_IF_APPLICABLE",
  "artist": "ARTIST_NAME_IF_APPLICABLE"
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
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