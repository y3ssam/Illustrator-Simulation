'use strict';
const assert=require('node:assert/strict');
const {Engine,validateSave}=require('../engine.js');

const game=new Engine(null,[]);
game.s.fatigue=35;
const drink={id:'soft-drink',name:'탄산음료',price:2200,effect:{type:'fatigue_change',amount:-10}};
assert.equal(game.purchaseShopItem(drink),true);
assert.deepEqual({category:game.s.logs[0].category,amount:game.s.logs[0].amount},{category:'expense',amount:-2200});
const before=game.s.totals.expense;
assert.equal(game.useShopItem(drink),true);
assert.equal(game.s.logs[0].category,'event');
assert.equal(game.s.totals.expense,before,'item use does not cause a second charge');
game.s.money=1000000;
assert.equal(game.upgradeOffline('tablet'),true);
assert.equal(game.s.logs[0].amount,-250000);
game.random=()=>.99;
assert.equal(game.lotto(),10000);
assert.deepEqual(game.s.logs.slice(0,2).map(({category,amount})=>[category,amount]),[['income',10000],['expense',-1000]]);
const amountBefore=game.s.money,totalsBefore={...game.s.totals};
const reloaded=new Engine(game.export(),[]);
assert.deepEqual(reloaded.s.logs,game.s.logs);
assert.equal(reloaded.s.money,amountBefore);
assert.deepEqual(reloaded.s.totals,totalsBefore);

const old=game.export();
old.logs=[{at:old.now,text:'탄산음료 구매 · 2,200원 지출 / 보유 1개'},{at:old.now,text:'낙서 두상 납품 · 10000원 / 20 EXP'},{at:old.now,text:'복권 결과 1000원 · 하루 1장'},{at:old.now,text:'그림 연습 완료 · 2 EXP'}];
const migrated=validateSave(old);
assert.deepEqual(migrated.logs.map(({category})=>category),['expense','income','event','event']);
assert.equal(migrated.logs.every(log=>!Object.hasOwn(log,'amount')),true,'legacy amounts are not fabricated');
assert.equal(migrated.money,old.money);
assert.deepEqual(migrated.totals,old.totals);

for(let i=0;i<1001;i++)game.log('기록 '+i);
assert.equal(game.s.logs.length,1000);
assert.equal(game.s.logs[0].text,'기록 1000');
assert.equal(game.s.logs.at(-1).text,'기록 1');
assert.equal(new Engine(game.export(),[]).s.logs.length,1000);
console.log('Journal transaction, legacy, and 1,000-record checks passed.');
