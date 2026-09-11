import { sql } from "@vercel/postgres"

/**
 * Database helper functions for authentication and user management
 * These functions work with the users table created in Phase 1
 */

export interface DbUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: "admin" | "dpo" | "auditor" | "reviewer" | "viewer"
  org_id: string | null
  oauth_provider: string | null
  oauth_id: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const result = await sql<DbUser>`
      SELECT id, email, name, image, role, org_id, oauth_provider, oauth_id, created_at, updated_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error getting user by email:", error)
    return null
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<DbUser | null> {
  try {
    const result = await sql<DbUser>`
      SELECT id, email, name, image, role, org_id, oauth_provider, oauth_id, created_at, updated_at
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error getting user by id:", error)
    return null
  }
}

/**
 * Create new user
 */
export async function createUser(data: {
  email: string
  name?: string
  image?: string
  oauth_provider?: string
  oauth_id?: string
  role?: string
  org_id?: string
}): Promise<DbUser | null> {
  try {
    const result = await sql<DbUser>`
      INSERT INTO users (email, name, image, oauth_provider, oauth_id, role, org_id, created_at, updated_at)
      VALUES (
        ${data.email},
        ${data.name || null},
        ${data.image || null},
        ${data.oauth_provider || null},
        ${data.oauth_id || null},
        ${data.role || "viewer"},
        ${data.org_id || null},
        NOW(),
        NOW()
      )
      RETURNING id, email, name, image, role, org_id, oauth_provider, oauth_id, created_at, updated_at
    `

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<{
    name: string
    image: string
    role: string
    oauth_id: string
    oauth_provider: string
  }>
): Promise<DbUser | null> {
  try {
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.image !== undefined) {
      updates.push(`image = $${paramIndex++}`)
      values.push(data.image)
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`)
      values.push(data.role)
    }
    if (data.oauth_id !== undefined) {
      updates.push(`oauth_id = $${paramIndex++}`)
      values.push(data.oauth_id)
    }
    if (data.oauth_provider !== undefined) {
      updates.push(`oauth_provider = $${paramIndex++}`)
      values.push(data.oauth_provider)
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) {
      // Only updated_at, return existing user
      return await getUserById(id)
    }

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING id, email, name, image, role, org_id, oauth_provider, oauth_id, created_at, updated_at
    `

    const result = await sql.query(query, values)
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error updating user:", error)
    return null
  }
}

/**
 * Get all users in organization
 */
export async function getOrganizationUsers(org_id: string): Promise<DbUser[]> {
  try {
    const result = await sql<DbUser>`
      SELECT id, email, name, image, role, org_id, oauth_provider, oauth_id, created_at, updated_at
      FROM users
      WHERE org_id = ${org_id}
      ORDER BY name ASC
    `

    return result.rows
  } catch (error) {
    console.error("Error getting organization users:", error)
    return []
  }
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM users WHERE email = ${email} LIMIT 1
    `

    return result.rows.length > 0
  } catch (error) {
    console.error("Error checking email:", error)
    return false
  }
}

/**
 * Get user count by role
 */
export async function getUserCountByRole(
  org_id: string
): Promise<{ role: string; count: number }[]> {
  try {
    const result = await sql`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE org_id = ${org_id}
      GROUP BY role
    `

    return result.rows as { role: string; count: number }[]
  } catch (error) {
    console.error("Error getting user count by role:", error)
    return []
  }
}

/**
 * Get recent signins
 */
export async function getRecentSignins(
  org_id: string,
  limit: number = 10
): Promise<{ user_id: string; email: string; signin_at: Date; provider: string }[]> {
  try {
    const result = await sql`
      SELECT 
        al.user_id,
        u.email,
        al.created_at as signin_at,
        al.metadata->>'provider' as provider
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      WHERE u.org_id = ${org_id}
        AND al.activity_type = 'user_signin'
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `

    return result.rows as {
      user_id: string
      email: string
      signin_at: Date
      provider: string
    }[]
  } catch (error) {
    console.error("Error getting recent signins:", error)
    return []
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM users WHERE id = ${id}
    `

    return result.rowCount > 0
  } catch (error) {
    console.error("Error deleting user:", error)
    return false
  }
}
