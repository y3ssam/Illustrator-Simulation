(() => {
  'use strict';
  const STORAGE_KEY = 'studio.shop.editor.v1';
  const SEED = {version:1,items:[{id:'soft-drink',name:'탄산음료',price:2200,icon:'assets/shop/soft-drink-red.png',effect:{type:'fatigue_change',amount:-10}}]};
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const won = value => Math.max(0,Number(value)||0).toLocaleString('ko-KR')+'원';
  const form = $('item-form'), list = $('item-list');
  const effectFields = $('effect-fields'), feedback = $('form-feedback');
  let defaults=clone(SEED),data=clone(SEED),selectedId=null,draft=null,dirty=false,previewUrl=null;

  function validateItem(raw) {
    if(!raw||typeof raw!=='object')throw Error('아이템 데이터가 올바르지 않습니다.');
    const id=String(raw.id??'').trim(), name=String(raw.name??'').trim();
    if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id))throw Error('ID는 영문 소문자로 시작하고 영문·숫자·-·_만 사용할 수 있습니다.');
    if(!name||name.length>80)throw Error('이름은 1~80자로 입력하세요.');
    const price=Number(raw.price);
    if(!Number.isSafeInteger(price)||price<0||price>1e9)throw Error('가격은 0~10억 원의 정수로 입력하세요.');
    const icon=String(raw.icon??'').trim();
    if(icon&&!/^assets\/shop\/[a-z0-9._-]+\.(png|webp)$/i.test(icon))throw Error('아이콘 경로는 assets/shop/폴더의 PNG 또는 WebP여야 합니다.');
    const e=raw.effect;
    if(!e||typeof e!=='object')throw Error('효과를 선택하세요.');
    let effect;
    if(e.type==='fatigue_change'){
      const amount=Number(e.amount);
      if(!Number.isInteger(amount)||amount===0||amount< -100||amount>100)throw Error('피로도 변화량은 -100~100 사이의 0이 아닌 정수여야 합니다.');
      effect={type:'fatigue_change',amount};
    }else if(e.type==='timed_buff'){
      if(!['speed','arrival','exp'].includes(e.target))throw Error('시간제 버프 종류를 선택하세요.');
      const value=Number(e.value),durationMinutes=Number(e.durationMinutes);
      if(!Number.isFinite(value)||value<=0||value>1000)throw Error('버프 수치는 0보다 크고 1,000 이하여야 합니다.');
      if(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>1000000)throw Error('지속 시간은 1~1,000,000 게임분이어야 합니다.');
      effect={type:'timed_buff',target:e.target,value,durationMinutes};
    }else if(e.type==='remove_debuff'){
      const target=String(e.target??'').trim();
      if(!/^[a-z][a-z0-9_-]{0,63}$/.test(target))throw Error('해제할 디버프 ID를 입력하세요.');
      effect={type:'remove_debuff',target};
    }else throw Error('지원하지 않는 효과 종류입니다.');
    return {id,name,price,icon,effect};
  }
  function validateCatalog(raw) {
    if(!raw||raw.version!==1||!Array.isArray(raw.items)||raw.items.length>500)throw Error('버전 1 상점 아이템 JSON이 아닙니다.');
    const items=raw.items.map(validateItem);
    if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('아이템 ID가 중복됩니다.');
    return {version:1,items};
  }
  function saveLocal() {
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(data));$('save-state').textContent='편집기 로컬 저장됨';}
    catch {$('save-state').textContent='로컬 저장을 사용할 수 없습니다. JSON으로 내보내세요.';}
  }
  function setFeedback(message='',error=false) {
    feedback.textContent=message;
    feedback.style.color=error?'#a24132':'#426f4e';
  }
  function formatEffect(effect) {
    if(!effect)return '';
    if(effect.type==='fatigue_change')return '피로도 '+(effect.amount>0?'+':'')+effect.amount;
    if(effect.type==='timed_buff'){
      const labels={speed:'작업 속도',arrival:'의뢰 도착 확률',exp:'획득 EXP'};
      return (labels[effect.target]||effect.target)+' +'+effect.value+(effect.target==='arrival'?'%p':'%')+' · '+effect.durationMinutes+'게임분';
    }
    if(effect.type==='remove_debuff')return '디버프 해제: '+effect.target;
    return '';
  }
  function iconSource(path) {
    return path?.startsWith('assets/shop/')?'../'+path:'';
  }
  function loadImage(el,src) {
    if(!src){el.removeAttribute('src');el.hidden=true;return;}
    el.hidden=false;
    el.src=src;
  }
  function renderList() {
    list.replaceChildren();
    $('item-count').textContent=String(data.items.length);
    if(!data.items.length){const p=document.createElement('p');p.className='empty-list';p.textContent='등록된 아이템이 없습니다.';list.append(p);}
    for(const item of data.items){
      const button=document.createElement('button');
      button.type='button';button.className='item-entry';
      button.setAttribute('role','listitem');
      button.setAttribute('aria-current',String(selectedId===item.id));
      const src=iconSource(item.icon);
      if(src){
        const img=document.createElement('img');img.src=src;img.alt='';
        img.onerror=()=>{img.replaceWith(document.createElement('span'));};
        button.append(img);
      }else{const blank=document.createElement('span');blank.className='item-placeholder';button.append(blank);}
      const box=document.createElement('span');
      const title=document.createElement('strong');title.textContent=item.name;
      const price=document.createElement('small');price.textContent=won(item.price);
      box.append(title,price);button.append(box);
      button.addEventListener('click',()=>{if(!discardChanges())return;selectItem(item.id);});
      list.append(button);
    }
  }
  function discardChanges() {
    return !dirty||confirm('저장하지 않은 변경을 버릴까요?');
  }
  function selectItem(id) {
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
    selectedId=id;
    draft=id?clone(data.items.find(x=>x.id===id)):null;
    dirty=false;
    renderEditor();
    renderList();
  }
  function newItem() {
    if(!discardChanges())return;
    let n=1;while(data.items.some(x=>x.id==='item-'+String(n).padStart(3,'0')))n++;
    selectedId=null;
    draft={id:'item-'+String(n).padStart(3,'0'),name:'',price:0,icon:'',effect:{type:'fatigue_change',amount:0}};
    dirty=true;
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
    renderEditor();renderList();
    form.elements.namedItem('name').focus();
  }
  function renderEditor() {
    form.hidden=!draft;
    $('delete-button').disabled=!selectedId;
    if(!draft){setFeedback('');renderPreview();return;}
    for(const key of ['id','name','price','icon'])form.elements.namedItem(key).value=draft[key]??'';
    $('effect-type').value=draft.effect.type;
    $('icon-file').value='';
    $('icon-file-name').textContent='';
    renderEffectFields();
    renderPreview();
    setFeedback('');
  }
  function renderEffectFields() {
    if(!draft)return;
    const e=draft.effect;
    if(e.type==='fatigue_change'){
      effectFields.innerHTML='<div class="effect-inputs single"><label>피로도 변화량<input name="amount" type="number" min="-100" max="100" step="1" required></label></div>';
      form.elements.namedItem('amount').value=e.amount??-10;
    }else if(e.type==='timed_buff'){
      effectFields.innerHTML='<div class="effect-inputs"><label>적용 능력<select name="buffTarget"><option value="speed">작업 속도 (%)</option><option value="arrival">의뢰 도착 확률 (%p)</option><option value="exp">획득 EXP (%)</option></select></label><label>버프 수치<input name="buffValue" type="number" min="0.01" max="1000" step="any" required></label><label>지속 시간 (게임분)<input name="durationMinutes" type="number" min="1" max="1000000" step="1" required></label></div>';
      form.elements.namedItem('buffTarget').value=e.target||'speed';
      form.elements.namedItem('buffValue').value=e.value??0;
      form.elements.namedItem('durationMinutes').value=e.durationMinutes??1;
    }else{
      effectFields.innerHTML='<div class="effect-inputs single"><label>해제할 디버프 ID<input name="debuffTarget" placeholder="wrist" required maxlength="64"></label></div>';
      form.elements.namedItem('debuffTarget').value=e.target||'';
    }
  }
  function readDraft() {
    if(!draft)return;
    for(const key of ['id','name','icon'])draft[key]=form.elements.namedItem(key).value.trim();
    draft.price=Number(form.elements.namedItem('price').value);
    const type=$('effect-type').value;
    if(type==='fatigue_change')draft.effect={type,amount:Number(form.elements.namedItem('amount').value)};
    if(type==='timed_buff')draft.effect={type,target:form.elements.namedItem('buffTarget').value,value:Number(form.elements.namedItem('buffValue').value),durationMinutes:Number(form.elements.namedItem('durationMinutes').value)};
    if(type==='remove_debuff')draft.effect={type,target:form.elements.namedItem('debuffTarget').value.trim()};
  }
  function renderPreview() {
    const d=draft;
    $('preview-name').textContent=d?.name||'아이템 이름';
    $('preview-price').textContent=won(d?.price);
    $('preview-effect').textContent=d?formatEffect(d.effect):'';
    const img=$('preview-image'),missing=$('missing-icon');
    img.onerror=()=>{img.hidden=true;missing.hidden=false;missing.textContent='아이콘 없음';};
    const src=previewUrl||iconSource(d?.icon);
    missing.hidden=!!src;
    missing.textContent='아이콘 없음';
    loadImage(img,src);
  }
  function downloadJSON() {
    if(dirty&&!confirm('현재 편집 중인 변경은 JSON에 포함되지 않습니다. 저장된 데이터만 내보낼까요?'))return;
    const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='shop-items.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('save-state').textContent='JSON 파일 내보냄';
  }
  form.addEventListener('input',event=>{
    if(!draft)return;
    if(event.target.name==='effectType')return;
    readDraft();dirty=true;renderPreview();
    if($('form-feedback').textContent)setFeedback('');
  });
  $('effect-type').addEventListener('change',()=>{
    if(!draft)return;
    const type=$('effect-type').value;
    draft.effect=type==='fatigue_change'?{type,amount:0}:type==='timed_buff'?{type,target:'speed',value:0,durationMinutes:1}:{type,target:''};
    dirty=true;renderEffectFields();renderPreview();setFeedback('');
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!draft)return;
    readDraft();
    try {
      const item=validateItem(draft);
      if(data.items.some(x=>x.id===item.id&&x.id!==selectedId))throw Error('동일한 아이템 ID가 이미 있습니다.');
      const index=data.items.findIndex(x=>x.id===selectedId);
      if(index>=0)data.items[index]=item;else data.items.push(item);
      saveLocal();selectItem(item.id);setFeedback('저장했어. 게임 상점에 적용하려면 JSON과 아이콘을 저장소에 반영해야 합니다.');
    }catch(error){setFeedback(error.message,true);}
  });
  $('icon-file').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file||!draft)return;
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'';
    if(!ext||file.size>2*1024*1024){setFeedback('2MB 이하 PNG 또는 WebP만 선택하세요.',true);event.target.value='';return;}
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    previewUrl=URL.createObjectURL(file);
    draft.icon='assets/shop/'+draft.id+'.'+ext;
    form.elements.namedItem('icon').value=draft.icon;
    $('icon-file-name').textContent=file.name;
    dirty=true;renderPreview();
    $('icon-note').textContent='아이콘 경로만 JSON에 기록됩니다. 선택한 원본 이미지를 이 경로로 GitHub에 별도로 올려야 합니다.';
  });
  $('add-button').addEventListener('click',newItem);
  $('delete-button').addEventListener('click',()=>{
    if(!selectedId||!confirm('선택한 아이템을 삭제할까요?'))return;
    data.items=data.items.filter(x=>x.id!==selectedId);
    saveLocal();selectItem(data.items[0]?.id||null);
  });
  $('export-button').addEventListener('click',downloadJSON);
  $('import-button').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>1024*1024)throw Error('JSON 파일은 1MB 이하여야 합니다.');
      const incoming=validateCatalog(JSON.parse(await file.text()));
      if(!confirm('기존 편집기 아이템 목록을 불러온 데이터로 교체할까요?'))return;
      data=incoming;saveLocal();selectItem(data.items[0]?.id||null);
      $('save-state').textContent='JSON 가져오기 완료';
    }catch(error){$('save-state').textContent='가져오기 실패: '+error.message;}
    finally{event.target.value='';}
  });
  $('reset-button').addEventListener('click',()=>{
    if(!confirm('편집기 데이터를 기본 아이템 목록으로 초기화할까요?'))return;
    data=clone(defaults);saveLocal();selectItem(data.items[0]?.id||null);
  });
  async function init() {
    try {
      const response=await fetch('../data/shop-items.json',{cache:'no-store'});
      if(response.ok)defaults=validateCatalog(await response.json());
    }catch {} // 로컬 파일에서 직접 열어도 기본 샘플로 시작합니다.
    try {
      const stored=localStorage.getItem(STORAGE_KEY);
      if(stored)data=validateCatalog(JSON.parse(stored));
      else data=clone(defaults);
    }catch{data=clone(defaults);$('save-state').textContent='로컬 저장 데이터를 읽지 못해 기본 데이터를 표시합니다.';}
    selectItem(data.items[0]?.id||null);
  }
  init();
})();
