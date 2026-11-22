/* CUDER site configuration.
   supabase = account sign-in + BizFlow cloud storage (official Supabase JS v2 client). Only the PUBLISHABLE key belongs here; never put a secret/service-role key in frontend files.
   worker   = Cloudflare Worker API (separate from Supabase). Deployed endpoints: GET /health, GET /test-products, GET /auth/me (Bearer token). See docs/API.md. */
window.CUDER_CFG={site:'https://cuder.ir',accountUrl:'https://cuder.ir/account.html',
supabase:{url:'https://awtebhdzbtoawdusmtlp.supabase.co',key:'sb_publishable_uaHo_311fcPSsPSIpCd3bg_eda-Pv67',lib:'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.js'},
worker:{url:'https://cuder-api.kljdg95.workers.dev'},
contact:{channel:{name:'Telegram Channel',url:'https://t.me/cuderofficial'},support:{name:'Telegram Support',handle:'@cudersupport',url:'https://t.me/cudersupport'}},
pricing:{show:false,bizflow:{plans:[{fa:'۱ ماهه',en:'1 month',pf:'۱۹۹ هزار تومان',pe:'199,000 Toman'},{fa:'۳ ماهه',en:'3 months',pf:'۴۹۹ هزار تومان',pe:'499,000 Toman'},{fa:'۶ ماهه',en:'6 months',pf:'۸۹۹ هزار تومان',pe:'899,000 Toman'}]},downflow:null}};
