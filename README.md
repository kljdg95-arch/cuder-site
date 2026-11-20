# CUDER website (v4)

Static site for GitHub Pages (domain: `cuder.ir`, see `CNAME`). No build step: upload the folder as-is.

## Structure
- `index.html`, `projects.html`, `resources.html`, `roadmap.html`, `changelog.html`, `about.html`, `contact.html`, `support.html`, `faq.html`, `legal.html`, `reviews.html`, `search.html`, `404.html`: thin HTML shells (per-page title, description, canonical, Open Graph and a readable fallback `<h1>` + links). The real UI is rendered by JS.
- `bizflow/`, `downflow/`: each product has overview, features, pricing, download pages and its own installable web app in `app/` (independent data, logic and service worker).
- `js/config.js`: **site settings.** Set `api` to your backend URL to switch on real sign-up/sign-in and the contact form. While `api` is empty, the site says honestly that public accounts are not active and the contact form opens the visitor's email app.
- `js/data.js`: **all content** (projects, articles, guides, roadmap, changelog, legal text) and the global search function. Add a project/article here and it appears in lists, search and the Ctrl/⌘+K palette.
- `js/pages-extra.js`: UI for the new pages. `js/site-*.js`: page content for each site. `js/core.js`: shared engine (header, footer, language, theme, effects, palette).
- `css/base.css`: design system (tokens `--c1…--c6`, glass cards, aurora, motion). `prefers-reduced-motion` is respected.
- `sitemap.xml`, `robots.txt`: update `lastmod` when pages change.

## Product apps (real, client-side features)
- **BizFlow** `bizflow/app` (fully re-laid out: fixed top bar on mobile, grouped sidebar, SVG icons, full appearance customization): contracts, warranty & serials, appointments, discount codes, plus the "تحلیل" tab: "تحلیل" tab: profitability (product/customer), reorder suggestions, 8-week cash-flow forecast, customer segments, monthly budgets, audit trail (stored on the device).
- **DownFlow** `downflow/app` (new layout, `ui.js`; save-to-folder organizer, notifications, drag/drop and paste adding, full appearance customization): new "ابزارها" menu (`extras.js`): usage stats, live speed chart, link inspector & diagnostics, mirror speed test with automatic failover, network profiles / metered hint, filename templates, smart folders, content-hash duplicate detection. Engine changes are in `webshim.js`.
- Each product also has Docs, Changelog and FAQ pages (`js/product-extra.js`, content in `js/data.js`).

## Security
Every page has a Content-Security-Policy meta tag (scripts only from this site, cdnjs and jsDelivr for optional Lottie/Rive). Add real HTTP headers (e.g. via Cloudflare) if you move off GitHub Pages.

## Publishing
Upload everything to the GitHub Pages repo root. `404.html` is used automatically.

## Needs infrastructure (not faked)
Accounts/sync, real contact form delivery, shared public reviews, and all server-dependent roadmap items. They are listed as "Planned" on the Roadmap page.

## Pricing/accounts
There are no accounts or sign-ups. All Pro features are free for everyone during launch; no prices are shown. `js/config.js` `api` remains the single switch if you later add a backend.

## Not possible without infrastructure
Multi-branch, approval workflows, customer portal, appointments, multi-currency sync, cloud storage targets, LAN transfer, archive extraction and background downloads need a backend or a desktop app. They are listed as Planned on the Roadmap.

## To confirm before launch
Email `info@cuder.ir` and the social handles in `js/config.js`; `assets/og.png` is a generated share image (replace it with your own if you prefer); legal texts need legal review.

## V9 notes (this release)
- **No mouse effects**: the cursor follower, magnetic buttons and pointer-driven backgrounds are removed; backgrounds move with time and scroll only (and stop with `prefers-reduced-motion`).
- **Design system**: one calm palette (`css/base.css`, tokens `--c1…--c3`), per-product palettes (BizFlow blue/violet, DownFlow teal/indigo).
- **Apps are bilingual** (FA/EN, RTL/LTR): `assets/app-i18n.js` holds the whole dictionary; invoices keep their own language setting and are never auto-translated. To fix or add a translation edit only that dictionary.
- **Accounts & reviews**: `account.html`, `reviews.html` talk to the API in `docs/API.md` once `CUDER_CFG.api` is set; with no API they say so and nothing is faked.
- **Security**: passwords never stored in LocalStorage (kept for the tab session only), clipboard reading is opt-in, per-product service-worker caches, storage-failure banner, bounded speed test, Range/ETag/size validation.
- **Known limits**: downloads do not survive closing/reloading the tab (parts are in memory); files over 1.5 GB are refused; DownFlow's CSP allows any http(s) host because users download from arbitrary servers; Firefox/Safari untested.
