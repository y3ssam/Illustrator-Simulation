// Run: node tests/starting-money.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Engine, fresh, VERSION, STARTING_MONEY} = require('../engine.js');

assert.equal(VERSION,3);
assert.equal(STARTING_MONEY,100000);
assert.equal(fresh().money,100000);
const newcomer = new Engine(null,[]);
assert.equal(newcomer.s.money,100000);
assert.equal(newcomer.s.totals.income,0);
newcomer.startFresh('테스트 작업실');
assert.equal(newcomer.s.money,100000);
assert.equal(newcomer.s.totals.income,0);
for(const money of [0,12345,-25000]){
  const game=new Engine(null,[]);
  game.s.money=money;
  assert.equal(new Engine(game.export(),[]).s.money,money);
}
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
assert.match(app,/주간 식비 \$\{won\(StudioCore\.WEEKLY_FOOD_COST\)\}/);
assert.doesNotMatch(app,/case 'promotion'|StudioCore\.PROMOTION_COST/);
new Function(app);
console.log('Starting money and legacy balance checks passed.');
