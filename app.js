const requestedLetters=new URLSearchParams(location.search).get("letters");const requestedPool=requestedLetters?ITEMS.filter(item=>requestedLetters.includes(item.char)):ITEMS;const pool=requestedPool.length>=2?requestedPool:ITEMS;const ACTIVE_WORDS=WORDS_SOURCE.filter(word=>[...word].every(char=>pool.some(item=>item.char===char)));let index=0,mode='combined',timer=null,target=null,answered=false;
const $=id=>document.getElementById(id),src=(item,type)=>'assets/'+item.id+'-'+type+'.webp';
const stage=$('art').parentElement;$('art').remove();$('glyph').remove();
const pairs=pool.map(item=>{const pair={};for(const kind of ['art','glyph']){const img=new Image();img.src=src(item,kind);img.alt=kind==='art'?item.word:item.char;img.hidden=true;img.decoding='async';stage.append(img);img.decode().catch(()=>{});pair[kind]=img}return pair});
/* 女声6・男声3で収録した音声を再生。音の種類を混同しない。 */
let selectedVoice='female';
try{selectedVoice=localStorage.getItem('hiraganaRecordedVoice')==='male'?'male':'female'}catch(_){/* file: でも動く */}
let currentRecording=null;
let pendingSpeech=null;
let audioPlayToken=0;
const voiceChoice=document.getElementById('voiceChoice');
function updateVoiceInfo(){
  if(voiceChoice) voiceChoice.value=selectedVoice;
  const note=document.getElementById('audioNote');
  if(note)note.textContent='録音音声：'+(selectedVoice==='female'?'女声6':'男声3')+'　｜　声はいつでも切り替えられます';
}
if(voiceChoice){voiceChoice.onchange=()=>{
  selectedVoice=voiceChoice.value==='male'?'male':'female';
  stopRecording();
  try{localStorage.setItem('hiraganaRecordedVoice',selectedVoice)}catch(_){}
  updateVoiceInfo();
};}
updateVoiceInfo();
function stopRecording(){
  audioPlayToken++;
  if(currentRecording){currentRecording.pause();currentRecording.onended=null;currentRecording.onerror=null;currentRecording=null;}
  if('speechSynthesis' in window){window.speechSynthesis.cancel();}
  pendingSpeech=null;
}
function audioKey(text){return [...text].length===1?'kana:'+text:'word:'+text;}
function fallbackRead(text,onDone){
  if(!('speechSynthesis' in window)){const note=document.getElementById('audioNote');if(note)note.textContent='音声を再生できませんでした';return;}
  const u=new SpeechSynthesisUtterance(text);
  u.lang='ja-JP';u.rate=Number(document.getElementById('rate')?.value||1);
  const ja=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ja'));
  if(ja)u.voice=ja;
  u.onend=()=>{if(pendingSpeech===u){pendingSpeech=null;onDone?.()}};
  u.onerror=()=>{if(pendingSpeech===u){pendingSpeech=null;onDone?.()}};
  pendingSpeech=u;
  try{window.speechSynthesis.speak(u)}catch(_){const note=document.getElementById('audioNote');if(note)note.textContent='音声を再生できませんでした';}
}
function playRecordedKeys(keys,quiet=false,rateOverride=null){
  stopRecording();
  const token=audioPlayToken;
  function next(index){
    if(token!==audioPlayToken||index>=keys.length)return;
    const key=keys[index];
    const included=typeof EMBEDDED_RECORDINGS!=='undefined'&&EMBEDDED_RECORDINGS[selectedVoice]?.[key];
    const external=typeof RECORDED_AUDIO!=='undefined'&&RECORDED_AUDIO[selectedVoice]?.[key];
    const filePath=included||external;
    if(!filePath){
      if(!quiet){const note=document.getElementById('audioNote');if(note)note.textContent='録音の対応がありません：'+key;}
      // Do not synthesize a teaching phrase with incorrect words.
      return;
    }
    const player=new Audio(filePath);
    currentRecording=player;
    player.preload='auto';
    player.playbackRate=rateOverride??Number(document.getElementById('rate')?.value||1);
    player.preservesPitch=true;
    player.onended=()=>{if(token===audioPlayToken&&currentRecording===player){currentRecording=null;next(index+1)}};
    const fail=()=>{if(token===audioPlayToken){currentRecording=null;const note=document.getElementById('audioNote');if(note)note.textContent='録音音声を開けませんでした：'+key;}};
    player.onerror=fail;
    player.play().catch(fail);
  }
  next(0);
}
function sayLesson(item){playRecordedKeys(['lesson:'+item.char])}
function say(text,rateOverride=null){
  const chunks=String(text).split(/[。、・]+/).map(s=>s.trim()).filter(Boolean);
  playRecordedKeys(chunks.map(audioKey),false,rateOverride);
}

function playEffect(kind,onDone){
  const key='effect:'+kind;
  const embedded=typeof EMBEDDED_EFFECTS!=='undefined'&&EMBEDDED_EFFECTS[key];
  const sound=new Audio(embedded||'audio/effects/'+kind+'.wav');
  sound.volume=.8;
  if(onDone){let finished=false;const complete=()=>{if(finished)return;finished=true;onDone()};sound.onended=complete;sound.onerror=complete;sound.play().catch(complete)}
  else sound.play().catch(()=>{});
}
/* 三つのゲーム共通の読み上げ設定。声の選択は既存の男声3/女声6に連動。 */
let readCorrectCard=true;
try{readCorrectCard=localStorage.getItem('hiraganaReadCorrect')!=='false'}catch(_){}
function updateCorrectReadToggle(){document.querySelectorAll('.correctReadToggle').forEach(el=>el.checked=readCorrectCard)}
document.querySelectorAll('.correctReadToggle').forEach(el=>el.addEventListener('change',()=>{
  readCorrectCard=el.checked;updateCorrectReadToggle();try{localStorage.setItem('hiraganaReadCorrect',String(readCorrectCard))}catch(_){}
}));
updateCorrectReadToggle();

function stop(){clearTimeout(timer)}
function display(){stop();const item=pool[index];pairs.forEach((pair,i)=>{for(const kind of ['art','glyph']){pair[kind].removeAttribute('id');pair[kind].hidden=i!==index}});for(const kind of ['art','glyph']){pairs[index][kind].id=kind;pairs[index][kind].style.transition='none'};$('word').textContent=item.word+'　「'+item.char+'」';setMode(mode);void stage.offsetHeight;for(const kind of ['art','glyph'])pairs[index][kind].style.transition='';$('letters').updateSelection?.()}
function setMode(m){stop();mode=m;$('art').style.opacity=m==='glyph'?0:1;$('glyph').style.opacity=m==='art'?0:m==='combined'?.7:m==='faint'?.5:1;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('on',b.dataset.mode===m);b.setAttribute('aria-pressed',b.dataset.mode===m)})}
pool.forEach((item,i)=>{const b=document.createElement('button');b.textContent=item.char;b.onclick=()=>{index=i;display()};$('letters').append(b)});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));$('prev').onclick=()=>{index=(index+pool.length-1)%pool.length;display()};$('next').onclick=()=>{index=(index+1)%pool.length;display()};$('speak').onclick=()=>sayLesson(pool[index]);$('fade').onclick=()=>{setMode('combined');let step=0;function tick(){step++;$('art').style.opacity=1-step/5;$('glyph').style.opacity=.7+step*.06;if(step<5)timer=setTimeout(tick,700);else{mode='glyph';setMode('glyph')}}timer=setTimeout(tick,700)};
function showPanel(name){stop();cancelMemory();stopRecording();clearTimeout(pairTimer);clearPairDrag();clearWordDrag();tracePointer=null;for(const panel of ['learn','quiz','match','pairs','trace','words','memory']){$(panel).hidden=panel!==name;$(panel+'Tab').classList.toggle('on',panel===name);$(panel+'Tab').setAttribute('aria-pressed',panel===name)}if(name==='quiz')prepareQuiz();if(name==='match')resetMatch();if(name==='pairs')resetPairs();if(name==='trace'){traceIndex=index;displayTrace()}if(name==='words')prepareWords();if(name==='memory')resetMemory()}
$('learnTab').onclick=()=>showPanel('learn');$('quizTab').onclick=()=>showPanel('quiz');$('matchTab').onclick=()=>showPanel('match');
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
let quizImageMode=null;
function newQuestion(){target=pool[Math.floor(Math.random()*pool.length)];answered=false;$('result').textContent='';$('result').classList.remove('correct');$('options').style.setProperty('--choices',$('choiceCount').value);$('qNext').hidden=true;applyQuizImageMode();$('hintart').src=src(target,'art');$('options').replaceChildren();let choices=shuffle([target,...shuffle(pool.filter(x=>x!==target)).slice(0,Number($('choiceCount').value)-1)]);choices.forEach(item=>{const b=document.createElement('button');b.setAttribute('aria-label',item.char);const img=document.createElement('img');img.src=src(item,'quiz');img.alt=item.char;b.append(img);b.onclick=()=>{if(answered)return;$('options').querySelectorAll('.wrongCross').forEach(x=>x.remove());if(item===target){answered=true;$('result').textContent='せいかい！';$('result').classList.add('correct');$('qNext').hidden=false;correctSound();b.insertAdjacentHTML('beforeend','<svg class="correctCircle" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43"/></svg>')}else{$('result').textContent='もういちどえらぼう';wrongSound();b.insertAdjacentHTML('beforeend','<svg class="wrongCross" viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76M76 24 24 76"/></svg>')}};$('options').append(b)});say(target.char)}
$('qSound').onclick=()=>{if(target)say($('hintpic').hidden?target.char:target.char)};$('qHint').onclick=()=>{if(quizImageMode===null)return;quizImageMode=!quizImageMode;applyQuizImageMode()};$('qNext').onclick=newQuestion;display();

$('appear').onclick=()=>{setMode('art');let step=0;function tick(){step++;$('glyph').style.opacity=.7*step/10;if(step<10)timer=setTimeout(tick,300);else setMode('combined')}timer=setTimeout(tick,300)};

$('toArt').onclick=()=>{setMode('glyph');let step=0;function tick(){step++;$('art').style.opacity=step/10;$('glyph').style.opacity=1-.5*step/10;if(step<10)timer=setTimeout(tick,300);else setMode('faint')}timer=setTimeout(tick,300)};

$('choiceCount').onchange=prepareQuiz;
function correctSound(item=null,panel=null){
  if(item&&panel&&readCorrectCard){
    playEffect('correct',()=>{if(!$(panel).hidden&&readCorrectCard)sayLesson(item)});
  } else playEffect('correct');
}
pool.forEach(item=>{const im=new Image();im.src=src(item,'quiz');im.decode().catch(()=>{})});

function wrongSound(){playEffect('wrong')}
function prepareQuiz(){stopRecording();target=null;answered=false;quizImageMode=null;$('options').replaceChildren();applyQuizImageMode();$('result').textContent='絵あり・絵なしをえらんでね';$('result').classList.remove('correct');$('qNext').hidden=true;$('quizModeChooser').hidden=false;$('qStart').hidden=true;$('qSound').disabled=true;$('qHint').disabled=true}
function setQuizInitialMode(withImage){quizImageMode=withImage;applyQuizImageMode();$('quizModeChooser').hidden=true;$('qStart').hidden=false;$('result').textContent='▶ を押してはじめよう'}
$('quizWithImage').onclick=()=>setQuizInitialMode(true);
$('quizWithoutImage').onclick=()=>setQuizInitialMode(false);
function applyQuizImageMode(){const visible=quizImageMode===true;$('hintpic').hidden=!visible||!target;$('qHint').classList.toggle('on',visible);$('qHint').setAttribute('aria-pressed',String(visible));$('qHint').setAttribute('aria-label',visible?'絵を消す':'絵を出す');$('qHint').title=visible?'絵を消す':'絵を出す'}
$('qStart').onclick=()=>{if(quizImageMode===null)return;$('qStart').hidden=true;$('qSound').disabled=false;$('qHint').disabled=false;newQuestion()};

let matchIndex=0,matchSolved=false,matchOffset={x:0,y:0},drag=null;
const matchPiece=$('matchPiece'),matchBoard=$('matchBoard');
/* 「おぼえる」と全く同じ800×800のglyph画像を同一サイズで使う。
   動かす間はそのキャンバス全体を移動し、完成時はoffset=0へ戻す。 */
const MATCH_TARGET_RADIUS=.22;
function paintMatch(){matchPiece.style.transform=`translate(${matchOffset.x*100}%,${matchOffset.y*100}%)`}
function resetMatch(){
  if($('matchSelect'))$('matchSelect').value=matchIndex;
  drag=null;matchSolved=false;
  const item=pool[matchIndex];
  $('matchArt').src=src(item,'art');$('matchArt').alt=item.word;
  $('matchGuide').src=src(item,'glyph');$('matchGuide').hidden=true;
  $('matchHint').setAttribute('aria-pressed','false');$('matchHint').classList.remove('on');
  matchPiece.src=src(item,'glyph');matchPiece.alt=item.char;
  matchPiece.style.width='100%';matchPiece.style.height='100%';
  matchPiece.style.opacity='.7';matchPiece.setAttribute('aria-label',item.char+'を動かして絵に重ねる');
  const b=MATCH_BOUNDS[item.id];
  const direction=b.x+b.w/2<.5?1:-1;
  matchOffset={x:direction*.27,y:b.y+b.h/2<.55?.18:-.18};paintMatch();
  $('matchCircle').hidden=true;
  $('matchInstruction').textContent='文字をうごかして、絵にかさねよう';$('matchInstruction').classList.remove('solved');
  [...$('matchLetters').children].forEach((button,i)=>{button.classList.toggle('on',i===matchIndex);button.setAttribute('aria-pressed',i===matchIndex)});
}
function constrainMatch(x,y){matchOffset={x:Math.max(-.55,Math.min(.55,x)),y:Math.max(-.55,Math.min(.55,y))};paintMatch()}
function finishMatch(){
  if(Math.hypot(matchOffset.x,matchOffset.y)>MATCH_TARGET_RADIUS)return;
  matchOffset={x:0,y:0};paintMatch();matchSolved=true;
  matchPiece.style.opacity='.7';$('matchCircle').hidden=false;
  $('matchGuide').hidden=true;$('matchInstruction').textContent='ぴったり！';
  $('matchInstruction').classList.add('solved');correctSound(pool[matchIndex],'match');
}
/* 透明な絵の余白をつかんでも、指で動かしやすいようにボードで操作を受ける。 */
matchPiece.style.pointerEvents='none';
matchBoard.onpointerdown=e=>{
  if(matchSolved||drag||e.target.closest('button'))return;
  const board=matchBoard.getBoundingClientRect(),b=MATCH_BOUNDS[pool[matchIndex].id];
  const x=(e.clientX-board.left)/board.width,y=(e.clientY-board.top)/board.height;
  const cx=b.x+b.w/2+matchOffset.x,cy=b.y+b.h/2+matchOffset.y;
  if(Math.hypot(x-cx,y-cy)>.55)return;
  e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:matchOffset.x,startY:matchOffset.y,size:board.width};
  matchBoard.setPointerCapture(e.pointerId);
};
matchBoard.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  e.preventDefault();constrainMatch(drag.startX+(e.clientX-drag.x)/drag.size,drag.startY+(e.clientY-drag.y)/drag.size);
};
matchBoard.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;finishMatch()};
matchBoard.onpointercancel=()=>{drag=null};
matchPiece.onkeydown=e=>{
  if(matchSolved)return;
  const moves={ArrowLeft:[-.035,0],ArrowRight:[.035,0],ArrowUp:[0,-.035],ArrowDown:[0,.035]};
  if(moves[e.key]){e.preventDefault();const [x,y]=moves[e.key];constrainMatch(matchOffset.x+x,matchOffset.y+y);finishMatch()}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();finishMatch()}
};
pool.forEach((item,i)=>{const button=document.createElement('button');button.textContent=item.char;button.onclick=()=>{matchIndex=i;resetMatch()};$('matchLetters').append(button);const im=new Image();im.src=src(item,'glyph');im.decode().catch(()=>{})});
$('matchReset').onclick=resetMatch;$('matchPrev').onclick=()=>{matchIndex=(matchIndex+pool.length-1)%pool.length;resetMatch()};$('matchNext').onclick=()=>{matchIndex=(matchIndex+1)%pool.length;resetMatch()};$('matchHint').onclick=()=>{if(matchSolved)return;$('matchGuide').hidden=!$('matchGuide').hidden;$('matchHint').classList.toggle('on',!$('matchGuide').hidden);$('matchHint').setAttribute('aria-pressed',!$('matchGuide').hidden)};$('matchSound').onclick=()=>sayLesson(pool[matchIndex]);


let pairFound=0,pairTimer=null,pairTotal=3,pairDrag=null;
$('pairsTab').onclick=()=>showPanel('pairs');
function pairMark(button,good){button.insertAdjacentHTML('beforeend',good?'<svg class="pairMark good" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43"/></svg>':'<svg class="pairMark bad" viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76M76 24 24 76"/></svg>')}
function clearPairDrag(){if(!pairDrag)return;pairDrag.ghost.remove();pairDrag.button.classList.remove('dragging');pairDrag=null;$('pairGlyphs').querySelectorAll('.dropReady').forEach(card=>card.classList.remove('dropReady'))}
function pairDropTarget(x,y){return [...$('pairGlyphs').children].filter(card=>!card.disabled).map(card=>({card,rect:card.getBoundingClientRect()})).filter(({rect:r})=>x>=r.left-12&&x<=r.right+12&&y>=r.top-12&&y<=r.bottom+12).sort((a,b)=>Math.hypot(x-(a.rect.left+a.rect.right)/2,y-(a.rect.top+a.rect.bottom)/2)-Math.hypot(x-(b.rect.left+b.rect.right)/2,y-(b.rect.top+b.rect.bottom)/2))[0]?.card||null}
function attachPair(source,target,item){target.querySelectorAll('.pairMark').forEach(mark=>mark.remove());if(target.dataset.itemId!==item.id){pairMark(target,false);wrongSound();$('pairStatus').textContent='もういちど、うごかしてみよう';clearTimeout(pairTimer);pairTimer=setTimeout(()=>{$('pairGlyphs').querySelectorAll('.pairMark.bad').forEach(mark=>mark.remove());$('pairStatus').textContent=pairFound+' / '+pairTotal+' ペア'},900);return false}
source.disabled=true;source.classList.add('joinedSource');target.disabled=true;target.classList.add('matched');const joined=document.createElement('div');joined.className='joinedImages';for(const kind of ['art','quiz']){const im=new Image();im.src=src(item,kind);im.alt=kind==='art'?item.word:item.char;joined.append(im)}target.replaceChildren(joined);target.setAttribute('aria-label',item.word+'と'+item.char+'のペア、正解');pairMark(target,true);pairFound++;clearTimeout(pairTimer);$('pairStatus').textContent=pairFound===pairTotal?'ぜんぶくっついた！':pairFound+' / '+pairTotal+' ペア';$('pairStatus').classList.toggle('complete',pairFound===pairTotal);correctSound(item,'pairs');return true}
function resetPairs(){clearPairDrag();clearTimeout(pairTimer);pairTimer=null;pairFound=0;pairTotal=Number($('pairCount').value);$('pairBoard').style.setProperty('--pairCount',pairTotal);$('pairStatus').textContent='0 / '+pairTotal+' ペア';$('pairStatus').classList.remove('complete');const selected=shuffle([...pool]).slice(0,pairTotal);for(const kind of ['art','glyph']){const row=$(kind==='art'?'pairArts':'pairGlyphs');row.replaceChildren();row.style.setProperty('--pairCount',pairTotal);shuffle([...selected]).forEach(item=>{const button=document.createElement('button'),img=new Image();button.className='pairCard';button.dataset.itemId=item.id;button.setAttribute('aria-label',kind==='art'?item.word+'の絵を動かす':item.char+'の文字カード');img.src=src(item,kind==='art'?'art':'quiz');img.alt=kind==='art'?item.word:item.char;img.draggable=false;button.append(img);
if(kind==='art'){button.onpointerdown=e=>{if(button.disabled||pairDrag)return;e.preventDefault();const r=button.getBoundingClientRect(),ghost=new Image();ghost.src=src(item,'art');ghost.className='pairGhost';ghost.alt='';ghost.style.width=r.width+'px';ghost.style.height=r.height+'px';ghost.style.left=r.left+'px';ghost.style.top=r.top+'px';document.body.append(ghost);pairDrag={id:e.pointerId,button,item,ghost,offsetX:e.clientX-r.left,offsetY:e.clientY-r.top};button.classList.add('dragging');button.setPointerCapture(e.pointerId)};
button.onpointermove=e=>{if(!pairDrag||pairDrag.id!==e.pointerId||pairDrag.button!==button)return;e.preventDefault();pairDrag.ghost.style.left=e.clientX-pairDrag.offsetX+'px';pairDrag.ghost.style.top=e.clientY-pairDrag.offsetY+'px';const candidate=pairDropTarget(e.clientX,e.clientY);[...$('pairGlyphs').children].forEach(card=>card.classList.toggle('dropReady',card===candidate))};
button.onpointerup=e=>{if(!pairDrag||pairDrag.id!==e.pointerId||pairDrag.button!==button)return;const target=pairDropTarget(e.clientX,e.clientY);clearPairDrag();if(target)attachPair(button,target,item)};button.onpointercancel=clearPairDrag;button.onlostpointercapture=()=>{if(pairDrag?.button===button)clearPairDrag()};
button.onkeydown=e=>{if(button.disabled)return;const target=[...$('pairGlyphs').children].find(card=>!card.disabled&&card.dataset.itemId===item.id);if(e.key==='ArrowDown'&&target){e.preventDefault();const ghost=new Image();ghost.remove=()=>{};pairDrag={button,item,ghost};$('pairGlyphs').children[0]?.focus()}};
}else{button.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&pairDrag&&!button.disabled){e.preventDefault();const moving=pairDrag;clearPairDrag();attachPair(moving.button,button,moving.item)}}}
row.append(button)})}}
$('pairCount').onchange=resetPairs;$('pairReset').onclick=resetPairs;

let traceIndex=0,tracePointer=null,traceCurrent=null,traceArtVisible=true,traceGlyphVisible=true;
const traceCanvas=$('traceCanvas'),traceCtx=traceCanvas.getContext('2d'),traceStates=new Map();
function traceState(){const id=pool[traceIndex].id;if(!traceStates.has(id))traceStates.set(id,{strokes:[],history:[]});return traceStates.get(id)}
function rememberTrace(){const state=traceState();state.history.push(state.strokes.map(stroke=>stroke.map(point=>({...point}))));if(state.history.length>50)state.history.shift()}
function drawTraceStroke(points){if(!points.length)return;traceCtx.strokeStyle='#df3b3b';traceCtx.fillStyle='#df3b3b';traceCtx.lineWidth=16;traceCtx.lineCap='round';traceCtx.lineJoin='round';if(points.length===1){traceCtx.beginPath();traceCtx.arc(points[0].x,points[0].y,8,0,Math.PI*2);traceCtx.fill();return}traceCtx.beginPath();traceCtx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)traceCtx.lineTo(points[i].x,points[i].y);traceCtx.stroke()}
function redrawTrace(){traceCtx.clearRect(0,0,1000,1000);traceState().strokes.forEach(drawTraceStroke);$('traceUndo').disabled=!traceState().history.length;$('traceClear').disabled=!traceState().strokes.length}
function displayTrace(){if($('traceSelect'))$('traceSelect').value=traceIndex;tracePointer=null;traceCurrent=null;const item=pool[traceIndex];$('traceArt').src=src(item,'art');$('traceArt').alt=item.word;$('traceGlyph').src=src(item,'trace');$('traceGlyph').alt=item.char;$('traceArt').hidden=!traceArtVisible;$('traceGlyph').hidden=!traceGlyphVisible;for(const [id,visible] of [['traceArtToggle',traceArtVisible],['traceGlyphToggle',traceGlyphVisible]]){$(id).classList.toggle('on',visible);$(id).setAttribute('aria-pressed',visible)}[...$('traceLetters').children].forEach((b,i)=>{b.classList.toggle('on',i===traceIndex);b.setAttribute('aria-pressed',i===traceIndex)});redrawTrace()}
function tracePoint(e){const r=traceCanvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1000,(e.clientX-r.left)/r.width*1000)),y:Math.max(0,Math.min(1000,(e.clientY-r.top)/r.height*1000))}}
traceCanvas.onpointerdown=e=>{if(tracePointer!==null)return;e.preventDefault();tracePointer=e.pointerId;traceCanvas.setPointerCapture(e.pointerId);rememberTrace();traceCurrent=[tracePoint(e)];traceState().strokes.push(traceCurrent);drawTraceStroke(traceCurrent);$('traceUndo').disabled=false;$('traceClear').disabled=false};
traceCanvas.onpointermove=e=>{if(tracePointer!==e.pointerId||!traceCurrent)return;e.preventDefault();const events=e.getCoalescedEvents?.()||[e];for(const event of events){const point=tracePoint(event),last=traceCurrent[traceCurrent.length-1];if(Math.hypot(point.x-last.x,point.y-last.y)<1)continue;traceCurrent.push(point);drawTraceStroke([last,point])}};
function endTrace(e){if(tracePointer!==e.pointerId)return;if(e.type==='pointerup')traceCanvas.onpointermove(e);tracePointer=null;traceCurrent=null}traceCanvas.onpointerup=endTrace;traceCanvas.onpointercancel=endTrace;traceCanvas.onlostpointercapture=()=>{tracePointer=null;traceCurrent=null};
pool.forEach((item,i)=>{const b=document.createElement('button');b.textContent=item.char;b.onclick=()=>{traceIndex=i;displayTrace()};$('traceLetters').append(b)});
$('traceTab').onclick=()=>showPanel('trace');$('traceArtToggle').onclick=()=>{traceArtVisible=!traceArtVisible;displayTrace()};$('traceGlyphToggle').onclick=()=>{traceGlyphVisible=!traceGlyphVisible;displayTrace()};$('traceUndo').onclick=()=>{const state=traceState();if(state.history.length){state.strokes=state.history.pop();redrawTrace()}};$('traceClear').onclick=()=>{if(!traceState().strokes.length)return;rememberTrace();traceState().strokes=[];redrawTrace()};$('traceSound').onclick=()=>sayLesson(pool[traceIndex]);$('tracePrev').onclick=()=>{traceIndex=(traceIndex+pool.length-1)%pool.length;displayTrace()};$('traceNext').onclick=()=>{traceIndex=(traceIndex+1)%pool.length;displayTrace()};

let wordList=ACTIVE_WORDS.filter(word=>word.length===2);
/* WORD_ART defined by word-images.js using the 194 original picture files. */
function displayWordArt(){const path=WORD_ART[wordList[wordIndex]];$('wordArt').hidden=!path;if(path){$('wordArt').src=path;$('wordArt').alt=wordList[wordIndex]}}let wordIndex=0,wordSlots=[],wordSolved=false,wordDrag=null;
$('wordsTab').onclick=()=>showPanel('words');
function wordItem(char){return pool.find(item=>item.char===char)}
function clearWordDrag(){if(!wordDrag)return;wordDrag.ghost.remove();wordDrag.button.classList.remove('dragging');wordDrag=null;$('wordSlots').querySelectorAll('.dropReady').forEach(button=>button.classList.remove('dropReady'))}
function prepareWords(){clearWordDrag();$('wordStart').hidden=false;$('wordStart').disabled=!wordList.length;$('wordGame').hidden=true;$('wordInstruction').textContent=wordList.length?'▶ を押して、音を聞こう':'この文字数のことばがありません。文字数や使う文字を変えてね';$('wordProgress').textContent=wordList.length+'問'}
function drawWordSlots(){const row=$('wordSlots');row.replaceChildren();wordSlots.forEach((char,i)=>{const button=document.createElement('button');button.className='wordSlot'+(char?' filled':'');button.setAttribute('aria-label',(i+1)+'文字目'+(char?'、'+char:''));if(char){const im=new Image();im.src=src(wordItem(char),'quiz');im.alt=char;button.append(im);bindWordDrag(button,char,i)}button.onclick=()=>{if(!wordSolved&&wordSlots[i]){wordSlots[i]=null;drawWordSlots();$('wordResult').textContent=''}};row.append(button)});$('wordCheck').disabled=wordSolved||wordSlots.some(char=>!char)}
function startWord(playSound=true){clearWordDrag();$('wordProgress').textContent=(wordIndex+1)+' / '+wordList.length+'問';wordSolved=false;wordSlots=Array(wordList[wordIndex].length).fill(null);displayWordArt();$('wordInstruction').textContent='タップ・スワイプ・ドラッグで、ことばをつくろう';$('wordStart').hidden=true;$('wordGame').hidden=false;$('wordHintRow').hidden=true;$('wordHint').classList.remove('on');$('wordHint').setAttribute('aria-pressed','false');$('wordNext').hidden=true;$('wordResult').textContent='';$('wordResult').classList.remove('correct');drawWordSlots();$('wordHintRow').replaceChildren();for(const char of wordList[wordIndex]){const im=new Image();im.src=src(wordItem(char),'quiz');im.alt=char;$('wordHintRow').append(im)}$('wordBank').replaceChildren();const required=[...new Set([...wordList[wordIndex]])].map(wordItem);const bank=shuffle([...required,...shuffle(pool.filter(item=>!required.includes(item))).slice(0,5-required.length)]);bank.forEach(item=>{const button=document.createElement('button'),im=new Image();button.className='wordTile';button.dataset.char=item.char;button.setAttribute('aria-label',item.char+'をタップ・スワイプ・ドラッグ');im.src=src(item,'quiz');im.alt=item.char;button.append(im);bindWordDrag(button,item.char,null);button.onclick=()=>{if(wordSolved)return;const at=wordSlots.indexOf(null);if(at>=0){wordSlots[at]=item.char;drawWordSlots();$('wordResult').textContent=''}};$('wordBank').append(button)});if(playSound)say(wordList[wordIndex])}
function wordDropTarget(x,y){return [...$('wordSlots').children].map((button,i)=>({button,i,r:button.getBoundingClientRect()})).filter(({r})=>x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8).sort((a,b)=>Math.abs(x-(a.r.left+a.r.right)/2)-Math.abs(x-(b.r.left+b.r.right)/2))[0]||null}
function putWord(char,from,to){if(wordSolved)return;if(to!==null){const old=wordSlots[to];wordSlots[to]=char;if(from!==null&&from!==to)wordSlots[from]=old}else if(from!==null)wordSlots[from]=null;drawWordSlots();$('wordResult').textContent=''}
function bindWordDrag(button,char,from){
 let ignoreClick=false;
 button.addEventListener('click',e=>{if(ignoreClick){e.preventDefault();e.stopImmediatePropagation();ignoreClick=false}},true);
 button.onpointerdown=e=>{
   if(wordSolved||wordDrag)return;
   e.preventDefault();ignoreClick=false;
   const r=button.getBoundingClientRect(),ghost=new Image();
   ghost.src=src(wordItem(char),'quiz');ghost.className='pairGhost';ghost.style.pointerEvents='none';
   ghost.style.width=r.width+'px';ghost.style.height=r.height+'px';ghost.style.left=r.left+'px';ghost.style.top=r.top+'px';
   document.body.append(ghost);
   wordDrag={button,char,from,ghost,id:e.pointerId,x:e.clientX,y:e.clientY,offsetX:e.clientX-r.left,offsetY:e.clientY-r.top,swipeChars:[char],visited:new Set([button]),moved:false};
   button.classList.add('dragging');button.setPointerCapture(e.pointerId);
 };
 button.onpointermove=e=>{
   if(!wordDrag||wordDrag.button!==button||wordDrag.id!==e.pointerId)return;
   e.preventDefault();
   const d=wordDrag;
   if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)d.moved=true;
   d.ghost.style.left=e.clientX-d.offsetX+'px';d.ghost.style.top=e.clientY-d.offsetY+'px';
   const target=wordDropTarget(e.clientX,e.clientY);
   [...$('wordSlots').children].forEach((slot,i)=>slot.classList.toggle('dropReady',target?.i===i));
   // A sweep across two or more candidate tiles enters letters in visited order.
   if(from===null&&!target){
     const tile=document.elementFromPoint(e.clientX,e.clientY)?.closest('.wordTile');
     if(tile&&$('wordBank').contains(tile)&&!d.visited.has(tile)){
       d.visited.add(tile);d.swipeChars.push(tile.dataset.char);
       tile.classList.add('swipeVisited');
     }
   }
 };
 button.onpointerup=e=>{
   if(!wordDrag||wordDrag.button!==button||wordDrag.id!==e.pointerId)return;
   const d=wordDrag,slot=wordDropTarget(e.clientX,e.clientY),hasSwipe=from===null&&d.swipeChars.length>1;
   [...$('wordBank').querySelectorAll('.swipeVisited')].forEach(t=>t.classList.remove('swipeVisited'));
   clearWordDrag();
   if(hasSwipe&&!slot){
     ignoreClick=true;
     const spaces=wordSlots.filter(value=>value===null).length;const sweep=d.swipeChars.length>spaces?[d.swipeChars[0],...d.swipeChars.slice(-(spaces-1))]:d.swipeChars;
     for(const c of sweep){const empty=wordSlots.indexOf(null);if(empty<0)break;wordSlots[empty]=c}
     drawWordSlots();$('wordResult').textContent='';return;
   }
   if(slot){ignoreClick=true;putWord(d.char,d.from,slot.i)}
   else if(d.moved){ignoreClick=true}
 };
 button.onpointercancel=()=>{[...$('wordBank').querySelectorAll('.swipeVisited')].forEach(t=>t.classList.remove('swipeVisited'));clearWordDrag()};
 button.onlostpointercapture=()=>{if(wordDrag?.button===button)clearWordDrag()};
}
function checkWord(){if(wordSolved||wordSlots.some(char=>!char))return;wordSolved=wordSlots.join('')===wordList[wordIndex];$('wordResult').textContent=wordSolved?'せいかい！':'もういちど、ならべてみよう';$('wordResult').classList.toggle('correct',wordSolved);[...$('wordSlots').children].forEach((button,i)=>{const letterCorrect=wordSlots[i]===wordList[wordIndex][i];button.classList.remove('correct','wrong');button.querySelectorAll('.wordMark').forEach(mark=>mark.remove());button.classList.add(letterCorrect?'correct':'wrong');button.insertAdjacentHTML('beforeend',letterCorrect?'<svg class="wordMark good" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43"/></svg>':'<svg class="wordMark bad" viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76M76 24 24 76"/></svg>')});if(wordSolved){correctSound();$('wordNext').hidden=false;$('wordCheck').disabled=true}else wrongSound()}
$('wordStart').onclick=()=>{wordList=shuffle([...wordList]);wordIndex=0;startWord()};$('wordLength').onchange=()=>{wordList=ACTIVE_WORDS.filter(word=>$('wordLength').value==='all'||word.length===Number($('wordLength').value));wordIndex=0;prepareWords()};$('wordSound').onclick=()=>say(wordList[wordIndex]);$('wordSlow').onclick=()=>say(wordList[wordIndex],.72);$('wordHint').onclick=()=>{$('wordHintRow').hidden=!$('wordHintRow').hidden;$('wordHint').classList.toggle('on',!$('wordHintRow').hidden);$('wordHint').setAttribute('aria-pressed',!$('wordHintRow').hidden)};$('wordReset').onclick=()=>startWord(false);$('wordCheck').onclick=checkWord;$('wordNext').onclick=()=>{wordIndex=(wordIndex+1)%wordList.length;startWord()};

/* おぼえる：行と文字を左にまとめた二段階選択（枠内のみスクロール） */
const learnColumns=[['あ','あいうえお'],['か','かきくけこ'],['さ','さしすせそ'],['た','たちつてと'],['な','なにぬねの'],['は','はひふへほ'],['ま','まみむめも'],['や','やゆよ'],['ら','らりるれろ'],['わ','わをん']];
function buildLearnChooser(){
  const root=$('letters');root.replaceChildren();root.classList.add('learnChooser');
  const layout=$('learn').querySelector('.layout');layout.prepend(root);
  const rows=document.createElement('div');rows.className='learnRowChoices';rows.setAttribute('aria-label','行を選ぶ');root.append(rows);
  let col=learnColumns.findIndex(([,str])=>str.includes(pool[index].char));if(col<0)col=0;
  const draw=()=>{
    rows.replaceChildren();
    learnColumns.forEach(([name,letters],i)=>{
      if(![...letters].some(ch=>pool.some(it=>it.char===ch)))return;
      const unit=document.createElement('div');unit.className='learnRowUnit';
      const b=document.createElement('button');b.textContent=name+'行';b.className='learnRowButton'+(i===col?' on':'');
      b.setAttribute('aria-pressed',String(i===col));b.onclick=()=>{col=i;draw()};unit.append(b);
      if(i===col){
        const chars=document.createElement('div');chars.className='learnCharChoices';chars.setAttribute('aria-label',name+'行の文字');
        [...letters].forEach(ch=>{
          const pos=pool.findIndex(it=>it.char===ch);if(pos<0)return;
          const choice=document.createElement('button');choice.textContent=ch;choice.className=pos===index?'on':'';
          choice.setAttribute('aria-pressed',String(pos===index));choice.onclick=()=>{index=pos;display();draw()};chars.append(choice);
        });unit.append(chars);
      }
      rows.append(unit);
    });
  };
  root.updateSelection=()=>{const next=learnColumns.findIndex(([,letters])=>letters.includes(pool[index].char));if(next>=0)col=next;draw()};
  draw();
}
buildLearnChooser();
function compactLetterMenu(container,id,getIndex,onChange){const row=$(container);row.replaceChildren();const label=document.createElement('label');label.textContent='文字を選ぶ ';const menu=document.createElement('select');menu.id=id;menu.setAttribute('aria-label','文字を選ぶ');pool.forEach((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=item.char+'　'+item.word;menu.append(option)});menu.value=getIndex();menu.onchange=()=>onChange(Number(menu.value));label.append(menu);row.append(label)}
compactLetterMenu('matchLetters','matchSelect',()=>matchIndex,i=>{matchIndex=i;resetMatch()});compactLetterMenu('traceLetters','traceSelect',()=>traceIndex,i=>{traceIndex=i;displayTrace()});
