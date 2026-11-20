// DownFlow web engine + `lf` bridge for the shared UI. Runs fully in the browser (fetch + Range, segments, queues, scheduler).
(function(G){
const LS={g:k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const CAT={video:'mp4 mkv avi mov wmv webm flv m4v',music:'mp3 wav flac aac ogg m4a wma',doc:'pdf doc docx xls xlsx ppt pptx txt epub',archive:'zip rar 7z tar gz iso',program:'exe msi apk dmg deb',image:'jpg jpeg png gif webp bmp'};
const cat=n=>{const e=(n.split('.').pop()||'').toLowerCase();for(const k in CAT)if(CAT[k].split(' ').includes(e))return k;return'other'};
const EXT=/\.(mp4|mkv|avi|mov|mp3|wav|flac|pdf|docx?|xlsx?|pptx?|zip|rar|7z|iso|exe|msi|apk|jpe?g|png|gif|webp)(\?|#|$)/i;
const mg=(a,b)=>{for(const k in b){const v=b[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))mg(a[k],v);else a[k]=v}return a};
const MQ=()=>({id:'main',name:'صف اصلی دانلود',par:3,active:true,start:{on:false,time:'02:00',mode:'daily',date:'',days:[0,1,2,3,4,5,6]},stop:{on:false,time:'05:00'},retry:{on:false,n:10},open:'',after:'none',force:false,boot:false});
const st=mg({dir:'',conns:6,limit:0,sr:[],clip:false,dup:'ask',showDone:true,hold:false,gdir:{},types:'',minmb:0,exc:[],quota:{on:false,mb:200,hours:5},proxy:{mode:'none'},logins:[],snd:{on:{},done:'',fail:'',start:'',stop:''},queues:[MQ()]},LS.g('df_st')||{});
if(!st.queues.length)st.queues=[MQ()];
let items=(LS.g('df_items')||[]).map(i=>{if(i.status!=='done'){i.status=i.status==='error'?'error':'paused';i.got=0}i.q=i.q||'main';return i});
const USE=LS.g('df_use')||{};
const applyTpl=(it,n)=>{const t=st.tpl;if(!t||t==='{name}')return n;let host='';const e=n.includes('.')?n.split('.').pop():'',base=e?n.slice(0,-(e.length+1)):n,d=new Date(),p2=x=>('0'+x).slice(-2);try{host=new URL(it.url).hostname.replace(/^www\./,'')}catch(x){}return t.replace(/\{name\}/g,base).replace(/\{ext\}/g,e).replace(/\{site\}/g,host).replace(/\{type\}/g,cat(n)).replace(/\{date\}/g,d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())).replace(/[<>:"\/\\|?*]/g,'_')+(t.includes('{ext}')||!e?'':'.'+e)};
try{const pw=JSON.parse(sessionStorage.getItem('df_pw')||'{}');(st.logins||[]).forEach(l=>{if(!l.pass&&pw[l.host])l.pass=pw[l.host]});if(!LS.g('df_clipv2')){st.clip=false;LS.s('df_clipv2',1)}}catch(e){}
const live={},RT={};let bucket=0,qb=0,qh=[],blocked=false;const cbU=[],cbE=[];
const nd=s=>String(s==null?'':s).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
const curLimit=()=>{const d=new Date(),m=d.getHours()*60+d.getMinutes();for(const r of st.sr||[]){const a=nd(r.from).split(':'),b=nd(r.to).split(':');if(a.length<2||b.length<2||nd(r.kb)==='')continue;const f=(+a[0])*60+(+a[1]),t=(+b[0])*60+(+b[1]);if(f<=t?(m>=f&&m<t):(m>=f||m<t))return Math.max(0,+nd(r.kb)||0)}return +st.limit||0};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LOG=[],log=m=>{LOG.push({t:Date.now(),m});if(LOG.length>300)LOG.shift()};
const snap=()=>({st,n:Object.keys(live).length,items:items.map(i=>Object.assign({},i))});
const emit=()=>{const s=snap();cbU.forEach(f=>f(s))},ev=(t,it)=>cbE.forEach(f=>f({t,name:it&&it.name}));
const persist=()=>{LS.s('df_st',Object.assign({},st,{logins:(st.logins||[]).map(l=>({host:l.host,user:l.user}))}));try{sessionStorage.setItem('df_pw',JSON.stringify(Object.fromEntries((st.logins||[]).filter(l=>l.pass).map(l=>[l.host,l.pass]))))}catch(e){}LS.s('df_items',items);LS.s('df_use',USE)};
async function hashDup(it,blob){try{if(blob.size>2e8||!(crypto&&crypto.subtle))return;const d=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));it.h=Array.from(d).map(b=>b.toString(16).padStart(2,'0')).join('');const o=items.find(x=>x!==it&&x.h===it.h);if(o){it.dup=o.name;toast('فایل تکراری: محتوای «'+it.name+'» با «'+o.name+'» یکی است');log('تکراری · '+it.name)}persist();emit()}catch(e){}}
const get=id=>items.find(i=>i.id===id),queue=id=>st.queues.find(q=>q.id===id);
const toast=m=>{if(G.document&&G.document.getElementById){const t=G.document.getElementById('toast');if(t){t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3500)}}};
function hdr(it){const h={};let a=it.auth;if(!(a&&a.u)){try{const host=new URL(it.url).hostname,l=st.logins.find(z=>z.host&&host.endsWith(z.host));if(l)a={u:l.user,p:l.pass}}catch(e){}}if(a&&a.u)h.Authorization='Basic '+btoa(unescape(encodeURIComponent(a.u+':'+(a.p||''))));return h}
function conns(it){if(it.conns)return Math.min(8,Math.max(1,it.conns));try{const h=new URL(it.url).hostname,e=st.exc.find(x=>x.host&&h.endsWith(x.host));return Math.min(8,Math.max(1,+(e?e.n:st.conns)||6))}catch(e){return 6}}
function ERR(e){const m=String(e&&e.message||e);if(/CORS|اجازه/.test(m))return{c:'E-CORS',m:'مرورگر اجازه‌ی دانلود مستقیم از این سرور را نمی‌دهد',h:'از برنامه‌ی ویندوز یا افزونه‌ی مرورگر استفاده کنید'};if(/401/.test(m))return{c:'E-401',m:'نیاز به نام کاربری و رمز',h:'نام کاربری و رمز را در پنجره‌ی افزودن وارد کنید'};const h=/HTTP (\d+)/.exec(m);if(h){const n=+h[1];return{c:'E-HTTP-'+n,m:n==404?'فایل پیدا نشد (۴۰۴)':n==403?'دسترسی ممنوع است (۴۰۳)':n==410?'لینک منقضی شده است':'خطای سرور ('+n+')',h:n==404||n==410?'لینک را دوباره از سایت مبدأ بگیرید':'کمی بعد دوباره تلاش کنید'}}if(/range/.test(m))return{c:'E-RANGE',m:'سرور ادامه‌ی دانلود را پشتیبانی نمی‌کند',h:'دانلود مجدد از ابتدا'};if(/Failed to fetch|NetworkError|network|قطع/i.test(m))return{c:'E-NET',m:'اتصال برقرار نشد یا قطع شد',h:'اینترنت را بررسی و دوباره تلاش کنید'};return{c:'E-UNK',m:m,h:'دوباره تلاش کنید'}}
const E401='نیاز به نام کاربری و رمز (401)',ECORS='این سرور اجازه‌ی دانلود مستقیم از مرورگر را نمی‌دهد (CORS)؛ از برنامه‌ی ویندوز استفاده کنید';
async function seg(it,L,rt,sg){for(let tr=0;tr<6;tr++){if(L.stop||(sg.e>=0&&sg.s+sg.d>sg.e))return;
 try{const h=hdr(it);if(rt.ranges)h.Range='bytes='+(sg.s+sg.d)+'-'+(sg.e>=0?sg.e:'');
  const r=await fetch(it.url,{headers:h,signal:L.ac.signal});if(rt.ranges&&r.status!==206)throw new Error('range');if(rt.ranges){const cr=/bytes (\d+)-(\d+)\/(\d+|\*)/.exec(r.headers.get('content-range')||''),want=sg.s+sg.d;if(!cr||+cr[1]!==want||(sg.e>=0&&+cr[2]>sg.e)||(it.size&&cr[3]!=='*'&&+cr[3]!==it.size))throw new Error('range');const et=r.headers.get('etag');if(it.etag&&et&&et!==it.etag&&!/^W\//.test(et))throw new Error('فایل روی سرور تغییر کرد؛ دانلود را دوباره شروع کنید.')}if(!r.ok&&r.status!==206)throw new Error(r.status===401?E401:'HTTP '+r.status);
  const rd=r.body.getReader();for(;;){const{done,value}=await rd.read();if(done)break;if(L.stop){try{rd.cancel()}catch(e){}return}
   const room=sg.e>=0?sg.e-(sg.s+sg.d)+1:value.length,w=value.length>room?value.subarray(0,room):value;
   if(w.length){sg.parts.push(w);sg.d+=w.length;it.got+=w.length;qb+=w.length}
   if(curLimit()>0){bucket-=w.length;while(bucket<0&&!L.stop)await sleep(40)}
   if(it.limit>0){it._b=(it._b==null?it.limit*1024/10:it._b)-w.length;while(it._b<0&&!L.stop)await sleep(40)}}
  if(L.stop||sg.e<0||sg.s+sg.d>sg.e)return;
 }catch(e){if(L.stop)return;if(tr===5||/تغییر کرد/.test(e.message))throw e;await sleep(1000*(tr+1))}}
 throw new Error('اتصال قطع شد')}
async function verify(it,blob){const a={40:'SHA-1',64:'SHA-256',128:'SHA-512'}[(it.sum||'').trim().length];if(!a){it.verify='na';return}it.verify='checking';
 const d=new Uint8Array(await crypto.subtle.digest(a,await blob.arrayBuffer()));it.verify=Array.from(d).map(b=>b.toString(16).padStart(2,'0')).join('')===it.sum.trim().toLowerCase()?'ok':'bad'}
function save(it,blob){if(G.__NOSAVE||!G.document||!G.URL||!URL.createObjectURL)return;if(G.DFX&&DFX.dirReady()){DFX.write(it,blob).then(ok=>{if(!ok)dl(it,blob)});return}dl(it,blob)}function dl(it,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=it.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000)}
async function start(it){if(live[it.id])return;const L=live[it.id]={ac:new AbortController(),stop:false};it.status='connecting';it.err='';it.last=Date.now();log('شروع · '+(it.name||it.url));
 try{let rt=RT[it.id];
  if(!rt||!rt.segs){let r;try{r=await fetch(it.url,{headers:Object.assign(hdr(it),{Range:'bytes=0-0'}),signal:L.ac.signal})}catch(e){if(L.stop)return;throw new Error(ECORS)}
   let size=0,ranges=false;it.etag=r.headers.get('etag')||'';it.lm=r.headers.get('last-modified')||'';if(r.status===206){ranges=true;size=+(String(r.headers.get('content-range')||'').split('/')[1])||0}else if(r.ok){size=+r.headers.get('content-length')||0}else throw new Error(r.status===401?E401:'HTTP '+r.status);
   const cd=/filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(r.headers.get('content-disposition')||'');try{r.body&&r.body.cancel()}catch(e){}if(L.stop)return;
   if(!it.name){let n='download';try{n=decodeURIComponent(cd?cd[1]:new URL(it.url).pathname.split('/').pop())||n}catch(e){}it.name=applyTpl(it,n.replace(/[<>:"/\\|?*]/g,'_'))}
   it.cat=cat(it.name);it.size=size;it.got=0;if(size>1.5e9)throw new Error('حجم فایل بیش از ۱٫۵ گیگابایت است؛ نسخه‌ی وب فایل را در حافظه نگه می‌دارد و ممکن است مرورگر از کار بیفتد. برای فایل‌های بزرگ از دانلودمنیجر دسکتاپ استفاده کنید.');const n=ranges&&size>1048576?conns(it):1,segs=[];
   if(size&&n>1){const p=Math.ceil(size/n);for(let i=0;i<n;i++){const s=i*p,e=Math.min(size-1,s+p-1);if(s<=e)segs.push({s,e,d:0,parts:[]})}}else segs.push({s:0,e:size?size-1:-1,d:0,parts:[]});
   rt=RT[it.id]={ranges,segs}}
  it.status='downloading';await Promise.all(rt.segs.map(sg=>seg(it,L,rt,sg)));if(L.stop)return;
  const parts=[];rt.segs.forEach(s=>s.parts.forEach(p=>parts.push(p)));if(it.size&&parts.reduce((a,p)=>a+p.length,0)!==it.size){delete RT[it.id];throw new Error('حجم دریافتی با حجم اعلام‌شده برابر نیست؛ فایل ناقص است و تحویل داده نشد.')}const blob=new Blob(parts,{type:'application/octet-stream'});
  it.status='done';it.speed=0;it.done=Date.now();if(it.sum)await verify(it,blob);RT[it.id]={blob};save(it,blob);hashDup(it,blob);ev('done',it);log('تکمیل · '+it.name);
  if(!items.some(i=>i.q===it.q&&['queued','downloading','connecting'].includes(i.status)))ev('qdone');
 }catch(e){if(!L.stop){const x=ERR(e);if(it.mirrors&&it.mirrors.length&&(it.fo||0)<6){const nx=it.mirrors.shift();it.mirrors.push(it.url);it.url=nx;delete RT[it.id];it.got=0;it.status='queued';it.startAt=Date.now()+1500;it.fo=(it.fo||0)+1;log('تغییر خودکار سرور · '+nx);return}it.err=x.m;it.ec=x.c;it.hint=x.h;log('خطا · '+(it.name||it.url)+' · '+x.c);const q=queue(it.q);if(q&&q.retry.on&&it.tries<q.retry.n){it.tries++;it.status='queued';it.startAt=Date.now()+5000}else{it.status='error';ev('fail',it)}}}
 finally{delete live[it.id];persist();emit()}}
function pause(id){const it=get(id),L=live[id];if(L){L.stop=true;L.ac.abort()}if(it&&it.status!=='done'){it.status='paused';it.speed=0;it.qp=false}persist()}
function tick(){const now=Date.now(),d=new Date(),p2=n=>('0'+n).slice(-2),hm=p2(d.getHours())+':'+p2(d.getMinutes()),key=d.toDateString()+hm,Q=st.quota;
 qh.push([now,qb]);if(qb){const dk=new Date().toISOString().slice(0,10);USE[dk]=(USE[dk]||0)+qb}qb=0;qh=qh.filter(e=>now-e[0]<3600e3*(Q.hours||1));blocked=!!Q.on&&qh.reduce((a,e)=>a+e[1],0)/1048576>=Q.mb;
 if(blocked)Object.keys(live).forEach(id=>{const i=get(id);pause(id);i.err='سقف دانلود پر شد';i.qp=true});
 for(const q of st.queues){if(q.start.on&&q.start.time===hm&&q._k!==key&&(q.start.mode==='daily'?q.start.days.includes(d.getDay()):q.start.date===d.toISOString().slice(0,10))){q._k=key;api.startQ(q.id)}if(q.stop.on&&q.stop.time===hm&&q._s!==key){q._s=key;api.stopQ(q.id)}}
 const act={};Object.keys(live).forEach(id=>{const i=get(id);if(i)act[i.q]=(act[i.q]||0)+1});
 for(const it of items.slice().sort((a,b)=>(b.pri==null?1:b.pri)-(a.pri==null?1:a.pri))){it.speed=live[it.id]?Math.max(0,it.got-(it._lg||0)):0;it._lg=it.got;const q=queue(it.q);if(it.status==='queued'&&(it.startAt||0)<=now&&q&&q.active&&!blocked&&(act[q.id]||0)<q.par){act[q.id]=(act[q.id]||0)+1;start(it)}}persist()}
const dlJson=(txt,name)=>{if(!G.document)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;a.click()};
const api={on:cb=>{cbU.push(cb)},ev:cb=>{cbE.push(cb)},snap:async()=>snap(),
 add:async(url,o={})=>{if(st.dup==='skip'){const d=items.find(i=>i.url===url&&i.status!=='error');if(d)return d}
  const it={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),url,name:o.name||'',auth:o.auth||null,sum:o.sum||'',desc:o.desc||'',q:o.q||'main',conns:+o.conns||0,limit:+o.limit||0,pri:o.pri==null?1:+o.pri,size:0,got:0,speed:0,tries:0,status:o.hold?'paused':'queued',cat:'other',startAt:o.startAt||0,added:Date.now(),last:0};items.push(it);persist();emit();return it},
 pause:async id=>pause(id),resume:async id=>{const it=get(id);if(it&&['paused','error'].includes(it.status)){it.status='queued';it.startAt=0;it.err='';it.qp=false;it.tries=0}},
 redo:async id=>{pause(id);const it=get(id);if(it){delete RT[id];it.got=0;it.status='queued';it.err='';it.startAt=0;it.tries=0;it.verify=''}},
 remove:async id=>{pause(id);delete RT[id];items=items.filter(i=>i.id!==id);persist()},delDone:async()=>{items=items.filter(i=>i.status!=='done');persist()},
 pauseAll:async()=>{items.forEach(i=>['downloading','connecting','queued'].includes(i.status)&&pause(i.id))},resumeAll:async()=>{items.forEach(i=>{if(['paused','error'].includes(i.status)){i.status='queued';i.startAt=0;i.err=''}})},
 startQ:async id=>{const q=queue(id);if(!q)return;q.active=true;items.forEach(i=>{if(i.q===id&&i.qp&&i.status==='paused'){i.status='queued';i.qp=false;i.err=''}});ev('qstart')},
 stopQ:async id=>{const q=queue(id);if(!q)return;q.active=false;items.forEach(i=>{if(i.q===id&&['downloading','connecting','queued'].includes(i.status)){pause(i.id);i.qp=true}});ev('qstop')},
 move:async(id,d)=>{const i=items.findIndex(x=>x.id===id);if(i<0)return;let j=i+d;while(j>=0&&j<items.length&&items[j].q!==items[i].q)j+=d;if(j<0||j>=items.length)return;[items[i],items[j]]=[items[j],items[i]];persist()},
 set:async s=>{Object.assign(st,s);const ids=st.queues.map(q=>q.id);items.forEach(i=>{if(!ids.includes(i.q))i.q=ids[0]});persist()},
 clip:async()=>{try{return await navigator.clipboard.readText()}catch(e){return''}},
 grab:async u=>{const h=await(await fetch(u)).text(),out=new Set(),re=/(?:href|src)\s*=\s*["']([^"'#]+)["']/gi;let m;while((m=re.exec(h))){try{const x=new URL(m[1],u).href;if(/^https?:/.test(x)&&EXT.test(x))out.add(x)}catch(e){}}return[...out].slice(0,300)},
 open:async id=>{const r=RT[id],it=get(id);if(r&&r.blob&&it)save(it,r.blob);else toast('فایل در پوشه‌ی دانلود مرورگر ذخیره شده است')},show:async()=>toast('فایل در پوشه‌ی دانلود مرورگر ذخیره شده است'),
 dir:async()=>null,file:async()=>null,exp:async()=>dlJson(JSON.stringify(items,null,1),'downflow-list.json'),
 imp:async()=>{if(!G.document)return;const f=document.createElement('input');f.type='file';f.accept='.json';f.onchange=()=>{const r=new FileReader();r.onload=()=>{try{JSON.parse(r.result).forEach(i=>{i.id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);if(i.status!=='done')i.status='paused';i.got=0;i.q=i.q||'main';items.push(i)});persist();emit()}catch(e){toast('فایل نامعتبر')}};r.readAsText(f.files[0])};f.click()},quit:async()=>{}};
setInterval(()=>{bucket=curLimit()*1024/10;items.forEach(i=>{if(i.limit>0)i._b=i.limit*1024/10})},100);setInterval(tick,1000);setInterval(emit,500);
api.setPri=async(id,p)=>{const it=get(id);if(it){it.pri=p;persist()}};api.log=async()=>LOG.slice();api.usage=async()=>Object.assign({},USE);
api.probe=async url=>{try{const r=await fetch(url,{headers:Object.assign(hdr({url,auth:null}),{Range:'bytes=0-0'})});let size=0,ranges=false;if(r.status===206){ranges=true;size=+(String(r.headers.get('content-range')||'').split('/')[1])||0}else if(r.ok)size=+r.headers.get('content-length')||0;else return{ok:false,err:ERR(new Error(r.status===401?E401:'HTTP '+r.status))};const cd=/filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(r.headers.get('content-disposition')||'');try{r.body&&r.body.cancel()}catch(e){}let name='';try{name=decodeURIComponent(cd?cd[1]:new URL(url).pathname.split('/').pop())}catch(e){}return{ok:true,size,ranges,name,type:r.headers.get('content-type')||''}}catch(e){return{ok:false,err:ERR(new Error(ECORS))}}};
G.lf=api;G.WebEngine={live,curLimit,items:()=>items,st,RT,tick,isBlocked:()=>blocked};
})(typeof window!=='undefined'?window:globalThis);
