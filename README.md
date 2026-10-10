# 어쩌구 키우기

일러스트레이터 작업실 운영 방치형 웹게임입니다. 이 저장소를 게임 소스와 개발 문서의 기준 저장소로 사용합니다.

## 실행
정적 HTML/JavaScript 프로젝트입니다. `index.html`을 로컬 웹서버로 열어 실행합니다. 브라우저 저장은 localStorage 기반이며, 설정에서 JSON 파일로 내보내거나 가져올 수 있습니다.

## 메뉴
작업실 → 집 → 상점 → 가챠 → 기록

현재 집·상점·가챠는 화면 진입만 가능한 임시 탭입니다. 기존 의뢰·성장·운영 기능은 작업실 화면 및 성장·운영 창에서 유지합니다.

## 문서
- `CHATGPT_PROJECT_INSTRUCTIONS.md`: ChatGPT 프로젝트 설정에 붙여넣는 지침
- `AGENTS.md`: 코드 작업 에이전트용 안내
- `docs/GAME-DESIGN.md`: 현재 게임과 재화 사용처의 기획 상태
- `docs/PROJECT-STATUS.md`: 진행 현황 및 다음 작업
- `docs/CHANGELOG.md`: 변경 기록

## 외부 리소스 확인
이 저장소의 초기 소스는 사용자 제공 HTML/CSS/JS 7개 파일을 기준으로 합니다. CSS가 참조하는 `assets/01-desk.webp`, `assets/02-work-thumbnails.webp`, `assets/03-equipment.webp`, `assets/fonts/PretendardVariable.woff2`의 원본 파일은 이번에 제공되지 않았습니다. 배경 이미지와 서체를 동일하게 표현하려면 해당 리소스의 추가 등록이 필요합니다.

실제 플레이 진행 데이터(개인 브라우저 저장 JSON)는 소스 저장소에 자동 업로드하지 않습니다.
