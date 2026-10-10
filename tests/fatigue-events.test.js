// Run: node tests/fatigue-events.test.js
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Engine,fresh,VERSION}=require('../engine.js');

const job=(id,now,work=3)=>({id,type:'낙서',scope:'두상',source:'normal',gold:10000,exp:20,work,done:0,deadline:now+1000,expires:now+500,inboxWait:0});
const active=(fatigue=0,speed=0)=>{
  const e=new Engine(null,[]);
  e.s.fatigue=fatigue;e.s.speed=speed;e.s.auto=false;e.s.autoAccept=false;e.s.autoPractice=false;
  const q=job('q-test',e.s.now);
  e.s.jobs=[q];e.s.active=q.id;e.s.queueOrder=[q.id];
  return {e,q};
};

assert.equal(VERSION,3);
for(const key of ['buffs','choices','eventClock','repair'])assert.equal(Object.hasOwn(fresh(),key),false,key+' omitted from new saves');
for(const [fatigue,expected] of [[89.9,1],[90,.5],[95,.5],[100,.5]]){
  const {e}=active(fatigue);
  assert.equal(e.overworked(),fatigue>=90);
  assert.equal(e.rate(),expected);
  e.s.speed=50;
  assert.equal(e.rate(),expected*1.5,'speed stat is applied before fatigue multiplier');
}
const {e:threshold,q:thresholdJob}=active(89.9);
assert.equal(threshold.projection().get(thresholdJob.id),threshold.s.now+4,'ETA uses the threshold minute at full speed');
threshold.advance(1);
assert.equal(thresholdJob.done,1);
assert.ok(threshold.s.fatigue<90);
threshold.advance(1);
assert.equal(thresholdJob.done,2);
assert.ok(threshold.s.fatigue>=90);
assert.equal(threshold.s.restUntil,0,'90 does not trigger sleep');
threshold.advance(2);
assert.equal(threshold.s.totals.completed,1);
assert.equal(threshold.s.now,424,'actual completion matches ETA');

const {e:atMax,q:maxJob}=active(100,50);
atMax.advance(2);
assert.equal(maxJob.done,1.5);
assert.equal(atMax.s.fatigue,100);
assert.equal(atMax.s.restUntil,0);
atMax.s.fatigue=89.9;
assert.equal(atMax.rate(),1.5,'recovery immediately restores normal speed');
atMax.s.fatigue=90;
assert.equal(atMax.rate(),.75,'crossing 90 again reapplies penalty');

for(const offline of [false,true]){
  const {e,q}=active(95);
  e.advance(2,offline);
  assert.equal(q.done,1,'online/offline work at identical half speed');
  assert.ok(Math.abs(e.s.fatigue-(95+2/15))<1e-10);
  assert.equal(e.s.restUntil,0);
}
const {e:multi,q:first}=active(89.9);
const second=job('q-second',multi.s.now,2);
multi.s.jobs.push(second);multi.s.queueOrder.push(second.id);multi.s.auto=true;
const eta=multi.projection();
assert.equal(eta.get(first.id),multi.s.now+4);
assert.equal(eta.get(second.id),multi.s.now+8);
multi.advance(8);
assert.equal(multi.s.totals.completed,2);
assert.equal(multi.s.now,eta.get(second.id));
for(let n=0;n<1000;n++){
  const {e,q}=active((n*17.23)%101,n%151);
  e.s.plan=(n*7)%151;
  q.work=1+(n*13.71)%350;
  const predicted=e.projection().get(q.id);
  while(e.s.totals.completed===0&&e.s.now<predicted+2)e.advance(1);
  assert.equal(e.s.now,predicted,'projection matches minute simulation in case '+n);
}

const {e:manual}=active(95);
assert.equal(manual.rest(),true);
const restedEta=manual.projection().get('q-test');
manual.advance(480);
assert.equal(manual.s.fatigue,45);
assert.equal(manual.s.restUntil,manual.s.now);
assert.equal(manual.rate(),1);
manual.advance(3);
assert.equal(manual.s.now,restedEta,'ETA includes the ongoing manual sleep');
const sleeping=active(95).e;
sleeping.rest();
const sleepingSave={...sleeping.export(),buffs:[{id:'wrist',until:sleeping.s.now+180}],choices:[{id:'exhibition'}]};
const sleepingLoaded=new Engine(sleepingSave,[]);
assert.equal(sleepingLoaded.s.restUntil,sleeping.s.restUntil,'an existing manual sleep survives migration');
assert.equal(sleepingLoaded.s.jobs[0].done,sleeping.s.jobs[0].done);
const practice=new Engine(null,[]);
practice.s.fatigue=95;practice.s.auto=false;practice.s.autoAccept=false;practice.s.autoPractice=false;
assert.equal(practice.startPractice(),true);
practice.advance(30);
assert.equal(practice.s.exp,2);
assert.equal(practice.s.totals.practiceSessions,1);
assert.equal(practice.s.restUntil,0);

const {e:legacy}=active(95);
const saved=legacy.export();
saved.buffs=[{id:'focus',speed:100,until:saved.now+10000},{id:'mentor',exp:100,until:saved.now+10000},{id:'promotion',arrival:100,until:saved.now+10000}];
saved.choices=[{id:'exhibition'}];saved.eventClock=47;saved.repair='frugal';
saved.logs=[{at:saved.now,text:'기존 이벤트 기록'}];
const loaded=new Engine(saved,[]);
for(const key of ['buffs','choices','eventClock','repair'])assert.equal(Object.hasOwn(loaded.s,key),false,key+' discarded on import');
assert.equal(loaded.rate(),.5);
assert.equal(loaded.arrivalChance(),2);
assert.equal(loaded.s.logs[0].text,'기존 이벤트 기록');
loaded.advance(6);
assert.equal(loaded.s.totals.completed,1);
assert.equal(loaded.s.exp,20,'legacy EXP buff does not pay out');
assert.equal(loaded.s.money,110000,'legacy events do not charge or award money');
const oldWithoutFields=active().e.export();
assert.doesNotThrow(()=>new Engine(oldWithoutFields,[]));

const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','reference.css'),'utf8');
assert.doesNotMatch(app,/data-note="events"|case 'promotion'|case 'choice'/);
assert.doesNotMatch(html,/id="repair"/);
assert.match(app,/\['stats','정보'\],\['ops','운영'\]/);
assert.match(app,/mobile-fatigue/);
assert.match(app,/viewScroll=\$\('view'\)\.scrollTop/);
assert.match(css,/\.note-tabs button,\.mobile-queue-tabs button\{min-height:44px\}/);
console.log('Event removal, fatigue threshold, ETA and legacy-save checks passed.');
