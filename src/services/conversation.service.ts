import { db } from '@/db'
import type { Conversation, Message } from '@prisma/client'

export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(data: {
    userId: string
    title: string
  }): Promise<Conversation> {
    return db.conversation.create({ data })
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    return db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  /**
   * Get a single conversation by ID
   */
  static async getConversationById(
    id: string,
    userId: string
  ): Promise<Conversation | null> {
    return db.conversation.findFirst({ where: { id, userId } })
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    id: string,
    userId: string,
    title: string
  ): Promise<Conversation | null> {
    const updated = await db.conversation.updateMany({
      where: { id, userId },
      data: { title, updatedAt: new Date() },
    })
    if (updated.count === 0) return null
    return db.conversation.findUnique({ where: { id } })
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(
    id: string,
    userId: string
  ): Promise<boolean> {
    const result = await db.conversation.deleteMany({ where: { id, userId } })
    return result.count > 0
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(
    conversationId: string,
    userId: string
  ): Promise<Message[]> {
    const conversation = await this.getConversationById(conversationId, userId)
    if (!conversation) throw new Error('Conversation not found or unauthorized')
    return db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * Add a message to a conversation
   */
  static async addMessage(data: {
    conversationId: string
    role: string
    content: string
    metadata?: any
  }): Promise<Message> {
    const result = await db.$transaction([
      db.message.create({ data }),
      db.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      }),
    ])
    return result[0]
  }

  /**
   * Add multiple messages to a conversation (batch)
   */
  static async addMessages(
    data: {
      conversationId: string
      role: string
      content: string
      metadata?: any
    }[]
  ): Promise<Message[]> {
    if (data.length === 0) return []
    const conversationId = data[0].conversationId
    const messages = await db.$transaction(async (tx) => {
      const created = await Promise.all(
        data.map((d) => tx.message.create({ data: d }))
      )
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })
      return created
    })
    return messages
  }

  /**
   * Get conversation with messages
   */
  static async getConversationWithMessages(
    conversationId: string,
    userId: string
  ): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const conversation = await this.getConversationById(conversationId, userId)
    if (!conversation) return null
    const conversationMessages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })
    return { conversation, messages: conversationMessages }
  }
}
