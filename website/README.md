# MESkit Website

Marketing website implementation for `meskit.cloud`, built from:

- `/MESKIT_PRD.md`
- `/website/PRD.md`

## Stack

- Next.js App Router (static generation)
- React + TypeScript
- CSS token system matching MESkit brand requirements

## Run locally

```bash
cd website
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Implemented routes

- `/`
- `/product`
- `/agents`
- `/isa-95`
- `/architecture`
- `/roadmap`
- `/docs`
- `/blog`
- `/blog/[slug]`
- `/about`
- `/faq`

## SEO/GEO assets

- `app/sitemap.ts`
- `app/robots.ts`
- JSON-LD for organization, software app, breadcrumbs, FAQ, and articles
- per-page metadata + canonical URLs
