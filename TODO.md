# TODO (2026-02-06)

- Define classification rules for Google Calendar events (keyword + calendar-based mapping).
- Add category mapping config (keywords -> TaskCategory).
- Tag imported events with a source field (e.g., calendarId, organizer, location).
- Backfill categories for already-synced events.
- Add UI filters for "Imported" vs "Manual" tasks.
- Add tests/fixtures for classification edge cases.
분류 시스템 설정 시작은 어떤 기준으로 분류할지 확정하면 바로 설계 들어갈게요.
기본안은 “키워드 + 캘린더별 매핑 + 위치/주최자” 조합인데, 원하시는 규칙이 있으면 알려주세요.