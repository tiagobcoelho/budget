import { PrismaClient } from '@prisma/client'

// Use dev database if provided, otherwise fall back to production DATABASE_URL
const connectionString =
  process.env.DATABASE_URL_DEV || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL or DATABASE_URL_DEV environment variable is required'
  )
}

export const db = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
})
