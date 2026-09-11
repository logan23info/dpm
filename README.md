# RCM Studio — Privacy & Data Protection Control Library

A multi-framework Risk Control Matrix for privacy and data protection audits, with an
AI-assisted control drafting and gap-assessment layer.

**55 controls** across ISO 27701, GDPR, India's DPDP Act 2023, NIST Privacy Framework, and
SOC 2 privacy criteria — cross-mapped so overlapping requirements are tested once, not five
times.

Live: https://dpm-sand.vercel.app/

## Coverage

| Domain | Controls |
|---|---|
| Governance & Accountability | 9 |
| Consent & Lawful Basis | 8 |
| Data Minimization & Retention | 6 |
| Privacy by Design & Assessment | 6 |
| Notice & Transparency | 5 |
| Data Subject Rights | 5 |
| Third-Party & Processor Management | 4 |
| Security of Processing | 4 |
| Incident & Breach Management | 3 |
| Cross-Border Transfers | 3 |
| Training & Awareness | 2 |

Each control carries the fields an RCM actually needs: inherent and residual risk, key-control
flag, control type and nature, frequency, test of design, test of effectiveness, population
basis, sampling basis, evidence required, ITGC dependencies, cross-framework mapping, test
result, exceptions, conclusion, and preparer/reviewer sign-off.

Sampling guidance is driven by control frequency and key-control status rather than a flat
number, so the export holds up in review.

## Deployment

Single Vercel project. The React portal and the API functions are served from the same origin,
so there is no CORS configuration and no API secret in the browser bundle.

```
index.html, vite.config.js, package.json   Portal (Vite + React) — builds to dist/
src/                                       Portal source
api/                                       Vercel serverless functions
  _guard.js                                Same-origin check, rate limit, payload caps
  draft-control.js                         Clause in  -> draft RCM record out
  gap-check.js                             Policy in  -> ranked gap assessment out
data/
  control-schema.json                      Schema the library is validated against
  seed/*.seed.js                           Authored control content (edit these)
  frameworks/*.json                        Generated — git-ignored, built at deploy time
scripts/
  build-library.js                         Expands seeds, enforces referential integrity
  sync-data.js                             Copies library into public/ for the static build
  export_xlsx.py                           Generates the formatted Excel workpaper
```

`npm run build` runs `prebuild` first, which regenerates the library and syncs it into
`public/data`. Vercel needs no special configuration beyond the environment variable below.

### Environment variables

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | for AI features | Your API key |
| `ANTHROPIC_MODEL` | no | Override the default; verify the current model name before deploying |
| `RATE_LIMIT_PER_HOUR` | no | Per-IP cap, defaults to 60 |
| `ALLOWED_ORIGINS` | no | Extra origins, comma-separated |

Without `ANTHROPIC_API_KEY` the portal still works as a full control library — the AI drawer
reports that it is unconfigured rather than failing silently.

### Protecting the deployment

The API endpoints spend your API credits. The same-origin check and rate limiter stop browsers
and casual scraping, but **will not** stop a scripted client that forges an `Origin` header.

For a private audit tool, turn on **Project → Settings → Deployment Protection → Vercel
Authentication**. That puts the entire site behind a login and is the real control here. The
rate limiter caps the damage if anything gets through; note it is in-memory, so it resets when
a serverless instance recycles. Use Vercel KV or Upstash if you need a durable limit.

## Editing controls

Edit `data/seed/*.seed.js`, then:

```bash
npm run validate     # rebuilds and fails on broken cross-references
```

The build **fails** if any `cross_framework_refs` points at a control ID that doesn't exist, and
automatically makes one-way mappings symmetric. `data/frameworks/` is generated output and is
git-ignored — never edit it by hand.

Workpaper fields (test result, exceptions, conclusion, sign-off, period) are set empty at build
time and filled during fieldwork.

## Excel workpaper

```bash
node scripts/build-library.js
python3 scripts/export_xlsx.py [output.xlsx]     # requires openpyxl
```

Three sheets:

| Sheet | Contents |
|---|---|
| Legend | How to use it, which columns are editable, and an example row showing expected format |
| RCM | All 55 controls; frozen headers, autofilter, risk colour-coding, dropdowns on fieldwork columns |
| Summary | Live COUNTIFS rollups by framework, domain, risk and test result |

Only the pale-yellow Fieldwork columns are meant to be edited. Everything left of them is
generated from the control library — change it at source and re-export so the library stays the
single point of truth. The Summary sheet recalculates from what you enter; don't overwrite it.

## Local development

```bash
npm install
npm run dev
```

AI features need a local API runtime — use `vercel dev` instead of `npm run dev` if you want to
exercise the endpoints locally.

## Using it on an engagement

- **Scoping** — filter to a framework, tick *Key controls only*, filter to High inherent risk for
  a defensible key-control population.
- **Multi-framework engagements** — select several frameworks; the cross-framework mapping in the
  expanded row shows where one test covers several requirements.
- **Workpaper prep** — two options:
  - *In the portal*: Export CSV gives all 30 columns in RCM order with a UTF-8 BOM.
  - *Formatted workbook*: `python3 scripts/export_xlsx.py` produces `rcm-workpaper.xlsx` with
    frozen headers, filters, risk colour-coding, validated dropdowns on the fieldwork columns,
    and a Summary sheet that rolls up live as you complete testing.
- **New regulation** — paste a clause into *Draft control with AI* to get a starting record in the
  house schema, review it, then add it to the seed file.
- **Gap assessment** — paste an existing policy to get gaps ranked by severity with suggested
  tests, as a first pass before walkthroughs.

## Limitations

- Control content is a professional starting point, not legal advice. Tailor it to your entity,
  jurisdiction, and processing profile before using it on an engagement — particularly the DPDP
  Significant Data Fiduciary designation, which determines whether several controls apply at all.
- AI output is a draft. Review every generated control against the source clause.
- Status and results live in the JSON. There is no multi-user editing, no evidence storage, and no
  audit trail on edits beyond git history.
- The portal has no authentication of its own. Use Vercel Deployment Protection if your control
  library is sensitive.
