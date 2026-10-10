// Run: node tests/offline-upgrades.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Engine,VERSION,UPGRADE_COSTS,UPGRADE_RATE_STEPS,OFFLINE_BASE_RATE}=require('../engine.js');

assert.equal(VERSION,3,'old save version stays valid');
assert.equal(OFFLINE_BASE_RATE,10);
assert.deepEqual(UPGRADE_COSTS,[250000,750000,1500000,5500000,20000000]);
assert.deepEqual(UPGRADE_RATE_STEPS,[3,5,7,10,15]);
const expected=[10,13,18,25,35,50];
for(const kind of ['tablet','chair']){
  const e=new Engine(null,[]);
  assert.equal(e.s.offlineUpgrades[kind],0);
  assert.equal(e.offlineRate(kind),10);
  for(let level=1;level<=5;level++){
    e.s.money=UPGRADE_COSTS[level-1];
    assert.equal(e.canUpgradeOffline(kind),'','affordable');
    assert.equal(e.upgradeOffline(kind),true);
    assert.equal(e.s.money,0);
    assert.equal(e.s.offlineUpgrades[kind],level);
    assert.equal(e.offlineRate(kind),expected[level]);
    const restored=new Engine(e.export(),[]);
    assert.equal(restored.s.offlineUpgrades[kind],level,'save restores upgrades');
    assert.equal(restored.offlineRate(kind),expected[level]);
  }
  assert.equal(e.canUpgradeOffline(kind),'최대 단계입니다.');
  assert.equal(e.upgradeOffline(kind),false);
  assert.equal(e.s.offlineUpgrades[kind],5);
}
const poor=new Engine(null,[]);
poor.s.money=249999;
const before=JSON.stringify(poor.export());
assert.equal(poor.upgradeOffline('tablet'),false);
assert.equal(JSON.stringify(poor.export()),before,'failed upgrade must not spend');
assert.equal(poor.upgradeOffline('unknown'),false);

const old=new Engine(null,[]).export();
delete old.offlineUpgrades;
const migrated=new Engine(old,[]);
assert.deepEqual(migrated.s.offlineUpgrades,{tablet:0,chair:0},'old v3 save initializes level zero');
assert.equal(migrated.s.money,old.money,'old money not modified');
assert.throws(()=>new Engine({...old,offlineUpgrades:{tablet:6,chair:0}},[]),'level max 5');
assert.throws(()=>new Engine({...old,offlineUpgrades:{tablet:1.5,chair:0}},[]),'level must be integer');

function jobResult(offline,tablet,chair){
 const e=new Engine(null,[]);
 e.s.money=0;e.s.level=0;e.s.exp=0;e.s.autoPractice=false;
 e.s.offlineUpgrades={tablet,chair};
 const q={id:'q-test',type:'낙서',scope:'두상',source:'normal',gold:10000,exp:20,work:1,done:0,deadline:e.s.now+1000,expires:e.s.now+500};
 e.s.jobs=[q];e.s.active=q.id;e.s.queueOrder=[q.id];
 e.advance(1,offline);
 assert.equal(e.s.totals.completed,1);
 assert.equal(e.s.jobs.length,0);
 return {money:e.s.money,exp:e.s.exp,income:e.s.totals.income,logs:e.s.logs};
}

assert.deepEqual(((r)=>[r.money,r.exp])(jobResult(false,0,0)),[10000,20],'online always earns full');
assert.deepEqual(((r)=>[r.money,r.exp])(jobResult(true,0,0)),[1000,2],'offline 10% each');
assert.deepEqual(((r)=>[r.money,r.exp])(jobResult(true,5,0)),[5000,2],'tablet upgrades income only');
assert.deepEqual(((r)=>[r.money,r.exp])(jobResult(true,0,5)),[1000,10],'chair upgrades EXP only');
assert.deepEqual(((r)=>[r.money,r.exp])(jobResult(true,5,5)),[5000,10],'both max 50%');

const practice=new Engine(null,[]);
practice.s.auto=false;practice.s.autoAccept=false;practice.s.autoPractice=true;practice.s.money=0;
practice.advance(30,true);
assert.equal(practice.s.exp,0,'2 EXP * 10% rounds down to zero');
const practiceMax=new Engine(null,[]);
practiceMax.s.auto=false;practiceMax.s.autoAccept=false;practiceMax.s.autoPractice=true;practiceMax.s.offlineUpgrades.chair=5;
practiceMax.advance(30,true);
assert.equal(practiceMax.s.exp,1,'2 * 50% awards 1 EXP');

const food=new Engine(null,[]);
food.s.money=1000000;food.s.auto=false;food.s.autoAccept=false;food.s.autoPractice=false;
food.s.now=10079;food.s.lastFoodWeek=0;
food.advance(1,true);
assert.equal(food.s.money,825000,'weekly food remains at full cost');
assert.equal(food.s.totals.expense,175000);

const sleep=new Engine(null,[]);
sleep.s.auto=false;sleep.s.autoAccept=false;sleep.s.autoPractice=true;sleep.s.fatigue=89.99;
sleep.advance(1,true);
assert.ok(sleep.s.restUntil>sleep.s.now,'offline fatigue still causes sleep');
sleep.advance(480,true);
assert.ok(sleep.s.fatigue<50,'offline sleep still restores 50 fatigue');

const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
new Function(app);
assert.match(app,/snapshot\.savedAt/,'save stores wall-clock cursor');
assert.match(app,/segments\.push\(\{ms:elapsed,offline:true\}\)/,'reopening adds closed-time backlog');
assert.match(app,/engine\.advance\(minutes,first\.offline\)/,'hidden and active progress have distinct reward modes');
assert.match(app,/offlineMode=document\.hidden/);
assert.match(app,/case 'upgrade-offline'/,'shop upgrade button handler');
assert.match(app,/assets\/shop\/pen-tablet\.png/);
assert.match(app,/assets\/shop\/chair\.png/);
assert.match(html,/data-tab="shop"/,'original main menu maintained');
for(const iconName of ['pen-tablet.png','chair.png']){
 const icon=fs.readFileSync(path.join(__dirname,'..','assets','shop',iconName));
 assert.equal(icon.subarray(1,4).toString(),'PNG');
 assert.equal(icon.readUInt32BE(16),32,'icon width');
 assert.equal(icon.readUInt32BE(20),32,'icon height');
 assert.ok(icon.includes(Buffer.from('tRNS')),'transparent PNG');
}
console.log('Offline income/EXP upgrades, recovery and compatibility checks passed.');

