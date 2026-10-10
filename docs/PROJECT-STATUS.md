# 프로젝트 작업 현황

**기준 날짜: 2026-10-10 (KST)**  
**공식 저장소: https://github.com/y3ssam/Illustrator-Simulation**

## 이번 작업
- [x] GitHub 초기 저장소를 만들고 제공된 HTML/CSS/JS 소스 7개 등록
- [x] 메뉴 순서를 작업실, 집, 상점, 가챠, 기록으로 정리
- [x] 집·상점·가챠는 비용 차감 없는 임시 화면으로 연결
- [x] 기존 의뢰함·도감, 성장·운영 기능을 작업실 내부에서 접근하도록 유지
- [x] ChatGPT 프로젝트용 지침과 개발 에이전트 지침 저장
- [x] 게임 기획 및 변경 현황 문서 등록
- [x] 5개 탭 순서·내부 버튼·저장 키 정적 확인 및 app.js / engine.js JavaScript 구문 검사
- [x] `tests/navigation.test.js` 회귀 점검 스크립트 추가 (Node에서 직접 실행은 별도 확인 필요)
- [ ] 실제 PC/모바일 브라우저에서 시각·조작 테스트
- [ ] 집·상점·가챠의 구체적인 콘텐츠·구매·확률 설계
- [ ] 재화 소비 기능 및 게임 엔진/저장 포맷 수정
- [ ] 이번 제공본에 빠져 있는 이미지와 폰트 에셋 등록

## 소스 역할
- `index.html`: 앱 구조, 5개 메인 메뉴
- `app.js`: 렌더링, 탭/성장 노트/의뢰 UI 이벤트
- `engine.js`: 게임 상태와 저장 검증·마이그레이션 (v3)
- `catalog.js`: 외주 신청자·작업물 데이터 (현재 빈 배열)
- `style.css` / `reference.css`: 현재 HTML에 연결된 CSS
- `cozy.css`: 현재 HTML에서 미연결된 스타일 참고 파일

## 확인이 필요한 에셋
현재 CSS에서 참조하지만 사용자 제공 파일에 포함되지 않은 경로:
- `assets/01-desk.webp`
- `assets/02-work-thumbnails.webp`
- `assets/03-equipment.webp`
- `assets/fonts/PretendardVariable.woff2`

이 에셋이 없더라도 JavaScript 코드 등록과 탭 이동은 별개이며, 원래 배경/폰트의 완전한 복원은 해당 원본 확보 후 진행한다.

## 저장 데이터 유의사항
- 브라우저 저장 키 `studio.workbench.v2`, 게임 엔진 포맷 v3를 유지한다.
- 기존 JSON 가져오기 및 원본 게임 데이터 이전 코드를 임의로 삭제하지 않는다.
- 플레이어의 실제 세이브 파일은 소스 저장소에 자동 업로드하지 않는다.
