/* CUDER BizFlow cloud sync (Supabase table public.bizflow_user_data: user_id, data, updated_at).
   - Guest mode is untouched: without a stored sign-in nothing is loaded and nothing leaves the device.
   - Local data stays in localStorage "bizflow" (cache + backup). Neither copy is ever replaced without a choice or a backup.
   - Writes use compare-and-swap on updated_at, so a change made on another device is detected instead of overwritten.
   - Only BizFlow data (the "bizflow" state object) is synced. DownFlow never touches this file. */
(function(){
if(typeof S==='undefined'||typeof save!=='function'||!window.CuderAuth)return;
var TB='bizflow_user_data',LS=window.localStorage,AU=window.CuderAuth;
var T=function(fa,en){return window.I18N&&I18N.isEn()?en:fa};
var X=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var CS={on:false,uid:null,user:null,state:'guest',base:null,lh:null,timer:null,pt:null,poll:null,busy:false,pulling:false,applying:false,at:null,err:'',pend:null,kind:'',other:false,booted:false,booting:false,hooked:false,chk:false,manual:false,cf:0,gen:0};
/* CS.gen changes whenever the signed-in user changes or sync is reset; results of requests started under an older value are discarded */
function lg(k){try{return LS.getItem(k)}catch(e){return null}}
function norm(o){return JSON.parse(JSON.stringify(o))}
function stab(o){if(o===null||typeof o!=='object')return JSON.stringify(o);if(Array.isArray(o))return'['+o.map(stab).join(',')+']';return'{'+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+':'+stab(o[k])}).join(',')+'}'}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)+':'+s.length}
/* the app adds empty collections on load; ignore empty values so identical data is not reported as different */
function canon(o){if(Array.isArray(o))return o.map(canon);if(o&&typeof o==='object'){var r={};Object.keys(o).forEach(function(k){var v=canon(o[k]);if(v===null||v===undefined||v===''||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length))return;r[k]=v});return r}return o}
/* the audit trail stays on the device: it is neither uploaded nor compared */
function pub(o){var d=norm(o);delete d.audit;return d}
function hs(o){return hash(stab(canon(pub(o))))}
var KA=['cus','prod','inv','led','exp','mv','sup','ctr','war','apt','cmp','rec','chq','task'];
function clean(o){if(Array.isArray(o)){o.forEach(clean);return o}if(o&&typeof o==='object'){['__proto__','constructor','prototype'].forEach(function(k){if(Object.prototype.hasOwnProperty.call(o,k))delete o[k]});Object.keys(o).forEach(function(k){clean(o[k])})}return o}
function valid(d){if(!d||typeof d!=='object'||Array.isArray(d))return false;if(!KA.every(function(k){return d[k]===undefined||Array.isArray(d[k])}))return false;return d.cfg===undefined||(!!d.cfg&&typeof d.cfg==='object'&&!Array.isArray(d.cfg))}
var BAD=function(){return T('ساختار اطلاعات ذخیره‌شده در حساب نامعتبر است؛ چیزی تغییر نکرد.','The data stored in your account has an invalid format; nothing was changed.')};
function hasData(d){if(!d||typeof d!=='object')return false;if(Object.keys(d).some(function(k){return Array.isArray(d[k])&&d[k].length}))return true;var c=d.cfg||{};return!!(c.biz||c.tel||c.addr||c.logo)}
function cnt(d){d=d||{};var n=function(k){return Array.isArray(d[k])?d[k].length:0};return T(n('inv')+' فاکتور، '+n('cus')+' مشتری، '+n('prod')+' کالا',n('inv')+' invoices, '+n('cus')+' customers, '+n('prod')+' products')}
function fdate(x){try{var d=new Date(x);if(isNaN(d))return String(x);return d.toLocaleString(I18N.isEn()?'en-GB':'fa-IR',{dateStyle:'medium',timeStyle:'short'})}catch(e){return String(x)}}
function mk(){return'bizflow_sync_'+CS.uid}
function meta(){try{return JSON.parse(LS.getItem(mk())||'{}')||{}}catch(e){return{}}}
function setMeta(o){if(!CS.uid)return;try{LS.setItem(mk(),JSON.stringify(Object.assign(meta(),o)));LS.setItem('bizflow_sync_last',CS.uid)}catch(e){}}
function cli(){return AU.client()}
/* ---- local backups (kept in this browser; newest 5, identical copies are not repeated) ---- */
function bks(){var ks=[],i,k;try{for(i=0;i<LS.length;i++){k=LS.key(i);if(k&&k.indexOf('bizflow_bk_')==0)ks.push(k)}}catch(e){}return ks.sort()}
function prune(n){var ks=bks();while(ks.length>n){try{LS.removeItem(ks.shift())}catch(e){break}}}
function snap(reason,data){var str=JSON.stringify(data||S),ks=bks(),k='bizflow_bk_'+Date.now(),put=function(){LS.setItem(k,JSON.stringify({t:Date.now(),reason:reason,data:str}))};
 try{var last=ks.length&&JSON.parse(lg(ks[ks.length-1]));if(last&&last.data===str)return true}catch(e){}
 try{put()}catch(e){prune(1);try{put()}catch(e2){try{dl(str,'bizflow-backup-'+reason+'.json','application/json')}catch(e3){}return false}}
 prune(5);return true}
/* ---- status pill + settings panel ---- */
function lab(){var a=CS.state,at=CS.at?fdate(CS.at):'';
 var m={guest:['',T('مهمان','Guest'),T('حالت مهمان؛ اطلاعات فقط روی این دستگاه است. برای همگام‌سازی وارد حساب شوید.','Guest mode; data stays on this device. Sign in to sync.')],
 loading:['wa',T('در حال بررسی…','Checking…'),''],
 signedout:['',T('خارج‌شده','Signed out'),T('از حساب خارج شده‌اید یا نشست پایان یافته است؛ اطلاعات روی این دستگاه می‌ماند. برای ادامه‌ی همگام‌سازی دوباره وارد شوید.','You are signed out or the session ended; data stays on this device. Sign in again to keep syncing.')],
 choose:['wa',T('نیازمند انتخاب','Choice needed'),T('برای ادامه‌ی همگام‌سازی باید انتخاب کنید کدام نسخه بماند.','Choose which copy to keep to continue syncing.')],
 off:['',T('همگام‌سازی خاموش','Sync off'),T('همگام‌سازی فعلاً خاموش است؛ اطلاعات روی این دستگاه می‌ماند.','Sync is off for now; data stays on this device.')],
 pending:['wa',T('ذخیره‌نشده','Unsaved'),T('تغییرات در این دستگاه ذخیره شده و به‌زودی در حساب ذخیره می‌شود.','Saved on this device; will be saved to your account shortly.')],
 saving:['wa',T('در حال ذخیره…','Saving…'),''],
 saved:['ok',T('همگام','Synced'),at?T('آخرین همگام‌سازی: ','Last synced: ')+at:''],
 offline:['wa',T('آفلاین','Offline'),T('اتصال برقرار نیست؛ تغییرات روی این دستگاه ذخیره شده و پس از اتصال همگام می‌شود.','No connection; changes are saved on this device and will sync when you are back online.')],
 error:['no',T('خطای همگام‌سازی','Sync error'),CS.err||'']};
 return m[a]||m.guest}
function pill(){var p=document.getElementById('syn');if(!p)return;var l=lab();p.className='syn '+l[0];p.title=l[2]||l[1];p.setAttribute('aria-label',l[1]+(l[2]?' — '+l[2]:''));p.innerHTML='<i></i><span>'+X(l[1])+'</span>'}
function setSt(s,err){CS.state=s;CS.err=err||'';pill();panel()}
function panelHTML(){var l=lab(),u=CS.user||AU.user();
 var bkb=bks().length?' <button class="btn o sm" data-a="cs_bk">'+X(T('دانلود آخرین پشتیبان همگام‌سازی','Download latest sync backup'))+'</button>':'';
 if(!u&&(CS.state=='guest'||CS.state=='signedout'))return'<p class="mu">'+X(T('حساب CUDER','CUDER account'))+'</p><p class="mu">'+X(CS.state=='signedout'?l[2]:T('برای همگام‌سازی BizFlow بین دستگاه‌ها وارد حساب شوید. بدون حساب هم همه‌چیز روی همین دستگاه ذخیره می‌شود.','Sign in to sync BizFlow across devices. Without an account everything is saved on this device.'))+'</p><a class="btn sm" style="text-decoration:none;display:inline-block" href="../../account.html">'+X(T('ورود / ثبت‌نام','Sign in / Sign up'))+'</a>'+bkb;
 return'<p class="mu">'+X(T('حساب CUDER','CUDER account'))+'</p><div class="csp"><b>'+X(u?AU.displayName(u):'')+'</b><p class="mu">'+X(u&&u.email||'')+'</p><p><span class="'+(l[0]=='ok'?'ok':l[0]=='no'?'no':l[0]=='wa'?'wa':'mu')+'">● '+X(l[1])+'</span></p>'+(l[2]?'<p class="mu">'+X(l[2])+'</p>':'')+'<p class="mu">'+X(T('فقط اطلاعات BizFlow همگام می‌شود.','Only BizFlow data is synced.'))+'</p><button class="btn sm" data-a="cs_now">'+X(CS.state=='off'||CS.state=='choose'?T('فعال‌سازی همگام‌سازی','Turn on sync'):T('همگام‌سازی اکنون','Sync now'))+'</button> <button class="btn o sm" data-a="cs_out">'+X(T('خروج از حساب','Sign out'))+'</button> <a class="btn o sm" style="text-decoration:none;display:inline-block" href="../../account.html">'+X(T('مدیریت حساب','Manage account'))+'</a>'+bkb+'</div>'}
function panel(){var el=document.getElementById('csp');if(el){el.innerHTML=panelHTML();return}
 var dr=document.getElementById('dr'),d=document.querySelector('#dr .sbd');if(!d||!dr||dr.style.display!='block'||(typeof F!=='undefined'&&(F.st||'biz')!='data'))return;
 var w=document.createElement('div');w.id='csp';w.setAttribute('data-notr','1');w.innerHTML=panelHTML();d.insertBefore(w,d.firstChild);
 var p=d.querySelector(':scope > p.mu');if(p&&AU.user()){p.setAttribute('data-notr','1');p.textContent=T('اطلاعات روی این دستگاه نگه‌داری می‌شود و با ورود به حساب، یک نسخه از آن همگام می‌شود. از آن‌ها پشتیبان فایل هم بگیرید.','Data is kept on this device and, when you are signed in, a copy is synced. Also keep a file backup.')}}
/* ---- cloud access ---- */
function errMsg(e){var c=e&&e.code;if(c=='PGRST205'||c=='42P01')return T('جدول همگام‌سازی در سرویس پیدا نشد.','The sync table was not found on the service.');if(c=='42501')return T('دسترسی به ذخیره‌ی ابری مجاز نیست.','Access to cloud storage was denied.');return AU.msg(e||{},T)}
function isNet(e){return!navigator.onLine||(e&&!e.status&&!e.code&&/failed to fetch|network|load failed|abort|lib-/i.test((e.message||'')))}
function fetchCloud(){return cli().from(TB).select('data,updated_at').eq('user_id',CS.uid).order('updated_at',{ascending:false}).limit(1).then(function(r){if(r.error)throw r.error;return r.data&&r.data[0]||null})}
function push(d,base){var ts=new Date().toISOString(),q=cli().from(TB);
 if(base)return q.update({data:d,updated_at:ts}).eq('user_id',CS.uid).eq('updated_at',base).select('updated_at').then(function(r){if(r.error)throw r.error;if(!r.data||!r.data.length){var e=new Error('conflict');e.conflict=true;throw e}return r.data[0].updated_at});
 return q.insert({user_id:CS.uid,data:d,updated_at:ts}).select('updated_at').then(function(r){if(r.error){if(r.error.code=='23505'){var e=new Error('conflict');e.conflict=true;throw e}throw r.error}return r.data[0].updated_at})}
function fail(e){if(isNet(e)){setSt('offline')}else setSt('error',errMsg(e));if(CS.on)schedule(30000)}
/* ---- apply the cloud copy to the app (in place, so every reference to S stays valid) ---- */
function defaults(){return{cfg:{cur:'toman',biz:'',tel:'',addr:'',sig:'',logo:'',tax:0,tpl:0},cus:[],prod:[],inv:[],led:[],exp:[],seq:1000,rg:7}}
function applyCloud(row){var d=clean(norm(row.data||{})),ka=S.audit,saved=true;delete d.audit;CS.applying=true;
 try{var n=Object.assign(defaults(),d);if(ka)n.audit=ka;Object.keys(S).forEach(function(k){delete S[k]});Object.assign(S,n);try{if(typeof migrate==='function')migrate()}catch(e){}try{LS.setItem('bizflow',JSON.stringify(S))}catch(e){saved=false}}finally{CS.applying=false}
 CS.base=row.updated_at;CS.lh=hs(S);CS.at=Date.now();setMeta({base:CS.base,lh:CS.lh,t:CS.at,off:0});try{cl()}catch(e){}try{applyTheme()}catch(e){}try{render()}catch(e){}
 if(!saved)toast(T('اطلاعات حساب بارگیری شد اما ذخیره‌ی محلی انجام نشد؛ فضای مرورگر پر است.','Your account data was loaded but could not be saved locally; browser storage is full.'))}
function engage(base,lh){CS.on=true;CS.base=base;CS.lh=lh;CS.pend=null;CS.at=Date.now();setMeta({base:base,lh:lh,t:CS.at,off:0});setSt('saved');startPoll()}
function reconcile(row){var m=meta(),local=norm(S),lh=hs(local),has=hasData(local),last=lg('bizflow_sync_last');CS.other=!!(last&&last!==CS.uid&&has);
 if(row&&!valid(row.data)){setSt('error',BAD());return}
 if(!row){if(!has){engage(null,lh);return}if(m.off){setSt('off');return}ask(null,'transfer');return}
 var ch=hs(row.data);
 if(ch===lh){engage(row.updated_at,lh);return}
 if(!has&&hasData(row.data)){applyCloud(row);engage(row.updated_at,CS.lh);toast(T('اطلاعات از حساب بارگیری شد','Loaded your data from your account'));return}
 if(!CS.other&&m.base&&m.base===row.updated_at&&m.lh!==lh){engage(row.updated_at,m.lh);schedule(600);return}
 if(!CS.other&&m.lh&&m.lh===lh&&m.base!==row.updated_at){applyCloud(row);engage(row.updated_at,CS.lh);toast(T('اطلاعات از حساب به‌روز شد','Updated from your account'));return}
 if(m.off){setSt('off');return}
 ask(row,'diff')}
/* ---- choice dialog ---- */
function ask(row,kind){CS.on=false;CS.pend=row;CS.kind=kind;stopPoll();setSt('choose');dialog()}
function dialog(){var row=CS.pend,k=CS.kind,h='<div data-notr="1"><h3>';
 var warn=CS.other?'<p class="no">'+X(T('این اطلاعات قبلاً با حساب دیگری روی این دستگاه همگام شده‌اند. اگر دستگاه مشترک است، آن‌ها را به این حساب منتقل نکنید.','This data was previously synced with a different account on this device. If the device is shared, do not move it into this account.'))+'</p>':'';
 var lts=+lg('bizflow_lts')||0,loc='<div class="cd"><b>'+X(T('نسخه‌ی این دستگاه','This device’s copy'))+'</b><p class="mu">'+X(cnt(S))+(lts?' · '+X(T('آخرین تغییر: ','Last change: ')+fdate(lts)):'')+'</p></div>';
 if(k=='transfer'){h+=X(T('انتقال اطلاعات این دستگاه به حساب','Move this device’s data to your account'))+'</h3><p>'+X(T('در حساب شما هنوز اطلاعات BizFlow ذخیره نشده است. اطلاعات این دستگاه به حساب منتقل شود؟ نسخه‌ی این دستگاه حذف یا تغییر نمی‌کند.','No BizFlow data is stored in your account yet. Move this device’s data into your account? The copy on this device is not deleted or changed.'))+'</p>'+warn+loc+'<p><button class="btn sm" data-a="cs_up">'+X(T('انتقال به حساب','Move to account'))+'</button> <button class="btn o sm" data-a="cs_later">'+X(T('فعلاً نه','Not now'))+'</button> <button class="btn o sm" data-a="cs_dl">'+X(T('دانلود پشتیبان','Download backup'))+'</button></p></div>'}
 else{h+=X(T('کدام نسخه نگه داشته شود؟','Which copy should be kept?'))+'</h3><p>'+X(T('اطلاعات این دستگاه با نسخه‌ی حساب شما فرق دارد. نسخه‌ای که انتخاب نمی‌کنید پیش از جایگزینی در یک پشتیبان محلی نگه‌داری می‌شود. هیچ‌چیز بدون انتخاب شما حذف نمی‌شود.','This device differs from the copy in your account. The copy you do not choose is kept in a local backup before anything is replaced. Nothing is deleted without your choice.'))+'</p>'+warn+loc+'<div class="cd"><b>'+X(T('نسخه‌ی حساب','Account copy'))+'</b><p class="mu">'+X(cnt(row&&row.data))+(row?' · '+X(T('آخرین ذخیره: ','Last saved: ')+fdate(row.updated_at)):'')+'</p></div><p><button class="btn sm" data-a="cs_cloud">'+X(T('نگه‌داشتن نسخه‌ی حساب','Keep account copy'))+'</button> <button class="btn sm" data-a="cs_local">'+X(T('نگه‌داشتن نسخه‌ی این دستگاه','Keep this device’s copy'))+'</button></p><p><button class="btn o sm" data-a="cs_later">'+X(T('فعلاً هیچ‌کدام','Neither for now'))+'</button> <button class="btn o sm" data-a="cs_dl">'+X(T('دانلود پشتیبان این دستگاه','Download this device’s backup'))+'</button></p></div>'}
 md(h)}
/* ---- uploads ---- */
function schedule(ms){clearTimeout(CS.timer);CS.timer=setTimeout(function(){upload()},ms||2500)}
function upload(force){if(!CS.on||CS.busy)return;var d=pub(S),h=hs(d);if(h===CS.lh&&!force){setSt('saved');return}
 var js=JSON.stringify(d);if(js.length>4500000){setSt('error',T('حجم اطلاعات برای ذخیره در حساب زیاد است. از تنظیمات پشتیبان فایل بگیرید.','The data is too large to store in your account. Use a file backup from Settings.'));return}
 if(!navigator.onLine){setSt('offline');return}
 var g=CS.gen;CS.busy=true;setSt('saving');
 push(d,CS.base).then(function(ts){if(g!==CS.gen)return;CS.busy=false;CS.cf=0;CS.base=ts;CS.lh=h;CS.at=Date.now();setMeta({base:ts,lh:h,t:CS.at,off:0});if(hs(S)!==h){setSt('pending');schedule(1500)}else setSt('saved')}).catch(function(e){if(g!==CS.gen)return;CS.busy=false;if(e&&e.conflict)conflict();else fail(e)})}
function conflict(){var g=CS.gen;CS.on=false;
 fetchCloud().then(function(row){if(g!==CS.gen)return;
  if(!row){if(++CS.cf>2){CS.on=true;setSt('error',T('ذخیره در حساب ممکن نشد؛ دسترسی خواندن یا نوشتن مجاز نیست.','Saving to your account failed; read or write access was refused.'));return}CS.on=true;CS.base=null;upload(true);return}
  if(!valid(row.data)){setSt('error',BAD());return}
  if(row.updated_at===CS.base){CS.on=true;setSt('error',T('ذخیره در حساب انجام نشد؛ دسترسی نوشتن مجاز نیست.','Saving to your account failed; write access was refused.'));return}
  if(hs(row.data)===hs(S)){engage(row.updated_at,hs(S));return}
  ask(row,'diff')}).catch(function(e){if(g!==CS.gen)return;CS.on=true;fail(e)})}
/* ---- pull changes made on other devices ---- */
function startPoll(){stopPoll();CS.poll=setInterval(check,45000)}
function stopPoll(){clearInterval(CS.poll);clearTimeout(CS.timer);clearTimeout(CS.pt);CS.poll=null}
function editing(){var m=document.getElementById('md'),d=document.getElementById('dr'),a=document.activeElement;return(m&&m.style.display=='flex')||(d&&d.style.display=='block')||(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))}
function check(){if(!CS.on||CS.busy||CS.pulling||document.hidden||!navigator.onLine)return;var g=CS.gen;
 cli().from(TB).select('updated_at').eq('user_id',CS.uid).order('updated_at',{ascending:false}).limit(1).then(function(r){if(g!==CS.gen||!CS.on)return;if(r.error)throw r.error;var row=r.data&&r.data[0];
  if(!row){if(CS.base){CS.base=null;upload(true)}return}
  if(row.updated_at===CS.base)return;
  if(hs(S)!==CS.lh){upload();return}
  pull(g)}).catch(function(e){if(g===CS.gen&&e&&(e.status==401||e.code=='PGRST301'))setSt('error',errMsg(e))})}
function pull(g){if(CS.pulling)return;CS.pulling=true;var done=function(){CS.pulling=false};
 fetchCloud().then(function(row){if(g!==CS.gen||!CS.on){done();return}if(!row){done();return}if(!valid(row.data)){done();setSt('error',BAD());return}
  if(editing()){done();clearTimeout(CS.pt);CS.pt=setTimeout(function(){if(g===CS.gen&&CS.on)check()},10000);return}
  if(hs(S)!==CS.lh){done();upload();return}
  applyCloud(row);done();setSt('saved');toast(T('اطلاعات از حساب به‌روز شد','Updated from your account'))}).catch(function(){done()})}
/* ---- session lifecycle ---- */
function reset(){CS.gen++;CS.on=false;CS.busy=false;CS.pulling=false;CS.cf=0;CS.pend=null;CS.kind='';stopPoll()}
function start(u){if(CS.uid===u.id){CS.user=u;if(CS.on||CS.state=='choose'||CS.state=='loading')return}else if(CS.state=='choose'){try{cl()}catch(e){}}
 reset();CS.uid=u.id;CS.user=u;setSt('loading');var g=CS.gen;
 fetchCloud().then(function(row){if(g!==CS.gen)return;reconcile(row)}).catch(function(e){if(g!==CS.gen)return;fail(e)})}
function stop(kind){reset();CS.uid=null;CS.user=null;CS.base=null;CS.lh=null;setSt(kind=='out'?'signedout':'guest')}
function hook(){if(CS.hooked)return;CS.hooked=true;AU.onChange(function(ev,s){var u=s&&s.user;
 if(u){if(ev=='TOKEN_REFRESHED'&&u.id===CS.uid)CS.user=u;else start(u)}
 else if(ev=='SIGNED_OUT'){var m=CS.manual;CS.manual=false;stop(m?'':'out')}})}
function boot(){if(CS.booting||CS.booted||!AU.hasStoredSession())return;CS.booting=true;if(!CS.uid)setSt('loading');hook();
 AU.ready().then(function(){CS.booting=false;CS.booted=true;var u=AU.user();if(u)start(u);else if(CS.state=='loading')setSt('guest')}).catch(function(e){CS.booting=false;if(navigator.onLine)setSt('error',AU.msg(e,T));else setSt('offline')})}
/* the session may change without this page doing anything (sign-in or sign-out in another tab, account switch, expiry): re-read it */
function recheck(){if(CS.chk)return;if(!AU.hasStoredSession()){if(CS.uid&&!CS.manual)stop('out');return}
 if(!CS.booted){boot();return}
 CS.chk=true;AU.refresh().then(function(s){CS.chk=false;var u=s&&s.user;if(u){if(u.id!==CS.uid)start(u)}else if(CS.uid)stop('out')}).catch(function(){CS.chk=false})}
/* ---- wrap the app: save hook, settings panel, destructive actions ---- */
var osave=save;save=function(){var r=osave.apply(this,arguments);try{LS.setItem('bizflow_lts',String(Date.now()))}catch(e){}if(CS.on&&!CS.applying){setSt('pending');schedule()}return r};
var odr=A.dr;A.dr=function(){var r=odr.apply(this,arguments);try{panel();var f=document.getElementById('rsf');if(f&&f.onchange){var o=f.onchange;f.onchange=function(){if(CS.on){if(!confirm(T('شما وارد حساب هستید؛ بعد از بازیابی، اطلاعات ذخیره‌شده در حساب هم با این فایل جایگزین می‌شود. یک نسخه‌ی پشتیبان از اطلاعات فعلی در این دستگاه نگه‌داری می‌شود. ادامه؟','You are signed in; after restoring, the data stored in your account is also replaced by this file. A backup of the current data is kept on this device. Continue?'))){this.value='';return}snap('before-restore')}return o.apply(this,arguments)}}}catch(e){}return r};
var owipe=A.wipe;A.wipe=function(){if(!CS.on)return owipe.apply(this,arguments);if(!confirm(T('همه‌ی اطلاعات پاک شود؟ چون وارد حساب هستید، اطلاعات ذخیره‌شده در حساب و دستگاه‌های دیگر هم پاک می‌شود. یک نسخه‌ی پشتیبان در این دستگاه نگه‌داری می‌شود.','Delete all data? Because you are signed in, the data stored in your account and on your other devices is deleted too. A backup is kept on this device.')))return;snap('before-wipe');var c=window.confirm;window.confirm=function(){return true};try{return owipe.apply(this,arguments)}finally{window.confirm=c}};
A.cs_up=function(){if(!CS.uid||CS.state!='choose')return;cl();CS.on=true;CS.base=null;CS.lh='';CS.pend=null;startPoll();upload(true)};
A.cs_cloud=function(){var row=CS.pend;if(!row||!CS.uid||CS.state!='choose')return;if(!valid(row.data)){setSt('error',BAD());return}snap('local-before-cloud');applyCloud(row);engage(row.updated_at,CS.lh);toast(T('نسخه‌ی حساب نگه داشته شد','Kept the account copy'))};
A.cs_local=function(){var row=CS.pend;if(!row||!CS.uid||CS.state!='choose')return;snap('cloud-before-local',row.data);cl();CS.on=true;CS.base=row.updated_at;CS.lh='';CS.pend=null;startPoll();upload(true)};
A.cs_later=function(){cl();if(!CS.uid)return;setMeta({off:1});reset();setSt('off')};
A.cs_dl=function(){dl(JSON.stringify(S),'bizflow-backup-local.json','application/json')};
A.cs_bk=function(){var ks=bks();if(!ks.length)return;try{var b=JSON.parse(lg(ks[ks.length-1]));dl(b.data,'bizflow-backup-'+(b.reason||'sync')+'-'+new Date(b.t).toISOString().slice(0,10)+'.json','application/json')}catch(e){toast(T('خواندن پشتیبان ممکن نشد.','Could not read the backup.'))}};
A.cs_now=function(){var u=AU.user();if(!u){location.href='../../account.html';return}if(CS.state=='off'||CS.state=='choose'||CS.state=='error'||CS.state=='offline'||!CS.on){if(CS.uid)setMeta({off:0});start(u);return}check();upload()};
A.cs_out=function(){CS.manual=true;AU.signOut().then(function(){CS.manual=false;stop('')}).catch(function(){CS.manual=false;toast(T('خروج انجام نشد؛ دوباره تلاش کنید.','Sign-out failed; please try again.'))})};
A.synp=function(){if(CS.state=='choose'&&(CS.pend||CS.kind=='transfer')){dialog();return}F.st='data';A.dr()};
/* status pill in the top bar */
var st=document.createElement('style');st.textContent='.syn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--bd);background:transparent;color:var(--mu);border-radius:99px;padding:3px 10px;font:inherit;font-size:.74rem;line-height:1.6;cursor:pointer;white-space:nowrap}.syn i{width:8px;height:8px;border-radius:50%;background:var(--mu);flex:none}.syn.ok i{background:var(--ok)}.syn.wa i{background:var(--wa)}.syn.no i{background:var(--no)}.csp{border:1px solid var(--bd);border-radius:12px;padding:10px;margin:6px 0 12px}.csp p{margin:4px 0}@media(max-width:700px){.syn span{display:none}.syn{padding:6px}}';document.head.appendChild(st);
var p=document.createElement('button');p.id='syn';p.type='button';p.setAttribute('data-a','synp');p.setAttribute('data-notr','1');var tp=document.querySelector('.tp'),sr=document.querySelector('.tp .srch');if(tp)tp.insertBefore(p,sr||null);
var oi=window.__i18nChange;window.__i18nChange=function(){if(oi)oi.apply(this,arguments);pill();panel()};
window.addEventListener('online',function(){if(!CS.booted){recheck()}else if(CS.on){upload();check()}else if(CS.state=='offline'&&CS.uid){var u=AU.user();if(u)start(u)}else recheck()});
window.addEventListener('offline',function(){if(CS.on)setSt('offline')});
window.addEventListener('storage',function(e){if(e.key===null||e.key===AU.storageKey())recheck()});
window.addEventListener('pageshow',function(e){if(e.persisted)recheck()});
document.addEventListener('visibilitychange',function(){if(!document.hidden){recheck();if(CS.on)check()}});
setSt('guest');boot();
})();
