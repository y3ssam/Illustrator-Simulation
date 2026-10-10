(function (root) {
  'use strict';
  const VERSION = 3;
  const MAX_LEVEL = 100;
  const STARTING_MONEY = 100000;
  const PROMOTION_COST = 100000;
  const OFFLINE_BASE_RATE = 10;
  const UPGRADE_RATE_STEPS = [3,5,7,10,15];
  const UPGRADE_COSTS = [250000,750000,1500000,5500000,20000000];
  const TYPES = ['낙서', '단색', '풀채색'], SCOPES = ['두상', '흉상', '반신', '전신'];
  const UNLOCKS = TYPES.flatMap((type,t)=>SCOPES.map((scope,c)=>({type,scope,level:[[0,0,2,5],[3,7,12,18],[9,14,21,25]][t][c]})));
  // Work times are base game minutes (one game minute = one real second before speed bonuses).
  // Payout ranges are base money before skill bonuses, rolled once per new job.
  const JOB_BALANCE = [
    [{work:[20,25],gold:[5000,10000]},{work:[35,40],gold:[12500,18000]},{work:[45,55],gold:[23000,28500]},{work:[60,70],gold:[35000,42000]}],
    [{work:[35,45],gold:[20000,25000]},{work:[47,55],gold:[27000,30000]},{work:[60,70],gold:[38000,45000]},{work:[90,110],gold:[50000,60000]}],
    [{work:[60,90],gold:[50000,60000]},{work:[80,120],gold:[60000,75000]},{work:[150,240],gold:[90000,130000]},{work:[210,300],gold:[120000,180000]}]
  ];
  const PRACTICE = {duration:30,exp:2};
  const WEEKLY_FOOD_COST = 175000;
  const TIPS = { common: 1000, uncommon: 3000, rare: 8000, legendary: 20000 };
  const EVENTS = [
    { id:'praise', name:'극찬 후기', desc:'신규 의뢰 확률 +3%p.', duration:300, arrival:3 },
    { id:'focus', name:'집중력 상승', desc:'작업 속도 +15%.', duration:300, speed:.15 },
    { id:'mentor', name:'멘토의 조언', desc:'완료 경험치 +30%.', duration:300, exp:.3 },
    { id:'wrist', name:'손목의 신호', desc:'작업 속도 −15%. 무리하지 않고 천천히 작업합니다.', duration:180, speed:-.15 },
    { id:'fan', name:'팬레터 도착', desc:'피로 8 회복. 누군가 작품을 기다리고 있어요.' },
    { id:'repair', name:'장비 점검', desc:'점검 정책에 따라 수리하거나 임시로 작업합니다.' },
    { id:'exhibition', name:'작은 전시의 초대', desc:'전시 참가로 경험치를 얻거나 이번에는 작업에 집중할 수 있어요.' }
  ];
  const copy = x => JSON.parse(JSON.stringify(x));
  const fail = text => { throw new Error(text); };
  function number(x, min, max, label, integer=false) {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max || (integer && !Number.isInteger(x))) fail(label+' 값이 올바르지 않습니다.');
    return x;
  }
  const idOK = x => typeof x==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(x);
  function validateCatalog(input) {
    if (!Array.isArray(input) || input.length>500) fail('신청자 목록 형식이 올바르지 않습니다.');
    const ids=new Set();
    return input.map(a=>{
      if (!a || !idOK(a.id) || ids.has(a.id) || typeof a.name!=='string' || !a.name.trim() || a.name.length>80) fail('신청자 ID·이름을 확인해주세요.');
      ids.add(a.id); const works=new Set();
      if (!Array.isArray(a.works) || a.works.length>500) fail('작업물 목록 형식이 올바르지 않습니다.');
      const image=url=>{ if (url===undefined || url==='') return ''; try { if (new URL(url).protocol==='https:') return url; } catch {} fail('이미지는 HTTPS 링크를 사용해주세요.'); };
      return {id:a.id,name:a.name,image:image(a.image),weight:number(a.weight??1,.001,10000,'신청자 확률'),minLevel:number(a.minLevel??1,1,100000,'해금 레벨',true),minSkill:number(a.minSkill??0,0,100000,'해금 실력'),works:a.works.map(w=>{
        if (!w || !idOK(w.id) || works.has(w.id) || typeof w.title!=='string' || !w.title.trim() || w.title.length>120 || !Object.hasOwn(TIPS,w.tier)) fail('작업물 ID·제목·등급을 확인해주세요.');
        works.add(w.id); return {id:w.id,title:w.title,tier:w.tier,image:image(w.image),weight:number(w.weight??1,.001,10000,'작업물 확률')};
      })};
    });
  }
  function fresh(seed=Date.now()) {
    return {version:VERSION,name:'어쩌구',now:420,money:STARTING_MONEY,offlineUpgrades:{tablet:0,chair:0},level:0,exp:0,points:0,skill:0,plan:0,speed:0,fatigue:0,auto:true,autoAccept:true,autoPractice:true,practicing:false,practiceDone:0,practiceDuration:PRACTICE.duration,repair:'safe',restUntil:0,active:null,jobs:[],queueOrder:[],closedTypes:[],reservations:[],inbox:[],buffs:[],choices:[],met:[],collection:[],logs:[],totals:{completed:0,failed:0,income:0,expense:0,tips:0,practiceSessions:0},lottoDay:-1,seq:0,seed:(seed>>>0)||1,arrivalClock:0,eventClock:0,lastFoodWeek:0};
  }
  function validateSave(raw) {
    if (!raw || ![2,VERSION].includes(raw.version)) fail('지원하지 않는 저장 파일입니다.');
    const s=fresh();
    if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>40)fail('작업실 이름을 확인해주세요.');
    s.name=raw.name;
    for(const k of ['now','restUntil'])s[k]=number(raw[k],0,1e10,k);
    s.money=number(raw.money,-1e12,1e12,'잔액');
    for(const key of ['tablet','chair'])s.offlineUpgrades[key]=number(raw.offlineUpgrades?.[key]??0,0,5,'오프라인 업그레이드',true);
    for(const k of ['level','points','skill','plan','speed','seq','lastFoodWeek'])s[k]=number(raw[k],0,raw.version===2?1e7:(k==='level'?100:k==='points'?100:['skill','plan','speed'].includes(k)?150:1e7),k,true);
    s.exp=number(raw.exp,0,99,'경험치',true);s.fatigue=number(raw.fatigue,0,100,'피로');s.seed=number(raw.seed,1,4294967295,'난수 상태',true);
    for(const k of ['arrivalClock','eventClock'])s[k]=number(raw[k],0,48,k);
    const oldEquipment=raw.version===2?Object.fromEntries(['computer','tablet','chair'].map(k=>[k,number(raw.eq?.[k],0,1e7,'장비',true)])):null;
    if(typeof raw.auto!=='boolean'||!['safe','frugal'].includes(raw.repair))fail('운영 정책을 확인해주세요.');s.auto=raw.auto;s.repair=raw.repair;if(raw.autoAccept!==undefined&&typeof raw.autoAccept!=='boolean')fail('자동 수락 설정을 확인해주세요.');s.autoAccept=raw.autoAccept??raw.auto;
    for(const k of ['autoPractice','practicing']){if(raw[k]!==undefined&&typeof raw[k]!=='boolean')fail('연습 설정을 확인해주세요.');s[k]=raw[k]??(k==='autoPractice'?raw.auto:s[k]);}const oldPracticeDuration=number(raw.practiceDuration??240,30,240,'연습 주기',true);
    if(![30,240].includes(oldPracticeDuration))fail('지원하지 않는 연습 주기입니다.');
    const oldPracticeDone=number(raw.practiceDone??0,0,oldPracticeDuration-1,'연습 진행도',true);
    s.practiceDone=oldPracticeDuration===PRACTICE.duration?oldPracticeDone:Math.floor(oldPracticeDone*PRACTICE.duration/oldPracticeDuration);
    s.practiceDuration=PRACTICE.duration;
    const closed=raw.closedTypes??[];if(!Array.isArray(closed)||closed.length>12||new Set(closed).size!==closed.length||closed.some(i=>!Number.isInteger(i)||i<0||i>=UNLOCKS.length))fail('타입 접수 설정을 확인해주세요.');s.closedTypes=[...closed];
    s.lottoDay=number(raw.lottoDay,-1,1e7,'복권 날짜',true);
    const jobIDs=new Set();
    const parseJobs=(rows,max)=>{
      if(!Array.isArray(rows)||rows.length>max)fail('의뢰 목록이 너무 크거나 올바르지 않습니다.');
      return rows.map(q=>{
        if(!q||!idOK(q.id)||jobIDs.has(q.id)||!TYPES.includes(q.type)||!SCOPES.includes(q.scope)||!['normal','outsourcing'].includes(q.source))fail('의뢰 정보가 올바르지 않습니다.');jobIDs.add(q.id);
        const j={id:q.id,type:q.type,scope:q.scope,source:q.source,gold:number(q.gold,0,1e12,'의뢰 보상'),exp:number(q.exp,0,100000,'의뢰 경험치',true),work:number(q.work,.001,1e7,'작업량'),done:number(q.done,0,q.work,'진행도'),deadline:number(q.deadline,0,1e10,'마감'),expires:number(q.expires,0,1e10,'제안 만료'),inboxWait:number(q.inboxWait??0,0,1439,'도착함 대기 시간',true)};
        if(q.source==='outsourcing'){if(!idOK(q.applicant))fail('신청자 ID가 올바르지 않습니다.');j.applicant=q.applicant;}return j;
      });
    };
    s.jobs=parseJobs(raw.jobs,15);s.inbox=parseJobs(raw.inbox,Infinity);s.reservations=parseJobs(raw.reservations??[],[5,10,15,20].filter(level=>s.level>=level).length);
    const order=raw.queueOrder??[];if(!Array.isArray(order)||order.length>15||new Set(order).size!==order.length||order.some(id=>!s.jobs.some(q=>q.id===id)))fail('대기 순서를 확인해주세요.');s.queueOrder=[...order];
    if(raw.active!==null&&!s.jobs.some(q=>q.id===raw.active))fail('진행 중 의뢰를 확인해주세요.');s.active=raw.active;
    if(!Array.isArray(raw.buffs)||raw.buffs.length>30)fail('효과 목록을 확인해주세요.');
    s.buffs=raw.buffs.map(b=>{const def=EVENTS.find(e=>e.id===b.id&&e.duration)|| (b.id==='promotion'?{id:'promotion',name:'작업실 홍보',arrival:5}:b.id==='repair-delay'?{id:'repair-delay',name:'장비 임시 사용',desc:'점검 대기 중 작업 속도 −15%.',speed:-.15}:null);if(!def)fail('알 수 없는 효과입니다.');return {...def,until:number(b.until,0,1e10,'효과 종료')};});
    if(!Array.isArray(raw.choices)||raw.choices.length>1||raw.choices.some(c=>c.id!=='exhibition'))fail('선택 사건을 확인해주세요.');s.choices=raw.choices.map(()=>({id:'exhibition'}));
    if(!Array.isArray(raw.met)||raw.met.length>500||raw.met.some(x=>!idOK(x)))fail('신청자 기록을 확인해주세요.');s.met=[...new Set(raw.met)];
    if(!Array.isArray(raw.collection)||raw.collection.length>100000||raw.collection.some(x=>typeof x!=='string'||!/^([a-zA-Z0-9_-]{1,80})\/([a-zA-Z0-9_-]{1,80})$/.test(x)))fail('도감 기록을 확인해주세요.');s.collection=[...new Set(raw.collection)];
    if(!Array.isArray(raw.logs)||raw.logs.length>120)fail('기록 목록을 확인해주세요.');s.logs=raw.logs.map(l=>{if(typeof l.text!=='string'||l.text.length>500)fail('기록을 확인해주세요.');return {at:number(l.at,0,1e10,'기록 시간'),text:l.text};});
    for(const k of Object.keys(s.totals))s.totals[k]=number(k==='practiceSessions'?(raw.totals?.[k]??0):raw.totals?.[k],0,1e15,'누적 기록');
    if(raw.version===2){
      s.level=Math.min(MAX_LEVEL,s.level);s.exp=s.level===MAX_LEVEL?0:s.exp;
      s.skill=s.plan=s.speed=Math.min(50,s.level);s.points=Math.max(0,s.level-50)*2;
      const refund=Object.values(oldEquipment).reduce((sum,n)=>sum+2500*n*(n+3),0);
      s.money=number(s.money+refund,-1e12,1e12,'환산 잔액');s.totals.income+=refund;
      s.logs.unshift({at:s.now,text:'새 성장 규칙 적용 · 스탯·포인트 환산 / 장비 강화비 '+refund.toLocaleString('ko-KR')+'원 환급'});s.logs=s.logs.slice(0,120);
    }
    if(s.level===MAX_LEVEL)s.exp=0;
    return s;
  }
  function migrateLegacy(raw) {
    const num=(k,d=0)=>{const n=Number(raw[k]);return Number.isFinite(n)&&raw[k]!==null&&raw[k]!==undefined?n:d;};
    if(typeof raw.charName!=='string'||!raw.charName.trim())fail('원본 저장 데이터가 아닙니다.');
    const s=fresh();s.version=2;s.name=raw.charName.slice(0,40);s.now=Math.max(0,num('gameDays')*1440+num('gameMinutes',420));s.money=num('charMoney');
    for(const [k,old] of Object.entries({level:'charLevel',exp:'charExp',points:'charPoints',skill:'charSkill',plan:'charPlan',speed:'charSpeed',fatigue:'charFatigue'}))s[k]=num(old,k==='level'?1:0);
    s.eq={computer:num('eqComputer'),tablet:num('eqTablet'),chair:num('eqChair')};s.lastFoodWeek=Math.floor(s.now/10080);
    let jobs=[];if(raw.requestList){jobs=typeof raw.requestList==='string'?JSON.parse(raw.requestList):raw.requestList;}if(!Array.isArray(jobs))fail('원본 의뢰 목록이 올바르지 않습니다.');
    s.jobs=jobs.filter(q=>['working','paused','pending'].includes(q.status)).slice(0,15).map(q=>{
      const work=Number(q.duration)*1.6;const j={id:'m'+(++s.seq),type:q.type,scope:q.scope,source:'normal',gold:Number(q.gold),exp:Number(q.exp),work,done:work*Math.min(100,Math.max(0,Number(q.progress)||0))/100,deadline:(Number(q.startDay)||0)*1440+(Number(q.startMinute)||0)+Number(q.deadline)*1440,expires:s.now};if(q.status==='working')s.active=j.id;return j;
    });
    s.logs=[{at:s.now,text:'원본 저장을 가져왔습니다. 진행도는 보존하고 이전 임시 효과는 정리했습니다.'}];return validateSave(s);
  }
  class Engine {
    constructor(state,catalog=[]) {this.s=state?validateSave(state):fresh();this.catalog=validateCatalog(catalog);}
    random(){let x=this.s.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.s.seed=(x>>>0)||1;return this.s.seed/4294967296;}
    pick(items){let r=this.random()*items.reduce((a,b)=>a+b.weight,0);for(const item of items){r-=item.weight;if(r<0)return item;}return items.at(-1);}
    log(text){this.s.logs.unshift({at:this.s.now,text});this.s.logs=this.s.logs.slice(0,120);}
    money(amount){this.s.money+=amount;if(amount>=0)this.s.totals.income+=amount;else this.s.totals.expense-=amount;}
    offlineRate(kind){
      const level=this.s.offlineUpgrades[kind]??0;
      return OFFLINE_BASE_RATE+UPGRADE_RATE_STEPS.slice(0,level).reduce((sum,increment)=>sum+increment,0);
    }
    canUpgradeOffline(kind){
      if(!['tablet','chair'].includes(kind))return '업그레이드 종류를 확인해주세요.';
      const level=this.s.offlineUpgrades[kind]??0;
      if(level>=UPGRADE_COSTS.length)return '최대 단계입니다.';
      if(this.s.money<UPGRADE_COSTS[level])return '잔액이 부족합니다.';
      return '';
    }
    upgradeOffline(kind){
      if(this.canUpgradeOffline(kind))return false;
      const level=this.s.offlineUpgrades[kind];
      const cost=UPGRADE_COSTS[level];
      this.money(-cost);
      this.s.offlineUpgrades[kind]=level+1;
      this.log((kind==='tablet'?'액정 타블렛':'의자')+' '+(level+1)+'단계 업그레이드 · '+cost.toLocaleString('ko-KR')+'원 지출 / 오프라인 '+(kind==='tablet'?'수익':'EXP')+' '+this.offlineRate(kind)+'%');
      return true;
    }
    // A shop purchase consumes the item immediately; there is no inventory yet.
    canPurchaseShopItem(item){
      if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(item.id)
         ||typeof item.name!=='string'||!item.name.trim()||item.name.length>80
         ||!Number.isSafeInteger(item.price)||item.price<0||item.price>1e9)return '아이템 정보를 확인해주세요.';
      const effect=item.effect;
      if(!effect||effect.type!=='fatigue_change'||!Number.isInteger(effect.amount)
         ||effect.amount>=0||effect.amount< -100)return '아직 사용할 수 없는 아이템입니다.';
      if(this.s.money<item.price)return '잔액이 부족합니다.';
      if(this.s.fatigue<=0)return '피로도가 이미 0입니다.';
      return '';
    }
    purchaseShopItem(item){
      if(this.canPurchaseShopItem(item))return false;
      const before=this.s.fatigue;
      this.money(-item.price);
      this.s.fatigue=Math.max(0,before+item.effect.amount);
      const recovered=Number((before-this.s.fatigue).toFixed(2));
      this.log(item.name+' 구매·사용 · '+item.price.toLocaleString('ko-KR')+'원 지출 / 피로도 '+recovered+' 감소');
      return true;
    }
    stats(){return {skill:this.s.skill,plan:this.s.plan,speed:this.s.speed};}
    slots(){const p=this.stats().plan;return 3+[10,25,50].filter(n=>p>=n).length;}
    reservationSlots(){return [5,10,15,20].filter(level=>this.s.level>=level).length;}
    rate(conservative=false){const base=(1+this.stats().speed*.01);const bonus=conservative?Math.min(0,this.s.buffs.reduce((n,b)=>n+(b.speed||0),0)):this.s.buffs.reduce((n,b)=>n+(b.speed||0),0);return Math.max(.25,base*(1+bonus));}
    fatigueRate(){return (1-this.stats().plan*.005)/15;}
    unlocked(){return UNLOCKS.filter(u=>u.level<=this.s.level);}
    openTypes(){return this.unlocked().filter(u=>!this.s.closedTypes.includes(UNLOCKS.indexOf(u)));}
    toggleType(index){const u=UNLOCKS[index];if(!Number.isInteger(index)||!u||u.level>this.s.level)return false;const closed=this.s.closedTypes.includes(index);this.s.closedTypes=closed?this.s.closedTypes.filter(i=>i!==index):[...this.s.closedTypes,index];this.log(u.type+' '+u.scope+' 의뢰 접수 '+(closed?'열림':'닫음'));return true;}
    arrivalChance(){if(!this.openTypes().length)return 0;return Math.min(20,2+this.stats().skill*.05+this.s.buffs.reduce((n,b)=>n+(b.arrival||0),0));}
    createJob(source='normal',applicant){
      const options=this.openTypes();if(!options.length)return null;
      const u=options[Math.floor(this.random()*options.length)],t=TYPES.indexOf(u.type),c=SCOPES.indexOf(u.scope),size=[1,1.5,2,3][c],exp=10+t*10+(size-1)*10;
      const balance=JOB_BALANCE[t][c];
      const roll=([min,max])=>min+Math.floor(this.random()*(max-min+1));
      const j={id:'q'+(++this.s.seq),type:u.type,scope:u.scope,source,exp,
        gold:Math.floor(roll(balance.gold)*(1+this.stats().skill*.005)),
        work:roll(balance.work),done:0,
        deadline:this.s.now+(2+Math.floor(this.random()*4))*1440,expires:this.s.now+720,inboxWait:0};
      if(applicant){j.applicant=applicant.id;j.gold=Math.floor(j.gold*1.7);j.exp=Math.floor(j.exp*1.25);}return j;
    }
    startFresh(name){if(typeof name!=='string'||!name.trim())return false;this.s=fresh();this.s.name=name.trim().slice(0,40);this.log('작업실을 열었습니다. 낙서 두상·흉상으로 시작하고, 의뢰가 없으면 자동으로 연습합니다.');return true;}
    startPractice(){if(this.s.active||this.s.restUntil>this.s.now)return false;this.s.practicing=true;this.log('그림 연습 시작 · '+PRACTICE.duration+'게임분 / '+PRACTICE.exp+' EXP / 중단 시 진행도 보존');return true;}
    togglePractice(){this.s.autoPractice=!this.s.autoPractice;this.s.practicing=false;this.log('자동 연습 '+(this.s.autoPractice?'켜짐':'꺼짐')+' · 의뢰 작업이 우선입니다.');}
    orderedJobs(extra){const rows=[...this.s.jobs];if(extra)rows.push(extra);const order=new Map(this.s.queueOrder.map((id,i)=>[id,i]));return rows.sort((a,b)=>(order.get(a.id)??1e9)-(order.get(b.id)??1e9)||a.deadline-b.deadline);}
    reorder(id,before){if(id===this.s.active)return false;const waiting=this.orderedJobs().filter(q=>q.id!==this.s.active);const q=waiting.find(q=>q.id===id);if(!q||(before&&!waiting.some(q=>q.id===before)))return false;if(id===before)return true;const rest=waiting.filter(row=>row!==q);const index=before?rest.findIndex(row=>row.id===before):rest.length;rest.splice(index,0,q);this.s.queueOrder=rest.map(row=>row.id);this.log('대기 순서를 바꿨습니다. 현재 작업은 유지합니다.');return true;}
    projection(extra){const active=this.s.jobs.find(q=>q.id===this.s.active);const rest=this.orderedJobs(extra).filter(q=>q!==active);const jobs=active?[active,...rest]:rest;let now=Math.max(this.s.now,this.s.restUntil),fat=this.s.fatigue;if(this.s.restUntil>this.s.now)fat=Math.max(0,fat-50);const results=new Map(),rate=this.rate(true),fr=this.fatigueRate();
      for(const q of jobs){let need=Math.max(0,q.work-q.done)/rate;while(need>0){if(fat>=90-1e-8){now+=480;fat=Math.max(0,fat-50);}const available=(90-fat)/fr;const work=Math.min(need,available);now+=work;fat+=work*fr;need-=work;}results.set(q.id,Math.ceil(now));}return results;
    }
    canAccept(q){if(this.s.jobs.length>=this.slots())return '작업 슬롯이 가득 찼어요.';const p=this.projection(q);if([...this.s.jobs,q].some(j=>p.get(j.id)>j.deadline))return '예상 휴식까지 포함하면 마감이 부족해요.';return '';}
    accept(id){const q=[...this.s.inbox,...this.s.reservations].find(j=>j.id===id);if(!q)return false;const reason=this.canAccept(q);if(reason)return false;this.s.inbox=this.s.inbox.filter(j=>j!==q);this.s.reservations=this.s.reservations.filter(j=>j!==q);this.s.jobs.push(q);this.log(q.type+' '+q.scope+' 의뢰 수락');return true;}
    canReserve(q){if(!q||q.id===this.s.active)return '진행 중인 작업은 먼저 중단해주세요.';if(this.reservationSlots()===0)return '예약함은 5레벨에 열려요.';if(this.s.reservations.length>=this.reservationSlots())return '예약함이 가득 찼어요.';return '';}
    reserve(id){const q=[...this.s.inbox,...this.s.jobs].find(j=>j.id===id);if(!q||this.canReserve(q))return false;this.s.inbox=this.s.inbox.filter(j=>j!==q);this.s.jobs=this.s.jobs.filter(j=>j!==q);this.s.queueOrder=this.s.queueOrder.filter(j=>j!==id);q.inboxWait=0;this.s.reservations.push(q);this.log(q.type+' '+q.scope+' 예약함으로 이동 · 남은 기한 보존');return true;}
    admit(){if(this.s.autoAccept)for(const q of [...this.s.inbox].sort((a,b)=>a.deadline-b.deadline))this.accept(q.id);this.chooseNext();}
    chooseNext(){if(this.s.active||!this.s.auto||this.s.restUntil>this.s.now)return;this.s.active=this.orderedJobs()[0]?.id||null;}
    select(id){if(this.s.restUntil>this.s.now||!this.s.jobs.some(q=>q.id===id))return false;this.s.active=id;this.log('작업 전환 · 기존 진행도를 보존했습니다.');return true;}
    toggleAuto(){this.s.auto=!this.s.auto;this.log('자동 의뢰 작업 '+(this.s.auto?'켜짐':'꺼짐')+' · 현재 작업은 유지합니다.');this.chooseNext();}
    toggleAccept(){this.s.autoAccept=!this.s.autoAccept;this.log('자동 의뢰 수락 '+(this.s.autoAccept?'켜짐':'꺼짐'));if(this.s.autoAccept)this.admit();}
    rest(){if(this.s.restUntil>this.s.now)return false;this.s.restUntil=this.s.now+480;this.log('8게임시간 수면 시작 · 진행도 보존');return true;}
    pause(){this.s.auto=false;this.s.autoAccept=false;this.s.active=null;this.s.autoPractice=false;this.s.practicing=false;this.log('작업을 멈췄습니다. 모든 진행도는 보존됩니다.');}
    gainExp(n){
      if(this.s.level>=MAX_LEVEL){this.s.exp=0;return;}
      this.s.exp+=n;
      while(this.s.exp>=100&&this.s.level<MAX_LEVEL){
        this.s.exp-=100;this.s.level++;
        if(this.s.level<=50){this.s.skill++;this.s.plan++;this.s.speed++;this.log('레벨 '+this.s.level+' 달성 · 모든 스탯 +1');}
        else{this.s.points+=2;this.log('레벨 '+this.s.level+' 달성 · 성장 포인트 +2');}
        for(const u of UNLOCKS.filter(u=>u.level===this.s.level))this.log('새 타입 해금 · '+u.type+' '+u.scope);
        if([10,25,50].includes(this.s.level))this.log('대기함 슬롯 해금 · 총 '+this.slots()+'칸');
        if([5,10,15,20].includes(this.s.level))this.log('예약함 슬롯 해금 · 총 '+this.reservationSlots()+'칸');
      }
      if(this.s.level===MAX_LEVEL){this.s.exp=0;this.log('최고 레벨 100 달성');}
    }
    addStat(key){if(!['skill','plan','speed'].includes(key)||this.s.level<=50||this.s.points<1||this.s[key]>=150)return false;this.s[key]++;this.s.points--;return true;}
    promotion(){if(this.s.buffs.some(b=>b.id==='promotion')||this.s.money<PROMOTION_COST)return false;this.money(-PROMOTION_COST);this.s.buffs.push({id:'promotion',name:'작업실 홍보',arrival:5,until:this.s.now+960});this.log('홍보 시작 · '+PROMOTION_COST.toLocaleString('ko-KR')+'원 / 16게임시간 / 신규 의뢰 확률 +5%p');return true;}
    lotto(){const day=Math.floor(this.s.now/1440);if(this.s.lottoDay===day||this.s.money<1000)return null;this.s.lottoDay=day;this.money(-1000);const r=this.random(),prize=r<.5?0:r<.85?1000:r<.98?3000:10000;this.money(prize);this.log('복권 결과 '+prize+'원 · 하루 1장');return prize;}
    triggerEvent(id){const e=EVENTS.find(x=>x.id===id);if(!e)return false;if(e.duration){this.s.buffs=this.s.buffs.filter(b=>b.id!==id);this.s.buffs.push({...e,until:this.s.now+e.duration});this.log(e.name+' · '+e.desc);}else if(id==='fan'){this.s.fatigue=Math.max(0,this.s.fatigue-8);this.log(e.name+' · 피로 8 회복');}else if(id==='repair'){if(this.s.repair==='safe'&&this.s.money>=3000){this.money(-3000);this.log('장비 점검 완료 · 3,000원 지출');}else{this.s.buffs=this.s.buffs.filter(b=>b.id!=='repair-delay');this.s.buffs.push({id:'repair-delay',name:'장비 임시 사용',desc:'점검 대기 중 작업 속도 −15%.',speed:-.15,until:this.s.now+180});this.log('장비 임시 사용 · 3게임시간 속도 −15%');}}else if(!this.s.choices.length){this.s.choices.push({id:'exhibition'});this.log('전시 초대가 도착했습니다. 작업은 계속되고 선택은 기다립니다.');}return true;}
    resolveChoice(join){if(!this.s.choices.length||(join&&this.s.money<5000))return false;if(join){this.money(-5000);this.gainExp(40);this.log('작은 전시 참가 · 5,000원 지출 / 40 EXP');}else this.log('이번 전시는 쉬어갑니다.');this.s.choices=[];return true;}
    grantCollection(applicantID){const a=this.catalog.find(x=>x.id===applicantID);if(!a||!a.works.length){this.log('외주 완료 · 작업물 데이터가 없어 수집 처리를 보류했습니다.');return;}const w=this.pick(a.works),key=a.id+'/'+w.id;if(!this.s.met.includes(a.id))this.s.met.push(a.id);if(this.s.collection.includes(key)){const tip=TIPS[w.tier];this.money(tip);this.s.totals.tips+=tip;this.log('중복 작업물 «'+w.title+'» · '+tip+'원 팁');}else{this.s.collection.push(key);this.log('새 작업물 «'+w.title+'» 도감 등록');}}
    complete(q,offline=false){
      this.s.jobs=this.s.jobs.filter(j=>j!==q);
      this.s.queueOrder=this.s.queueOrder.filter(id=>id!==q.id);
      if(this.s.active===q.id)this.s.active=null;
      const gold=offline?Math.floor(q.gold*this.offlineRate('tablet')/100):q.gold;
      const mult=1+this.s.buffs.reduce((n,b)=>n+(b.exp||0),0);
      const fullExp=Math.floor(q.exp*mult);
      const exp=offline?Math.floor(fullExp*this.offlineRate('chair')/100):fullExp;
      this.money(gold);this.s.totals.completed++;this.gainExp(exp);
      this.log(q.type+' '+q.scope+' 납품'+(offline?' (오프라인)':'')+' · '+gold+'원 / '+exp+' EXP');
      if(q.source==='outsourcing')this.grantCollection(q.applicant);
    }
    arrivals(){if(!this.openTypes().length)return;const chance=this.arrivalChance();if(this.random()*100<chance)this.s.inbox.push(this.createJob());const available=this.catalog.filter(a=>a.works.length&&a.minLevel<=this.s.level&&a.minSkill<=this.stats().skill);if(available.length&&this.random()*100<Math.min(5,.5+(this.s.level-1)*.03+this.stats().skill*.005)){const a=this.pick(available);this.s.inbox.push(this.createJob('outsourcing',a));if(!this.s.met.includes(a.id))this.s.met.push(a.id);this.log(a.name+'의 외주 제안 도착');}}
    checkInbox(){for(const offer of [...this.s.inbox]){offer.inboxWait=(offer.inboxWait??0)+1;if(offer.inboxWait<1440)continue;offer.inboxWait=0;if(this.random()<.25){this.s.inbox=this.s.inbox.filter(j=>j!==offer);this.log(offer.type+' '+offer.scope+' 의뢰 취소 · 도착함에서 24시간 대기 후 신청자가 취소했습니다.');}}}
    advance(minutes,offline=false){number(minutes,0,1e6,'진행 시간',true);if(typeof offline!=='boolean')fail('오프라인 상태를 확인해주세요.');for(let i=0;i<minutes;i++){
      const sleeping=this.s.restUntil>this.s.now;this.chooseNext();const q=this.s.jobs.find(j=>j.id===this.s.active);this.s.now++;
      // Keep each inbox offer's remaining time fixed until it is accepted.
      for(const offer of [...this.s.inbox,...this.s.reservations]){offer.deadline++;offer.expires++;}
      this.checkInbox();
      this.s.buffs=this.s.buffs.filter(b=>b.until>this.s.now);
      if(sleeping){if(this.s.restUntil<=this.s.now){this.s.fatigue=Math.max(0,this.s.fatigue-50);this.log('수면 완료 · 피로 50 회복');}}
      else if(q){q.done=Math.min(q.work,q.done+this.rate());this.s.fatigue=Math.min(100,this.s.fatigue+this.fatigueRate());if(q.done>=q.work&&this.s.now<=q.deadline)this.complete(q,offline);if(this.s.fatigue>=90)this.rest();}
      else if(this.s.autoPractice||this.s.practicing){this.s.practiceDone++;this.s.fatigue=Math.min(100,this.s.fatigue+this.fatigueRate()*.5);if(this.s.practiceDone>=PRACTICE.duration){this.s.practiceDone=0;this.s.practicing=false;this.s.totals.practiceSessions++;const practiceExp=offline?Math.floor(PRACTICE.exp*this.offlineRate('chair')/100):PRACTICE.exp;this.gainExp(practiceExp);this.log('그림 연습 완료'+(offline?' (오프라인)':'')+' · '+practiceExp+' EXP');}if(this.s.fatigue>=90)this.rest();}
      for(const j of [...this.s.jobs])if(j.deadline<=this.s.now){this.s.jobs=this.s.jobs.filter(k=>k!==j);this.s.queueOrder=this.s.queueOrder.filter(id=>id!==j.id);if(this.s.active===j.id)this.s.active=null;this.s.totals.failed++;this.log(j.type+' '+j.scope+' 마감 초과 · 의뢰 종료');}
      const week=Math.floor(this.s.now/10080);if(week>this.s.lastFoodWeek){const cost=(week-this.s.lastFoodWeek)*WEEKLY_FOOD_COST;this.money(-cost);this.s.lastFoodWeek=week;this.log('주간 식비 '+cost+'원 지출');}
      if(++this.s.arrivalClock>=10){this.s.arrivalClock=0;this.arrivals();}
      if(++this.s.eventClock>=48){this.s.eventClock=0;if(this.random()<.12)this.triggerEvent(EVENTS[Math.floor(this.random()*EVENTS.length)].id);}
      this.admit();
    }}
    import(raw){const next=[2,VERSION].includes(raw?.version)?validateSave(raw):migrateLegacy(raw);this.s=next;this.log('저장 데이터 불러오기 완료');return true;}
    export(){return copy(this.s);}
  }
  const api={MAX_LEVEL,VERSION,Engine,fresh,validateSave,validateCatalog,migrateLegacy,TIPS,EVENTS,UNLOCKS,PRACTICE,JOB_BALANCE,STARTING_MONEY,PROMOTION_COST,OFFLINE_BASE_RATE,UPGRADE_RATE_STEPS,UPGRADE_COSTS,WEEKLY_FOOD_COST};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioCore=api;
})(globalThis);