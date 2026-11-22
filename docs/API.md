# CUDER connections: Supabase and the Worker API

The site is fully static (GitHub Pages, `cuder.ir`). It talks to two **separate** services. Both are configured in `js/config.js`.

| Service | Config key | Used for |
|---|---|---|
| Supabase (official JS v2 client) | `CUDER_CFG.supabase` | account sign-in/sign-up and BizFlow cloud storage |
| Cloudflare Worker API | `CUDER_CFG.worker` | independent API (health and test endpoints, token check) |

## 1. Supabase (accounts and BizFlow sync)

- URL: `https://awtebhdzbtoawdusmtlp.supabase.co`
- Key: the **publishable** key (`sb_publishable_…`) only. It is meant to be public. **Never put a secret / service-role key in any frontend file.**
- Client: `@supabase/supabase-js` v2, loaded from jsDelivr at a pinned version (`CUDER_CFG.supabase.lib`) by `assets/cuder-auth.js`. To avoid the CDN, download that file into `assets/vendor/` and point `lib` at it.
- Sessions: stored by the client in Local Storage (`sb-awtebhdzbtoawdusmtlp-auth-token`), with automatic token refresh. The site and the BizFlow app share the session because they share the origin.
- Flow: implicit flow, so confirmation and recovery links work even if opened on another device.

### Auth operations (all through `assets/cuder-auth.js`)
`signUp` (with `display_name` metadata) · `resend` confirmation · `signInWithPassword` · `signOut({scope:'local'})` · `resetPasswordForEmail` · `updateUser({password})` · `updateUser({data:{display_name}})`.
Emails use Supabase's default email service. Redirect target for confirmation and recovery: `https://cuder.ir/account.html`.

### Storage: `public.bizflow_user_data`
Columns used: `user_id`, `data` (the BizFlow state object), `updated_at`. The app never reads or writes any other table.
- Row Level Security must stay **enabled**; policies must restrict `select`, `insert` and `update` to `auth.uid() = user_id`. The client always filters by its own `user_id`, but RLS is what enforces it.
- Updates are conditional on the last known `updated_at` (compare-and-swap), so a change from another device is detected instead of overwritten.
- Only BizFlow data is stored. **DownFlow never uploads anything** (download list, credentials, authorization headers and file permissions stay local).

## 2. Cloudflare Worker API

Base URL: `https://cuder-api.kljdg95.workers.dev`

Deployed endpoints (these are the only ones that exist):

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | health check |
| GET | `/test-products` | test data |
| GET | `/auth/me` | requires `Authorization: Bearer <Supabase access token>` |

`CuderAuth.worker(path)` in `assets/cuder-auth.js` calls the Worker and attaches the Bearer token when a session exists. The Worker must allow the `https://cuder.ir` origin in its CORS headers (and `Authorization` in `Access-Control-Allow-Headers`) if it is called from the site.

**Not implemented in the Worker** (do not call them): `/auth/register`, `/auth/login`, `/sync/import`, `/contact`, `/reviews`. Authentication and BizFlow storage use Supabase directly.

## 3. Contact and reviews (no server involved)
- Contact and support forms open the visitor's email app (`mailto:`); the page says the message is only received once the visitor sends it.
- Reviews are saved privately in the visitor's browser and are not sent anywhere; the page says so.

## Deployment checklist
1. Supabase → Authentication → URL configuration: Site URL `https://cuder.ir`; add `https://cuder.ir/account.html` to the redirect allow-list.
2. Authentication → Providers → Email: confirm email enabled (already on).
3. Confirm RLS is on for `public.bizflow_user_data` with owner-only policies, and that `user_id` is unique (primary key or unique constraint).
4. Confirm the Worker's CORS allows `https://cuder.ir` before using it from the browser.

## Verifying RLS (do this in the Supabase SQL editor; nothing here changes the database)
```sql
-- RLS must be on:
select relname, relrowsecurity from pg_class where relname = 'bizflow_user_data';
-- Policies must be owner-only (expect auth.uid() = user_id for select / insert / update[/ delete]):
select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'bizflow_user_data';
-- user_id must be unique (primary key or unique constraint); the app relies on it:
select conname, contype from pg_constraint where conrelid = 'public.bizflow_user_data'::regclass;
```
If an `update` policy is missing, the app shows a sync error instead of looping; if `select` is blocked, it stops after a few attempts and shows an error. Neither case overwrites data.

## Client-side safeguards (BizFlow sync)
- Cloud data is validated before it is applied (object shape, collections must be arrays) and `__proto__`/`constructor` keys are removed; invalid data is never applied.
- Results of requests started for a previous user or session are discarded (account switch, sign-out, session expiry, sign-in or sign-out in another tab).
- Local backups (`bizflow_bk_*`, newest 5) are made before any copy is replaced; the settings panel can download the latest one.
- The audit trail (`S.audit`) is not uploaded.
