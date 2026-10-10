// Run with: node tests/practice-shop-layout.test.js
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../engine.js');
const {Engine,PRACTICE,WEEKLY_FOOD_COST,VERSION}=core;

assert.equal(VERSION,3);
assert.deepEqual(PRACTICE,{duration:30,exp:2});
assert.equal(WEEKLY_FOOD_COST,175000);
const normal=new Engine(null,[]);
normal.s.auto=false;normal.s.autoAccept=false;normal.s.autoPractice=true;
normal.advance(29);
assert.equal(normal.s.practiceDone,29);
assert.equal(normal.s.exp,0);
normal.advance(1);
assert.equal(normal.s.practiceDone,0);
assert.equal(normal.s.exp,2);
assert.equal(normal.s.totals.practiceSessions,1);
const restored=new Engine(normal.export(),[]);
assert.equal(restored.s.practiceDuration,30);
assert.equal(restored.s.exp,2);
assert.equal(restored.s.totals.practiceSessions,1);

const offline=new Engine(null,[]);
offline.s.auto=false;offline.s.autoAccept=false;offline.s.autoPractice=true;
offline.advance(30,true);
assert.equal(offline.s.exp,0,'offline 10% of 2 EXP rounds down');
offline.s.offlineUpgrades.chair=5;
offline.advance(30,true);
assert.equal(offline.s.exp,1,'offline chair Lv.5 grants 50% of 2 EXP');

const original=new Engine(null,[]).export();
delete original.practiceDuration; // existing v3 saves used a 240-minute cycle
for(const [oldDone,expected] of [[0,0],[8,1],[16,2],[80,10],[120,15],[238,29],[239,29]]){
 const save={...original,practiceDone:oldDone};
 const imported=new Engine(save,[]);
 assert.equal(imported.s.practiceDone,expected,'migrated practiceDone '+oldDone);
 assert.equal(imported.s.practiceDuration,30,'new marker preserved');
 assert.equal(new Engine(imported.export(),[]).s.practiceDone,expected,'no repeated migration');
}
const current=new Engine(null,[]).export();
current.practiceDone=15;
assert.equal(new Engine(current,[]).s.practiceDone,15,'new 30-min saves not rescaled');
assert.throws(()=>new Engine({...current,practiceDuration:40},[]),'unknown cycle marker');

const weekly=new Engine(null,[]);
weekly.s.money=1000000;
weekly.s.now=10079;weekly.s.lastFoodWeek=0;
weekly.s.auto=false;weekly.s.autoPractice=false;weekly.s.autoAccept=false;
weekly.advance(1);
assert.equal(weekly.s.money,825000);
assert.equal(weekly.s.totals.expense,175000);
weekly.s.now=20159;
weekly.advance(1);
assert.equal(weekly.s.money,650000);
assert.equal(weekly.s.totals.expense,350000);

const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','reference.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
new Function(app);
assert.ok(app.includes("s.practiceDone/StudioCore.PRACTICE.duration"),'progress meter uses core balance');
assert.ok(app.includes('StudioCore.PRACTICE.exp'), 'EXP labels use core value');
assert.ok(app.includes('StudioCore.WEEKLY_FOOD_COST'), 'weekly food UI uses core value');
assert.ok(!app.includes('주간 식비 350,000원'),'no stale food label');
assert.ok(!app.includes('4분 / 15 EXP'),'no stale practice label');
assert.ok(app.includes('function shopSidebar()'),'shop side panel renderer');
assert.ok(app.includes('note.classList.toggle(\'shop-note\',shopPanel)'), 'reuse growth-note space');
assert.ok(app.includes('innerWidth<1050?shopSidebar()'), 'mobile inline layout');
assert.ok(app.includes('shop-sidebar-inventory'),'inventory area exists');
assert.ok(app.includes('shop-sidebar-upgrades'),'upgrades at top');
assert.ok(css.includes('.shop-note .shop-note-body'), 'desktop note styles');
assert.ok(css.includes('@media(max-width:1049px)'), 'responsive styles');
assert.ok(html.includes('id="growth-note"'),'existing right panel retained');
assert.ok(app.includes('shop-inventory-list'),'shop panel renders owned items');
assert.ok(app.includes('shop-inventory-quantity'),'inventory shows bottom-right quantity');
assert.ok(app.includes('engine.useShopItem(item)'),'inventory consumption wired');
assert.ok(!app.includes('practiceDone/240'),'old progress calculation removed');
console.log('Practice, food cost, saved progress migration and shop sidebar checks passed.');
