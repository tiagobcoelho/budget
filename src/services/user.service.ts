import { db } from '@/db'
import type { User } from '@prisma/client'

export class UserService {
  /**
   * Get user by Clerk ID
   */
  static async getUserByClerkId(clerkId: string): Promise<User | null> {
    return db.user.findUnique({ where: { clerkId } })
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    return db.user.findUnique({ where: { id } })
  }
}
