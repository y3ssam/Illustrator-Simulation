'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Engine,fresh}=require('../engine.js');
const incidents=require('../incidents.js');
const items=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/shop-items.json'),'utf8')).items;
const job=(id,now,options={})=>({id,type:options.type||'낙서',scope:options.scope||'두상',source:'normal',gold:10000,exp:20,work:options.work||10000,done:0,deadline:now+100000,expires:now+500,inboxWait:0});
const working=()=>{const e=new Engine();e.s.auto=false;e.s.autoAccept=false;e.s.autoPractice=false;const q=job('q1',e.s.now);e.s.jobs=[q];e.s.active=q.id;e.s.queueOrder=[q.id];return {e,q};};
assert.equal(incidents.all.length,60);assert.equal(incidents.buffs.length,30);assert.equal(incidents.debuffs.length,30);
assert.equal(new Set(incidents.all.map(x=>x.id)).size,60);
for(const f of [0,24.999,25,49.999,50,74.999,75,100]){
  const expect=f<25?[.02,.01]:f<50?[.015,.01]:f<75?[.01,.015]:[.01,.02];
  assert.deepEqual(new Engine().incidentChances(f),expect);
}
assert.equal(incidents.eligible(incidents.byId['deadline-focus'],{deadline:600,type:'낙서',scope:'두상'},420),true);
assert.equal(incidents.eligible(incidents.byId['deadline-focus'],{deadline:601,type:'낙서',scope:'두상'},420),false);
assert.equal(incidents.eligible(incidents.byId['perfect-colors'],{type:'낙서'},420),false);
assert.equal(incidents.eligible(incidents.byId['color-indecision'],{type:'풀채색'},420),true);
assert.equal(incidents.eligible(incidents.byId['detail-obsession'],{scope:'흉상'},420),false);
assert.equal(incidents.eligible(incidents.byId['detail-obsession'],{scope:'반신'},420),true);

{
  const {e,q}=working();const start=e.s.now;e.s.workIncidentClock=148;e.random=()=>0;
  e.advance(1);assert.equal(e.s.activeWorkEffects.length,0);assert.equal(e.s.workIncidentClock,149);
  e.advance(1);assert.equal(e.s.workIncidentClock,0);assert.equal(e.s.activeWorkEffects.length,1);assert.equal(e.s.logs.filter(x=>x.text.startsWith('작업 중 사건')).length,1);
  assert.equal(e.s.activeWorkEffects[0].startedAt,start+2);
  const saved=e.export(),restored=new Engine(saved);assert.deepEqual(restored.s.activeWorkEffects,e.s.activeWorkEffects);assert.equal(restored.s.workIncidentClock,0);
  const noJob=new Engine();noJob.s.auto=false;noJob.s.autoPractice=false;noJob.s.autoAccept=false;noJob.s.workIncidentClock=149;noJob.random=()=>{throw Error('No random roll without work');};noJob.advance(1);assert.equal(noJob.s.workIncidentClock,0);
}
{
  const {e,q}=working();e.s.fatigue=20;e.s.workIncidentClock=149;e.random=()=>.025;e.advance(1);assert.equal(e.s.logs.filter(x=>x.text.startsWith('작업 중 사건')).length,1,'only one incident per roll');
  const sleep=working();sleep.e.rest();sleep.e.s.workIncidentClock=149;sleep.e.random=()=>{throw Error('No roll in sleep');};sleep.e.advance(1);
  const paused=working();paused.e.pause();paused.e.s.workIncidentClock=149;paused.e.random=()=>{throw Error('No roll when paused');};paused.e.advance(1);
  const practice=new Engine();practice.s.auto=false;practice.s.autoAccept=false;practice.s.autoPractice=false;practice.startPractice();practice.s.workIncidentClock=149;practice.random=()=>{throw Error('No roll in practice');};practice.advance(1);
  const offline=working();offline.e.s.workIncidentClock=149;offline.e.random=()=>0;offline.e.advance(1,true);assert.equal(offline.e.s.logs.filter(x=>x.text.startsWith('작업 중 사건')).length,1);assert.equal(offline.e.recentIncidents.length,0);
}
{
  const {e,q}=working();e.triggerIncident(incidents.byId['hands-warmed'],q);e.triggerIncident(incidents.byId['hands-warmed'],q);e.triggerIncident(incidents.byId['focus-loss'],q);
  assert.equal(e.effectTotal('speed'),10);assert.equal(e.rate(),1.1);
  e.triggerIncident(incidents.byId['good-posture'],q);e.triggerIncident(incidents.byId['stiff-shoulders'],q);assert.equal(e.effectTotal('fatigueRate'),0);
  e.s.fatigue=90;assert.equal(e.rate(),.55);
  const before=e.s.now;e.s.activeWorkEffects[0].expiresAt=before+2;e.advance(1);assert.equal(e.effectTotal('speed'),10);e.advance(1);assert.equal(e.effectTotal('speed'),0,'each duplicate expires on its own');
  e.rest();e.advance(480);assert.ok(e.s.activeWorkEffects.some(x=>x.incidentId==='hands-warmed'));
  e.s.activeWorkEffects.forEach(x=>x.expiresAt=e.s.now+1);e.advance(1);assert.equal(e.s.activeWorkEffects.length,0,'effects expire during idle time');
}
{
  const {e,q}=working();q.work=100;q.done=98;e.triggerIncident(incidents.byId['composition-flash'],q);assert.equal(e.s.totals.completed,1);assert.equal(e.s.jobs.length,0);
  const bonus=working();bonus.q.exp=50;bonus.q.work=1;bonus.e.triggerIncident(incidents.byId['favorite-job'],bonus.q);bonus.e.triggerIncident(incidents.byId['shading-discovery'],bonus.q);bonus.e.advance(1);assert.equal(bonus.e.s.exp,60);assert.equal(bonus.e.s.activeWorkEffects.length,0);
}
{
  const {e,q}=working();const coffee=items.find(x=>x.id==='ice-americano'),drops=items.find(x=>x.id==='eye-drops'),soda=items.find(x=>x.id==='soft-drink');
  assert.equal(items.length,9);assert.deepEqual(items.slice(1).map(x=>x.price),[3500,4500,2000,3000,1700,2500,1500,5000]);
  for(const item of items.slice(1)){assert.equal(e.validShopEffect(item),true);assert.equal(fs.existsSync(path.join(__dirname,'..',item.icon)),true);}
  assert.equal(e.purchaseShopItem(coffee),true);e.purchaseShopItem(coffee);assert.equal(e.inventoryCount(coffee.id),2);assert.ok(e.canUseShopItem(coffee));
  e.triggerIncident(incidents.byId['focus-loss'],q);e.triggerIncident(incidents.byId['focus-loss'],q);e.triggerIncident(incidents.byId['brain-fog'],q);e.triggerIncident(incidents.byId['missing-layer'],q);
  assert.equal(e.useShopItem(coffee),true);assert.equal(e.inventoryCount(coffee.id),1);assert.deepEqual(e.s.activeWorkEffects.map(x=>x.incidentId),['missing-layer']);
  assert.equal(e.cooldownRemaining(coffee.id),7200);assert.ok(e.canUseShopItem(coffee));assert.equal(e.useShopItem(coffee),false);assert.equal(e.inventoryCount(coffee.id),1);
  e.purchaseShopItem(coffee);assert.equal(e.cooldownRemaining(coffee.id),7200,'purchase does not reset cooldown');
  e.triggerIncident(incidents.byId['blurred-eyes'],q);e.purchaseShopItem(drops);assert.equal(e.useShopItem(drops),true,'other item cooldown is independent');
  const loaded=new Engine(e.export());assert.equal(loaded.cooldownRemaining(coffee.id),7200);loaded.s.auto=false;loaded.s.active=null;loaded.s.autoAccept=false;loaded.advance(7200);assert.equal(loaded.cooldownRemaining(coffee.id),0);
  loaded.s.fatigue=15;loaded.purchaseShopItem(soda);assert.equal(loaded.useShopItem(soda),true);assert.equal(loaded.s.fatigue,5);
  assert.equal(loaded.s.itemCooldowns[soda.id],undefined);
}
{
  const {e,q}=working();q.work=100;q.done=0;e.triggerIncident(incidents.byId['hands-warmed'],q);e.s.activeWorkEffects[0].expiresAt=e.s.now+20;
  const predicted=e.projection().get(q.id);e.s.workIncidentClock=0;e.random=()=>.99;
  while(e.s.totals.completed===0)e.advance(1);
  assert.equal(e.s.now,predicted,'ETA matches effect expiration and actual progress');
}
for(let n=0;n<120;n++){
  const {e,q}=working();q.work=20+(n*17.3)%170;e.s.fatigue=(n*19.07)%100;e.s.plan=(n*13)%150;e.s.speed=(n*7)%150;
  const rows=['hands-warmed','focus-loss','good-posture','stiff-shoulders'];
  for(let i=0;i<2;i++){e.triggerIncident(incidents.byId[rows[(n+i)%rows.length]],q);e.s.activeWorkEffects.at(-1).expiresAt=e.s.now+1+(n*(i+3))%55;}
  const predicted=e.projection().get(q.id);e.random=()=>.99;
  while(!e.s.totals.completed&&e.s.now<predicted+2)e.advance(1);
  assert.equal(e.s.now,predicted,'effect expiry ETA case '+n);
}
const legacy=fresh();legacy.buffs=[{id:'focus-loss',until:9999}];legacy.choices=[{}];legacy.eventClock=149;legacy.repair=1;
const migrated=new Engine(legacy);assert.equal(migrated.s.activeWorkEffects.length,0);assert.equal(migrated.s.workIncidentClock,0);
console.log('Work incidents, effects, shop items, cooldowns, save and ETA checks passed.');
