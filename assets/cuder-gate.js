/* CUDER app gate: BizFlow and DownFlow require a signed-in CUDER account.
   The page stays hidden until a Supabase session exists and the server has confirmed it (auth.getUser).
   Honest scope: this is a client-side gate on static files. The server-side enforcement is Supabase itself
   (BizFlow cloud data is protected by row-level security); DownFlow data never leaves the device.
   Offline: if the server cannot be reached, a previously stored session is accepted so installed apps keep working. */
(function(){
var C=window.CUDER_CFG||{},sb=C.supabase||{},de=document.documentElement,KEY='';
try{KEY='sb-'+new URL(sb.url).hostname.split('.')[0]+'-auth-token'}catch(e){}
var app=location.pathname.indexOf('/downflow/')>-1?'downflow':'bizflow';
var loginUrl=new URL('../../login.html',location.href).href+'?next='+app;
var st=document.createElement('style');
st.textContent='html.cg body{visibility:hidden}html.cg{background:#060d10}html.cg::after{content:"";position:fixed;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border:3px solid rgba(255,255,255,.15);border-top-color:'+(app=='downflow'?'#14b8a6':'#8b5cf6')+';border-radius:50%;animation:cgs .8s linear infinite}@keyframes cgs{to{transform:rotate(360deg)}}';
document.head.appendChild(st);de.classList.add('cg');
var left=false;function go(){if(left)return;left=true;de.classList.add('cg');try{window.stop()}catch(e){}location.replace(loginUrl)}
function show(){de.classList.remove('cg')}
var has=false;try{var v=JSON.parse(localStorage.getItem(KEY)||'null');has=!!(v&&v.refresh_token)}catch(e){}
if(!has){go();return}
function invalid(e){var c=String(e&&e.code||''),s=e&&e.status;return s==401||s==403||/user_not_found|session_not_found|bad_jwt|invalid_jwt|refresh_token_not_found|refresh_token_already_used/.test(c)}
var A=window.CuderAuth;
if(!A){show();return}
A.ready().then(function(c){return c.auth.getUser()}).then(function(r){
 if(r&&r.data&&r.data.user){show();A.onChange(function(ev,s){if(ev=='SIGNED_OUT'||(!s&&ev!='INITIAL_SESSION'))go()});return}
 if(r&&r.error&&invalid(r.error)){A.signOut().catch(function(){}).then(go);return}
 show()   /* server unreachable: keep a stored session usable offline */
}).catch(function(){show()});
window.CuderGate={signOut:function(){return A.signOut().then(go)}};
})();
