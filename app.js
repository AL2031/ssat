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
function touch(){const t=new Date().toDateString();if(S.last!==t){S.streak=S.last===new Date(Date.now()-DAY).toDateString()?S.streak+1:1;S.last=t;S.n=0}}
function gain(n){touch();S.xp+=n;save();stats()}
function stats(){
 const m=W.filter(x=>S.box[x.w]>=4&&S.ok[x.w]).length,L=W.filter(x=>S.ok[x.w]).length,lv=Math.min(LV.length-1,Math.floor(S.xp/250));
 const left=S.test?Math.ceil((new Date(S.test+'T00:00')-Date.now())/DAY):null;
 $('#left').textContent=left===null?'?':Math.max(left,0);
 $('#streak').textContent=S.streak;$('#lvl').textContent=LV[lv];$('#xp').textContent=S.xp;
 $('#bar').style.width=100*L/W.length+'%';$('#mast').textContent=L+' learned, '+m+' mastered, of '+W.length+' words';
}
function train(){
 touch();const goal=S.npd||70,now=Date.now();
 const due=shuffle(W.filter(x=>S.box[x.w]&&S.due[x.w]<=now)).slice(0,30);
 const fresh=W.filter(x=>!S.box[x.w]).slice(0,Math.max(0,Math.min(10,goal-S.n)));
 const mk=(c,isNew)=>({c,isNew,fails:0,need:isNew||!S.ok[c.w]?2:1,study:isNew});
 const q=shuffle(due.map(c=>mk(c,false)).concat(fresh.map(c=>mk(c,true)))),total=q.length;
 const finish=it=>{const w=it.c.w;setBox(w,it.fails?1:(S.box[w]||0)+1);if(S.miss[w]>=3)setBox(w,Math.min(S.box[w],3));S.ok[w]=true;if(it.isNew)S.n++;save();stats()};
 (function show(){
  if(!q.length){
   const left=goal-S.n;
   main.innerHTML=`<div class="card" style="cursor:default"><h2>${S.n} / ${goal} learned today</h2><p class="def">${total?'Batch done.':'Nothing is due right now.'} ${left<=0?'Daily goal hit.':'A word only counts once you can recall it correctly, twice.'}</p></div><div class="row">${left>0&&W.some(x=>!S.box[x.w])?'<button class="yes" id="more">Next batch</button>':''}<button id="qz">Take a quiz</button></div>`;
   const m=$('#more');if(m)m.onclick=train;$('#qz').onclick=()=>tab('quiz');return}
  const it=q[0],c=it.c,ex=c.e?' “'+c.e+'”':'';
  if(it.study){
   main.innerHTML=`<p>New word. Learned today: ${S.n} of ${goal}</p><div class="card" style="cursor:default"><h2>${c.w}</h2><p class="def">${c.d}</p><p class="ex">${c.e?'“'+c.e+'”':''}</p></div><div class="row"><button class="yes" id="ok">Got it, quiz me soon</button></div>`;
   $('#ok').onclick=()=>{it.study=false;q.shift();q.splice(Math.min(q.length,3),0,it);show()};$('#ok').focus();return}
  const rev=Math.random()<.4,opts=shuffle([c,...shuffle(W.filter(x=>x.d!==c.d)).slice(0,3)]);
  main.innerHTML=`<p>${q.length} to go. Learned today: ${S.n} of ${goal}</p><div class="card" style="cursor:default"><p class="ex">${rev?'Which word means:':'What does this word mean?'}</p><h2>${rev?c.d:c.w}</h2></div><div class="opts">${opts.map(o=>`<button>${rev?o.w:o.d}</button>`).join('')}<button>I don’t know yet</button></div><p id="fb"></p>`;
  const bs=[...main.querySelectorAll('.opts button')];
  bs.forEach((b,k)=>b.onclick=()=>{
   const pick=k<4?opts[k]:null,good=pick===c;
   bs.forEach((x,j)=>{x.disabled=true;if(opts[j]===c)x.classList.add('right')});
   if(pick&&!good)b.classList.add('wrong');
   if(good){it.need--;gain(10)}else{it.fails++;it.need=2;S.miss[c.w]=(S.miss[c.w]||0)+1;S.ok[c.w]=false;if(!S.box[c.w])setBox(c.w,1);S.due[c.w]=now;gain(1)}
   const why=good?rnd(CHEER)+(it.need?' One more correct answer later to lock it in.':''):!pick?'No problem.':'Not quite. '+(rev?'<b>'+pick.w+'</b> means “'+pick.d+'”.':'“'+pick.d+'” is the meaning of <b>'+pick.w+'</b>.');
   $('#fb').innerHTML=`${why} <b>${c.w}</b> means “${c.d}”.${ex}<div class="row"><button class="yes" id="nx">Next</button></div>`;
   $('#nx').onclick=()=>{q.shift();if(it.need>0)q.splice(Math.min(q.length,good?5:3),0,it);else finish(it);show()};$('#nx').focus();
  });
 })();
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
$('#npd').value=S.npd||70;$('#npd').onchange=e=>{S.npd=Math.max(5,Math.min(200,+e.target.value||70));e.target.value=S.npd;save()};
$('#td').value=S.test||'';$('#td').onchange=e=>{S.test=e.target.value;save();stats()};
$('#pep').textContent=rnd(PEP);
stats();tab('train');
