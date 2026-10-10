// Run with: node tests/shop-item-data.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const data = JSON.parse(read('data/shop-items.json'));
assert.equal(data.version, 1);
assert.ok(Array.isArray(data.items));
assert.equal(new Set(data.items.map(x => x.id)).size, data.items.length);
const soda = data.items.find(x => x.id === 'soft-drink');
assert.ok(soda, '탄산음료 시드 데이터');
assert.equal(soda.name, '탄산음료');
assert.equal(soda.price, 2200);
assert.deepEqual(soda.effect, {type:'fatigue_change', amount:-10});
assert.equal(soda.icon, 'assets/shop/soft-drink-red.png');
assert.ok(fs.existsSync(path.join(root, soda.icon)), '첫 아이콘 파일이 있어야 합니다.');
const html = read('tools/shop-editor.html');
const js = read('tools/shop-editor.js');
const css = read('tools/shop-editor.css');
for(const id of ['item-list','item-form','effect-fields','preview-image','import-button','export-button']){
  assert.ok(html.includes('id="'+id+'"'), '누락된 UI 요소: '+id);
}
for(const effect of ['fatigue_change','timed_buff','remove_debuff']){
  assert.ok(js.includes(effect), '효과 유형: '+effect);
}
assert.ok(js.includes('validateCatalog'), 'JSON 검증 코드');
assert.ok(js.includes('localStorage'), '로컬 임시 편집 저장');
assert.ok(css.includes('@media(max-width:690px)'), '모바일 배치');
new Function(js);
console.log('Shop item editor data and syntax checks passed.');
