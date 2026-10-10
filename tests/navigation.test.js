// 실행: node tests/navigation.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const nav = html.match(/<nav aria-label="작업실 메뉴">([\s\S]*?)<\/nav>/);
assert.ok(nav, '메인 메뉴가 있어야 합니다.');
const tabs = [...nav[1].matchAll(/<button data-tab="([^"]+)"[^>]*><span class="nav-icon"><\/span><span>([^<]+)<\/span>/g)].map(m => [m[1], m[2]]);
assert.deepEqual(tabs, [
  ['studio', '작업실'],
  ['home', '집'],
  ['shop', '상점'],
  ['gacha', '가챠'],
  ['journal', '기록']
]);
for (const value of ["home", "shop", "gacha"]) {
  assert.ok(app.includes(value), value + ' 탭이 app.js에 필요합니다.');
}
assert.ok(app.includes('open-notes'), '성장·운영 이동 버튼이 필요합니다.');
assert.ok(app.includes('open-collection'), '의뢰함·도감 이동 버튼이 필요합니다.');
assert.ok(app.includes("studio.workbench.v2"), '기존 저장 키는 변경하지 않습니다.');
console.log('Navigation smoke checks passed');
