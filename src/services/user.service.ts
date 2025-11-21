import { db } from '@/db'
import type { User } from '@prisma/client'
import { clerkClient } from '@clerk/nextjs/server'
import { HouseholdService } from './household.service'
import { CategoryService } from './category.service'

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

  /**
   * Get or create user by Clerk ID
   * Creates user if they don't exist (fallback for webhook failures)
   */
  static async getOrCreateUserByClerkId(clerkId: string): Promise<User> {
    let user = await db.user.findUnique({ where: { clerkId } })

    if (!user) {
      try {
        // Fetch user data from Clerk
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(clerkId)

        if (
          !clerkUser.emailAddresses ||
          clerkUser.emailAddresses.length === 0
        ) {
          throw new Error('User has no email address')
        }

        // Create user in database
        user = await db.user.create({
          data: {
            clerkId,
            email: clerkUser.emailAddresses[0].emailAddress,
            firstName: clerkUser.firstName ?? undefined,
            lastName: clerkUser.lastName ?? undefined,
            imageUrl: clerkUser.imageUrl ?? undefined,
            onboarded: false,
            onboardingStep: 1,
          },
        })

        // Create default user preferences
        try {
          await db.userPreference.create({
            data: {
              userId: user.id,
              defaultCurrencyCode: 'USD',
              theme: 'DARK',
              dateFormat: 'MDY',
              budgetAlerts: true,
              transactionNotifications: true,
              monthlyReports: true,
              emailNotifications: false,
            },
          })
        } catch (prefError) {
          // If preferences already exist or creation fails, log but don't fail
          console.error('Error creating user preferences:', prefError)
        }

        // Create personal household for the user
        try {
          const household = await HouseholdService.getOrCreatePersonalHousehold(
            user.id
          )

          // Create default categories for the household
          await CategoryService.createDefaultCategories(household.id)

          console.log(
            'Personal household created for user:',
            user.id,
            'household:',
            household.id
          )
        } catch (householdError) {
          // If household creation fails, log but don't fail user creation
          console.error('Error creating personal household:', householdError)
        }

        // Don't create default accounts during onboarding
        // User will create them during onboarding flow

        console.log('User created via fallback:', user.id)
      } catch (error) {
        console.error('Error in getOrCreateUserByClerkId:', error)
        // Re-throw so caller can handle
        throw error
      }
    }

    if (!user) {
      throw new Error('Failed to get or create user')
    }

    return user
  }

  /**
   * Update onboarding step for a user
   */
  static async updateOnboardingStep(
    userId: string,
    step: number
  ): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: { onboardingStep: step },
    })
  }

  /**
   * Complete onboarding for a user
   */
  static async completeOnboarding(userId: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: { onboarded: true, onboardingStep: null },
    })
  }
}
