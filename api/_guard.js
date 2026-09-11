// Shared request guard for the AI endpoints.
//
// These functions spend your Anthropic API key, so they are not open to the world.
// Because the portal and the API are now served from the same Vercel deployment, we enforce
// same-origin rather than shipping a "secret" inside the browser bundle (which was never
// really secret).
//
// Required env var:
//   ANTHROPIC_API_KEY
// Optional:
//   ANTHROPIC_MODEL       defaults below; verify against current model docs
//   ALLOWED_ORIGINS       extra origins to permit, comma-separated (rarely needed now)
//   RATE_LIMIT_PER_HOUR   defaults to 60 requests per IP per hour
//
// IMPORTANT: same-origin checks stop browsers and casual scraping. They do not stop a
// scripted client that forges an Origin header. The real protection for a private audit tool
// is Vercel Deployment Protection (Project -> Settings -> Deployment Protection), which puts
// the whole site behind a login. The rate limiter below caps damage if something gets through.

const MAX_INPUT_CHARS = 20000
const ALLOWED_FRAMEWORKS = ['ISO27701', 'GDPR', 'DPDP', 'NISTPF', 'SOC2']

// In-memory limiter. Serverless instances are ephemeral and not shared, so this is a speed
// bump, not a guarantee. Use Vercel KV or Upstash for a durable limit.
const hits = new Map()

function rateLimited(req) {
  const limit = Number(process.env.RATE_LIMIT_PER_HOUR || 60)
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 60 * 1000

  const record = hits.get(ip)
  if (!record || now - record.start > windowMs) {
    hits.set(ip, { start: now, count: 1 })
    return false
  }
  record.count += 1

  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k)
  }
  return record.count > limit
}

function originAllowed(req) {
  const origin = req.headers.origin
  // Same-origin fetches from the portal often omit Origin entirely; that is expected.
  if (!origin) return true

  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (host && origin === `https://${host}`) return true

  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  return extra.includes(origin)
}

/** Returns { framework, text }, or null if a response has already been sent. */
export function guard(req, res) {
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') { res.status(204).end(); return null }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed.' }); return null }
  if (!originAllowed(req)) { res.status(403).json({ error: 'Forbidden origin.' }); return null }
  if (rateLimited(req)) { res.status(429).json({ error: 'Rate limit exceeded. Try again later.' }); return null }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'AI features are not configured: ANTHROPIC_API_KEY is not set on this deployment.' })
    return null
  }

  const { framework, text } = req.body || {}
  if (typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'Field "text" is required.' }); return null
  }
  if (text.length > MAX_INPUT_CHARS) {
    res.status(413).json({ error: `Field "text" exceeds ${MAX_INPUT_CHARS} characters.` }); return null
  }
  if (framework && !ALLOWED_FRAMEWORKS.includes(framework)) {
    res.status(400).json({ error: 'Unrecognized framework.' }); return null
  }

  return { framework: framework || 'GDPR', text }
}

export async function callClaude({ system, user, maxTokens }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      // Model names change — verify against current docs before deploying.
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Anthropic API returned ${response.status}: ${detail.slice(0, 300)}`)
  }

  const data = await response.json()
  const block = (data.content || []).find(b => b.type === 'text')
  return (block ? block.text : '').replace(/```json|```/g, '').trim()
}
