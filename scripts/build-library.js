// Expands seed files into schema-conformant control records and writes data/frameworks/*.json
// Also enforces referential integrity: broken refs fail the build, one-way refs are made symmetric.
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = join(__dirname, '..', 'data', 'seed')
const OUT_DIR = join(__dirname, '..', 'data', 'frameworks')

const FRAMEWORK_OF_PREFIX = {
  GDPR: 'GDPR', ISO27701: 'ISO27701', DPDP: 'DPDP', NISTPF: 'NISTPF', SOC2: 'SOC2'
}

// Workpaper fields start empty — populated during fieldwork, not at build time.
const WORKPAPER_DEFAULTS = {
  residual_risk: null,
  test_result: 'Not Tested',
  exceptions_noted: null,
  conclusion: null,
  gap_notes: null,
  period_covered: null,
  prepared_by: null,
  reviewed_by: null,
  last_reviewed: null
}

function frameworkFromId(id) {
  const prefix = id.split('-')[0]
  const fw = FRAMEWORK_OF_PREFIX[prefix]
  if (!fw) throw new Error(`Cannot derive framework from control id "${id}"`)
  return fw
}

const seedFiles = readdirSync(SEED_DIR).filter(f => f.endsWith('.seed.js'))
const byFile = {}
let all = []

for (const f of seedFiles) {
  const mod = await import(pathToFileURL(join(SEED_DIR, f)).href)
  const records = mod.default.map(r => ({
    ...r,
    framework: frameworkFromId(r.id),
    status: r.status ?? 'Not Started',
    itgc_dependency: r.itgc_dependency ?? [],
    cross_framework_refs: r.cross_framework_refs ?? [],
    ...WORKPAPER_DEFAULTS
  }))
  byFile[f.replace('.seed.js', '.json')] = records
  all = all.concat(records)
}

// --- Referential integrity ---
const index = new Map(all.map(c => [c.id, c]))
const broken = []
for (const c of all) {
  for (const ref of c.cross_framework_refs) {
    if (!index.has(ref)) broken.push(`${c.id} -> ${ref}`)
  }
}
if (broken.length) {
  console.error('BUILD FAILED — cross_framework_refs point at non-existent control IDs:')
  broken.forEach(b => console.error('  ' + b))
  process.exit(1)
}

// Make mappings symmetric: if A references B, B must reference A.
let repaired = 0
for (const c of all) {
  for (const ref of [...c.cross_framework_refs]) {
    const target = index.get(ref)
    if (!target.cross_framework_refs.includes(c.id)) {
      target.cross_framework_refs.push(c.id)
      repaired++
    }
  }
}
// Self-references are meaningless; strip and sort for stable diffs.
for (const c of all) {
  c.cross_framework_refs = [...new Set(c.cross_framework_refs)].filter(r => r !== c.id).sort()
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
for (const [file, records] of Object.entries(byFile)) {
  writeFileSync(join(OUT_DIR, file), JSON.stringify(records, null, 2) + '\n')
  console.log(`Built ${file} — ${records.length} controls`)
}

const keyCount = all.filter(c => c.key_control).length
console.log(`\nTotal: ${all.length} controls (${keyCount} key, ${all.length - keyCount} non-key)`)
console.log(`Symmetric mapping repairs applied: ${repaired}`)
console.log(`Domains covered: ${new Set(all.map(c => c.domain)).size}`)
