(() => {
  'use strict';
  const GRID=24;
  const PALETTE=['#111827','#ffffff','#ff4d6d','#ff8c42','#ffd166','#63e06f','#42d6c7','#3aa7ff','#5865f2','#9b5de5','#f15bb5','#8b5e3c'];
  const ATTR={fire:'炎',water:'水',nature:'草',bolt:'雷',dark:'闇',light:'光',neutral:'無'};
  const ADV={fire:'nature',nature:'water',water:'fire',bolt:'water',dark:'light',light:'dark'};
  const PREFIX=['ネオ','ギガ','クロノ','ヴォイド','ルミナ','グリム','ゼータ','アストラ','ボルト','マグナ','ミラ','ゼノ'];
  const SUFFIX=['レックス','モール','ビット','ファング','ノヴァ','ギア','ゴン','リーパー','バード','スライム','コア','ナイト'];
  const state={screen:'title',grid:blankGrid(),color:PALETTE[0],tool:'pen',undo:[],enemy:null,lastMonster:null,stage:1,profile:load('pf_profile',{name:'PLAYER',rating:1200,wins:0,losses:0,streak:0}),collection:load('pf_collection',[]),peer:null,conn:null,isHost:false,room:null,remoteMonster:null,ready:false};
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
  function save(){localStorage.setItem('pf_profile',JSON.stringify(state.profile));localStorage.setItem('pf_collection',JSON.stringify(state.collection.slice(-40)))}
  function blankGrid(){return Array.from({length:GRID},()=>Array(GRID).fill(null))}
  function cloneGrid(g){return g.map(r=>r.slice())}
  function hashString(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let a=typeof seed==='number'?seed:hashString(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function pick(r,a){return a[Math.floor(r()*a.length)]}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700)}
  function buzz(ms=25){if(navigator.vibrate)navigator.vibrate(ms)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function init(){
    $('#playerNameInput').value=state.profile.name; updateProfileUI(); buildPalette(); bindNav(); bindDraw(); bindBattle(); bindOnline(); bindMisc();
    state.enemy=generateEnemy('stage-'+Date.now(),0); renderEnemy(); renderCollection(); renderRanking(); seedTitleMonsters();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  function bindNav(){
    $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go)); $('#homeBtn').onclick=()=>go('title');
    $('#saveNameBtn').onclick=()=>{const n=$('#playerNameInput').value.trim().toUpperCase().replace(/[^A-Z0-9ぁ-んァ-ヶ一-龠ー_\-]/g,'').slice(0,12)||'PLAYER';state.profile.name=n;save();updateProfileUI();toast('名前を保存しました')}
  }
  function go(name){$$('.screen').forEach(s=>s.classList.remove('active'));$('#screen-'+name).classList.add('active');state.screen=name;scrollTo(0,0);if(name==='collection')renderCollection();if(name==='ranking')renderRanking()}
  function updateProfileUI(){$('#playerNameTop').textContent=state.profile.name;$('#ratingTop').textContent=state.profile.rating;$('#onlineMeName').textContent=state.profile.name}
  function buildPalette(){const p=$('#palette');PALETTE.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch'+(i===0?' active':'');b.style.background=c;b.title=c;b.onclick=()=>{state.color=c;$$('.swatch').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.tool='pen';syncTools()};p.appendChild(b)})}
  function syncTools(){$$('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===state.tool))}
  function bindDraw(){
    const c=$('#drawCanvas');
    $$('.tool[data-tool]').forEach(b=>b.onclick=()=>{state.tool=b.dataset.tool;syncTools()});
    $('#undoBtn').onclick=()=>{if(state.undo.length){state.grid=state.undo.pop();renderDraw()}};
    $('#clearBtn').onclick=()=>{pushUndo();state.grid=blankGrid();renderDraw()};
    $('#randomDrawBtn').onclick=()=>{pushUndo();state.grid=generateSprite('draft-'+Date.now(),0.35).grid;renderDraw();toast('自動下書きを生成')};
    let drawing=false,last=null;
    const pos=e=>{const r=c.getBoundingClientRect();return{x:clamp(Math.floor((e.clientX-r.left)/r.width*GRID),0,GRID-1),y:clamp(Math.floor((e.clientY-r.top)/r.height*GRID),0,GRID-1)}};
    c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture(e.pointerId);drawing=true;pushUndo();const p=pos(e);applyTool(p.x,p.y);last=p});
    c.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=pos(e);if(state.tool==='fill')return;drawLine(last,p,(x,y)=>applyTool(x,y,false));last=p});
    const end=()=>{drawing=false;last=null};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
    renderDraw();
  }
  function pushUndo(){state.undo.push(cloneGrid(state.grid));if(state.undo.length>30)state.undo.shift()}
  function applyTool(x,y,render=true){if(state.tool==='fill'){flood(x,y,state.color)}else state.grid[y][x]=state.tool==='erase'?null:state.color;if(render)renderDraw()}
  function flood(x,y,newC){const old=state.grid[y][x];if(old===newC)return;const q=[[x,y]],seen=new Set;while(q.length){const [cx,cy]=q.pop(),k=cx+','+cy;if(seen.has(k)||cx<0||cy<0||cx>=GRID||cy>=GRID||state.grid[cy][cx]!==old)continue;seen.add(k);state.grid[cy][cx]=newC;q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1])}renderDraw()}
  function drawLine(a,b,fn){let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;while(true){fn(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}renderDraw()}
  function renderGrid(canvas,g,bg='#0f1622',showGrid=false){const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const w=canvas.width/GRID,h=canvas.height/GRID;ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){if(g[y][x]){ctx.fillStyle=g[y][x];ctx.fillRect(Math.floor(x*w),Math.floor(y*h),Math.ceil(w),Math.ceil(h))}}if(showGrid){ctx.strokeStyle='rgba(20,30,45,.08)';ctx.lineWidth=1;for(let i=0;i<=GRID;i++){ctx.beginPath();ctx.moveTo(i*w,0);ctx.lineTo(i*w,canvas.height);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*h);ctx.lineTo(canvas.width,i*h);ctx.stroke()}}}
  function renderDraw(){renderGrid($('#drawCanvas'),state.grid,'#f4f6ee',true);const n=state.grid.flat().filter(Boolean).length;$('#inkMeter').textContent='INK '+Math.round(n/(GRID*GRID)*100)+'%';$('#drawHint').classList.toggle('hidden',n>0)}
  function analyze(g,boost=0){
    const filled=[];const colors={};for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)if(g[y][x]){filled.push([x,y,g[y][x]]);colors[g[y][x]]=(colors[g[y][x]]||0)+1}
    const n=filled.length;if(!n)return null;const density=n/(GRID*GRID);let perimeter=0,spikes=0,top=0,bottom=0,left=0,right=0,edge=0;let sx=0,sy=0;
    for(const [x,y] of filled){sx+=x;sy+=y;if(y<GRID/2)top++;else bottom++;if(x<GRID/2)left++;else right++;if(x===0||y===0||x===GRID-1||y===GRID-1)edge++;let nei=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<GRID&&yy<GRID&&g[yy][xx])nei++;else perimeter++}if(nei<=1)spikes++}
    let sym=0,total=0;for(let y=0;y<GRID;y++)for(let x=0;x<GRID/2;x++){total++;if(Boolean(g[y][x])===Boolean(g[y][GRID-1-x]))sym++}sym/=total;
    const comps=countComponents(g);const cx=sx/n,cy=sy/n;const vertical=top/(bottom+1);const lateral=Math.abs(left-right)/n;const colorCount=Object.keys(colors).length;const dominant=Object.entries(colors).sort((a,b)=>b[1]-a[1])[0][0];const attr=colorToAttr(dominant,colors);
    const raw={density,perimeter:perimeter/(n*4),symmetry:sym,components:comps,spikes:spikes/n,edge:edge/n,cx:cx/(GRID-1),cy:cy/(GRID-1),vertical,lateral,colorCount};
    const atk=score(24+density*42+raw.spikes*70+raw.perimeter*24+colorCount*2+boost);
    const def=score(20+density*58+sym*22-raw.spikes*18+boost);
    const spd=score(25+(1-density)*32+raw.spikes*34+(1-raw.edge)*12-lateral*15+boost);
    const mag=score(18+colorCount*7+(attr==='neutral'?0:15)+Math.abs(.5-raw.cy)*20+boost);
    const vit=score(28+density*48+Math.min(n/16,25)+sym*10+boost);
    const stats={atk,def,spd,mag,vit};const archetype=classify(stats);const skills=makeSkills(stats,raw,attr);const power=Math.round((atk*1.15+def+spd+mag+vit*1.1)/5);
    return {stats,raw,attr,archetype,skills,power,dominant};
  }
  function score(v){return clamp(Math.round(v),8,99)}
  function countComponents(g){const seen=new Set;let c=0;for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){if(!g[y][x]||seen.has(x+','+y))continue;c++;const q=[[x,y]];while(q.length){const [a,b]=q.pop(),k=a+','+b;if(seen.has(k)||a<0||b<0||a>=GRID||b>=GRID||!g[b][a])continue;seen.add(k);q.push([a+1,b],[a-1,b],[a,b+1],[a,b-1])}}return c}
  function colorToAttr(c,counts){const hex=c.toLowerCase();if(['#ff4d6d','#ff8c42'].includes(hex))return'fire';if(['#3aa7ff','#5865f2','#42d6c7'].includes(hex))return'water';if(hex==='#63e06f')return'nature';if(hex==='#ffd166')return'bolt';if(['#9b5de5','#f15bb5','#111827'].includes(hex))return'dark';if(hex==='#ffffff')return'light';const yellow=counts['#ffd166']||0;if(yellow>6)return'bolt';return'neutral'}
  function classify(s){const arr=[['ブレイカー',s.atk],['ガーディアン',s.def+s.vit*.35],['スカウト',s.spd],['アルカナ',s.mag],['ビースト',(s.atk+s.vit)/2],['トリックスター',(s.spd+s.mag)/2]].sort((a,b)=>b[1]-a[1]);return arr[0][0]}
  function makeSkills(s,r,a){const out=[];if(s.atk>68||r.spikes>.07)out.push({name:'スパイクラッシュ',kind:'attack',scale:1.42});if(s.def>70||r.symmetry>.78)out.push({name:'フォートレス',kind:'guard',scale:1.65});if(s.spd>72)out.push({name:'フェイズステップ',kind:'speed',scale:1.3});if(s.mag>66)out.push({name:(ATTR[a]||'無')+'エーテル',kind:'magic',scale:1.45});if(r.components>2)out.push({name:'マルチコア',kind:'multi',scale:1.26});if(!out.length)out.push({name:'コアバースト',kind:'attack',scale:1.25});return out.slice(0,3)}
  function monsterName(seed,a){const r=rng(seed);const mark=a&&a!=='neutral'?ATTR[a]:'';return mark+pick(r,PREFIX)+pick(r,SUFFIX)}
  function traitText(m){return `${m.archetype}型 / ${ATTR[m.attr]}属性 / POWER ${m.power}。${m.skills.map(s=>s.name).join('・')}を使用。`}
  function generateSprite(seed,bias=0){const r=rng(seed);let g=blankGrid();const type=Math.floor(r()*6);const color1=pick(r,PALETTE.slice(2));let color2=pick(r,PALETTE.slice(1));if(color2===color1)color2='#ffffff';const cx=11.5;function set(x,y,c=color1){x=Math.round(x);y=Math.round(y);if(x>=1&&x<23&&y>=1&&y<23)g[y][x]=c}
    if(type===0){const rad=5+Math.floor(r()*3),cy=14;for(let y=5;y<21;y++)for(let x=3;x<21;x++){const dx=(x-cx)/(rad*1.25),dy=(y-cy)/rad;if(dx*dx+dy*dy<1+r()*.12)set(x,y)}for(let y=5;y<12;y++){const half=Math.round((y-4)*.7);for(let x=Math.round(cx-half);x<=Math.round(cx+half);x++)if(r()>.12)set(x,y)}}
    else if(type===1){for(let y=5;y<20;y++){const half=Math.round(3+Math.sin((y-5)/15*Math.PI)*5);for(let x=Math.round(cx-half);x<=Math.round(cx+half);x++)if(r()>.08)set(x,y)}for(let i=0;i<5;i++){set(4+i,7-i%2);set(19-i,7-i%2)}}
    else if(type===2){for(let y=7;y<20;y++)for(let x=6;x<18;x++)if((x+y)%7!==0)set(x,y);for(let y=9;y<16;y++){set(4,y);set(19,y)}for(let x=8;x<16;x++){set(x,4+(x%2),color2)}}
    else if(type===3){for(let y=4;y<20;y++){const half=Math.max(2,Math.round(7-Math.abs(y-12)*.55));for(let x=Math.round(cx-half);x<=Math.round(cx+half);x++)if(r()>.18)set(x,y)}for(let x=3;x<9;x++){set(x,11-(x%3));set(23-x,11-(x%3))}}
    else if(type===4){for(let y=8;y<19;y++)for(let x=7;x<17;x++)if(r()>.06)set(x,y);for(let k=0;k<6;k++){set(6-k,10-k%2);set(17+k,10-k%2)}for(let x=9;x<15;x++){set(x,6);set(x,5+(x%2),color2)}}
    else {for(let y=5;y<21;y++){const half=2+Math.floor((y-5)/3);for(let x=Math.round(cx-half);x<=Math.round(cx+half);x++)if(Math.abs(x-cx)<half*r()+2)set(x,y)}for(let y=7;y<13;y++){set(5,y,color2);set(18,y,color2)}}
    for(let y=0;y<GRID;y++)for(let x=0;x<12;x++)if(g[y][x]&&r()>.18)g[y][23-x]=g[y][x];
    for(let i=0;i<10+bias*25;i++){const x=Math.floor(r()*20)+2,y=Math.floor(r()*18)+3;if(r()>.42)set(x,y,r()>.7?color2:color1)}
    set(9,10,'#ffffff');set(14,10,'#ffffff');if(r()>.5){set(9,10,'#ffd166');set(14,10,'#ffd166')}
    return{grid:g,seed,type,color1,color2}
  }
  function generateEnemy(seed,diff=0){const spr=generateSprite(seed,diff);const a=analyze(spr.grid,clamp(diff*5,0,16));const name=monsterName(seed,a.attr);return{...spr,...a,name,trait:traitText({...a,name})}}
  function renderEnemy(){renderGrid($('#enemyCanvas'),state.enemy.grid);$('#enemyName').textContent=state.enemy.name;$('#enemyTrait').textContent=state.enemy.trait;$('#enemyThreat').textContent='THREAT '+['C','B','A','S'][clamp(Math.floor((state.enemy.power-35)/14),0,3)];$('#stageNumber').textContent=String(state.stage).padStart(2,'0');renderStats($('#enemyStats'),state.enemy.stats)}
  function renderStats(el,s){el.innerHTML=['atk','def','spd','mag','vit'].map(k=>`<div class="stat"><small>${k.toUpperCase()}</small><b>${s[k]}</b></div>`).join('')}
  function bindBattle(){
    $('#rerollEnemyBtn').onclick=()=>{state.enemy=generateEnemy('reroll-'+Date.now(),state.stage/8);renderEnemy();buzz()};
    $('#analyzeBtn').onclick=()=>startSoloBattle();$('#closeBattleModal').onclick=()=>$('#battleModal').classList.add('hidden');
    $('#nextBattleBtn').onclick=()=>{$('#battleModal').classList.add('hidden');state.stage++;state.enemy=generateEnemy('stage-'+state.stage+'-'+Date.now(),state.stage/6);renderEnemy();go('battle')};
  }
  function startSoloBattle(){const a=analyze(state.grid);if(!a){toast('まずモンスターを描いてください');buzz(80);return}const name=monsterName(JSON.stringify(a.raw)+Date.now(),a.attr);const m={grid:cloneGrid(state.grid),...a,name,trait:traitText({...a,name}),createdAt:Date.now(),id:'m'+Date.now()};state.lastMonster=m;addCollection(m);showBattle(m,state.enemy,'solo')}
  function addCollection(m){if(!state.collection.some(x=>signature(x.grid)===signature(m.grid))){state.collection.push(serializeMonster(m));if(state.collection.length>40)state.collection.shift();save()}}
  function signature(g){return hashString(g.flat().map(x=>x||'.').join('')).toString(36)}
  function serializeMonster(m){return{id:m.id||'m'+Date.now(),name:m.name,grid:m.grid,stats:m.stats,raw:m.raw,attr:m.attr,archetype:m.archetype,skills:m.skills,power:m.power,trait:m.trait,createdAt:m.createdAt||Date.now()}}
  function reviveMonster(m){return{...m,trait:m.trait||traitText(m)}}
  async function showBattle(p,e,mode='solo',seed=null){
    $('#battleModal').classList.remove('hidden');renderGrid($('#modalPlayerCanvas'),p.grid);renderGrid($('#modalEnemyCanvas'),e.grid);$('#modalPlayerName').textContent=p.name;$('#modalEnemyName').textContent=e.name;$('#battleLog').innerHTML='';$('#battleResultBox').innerHTML='';$('#nextBattleBtn').classList.add('hidden');
    $('#analysisPanel').innerHTML=[['CLASS',p.archetype],['ATTRIBUTE',ATTR[p.attr]],['POWER',p.power],['SKILL',p.skills[0].name]].map(x=>`<div class="analysis-chip">${x[0]}<b>${esc(x[1])}</b></div>`).join('');
    const result=simulateBattle(p,e,seed||('battle-'+Date.now()));let pMax=result.pMax,eMax=result.eMax;updateHp(pMax,pMax,eMax,eMax);
    for(let i=0;i<result.events.length;i++){const ev=result.events[i];$('#turnLabel').textContent='TURN '+String(ev.turn).padStart(2,'0');const line=document.createElement('p');line.className=ev.skill?'skill':ev.damage?'damage':'';line.innerHTML=`<span class="turn">T${ev.turn}</span> ${esc(ev.text)}`;$('#battleLog').appendChild(line);$('#battleLog').scrollTop=$('#battleLog').scrollHeight;updateHp(ev.pHp,pMax,ev.eHp,eMax);if(ev.hitSide){const cvs=ev.hitSide==='p'?$('#modalPlayerCanvas'):$('#modalEnemyCanvas');cvs.animate([{transform:'translateX(0)'},{transform:`translateX(${ev.hitSide==='p'?-7:7}px)`},{transform:'translateX(0)'}],{duration:150});buzz(18)}await sleep(170)}
    $('#turnLabel').textContent='RESULT';const won=result.winner==='p';$('#battleResultBox').innerHTML=`<h3 class="${won?'win-text':'lose-text'}">${won?'VICTORY':'DEFEAT'}</h3><div>${won?esc(p.name):esc(e.name)} の勝利 · ${result.turns} TURN</div>`;
    if(mode==='solo'){applyRating(won,p,e);$('#nextBattleBtn').classList.remove('hidden')}return result
  }
  function updateHp(p,pMax,e,eMax){$('#playerHpBar').style.width=(p/pMax*100)+'%';$('#enemyHpBar').style.width=(e/eMax*100)+'%';$('#playerHpText').textContent=Math.max(0,p)+' / '+pMax;$('#enemyHpText').textContent=Math.max(0,e)+' / '+eMax}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
  function simulateBattle(p,e,seed){const r=rng(seed),A=makeFighter(p),B=makeFighter(e);const events=[];let turn=0;while(A.hp>0&&B.hp>0&&turn<20){turn++;const order=A.s.spd===B.s.spd?(r()>.5?[A,B]:[B,A]):(A.s.spd>B.s.spd?[A,B]:[B,A]);for(const actor of order){const target=actor===A?B:A;if(actor.hp<=0||target.hp<=0)continue;const action=chooseAction(actor,target,r);resolveAction(actor,target,action,r,turn,events,A,B)}}if(A.hp>0&&B.hp>0){A.hp-=Math.max(0,Math.round(B.s.atk*.5));B.hp-=Math.max(0,Math.round(A.s.atk*.5))}const winner=A.hp===B.hp?(A.m.power>=B.m.power?'p':'e'):(A.hp>B.hp?'p':'e');return{winner,events,pMax:A.max,eMax:B.max,turns:turn}}
  function makeFighter(m){return{m,s:m.stats,hp:Math.round(110+m.stats.vit*2.3),max:Math.round(110+m.stats.vit*2.3),guard:0,cool:0}}
  function chooseAction(a,b,r){let guard=(a.hp/a.max<.33?22:5)+(b.s.atk>a.s.def?8:0),skill=(a.cool<=0?20:0)+(a.s.mag>65?8:0)+(a.hp/a.max<.5?4:0),attack=20+(a.s.atk>b.s.def?7:0);if(a.m.skills[0]?.kind==='guard'&&a.hp/a.max<.55)guard+=12;const sum=guard+skill+attack,x=r()*sum;if(x<guard)return'guard';if(x<guard+skill)return'skill';return'attack'}
  function resolveAction(a,b,act,r,turn,events,A,B){a.cool=Math.max(0,a.cool-1);if(act==='guard'){a.guard=0.48+Math.min(.2,a.s.def/500);events.push(evt(turn,`${a.m.name} は防御態勢。`,false,false,A,B));return}let scale=act==='skill'?(a.m.skills[0]?.scale||1.3):1;if(act==='skill')a.cool=2;const magic=act==='skill'&&['magic','multi'].includes(a.m.skills[0]?.kind);let off=magic?(a.s.mag*.92+a.s.atk*.25):a.s.atk;let def=magic?b.s.mag*.28+b.s.def*.38:b.s.def;let adv=attributeFactor(a.m.attr,b.m.attr);let dmg=Math.round((13+off*.72-def*.34)*scale*adv*(.87+r()*.28));const dodge=clamp((b.s.spd-a.s.spd)*.003+.04,.02,.22);if(r()<dodge){events.push(evt(turn,`${b.m.name} は攻撃を見切った！`,false,false,A,B));b.guard=0;return}if(r()<.08+a.s.spd/900){dmg=Math.round(dmg*1.55);events.push(evt(turn,'クリティカル！',true,true,A,B))}if(b.guard){dmg=Math.round(dmg*(1-b.guard));b.guard=0}dmg=Math.max(3,dmg);b.hp=Math.max(0,b.hp-dmg);const skillName=act==='skill'?`「${a.m.skills[0].name}」`:'攻撃';events.push(evt(turn,`${a.m.name} の${skillName}！ ${b.m.name} に ${dmg} ダメージ。`,true,act==='skill',A,B,b===A?'p':'e'))}
  function evt(turn,text,damage=false,skill=false,A,B,hitSide=null){return{turn,text,damage,skill,pHp:A.hp,eHp:B.hp,hitSide}}
  function attributeFactor(a,b){if(ADV[a]===b)return 1.2;if(ADV[b]===a)return .82;return 1}
  function applyRating(won,p,e){const expected=1/(1+Math.pow(10,(e.power-p.power)/38));const delta=Math.round(24*((won?1:0)-expected));state.profile.rating=clamp(state.profile.rating+delta,100,9999);if(won){state.profile.wins++;state.profile.streak++}else{state.profile.losses++;state.profile.streak=0}save();updateProfileUI();toast((delta>=0?'+':'')+delta+' RATING')}
  function renderCollection(){const el=$('#collectionGrid');$('#collectionCount').textContent=state.collection.length;if(!state.collection.length){el.innerHTML='<div class="empty-state">まだモンスターがいません。<br>バトル画面で描いて解析すると自動登録されます。</div>';return}el.innerHTML='';[...state.collection].reverse().forEach(m=>{const d=document.createElement('article');d.className='monster-card';d.innerHTML=`<canvas width="192" height="192"></canvas><h3>${esc(m.name)}</h3><p>${esc(m.archetype)} · ${ATTR[m.attr]} · POWER ${m.power}</p>`;el.appendChild(d);renderGrid(d.querySelector('canvas'),m.grid)})}
  function bindMisc(){$('#startTournamentBtn').onclick=startTournament}
  function startTournament(){let pool=[...state.collection].slice(-4).map(reviveMonster);while(pool.length<8)pool.push(generateEnemy('cup-'+Date.now()+'-'+pool.length,pool.length/9));let rounds=[];let current=pool;while(current.length>1){const matches=[];const next=[];for(let i=0;i<current.length;i+=2){const a=current[i],b=current[i+1],res=simulateBattle(a,b,'cup-'+signature(a.grid)+signature(b.grid)),win=res.winner==='p'?a:b;matches.push({a,b,win});next.push(win)}rounds.push(matches);current=next}renderBracket(rounds,current[0])}
  function renderBracket(rounds,champ){const b=$('#bracket');b.innerHTML='';rounds.forEach((round,idx)=>{const c=document.createElement('div');c.className='bracket-col';c.innerHTML=`<h3>${idx===rounds.length-1?'FINAL':'ROUND '+(idx+1)}</h3>`;round.forEach(m=>{const x=document.createElement('div');x.className='bracket-match';x.innerHTML=`<b class="${m.win===m.a?'win':''}">${esc(m.a.name)}</b><b class="${m.win===m.b?'win':''}">${esc(m.b.name)}</b>`;c.appendChild(x)});b.appendChild(c)});const c=document.createElement('div');c.className='bracket-col';c.innerHTML=`<h3>CHAMPION</h3><div class="bracket-match"><b class="win">★ ${esc(champ.name)}</b></div>`;b.appendChild(c)}
  function renderRanking(){const rivals=[['BYTEFOX',1460,32],['NEON',1388,24],['KAMI-9',1335,21],['MOKA',1260,17],['R0NIN',1192,13],['PIXELCAT',1134,11],['MINI-BOSS',1078,9]].map(x=>({name:x[0],rating:x[1],wins:x[2],npc:true}));rivals.push({name:state.profile.name,rating:state.profile.rating,wins:state.profile.wins,you:true});rivals.sort((a,b)=>b.rating-a.rating);$('#rankingList').innerHTML=rivals.map((r,i)=>`<div class="rank-row ${r.you?'you':''}"><span class="pos">#${i+1}</span><b>${esc(r.name)}${r.you?' (YOU)':''}</b><span class="rate">${r.rating}</span><small>${r.wins} W</small></div>`).join('')}
  function bindOnline(){
    $('#createRoomBtn').onclick=hostRoom;$('#joinRoomBtn').onclick=joinRoom;$('#copyRoomBtn').onclick=()=>navigator.clipboard?.writeText(state.room).then(()=>toast('コピーしました')).catch(()=>{});$('#sendMonsterBtn').onclick=sendReady;
  }
  function onlineLamp(text,good=false){$('#netLamp').textContent=text;$('#netLamp').classList.toggle('good',good)}
  function ensurePeer(){if(typeof Peer==='undefined'){toast('通信ライブラリを読み込めません');return false}return true}
  function roomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let r='';crypto.getRandomValues(new Uint32Array(6)).forEach(n=>r+=chars[n%chars.length]);return r}
  function hostRoom(){if(!ensurePeer())return;cleanupPeer();state.isHost=true;state.room=roomCode();onlineLamp('CONNECTING');state.peer=new Peer('pixel-forge-'+state.room.toLowerCase());state.peer.on('open',()=>{$('#hostRoomCode').textContent=state.room;$('#hostRoomBox').classList.remove('hidden');$('#onlineMatchCard').classList.remove('hidden');$('#onlineStatus').textContent='参加者を待っています';onlineLamp('ROOM '+state.room,true)});state.peer.on('connection',conn=>{if(state.conn){conn.close();return}setupConn(conn)});peerErrors()}
  function joinRoom(){if(!ensurePeer())return;const code=$('#joinCodeInput').value.trim().toUpperCase();if(code.length!==6){toast('6文字のコードを入力');return}cleanupPeer();state.isHost=false;state.room=code;onlineLamp('CONNECTING');state.peer=new Peer();state.peer.on('open',()=>{setupConn(state.peer.connect('pixel-forge-'+code.toLowerCase(),{reliable:true}))});peerErrors()}
  function peerErrors(){state.peer.on('error',err=>{console.warn(err);onlineLamp('ERROR');toast(err.type==='peer-unavailable'?'部屋が見つかりません':'通信エラー: '+err.type)})}
  function setupConn(conn){state.conn=conn;conn.on('open',()=>{$('#onlineMatchCard').classList.remove('hidden');$('#onlineStatus').textContent='接続しました';onlineLamp('ONLINE',true);conn.send({t:'hello',name:state.profile.name,rating:state.profile.rating});toast('対戦相手と接続しました');buzz(60)});conn.on('data',handleNet);conn.on('close',()=>{onlineLamp('DISCONNECTED');$('#onlineStatus').textContent='切断されました'});conn.on('error',()=>onlineLamp('ERROR'))}
  function handleNet(d){if(!d||!d.t)return;if(d.t==='hello'){$('#onlineRivalName').textContent=d.name||'RIVAL';$('#onlineRivalState').textContent='RATING '+(d.rating||'---');if(state.conn?.open)state.conn.send({t:'helloAck',name:state.profile.name,rating:state.profile.rating})}if(d.t==='helloAck'){$('#onlineRivalName').textContent=d.name||'RIVAL';$('#onlineRivalState').textContent='RATING '+(d.rating||'---')}if(d.t==='ready'){state.remoteMonster=reviveMonster(d.monster);$('#onlineRivalState').textContent='READY · '+state.remoteMonster.name;maybeOnlineBattle()}if(d.t==='result'&&!state.isHost){presentOnlineResult(d.result,d.me,d.rival)}}
  function sendReady(){if(!state.conn?.open){toast('まだ接続されていません');return}let m=state.lastMonster;if(!m){const e=generateEnemy('online-auto-'+state.profile.name+Date.now(),.2);m={...e,id:'auto'+Date.now()};state.lastMonster=m}state.ready=true;state.conn.send({t:'ready',monster:serializeMonster(m)});$('#onlineMeState').textContent='READY · '+m.name;$('#sendMonsterBtn').disabled=true;$('#sendMonsterBtn').textContent='準備完了';maybeOnlineBattle()}
  function maybeOnlineBattle(){if(!state.isHost||!state.ready||!state.remoteMonster)return;const me=state.lastMonster,rival=state.remoteMonster;const res=simulateBattle(me,rival,'online-'+state.room+signature(me.grid)+signature(rival.grid));const hostWon=res.winner==='p';presentOnlineResult({hostWon,turns:res.turns},me,rival);state.conn.send({t:'result',result:{hostWon,turns:res.turns},me:serializeMonster(rival),rival:serializeMonster(me)});applyOnlineRating(hostWon)}
  function presentOnlineResult(result,me,rival){const won=state.isHost?result.hostWon:!result.hostWon;$('#onlineBattleResult').innerHTML=`<div class="battle-result-box"><h3 class="${won?'win-text':'lose-text'}">${won?'YOU WIN':'YOU LOSE'}</h3><p>${esc(me?.name||'YOU')} vs ${esc(rival?.name||'RIVAL')} · ${result.turns} TURN</p></div>`;if(!state.isHost)applyOnlineRating(won)}
  function applyOnlineRating(won){state.profile.rating=clamp(state.profile.rating+(won?18:-14),100,9999);won?state.profile.wins++:state.profile.losses++;state.profile.streak=won?state.profile.streak+1:0;save();updateProfileUI()}
  function cleanupPeer(){try{state.conn?.close();state.peer?.destroy()}catch{}state.conn=null;state.peer=null;state.remoteMonster=null;state.ready=false;$('#sendMonsterBtn').disabled=false;$('#sendMonsterBtn').textContent='モンスターを送って準備完了'}
  function seedTitleMonsters(){const a=generateEnemy('title-a',.1),b=generateEnemy('title-b',.1);renderGrid($('#titleMonsterA'),a.grid,'transparent');renderGrid($('#titleMonsterB'),b.grid,'transparent')}
  init();
})();
