import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { nextCookies } from 'better-auth/next-js'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export const auth = betterAuth({
  database: { provider: 'pg', pool },
  emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60 },
  user: {
    additionalFields: {
      role:       { type: 'string', defaultValue: 'preparer', input: true },
      department: { type: 'string', required: false, input: true },
    },
  },
  appName: 'DPM',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'change-in-production',
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
