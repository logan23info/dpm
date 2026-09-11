import NextAuth from "next-auth"
import GitHub from "@auth/github-provider"
import Google from "@auth/google-provider"
import { sql } from "@vercel/postgres"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    newUser: "/onboarding",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      // Upsert user on first login
      try {
        const result = await sql`
          INSERT INTO users (email, name, org_id, role, created_at)
          VALUES (${user.email}, ${user.name}, NULL, 'viewer', NOW())
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name
          RETURNING id
        `
        user.id = result.rows[0].id
      } catch (e) {
        console.error("User creation failed:", e)
        return false
      }

      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
