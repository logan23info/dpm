import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
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
