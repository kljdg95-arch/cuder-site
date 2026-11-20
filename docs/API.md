# CUDER backend API contract (v1)

The site and both apps talk to a backend **only** when `window.CUDER_CFG.api` (js/config.js) is set, e.g. `https://api.cuder.ir`. With `api` empty nothing is sent anywhere and the UI says so honestly.

## Transport & security requirements (server side)
- HTTPS only. Session = **HttpOnly, Secure, SameSite=Lax/Strict cookie** (the client uses `credentials:"include"`; it never stores tokens or passwords).
- CORS: allow the site origin with credentials. CSRF: require a custom header or SameSite=Strict.
- Hash passwords with Argon2id/bcrypt. Rate-limit every endpoint (login, register, forgot, contact, reviews). Validate and escape all input on the server. Return generic messages for password-reset requests.
- All bodies/responses are JSON. Errors: `{ "message": "human readable (optional)" }` with 400/401/409/422/429/5xx.

## Auth
| Method & path | Body | Success |
|---|---|---|
| POST `/auth/register` | `{name,email,password}` | 201 `{user}` or `{message}` (e-mail verification flow) |
| POST `/auth/login` | `{email,password}` | 200 `{user}` + cookie |
| GET `/auth/me` | – | 200 `{user:{id,name,email}}` / 401 |
| POST `/auth/logout` | – | 204 |
| POST `/auth/password/forgot` | `{email}` | 202 (always) |
| POST `/auth/password/reset` | `{token,password}` | 200 |
| POST `/auth/password/change` | `{current,next}` | 200 |
| GET `/auth/sessions` | – | `{sessions:[{id,device,last,current}]}` |
| DELETE `/auth/sessions/:id` | – | 204 |

## Sync (guest data → account)
POST `/sync/import` `{data:{<localStorage key>:<string>}}` (max 2 MB). Keys sent: `bizflow*`, `df_*`, `lf_*` (DownFlow never contains passwords).

## Reviews
- GET `/reviews?sort=new|helpful&page=n` → `{items:[{id,name,product,rating,text,date}],pages}` (approved only).
- POST `/reviews` `{product,rating,name,text}` → 201 (status *pending*; requires login). 
- POST `/reviews/:id/report` → 204.

## Contact
POST `/contact` `{name,email,subject,message}` → 200/202. Anti-spam and e-mail delivery are server responsibilities.

## Pricing
`CUDER_CFG.pricing.show=true` shows plan prices (values live in js/config.js). Keep `false` while no real prices are confirmed.
