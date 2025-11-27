import { db } from '@/db'
import { HouseholdRole } from '@prisma/client'
import { InviteService } from './invite.service'

export interface HouseholdWithMembers {
  id: string
  name: string
  seatLimit: number
  stripeCustomerId: string | null
  createdAt: Date
  updatedAt: Date
  members: Array<{
    id: string
    role: HouseholdRole
    invitedAt: Date | null
    joinedAt: Date | null
    user: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      imageUrl: string | null
    }
  }>
}

export class HouseholdService {
  /**
   * Get user's household (they belong to exactly one)
   */
  static async getByUserId(
    userId: string
  ): Promise<HouseholdWithMembers | null> {
    const membership = await db.householdMember.findFirst({
      where: { userId },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!membership) {
      return null
    }

    return {
      id: membership.household.id,
      name: membership.household.name,
      seatLimit: membership.household.seatLimit,
      stripeCustomerId: membership.household.stripeCustomerId,
      createdAt: membership.household.createdAt,
      updatedAt: membership.household.updatedAt,
      members: membership.household.members.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    }
  }

  /**
   * Get or create user's personal household
   */
  static async getOrCreatePersonalHousehold(
    userId: string
  ): Promise<HouseholdWithMembers> {
    // Try to get existing household
    const existing = await this.getByUserId(userId)
    if (existing) {
      return existing
    }

    // Get user info for household name
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    })

    const householdName = user?.firstName
      ? `${user.firstName}'s Household`
      : `Household for ${user?.email || 'User'}`

    // Create personal household
    const household = await db.household.create({
      data: {
        name: householdName,
        seatLimit: 1,
        members: {
          create: {
            userId,
            role: 'OWNER',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    return {
      id: household.id,
      name: household.name,
      seatLimit: household.seatLimit,
      stripeCustomerId: household.stripeCustomerId,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
      members: household.members.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    }
  }

  /**
   * Get household by ID with members
   */
  static async getById(
    householdId: string
  ): Promise<HouseholdWithMembers | null> {
    const household = await db.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    if (!household) {
      return null
    }

    return {
      id: household.id,
      name: household.name,
      seatLimit: household.seatLimit,
      stripeCustomerId: household.stripeCustomerId,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
      members: household.members.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    }
  }

  /**
   * Add member to household (invite partner)
   */
  static async addMember(
    householdId: string,
    userId: string,
    role: HouseholdRole = 'MEMBER'
  ): Promise<void> {
    // Check if household exists and has space
    const household = await db.household.findUnique({
      where: { id: householdId },
      include: {
        members: true,
      },
    })

    if (!household) {
      throw new Error('Household not found')
    }

    // Check seat limit
    if (household.members.length >= household.seatLimit) {
      throw new Error('Household has reached its seat limit')
    }

    // Check if user is already a member
    const existingMember = await db.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    })

    if (existingMember) {
      throw new Error('User is already a member of this household')
    }

    // Add member
    await db.householdMember.create({
      data: {
        householdId,
        userId,
        role,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
    })
  }

  /**
   * Remove member from household (leave household)
   */
  static async removeMember(
    householdId: string,
    userId: string
  ): Promise<void> {
    const membership = await db.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
      include: {
        household: {
          include: {
            members: true,
          },
        },
      },
    })

    if (!membership) {
      throw new Error('User is not a member of this household')
    }

    // If removing the owner, ensure there's at least one member left
    if (
      membership.role === 'OWNER' &&
      membership.household.members.length === 1
    ) {
      throw new Error('Cannot remove the last member of a household')
    }

    // If removing owner and there are other members, promote first member to owner
    if (
      membership.role === 'OWNER' &&
      membership.household.members.length > 1
    ) {
      const otherMember = membership.household.members.find(
        (m) => m.userId !== userId
      )
      if (otherMember) {
        await db.householdMember.update({
          where: { id: otherMember.id },
          data: { role: 'OWNER' },
        })
      }
    }

    // Remove member
    await db.householdMember.delete({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    })
  }

  /**
   * Update household
   */
  static async update(
    householdId: string,
    data: {
      name?: string
      seatLimit?: number
      stripeCustomerId?: string | null
    }
  ): Promise<HouseholdWithMembers> {
    const household = await db.household.update({
      where: { id: householdId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    return {
      id: household.id,
      name: household.name,
      seatLimit: household.seatLimit,
      stripeCustomerId: household.stripeCustomerId,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
      members: household.members.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    }
  }

  /**
   * Verify user is member of household
   */
  static async verifyMembership(
    userId: string,
    householdId: string
  ): Promise<boolean> {
    const membership = await db.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    })

    return !!membership
  }

  /**
   * Get household members
   */
  static async getMembers(householdId: string) {
    const members = await db.householdMember.findMany({
      where: { householdId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { joinedAt: 'asc' },
      ],
    })

    return members.map((m) => ({
      id: m.id,
      role: m.role,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
      user: m.user,
    }))
  }

  /**
   * Invite user by email to join household
   */
  static async inviteByEmail(
    householdId: string,
    email: string
  ): Promise<void> {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('User not found with this email')
    }

    // Add as member
    await this.addMember(householdId, user.id, 'MEMBER')
  }

  /**
   * Create a couple household with seatLimit=2 and invite partner
   */
  static async createCoupleHousehold(
    userId: string,
    partnerEmail: string,
    partnerFirstName: string
  ): Promise<HouseholdWithMembers> {
    // Check if user already has a household
    const existing = await this.getByUserId(userId)
    if (existing) {
      throw new Error('User already has a household')
    }

    // Get user info for household name
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Create household name from both users' names
    const userDisplayName = user.firstName || user.email
    const partnerDisplayName = partnerFirstName || partnerEmail
    const householdName = `${userDisplayName} & ${partnerDisplayName}'s Household`

    // Create couple household with seatLimit=2
    const household = await db.household.create({
      data: {
        name: householdName,
        seatLimit: 2,
        members: {
          create: {
            userId,
            role: 'OWNER',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    // Create invite for partner
    await InviteService.createInvite(household.id, partnerEmail, userId)

    return {
      id: household.id,
      name: household.name,
      seatLimit: household.seatLimit,
      stripeCustomerId: household.stripeCustomerId,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
      members: household.members.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    }
  }
}
