// Run with: node tests/starting-money-promotion.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Engine, fresh, VERSION, STARTING_MONEY, PROMOTION_COST} = require('../engine.js');

assert.equal(VERSION, 3, 'save format must not change');
assert.equal(STARTING_MONEY, 100000);
assert.equal(PROMOTION_COST, 100000);
assert.equal(fresh().money, 100000, 'initial game state');
const newcomer = new Engine(null, []);
assert.equal(newcomer.s.money, 100000);
assert.equal(newcomer.s.totals.income, 0, 'starting grant is not earned income');
newcomer.startFresh('테스트 작업실');
assert.equal(newcomer.s.money, 100000, 'starting again grants starting balance');
assert.equal(newcomer.s.totals.income, 0, 'starting again is not income');

const preexisting = new Engine(null, []);
preexisting.s.money = 12345;
const existingSaved = new Engine(preexisting.export(), []);
assert.equal(existingSaved.s.money, 12345, 'loading an existing save must keep its money');
const zeroSaved = new Engine(null, []);
zeroSaved.s.money = 0;
assert.equal(new Engine(zeroSaved.export(), []).s.money, 0, 'old zero balance must not be replaced');
const debt = new Engine(null, []);
debt.s.money = -25000;
assert.equal(new Engine(debt.export(), []).s.money, -25000, 'old negative balance must survive');

const insufficient = new Engine(null, []);
insufficient.s.money = 99999;
const before = JSON.stringify(insufficient.export());
assert.equal(insufficient.promotion(), false, '99999 is not enough');
assert.equal(JSON.stringify(insufficient.export()), before, 'failed purchase must be side-effect free');

const canBuy = new Engine(null, []);
const now = canBuy.s.now;
assert.equal(canBuy.promotion(), true, 'initial 100k exactly pays for promotion');
assert.equal(canBuy.s.money, 0);
assert.equal(canBuy.s.totals.expense, 100000);
assert.equal(canBuy.s.buffs.length, 1);
assert.equal(canBuy.s.buffs[0].id, 'promotion');
assert.equal(canBuy.s.buffs[0].arrival, 5);
assert.equal(canBuy.s.buffs[0].until, now + 960, 'duration stays 16 game hours');
assert.match(canBuy.s.logs[0].text, /100,000원/, 'record current price');
assert.equal(canBuy.promotion(), false, 'cannot stack active promotion');
assert.equal(canBuy.s.totals.expense, 100000);
const restored = new Engine(canBuy.export(), []);
assert.equal(restored.s.money, 0);
assert.equal(restored.s.totals.expense, 100000);
assert.equal(restored.s.buffs[0].until, now + 960, 'save retains active promotion');

const funded = new Engine(null, []);
funded.s.money = 300000;
assert.equal(funded.promotion(), true);
assert.equal(funded.promotion(), false, 'active buff disallows rebuy regardless of remaining money');
assert.equal(funded.s.money, 200000);
assert.equal(funded.s.totals.expense, 100000);

const gameUI = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
assert.match(gameUI, /won\(StudioCore\.PROMOTION_COST\)/, 'promotion UI must read the engine constant');
assert.match(gameUI, /s\.money<StudioCore\.PROMOTION_COST/, 'button uses current affordable threshold');
assert.match(gameUI, /주간 식비 350,000원/, 'previously updated weekly expense text stays correct');
assert.doesNotMatch(gameUI, /주간 식비 55,000원/, 'old weekly expense label removed');
new Function(gameUI);
console.log('Starting money and promotion price checks passed.');
