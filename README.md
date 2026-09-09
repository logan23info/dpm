# RCM Studio — Privacy & Data Protection Control Library

A multi-framework Risk Control Matrix for privacy and data protection audits, with an
AI-assisted control drafting and gap-assessment layer.

**55 controls** across ISO 27701, GDPR, India's DPDP Act 2023, NIST Privacy Framework, and
SOC 2 privacy criteria — cross-mapped so overlapping requirements are tested once, not five times.

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

Sampling guidance is driven by control frequency and key-control status rather than stated as a
flat number, so the export is defensible in review.

## Architecture

```
data/
  control-schema.json     JSON Schema the library is validated against
  seed/*.seed.js          Authored control content (edit these)
  frameworks/*.json       Generated output — do not edit by hand
web/                      React (Vite) portal, deployed to GitHub Pages
api/                      Vercel serverless functions (the AI layer)
  _guard.js               Origin allowlist, shared-secret auth, payload limits
  draft-control.js        Clause in -> draft RCM record out
  gap-check.js            Policy text in -> ranked gap assessment out
scripts/
  build-library.js        Expands seeds, enforces referential integrity
  sync-data.js            Copies library into web/public for the static build
```

**Why two hosts.** GitHub Pages serves static files only, so the portal lives there. The AI calls
need somewhere to hold the Anthropic API key that isn't the browser, so those run as Vercel
functions and are called cross-origin.

### Editing controls

Edit `data/seed/*.seed.js`, then:

```bash
node scripts/build-library.js
```

The build **fails** if any `cross_framework_refs` points at a control ID that doesn't exist, and
automatically makes one-way mappings symmetric. Workpaper fields (test result, sign-off, period)
are set empty at build time and filled during fieldwork.

## Setup

### API (Vercel)

```bash
vercel deploy
```

Set these environment variables in the Vercel project:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Your API key |
| `ALLOWED_ORIGINS` | Comma-separated, e.g. `https://youruser.github.io` |
| `API_SHARED_SECRET` | Any long random string |
| `ANTHROPIC_MODEL` | Optional; verify the current model name before deploying |

The endpoints **fail closed**: no allowlist means no cross-origin access, and requests without a
matching `x-api-secret` header are rejected.

> A shared secret embedded in a static frontend is obfuscation, not authentication. It stops
> casual scraping of an endpoint that spends your API credits; it does not stop someone who reads
> your JS bundle. For anything beyond personal use, put the API behind real user authentication.

### Portal (GitHub Pages)

1. Set `base` in `web/vite.config.js` to your repository name.
2. Repo Settings → Secrets and variables → Actions:
   - Variable `VITE_API_BASE` = your Vercel URL
   - Secret `API_SHARED_SECRET` = the same secret as above
3. Settings → Pages → Source: **GitHub Actions**
4. Push to `main`.

If `VITE_API_BASE` is unset the portal still works as a control library; the AI drawer reports
that it is unconfigured rather than silently failing.

### Local

```bash
cd web && npm install && npm run dev
```

`npm run dev` rebuilds the library and syncs data automatically.

## Using it on an engagement

- **Scoping** — filter to a framework, tick *Key controls only*, and filter to High inherent risk
  to get a defensible key-control population.
- **Multi-framework engagements** — select several frameworks; the cross-framework mapping in the
  expanded row shows where one test covers several requirements.
- **Workpaper prep** — Export CSV produces all 30 columns in RCM order with a UTF-8 BOM so Excel
  opens it cleanly. Complete the result, exception, and sign-off columns during fieldwork.
- **New regulation** — paste a clause into *Draft control with AI* to get a starting record in the
  house schema, then review it and add it to the seed file.
- **Gap assessment** — paste an existing policy to get gaps ranked by severity with suggested
  tests, as a first pass before walkthroughs.

## Limitations

- Control content is a professional starting point, not legal advice, and needs tailoring to your
  entity, jurisdiction, and processing profile before use on an engagement.
- AI output is a draft. Review every generated control against the source clause.
- No authentication on the portal itself — the library is public if the Pages site is public. Use
  a private repo with Pages restricted, or self-host, if your control library is sensitive.
- Status and results are static in the JSON; there is no multi-user editing or evidence storage.
