import { db } from '@/db'
import { randomBytes } from 'crypto'

export interface InviteWithDetails {
  id: string
  householdId: string
  email: string
  invitedByUserId: string
  status: string
  token: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  household: {
    id: string
    name: string
  }
  invitedBy: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export class InviteService {
  /**
   * Generate a secure random token for invite
   */
  private static generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Create an invite for a partner
   */
  static async createInvite(
    householdId: string,
    email: string,
    invitedByUserId: string
  ) {
    // Check if household exists
    const household = await db.household.findUnique({
      where: { id: householdId },
    })

    if (!household) {
      throw new Error('Household not found')
    }

    // Check if user is already a member of the household
    const existingUser = await db.user.findUnique({
      where: { email },
      include: {
        householdMembers: {
          where: { householdId },
        },
      },
    })

    if (existingUser && existingUser.householdMembers.length > 0) {
      throw new Error('User is already a member of this household')
    }

    // Check for existing pending invite
    const existingInvite = await db.invite.findFirst({
      where: {
        householdId,
        email,
        status: 'PENDING',
      },
    })

    if (existingInvite) {
      // Check if expired
      if (existingInvite.expiresAt < new Date()) {
        // Expire the old invite
        await db.invite.update({
          where: { id: existingInvite.id },
          data: { status: 'EXPIRED' },
        })
      } else {
        throw new Error('A pending invite already exists for this email')
      }
    }

    // Generate token and set expiry (7 days)
    const token = this.generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invite
    const invite = await db.invite.create({
      data: {
        householdId,
        email,
        invitedByUserId,
        token,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return invite
  }

  /**
   * Get invite by token
   */
  static async getInviteByToken(
    token: string
  ): Promise<InviteWithDetails | null> {
    const invite = await db.invite.findUnique({
      where: { token },
      include: {
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!invite) {
      return null
    }

    // Check if expired
    if (invite.expiresAt < new Date() && invite.status === 'PENDING') {
      await db.invite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      })
      return null
    }

    return invite
  }

  /**
   * Get pending invites for an email
   */
  static async getInvitesByEmail(email: string) {
    const invites = await db.invite.findMany({
      where: {
        email,
        status: 'PENDING',
      },
      include: {
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter out expired invites and mark them as expired
    const validInvites: InviteWithDetails[] = []
    for (const invite of invites) {
      if (invite.expiresAt < new Date()) {
        await db.invite.update({
          where: { id: invite.id },
          data: { status: 'EXPIRED' },
        })
      } else {
        validInvites.push(invite)
      }
    }

    return validInvites
  }

  /**
   * Check for pending invites for an email (groundwork for acceptance)
   */
  static async checkPendingInvitesForEmail(email: string) {
    return this.getInvitesByEmail(email)
  }

  /**
   * Accept an invite and add user to household
   */
  static async acceptInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token)

    if (!invite) {
      throw new Error('Invite not found or expired')
    }

    if (invite.status !== 'PENDING') {
      throw new Error('Invite is not pending')
    }

    // Verify email matches
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.email !== invite.email) {
      throw new Error('Email does not match invite')
    }

    // Check if user is already a member
    const existingMember = await db.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: invite.householdId,
          userId,
        },
      },
    })

    if (existingMember) {
      // Mark invite as accepted even if already member
      await db.invite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })
      throw new Error('User is already a member of this household')
    }

    // Add user to household
    await db.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId,
        role: 'MEMBER',
        invitedAt: invite.createdAt,
        joinedAt: new Date(),
      },
    })

    // Mark invite as accepted
    await db.invite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        updatedAt: new Date(),
      },
    })

    return {
      householdId: invite.householdId,
      householdName: invite.household.name,
    }
  }

  /**
   * Expire an invite
   */
  static async expireInvite(id: string) {
    await db.invite.update({
      where: { id },
      data: {
        status: 'EXPIRED',
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Cleanup expired invites (can be run as a cron job)
   */
  static async cleanupExpiredInvites() {
    const result = await db.invite.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
        updatedAt: new Date(),
      },
    })

    return result.count
  }
}
