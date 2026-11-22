# CUDER website

Static site for GitHub Pages (domain: `cuder.ir`, see `CNAME`). No build step: upload the folder as-is.

## Structure
- `index.html`, `products.html`, `compare.html`, `account.html`, `resources.html`, `roadmap.html`, `changelog.html`, `about.html`, `contact.html`, `support.html`, `faq.html`, `legal.html`, `reviews.html`, `search.html`, `404.html`: thin HTML shells (per-page title, description, canonical, Open Graph and a readable fallback `<h1>` + links). The real UI is rendered by JS.
- `bizflow/`, `downflow/`: each product has overview, features, pricing, download pages and its own installable web app in `app/` (independent data, logic and service worker).
- `js/config.js`: **site settings.** `supabase` (account + BizFlow storage; publishable key only) and `worker` (Cloudflare Worker API) are configured separately. See `docs/API.md`. The contact form opens the visitor's email app; there is no contact endpoint.
- `assets/cuder-auth.js`: shared account module (official Supabase JS v2 client). `bizflow/app/cloud.js`: BizFlow cloud sync (guest mode untouched).
- `js/data.js`: **all content** (projects, articles, guides, roadmap, changelog, legal text) and the global search function. Add a project/article here and it appears in lists, search and the Ctrl/⌘+K palette.
- `js/pages-extra.js`: UI for the new pages. `js/site-*.js`: page content for each site. `js/core.js`: shared engine (header, footer, language, theme, effects, palette).
- `css/base.css`: design system (tokens `--c1…--c6`, glass cards, aurora, motion). `prefers-reduced-motion` is respected.
- `sitemap.xml`, `robots.txt`: update `lastmod` when pages change.

## Product apps (real, client-side features)
- **BizFlow** `bizflow/app` (fully re-laid out: fixed top bar on mobile, grouped sidebar, SVG icons, full appearance customization): contracts, warranty & serials, appointments, discount codes, plus the "تحلیل" tab: "تحلیل" tab: profitability (product/customer), reorder suggestions, 8-week cash-flow forecast, customer segments, monthly budgets, audit trail (stored on the device).
- **DownFlow** `downflow/app` (new layout, `ui.js`; save-to-folder organizer, notifications, drag/drop and paste adding, full appearance customization): new "ابزارها" menu (`extras.js`): usage stats, live speed chart, link inspector & diagnostics, mirror speed test with automatic failover, network profiles / metered hint, filename templates, smart folders, content-hash duplicate detection. Engine changes are in `webshim.js`.
- Each product also has Docs, Changelog and FAQ pages (`js/product-extra.js`, content in `js/data.js`).

## Security
Every page has a Content-Security-Policy meta tag (scripts only from this site, cdnjs and jsDelivr for the Supabase client and optional Lottie/Rive; connections to https hosts for Supabase and the Worker). Add real HTTP headers (e.g. via Cloudflare) if you move off GitHub Pages.

## Publishing
Upload everything to the GitHub Pages repo root. `404.html` is used automatically.

## Accounts and sync
Real accounts use Supabase (email + password, email confirmation, reset, display name). BizFlow can sync its data to the signed-in user's own row in `public.bizflow_user_data`; guest mode stays local and DownFlow never uploads anything. Setup and deployment steps are in `docs/API.md`.

## Pricing
All Pro features are free for everyone during launch; no prices are shown (`pricing.show` in `js/config.js`).

## Not possible without a desktop app or more infrastructure
Multi-branch, approval workflows, customer portal, multi-currency sync, cloud storage targets, LAN transfer, archive extraction and background downloads. They are listed as Planned on the Roadmap.

## To confirm before launch
Email `info@cuder.ir` and the social handles in `js/config.js`; `assets/og.png` is a generated share image (replace it with your own if you prefer); legal texts need legal review.

## Notes
- **No mouse effects**: backgrounds move with time and scroll only (and stop with `prefers-reduced-motion`).
- **Apps are bilingual** (FA/EN, RTL/LTR): `assets/app-i18n.js` holds the whole dictionary; invoices keep their own language setting. Strings added by `bizflow/app/cloud.js` carry both languages themselves.
- **Security**: passwords are never stored in LocalStorage by the apps, clipboard reading is opt-in, per-product service-worker caches, storage-failure banner, bounded speed test, Range/ETag/size validation. No Supabase secret key is used in the frontend.
- **Known limits**: downloads do not survive closing/reloading the tab (parts are in memory); files over 1.5 GB are refused; DownFlow's CSP allows any http(s) host because users download from arbitrary servers; Firefox/Safari untested.
