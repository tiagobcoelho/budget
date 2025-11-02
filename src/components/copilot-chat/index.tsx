'use client'

import { useState, useEffect } from 'react'
import { useChat } from 'ai/react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '../ai-elements/conversation'
import { Message, MessageContent } from '../ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '../ai-elements/prompt-input'
import { Loader } from '../ai-elements/loader'
import {
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { Input } from '../ui/input'

/**
 * Improved Chat Component using AI Elements
 *
 * Architecture:
 * - Uses tRPC for CRUD operations (load conversations, rename, delete)
 * - Uses AI SDK's useChat hook for streaming via /api/chat
 * - Saves messages via tRPC after streaming completes
 * - Uses ai-elements for professional UI components
 */
export function CopilotChat() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>('')

  // AI SDK useChat hook for streaming
  const {
    messages: chatMessages,
    append,
    isLoading,
    stop,
  } = useChat({
    api: '/api/chat',
    onFinish: async (message) => {
      // Save assistant message via tRPC after streaming completes
      if (conversationId) {
        await addMessages.mutateAsync({
          conversationId,
          messages: [
            {
              role: 'assistant',
              content: message.content,
            },
          ],
        })
        refetchMessages()
      }
    },
  })

  // tRPC queries and mutations
  const { data: conversations, refetch: refetchConversations } =
    trpc.conversation.list.useQuery()

  const { data: savedMessages, refetch: refetchMessages } =
    trpc.conversation.getMessages.useQuery(
      { conversationId: conversationId! },
      { enabled: !!conversationId }
    )

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: async (data) => {
      // Refetch conversations first, then set the new one as active
      await refetchConversations()
      setConversationId(data.id)
    },
  })

  const addMessages = trpc.conversation.addMessages.useMutation()

  const renameConversation = trpc.conversation.rename.useMutation({
    onSuccess: () => {
      setRenamingId(null)
      setRenameValue('')
      refetchConversations()
    },
  })

  // Auto-select the latest conversation when conversations load
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      // If no active conversation or current one doesn't exist, select the latest
      const latestId = conversations[0].id
      if (
        !conversationId ||
        !conversations.some((c) => c.id === conversationId)
      ) {
        setConversationId(latestId)
      }
    }
  }, [conversations, conversationId])

  const deleteConversation = trpc.conversation.delete.useMutation({
    onSuccess: (_, variables) => {
      // If the deleted conversation was the active one, clear it
      // The useEffect will auto-select the latest after refetch
      if (conversationId === variables.id) {
        setConversationId(null)
      }
      refetchConversations()
    },
  })

  // Helper to check if conversation can be deleted
  const canDeleteConversation = conversations && conversations.length > 1

  const handleNewConversation = () => {
    createConversation.mutate({ title: 'New Conversation' })
  }

  const handleSubmit = async (message: { text?: string }) => {
    if (!message.text?.trim()) return

    let currentConversationId = conversationId

    // Create conversation if it doesn't exist
    if (!currentConversationId) {
      const newConversation = await createConversation.mutateAsync({
        title: message.text.slice(0, 50),
      })
      currentConversationId = newConversation.id
    }

    // Save user message via tRPC before streaming
    await addMessages.mutateAsync({
      conversationId: currentConversationId,
      messages: [
        {
          role: 'user',
          content: message.text,
        },
      ],
    })

    // Trigger AI streaming
    await append({
      role: 'user',
      content: message.text,
    })
  }

  const allMessages = [
    ...(savedMessages || []).map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    ...chatMessages.filter(
      (msg) =>
        !savedMessages?.some((saved) => saved.content === msg.content) ||
        chatMessages.indexOf(msg) === chatMessages.length - 1
    ),
  ]

  return (
    <div className="flex h-full bg-background ">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-background p-4 h-20">
          <h2 className="font-semibold text-lg">
            {conversationId
              ? conversations?.find((c) => c.id === conversationId)?.title
              : 'Select or create a conversation'}
          </h2>
          <p className="text-sm text-muted-foreground">
            AI powered by Vercel AI SDK with tRPC persistence
          </p>
        </div>

        {/* Messages Area */}
        <Conversation className="flex-1">
          <ConversationContent className="max-w-4xl mx-auto">
            {allMessages.length === 0 ? (
              <ConversationEmptyState
                title="Start a conversation"
                description="Ask me anything to get started"
              />
            ) : (
              <div className="space-y-6">
                {allMessages.map((msg, index) => (
                  <Message key={msg.id || index} from={msg.role}>
                    <MessageContent variant="flat">
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </MessageContent>
                  </Message>
                ))}

                {isLoading && (
                  <Message from="assistant">
                    <MessageContent variant="flat">
                      <div className="flex items-center gap-2">
                        <Loader size={16} />
                        <span className="text-muted-foreground">
                          Thinking...
                        </span>
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input Area */}
        <div className="p-4">
          <div className="max-w-4xl mx-auto">
            <PromptInput onSubmit={handleSubmit} className="w-full">
              <PromptInputBody>
                <PromptInputTextarea placeholder="Ask me anything else..." />
              </PromptInputBody>
              <PromptInputFooter>
                <div className="flex-1" />
                <PromptInputSubmit
                  status={isLoading ? 'streaming' : undefined}
                  onClick={isLoading ? stop : undefined}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-l bg-background flex flex-col">
        <div className="px-3 pt-3 pb-2">
          <Button
            onClick={handleNewConversation}
            className="w-full justify-start"
            variant="ghost"
            disabled={createConversation.isPending}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="px-2 py-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <span>Chats</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5">
          <div className="space-y-0.5">
            {conversations?.map((conv) => {
              const isRenaming = renamingId === conv.id

              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center justify-between rounded-xs px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                    conversationId === conv.id && !isRenaming
                      ? 'bg-muted'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    if (!isRenaming) {
                      setConversationId(conv.id)
                    }
                  }}
                >
                  {isRenaming ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        if (renameValue.trim() && renameValue !== conv.title) {
                          renameConversation.mutate({
                            id: conv.id,
                            title: renameValue.trim(),
                          })
                        } else {
                          setRenamingId(null)
                          setRenameValue('')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                        if (e.key === 'Escape') {
                          setRenamingId(null)
                          setRenameValue('')
                        }
                      }}
                      className="h-6 text-sm px-1.5"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate flex-1 pr-2">{conv.title}</span>
                  )}
                  {!isRenaming && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenamingId(conv.id)
                            setRenameValue(conv.title)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        {canDeleteConversation && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteConversation.mutate({ id: conv.id })
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}

            {conversations?.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 px-2">
                No conversations yet.
                <br />
                Start a new chat to begin.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
