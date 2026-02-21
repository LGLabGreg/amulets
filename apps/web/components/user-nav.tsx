import { ChevronsUpDown, LayoutDashboard, Plus } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutMenuItem } from './sign-out-menu-item'

interface UserNavProps {
  username: string
  avatarUrl: string | undefined
}

export function UserNav({ username, avatarUrl }: UserNavProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2"
        render={
          <Button variant="outline">
            <Avatar size="sm">
              <AvatarImage src={avatarUrl} alt={username} />
              <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline-flex text-xs font-medium">{username}</span>
            <ChevronsUpDown className="ml-auto size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <Link href="/dashboard">
                <LayoutDashboard />
                Dashboard
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link href="/new">
                <Plus />
                New Amulet
              </Link>
            }
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
