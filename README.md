# Tim_Schedul Agent

음악 A&R 업무를 위한 전담 스케줄러 에이전트 **Tim**의 UI/UX 프로토타입입니다.

## 핵심 기능

- Google Calendar 동기화 버튼 (좌측 하단)
- Overview: 오늘/내일 긴급 업무 + 7일 내 주간 업무 TODO 리스트
- 협업: 의뢰중 / 진행중 / 완료 칸반 보드
- Hold / Fix: 데모 홀드 및 픽스 상세 정보
- 개인: 개인 루틴/금전/운동/독서 일정
- 주식: 주요 일정 캘린더 + 요약 카드 + 뉴스 영역

## 실행 방법

```bash
npm install
npm run dev
```

## 환경 변수

Google Calendar 연동을 테스트하려면 아래 변수를 설정하세요.

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=
```

## 참고

- 현재는 샘플 데이터로 구성된 UI 프로토타입입니다.
- Google Calendar 및 Gemini 연동은 추후 API 연결 예정입니다.
