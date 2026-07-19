# Bidesiya · बिदेसिया

**अपने, कहीं भी · Apne, anywhere — Bihar wherever you are.**

A Bihar-first social + utility platform. Combines Instagram-style feed,
LinkedIn-style profiles, and X-style hashtags with government-utility
content (jobs, results, schemes, exam updates, land record guardian) and
Bihar-specific features (Sahyog crowdfunding, Bazaar marketplace, Rishta
dowry-free matrimony, Tourism for Bihar + Jharkhand).

This repository contains the **web front-end**. The Python FastAPI backend
lives in a separate repo; deploy it separately and point the frontend at it
via the `<meta name="bidesiya-api-base">` tag on each HTML page (or via
`localStorage.setItem('bidesiya.api_base', 'https://your-api.example.com')`
in the browser console).

## Stack

- Vanilla HTML, CSS, ES-module JavaScript — no framework, no build step
- One-file dev server (`devserver.py`) for local no-cache serving
- Fonts: Noto Sans Devanagari + Rozha One from Google Fonts

## Features

- **Feed** with stories, hashtags, reposts, quotes, poll posts, multi-image, 5-tier reactions
- **Communities** — 10 curated Bihar-first + auto-provisioned private village channels
- **DMs** with block + verification workflow
- **Events** — Chhath ghats, Sonepur mela, cultural events with RSVP
- **Jobs** — real jobs verified for Bihari migrants (Delhi, Mumbai, Chennai, Gulf)
- **Sahyog (सहयोग)** — dowry-free, transparent civic crowdfunding
- **Bazaar** — farm produce, handicrafts, second-hand — direct seller to buyer
- **Rishta** — matrimony without caste, dowry, or complexion fields
- **Tourism** — 30 curated destinations across Bihar + Jharkhand
- **Notable Voices** — follow-only Bihari cultural icons
- **Learn** — English, civic sense, digital literacy, women's safety lessons
- **Land Guardian** — Bhu-Abhilekh alerts
- **Panchang** widget, Madhubani avatar rings, 5 regional themes, Bihari default avatars

## Running locally

Prerequisites: Python 3.11+ (for the dev server), a modern browser.

```
python devserver.py 5173
```

Open http://127.0.0.1:5173/auth.html. Sign in with phone `9999900001` — in
dev mode, the OTP auto-fills from the backend response.

## Deploying to GitHub Pages

1. Fork or push this repo to GitHub.
2. In repo Settings → Pages, set source to `Deploy from a branch`, branch `main`, folder `/ (root)`.
3. Wait ~1 minute for the first build.
4. Set the backend URL. Either:
   - Edit every `.html` to add `<meta name="bidesiya-api-base" content="https://your-backend-url">` in the `<head>`, OR
   - Ask users to set `localStorage.bidesiya.api_base = 'https://your-backend-url'` once in DevTools.

The frontend has NO build step — just static files.

## Tooling

- `tools/audit.py` — comprehensive end-to-end audit (file refs, api methods, nav links, backend endpoints, button handlers). Run any time.
- `tools/fix_encoding.py` — repair UTF-8 mojibake if it creeps back in.

## License

MIT — see LICENSE file.
