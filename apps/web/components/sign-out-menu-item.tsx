'use client'

import { LogOut } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem
      nativeButton={true}
      render={
        <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
          <LogOut />
          Sign out
        </Button>
      }
    />
  )
}
