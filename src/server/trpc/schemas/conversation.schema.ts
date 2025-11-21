import { z } from 'zod'

// Message Role Enum
export const messageRoleSchema = z.enum(['user', 'assistant', 'system'])

// Get Conversation By ID Input
export const getConversationByIdSchema = z.object({
  id: z.string().uuid(),
})

// Get Conversation With Messages Input
export const getConversationWithMessagesSchema = z.object({
  id: z.string().uuid(),
})

// Create Conversation Input
export const createConversationSchema = z.object({
  title: z.string().min(1).max(255),
})

// Rename Conversation Input
export const renameConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
})

// Delete Conversation Input
export const deleteConversationSchema = z.object({
  id: z.string().uuid(),
})

// Get Messages Input
export const getMessagesSchema = z.object({
  conversationId: z.string().uuid(),
})

// Message Schema
export const messageSchema = z.object({
  role: messageRoleSchema,
  content: z.string(),
  metadata: z.any().optional(),
})

// Add Message Input
export const addMessageSchema = z.object({
  conversationId: z.string().uuid(),
  role: messageRoleSchema,
  content: z.string(),
  metadata: z.any().optional(),
})

// Add Messages Input
export const addMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(messageSchema),
})

// Type exports
export type GetConversationByIdInput = z.infer<typeof getConversationByIdSchema>
export type GetConversationWithMessagesInput = z.infer<
  typeof getConversationWithMessagesSchema
>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type RenameConversationInput = z.infer<typeof renameConversationSchema>
export type DeleteConversationInput = z.infer<typeof deleteConversationSchema>
export type GetMessagesInput = z.infer<typeof getMessagesSchema>
export type AddMessageInput = z.infer<typeof addMessageSchema>
export type AddMessagesInput = z.infer<typeof addMessagesSchema>
export type Message = z.infer<typeof messageSchema>
export type MessageRole = z.infer<typeof messageRoleSchema>
