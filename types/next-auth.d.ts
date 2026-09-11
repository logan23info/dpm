import "next-auth"

declare module "next-auth" {
  /**
   * Extended Session type with custom user properties
   */
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role?: "admin" | "dpo" | "auditor" | "reviewer" | "viewer"
      org_id?: string
    }
  }

  /**
   * User type from database
   */
  interface User {
    id: string
    email: string
    name: string | null
    image: string | null
    role?: string
    org_id?: string
  }

  /**
   * JWT token structure
   */
  interface JWT {
    sub?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string
    email?: string
  }
}
