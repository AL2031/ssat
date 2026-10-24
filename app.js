const S=Object.assign({box:{},due:{},xp:0,streak:0,n:0,ok:{},miss:{}},JSON.parse(localStorage.getItem('ssat')||'{}'));
const seen=new Set(),W=[].concat(WORDS,typeof WORDS2!=='undefined'?WORDS2:[],typeof WORDS3!=='undefined'?WORDS3:[],typeof WORDS4!=='undefined'?WORDS4:[],typeof WORDS5!=='undefined'?WORDS5:[],typeof WORDS6!=='undefined'?WORDS6:[],typeof WORDS7!=='undefined'?WORDS7:[]).map(l=>{const[w,d,e]=l.split('|');return{w,d,e}}).filter(x=>!seen.has(x.w)&&seen.add(x.w));
const P=typeof PRIORITY!=='undefined'?PRIORITY:[],rk=x=>(P.indexOf(x.w)+1)||9999;W.sort((a,b)=>rk(a)-rk(b));
const R=ROOTS.map(l=>{const[r,m,x]=l.split('|');return{r,m,x}});
const DAY=864e5,GAP=[0,1,2,4,8,14],$=s=>document.querySelector(s),main=$('#main');
const save=()=>localStorage.setItem('ssat',JSON.stringify(S));
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
const rnd=a=>a[Math.floor(Math.random()*a.length)];
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
 $('#pace').textContent=left===null?'':left===0?'Test day. You have got this.':'Tests in '+ds.join(' and ')+' days. Daily new-word target: '+(S.npd||S.goal||calcGoal())+'. Study in small flashcard batches; overdue reviews come first.';
 $('#streak').textContent=S.streak;$('#lvl').textContent=LV[lv];$('#xp').textContent=S.xp;
 $('#bar').style.width=100*L/W.length+'%';$('#mast').textContent=L+' learned, '+m+' mastered, of '+W.length+' words';
}
function train(){
 touch();if(!S.goal)S.goal=calcGoal();
 const goal=S.npd||S.goal,batchSize=10,maxReviews=20;
 let reviewsDone=0,newIntroduced=0;
 const intervalDays=[0,1,2,4,8,14];
 const dueCards=()=>W.filter(x=>S.box[x.w]&&Number(S.due[x.w]||0)<=Date.now())
   .sort((a,b)=>(Number(S.due[a.w]||0)-Number(S.due[b.w]||0)) || ((S.miss[b.w]||0)-(S.miss[a.w]||0)));
 const freshCards=()=>W.filter(x=>!S.box[x.w]).slice(0,Math.max(0,Math.min(batchSize,goal-S.n)));
 const plan=(c,rating)=>{
  const level=Math.max(0,Math.min(5,Number(S.box[c.w]||0)));
  if(rating==='again')return{level:1,ms:10*60*1000,label:'10 min'};
  if(rating==='hard')return{level:Math.max(1,level),ms:Math.max(12*60*60*1000,(intervalDays[Math.max(1,level)]||1)*DAY/2),label:level<=1?'12 hours':`${Math.max(12,Math.round((intervalDays[level]||1)*12))} hours`};
  if(rating==='good'){const next=Math.min(5,Math.max(1,level+1));return{level:next,ms:intervalDays[next]*DAY,label:`${intervalDays[next]} day${intervalDays[next]===1?'':'s'}`};}
  const next=Math.min(5,Math.max(2,level+2)),days=Math.min(30,Math.max(3,Math.round(intervalDays[next]*1.5)));
  return{level:next,ms:days*DAY,label:`${days} days`};
 };
 const q=dueCards().slice(0,maxReviews).map(c=>({c,isNew:false,counted:true,reviewCounted:false,retries:0,revealed:false}));
 freshCards().forEach(c=>q.push({c,isNew:true,counted:false,retries:0,revealed:false}));
 function startNextBatch(){tab('train')}
 function show(){
  if(!q.length){
   const pendingReviews=dueCards().length,canAddNew=S.n<goal&&W.some(x=>!S.box[x.w]);
   const doneToday=S.n>=goal;
   main.innerHTML=`<div class="study-summary"><p class="eyebrow">BATCH COMPLETE</p><h2>${newIntroduced} new card${newIntroduced===1?'':'s'} introduced</h2><p>${reviewsDone} review${reviewsDone===1?'':'s'} completed in this batch.</p><p class="def">${pendingReviews?`${pendingReviews} overdue review${pendingReviews===1?'':'s'} remain. Review them before adding more new words.`:doneToday?'Daily new-card target reached. You can stop here and let spaced repetition do its work.':'Great work. Finish this batch, then return when more cards are due.'}</p></div><div class="row">${pendingReviews||canAddNew?'<button class="yes" id="more">'+(pendingReviews?'Continue reviews':'Next new-card batch')+'</button>':''}<button id="qz">Practice quiz</button></div>`;
   const m=$('#more');if(m)m.onclick=startNextBatch;$('#qz').onclick=()=>tab('quiz');return;
  }
  const it=q[0],c=it.c;
  const index=q.length,kind=it.isNew?'NEW WORD':'SPACED REVIEW';
  const countLine=`New cards today: ${S.n} / ${goal} · Reviews completed this batch: ${reviewsDone}`;
  const revealMarkup=it.revealed?`<div class="flashcard-back"><p class="eyebrow">DEFINITION</p><p class="def">${c.d}</p>${c.e?`<p class="ex">“${c.e}”</p>`:''}</div><p class="recall-prompt">How well did you remember it?</p><div class="rating-grid"><button class="rate-again" data-rate="again"><b>Again</b><small>${it.retries<2?'Retry in this batch':'Review in 10 min'}</small></button><button class="rate-hard" data-rate="hard"><b>Hard</b><small>${plan(c,'hard').label}</small></button><button class="rate-good" data-rate="good"><b>Good</b><small>${plan(c,'good').label}</small></button><button class="rate-easy" data-rate="easy"><b>Easy</b><small>${plan(c,'easy').label}</small></button></div>`:`<div class="flashcard-front"><p class="eyebrow">${kind}</p><h2>${c.w}</h2><p class="recall-prompt">Think of the definition before you reveal it. Say it out loud or recall it in your head.</p><button class="yes reveal-btn" id="reveal">Reveal definition</button></div>`;
  main.innerHTML=`<div class="session-meta"><span>${it.isNew?'New card':'Review card'}</span><span>${index} card${index===1?'':'s'} in this batch to go</span></div><p class="today-line">${countLine}</p><section class="flashcard">${revealMarkup}</section>`;
  const reveal=$('#reveal');if(reveal)reveal.onclick=()=>{it.revealed=true;show();};
  main.querySelectorAll('[data-rate]').forEach(btn=>btn.onclick=()=>{
   const rating=btn.dataset.rate,w=c.w,when=Date.now(),next=plan(c,rating);
   touch();
   if(it.isNew&&!it.counted){S.n++;newIntroduced++;it.counted=true;}
   if(rating==='again'){
    S.box[w]=1;S.due[w]=when+next.ms;S.ok[w]=false;S.miss[w]=(S.miss[w]||0)+1;
    it.retries++;it.revealed=false;
    if(it.retries<=2)q.splice(Math.min(2,q.length),0,it);
   }else{
    S.box[w]=next.level;S.due[w]=when+next.ms;S.ok[w]=true;
    if(S.miss[w]>0&&(rating==='good'||rating==='easy'))S.miss[w]=Math.max(0,S.miss[w]-1);
   }
   // Count each due card once per batch, even if it is retried.
   if(!it.isNew&&!it.reviewCounted){reviewsDone++;it.reviewCounted=true;}
   S.xp+=rating==='again'?1:rating==='hard'?5:rating==='good'?10:12;
   save();stats();q.shift();show();
  });
 }
 show();
}
function quiz(){
 const sw=W.filter(x=>S.box[x.w]),pool=sw.length>=10?sw:W,weak=shuffle(pool.filter(x=>S.miss[x.w]||S.due[x.w]<=Date.now())).slice(0,5),qs=weak.concat(shuffle(pool.filter(x=>!weak.includes(x))).slice(0,10-weak.length));let i=0,ok=0;
 (function ask(){
  if(i>=qs.length){const b=ok*5;gain(b);main.innerHTML=`<div class="card" style="cursor:default"><h2>${ok} / ${qs.length}</h2><p class="def">${ok>=9?'Summit-level. Incredible.':ok>=6?'Solid climb. Missed words are flagged for review.':'Tough round, and that’s the point. Missed words come back in Train.'}</p><p class="ex">+${b} bonus XP</p></div><div class="row"><button class="yes" id="again">Another round</button></div>`;$('#again').onclick=quiz;return}
  const c=qs[i],rev=Math.random()<.4,opts=shuffle([c,...shuffle(W.filter(x=>x.d!==c.d)).slice(0,3)]);
  main.innerHTML=`<p>Question ${i+1} of ${qs.length}</p><div class="card" style="cursor:default"><p class="ex">${rev?'Which word means:':'Closest in meaning to:'}</p><h2>${rev?c.d:c.w}</h2></div><div class="opts">${opts.map(o=>`<button>${rev?o.w:o.d}</button>`).join('')}</div><p id="fb"></p>`;
  const bs=[...main.querySelectorAll('.opts button')];
  bs.forEach((b,k)=>b.onclick=()=>{
   const good=opts[k]===c;
   bs.forEach((x,j)=>{x.disabled=true;if(opts[j]===c)x.classList.add('right')});
   if(good){ok++;gain(15)}else{b.classList.add('wrong');S.miss[c.w]=(S.miss[c.w]||0)+1;S.ok[c.w]=false;setBox(c.w,1);S.due[c.w]=Date.now();gain(1)}
   $('#fb').innerHTML=`${good?rnd(CHEER):'Not quite. '+(rev?'<b>'+opts[k].w+'</b> means “'+opts[k].d+'”.':'“'+opts[k].d+'” is the meaning of <b>'+opts[k].w+'</b>.')} <b>${c.w}</b> means “${c.d}”. ${c.e?'“'+c.e+'”':''}<div class="row"><button class="yes" id="nx">Next</button></div>`;
   $('#nx').onclick=()=>{i++;ask()};$('#nx').focus();
  });
 })();
}
function words(){
 main.innerHTML=`<input id="f" placeholder="Search words" aria-label="Search words"><div id="l"></div>`;
 const draw=()=>{const t=$('#f').value.toLowerCase();$('#l').innerHTML=[...W].sort((a,b)=>a.w.localeCompare(b.w)).filter(x=>x.w.includes(t)||x.d.includes(t)).map(x=>{const b=S.box[x.w]||0;return`<div class="w"><b>${x.w}</b> <small>${S.miss[x.w]>=3?'tricky':b>=4?'mastered':S.ok[x.w]?'learned':b?'learning':'new'}</small><br>${x.d}</div>`}).join('')};
 $('#f').oninput=draw;draw();
}
function roots(){
 main.innerHTML=`<div class="row"><button class="yes" id="rq">Quiz me on roots</button></div><p>Learn a root and you can guess words you have never seen.</p>`+R.map(x=>`<div class="w"><b>${x.r}</b>: ${x.m}<br><small>${x.x}</small></div>`).join('');
 $('#rq').onclick=rquiz;
}
function rquiz(){
 const qs=shuffle(R).slice(0,10);let i=0,ok=0;
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
 const qs=shuffle(AN).slice(0,10);let i=0,ok=0;
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
const tabs={train,quiz,analogies,roots,words};
function tab(n){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===n));tabs[n]()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
$('#npd').value=S.npd||'';$('#npd').placeholder='auto';$('#npd').onchange=e=>{const v=+e.target.value;S.npd=v>=5?Math.min(300,v):0;e.target.value=S.npd||'';save();stats()};
S.test=S.test||'2026-11-14';S.test2=S.test2||'2026-12-12';$('#td').value=S.test;$('#td2').value=S.test2;$('#td').onchange=e=>{S.test=e.target.value;S.goal=calcGoal();save();stats()};$('#td2').onchange=e=>{S.test2=e.target.value;save();stats()};
$('#pep').textContent=rnd(PEP);
stats();tab('train');
