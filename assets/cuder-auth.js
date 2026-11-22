/* CUDER shared account module (website + BizFlow app). Uses the official Supabase JS v2 client.
   Config comes from js/config.js (CUDER_CFG.supabase / CUDER_CFG.worker). Only the publishable key is used. */
(function(){
var C=window.CUDER_CFG||{},SB=C.supabase||{},client=null,boot=null,sess=null,ls=[],lerr=null,ltype=null,rec=false;
function ref(){try{return new URL(SB.url).hostname.split('.')[0]}catch(e){return''}}
function skey(){return'sb-'+ref()+'-auth-token'}
/* confirmation / recovery links arrive as #access_token=…&type=… or #error=…; read them before the client cleans the URL */
(function(){try{var q=new URLSearchParams((location.hash||'').replace(/^#/,'')+'&'+(location.search||'').replace(/^\?/,''));
if(q.get('error')||q.get('error_code'))lerr={code:q.get('error_code')||q.get('error')||'',desc:q.get('error_description')||''};
if(q.get('type'))ltype=q.get('type');if(lerr&&window.history&&history.replaceState)history.replaceState(null,'',location.pathname)}catch(e){}})();
function hasStored(){try{var v=JSON.parse(localStorage.getItem(skey())||'null');return!!(v&&(v.refresh_token||v.access_token))}catch(e){return false}}
function loadLib(){if(window.supabase&&window.supabase.createClient)return Promise.resolve();
return new Promise(function(ok,no){var s=document.createElement('script'),to=setTimeout(function(){try{s.remove()}catch(e){}no(new Error('lib-timeout'))},15000);s.src=SB.lib;s.async=true;s.onload=function(){clearTimeout(to);window.supabase&&window.supabase.createClient?ok():no(new Error('lib-missing'))};s.onerror=function(){clearTimeout(to);try{s.remove()}catch(e){}no(new Error('lib-load'))};document.head.appendChild(s)})}
function ready(){if(boot)return boot;boot=loadLib().then(function(){
if(!client){client=window.supabase.createClient(SB.url,SB.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storage:window.localStorage}});
client.auth.onAuthStateChange(function(ev,s){sess=s;if(ev=='PASSWORD_RECOVERY')rec=true;if(ev=='SIGNED_OUT')rec=false;setTimeout(function(){ls.slice().forEach(function(f){try{f(ev,s)}catch(e){}})},0)})}
return client.auth.getSession()}).then(function(r){if(r&&r.error)throw r.error;sess=r&&r.data&&r.data.session||null;return client});
boot.catch(function(){boot=null});return boot}
function name(u){if(!u)return'';var m=u.user_metadata||{};return m.display_name||m.full_name||m.name||(u.email||'').split('@')[0]}
function wrap(p){return p.then(function(r){if(r&&r.error)throw r.error;return r.data})}
function A(){return ready().then(function(c){return c.auth})}
function redirect(){return C.accountUrl||location.origin+'/account.html'}
function norm(m){return String(m||'').toLowerCase()}
/* human-readable (fa/en) message for a Supabase/Network error; t(fa,en) picks the language */
function msg(e,t){var c=norm(e&&(e.code||'')),m=norm(e&&e.message),st=e&&e.status;
if(e&&/^lib-/.test(e.message||''))return t('اتصال به سرویس حساب برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.','Could not reach the account service. Check your connection and try again.');
if(!st&&/failed to fetch|network|load failed|abort/.test(m))return t('ارتباط با سرویس حساب برقرار نشد؛ اتصال اینترنت را بررسی کنید.','Could not reach the account service; check your connection.');
if(c=='invalid_credentials'||/invalid login/.test(m))return t('ایمیل یا رمز عبور درست نیست.','Wrong email or password.');
if(c=='email_not_confirmed'||/not confirmed/.test(m))return t('ایمیل شما هنوز تأیید نشده است. پیوند تأیید را از ایمیل خود باز کنید یا آن را دوباره بفرستید.','Your email is not confirmed yet. Open the confirmation link in your email or send it again.');
if(c=='user_already_exists'||/already registered/.test(m))return t('این ایمیل قبلاً ثبت شده است. وارد شوید یا رمز را بازیابی کنید.','This email is already registered. Sign in or reset your password.');
if(c=='weak_password'||/password should|weak/.test(m))return t('رمز عبور به اندازه‌ی کافی قوی نیست؛ حداقل ۸ نویسه و ترکیبی از حرف و عدد انتخاب کنید.','The password is too weak; use 8+ characters mixing letters and numbers.');
if(c=='same_password'||/different from the old/.test(m))return t('رمز جدید باید با رمز فعلی فرق داشته باشد.','The new password must be different from the current one.');
if(c=='over_email_send_rate_limit'||c=='over_request_rate_limit'||st==429||/rate limit|too many/.test(m))return t('تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.','Too many requests; please try again shortly.');
if(c=='otp_expired'||c=='flow_state_expired'||/expired|invalid/.test(m)&&/link|token|otp/.test(m))return t('پیوند منقضی شده یا قبلاً استفاده شده است؛ دوباره درخواست دهید.','This link has expired or was already used; please request a new one.');
if(c=='session_not_found'||c=='refresh_token_not_found'||/jwt|session/.test(m)&&st==401)return t('نشست شما پایان یافته است؛ دوباره وارد شوید.','Your session has ended; please sign in again.');
if(c=='email_address_invalid'||/invalid email|email address.*invalid/.test(m))return t('ایمیل واردشده معتبر نیست.','The email address is not valid.');
if(c=='signup_disabled')return t('ثبت‌نام در حال حاضر در دسترس نیست.','Sign-up is currently unavailable.');
if(st>=500)return t('خطای سرویس؛ بعداً دوباره تلاش کنید.','Service error; please try again later.');
return t('انجام نشد؛ دوباره تلاش کنید.','That did not work; please try again.')}
var API={
 hasStoredSession:hasStored,storageKey:skey,ready:ready,client:function(){return client},
 user:function(){return sess&&sess.user||null},session:function(){return sess},displayName:name,msg:msg,
 linkError:function(){return lerr},linkType:function(){return ltype},recovering:function(){return rec},
 /* re-read the session from storage (another tab may have signed in, out or switched account); throws on network/refresh errors so callers do not mistake them for a sign-out */
 refresh:function(){return ready().then(function(c){return c.auth.getSession()}).then(function(r){if(r&&r.error)throw r.error;sess=r&&r.data&&r.data.session||null;return sess})},
 onChange:function(f){ls.push(f)},
 signUp:function(nm,email,pw){return A().then(function(a){return wrap(a.signUp({email:email,password:pw,options:{data:{display_name:nm},emailRedirectTo:redirect()}}))}).then(function(d){if(d&&d.session)sess=d.session;return d})},
 resend:function(email){return A().then(function(a){return wrap(a.resend({type:'signup',email:email,options:{emailRedirectTo:redirect()}}))})},
 signIn:function(email,pw){return A().then(function(a){return wrap(a.signInWithPassword({email:email,password:pw}))}).then(function(d){if(d&&d.session)sess=d.session;return d})},
 signOut:function(){return A().then(function(a){return a.signOut({scope:'local'})}).then(function(r){if(r&&r.error)throw r.error;sess=null;rec=false})},
 resetPassword:function(email){return A().then(function(a){return wrap(a.resetPasswordForEmail(email,{redirectTo:redirect()}))})},
 setPassword:function(pw){return A().then(function(a){return wrap(a.updateUser({password:pw}))})},
 changePassword:function(cur,next){var u=API.user();if(!u)return Promise.reject(new Error('no-user'));return API.signIn(u.email,cur).then(function(){return API.setPassword(next)})},
 setName:function(nm){return A().then(function(a){return wrap(a.updateUser({data:{display_name:nm}}))}).then(function(d){if(d&&d.user&&sess)sess=Object.assign({},sess,{user:d.user});return d})},
 /* Cloudflare Worker API (separate from Supabase). Supported: GET /health, GET /test-products, GET /auth/me (Bearer token). */
 worker:function(path,o){o=o||{};var base=(C.worker||{}).url;if(!base)return Promise.resolve({ok:false,status:0,j:{}});
  return ready().then(function(c){return c.auth.getSession()}).then(function(r){var tok=r&&r.data&&r.data.session&&r.data.session.access_token,ac=new AbortController(),tm=setTimeout(function(){ac.abort()},10000),h={};if(tok)h.Authorization='Bearer '+tok;
   return fetch(base+path,{method:o.method||'GET',headers:h,signal:ac.signal}).then(function(x){clearTimeout(tm);return x.json().catch(function(){return{}}).then(function(j){return{ok:x.ok,status:x.status,j:j}})}).catch(function(){clearTimeout(tm);return{ok:false,status:0,j:{}}})}).catch(function(){return{ok:false,status:0,j:{}}})}
};
window.CuderAuth=API})();
