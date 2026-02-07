# TODO (2026-02-06)


완료된 작업 요약

1. Types 확장 (tim.ts)

PitchingIdea, PitchingGrade (S/A/A_JPN), Currency (KRW/USD/EUR), HoldFixType 타입 추가
calendarModified, userEdited 플래그 추가로 동기화 변경 추적
2. TaskContext 전면 리뉴얼 (TaskContext.tsx)

localStorage 영속화: 모든 데이터(tasks, pitching, deleted IDs, snapshots) 저장 → 재방문 시 동일 데이터 유지
스마트 동기화 로직:
범위: -5일 ~ +14일
사용자가 삭제한 항목 부활 방지
사용자가 수정한 항목(userEdited) 덮어쓰기 방지
캘린더에서 수정된 항목 calendarModified 표시
새 항목만 추가
음악 키워드 분류: 희선씨, 대표님, A&R, 보고, 솔로앨범, 마감, 피드백, 작가, LEAD, 송캠프, 타이틀곡, 수급 → Overview
피칭아이디어 CRUD 전체 지원
3. Overview (OverviewBoard.tsx)

Urgent + Weekly Tasks 병렬 나란히 배치
음악 관련 일정만 표시
캘린더 변경 표시 배지
드래그 앤 드롭 + 별표 우선순위 + 삭제
4. 협업 (CollabBoard.tsx)

트랙 이름, 프로듀서, 탑라이너, 타겟 아티스트, 데드라인, 의뢰 날짜 카드
완료 카드에 "피칭아이디어로 이동" 버튼 → 등급 선택(S급/A급/A-급) 메뉴
5. 피칭아이디어 (NEW - PitchingBoard.tsx)

S급, A급, A-급(JPN) 3개 컬럼
드래그 앤 드롭으로 등급 간 이동
데모곡 이름, 저작자, 퍼블리싱 정보 카드
수동 추가 다이얼로그 지원
6. Hold/Fix (HoldFixBoard.tsx)

HOLD/FIX/RELEASE 3개 컬럼 칸반 + 드래그 앤 드롭
모든 정보 인라인 편집 가능
날짜: 연/월/일 SELECT 드롭다운
Production Fee: KRW/USD/EUR 통화 선택
Hold 카드에서 담당자 필드 제거
삭제 버튼
7. 개인 스케줄 (PersonalBoard.tsx)

리스트 → 카드 형태로 변경
별표 우선순위 + 삭제 버튼
별표 카드 상단 정렬
8. 주식 일정 (StockBoard.tsx)

대형 캘린더 (이벤트 제목 셀 내 표시, 월 네비게이션)
관련 뉴스 섹션 제거
Gemini 기반 AI 챗봇 (Google Search grounding으로 웹검색 지원)
매크로/일정 관련 질문 답변 가능
9. 네비게이션 (AppShell.tsx)

피칭아이디어 탭 추가 (협업과 Hold/Fix 사이)


