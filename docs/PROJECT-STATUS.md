# 프로젝트 작업 현황

**기준 날짜: 2026-10-10 (KST)**  
**공식 저장소: https://github.com/y3ssam/Illustrator-Simulation**

## 완료
- [x] 메뉴: 작업실, 집, 상점, 가챠, 기록 / 기존 의뢰·성장·운영 접근 유지
- [x] 초기 HTML·CSS·JavaScript 및 개발 문서 GitHub 등록
- [x] 사용자 업로드한 작업실 배경, 썸네일, Pretendard 폰트와 라이선스 파일 GitHub 존재 확인
- [x] 사용자 제공 탄산음료 아이콘 `assets/shop/soft-drink-red.png` GitHub 등록
- [x] 상점 아이템 제작용 독립 페이지 (`tools/shop-editor.html`, `.css`, `.js`)
- [x] JSON 시드 데이터 등록 (`data/shop-items.json`): 탄산음료 / 2,200원 / 피로도 -10
- [x] 편집기: 아이템 생성·수정·삭제, 효과 종류, 아이콘 경로/로컬 이미지 미리보기, 저장된 목록 JSON 가져오기·내보내기, 브라우저 로컬 임시 저장
- [x] 제거한 장비 업그레이드 이미지·화면의 잔여 CSS 정리(기존 엔진 저장 호환 코드는 보존)
- [x] 편집기 JS 구문 검사 및 아이템 데이터·이미지 경로 정적 확인
- [x] `tests/shop-item-data.test.js` 자동 검사 스크립트 추가

## 미완료 / 향후 결정
- [ ] 사용자 브라우저에서 PC/모바일 실제 화면 및 상점 구매 조작 검증
- [x] 첨부 원본 엔진과 GitHub에 반영한 동일 구매 로직으로 Node 테스트 통과 (정상 결제/피로도 하한/잔액 부족/피로도 0/미지원 효과/세이브 재불러오기)
- [ ] GitHub 리포지터리 전체를 다운로드한 뒤 `node tests/shop-purchase.test.js`, 기존 회귀 스크립트 실행 확인 (테스트 환경에서 github.com DNS 접근 불가)
- [x] 상점 탄산음료의 직접 구매·즉시 사용, 2,200원 차감, 피로도 10 감소, 기록 및 기존 저장과 연동
- [ ] 그 외 아이템의 보관·효과·구매 정책 결정
- [ ] 시간제 버프 및 디버프 해제 아이템의 구체적인 엔진 적용 정책 결정
- [ ] 가챠 굿즈 시리즈·외주 작업자 시리즈 제작 툴은 미착수

## 기존 동작을 유지한 부분
- `engine.js` 저장 버전 3 / 저장 키 `studio.workbench.v2`
- 구버전 장비 강화비 환급 등 세이브 마이그레이션
- 별도 장비 점검 이벤트 및 설정은 기존대로 유지 (장비 업그레이드는 폐기됨)
- 의뢰 관리·도감·성장·자동화 및 기록

## 현재 이미지 경로
- 현재 게임 참조: `assets/01-desk.webp`, `assets/02-work-thumbnails.webp`
- 현재 폰트: `assets/fonts/PretendardVariable.woff2` (`OFL.txt` 포함)
- 참고 스타일 자산: `assets/cozy-studio-web.webp`
- 개발 도구 아이콘: `assets/shop/soft-drink-red.png`
- 폐기한 장비 업그레이드 이미지는 필요 없음: `assets/03-equipment.webp`

## 편집기 이용
`tools/shop-editor.html`을 프로젝트 로컬 웹서버에서 열거나, 별도로 GitHub Pages가 활성화된 경우 해당 경로에서 연다. 편집 결과는 브라우저 로컬에 임시 저장된다. **JSON 내보내기 → 데이터 파일 GitHub 반영**, 아이콘은 **원본 이미지 GitHub 등록**이 필요하다. 자동 저장은 게임 플레이 저장과 별도 키를 사용하며 게임 상태를 변경하지 않는다.

## 이번 구현(2026-10-10) — 탄산음료 실제 게임 반영
- `engine.js`: `canPurchaseShopItem`, `purchaseShopItem` 추가 (저장 스키마 변경 없음)
- `app.js`: `data/shop-items.json` 로딩, 상점 탭 상품 표시, 구매·사용 버튼/확인 메시지 연결
- `reference.css`: PC/모바일 상점 아이템 행 스타일
- `tests/shop-purchase.test.js`: 구매/피로도/저장 호환성 회귀 테스트 스크립트
- 이미지 경로는 기존 `assets/shop/soft-drink-red.png` 사용
- 별도 아이템 재고·인벤토리 없이 구매 즉시 사용
- 사용 조건: 피로도 0이면 구매 불가, 재화 부족 시 구매 불가
- **검증 범위**: 도구에서 현재 GitHub 파일 및 JavaScript 문법·참조를 확인했고, 별도의 로컬 Node 테스트에서는 첨부 엔진에 동일 구매 로직을 적용해 핵심 경계 조건과 저장 호환이 통과했다. GitHub 전체 클론 및 실제 브라우저 시험은 미완료.
