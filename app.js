(() => {
 'use strict';
 const GAME_MINUTE_MS=1000;
 const KEY='studio.workbench.v2',LEASE=KEY+'.lease';
 const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const won=n=>Math.floor(n).toLocaleString('ko-KR')+'원';
 const duration=n=>{n=Math.max(0,Math.ceil(n));return n>=60?Math.floor(n/60)+'시간 '+n%60+'분':n+'분';};
 const real=n=>{const sec=Math.ceil(Math.max(0,n)*GAME_MINUTE_MS/1000);return sec>=60?Math.floor(sec/60)+'분 '+sec%60+'초':sec+'초';};
 const stamp=n=>'D'+(Math.floor(n/1440)+1)+' '+String(Math.floor(n%1440/60)).padStart(2,'0')+':'+String(Math.floor(n%60)).padStart(2,'0');
 let onboarding=false,holdingControl=false,pendingRender=false,notesOpen=innerWidth>=1050,noteTab='stats',queueTab='waiting',dragJob=null;
 let engine,tab='studio',storageOK=true,pausedOther=false,last=Date.now(),accumulator=0,lastSave=0,away=null,toastTimer;
  let shopItems=[],shopState='loading',shopPage=1,inventoryPage=1,journalTab='income';
  const journalPages={income:1,expense:1,event:1},JOURNAL_PAGE_SIZE=18;
 const failedThumbnails=new Set();
 let offlineMode=document.hidden,savedAt=null,segments=[],catchUpScheduled=false;
 let token=crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();
 try{const existing=sessionStorage.getItem(LEASE+'.tab');if(existing)token=existing;else sessionStorage.setItem(LEASE+'.tab',token);}catch{}
 function note(message){const toast=$('toast');toast.textContent=message;toast.hidden=false;if(typeof toast.showPopover==='function'&&!toast.matches(':popover-open'))toast.showPopover();clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(typeof toast.hidePopover==='function'&&toast.matches(':popover-open'))toast.hidePopover();toast.hidden=true;},5000);}
 function storageNotice(message){$('storage-note').innerHTML=`<div class="notice-title"><strong>저장 안내</strong><button class="notice-dismiss" aria-label="저장 안내 닫기">×</button></div><p>${esc(message)}</p>`;$('storage-note').hidden=false;}

 function claim(force=false){if(!storageOK)return true;try{const old=JSON.parse(localStorage.getItem(LEASE)||'null');if(!force&&old&&old.token!==token&&old.until>Date.now())return false;localStorage.setItem(LEASE,JSON.stringify({token,until:Date.now()+20000}));return true;}catch{storageOK=false;storageNotice('브라우저 자동 저장을 사용할 수 없어요. 설정에서 파일로 내보내주세요.');return true;}}
 function owns(){if(!storageOK)return true;try{const old=JSON.parse(localStorage.getItem(LEASE)||'null');if(old&&old.token!==token&&old.until>Date.now())return false;return claim();}catch{return claim();}}
 try{const saved=localStorage.getItem(KEY);if(saved){try{const raw=JSON.parse(saved);if(Number.isSafeInteger(raw.savedAt)&&raw.savedAt>0)savedAt=raw.savedAt;if(raw.version===2){localStorage.setItem(KEY+'.before-progression-v3',saved);}engine=new StudioCore.Engine(raw,STUDIO_CATALOG);}catch(error){try{localStorage.setItem(KEY+'.recovery',saved);}catch{}engine=new StudioCore.Engine(null,STUDIO_CATALOG);onboarding=true;storageNotice('저장 파일을 읽지 못해 복구 사본을 보관했어요. '+error.message);}}else{engine=new StudioCore.Engine(null,STUDIO_CATALOG);onboarding=true;}}catch{storageOK=false;engine=new StudioCore.Engine(null,STUDIO_CATALOG);onboarding=true;storageNotice('자동 저장을 사용할 수 없어요. 설정에서 파일로 내보내주세요.');}
 function suspend(){pausedOther=true;$('storage-note').innerHTML='<div class="notice-title"><strong>다른 창에서 운영 중</strong><button class="notice-dismiss" aria-label="다른 창 안내 닫기">×</button></div><p>이 창은 보기만 합니다.</p><button id="takeover">이 창에서 이어하기</button>';$('storage-note').hidden=false;$('welcome-takeover').hidden=false;}
 if(!claim())suspend();
 if(savedAt!==null&&!onboarding&&!pausedOther){
   const elapsed=Math.max(0,Date.now()-savedAt);
   if(elapsed>=GAME_MINUTE_MS){
     segments.push({ms:elapsed,offline:true});
     away={money:engine.s.money,...engine.s.totals};
   }
 }
 function pendingMs(){return segments.reduce((sum,entry)=>sum+entry.ms,0);}
 function enqueueElapsed(ms,offline){
   if(ms<=0)return;
   const tail=segments[segments.length-1];
   if(tail&&tail.offline===offline)tail.ms+=ms;
   else segments.push({ms,offline});
 }
 function offlineUnprocessed(){return segments.some(entry=>entry.offline&&entry.ms>=GAME_MINUTE_MS);}

 function save(){if(pausedOther||onboarding)return;try{if(storageOK){const snapshot=engine.export();snapshot.savedAt=Math.max(0,Math.floor(Date.now()-pendingMs()));localStorage.setItem(KEY,JSON.stringify(snapshot));$('save-status').textContent='자동 저장됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});}else $('save-status').textContent='파일 저장 필요';}catch{storageOK=false;storageNotice('자동 저장 공간이 부족해요. 설정에서 파일로 내보내주세요.');}lastSave=Date.now();}
 const button=(action,label,disabled=false,extra='')=>`<button data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;
 const icons={home:'<path d="m2 10 10-8 10 8 M5 8v14h14V8 M10 22v-8h4v8"/>',book:'<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M7 2v20 M10 7h7 M10 11h7 M10 15h4"/>',pen:'<path d="m7 17 2-6L19 1l4 4-10 10-6 2Z M9 11l4 4 M4 21h16"/>',monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8 M12 17v5"/>',tablet:'<path d="m2 17 15-15 6 6L8 23Z M6 17l2 2 M17 5l3 3"/>',chair:'<path d="M6 12V4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v8 M4 12h16v5H4Z M12 17v6 M6 23h12"/>',moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',growth:'<path d="M3 21V13h4v8 M10 21V8h4v13 M17 21V2h4v19"/>',coin:'<ellipse cx="12" cy="6" rx="9" ry="4"/><path d="M3 6v12c0 5 18 5 18 0V6 M3 12c0 5 18 5 18 0"/>',spark:'<path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/>'};
 const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.pen}</svg>`;
 function jobName(q){const a=engine.catalog.find(a=>a.id===q.applicant);return q.source==='outsourcing'?(a?a.name+' · ':'외주 · ')+q.type+' '+q.scope:q.type+' '+q.scope;}
  function pageSlice(rows,page,size){const total=Math.max(1,Math.ceil(rows.length/size)),current=Math.min(Math.max(1,page),total);return {rows:rows.slice((current-1)*size,current*size),page:current,total};}
  function pager(scope,page,total){return total<2?'':`<nav class="list-pager" aria-label="${scope} 페이지"><button data-page="${scope}:prev" ${page===1?'disabled':''} aria-label="이전 페이지">이전</button><span>${page} / ${total}</span><button data-page="${scope}:next" ${page===total?'disabled':''} aria-label="다음 페이지">다음</button></nav>`;}
  function journal(){const s=engine.s,rows=s.logs.filter(l=>l.category===journalTab),paged=pageSlice(rows,journalPages[journalTab],JOURNAL_PAGE_SIZE);journalPages[journalTab]=paged.page;return `<section class="journal"><div class="section-head"><h2>작업실의 기록</h2><span class="muted">납품 ${s.totals.completed} · 실패 ${s.totals.failed}</span></div><p class="muted journal-totals">수입 ${won(s.totals.income)} · 지출 ${won(s.totals.expense)} · 팁 ${won(s.totals.tips)}</p><nav class="journal-tabs" aria-label="기록 분류">${[['income','수입'],['expense','지출'],['event','사건']].map(([key,label])=>`<button data-journal="${key}" aria-pressed="${journalTab===key}">${label}</button>`).join('')}</nav><div class="journal-list">${paged.rows.map(l=>`<div class="log"><time>${stamp(l.at)}</time><span>${esc(l.text)}</span>${l.amount!==undefined?`<strong class="log-amount ${l.category}">${l.amount>0?'+':''}${won(l.amount)}</strong>`:''}</div>`).join('')||'<p class="empty">기록이 없습니다.</p>'}</div>${pager(journalTab,paged.page,paged.total)}</section>`;}
 const thumb=q=>`<span class="work-thumb" role="img" aria-label="장식용 그림 썸네일">${q?.thumbnail&&!failedThumbnails.has(q.thumbnail)?`<img src="${esc(q.thumbnail)}" alt="" loading="lazy">`:''}</span>`;
 const practiceThumbnails=[1,2,3].map(n=>`assets/thumbnails/drawing practice/0${n}.png`);
 let practiceThumbnailSession=-1,practiceThumbnail=null;
 function practiceThumb(session){if(practiceThumbnailSession!==session){practiceThumbnailSession=session;practiceThumbnail=practiceThumbnails[Math.floor(Math.random()*practiceThumbnails.length)];}return thumb({thumbnail:practiceThumbnail});}
 async function loadThumbnailIndex(){
   try{
     const response=await fetch('data/thumbnail-index.json',{cache:'no-store'});
     if(!response.ok)throw new Error('이미지 목록을 읽지 못했습니다.');
     if(!engine.setThumbnailIndex(await response.json()))throw new Error('이미지 목록 형식이 올바르지 않습니다.');
     if(!pausedOther&&engine.assignMissingThumbnails())save();
     render();
   }catch(error){console.warn('의뢰 썸네일 목록:',error);}
 }
 const dayLeft=q=>Math.max(0,Math.ceil((q.deadline-engine.s.now)/1440));
 function timeline(){const rows=[...engine.s.jobs].sort((a,b)=>a.deadline-b.deadline);return `<section class="deadline-section"><div class="section-head"><h2>마감 레일</h2></div><div class="timeline">${rows.map(q=>`<button class="deadline-node ${q.id===engine.s.active?'current':''}" data-action="select:${q.id}" ${engine.s.restUntil>engine.s.now||q.id===engine.s.active?'disabled':''}>${thumb(q)}<span class="deadline-content"><span class="day-tag ${dayLeft(q)<=1?'urgent':''}">D-${dayLeft(q)}</span><strong>${esc(q.type+' '+q.scope)}</strong><small>${icon('coin')} ${won(q.gold)}</small></span></button>`).join('')||'<div class="rail-empty">마감까지 여유로운 하루예요. 첫 의뢰를 기다리며 그림을 연습해요.</div>'}</div></section>`;}
 function jobRows(inbox=false,subset,reserved=false){const s=engine.s,rows=subset||(inbox?s.inbox:reserved?s.reservations:engine.orderedJobs()),p=engine.projection();return rows.map(q=>{const reason=inbox||reserved?engine.canAccept(q):'',active=s.active===q.id,risk=!inbox&&!reserved&&p.get(q.id)>q.deadline,reserveReason=engine.canReserve(q);return `<article class="job ${active?'active':''}" draggable="${!pausedOther&&innerWidth>=650}" data-job="${q.id}" data-source="${inbox?'inbox':reserved?'reserved':active?'active':'waiting'}">${thumb(q)}<div class="job-text"><strong>${esc(jobName(q))}</strong><div class="job-progress"><div class="track"><div class="fill" style="width:${q.done/q.work*100}%"></div></div><small>${(q.done/q.work*100).toFixed(0)}%</small></div><small class="${risk?'risk':''}">${inbox?won(q.gold)+' · 수락 후 '+duration(q.deadline-s.now)+'<br>취소 판정까지 '+duration(1440-(q.inboxWait??0)):reserved?won(q.gold)+' · 기한 정지 · 취소 없음':active&&s.restUntil>s.now?'수면 대기 · 진행도 보존':q.exp+' EXP · '+won(q.gold)}</small>${reason?`<small class="blocked-reason">대기함: ${esc(reason)}</small>`:''}</div><div class="job-edge"><span class="drag-handle" aria-hidden="true">⠿</span><small class="${!inbox&&!reserved&&(dayLeft(q)<=1||risk)?'risk':''}">D-${dayLeft(q)}</small></div><div class="job-controls">${inbox||reserved?button('accept:'+q.id,'대기함으로',!!reason||pausedOther):active?'<span class="muted">진행 중</span>':button('select:'+q.id,'작업 시작',s.restUntil>s.now)}${!reserved&&!active?button('reserve:'+q.id,'예약',!!reserveReason||pausedOther,`title="${esc(reserveReason||'기한을 멈추고 안전하게 예약해요.')}"`):''}${!inbox&&!reserved&&!active?button('up:'+q.id,'↑',false,'aria-label="이 의뢰를 한 칸 앞으로"')+button('down:'+q.id,'↓',false,'aria-label="이 의뢰를 한 칸 뒤로"'):''}</div></article>`;}).join('');}
 function board(){const s=engine.s,waiting=engine.orderedJobs().filter(j=>j.id!==s.active),slots=engine.reservationSlots();return `<section class="queue-card" id="job-board"><div class="section-head"><h2>의뢰 흐름</h2></div><div class="mobile-queue-tabs">${[['waiting','대기함',waiting.length],['reserved','예약함',s.reservations.length],['inbox','도착함',s.inbox.length]].map(([key,label,count])=>`<button data-queue="${key}" aria-pressed="${queueTab===key}">${label} <span>${count}</span></button>`).join('')}</div><div class="job-columns" data-mobile-column="${queueTab}"><section class="job-column" data-drop="waiting"><div class="box-heading"><h3>${icon('pen')} 대기함 <small>(${s.jobs.length} / ${engine.slots()})</small></h3><span class="box-help"><button type="button" class="box-help-button" id="waiting-box-help" aria-label="대기함 설명" aria-describedby="waiting-box-tooltip">!</button><span class="box-tooltip" id="waiting-box-tooltip" role="tooltip">작업을 기다리는 의뢰예요. 마감 시간이 줄어들며 작업 시작 버튼으로 전환할 수 있어요.<br>기본 3칸이고 계획력 10·25·50에서 1칸씩 늘어나요. 진행 중 작업도 1칸을 사용해요.</span></span></div><div class="job-list" id="waiting-job-list" role="region" aria-label="대기함 의뢰 목록" tabindex="0">${jobRows(false,waiting)}</div></section><section class="job-column reserved-column" data-drop="reserved"><div class="box-heading"><h3>${icon('book')} 예약함 <small>${slots?'('+s.reservations.length+' / '+slots+')':'잠김'}</small></h3><span class="box-help"><button type="button" class="box-help-button" id="reserved-box-help" aria-label="예약함 설명" aria-describedby="reserved-box-tooltip">!</button><span class="box-tooltip" id="reserved-box-tooltip" role="tooltip">예약된 의뢰는 마감 기한이 줄지 않고 취소되지 않아요.<br>5·10·15·20레벨마다 1칸씩 열려요. 대기함으로 옮기면 남은 기한이 다시 흐르며 초기화되지 않아요.</span></span></div><div class="job-list" id="reserved-job-list" role="region" aria-label="예약함 의뢰 목록" tabindex="0">${slots?jobRows(false,s.reservations,true):''}</div></section><section class="job-column inbox-column" data-drop="inbox"><div class="box-heading"><h3>${icon('book')} 도착함 <small>(${s.inbox.length})</small></h3><span class="box-help"><button type="button" class="box-help-button" id="inbox-box-help" aria-label="도착함 설명" aria-describedby="inbox-box-tooltip">!</button><span class="box-tooltip" id="inbox-box-tooltip" role="tooltip">새 의뢰가 처음 도착하는 곳이며 슬롯 제한이 없어요. 마감 기한은 줄지 않아요.<br>각 의뢰는 대기 24시간마다 25% 확률로 취소돼요. 대기함이나 예약함으로 옮길 수 있어요.</span></span></div><div class="job-list" id="inbox-job-list" role="region" aria-label="도착함 의뢰 목록" tabindex="0">${jobRows(true)}</div></section></div></section>`;}
 function studio(){const s=engine.s,q=s.jobs.find(q=>q.id===s.active),preview=q||engine.orderedJobs()[0],sleep=s.restUntil>s.now,training=!sleep&&!q&&(s.autoPractice||s.practicing),p=engine.projection(),progress=q?q.done/q.work*100:training?s.practiceDone/StudioCore.PRACTICE.duration*100:preview?preview.done/preview.work*100:0;return `<div class="studio-content"><section class="hero"><div class="section-head"><h2>오늘의 작업대</h2><p class="work-clock">${Math.floor(s.now/1440)+1}일째 · ${Math.floor(s.now%1440/60)<12?'AM':'PM'} ${String(Math.floor(s.now%1440/60)%12||12).padStart(2,'0')}:${String(Math.floor(s.now%60)).padStart(2,'0')}</p></div><div class="work-panel">${training?practiceThumb(s.totals.practiceSessions):thumb(preview)}<div class="work-intro"><span class="status-chip ${sleep?'sleep':''}">${sleep?'쉬는 중':q?'진행 중':training?'그림 연습':'작업 대기'}</span><h3>${sleep?'잠시 쉬어가는 시간':q?esc(jobName(q)):training?'오늘의 그림 연습':preview?esc(jobName(preview)):'작은 작업실의 첫날'}</h3><div class="work-labels"><span>${preview?preview.type+' · '+preview.scope:'매일 조금씩'}</span><span>${preview?preview.source==='outsourcing'?'외주 의뢰':'일반 의뢰':'나를 위한 그림'}</span></div><p>${sleep?'휴식 후 남겨둔 그림부터 다시 이어가요.':q?'한 장씩 차근차근 완성해요.<br>진행도는 작업을 바꿔도 그대로 남아요.':training?'의뢰가 비는 동안 나만의 그림을 연습해요.<br>30게임분 연습을 마치면 2 EXP를 얻어요.':preview?'준비된 의뢰가 있어요.<br>작업 시작을 눌러 이어서 그려보세요.':'낙서 두상·흉상부터 시작해요.<br>첫 의뢰를 기다리며 그림을 연습해볼까요?'}</p></div><div class="work-details"><div class="reward-and-deadline"><div><small>${q?'보상금':training?'연습 보상':preview?'예상 보상':'연습 보상'}</small><strong>${q?icon('coin')+' '+won(q.gold):training?StudioCore.PRACTICE.exp+' EXP':preview?icon('coin')+' '+won(preview.gold):StudioCore.PRACTICE.exp+' EXP'}</strong>${q?'<small class="work-exp">경험치 '+q.exp+' EXP</small>':!training&&preview?'<small class="work-exp">경험치 '+preview.exp+' EXP</small>':''}</div><div><small>${sleep?'수면 종료까지':training?'연습 완료까지':preview?'마감까지':'한 번의 연습'}</small><strong class="deadline-value">${sleep?duration(s.restUntil-s.now):training?duration(StudioCore.PRACTICE.duration-s.practiceDone):preview?duration(preview.deadline-s.now):duration(StudioCore.PRACTICE.duration)}</strong>${!preview?'<small>수입 없이 경험치 획득</small>':''}</div></div><div class="hero-progress"><div class="track"><div class="fill" style="width:${progress}%"></div></div><strong>${progress.toFixed(0)}%</strong></div><p class="eta-line">${sleep?'수면 중에는 작업과 연습이 잠시 멈춰요.':q?'예상 남은 시간 <strong>'+duration(p.get(q.id)-s.now)+'</strong>':training?'연습 완료까지 <strong>'+duration(StudioCore.PRACTICE.duration-s.practiceDone)+'</strong>':'진행도를 보존하고 기다리고 있어요.'}</p><div class="actions">${button(q?'pause':'work-start',sleep?'수면 중':q?'Ⅱ 작업 중단':training&&!preview?'연습 진행 중':'▶ 작업 시작',sleep||(training&&!preview),'class="primary"')}${button('focus-jobs','⇄ 작업 전환',!s.jobs.length&&!s.inbox.length&&!s.reservations.length)}${button('rest','☾ 8시간 수면',sleep)}</div></div></div></section><section class="mobile-fatigue" aria-label="피로도"><div class="status-heading"><span>피로도</span><strong>${Number(s.fatigue.toFixed(1))} / 100</strong></div><div class="status-meter fatigue-meter ${engine.overworked()?'high':''}" role="progressbar" aria-label="피로도" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.fatigue.toFixed(1)}"><i style="width:${s.fatigue}%"></i></div>${engine.overworked()?'<p class="overwork-note">작업 속도 -50%</p>':''}</section>${timeline()}${board()}<section class="practice-strip"><div>${icon('pen')} <strong>그림 연습</strong><small>${StudioCore.PRACTICE.duration}게임분 / ${StudioCore.PRACTICE.exp} EXP · ${s.totals.practiceSessions}회 완료</small></div><div>${button('practice','한 번 연습',sleep||!!q||s.practicing||s.autoPractice)}${button('practice-auto','자동 연습 '+(s.autoPractice?'켜짐':'꺼짐'),false,`aria-pressed="${s.autoPractice}"`)}</div></section>${innerWidth<1050?'<section class="studio-inline-note" aria-label="성장·운영">'+growthNote(true)+'</section>':''}</div>`;}
 function activeStatus(){const effects=engine.overworked()?[{name:'과로',kind:'디버프',effect:'작업 속도 -50%'}]:[];return `<section class="active-status" aria-label="상태"><h3>상태</h3>${effects.length?effects.map(effect=>`<div class="active-status-row"><strong>${effect.name}</strong><span>${effect.kind}</span><span>${effect.effect}</span></div>`).join(''):'<p>상태 없음</p>'}</section>`;}
  function growthNote(inline=false){const s=engine.s,st=engine.stats();const tabs=[['stats','정보'],['ops','운영']];let content='';if(noteTab==='stats'){content=`<section class="player-status" aria-label="레벨과 피로도"><div id="level-info" class="player-level"><span>레벨</span><strong>Lv.${s.level}</strong><span class="level-limit">${s.level>=100?'MAX':'/ 100'}</span></div><div class="status-heading"><span>경험치</span><strong>${s.level>=100?'MAX':s.exp+' / 100 EXP'}</strong></div><div class="status-meter exp-meter" role="progressbar" aria-label="경험치" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.level>=100?100:s.exp}" aria-valuetext="${s.level>=100?'최고 레벨 달성':s.exp+' / 100 EXP'}"><i style="width:${s.level>=100?100:s.exp}%"></i></div><p class="status-caption">${s.level>=100?'최고 레벨에 도달했어요.':'다음 레벨까지 '+(100-s.exp)+' EXP'}</p><div class="fatigue-status ${s.fatigue>=90?'high':s.fatigue>=70?'warning':''}"><div class="status-heading"><span>피로도</span><strong>${s.fatigue.toFixed(0)} <small>/ 100</small></strong></div><div class="status-meter fatigue-meter" role="progressbar" aria-label="피로도" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.fatigue.toFixed(1)}"><i style="width:${s.fatigue}%"></i></div></div></section>${activeStatus()}<h3 class="note-section-title stat-heading">스탯 <span class="stat-points">성장 포인트 <strong>${s.points}</strong></span></h3><div class="skill-notes">${[['skill','그림 실력','pen',150,`보상 +${Number((st.skill*.5).toFixed(2))}% · 의뢰 도착 확률 +${Number((st.skill*.05).toFixed(2))}%p`],['speed','작업 속도','spark',150,`작업 속도 +${st.speed}%`],['plan','계획력','growth',150,`피로 증가량 −${Number((st.plan*.5).toFixed(2))}% · 대기함 ${engine.slots()}칸`]].map(([key,label,art,max,desc])=>`<div class="skill-line"><div>${icon(art)} <strong>${label}</strong><span>Lv.${st[key]}</span>${button('stat:'+key,'+',s.level<=50||!s.points,`aria-label="${label} 1포인트 배분"`)}</div><div class="track"><div class="fill ${key}" style="width:${Math.min(100,st[key]/max*100)}%"></div></div><small>${desc}</small></div>`).join('')}</div>${s.level>=50?`<p class="note-hint">${s.level<100?'51~100레벨: 레벨업마다 성장 포인트 +2':'최고 레벨 100 · 남은 포인트를 자유롭게 배분하세요.'}</p>`:''}<section id="type-settings" aria-label="타입별 의뢰 접수 설정"><h3 class="note-section-title">타입 <span>${engine.unlocked().length} / 12</span></h3><div class="type-table"><div class="type-header"><span>스타일</span><span>두상</span><span>흉상</span><span>반신</span><span>전신</span></div>${['낙서','단색','풀채색'].map(type=>`<div class="type-row"><strong>${type}</strong>${StudioCore.UNLOCKS.filter(u=>u.type===type).map(u=>{const index=StudioCore.UNLOCKS.indexOf(u),unlocked=u.level<=s.level,open=unlocked&&!s.closedTypes.includes(index);return button('type:'+index,unlocked?open?'열림':'닫음':'Lv.'+u.level,!unlocked,`class="type-toggle ${unlocked?open?'unlocked':'closed':'locked'}" aria-pressed="${open}" aria-label="${u.type} ${u.scope}, ${unlocked?'의뢰 접수 '+(open?'열림':'닫음'):u.level+'레벨에 해금'}"`);}).join('')}</div>`).join('')}</div><p class="note-hint">클릭해서 타입별 의뢰 접수를 켜고 끌 수 있어요.<br>접수 중 ${engine.openTypes().length}개 · ${engine.openTypes().length?'열린 타입으로만 새 의뢰가 도착해요.':'모두 닫혀 있어 새 의뢰가 들어오지 않아요.'}<br>이미 받은 의뢰는 그대로 유지돼요.</p></section>`;}if(noteTab==='ops'){content=`<h3 class="note-section-title">자동화 설정</h3><div class="automation-settings">${[['auto','의뢰 작업',s.auto,'대기함의 다음 의뢰를 자동으로 시작해요. OFF여도 이미 시작한 작업은 계속돼요.'],['accept-auto','의뢰 수락',s.autoAccept,'슬롯과 마감 여유에 맞춰 도착함에서 대기함으로 옮겨요. 예약함은 직접 관리해요.'],['practice-auto','그림 연습',s.autoPractice,'의뢰 작업이 없을 때 그림 연습을 반복해요. OFF이면 직접 연습을 시작해야 해요.']].map(([action,label,on,desc])=>`<div class="automation-row"><div><strong>${label}</strong><small>${desc}</small></div>${button(action,'<span class="toggle-track '+(on?'on':'')+'"><i></i></span><span>'+(on?'ON':'OFF')+'</span>',false,`class="automation-switch" role="switch" aria-checked="${on}" aria-label="${label} 자동화"`)}</div>`).join('')}</div><h3 class="note-section-title">작업실 운영</h3><div class="ops-item"><span>${icon('coin')}</span><div><strong>작은 복권</strong><small>하루 한 장 · 수입은 보장되지 않아요.</small></div>${button('lotto',won(1000),s.money<1000||s.lottoDay===Math.floor(s.now/1440))}</div><div class="ops-item"><span>${icon('moon')}</span><div><strong>8시간 수면</strong><small>피로 50 회복 · 진행도 보존</small></div>${button('rest','쉬어가기',s.restUntil>s.now)}</div><div class="note-hint">10초마다 일반 의뢰 도착 <strong>${engine.arrivalChance().toFixed(2)}%</strong><br>기본 2% · 그림 실력에 따라 증가<br>다음 식비까지 ${duration((s.lastFoodWeek+1)*10080-s.now)}<br>주간 식비 ${won(StudioCore.WEEKLY_FOOD_COST)}</div>`;}return `${innerWidth<1050&&!inline?'<div class="note-heading note-dismiss"><button data-action="note-close" aria-label="성장 노트 닫기">×</button></div>':''}<nav class="note-tabs" aria-label="성장 노트 메뉴">${tabs.map(([key,label])=>`<button data-note="${key}" aria-pressed="${noteTab===key}">${label}</button>`).join('')}</nav><div class="note-body">${content}</div>`;}
 function renderNote(){
   const desktop=innerWidth>=1050;
   if(desktop)notesOpen=true;
   const note=$('growth-note'),oldScroll=note.querySelector('.note-body')?.scrollTop||0,wasShop=note.classList.contains('shop-note');
   const studioPanel=['studio','collection'].includes(tab);
   const shopPanel=tab==='shop'&&desktop&&!onboarding;
   note.classList.toggle('shop-note',shopPanel);
   note.hidden=onboarding||!desktop||(!shopPanel&&(!notesOpen||!studioPanel));
   note.innerHTML=shopPanel?'<div class="note-body shop-note-body">'+shopSidebar()+'</div>':growthNote();
   const body=note.querySelector('.note-body');
   if(body)body.scrollTop=shopPanel===wasShop?oldScroll:0;
   note.setAttribute('aria-label',shopPanel?'상점 정보':'성장 노트');
   $('note-backdrop').hidden=true;
   document.querySelector('.game-frame').classList.toggle('notes-open',!onboarding&&desktop&&(shopPanel||(notesOpen&&studioPanel)));
   $('view').inert=false;$('topbar').inert=false;
   document.querySelector('.game-frame>nav').inert=false;
   note.setAttribute('role','complementary');
   note.removeAttribute('aria-modal');
   if(pausedOther)note.querySelectorAll('[data-action]:not([data-action="note-close"])').forEach(el=>el.disabled=true);
 }
 function toggleNotes(open= !notesOpen){if(innerWidth>=1050){notesOpen=true;renderNote();return;}notesOpen=open;renderNote();if(open&&innerWidth<1050)$('growth-note').querySelector('button').focus();else if(!open)document.querySelector('[data-action="open-notes"]')?.focus();}

 function collection(){const s=engine.s;const proposals=`<section class="card proposals"><div class="section-head"><h2>도착한 의뢰</h2><span class="muted">${s.inbox.length}</span></div>${jobRows(true)||'<p class="empty">새 의뢰를 기다리고 있어요.</p>'}</section>`;if(!engine.catalog.length)return proposals+ `<section class="card"><h2>외주 신청자 · 작업물 도감</h2><div class="empty"><strong>아직 등록된 신청자가 없어요.</strong>신청자와 작업물 데이터를 받은 뒤 외주가 열립니다.<br>지금은 일반 의뢰로 작업실을 운영할 수 있어요.</div><div class="hint">새 작업물은 한 번만 도감에 등록하고, 중복 작업물은 보유 수량 대신 등급별 팁을 받습니다.<br>일반 1,000원 · 고급 3,000원 · 희귀 8,000원 · 전설 20,000원</div></section>`;
 return proposals+`<section class="card"><h2>외주 신청자 · 작업물 도감</h2><p class="muted">만나지 않은 신청자와 수집하지 않은 작업물은 ?로 표시됩니다.</p>${engine.catalog.map(a=>{const met=s.met.includes(a.id),count=a.works.filter(w=>s.collection.includes(a.id+'/'+w.id)).length;return `<section style="margin-top:20px"><h3>${met?esc(a.name):'?'} <span class="muted">${count}/${a.works.length}</span></h3>${met&&a.image?`<img src="${esc(a.image)}" alt="${esc(a.name)}" referrerpolicy="no-referrer" style="width:72px;height:72px;object-fit:contain">`:''}<div class="collection-grid">${a.works.map(w=>{const known=s.collection.includes(a.id+'/'+w.id);return `<article class="collect-card">${known&&w.image?`<img src="${esc(w.image)}" alt="${esc(w.title)}" referrerpolicy="no-referrer">`:'<div class="unknown">?</div>'}<strong>${known?esc(w.title):'미발견 작업물'}</strong>${known?`<p class="muted">${({common:'일반',uncommon:'고급',rare:'희귀',legendary:'전설'})[w.tier]} · 중복 팁 ${won(StudioCore.TIPS[w.tier])}</p>`:''}</article>`;}).join('')}</div></section>`;}).join('')}</section>`;
 }
 function shopSidebar(){
   const upgrades=[
     {id:'tablet',name:'액정 타블렛',icon:'assets/shop/pen-tablet.png',effect:'오프라인 보상금'},
     {id:'chair',name:'의자',icon:'assets/shop/chair.png',effect:'오프라인 EXP'}
   ];
   const rows=upgrades.map(item=>{
     const level=engine.s.offlineUpgrades[item.id];
     const rate=engine.offlineRate(item.id);
     const isMax=level>=StudioCore.UPGRADE_COSTS.length;
     const next=isMax?rate:rate+StudioCore.UPGRADE_RATE_STEPS[level];
     const cost=isMax?0:StudioCore.UPGRADE_COSTS[level];
     const reason=engine.canUpgradeOffline(item.id);
     const label=isMax?'최대 단계':won(cost)+' · 강화';
     return '<div class="shop-upgrade-row">'
       +'<img src="'+esc(item.icon)+'" alt="" width="32" height="32">'
       +'<div class="shop-upgrade-info"><strong>'+esc(item.name)+' <small>Lv.'+level+'/5</small></strong>'
       +'<span>'+esc(item.effect)+' '+rate+'%'+(isMax?'':' → '+next+'%')+'</span>'
       +button('upgrade-offline:'+item.id,label,!!reason,reason?'title="'+esc(reason)+'"':'')
       +'</div></div>';
   }).join('');
   const owned=Object.entries(engine.s.inventory).filter(([id,count])=>count>0);
   const inventory=pageSlice(owned,inventoryPage,3);inventoryPage=inventory.page;
    const inventoryMarkup=owned.length?'<div class="shop-inventory-list">'+inventory.rows.map(([id,count])=>{
     const item=shopItems.find(entry=>entry.id===id);
     const reason=item?engine.canUseShopItem(item):'아이템 정보를 불러오지 못했습니다.';
     return '<div class="shop-inventory-item">'
       +'<div class="shop-inventory-art">'
       +(item?'<img src="'+esc(item.icon)+'" alt="">':'<span aria-hidden="true">?</span>')
       +'<span class="shop-inventory-quantity" aria-label="보유 '+count+'개">×'+count+'</span></div>'
       +'<strong class="shop-inventory-name">'+esc(item?.name||id)+'</strong>'
       +button('use-shop:'+id,'사용',!!reason,reason?'title="'+esc(reason)+'"':'')
       +'</div>';
   }).join('')+'</div>'
   +pager('inventory',inventory.page,inventory.total)
  :'<p class="shop-inventory-empty">보유 아이템 없음</p>';
   return '<div class="shop-sidebar">'
     +'<section class="shop-sidebar-upgrades" aria-label="오프라인 업그레이드"><h3>업그레이드</h3>'+rows+'</section>'
     +'<section class="shop-sidebar-inventory" aria-label="인벤토리"><h3>인벤토리</h3>'
     +inventoryMarkup+'</section>'
     +'</div>';
 }
 function shop(){
   const state=engine.s;
   const heading='<div class="section-head"><h2>상점</h2><span class="muted">피로도 '+Number(state.fatigue.toFixed(1))+' / 100</span></div>';
   let itemMarkup='';
   if(shopState==='loading')itemMarkup='<p class="muted">아이템 불러오는 중…</p>';
   else if(shopState==='error')itemMarkup='<p class="risk">상점 아이템을 불러오지 못했습니다.</p>'+button('shop-reload','다시 시도');
   else if(!shopItems.length)itemMarkup='<p class="muted">등록된 아이템이 없습니다.</p>';
   else {const items=pageSlice(shopItems,shopPage,9);shopPage=items.page;itemMarkup='<div class="shop-list">'+items.rows.map(item=>{
     const effect=item.effect;
     const supported=effect.type==='fatigue_change'&&Number.isInteger(effect.amount)&&effect.amount<0&&effect.amount>=-100;
     const desc=supported?'피로도 '+effect.amount:'아직 사용할 수 없는 효과';
     const reason=engine.canPurchaseShopItem(item);
     return '<article class="shop-item"><img src="'+esc(item.icon)+'" alt="" class="shop-item-icon">'
       +'<div class="shop-item-detail"><strong>'+esc(item.name)+'</strong><small>'+esc(desc)+'</small></div>'
       +'<div class="shop-item-controls"><strong>'+won(item.price)+'</strong>'
       +button('buy-shop:'+item.id,'구매',!!reason,reason?'title="'+esc(reason)+'"':'')
       +'</div></article>';
   }).join('')+'</div>'+pager('shop',items.page,items.total);}
   return '<section class="shop-page">'+heading+itemMarkup+'</section>'
     +(innerWidth<1050?shopSidebar():'');
 }
 async function loadShopItems(){
   shopState='loading';
   if(tab==='shop')render();
   try{
     const response=await fetch('data/shop-items.json',{cache:'no-store'});
     if(!response.ok)throw new Error('아이템 파일을 가져오지 못했습니다.');
     const raw=await response.json();
     if(raw.version!==1||!Array.isArray(raw.items)||raw.items.length>500)throw new Error('아이템 목록 형식이 올바르지 않습니다.');
     const seen=new Set();
     for(const item of raw.items){
       if(!item||typeof item.id!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(item.id)||seen.has(item.id)
          ||typeof item.name!=='string'||!item.name.trim()||item.name.length>80
          ||!Number.isSafeInteger(item.price)||item.price<0||item.price>1e9
          ||typeof item.icon!=='string'||!/^assets\/shop\/[a-z0-9._-]+\.(png|webp)$/i.test(item.icon)
          ||!item.effect||typeof item.effect.type!=='string')throw new Error('아이템 정보가 올바르지 않습니다.');
       seen.add(item.id);
     }
     shopItems=raw.items;
     shopState='ready';
   }catch(error){
     shopItems=[];shopState='error';
     console.warn('상점 아이템 로드 실패:',error);
   }
   if(tab==='shop')render();
 }
 function render(){if(holdingControl){pendingRender=true;return;}pendingRender=false;const viewScroll=$('view').scrollTop,oldTimeline=$('view').querySelector('.timeline')?.scrollLeft||0,scrolls=[...$('view').querySelectorAll('.job-list')].map(el=>el.scrollTop),focus=document.activeElement,action=focus?.dataset?.action,noteFocus=focus?.dataset?.note,group=focus?.closest('#growth-note')?'note':focus?.closest('.job')?'job':focus?.closest('.timeline')?'timeline':'other';const s=engine.s;document.title=onboarding?'작업실 게임':s.name+'의 작업실';$('bar-name').textContent=s.name+'의 작업실';$('metrics').innerHTML=`<div class="bar-money">${icon('coin')} <strong>${won(s.money)}</strong></div>`;$('view').dataset.page=tab;let content;if(tab==='studio')content=studio();else if(tab==='tasks')content='<div class="studio-content task-content"><div class="studio-utility-bar"><button data-action="back-studio">← 작업실</button></div>'+timeline()+board()+'</div>';else if(tab==='collection')content='<div class="studio-content"><div class="studio-utility-bar"><button data-action="back-studio">← 작업실</button></div>'+collection()+'</div>';else if(tab==='shop')content=shop();else if(['home','gacha'].includes(tab)){const name={home:'집',gacha:'가챠'}[tab];content=`<section class="placeholder-page"><h2>${name}</h2><p class="muted">준비 중</p></section>`;}else content=journal();$('view').innerHTML=content;renderNote();$('view').scrollTop=viewScroll;const rail=$('view').querySelector('.timeline');if(rail)rail.scrollLeft=oldTimeline;$('view').querySelectorAll('.job-list').forEach((el,i)=>el.scrollTop=scrolls[i]||0);if(focus?.id==='level-info')$('level-info')?.focus({preventScroll:true});if(focus?.id?.endsWith('-job-list')||focus?.id?.endsWith('-box-help'))$(focus.id)?.focus({preventScroll:true});if(action){const area=group==='note'?$('growth-note'):$('view');const candidates=[...area.querySelectorAll('[data-action]')].filter(el=>el.dataset.action===action);const target=candidates.find(el=>group==='job'?el.closest('.job'):group==='timeline'?el.closest('.timeline'):!el.closest('.job')&&!el.closest('.timeline'))||candidates[0];target?.focus({preventScroll:true});}if(noteFocus)($('growth-note').querySelector(`[data-note="${noteFocus}"]`)||$('view').querySelector(`[data-note="${noteFocus}"]`))?.focus({preventScroll:true});if(pausedOther){$('view').querySelectorAll('button').forEach(el=>el.disabled=true);$('growth-note').querySelectorAll('[data-action]:not([data-action="note-close"])').forEach(el=>el.disabled=true);}
 }
 function updateReport(){if(!away||document.hidden)return;const t=engine.s.totals;$('return-report').innerHTML=`<div class="row between"><strong>${pendingMs()>=GAME_MINUTE_MS?'오프라인 정산 중…':'오프라인 진행 결과'}</strong><button id="report-close">닫기</button></div><p>납품 ${t.completed-away.completed}건 · 실패 ${t.failed-away.failed}건 · 수입 ${won(t.income-away.income)} · 지출 ${won(t.expense-away.expense)} · 잔액 변화 ${won(engine.s.money-away.money)}</p>`;$('return-report').hidden=false;$('report-close').onclick=()=>{away=null;$('return-report').hidden=true;};if(pendingMs()<GAME_MINUTE_MS)away=null;}
 function tick(){
  const now=Date.now();
  if(onboarding){last=now;owns();return;}
  if(pausedOther){last=now;return;}
  if(!owns()){suspend();last=now;render();return;}
  enqueueElapsed(Math.max(0,now-last),offlineMode);last=now;
  let remaining=2400,processed=0;
  while(segments.length&&remaining>0){
    const first=segments[0],minutes=Math.min(remaining,Math.floor(first.ms/GAME_MINUTE_MS));
    if(minutes<1){
      // Carry subsecond leftovers across visibility boundaries without losing elapsed time.
      if(segments.length>1){segments[1].ms+=first.ms;segments.shift();continue;}
      break;
    }
    engine.advance(minutes,first.offline);
    first.ms-=minutes*GAME_MINUTE_MS;
    remaining-=minutes;processed+=minutes;
    if(first.ms<=0)segments.shift();
  }
  if(processed)render();
  if(now-lastSave>=5000)save();
  updateReport();
  if(pendingMs()>=GAME_MINUTE_MS&&!document.hidden&&!catchUpScheduled){
    catchUpScheduled=true;
    setTimeout(()=>{catchUpScheduled=false;tick();},0);
  }
}
 function releaseControl(){holdingControl=false;if(pendingRender)setTimeout(()=>{if(!holdingControl&&pendingRender)render();},0);}
 document.addEventListener('pointerdown',e=>{if(e.target.closest('#view button,#growth-note button,#view .job-list'))holdingControl=true;},true);
 document.addEventListener('pointerup',releaseControl,true);document.addEventListener('pointercancel',releaseControl,true);addEventListener('blur',releaseControl);
 document.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&e.target.closest('#view button,#growth-note button'))holdingControl=true;},true);document.addEventListener('keyup',releaseControl,true);
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.note){noteTab=b.dataset.note;if(b.closest('.studio-inline-note')){const inline=b.closest('.studio-inline-note');inline.innerHTML=growthNote(true);inline.querySelector(`[data-note="${noteTab}"]`)?.focus({preventScroll:true});}else{renderNote();$('growth-note').querySelector(`[data-note="${noteTab}"]`)?.focus({preventScroll:true});}return;}if(b.dataset.queue){queueTab=b.dataset.queue;render();return;}if(b.dataset.journal){journalTab=b.dataset.journal;render();return;}if(b.dataset.page){const [scope,direction]=b.dataset.page.split(':');const pages=scope==='shop'?Math.max(1,Math.ceil(shopItems.length/9)):scope==='inventory'?Math.max(1,Math.ceil(Object.keys(engine.s.inventory).length/3)):Math.max(1,Math.ceil(engine.s.logs.filter(l=>l.category===scope).length/JOURNAL_PAGE_SIZE));const current=scope==='shop'?shopPage:scope==='inventory'?inventoryPage:journalPages[scope];const next=Math.max(1,Math.min(pages,current+(direction==='next'?1:-1)));if(scope==='shop')shopPage=next;else if(scope==='inventory')inventoryPage=next;else journalPages[scope]=next;render();return;}if(b.dataset.tab){tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));render();$('view').scrollTop=0;return;}if(!b.dataset.action)return;const [a,id]=b.dataset.action.split(':');if(a==='open-notes'){toggleNotes();return;}if(a==='open-collection'){tab='collection';render();$('view').scrollTop=0;return;}if(a==='back-studio'){tab='studio';render();$('view').scrollTop=0;return;}if(a==='note-close'){toggleNotes(false);return;}if(a==='shop-reload'){loadShopItems();return;}if(a==='show-tasks'){tab='tasks';render();$('view').scrollTop=0;return;}if(a==='inbox-sheet'){queueTab='inbox';if(innerWidth<650){showInbox();return;}render();$('job-board')?.scrollIntoView({behavior:'smooth',block:'center'});return;}if(pausedOther){note('다른 창에서 운영 중입니다.');return;}if(offlineUnprocessed()){note('오프라인 정산 중입니다.');return;}tick();if(offlineUnprocessed()){note('오프라인 정산 중입니다.');return;}let ok=true;switch(a){case 'focus-jobs':queueTab='waiting';render();$('job-board')?.scrollIntoView({behavior:'smooth',block:'center'});return;case 'work-start':{const next=engine.orderedJobs()[0];ok=next?engine.select(next.id):engine.startPractice();break;}case 'practice':ok=engine.startPractice();break;case 'practice-auto':engine.togglePractice();break;case 'auto':engine.toggleAuto();break;case 'accept-auto':engine.toggleAccept();break;case 'pause':engine.pause();break;case 'rest':ok=engine.rest();break;case 'accept':ok=engine.accept(id);engine.chooseNext();break;case 'reserve':ok=engine.reserve(id);break;case 'select':ok=engine.select(id);break;case 'up':case 'down':{const rows=engine.orderedJobs().filter(q=>q.id!==engine.s.active),index=rows.findIndex(q=>q.id===id);if(a==='up')ok=index>0&&engine.reorder(id,rows[index-1].id);else ok=index>=0&&index<rows.length-1&&engine.reorder(id,rows[index+2]?.id);break;}case 'type':ok=engine.toggleType(Number(id));break;case 'stat':ok=engine.addStat(id);break;case 'lotto':{const prize=engine.lotto();ok=prize!==null;if(ok)note('복권 결과 · '+won(prize));break;}case 'upgrade-offline':{
   const reason=engine.canUpgradeOffline(id);
   if(reason){note(reason);render();return;}
   ok=engine.upgradeOffline(id);
   if(ok)note((id==='tablet'?'액정 타블렛':'의자')+' Lv.'+engine.s.offlineUpgrades[id]+' · 오프라인 '+(id==='tablet'?'수익':'EXP')+' '+engine.offlineRate(id)+'%');
   break;
 }case 'buy-shop':{
   const item=shopItems.find(entry=>entry.id===id);
   const reason=engine.canPurchaseShopItem(item);
   if(reason){note(reason);render();return;}
   ok=engine.purchaseShopItem(item);
   if(ok)note(item.name+' 구매 · 보유 '+engine.inventoryCount(item.id)+'개');
   break;
 }case 'use-shop':{
   const item=shopItems.find(entry=>entry.id===id);
   const reason=engine.canUseShopItem(item);
   if(reason){note(reason);render();return;}
   const before=engine.s.fatigue;
   ok=engine.useShopItem(item);
   if(ok)note(item.name+' 사용 · 피로도 '+Number((before-engine.s.fatigue).toFixed(1))+' 감소');
   break;
 }default:return;}if(!ok)note('현재 조건에서는 실행할 수 없어요. 잔액·슬롯·수면 상태를 확인해주세요.');save();render();if($('inbox-sheet').open)showInbox(true);});
 function showInbox(refresh=false){$('inbox-sheet-content').innerHTML=jobRows(true)||'<p class="empty">아직 도착한 의뢰가 없어요.</p>';if(!refresh)$('inbox-sheet').showModal();}
 document.addEventListener('dragstart',e=>{const card=e.target.closest('.job');if(!card||pausedOther){e.preventDefault();return;}dragJob=card.dataset.job;holdingControl=true;e.dataTransfer.setData('application/x-studio-job',dragJob);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');});
 document.addEventListener('dragover',e=>{const column=e.target.closest('[data-drop]');if(dragJob&&column&&['reserved','waiting'].includes(column.dataset.drop)){e.preventDefault();e.dataTransfer.dropEffect='move';column.classList.add('drop-target');}});
 document.addEventListener('dragleave',e=>{const column=e.target.closest('[data-drop]');if(column&&!column.contains(e.relatedTarget))column.classList.remove('drop-target');});
 document.addEventListener('drop',e=>{const column=e.target.closest('[data-drop]');if(!dragJob||!column)return;e.preventDefault();const id=dragJob;dragJob=null;holdingControl=false;let ok=false;if(pausedOther){note('다른 창에서 운영 중입니다.');render();return;}if(column.dataset.drop==='reserved'){ok=engine.s.reservations.some(q=>q.id===id)||engine.reserve(id);}else if(column.dataset.drop==='waiting'){ok=engine.s.jobs.some(q=>q.id===id)||engine.accept(id);if(ok){const before=e.target.closest('.job')?.dataset.job;ok=engine.reorder(id,before===engine.s.active?undefined:before);}}if(!ok)note('이 위치로 옮길 수 없어요. 슬롯과 마감 여유를 확인해주세요.');save();render();});
 document.addEventListener('dragend',()=>{dragJob=null;releaseControl();document.querySelectorAll('.drop-target,.dragging').forEach(el=>el.classList.remove('drop-target','dragging'));if(pendingRender)render();});

 $('note-backdrop').onclick=()=>toggleNotes(false);document.addEventListener('keydown',e=>{if(notesOpen&&innerWidth<1050&&e.key==='Escape'&&!document.querySelector('dialog[open]'))toggleNotes(false);if(notesOpen&&innerWidth<1050&&e.key==='Tab'){const buttons=[...$('growth-note').querySelectorAll('button:not(:disabled)')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}});matchMedia('(min-width:1050px)').addEventListener('change',e=>{notesOpen=e.matches;renderNote();});
 $('settings-open').onclick=()=>{$('readonly-setting').hidden=!pausedOther;$('name').value=engine.s.name;$('settings').showModal();};
 $('rename').onclick=()=>{if(pausedOther)return note('이 창은 보기 전용입니다.');const n=$('name').value.trim();if(!n)return note('이름을 입력해주세요.');engine.s.name=n.slice(0,40);save();render();note('이름을 저장했습니다.');};
 
 $('export').onclick=()=>{tick();const blob=new Blob([JSON.stringify(engine.export(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='작업실-저장.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 $('import').onclick=()=>{if(pausedOther)return note('이 창은 보기 전용입니다.');$('import-file').click();};
 $('import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10*1024*1024)throw new Error('10MB 이하 파일을 사용해주세요.');const parsed=JSON.parse(await f.text());if(pausedOther)throw new Error('다른 창에서 운영 중입니다.');const old=engine.export();engine.import(parsed);try{if(storageOK){localStorage.setItem(KEY+'.before-import',JSON.stringify(old));if(parsed.version!==StudioCore.VERSION)localStorage.setItem(KEY+'.before-progression-import-v3',JSON.stringify(parsed));}}catch{}onboarding=false;$('welcome').close();last=Date.now();accumulator=0;segments=[];away=null;save();render();note('저장을 불러왔습니다.');}catch(error){if(onboarding)$('welcome-error').textContent='불러오기 실패 · '+error.message;else note('불러오기 실패 · '+error.message);}e.target.value='';};
 $('reset').onclick=()=>{if(pausedOther)return note('이 창은 보기 전용입니다.');if($('reset-confirm').value!=='새로 시작')return note('확인 문구를 입력해주세요.');onboarding=true;$('welcome-name').value='';$('welcome-error').textContent='';accumulator=0;last=Date.now();$('reset-confirm').value='';$('settings').close();$('welcome').showModal();render();};
 function takeover(){try{const raw=localStorage.getItem(KEY);if(raw){engine.import(JSON.parse(raw));onboarding=false;$('welcome').close();}claim(true);pausedOther=false;last=Date.now();accumulator=0;$('storage-note').hidden=true;$('welcome-takeover').hidden=true;render();save();}catch(error){if(onboarding)$('welcome-error').textContent=error.message;else note(error.message);}}
 $('storage-note').onclick=e=>{if(e.target.closest('.notice-dismiss'))$('storage-note').hidden=true;else if(e.target.id==='takeover')takeover();};
 $('welcome-takeover').onclick=takeover;$('settings-takeover').onclick=()=>{takeover();$('readonly-setting').hidden=!pausedOther;};
 document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){if(e.target.closest('.work-thumb')){failedThumbnails.add(e.target.getAttribute('src'));e.target.remove();return;}const p=document.createElement('div');p.className='unknown';p.textContent='이미지 연결 확인';p.style.fontSize='13px';e.target.replaceWith(p);}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){tick();offlineMode=true;away={money:engine.s.money,...engine.s.totals};save();}else{tick();offlineMode=false;updateReport();}});
 addEventListener('pagehide',()=>{tick();save();try{const lease=JSON.parse(localStorage.getItem(LEASE)||'null');if(lease?.token===token)localStorage.removeItem(LEASE);}catch{}});
 addEventListener('storage',e=>{if(e.key!==LEASE||!e.newValue)return;try{const other=JSON.parse(e.newValue);if(other.token!==token&&other.until>Date.now()){suspend();render();}}catch{}});
 $('welcome').addEventListener('cancel',e=>e.preventDefault());
 $('welcome-form').onsubmit=e=>{e.preventDefault();if(pausedOther||!owns()){$('welcome-error').textContent='다른 창에서 운영 중입니다. 이 창에서 이어하기를 먼저 눌러주세요.';return;}const name=$('welcome-name').value.trim();if(!name){$('welcome-error').textContent='이름을 입력해주세요.';return;}engine.startFresh(name);onboarding=false;last=Date.now();accumulator=0;segments=[];away=null;$('welcome').close();save();render();};
 $('welcome-import').onclick=()=>{if(pausedOther){$('welcome-error').textContent='다른 창에서 운영 중입니다.';return;}$('import-file').click();};
 document.querySelectorAll('[data-tab] .nav-icon').forEach(el=>{const page=el.parentElement.dataset.tab;el.innerHTML=icon(({studio:'monitor',home:'home',shop:'coin',gacha:'spark',journal:'book'})[page]);});
 addEventListener('resize',()=>{render();});
 loadShopItems();loadThumbnailIndex();render();if(onboarding){$('save-status').textContent='이름을 입력하면 시작해요';$('welcome').showModal();}else save();setInterval(tick,500);
 // 테스트와 추후 외주 데이터 연결에 쓰는 엔진. 화면은 이 상태를 읽습니다.
 globalThis.studioGame={engine,render,tick,save};
})();
