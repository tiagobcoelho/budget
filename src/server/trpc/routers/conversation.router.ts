import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { ConversationService } from '@/services/conversation.service'
import { TRPCError } from '@trpc/server'

export const conversationRouter = router({
  /**
   * Get all conversations for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ConversationService.getUserConversations(ctx.user.id)
  }),

  /**
   * Get a specific conversation by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conversation = await ConversationService.getConversationById(
        input.id,
        ctx.user.id
      )

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      return conversation
    }),

  /**
   * Get conversation with all messages
   */
  getWithMessages: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ConversationService.getConversationWithMessages(
        input.id,
        ctx.user.id
      )

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      return result
    }),

  /**
   * Create a new conversation
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ConversationService.createConversation({
        userId: ctx.user.id,
        title: input.title,
      })
    }),

  /**
   * Update conversation title
   */
  rename: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await ConversationService.updateConversationTitle(
        input.id,
        ctx.user.id,
        input.title
      )

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      return conversation
    }),

  /**
   * Delete a conversation
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await ConversationService.deleteConversation(
        input.id,
        ctx.user.id
      )

      if (!success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      return { success }
    }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ConversationService.getConversationMessages(
        input.conversationId,
        ctx.user.id
      )
    }),

  /**
   * Add a message to a conversation
   */
  addMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return ConversationService.addMessage({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata,
      })
    }),

  /**
   * Add multiple messages to a conversation (batch)
   */
  addMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
            metadata: z.any().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const messagesToInsert = input.messages.map((msg) => ({
        conversationId: input.conversationId,
        ...msg,
      }))

      return ConversationService.addMessages(messagesToInsert)
    }),
})
