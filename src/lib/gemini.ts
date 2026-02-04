export interface GeminiClassificationResult {
  category: string;
  summary: string;
  details?: Record<string, unknown>;
}

export async function classifyWithGemini(
  title: string,
  description?: string
): Promise<GeminiClassificationResult> {
  // TODO: Gemini API 연동 (최신 모델) 예정
  return {
    category: "WEEKLY",
    summary: title,
    details: { description },
  };
}
