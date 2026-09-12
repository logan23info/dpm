// lib/validate.ts
// Input validation helpers — used by API routes to sanitise user input
// Prevents SQL injection via parameterised queries + XSS via sanitisation

// UUID validation
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// Safe string — trims and limits length, strips HTML tags
export function safeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')  // strip HTML
}

// Safe enum — only allow values from a whitelist
export function safeEnum<T extends string>(
  value: unknown,
  allowed: T[],
  fallback: T
): T {
  if (typeof value !== 'string') return fallback
  return allowed.includes(value as T) ? (value as T) : fallback
}

// Validate severity
export function validateSeverity(v: unknown): 'low' | 'medium' | 'high' | 'critical' {
  return safeEnum(v, ['low', 'medium', 'high', 'critical'], 'medium')
}

// Validate status
export function validateStatus(v: unknown): string {
  return safeEnum(v, ['open', 'in-progress', 'remediated', 'closed', 'waived'], 'open')
}

// Validate test result
export function validateTestResult(v: unknown): string {
  return safeEnum(v, ['effective', 'partial', 'ineffective', 'not-tested'], 'not-tested')
}

// Validate implementation status
export function validateImplStatus(v: unknown): string {
  return safeEnum(v, ['implemented', 'partial', 'not-implemented', 'not-applicable'], 'partial')
}

// Validate date string (YYYY-MM-DD)
export function safeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : value
}

// Sanitise an object — apply safeString to all string fields
export function sanitiseObject(
  obj: Record<string, unknown>,
  config: Record<string, { type: 'string'; maxLength?: number } | { type: 'enum'; allowed: string[]; fallback: string } | { type: 'date' } | { type: 'boolean' } | { type: 'number' }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, rule] of Object.entries(config)) {
    if (!(key in obj)) continue
    const val = obj[key]
    switch (rule.type) {
      case 'string':  result[key] = safeString(val, rule.maxLength); break
      case 'enum':    result[key] = safeEnum(val, rule.allowed as any[], rule.fallback); break
      case 'date':    result[key] = safeDate(val); break
      case 'boolean': result[key] = Boolean(val); break
      case 'number':  result[key] = typeof val === 'number' ? val : parseInt(String(val)) || 0; break
    }
  }
  return result
}

// Standard API error response
export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

// Standard 404
export function notFound(resource = 'Resource') {
  return Response.json({ error: `${resource} not found` }, { status: 404 })
}
