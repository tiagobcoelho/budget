'use client'

import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'

interface UserSelectorProps {
  value?: string | null
  onValueChange: (value: string | null) => void
  disabled?: boolean
  showShared?: boolean
}

export function UserSelector({
  value,
  onValueChange,
  disabled = false,
  showShared = true,
}: UserSelectorProps) {
  const { data: household } = trpc.household.current.useQuery()
  const { data: currentUser } = trpc.user.me.useQuery()

  const members = useMemo(() => {
    if (!household?.members) return []
    return household.members.map((m) => m.user)
  }, [household?.members])

  const selectedUser = useMemo(() => {
    if (!value) return null
    return members.find((m) => m.id === value)
  }, [value, members])

  const getDisplayName = (user: {
    firstName: string | null
    lastName: string | null
    email: string
  }) => {
    if (user.firstName) {
      return user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName
    }
    return user.email
  }

  const getInitials = (user: {
    firstName: string | null
    lastName: string | null
    email: string
  }) => {
    if (user.firstName) {
      return user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`
        : user.firstName[0]
    }
    return user.email[0].toUpperCase()
  }

  return (
    <Select
      value={value ?? 'shared'}
      onValueChange={(val) => {
        if (val === 'shared') {
          onValueChange(null)
        } else {
          onValueChange(val)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue>
          {value ? (
            selectedUser ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedUser.imageUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <span>{getDisplayName(selectedUser)}</span>
              </div>
            ) : (
              'Select user'
            )
          ) : (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Shared</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showShared && (
          <SelectItem value="shared">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Shared</span>
            </div>
          </SelectItem>
        )}
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.imageUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span>{getDisplayName(member)}</span>
              {member.id === currentUser?.id && (
                <span className="text-xs text-muted-foreground">(You)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
