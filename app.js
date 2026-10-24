let savedState={};
try{savedState=JSON.parse(localStorage.getItem('ssat')||'{}')||{}}catch(e){}
const S=Object.assign({box:{},due:{},memory:{},xp:0,streak:0,n:0,ok:{},miss:{},quizSeen:[],rootQuizSeen:[],analogyQuizSeen:[],unlimited:false},savedState);
['quizSeen','rootQuizSeen','analogyQuizSeen'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});
if(!S.box||typeof S.box!=='object')S.box={};if(!S.due||typeof S.due!=='object')S.due={};
if(!S.ok||typeof S.ok!=='object')S.ok={};if(!S.miss||typeof S.miss!=='object')S.miss={};if(!S.memory||typeof S.memory!=='object')S.memory={};
const seen=new Set(),W=[].concat(WORDS,typeof WORDS2!=='undefined'?WORDS2:[],typeof WORDS3!=='undefined'?WORDS3:[],typeof WORDS4!=='undefined'?WORDS4:[],typeof WORDS5!=='undefined'?WORDS5:[],typeof WORDS6!=='undefined'?WORDS6:[],typeof WORDS7!=='undefined'?WORDS7:[]).map(l=>{const[w,d,e]=l.split('|');return{w,d,e}}).filter(x=>!seen.has(x.w)&&seen.add(x.w));
const P=typeof PRIORITY!=='undefined'?PRIORITY:[],rk=x=>(P.indexOf(x.w)+1)||9999;W.sort((a,b)=>rk(a)-rk(b));
const R=ROOTS.map(l=>{const[r,m,x]=l.split('|');return{r,m,x}});
const DAY=864e5,GAP=[0,1,2,4,8,14],$=s=>document.querySelector(s),main=$('#main');
const save=()=>localStorage.setItem('ssat',JSON.stringify(S));
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const INTERVAL_DAYS=[0,1,2,4,8,14];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function memoryFor(word){
 let m=S.memory[word];
 if(!m||typeof m!=='object'){
  const oldLevel=clamp(Number(S.box[word]||0),0,5);
  m={reps:Math.max(0,oldLevel-1),ease:2.3,intervalDays:oldLevel>1?(INTERVAL_DAYS[oldLevel]||1):0,lapses:Number(S.miss[word]||0),attempts:0,correct:0,quizAttempts:0,quizCorrect:0,lastReviewed:0,lastRating:'',lastSource:'',lastQuizAt:0};
  S.memory[word]=m;
 }
 m.reps=clamp(Number(m.reps)||0,0,10000);
 m.ease=clamp(Number(m.ease)||2.3,1.3,3.2);
 m.intervalDays=clamp(Number(m.intervalDays)||0,0,60);
 m.lapses=Math.max(0,Number(m.lapses)||0);
 m.attempts=Math.max(0,Number(m.attempts)||0);
 m.correct=Math.max(0,Number(m.correct)||0);
 m.quizAttempts=Math.max(0,Number(m.quizAttempts)||0);
 m.quizCorrect=Math.max(0,Number(m.quizCorrect)||0);
 return m;
}
function formatDelay(ms){
 if(ms<60*1000)return `${Math.max(1,Math.round(ms/1000))} sec`;
 if(ms<DAY){const h=Math.max(1,Math.round(ms/3600000));return `${h} hour${h===1?'':'s'}`;}
 const days=Math.round(ms/DAY*10)/10;
 return `${days} day${days===1?'':'s'}`;
}
// Adaptive scheduling: each word keeps its own ease, successful recall streak,
// lapse count, and previous interval. Wrong answers always override optimistic ratings.
function scheduleFor(c,rating){
 const m=memoryFor(c.w),level=clamp(Number(S.box[c.w]||0),0,5);
 const ease=clamp(m.ease||2.3,1.3,3.2),interval=clamp(Number(m.intervalDays)||0,0,60),reps=Number(m.reps)||0;
 let ms,nextLevel=level,nextEase=ease,nextReps=reps,nextIntervalDays=interval;
 if(rating==='again'){
  ms=30*1000;nextLevel=1;nextEase=Math.max(1.3,ease-0.2);nextReps=0;nextIntervalDays=0;
 }else if(rating==='hard'){
  ms=(interval>0?Math.max(0.5,interval*1.2):0.5)*DAY;
  nextLevel=Math.max(1,level);nextEase=Math.max(1.3,ease-0.15);nextReps=reps+1;nextIntervalDays=ms/DAY;
 }else if(rating==='good'){
  ms=(interval>0?interval*ease:1)*DAY;
  nextLevel=Math.min(5,Math.max(1,level+1));nextReps=reps+1;nextIntervalDays=ms/DAY;
 }else{
  ms=(interval>0?interval*(ease+0.35):3)*DAY;
  nextLevel=Math.min(5,Math.max(2,level+2));nextEase=Math.min(3.2,ease+0.15);nextReps=reps+1;nextIntervalDays=ms/DAY;
 }
 ms=clamp(ms,30*1000,60*DAY);nextIntervalDays=ms/DAY;
 return{level:nextLevel,ms,label:formatDelay(ms),intervalDays:nextIntervalDays,ease:nextEase,reps:nextReps};
}
function commitRating(c,rating,wasCorrect=true,source='flashcard',missAlreadyCounted=false){
 const w=c.w,when=Date.now(),effective=wasCorrect?rating:'again',plan=scheduleFor(c,effective),m=memoryFor(w);
 m.attempts++;m.lastReviewed=when;m.lastRating=effective;m.lastSource=source;
 S.box[w]=plan.level;S.due[w]=when+plan.ms;
 if(effective==='again'){
  m.lapses++;m.reps=0;m.ease=plan.ease;m.intervalDays=0;S.ok[w]=false;
  if(!missAlreadyCounted)S.miss[w]=(S.miss[w]||0)+1;
 }else{
  m.reps=plan.reps;m.ease=plan.ease;m.intervalDays=plan.intervalDays;m.correct++;S.ok[w]=true;
  if(S.miss[w]>0&&(effective==='good'||effective==='easy'))S.miss[w]=Math.max(0,S.miss[w]-1);
 }
 save();return{...plan,effective};
}
function noteQuizResult(c,correct){
 const m=memoryFor(c.w);m.quizAttempts++;m.lastQuizAt=Date.now();
 if(correct){m.quizCorrect++;save();return;}
 commitRating(c,'again',false,'quiz',false);
}
function reviewUrgency(c,now=Date.now()){
 const m=memoryFor(c.w),due=Number(S.due[c.w]||now),overdue=Math.max(0,now-due)/DAY;
 return overdue+(Number(S.miss[c.w]||0)*1.5)+(m.lapses*1.25)+(Math.max(0,2.5-m.ease)*1.5);
}
function sortDueCards(cards){return cards.sort((a,b)=>reviewUrgency(b)-reviewUrgency(a)||(Number(S.due[a.w]||0)-Number(S.due[b.w]||0)));}
// Cycle quiz prompts through the whole pool before reusing any question word.
// Weak/overdue prompts are prioritized, but never repeated within one round.
function chooseCycled(items,seenKey,count,idOf,priority=()=>false){
 if(!items.length)return[];
 const valid=new Set(items.map(idOf));
 let used=[...new Set((Array.isArray(S[seenKey])?S[seenKey]:[]).filter(id=>valid.has(id)))];
 let fresh=items.filter(x=>!used.includes(idOf(x)));
 if(!fresh.length){used=[];fresh=items.slice();}
 const target=Math.min(count,fresh.length);
 const priorityItems=shuffle(fresh.filter(priority)).slice(0,Math.min(5,target));
 const picked=priorityItems.concat(shuffle(fresh.filter(x=>!priorityItems.includes(x)))).slice(0,target);
 S[seenKey]=[...new Set(used.concat(picked.map(idOf)))];save();
 return picked;
}
function buildWordChoices(c,reverse){
 const candidates=shuffle(W.filter(x=>reverse?x.w!==c.w:x.d!==c.d));
 const seenLabels=new Set([reverse?c.w:c.d]),others=[];
 for(const x of candidates){const label=reverse?x.w:x.d;if(!label||seenLabels.has(label))continue;seenLabels.add(label);others.push(x);if(others.length===3)break;}
 return shuffle([c,...others]);
}
const LV=['Rookie','Reader','Wordsmith','Scholar','Linguist','Lexicon Legend'];
const PEP=['A month is plenty. Steady daily sessions beat a weekend of cramming.','You already aced reading and math. Vocab is the last peak.','Every word you learn today is a point you keep on test day.','Small daily climbs get you to the top.'];
const CHEER=['Nice.','Locked in.','That’s a point on test day.','Keep climbing.','Boom.'];
function setBox(w,b){S.box[w]=Math.max(1,Math.min(5,b));S.due[w]=Date.now()+GAP[S.box[w]]*DAY}
function calcGoal(){
 const t0=Math.max(new Date(new Date().toDateString()),new Date('2026-10-24T00:00')),dead=new Date((S.test||'2026-11-14')+'T00:00')-2*DAY;
 const days=Math.max(1,Math.round((dead-t0)/DAY)),left=W.filter(x=>!S.box[x.w]).length;
 return Math.max(5,Math.ceil(left/days))}
function touch(){const t=new Date().toDateString();if(S.last!==t){S.streak=S.last===new Date(Date.now()-DAY).toDateString()?S.streak+1:1;S.last=t;S.n=0;S.goal=calcGoal()}}
function gain(n){touch();S.xp+=n;save();stats()}
function stats(){
 const m=W.filter(x=>S.box[x.w]>=4&&S.ok[x.w]).length,L=W.filter(x=>S.ok[x.w]).length,lv=Math.min(LV.length-1,Math.floor(S.xp/250));
 const dl=d=>d?Math.ceil((new Date(d+'T00:00')-Date.now())/DAY):null,ds=[S.test,S.test2].map(dl).filter(x=>x!==null&&x>=0).sort((a,b)=>a-b),left=ds.length?ds[0]:null;
 $('#left').textContent=left===null?'?':Math.max(left,0);
 $('#pace').textContent=(left===null?'':left===0?'Test day. You have got this.':'Tests in '+ds.join(' and ')+' days. ')+(S.unlimited?'Unlimited study is on. ':('Daily new-word target: '+(S.npd||S.goal||calcGoal())+'. '))+'Overdue and repeatedly missed cards receive priority.';
 $('#streak').textContent=S.streak;$('#lvl').textContent=LV[lv];$('#xp').textContent=S.xp;
 $('#bar').style.width=100*L/W.length+'%';$('#mast').textContent=L+' learned, '+m+' mastered, of '+W.length+' words';
}
function train(){
 touch();if(!S.goal)S.goal=calcGoal();
 const goal=S.npd||S.goal,unlimited=!!S.unlimited,batchSize=10,maxReviews=unlimited?Number.POSITIVE_INFINITY:20;
 let reviewsDone=0,newIntroduced=0;
 const intervalDays=[0,1,2,4,8,14];
 const dueCards=()=>sortDueCards(W.filter(x=>S.box[x.w]&&Number(S.due[x.w]||0)<=Date.now()));
 const freshCards=()=>{const fresh=W.filter(x=>!S.box[x.w]);return fresh.slice(0,unlimited?fresh.length:Math.max(0,Math.min(batchSize,goal-S.n)));};
 const plan=(c,rating)=>scheduleFor(c,rating);

 const q=dueCards().slice(0,maxReviews).map(c=>({c,isNew:false,counted:true,reviewCounted:false,retries:0,revealed:false}));
 freshCards().forEach(c=>q.push({c,isNew:true,counted:false,retries:0,revealed:false}));
 function startNextBatch(){tab('train')}
 function show(){
  if(!q.length){
   const pendingReviews=dueCards().length,canAddNew=(unlimited||S.n<goal)&&W.some(x=>!S.box[x.w]);
   const doneToday=!unlimited&&S.n>=goal;
   main.innerHTML=`<div class="study-summary"><p class="eyebrow">BATCH COMPLETE</p><h2>${newIntroduced} new card${newIntroduced===1?'':'s'} introduced</h2><p>${reviewsDone} review${reviewsDone===1?'':'s'} completed in this batch.</p><p class="def">${pendingReviews?`${pendingReviews} overdue review${pendingReviews===1?'':'s'} remain. Review them before adding more new words.`:unlimited?'Unlimited study is on. You can stop here or continue with any remaining cards.':doneToday?'Daily new-card target reached. You can stop here and let spaced repetition do its work.':'Great work. Finish this batch, then return when more cards are due.'}</p></div><div class="row">${pendingReviews||canAddNew?'<button class="yes" id="more">'+(pendingReviews?'Continue reviews':'Next new-card batch')+'</button>':''}<button id="qz">Practice quiz</button></div>`;
   const m=$('#more');if(m)m.onclick=startNextBatch;$('#qz').onclick=()=>tab('quiz');return;
  }
  const it=q[0],c=it.c;
  const index=q.length,kind=it.isNew?'NEW WORD':'SPACED REVIEW';
  const countLine=`New cards today: ${S.n}${unlimited?' · Unlimited study':` / ${goal}`} · Reviews completed this batch: ${reviewsDone}`;
  const revealMarkup=it.revealed?`<div class="flashcard-back"><p class="eyebrow">DEFINITION</p><p class="def">${c.d}</p>${c.e?`<p class="ex">“${c.e}”</p>`:''}</div><p class="recall-prompt">How well did you remember it?</p><div class="rating-grid"><button class="rate-again" data-rate="again"><b>Again</b><small>${plan(c,'again').label}</small></button><button class="rate-hard" data-rate="hard"><b>Hard</b><small>${plan(c,'hard').label}</small></button><button class="rate-good" data-rate="good"><b>Good</b><small>${plan(c,'good').label}</small></button><button class="rate-easy" data-rate="easy"><b>Easy</b><small>${plan(c,'easy').label}</small></button></div>`:`<div class="flashcard-front"><p class="eyebrow">${kind}</p><h2>${c.w}</h2><p class="recall-prompt">Think of the definition before you reveal it. Say it out loud or recall it in your head.</p><button class="yes reveal-btn" id="reveal">Reveal definition</button></div>`;
  main.innerHTML=`<div class="session-meta"><span>${it.isNew?'New card':'Review card'}</span><span>${index} card${index===1?'':'s'} in this batch to go${unlimited?' · UNLIMITED':''}</span></div><p class="today-line">${countLine}</p><section class="flashcard">${revealMarkup}</section>`;
  const reveal=$('#reveal');if(reveal)reveal.onclick=()=>{it.revealed=true;show();};
  main.querySelectorAll('[data-rate]').forEach(btn=>btn.onclick=()=>{
   const rating=btn.dataset.rate,w=c.w;
   touch();
   if(it.isNew&&!it.counted){S.n++;newIntroduced++;it.counted=true;}
   commitRating(c,rating,true,'flashcard',false);
   // Missed cards are not reinserted into this batch. They return when their
   // short learning-step delay expires, without rewarding sequence memorization.
   // Count each due card once per batch.
   if(!it.isNew&&!it.reviewCounted){reviewsDone++;it.reviewCounted=true;}
   S.xp+=rating==='again'?1:rating==='hard'?5:rating==='good'?10:12;
   save();stats();q.shift();show();
  });
 }
 show();
}
function mixed(){
 touch();if(!S.goal)S.goal=calcGoal();
 const goal=S.npd||S.goal,unlimited=!!S.unlimited;
 const dueCards=()=>sortDueCards(W.filter(x=>S.box[x.w]&&Number(S.due[x.w]||0)<=Date.now()));
 const fresh=W.filter(x=>!S.box[x.w]);
 const due=dueCards().slice(0,unlimited?Number.POSITIVE_INFINITY:20);
 const newLimit=unlimited?fresh.length:Math.max(0,Math.min(10,goal-S.n));
 const q=due.map(c=>({c,isNew:false,reviewCounted:false,answered:false,correct:null}));
 fresh.slice(0,newLimit).forEach(c=>q.push({c,isNew:true,reviewCounted:false,answered:false,correct:null}));
 let i=0,ok=0,newIntroduced=0,reviewsDone=0;
 function show(){
  if(i>=q.length){
   const pending=dueCards().length,canAdd=(unlimited||S.n<goal)&&W.some(x=>!S.box[x.w]);
   main.innerHTML=`<div class="study-summary"><p class="eyebrow">MIXED SESSION COMPLETE</p><h2>${ok} / ${q.length} correct</h2><p>${newIntroduced} new word${newIntroduced===1?'':'s'} introduced · ${reviewsDone} reviews completed</p><p class="def">${pending?`${pending} review${pending===1?'':'s'} are due or overdue.`:unlimited?'Unlimited mode: you have finished this batch of available words.':'Good work. Review again when more cards become due.'}</p></div><div class="row">${pending||canAdd?'<button class="yes" id="more">Continue mixed study</button>':''}<button id="quiz-again">Practice quiz</button></div>`;
   const more=$('#more');if(more)more.onclick=()=>tab('mixed');$('#quiz-again').onclick=()=>tab('quiz');return;
  }
  const it=q[i],c=it.c,rev=Math.random()<.4,opts=buildWordChoices(c,rev);
  it.rev=rev;it.opts=opts;
  main.innerHTML=`<div class="session-meta"><span>${it.isNew?'NEW WORD':'SPACED REVIEW'}</span><span>Question ${i+1} of ${q.length}${unlimited?' · UNLIMITED':''}</span></div><p class="today-line">New words today: ${S.n}${unlimited?' · Unlimited mode':` / ${goal}`} · Each answer is followed by a recall rating.</p><div class="card" style="cursor:default"><p class="eyebrow">${rev?'CHOOSE THE WORD':'CHOOSE THE DEFINITION'}</p><h2>${rev?c.d:c.w}</h2></div><div class="opts">${opts.map(o=>`<button>${rev?o.w:o.d}</button>`).join('')}</div><p id="mix-feedback"></p>`;
  const bs=[...main.querySelectorAll('.opts button')];
  bs.forEach((b,k)=>b.onclick=()=>{
   it.correct=opts[k]===c;it.answered=true;
   bs.forEach((x,j)=>{x.disabled=true;if(opts[j]===c)x.classList.add('right')});
   if(it.correct){ok++;S.xp+=3;}
   else{b.classList.add('wrong');S.miss[c.w]=(S.miss[c.w]||0)+1;S.ok[c.w]=false;it.missCounted=true;}
   save();stats();
   $('#mix-feedback').innerHTML=`${it.correct?'<b>Correct.</b>':`<b>Not quite.</b> The answer is ${rev?'<b>'+c.w+'</b>':'<b>'+c.d+'</b>'}.`} ${c.e?'Example: “'+c.e+'”':''}<p class="recall-prompt">Now rate how well you knew it before seeing the answer.</p><div class="rating-grid"><button class="rate-again" data-rate="again"><b>Again</b><small>${scheduleFor(c,'again').label}</small></button><button class="rate-hard" data-rate="hard"><b>Hard</b><small>${it.correct?scheduleFor(c,'hard').label:'Review in 30 sec'}</small></button><button class="rate-good" data-rate="good"><b>Good</b><small>${it.correct?scheduleFor(c,'good').label:'Review in 30 sec'}</small></button><button class="rate-easy" data-rate="easy"><b>Easy</b><small>${it.correct?scheduleFor(c,'easy').label:'Review in 30 sec'}</small></button></div>`;
   main.querySelectorAll('[data-rate]').forEach(btn=>btn.onclick=()=>{
    const rating=btn.dataset.rate;
    // A wrong multiple-choice answer overrides any optimistic self-rating.
    touch();
    if(it.isNew){S.n++;newIntroduced++;}
    if(!it.isNew&&!it.reviewCounted){reviewsDone++;it.reviewCounted=true;}
    commitRating(c,rating,it.correct,'mixed',!!it.missCounted);
    S.xp+=rating==='again'?1:rating==='hard'?5:rating==='good'?10:12;
    save();stats();i++;show();
   });
  });
 }
 if(!q.length){main.innerHTML=`<div class="study-summary"><h2>No cards ready</h2><p class="def">There are no new words within today's target and no reviews due. Switch on Unlimited study to introduce all remaining words, or come back when reviews are due.</p><div class="row"><button class="yes" id="quiz-now">Practice quiz</button></div></div>`;$('#quiz-now').onclick=()=>tab('quiz');return;}
 show();
}

function quiz(){
 const pool=W;
 const qs=chooseCycled(pool,'quizSeen',10,x=>x.w,x=>(S.miss[x.w]||0)>0||(Number(S.due[x.w]||0)>0&&Number(S.due[x.w]||0)<=Date.now()));
 let i=0,ok=0;
 (function ask(){
  if(i>=qs.length){const b=ok*5;gain(b);main.innerHTML=`<div class="card" style="cursor:default"><h2>${ok} / ${qs.length}</h2><p class="def">${ok>=9?'Summit-level. Incredible.':ok>=6?'Solid climb. Missed words are flagged for review.':'Tough round, and that’s the point. Missed words come back in Train.'}</p><p class="ex">+${b} bonus XP</p><p>${qs.length<10?'You reached the end of this no-repeat cycle. The next round can start a fresh cycle.':'Questions will not repeat until the current quiz pool has been cycled through.'}</p></div><div class="row"><button class="yes" id="again">Another round</button></div>`;$('#again').onclick=quiz;return}
  const c=qs[i],rev=Math.random()<.4,opts=buildWordChoices(c,rev);
  main.innerHTML=`<p>Question ${i+1} of ${qs.length}</p><div class="card" style="cursor:default"><p class="ex">${rev?'Which word means:':'Closest in meaning to:'}</p><h2>${rev?c.d:c.w}</h2></div><div class="opts">${opts.map(o=>`<button>${rev?o.w:o.d}</button>`).join('')}</div><p id="fb"></p>`;
  const bs=[...main.querySelectorAll('.opts button')];
  bs.forEach((b,k)=>b.onclick=()=>{
   const good=opts[k]===c;
   bs.forEach((x,j)=>{x.disabled=true;if(opts[j]===c)x.classList.add('right')});
   if(good){ok++;noteQuizResult(c,true);gain(15)}else{b.classList.add('wrong');noteQuizResult(c,false);gain(1)}
   $('#fb').innerHTML=`${good?rnd(CHEER):'Not quite. '+(rev?'<b>'+opts[k].w+'</b> means “'+opts[k].d+'”.':'“'+opts[k].d+'” is the meaning of <b>'+opts[k].w+'</b>.')} <b>${c.w}</b> means “${c.d}”. ${c.e?'“'+c.e+'”':''}<div class="row"><button class="yes" id="nx">Next</button></div>`;
   $('#nx').onclick=()=>{i++;ask()};$('#nx').focus();
  });
 })();
}
function words(){
 main.innerHTML=`<input id="f" placeholder="Search words" aria-label="Search words"><div id="l"></div>`;
 const draw=()=>{const t=$('#f').value.toLowerCase();$('#l').innerHTML=[...W].sort((a,b)=>a.w.localeCompare(b.w)).filter(x=>x.w.toLowerCase().includes(t)||x.d.toLowerCase().includes(t)).map(x=>{const b=S.box[x.w]||0,due=!!b&&Number(S.due[x.w]||0)<=Date.now(),m=S.memory[x.w]||null,status=!b?'new':due?'review due':S.miss[x.w]>=3?'tricky':b>=4&&S.ok[x.w]?'mastered':S.ok[x.w]?'learned':'learning',history=m&&m.attempts?` · ${m.correct}/${m.attempts} rated recalls`:'',delay=b&&!due?` · next in ${formatDelay(Math.max(0,Number(S.due[x.w]||0)-Date.now()))}`:'';return`<div class="w"><b>${x.w}</b> <small>${status}</small><br>${x.d}<small>${history}${delay}</small></div>`}).join('')};
 $('#f').oninput=draw;draw();
}
function roots(){
 main.innerHTML=`<div class="row"><button class="yes" id="rq">Quiz me on roots</button></div><p>Learn a root and you can guess words you have never seen.</p>`+R.map(x=>`<div class="w"><b>${x.r}</b>: ${x.m}<br><small>${x.x}</small></div>`).join('');
 $('#rq').onclick=rquiz;
}
function rquiz(){
 const qs=chooseCycled(R,'rootQuizSeen',10,x=>x.r);let i=0,ok=0;
 (function ask(){
  if(i>=qs.length){gain(ok*5);main.innerHTML=`<div class="card" style="cursor:default"><h2>${ok} / ${qs.length}</h2><p class="def">Roots unlock new words. Review them again tomorrow.</p></div><div class="row"><button class="yes" id="again">Another round</button></div>`;$('#again').onclick=rquiz;return}
  const c=qs[i],opts=shuffle([c,...shuffle(R.filter(x=>x.m!==c.m)).slice(0,3)]);
  main.innerHTML=`<p>Question ${i+1} of ${qs.length}</p><div class="card" style="cursor:default"><p class="ex">What does this root mean?</p><h2>${c.r}</h2></div><div class="opts">${opts.map(o=>`<button>${o.m}</button>`).join('')}</div><p id="fb"></p>`;
  const bs=[...main.querySelectorAll('.opts button')];
  bs.forEach((b,k)=>b.onclick=()=>{
   const good=opts[k]===c;
   bs.forEach((x,j)=>{x.disabled=true;if(opts[j]===c)x.classList.add('right')});
   if(good){ok++;gain(10)}else{b.classList.add('wrong');gain(1)}
   $('#fb').innerHTML=`${good?rnd(CHEER):'Not quite. <b>'+opts[k].r+'</b> means “'+opts[k].m+'”.'} <b>${c.r}</b> means “${c.m}” (${c.x})<div class="row"><button class="yes" id="nx">Next</button></div>`;
   $('#nx').onclick=()=>{i++;ask()};$('#nx').focus();
  });
 })();
}
const cap=t=>t[0].toUpperCase()+t.slice(1);
const AN=[].concat(ANALOGIES,typeof ANALOGIES2!=='undefined'?ANALOGIES2:[],typeof ANALOGIES3!=='undefined'?ANALOGIES3:[],typeof ANALOGIES4!=='undefined'?ANALOGIES4:[]).map(l=>{const[a,b,c,ans,x,y,z,why]=l.split('|');return{a,b,c,ans,o:[ans,x,y,z],why}});
function analogies(){
 main.innerHTML=`<div class="card" style="cursor:default"><h2>Analogies</h2><p class="def">Turn the first pair into a sentence, like “A is a part of B.” Then test that sentence on every answer choice.</p></div><div class="row"><button class="yes" id="go">Start 10 questions</button></div>`;
 $('#go').onclick=aquiz;
}
function aquiz(){
 const qs=chooseCycled(AN,'analogyQuizSeen',10,x=>`${x.a}|${x.b}|${x.c}|${x.ans}`);let i=0,ok=0;
 (function ask(){
  if(i>=qs.length){gain(ok*5);main.innerHTML=`<div class="card" style="cursor:default"><h2>${ok} / ${qs.length}</h2><p class="def">${ok>=9?'Analogy ace.':'Say the relationship out loud before you look at the choices.'}</p></div><div class="row"><button class="yes" id="again">Another round</button></div>`;$('#again').onclick=aquiz;return}
  const c=qs[i],opts=shuffle(c.o);
  main.innerHTML=`<p>Question ${i+1} of ${qs.length}</p><div class="card" style="cursor:default"><h2 style="font-size:1.7rem">${cap(c.a)} is to ${c.b} as ${c.c} is to ___</h2></div><div class="opts">${opts.map(o=>`<button>${o}</button>`).join('')}</div><p id="fb"></p>`;
  const bs=[...main.querySelectorAll('.opts button')];
  bs.forEach((b,k)=>b.onclick=()=>{
   const good=opts[k]===c.ans;
   bs.forEach((x,j)=>{x.disabled=true;if(opts[j]===c.ans)x.classList.add('right')});
   if(good){ok++;gain(15)}else{b.classList.add('wrong');gain(1)}
   $('#fb').innerHTML=`${good?rnd(CHEER):'Not quite. The answer is <b>'+c.ans+'</b>.'} ${c.why}<div class="row"><button class="yes" id="nx">Next</button></div>`;
   $('#nx').onclick=()=>{i++;ask()};$('#nx').focus();
  });
 })();
}
const tabs={train,quiz,mixed,analogies,roots,words};
function tab(n){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===n));tabs[n]()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
$('#npd').value=S.npd||'';$('#npd').placeholder='auto';$('#npd').onchange=e=>{const v=+e.target.value;S.npd=v>=5?Math.min(300,v):0;e.target.value=S.npd||'';save();stats()};
const unlimitedToggle=$('#unlimited');if(unlimitedToggle){unlimitedToggle.checked=!!S.unlimited;unlimitedToggle.onchange=e=>{S.unlimited=e.target.checked;save();stats();};}
S.test=S.test||'2026-11-14';S.test2=S.test2||'2026-12-12';$('#td').value=S.test;$('#td2').value=S.test2;$('#td').onchange=e=>{S.test=e.target.value;S.goal=calcGoal();save();stats()};$('#td2').onchange=e=>{S.test2=e.target.value;save();stats()};
$('#pep').textContent=rnd(PEP);
stats();tab('train');
