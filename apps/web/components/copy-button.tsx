'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden">
      <Button variant="outline" size="sm" className="font-mono" onClick={handleCopy}>
        {label}
      </Button>
      <div
        className={`absolute right-0 top-0 h-full aspect-square bg-primary text-primary-foreground flex items-center justify-center transition-transform duration-200 ease-out ${
          copied ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Check className="size-3.5" />
      </div>
    </div>
  )
}
