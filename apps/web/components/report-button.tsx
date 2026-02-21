'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ReportButton({ owner, name }: { owner: string; name: string }) {
  const [reported, setReported] = useState(false)
  const [reason, setReason] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function handleReport() {
    const res = await fetch(`/api/assets/${owner}/${name}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) setReported(true)
  }

  if (reported) {
    return <p className="text-xs text-muted-foreground">Reported. Thank you.</p>
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Report this asset
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you reporting this asset?"
        className="w-full border bg-background px-3 py-2 text-sm"
        rows={3}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleReport} disabled={!reason.trim()}>
          Submit report
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
