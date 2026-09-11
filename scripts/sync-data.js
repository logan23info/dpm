// Copies canonical /data/frameworks/*.json into public/data so Vite serves them statically.
// Runs automatically via the "prebuild" script.
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'data', 'frameworks')
const DEST = join(__dirname, '..', 'public', 'data')

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true })

const files = readdirSync(SRC).filter(f => f.endsWith('.json'))
for (const f of files) {
  copyFileSync(join(SRC, f), join(DEST, f))
  console.log(`Synced ${f} -> public/data/`)
}
