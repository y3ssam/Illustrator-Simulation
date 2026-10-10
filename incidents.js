(function(root){
  'use strict';
  // [ID, name, effect, amount, duration in game minutes, optional job condition]
  const buffs=[
    ['hands-warmed','손이 풀렸다','speed',10,6000],['deep-focus','완전한 몰입','speed',15,4000],['revision-insight','수정할 부분이 보인다','speed',12,4500],['ordered-steps','작업 순서가 정리됐다','speed',10,5000],['deadline-focus','마감 집중력','speed',12,3500,'deadline'],
    ['cool-stretch','시원한 스트레칭','fatigue',-5],['good-posture','바른 자세','fatigueRate',-20,6000],['wrist-recovery','손목 컨디션 호전','speed',10,4500],['comfortable-eyes','눈이 편안해졌다','fatigue',-4],['steady-breath','호흡 고르기','fatigueRate',-15,6000],
    ['composition-flash','구도가 번뜩였다','progress',3],['smooth-rough','러프가 술술 풀린다','speed',12,3500],['clean-lines','선 정리가 잘된다','speed',10,5000],['perfect-colors','색 조합이 딱 맞는다','speed',15,4500,'color'],['shading-discovery','명암 표현의 발견','jobExp',10],
    ['right-brush','찰떡같은 브러시','speed',10,6000],['familiar-shortcuts','손에 익은 단축키','speed',10,5000],['tidy-layers','깔끔한 레이어 정리','fatigueRate',-15,7000],['autosave-checked','자동 저장 확인','fatigue',-3],['comfortable-screen','편안한 작업 화면','speed',8,7000],
    ['quiet-studio','고요한 작업실','speed',10,5000],['pleasant-temperature','쾌적한 실내 온도','fatigueRate',-15,8000],['soft-sunlight','부드러운 햇빛','fatigueRate',-10,6000],['favorite-playlist','마음에 드는 플레이리스트','speed',8,7000],['tidy-desk','정리된 책상','speed',7,9000],
    ['clear-requirements','명확한 요구사항','speed',10,5000],['right-references','딱 맞는 참고자료','speed',12,4000],['clear-feedback','명료한 피드백','speed',12,4500],['favorite-job','취향에 맞는 의뢰','jobExp',10],['implementation-idea','구현 방법이 떠올랐다','progress',3]
  ];
  const debuffs=[
    ['focus-loss','집중력 이탈','speed',-10,4000],['brain-fog','머리가 멍하다','speed',-15,2000],['repetition-fatigue','단순 반복에 지침','fatigueRate',20,5000],['perfectionism','완벽주의의 늪','speed',-15,5000],['broken-flow','작업 흐름이 끊겼다','speed',-12,4000],
    ['aching-wrist','손목이 뻐근하다','speed',-10,6000],['stiff-neck','목이 결린다','fatigue',5],['stiff-shoulders','어깨가 굳었다','fatigueRate',20,6000],['blurred-eyes','눈이 침침하다','speed',-10,4000],['long-work-fatigue','오랜 작업의 피로','fatigue',7],
    ['bad-proportions','비율이 신경 쓰인다','speed',-12,4000],['unsatisfying-rough','러프가 마음에 안 든다','speed',-15,3000],['color-indecision','색을 고르기 어렵다','speed',-12,4500,'color'],['detail-obsession','디테일 욕심','fatigueRate',25,6000,'large'],['composition-review','구도 재검토','fatigue',6],
    ['missing-layer','사라진 레이어','speed',-10,4000],['wrong-brush','잘못 선택한 브러시','speed',-12,3500],['program-lag','프로그램 버벅임','speed',-18,2000],['shortcut-confusion','단축키 혼동','speed',-10,3000],['unstable-pen','불안정한 펜 입력','speed',-15,3500],
    ['outside-noise','밖에서 들리는 소음','speed',-10,5000],['notification-flood','알림 폭주','speed',-12,3500],['screen-glare','모니터에 빛 반사','speed',-8,4500],['stuffy-air','답답한 공기','fatigueRate',20,6000],['uncomfortable-temperature','불편한 실내 온도','fatigue',5],
    ['vague-requirements','애매한 요구사항','speed',-10,4000],['conflicting-references','상충하는 참고자료','speed',-12,4500],['detail-check','세부 사항 확인','fatigue',5],['waiting-for-reply','답변이 신경 쓰인다','speed',-8,3500],['changing-direction','수정 방향이 오락가락','speed',-15,4000]
  ];
  const make=(rows,kind)=>rows.map(([id,name,effect,amount,duration,condition])=>Object.freeze({id,name,kind,effect,amount,...(duration?{duration}:{}),...(condition?{condition}:{})}));
  const all=Object.freeze([...make(buffs,'buff'),...make(debuffs,'debuff')]);
  const byId=Object.freeze(Object.fromEntries(all.map(row=>[row.id,row])));
  const eligible=(row,job,now)=>!row.condition||row.condition==='deadline'&&job.deadline-now<=180||row.condition==='color'&&job.type==='풀채색'||row.condition==='large'&&['반신','전신'].includes(job.scope);
  const describe=row=>row.effect==='speed'?'작업 속도 '+(row.amount>0?'+':'')+row.amount+'%':row.effect==='fatigueRate'?'피로 증가량 '+(row.amount>0?'+':'')+row.amount+'%':row.effect==='fatigue'?'피로도 '+(row.amount>0?'+':'')+row.amount:row.effect==='progress'?'현재 의뢰 작업량 +'+row.amount+'%':'이번 의뢰 납품 EXP +'+row.amount+'%';
  const api={all,byId,buffs:all.filter(x=>x.kind==='buff'),debuffs:all.filter(x=>x.kind==='debuff'),eligible,describe};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioIncidents=api;
})(globalThis);
