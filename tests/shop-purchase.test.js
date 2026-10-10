// node tests/shop-purchase.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Engine, VERSION} = require('../engine.js');
const itemFile = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/shop-items.json'),'utf8'));
const soda = itemFile.items.find(x => x.id==='soft-drink');
assert.equal(VERSION,3,'기존 저장 버전 유지');
assert.ok(soda,'탄산음료 데이터가 있어야 합니다.');
assert.equal(soda.price,2200);
assert.deepEqual(soda.effect,{type:'fatigue_change',amount:-10});
assert.ok(fs.existsSync(path.join(__dirname,'..',soda.icon)),'아이콘이 존재해야 합니다.');
function game(money,fatigue) {const e=new Engine(null,[]);e.s.money=money;e.s.fatigue=fatigue;return e;}

const usual=game(4000,37);
assert.equal(usual.canPurchaseShopItem(soda),'');
assert.equal(usual.purchaseShopItem(soda),true);
assert.equal(usual.s.money,1800);
assert.equal(usual.s.fatigue,27);
assert.equal(usual.s.totals.expense,2200);
assert.ok(usual.s.logs[0].text.includes('탄산음료'));
const reloaded=new Engine(usual.export(),[]);
assert.equal(reloaded.s.money,1800,'잔액 저장 호환');
assert.equal(reloaded.s.fatigue,27,'피로도 저장 호환');
assert.equal(reloaded.s.totals.expense,2200,'누적 지출 저장 호환');

const low=game(2200,3);
assert.equal(low.purchaseShopItem(soda),true);
assert.equal(low.s.fatigue,0,'0 미만으로 내려가지 않는다');
assert.equal(low.s.money,0);
assert.equal(low.s.totals.expense,2200);

const broke=game(2199,40);
const oldBroke=JSON.stringify(broke.export());
assert.equal(broke.purchaseShopItem(soda),false);
assert.equal(JSON.stringify(broke.export()),oldBroke,'잔액 부족: 전체 상태 변경 금지');

const rested=game(10000,0);
const oldRested=JSON.stringify(rested.export());
assert.equal(rested.purchaseShopItem(soda),false);
assert.equal(JSON.stringify(rested.export()),oldRested,'피로도 0: 전체 상태 변경 금지');

const unsupported=game(10000,80);
assert.equal(unsupported.purchaseShopItem({...soda,effect:{type:'timed_buff',target:'speed',value:20,durationMinutes:60}}),false);
assert.equal(unsupported.s.money,10000,'미지원 효과에서 지출 금지');

const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../reference.css'),'utf8');
new Function(app);
assert.ok(app.includes("fetch('data/shop-items.json'"),'제작 도구의 데이터 파일을 읽는다');
assert.ok(app.includes("content=shop()"),'상점 탭과 연결');
assert.ok(app.includes("engine.purchaseShopItem(item)"),'구매 클릭과 엔진 연결');
assert.ok(css.includes('.shop-item-controls'),'상점 반응형 스타일 존재');
assert.ok(app.includes("studio.workbench.v2"),'기존 로컬 저장 키 유지');
console.log('Shop integration tests passed.');
