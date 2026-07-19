# Bidesiya · बिदेसिया

**अपने, कहीं भी · Apne, anywhere.**

*A white paper on a Bihar-first, dignity-first social + utility platform for
125 million Biharis at home and in the diaspora.*

---

## 1. Executive summary

Bidesiya is a full-stack social + utility platform, built from the ground up
for Bihari identity — its languages (Hindi, Bhojpuri, Magahi, Maithili,
Angika), its culture (Chhath, Madhubani, Bhikhari Thakur's nautanki,
Sonepur mela), its economy (migrant labour, small landholdings, exam
preparation), and its problems (land record fraud, dowry, caste sorting on
matrimony platforms, exploitative middlemen).

It is not a Bihari skin on a Silicon-Valley template. It is a purpose-built
public-good platform that combines the discovery power of Instagram, the
professional identity of LinkedIn, the civic reach of X, and the utility
depth of a government portal — reshaped for a state whose population is
larger than Vietnam and whose diaspora spans Delhi construction sites,
Gulf refineries, and Chennai metros.

The MVP is live end-to-end at:

- **Web app:** https://bidesiya-web.onrender.com
- **API:** https://bidesiya-api.onrender.com
- **Source (frontend):** https://github.com/Sudish007/bidesiya
- **Source (backend):** https://github.com/Sudish007/bidesiya-backend

The stack is deliberately boring, cheap to run, and easy to hand off to a
future team: FastAPI + PostgreSQL on the server; vanilla HTML/CSS/ES-module
JS on the client — no build step, no framework churn, one deploy blueprint
per repo, hosted on Render's free tier.

---

## 2. Vision

**Every Bihari, wherever they are, should have one warm, dignified digital
home that respects who they are, helps them help each other, and lets them
carry their village with them into any city they migrate to.**

Three convictions drive this vision:

1. **Identity should ride with you.** A Muzaffarpur litchi farmer, a
   Chennai metro welder, and an IAS aspirant in Kota are all still
   "apne" — one's own. Their platform should feel like the village
   chaupal, not like a stranger's living room.

2. **Utility earns trust; social keeps you.** Government portals give
   utility but no warmth. Instagram gives warmth but no utility. The
   Indian internet's next 400 million users need both, in one place,
   in a language and idiom they own.

3. **Dignity is a feature, not a policy.** No caste field on the matrimony
   product. No dowry field. No skin-tone filter. No middleman markup on
   the marketplace. Verified organiser + itemised budget + photo receipts
   on the crowdfunding product. The design choices are the ethics.

Bidesiya is what happens when you take those three convictions seriously
and rebuild every feature around them.

---

## 3. The problem

### 3.1 The migrant's information poverty

Roughly one in three working-age Bihari men lives outside Bihar for at
least part of the year. He typically:

- Learns about jobs through a distant cousin, a labour contractor, or a
  WhatsApp forward — often already stale, sometimes fraudulent.
- Sends money home through informal channels and never sees a receipt.
- Loses touch with his village because the only "social" apps available
  in his phone show him Bollywood and geopolitics, not his own baghwan's
  fields.
- Has no formal proof of the plot of land his father registered.
  Encroachment or a corrupt tehsildar can wipe out his family's
  inheritance while he's welding a girder in Chennai.

### 3.2 The exam aspirant's isolation

A BPSC / SSC / Railway aspirant in Rajgir or Jehanabad is competing with
five lakh peers she cannot see or coordinate with. Coaching institutes
cost more than her family earns in a year. Official updates from BPSC,
SSC, BSSC come as PDFs on obscure government portals with names like
"parimarjan.bihar.gov.in".

### 3.3 The cultural amnesia problem

Bhikhari Thakur is the "Shakespeare of Bhojpuri". Most Biharis under 30
cannot name three of his plays. The Madhubani painting tradition survives
in a handful of villages. Sonepur mela shrinks every year. There is no
central place to celebrate, discover, and support the state's own icons.

### 3.4 The dignity vacuum on existing platforms

- Matrimony sites in India are still architected around **caste as a
  first-class filter**.
- Crowdfunding sites route trust through corporate KYC that most
  village-level fundraisers cannot pass.
- Local marketplaces skim 15-30% off farmers for logistics that never
  materialise.
- Every social platform in the world is optimised for the median user
  of a global product; none of them prioritise 125 million people from
  one state.

Bidesiya's product surface is one systematic answer to those four
problems.

---

## 4. Product surface — features shipped

The MVP shipped across 13 named "rounds" of build. Each round layers on
top of the previous, all interoperable, all in a single codebase.

### 4.1 Round 1 — Core social

- Phone-OTP login (dev-mode auto-fills, MSG91 in production)
- Instagram-style **feed** with image posts, districts, block tagging
- LinkedIn-style **profiles** with experience + education timelines,
  open-to-work signal, skills chips, region auto-detection from home
  district (Mithila / Bhojpur / Magadh / Anga / Champaran / Seemanchal)
- **Land Guardian** — link your plot to Bihar's parimarjan / bhulekh /
  lrc portals, get periodic mutation alerts (mock scraper stub for now)
- **Learn** — 25 seeded lessons across English / civic sense / digital
  literacy / women's safety
- **35 real Sarkari-Help notifications** covering BPSC results, exam
  dates, RRB, SSC, BSSC, Bihar Board updates
- **15 real private-sector jobs** for Bihari migrants in Delhi / Mumbai
  / Chennai / Surat / Gulf

### 4.2 Round 2 — Hashtags + reposts

- X-style **hashtag** parsing, trending sidebar over any time window
- **Reposts** (RT-style with attribution)
- **Quote-posts** (add your take)
- @mentions with inbox notifications

### 4.3 Round 3 — Communities + DMs

- **10 curated Bihar-first communities** — Muzaffarpur Litchi Growers,
  Chennai Bihari Welders, BPSC 71 Prep, Chhath Devotees, etc.
- **Village channels ("Ghar wali baat")** — auto-provisioned private
  community per user's `home_village`, invisible from browse, so
  everyone from Baikunthpur, Siwan can talk without joining a public
  group
- **Direct messages** with unread counts, message threads
- Community post feeds

### 4.4 Round 4 — Discovery layer

- **Global search** across users, posts, communities, hashtags
- **Inbox** with like / mention / follow / community-invite notifications
- **@mentions** in comments trigger inbox entries
- **Admin panel** for post moderation, user bans, verification

### 4.5 Round 5 — Engagement + trust

- **5-tier reactions** (like / celebrate / insightful / support /
  helpful) with a hover picker
- **X-style polls** with live percents
- **One-level threaded replies** on comments
- **Multi-image carousels** on posts
- **24-hour stories** with Bihari-flavoured backgrounds (sunrise, river,
  bamboo, plum)
- **Events** with RSVP — 10 real seeded: Chhath arghyas, BPSC 71 prelims,
  Sonepur mela, Bhikhari Thakur nautanki screenings
- **Block user** + **verification request workflow** with admin queue

### 4.6 Round 6 — Social OAuth + Bihar cultural touches

- Google / Facebook / LinkedIn OIDC sign-in (credential-gated — the
  buttons hide themselves if the server isn't configured)
- **Panchang widget** — approximate VS year, tithi, nakshatra, days to
  next Chhath Sandhya Arghya
- **Madhubani avatar rings** — peacock (community verified), fish
  (institution verified), lotus (Bidesiya team), gold laurel wreath
  (Notable Voice)
- **Madhubani section divider** — peacock-eye motif SVG
- **5 regional themes** — Chhath Sunrise / Mithila Alta / Bhojpur
  Indigo / Magadh Sandstone / Anga Manjusha, driven by CSS custom
  properties so every screen retints when the user picks a palette
- **Cultural empty states + peacock spinner** — Chhath ghat, peepal
  tree, pigeon-with-letter, Madhubani-fish-in-magnifier SVGs

### 4.7 Round 7 — Brand identity

- **Bidesiya logo** — Devanagari "बि" letterform inside a rounded
  sunrise-gradient square, with a small rising sun above the matra
- **Tagline: "अपने, कहीं भी · Apne, anywhere"** — an untranslatable
  Hindi word ("apne" = one's own people) plus its English gloss

### 4.8 Round 8 — Trust bug-fixes + profile photos

- Reactions fixed (click always toggles like; long-press opens picker)
- Every hardcoded hex colour across the CSS converted to theme
  variables — five palettes now really do retint the whole app
- **Profile photo upload** — camera icon on the avatar ring, drag-drop
  or file-picker, avatar propagates across DMs, comments, community
  member lists, inbox, stories, search results

### 4.9 Round 9 — Notable Voices

- Follow-only accounts for public figures — no DMs, no message clutter
- **10 real Bihari cultural icons seeded**: Bhikhari Thakur (folk theatre,
  Saran), Vidyapati (Maithili poetry, Madhubani), Ramdhari Singh Dinkar
  (writing, Begusarai), Phanishwar Nath Renu (writing, Purnia), Sharda
  Sinha (Chhath music, Supaul), Manoj Bajpayee (cinema, West Champaran),
  Pankaj Tripathi (cinema, Gopalganj), Prakash Jha (cinema, West
  Champaran), Ishan Kishan (cricket, Patna), Sr. Sudha Varghese
  (Musahar activism, Patna)
- Gold laurel-wreath avatar ring + 🏆 badge

### 4.10 Round 10 — Rishta + Tourism

- **Rishta** — a caste-free, dowry-free, complexion-free, kundli-free
  matrimony product. Filters are: age, gender, religion (with
  interfaith-ok toggle), diet, education, profession, languages,
  lifestyle, region preferences. 18+ hard gate. Express-interest →
  mutual-accept unlocks DM.
- **Tourism** — 30 curated destinations across Bihar (15) + Jharkhand
  (15), each with a real photo pulled from Wikimedia Commons under CC
  licence, real district, hand-written description in Bidesiya's voice,
  best-time-to-visit, how-to-reach, entry fee, insider tips, and a
  Google Maps deep-link

### 4.11 Round 11 — Bazaar

- Farmer-to-buyer marketplace — 12 seeded listings covering Shahi
  litchi (Muzaffarpur), Grade-A makhana (Darbhanga), Bhagalpur tussar
  silk, Madhubani painting, sattu (Gaya), Kachi Ghani mustard oil
  (Munger), sikki basket set, JEE-Physics home tuition, chura
  (Vaishali), fresh cow milk (Nalanda), Royal Enfield Classic 350
- **12 categories** with emoji chips (farm produce, handicraft, home
  food, livestock, vehicles, electronics, furniture, books, clothes,
  services, property, other)
- **9 price units** (per-kg, per-piece, per-dozen, per-litre,
  per-quintal, per-month, per-hour, per-day, fixed)
- Contact channels: platform DM (default, keeps phone private), phone
  only, or both — seller's choice
- Delivery-available toggle with area free-text
- View counter, negotiable flag, quality grade
- Bidirectional block filter (blocked users' listings are invisible to
  each other)

### 4.12 Round 12 — Sahyog (सहयोग)

- **Pledge-mode crowdfunding** that never touches money. The platform
  is a rally board + trust ledger; supporters pay the organiser directly
  via UPI.
  1. Organiser creates a campaign with their UPI ID
  2. Supporter pledges an amount + message + optional anonymity
  3. Platform shows the organiser's UPI ID + generates a
     `upi://pay?pa=...&am=...&tn=...` deep-link
  4. Supporter pays through their PhonePe / GPay / Paytm
  5. Supporter taps **"I've paid ₹X"** → pledge moves to `paid`
  6. Organiser confirms receipt → raised total bumps + pledge moves to
     `confirmed`
  7. **Milestone updates** with photo receipts keep everyone honest
- **10 categories** (village-infra, education, medical, cultural,
  disaster, livelihood, sports, environment, community, other)
- **Safety guardrails:** 7-day account age minimum, one active campaign
  per user, ₹5-lakh cap, admin approval queue, beneficiary consent
  checkbox, anonymous-pledge option
- **10 real-flavour Bihar campaigns seeded**: broken hand-pump in
  Kishanganj, winter uniforms in Muzaffarpur, cataract surgery in
  Nalanda, Madhubani mural restoration in Simaria (Begusarai), Kosi
  flood relief 2026 (Supaul), sattu machine for a women's SHG (Bhojpur),
  books+cricket kit in West Champaran, school wall in Bodhgaya,
  dowry-free wedding in Saran, peepal plantation on the Falgu river bank

### 4.13 Round 13 — Visual polish

- **Bihari cartoon default avatars** — uncle in red-checked gamchha +
  moustache + tilak, aunty in saree pallu + bindi + sindoor + maang
  tikka. Auto-selected per user based on gender if uploaded photo
  isn't set.
- **Hand-drawn section banners** for each landing page — Sahyog (joined
  hands with heart-diya), Bazaar (haat with litchi basket + silk bolt +
  sattu tin), Jobs (welder + Delhi Metro pillar), Communities (peepal
  tree + village panchayat + huts), Events (Chhath ghat with arghya
  offerer), Rishta (mehndi hand + kalash + mandala), Tourism (Mahabodhi
  temple + Bodhi tree + monk), Notable Voices (Bhikhari Thakur
  silhouette + tabla + books)
- **Real photos on 29 of 30 tourism destinations** pulled from Wikimedia
  Commons with attribution
- **Noto Sans Devanagari** loaded via Google Fonts for consistent
  Hindi rendering across every OS

### 4.14 Cross-cutting infrastructure

- **`tools/audit.py`** — end-to-end static audit: 173 file refs, 133
  api.js methods, 15 nav links, 40 backend GET routes, 16 button
  handlers — all verified in 5 seconds
- **`tools/fix_encoding.py`** — mojibake repair tool, idempotent, safe
  to run any time
- **`tools/fetch_tourism_images.py`** — Wikimedia Commons scraper with
  proper User-Agent and rate limits, CC attribution stored per image

---

## 5. Technical architecture

### 5.1 System diagram

```
+---------------------------+           +---------------------------+
|   Browser (any device)    |           |   Flutter shell (WIP)     |
|   HTML + ES-module JS     |           |   Dart · Material Design  |
+-------------+-------------+           +-------------+-------------+
              |                                       |
              |  HTTPS · JSON · Bearer JWT            |
              v                                       v
   +----------+---------------------------------------+----------+
   |           Render.com static site (bidesiya-web)             |
   |                                                             |
   |  /*.html   /assets/js/*  /assets/css/*  /assets/img/*       |
   |  No build step — every page is served from git head.        |
   +--------+----------------------------------------------------+
            |
            |  (via fetch — same-origin no, CORS *)
            v
   +--------+-----------------------------------------------------+
   |    Render.com web service (bidesiya-api) · FastAPI · Python  |
   |                                                              |
   |  100+ REST endpoints across 30+ routers                      |
   |  APScheduler jobs: story cleanup (30 min), Bhu poller (60 min)|
   |  Static uploads served from container filesystem             |
   +--------+-----------------------------------------------------+
            |
            |  SQLAlchemy async · asyncpg
            v
   +--------+-----------------------------------------------------+
   |         Render.com managed PostgreSQL (bidesiya-db)          |
   |         17 Alembic migrations · 30+ tables                   |
   +--------------------------------------------------------------+
```

### 5.2 Data model highlights

30+ tables. Every model is a `sqlalchemy.orm.Mapped` declarative class
in `apna_bihar_backend/app/models/`:

| Domain | Tables |
|---|---|
| Identity | `users`, `otp_codes`, `social_accounts`, `work_experience`, `education`, `follows`, `blocks`, `verification_requests` |
| Social feed | `posts`, `post_likes`, `comments`, `polls`, `poll_options`, `poll_votes`, `bookmarks`, `reports` |
| Real-time | `stories`, `story_views`, `conversations`, `messages`, `user_notifications`, `device_tokens` |
| Utility | `notifications` (sarkari updates), `jobs`, `lessons`, `lesson_progress`, `land_parcels`, `land_alerts` |
| Community | `communities`, `community_members` |
| Vertical products | `matrimony_profiles`, `matrimony_interests`, `destinations`, `listings`, `campaigns`, `campaign_pledges`, `campaign_updates`, `events`, `event_rsvps` |

Foreign keys use `ON DELETE CASCADE` throughout for content owned by a
single user, so account deletion is a single-transaction affair.

### 5.3 Auth model

- **Phone OTP** (primary): 6-digit code, 5-minute TTL, single-use, dev
  mode returns the code in the API response for testing
- **Admin username + password**: bcrypt hashed, admins seeded on first
  run
- **Social OIDC**: Google (ID-token verify), Facebook (Graph API access
  token → user info), LinkedIn (authorisation-code flow via popup)
- **All flows** produce the same HS256 JWT with 7-day expiry, carrying
  `{user_id, role}` claims. Bearer token in the `Authorization` header
  gates every non-public endpoint.

### 5.4 Trust & moderation

- **Block system** is bidirectional: neither party sees the other's
  posts, listings, campaigns, DMs, or profile
- **Verification workflow** — user submits type (community / institution
  / team / notable) + evidence → admin queue → approve/reject → the
  appropriate Madhubani ring appears on their avatar
- **Report** button on every user-generated content type, flowing to
  the same admin queue
- **Rate limits & guardrails**: campaign target cap ₹5-lakh, 7-day
  account age before crowdfunding, one active Sahyog per user, admin
  approval before campaign goes live

### 5.5 Cultural design principles

- Every gradient uses `var(--brand-*)` CSS custom properties so all 5
  regional themes retint the entire app without changing any HTML
- Every emoji has a hand-drawn Madhubani-influenced fallback when
  possible (peacock spinner, fish-in-magnifier empty state, etc.)
- Devanagari-first strings, English gloss beside — never one hidden
  behind a toggle
- Warm colour palette across the board (rose / saffron / gold sunrise)
  even in "utility" screens like Jobs and Learn — comfort by default

---

## 6. Tech stack

### 6.1 Frontend

| Layer | Choice | Reason |
|---|---|---|
| Language | Vanilla ES-module JS (no framework, no build) | Zero framework tax; every file is inspectable, editable, and testable in a browser with no toolchain |
| Styling | Single `style.css` (~3800 lines) with CSS custom properties | Themes swap by rewriting variables on `<html>`; no build |
| Fonts | Noto Sans Devanagari + Rozha One (Google Fonts) | Consistent Hindi rendering across every OS |
| Icons | Inline SVGs authored by hand | On-brand, retintable, no vendor package |
| Charts / progress | Pure CSS + inline SVG | No JS chart library needed |
| Dev server | 30-line `devserver.py` with no-cache headers | Instant reload on every save |
| Hosting | Render.com static site (also mirrored on GitHub Pages) | Free tier, global CDN, HTTPS, auto-deploy on git push |

### 6.2 Backend

| Layer | Choice | Reason |
|---|---|---|
| Language | Python 3.12 | Fast enough, huge ecosystem, easy to hand off |
| Framework | FastAPI + Pydantic v2 | Strong typing, automatic OpenAPI docs, async native |
| ORM | SQLAlchemy 2 async + Alembic migrations | Industry-standard, works with SQLite locally and Postgres in prod |
| DB (prod) | PostgreSQL 16 via Render managed | ACID, JSON columns for photos arrays, indexed full-text |
| DB (dev) | SQLite via aiosqlite | Zero setup for contributors |
| Auth | JWT via `python-jose` + bcrypt via `passlib` | Standard, no external service dep |
| Scheduler | APScheduler | Story cleanup, land-record poller |
| Image processing | Pillow | Avatar resizing / EXIF stripping |
| SMS gateway | MSG91 (India-first) with auto-fallback to dev mode | Cheap (₹0.20/SMS), Indian, DLT-compliant |
| Push notifications | Firebase Admin SDK | For the Flutter app roadmap |
| HTTP client | httpx | For the Bhu poller and OAuth verifications |
| HTML parsing | BeautifulSoup + lxml | For the Bhu scraper |
| Hosting | Render.com web service | Auto-deploy from git, `render.yaml` blueprint drives everything |

### 6.3 Mobile (roadmap — Round 14+)

| Layer | Choice | Status |
|---|---|---|
| Framework | Flutter + Dart | Round 1 shell exists in `apna_bihar/`, most features unshipped |
| State | Riverpod | Planned |
| Networking | Dio | Planned |
| APK signing | Local keystore, published via Play Console | Planned |

### 6.4 Ops & tooling

- **Version control**: Git + GitHub (`Sudish007/bidesiya`,
  `Sudish007/bidesiya-backend`)
- **CI**: none yet — GitHub Actions planned for CR review + PR previews
  on Render
- **Deploy**: Render `render.yaml` blueprints in both repos; `git push`
  triggers a build and roll-out in ~90 seconds
- **Observability**: Render's built-in logs + APScheduler debug logs;
  Sentry planned
- **Testing**: `tools/audit.py` runs a comprehensive static + endpoint
  smoke test; unit tests planned

---

## 7. What's deliberately absent

Every design has an anti-charter as important as its charter. Bidesiya
deliberately **does not** have:

- **A caste field on any user-facing form.** Not on Rishta, not on
  Profile, not on Communities. Present or historical caste as a
  formal filter is a permanent no.
- **A dowry / gift / wedding-budget field on Rishta.** Also a permanent no.
- **A complexion / skin-tone filter on Rishta.** No.
- **Manglik / kundli-matching / gotra fields.** No.
- **Doomscroll ranking.** Feed is chronological + district-relevant.
  No engagement-maximising algorithm behind the scenes.
- **Ads.** Ever. Bidesiya's cost model is intended to be donation +
  premium tiers, not attention-brokerage.
- **Endless push notifications.** Only inbox events the user asked for
  (mentions, follows, DMs).
- **A middleman fee on Bazaar or Sahyog.** Zero platform take-rate on
  either. Bidesiya is not the payment path.
- **Political party affiliation as a discovery signal.** Elections are
  a real thing Biharis care about; they're welcome to talk about them
  in communities, but the platform doesn't feed the polarisation
  engines.

---

## 8. Roadmap

### 8.1 Near-term (weeks 1-4 post-launch)

- **Real SMS OTP** via MSG91 (₹5000 one-time DLT template registration,
  ₹0.20/SMS thereafter)
- **Object storage for uploads** — migrate from container filesystem to
  Cloudflare R2 or Cloudinary (avatars survive redeploys)
- **Custom domain** — `bidesiya.in` + `api.bidesiya.in`, DNS at
  Namecheap, TLS auto-issued by Render
- **PWA manifest + service worker** — the web app installs as an
  Android home-screen shortcut with offline shell caching
- **PostgreSQL migration off Render's free 90-day tier** — Neon.tech or
  Supabase for permanent free storage, or upgrade to Render Starter

### 8.2 Mid-term (months 2-6)

- **Flutter feature-parity** for Round 2-13 features — DMs, communities,
  stories, events, bazaar, sahyog, rishta, tourism
- **APK on the Play Store** — signed release, first version English-only,
  Hindi in-app strings via Flutter `intl`
- **Real Bhu-Abhilekh scraper** — coordinate with a legal review of the
  three Bihar land portals' terms of service
- **Payment integration on Sahyog** (V2) — real UPI collect via Razorpay
  or Cashfree, KYC of organiser, escrow, 80G paperwork for registered
  NGOs
- **Regional-language UI** — Bhojpuri, Maithili, Magahi, Angika strings
  contributed via community translation
- **iOS build** — same Flutter codebase, Apple Developer Program membership

### 8.3 Long-term (year 2+)

- **Section 8 non-profit incorporation** in India, board with regional
  cultural representation
- **Government partnerships** — official BPSC / BSSC / Bihar Board
  update feeds; official land record integration
- **Diaspora chapters** — physical meet-up coordination for Bihari
  associations in Delhi, Mumbai, Bengaluru, Dubai, Doha, London
- **Cultural preservation grant fund** — small, transparent, sponsored
  by Bidesiya premium subscribers, awards ₹10-25k microgrants to
  Bhojpuri folk artists, Madhubani painters, Sikki weavers via the
  Sahyog rails

---

## 9. Legal, safety, and ethics

- **License:** MIT — every line of source code is under the OSI-approved
  permissive licence. Fork it, run it in your own village, make it
  better.
- **Data:** No third-party analytics tracking. No pixel from Meta /
  Google on any page. Uploaded content stays on the platform's server.
- **Content moderation:** Report button on every post + campaign +
  listing; admin queue; block system; automated slur filters (planned).
- **Financial safety on Sahyog:** the platform explicitly never holds
  money. UPI transfers are peer-to-peer. Photo receipts + milestone
  updates + admin approval queue + campaign reporting create the trust
  layer.
- **PII discipline:** phone number is the only PII stored at
  registration; masked in DM contexts; never exposed to public.
- **Wikimedia attribution:** every fetched tourism image ships with its
  author + license visible on the destination page, per CC-BY-SA.

---

## 10. Team, credits, and how to help

This MVP was designed and built in a single-developer sprint by
**Sudish Kumar** (Amazon SDE, Chennai; family roots in Siwan district).
The seed data — jobs, sarkari updates, notable-voice biographies, tourism
descriptions, campaign stories — is hand-written in Bidesiya's voice
rather than scraped, so every string carries intent.

Ways to help:

1. **Test it and report bugs** on
   https://github.com/Sudish007/bidesiya/issues
2. **Translate strings** into Bhojpuri, Maithili, Magahi, or Angika —
   a `locale/` folder is coming
3. **Contribute Bihari cultural content** — folk songs, artist
   biographies, festival calendars via PR
4. **Sponsor a Sahyog campaign** with your own UPI donation
5. **Star the repos** — visibility matters
6. **Bring your village onboard** — the Ghar Wali Baat channel unlocks
   as soon as three villagers set the same `home_village`

---

## 11. Closing

Bihar is not a poor state. Bihar is a state that has been priced out of
its own digital experience for two decades. Every algorithm ranks it
last; every venture-backed product treats it as a rounding error; every
"India stack" demo forgets it exists.

Bidesiya is what happens when one Bihari builds the app he wishes his
uncle in Chennai, his cousin studying for BPSC in Rajgir, and his
grandmother in Baikunthpur could all open at the same time and find
themselves at the centre — not the periphery — of an internet product.

The code is on GitHub. The site is live. Whoever wants to help build
this thing bigger, please do. Whoever wants to fork it and build the
same thing for Odisha, for Jharkhand, for Uttarakhand, for the North-East
— please do. The Indian internet's most under-served users deserve a
hundred Bidesiyas.

*अपने, कहीं भी.*

---

*Last updated 2026-07-19. This document lives at
`bidesiya-web/WHITEPAPER.md` and is versioned with the rest of the
codebase.*
