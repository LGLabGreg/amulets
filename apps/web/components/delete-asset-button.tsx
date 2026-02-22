'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DeleteAssetButtonProps {
  username: string
  slug: string
}

export function DeleteAssetButton({ username, slug }: DeleteAssetButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/assets/${username}/${slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Delete failed')
        setPending(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setPending(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete {slug}?</DialogTitle>
          <DialogDescription>
            This will permanently delete all versions and any stored files. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-xs">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
