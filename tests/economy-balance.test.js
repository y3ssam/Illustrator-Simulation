// node tests/economy-balance.test.js
'use strict';
const assert = require('node:assert/strict');
const {Engine, VERSION, UNLOCKS, JOB_BALANCE} = require('../engine.js');

const expected = [
  [[20,25,5000,10000],[35,40,12500,18000],[45,55,23000,28500],[60,70,35000,42000]],
  [[35,45,20000,25000],[47,55,27000,30000],[60,70,38000,45000],[90,110,50000,60000]],
  [[60,90,50000,60000],[80,120,60000,75000],[150,240,90000,130000],[210,300,120000,180000]],
];

assert.equal(VERSION,3,'save version remains v3');
assert.equal(UNLOCKS.length,12);
assert.equal(JOB_BALANCE.length,3);
const name = (t,c) => ['낙서','단색','풀채색'][t]+' '+['두상','흉상','반신','전신'][c];

for(let t=0;t<3;t++){
  for(let c=0;c<4;c++){
    const index=t*4+c;
    const [minWork,maxWork,minGold,maxGold]=expected[t][c];
    const balance=JOB_BALANCE[t][c];
    assert.deepEqual(balance,{work:[minWork,maxWork],gold:[minGold,maxGold]},name(t,c)+' configuration');
    for(const draw of [0,0.999999999,0.2,0.5,0.8]){
      const engine=new Engine(null,[]);
      engine.s.level=50; // all jobs unlocked
      engine.s.skill=0; // unmodified base money ranges
      engine.s.speed=0; // one unit of work per game minute
      engine.s.closedTypes=UNLOCKS.map((_,i)=>i).filter(i=>i!==index);
      engine.random=()=>draw;
      const job=engine.createJob();
      assert.equal(job.type,UNLOCKS[index].type);
      assert.equal(job.scope,UNLOCKS[index].scope);
      assert.ok(Number.isInteger(job.work)&&job.work>=minWork&&job.work<=maxWork,name(t,c)+' work '+job.work);
      assert.ok(Number.isInteger(job.gold)&&job.gold>=minGold&&job.gold<=maxGold,name(t,c)+' gold '+job.gold);
      if(draw===0){assert.equal(job.work,minWork);assert.equal(job.gold,minGold);}
      if(draw===0.999999999){assert.equal(job.work,maxWork);assert.equal(job.gold,maxGold);}
      assert.equal(job.done,0);
    }
  }
}

// Normal skill bonus and external applicant bonus still apply.
const boosted=new Engine(null,[]);
boosted.s.level=50;boosted.s.skill=50;
boosted.s.closedTypes=UNLOCKS.map((_,i)=>i).filter(i=>i!==0);
boosted.random=()=>0;
const boostedJob=boosted.createJob('normal');
assert.equal(boostedJob.gold,Math.floor(5000*1.25));
assert.equal(boostedJob.work,20);
const applicantJob=boosted.createJob('outsourcing',{id:'person-1'});
assert.equal(applicantJob.gold,Math.floor(Math.floor(5000*1.25)*1.7));
assert.equal(applicantJob.work,20);
assert.equal(applicantJob.exp,Math.floor(boostedJob.exp*1.25));

// Seven game days cost 350,000 KRW, without changing the old save schema.
const spending=new Engine(null,[]);
spending.s.money=1000000;spending.s.auto=false;spending.s.autoAccept=false;spending.s.autoPractice=false;
spending.s.now=10079;spending.s.lastFoodWeek=0;
spending.advance(1);
assert.equal(spending.s.money,650000);
assert.equal(spending.s.totals.expense,350000);
assert.equal(spending.s.lastFoodWeek,1);
spending.advance(1);
assert.equal(spending.s.money,650000,'no daily deductions');
spending.s.now=20159;
spending.advance(1);
assert.equal(spending.s.money,300000);
assert.equal(spending.s.totals.expense,700000);
const loaded=new Engine(spending.export(),[]);
assert.equal(loaded.s.money,300000);
assert.equal(loaded.s.lastFoodWeek,2);

// Old already-accepted jobs keep their rolled work and reward in saved state.
const existing=new Engine(null,[]);
existing.s.jobs.push({id:'q-old',type:'낙서',scope:'두상',source:'normal',exp:10,gold:18000,work:384,done:50,deadline:existing.s.now+1000,expires:existing.s.now});
const restored=new Engine(existing.export(),[]);
assert.equal(restored.s.jobs[0].gold,18000);
assert.equal(restored.s.jobs[0].work,384);
assert.equal(restored.s.jobs[0].done,50);
console.log('Economy balance checks passed for all 12 jobs, bonuses, expenses, and saved jobs.');
