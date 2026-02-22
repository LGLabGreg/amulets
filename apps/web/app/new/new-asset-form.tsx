'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createAssetAction } from './actions'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver e.g. 1.0.0'),
  message: z.string().optional(),
  content: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function NewAssetForm({ username }: { username: string }) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      version: '1.0.0',
      message: '',
      content: '',
    },
  })

  const nameValue = form.watch('name')
  const previewSlug = nameValue ? toSlug(nameValue) : 'my-asset'

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const slug = toSlug(values.name)
    const result = await createAssetAction({ ...values, slug })
    if (result?.error) {
      setServerError(result.error)
    }
  }

  const isLoading = form.formState.isSubmitting

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 border">
        {/* Name */}
        <div className="border-b p-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name<span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="my-system-prompt" className="font-mono" />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Will be saved as{' '}
                  <span className="font-mono text-foreground">
                    {username}/{previewSlug}
                  </span>
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <div className="border-b p-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="A short description of what this asset does" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Version */}
        <div className="border-b p-4">
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Version</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="1.0.0" className="font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Release notes */}
        <div className="border-b p-4">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Release notes</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Initial release" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Content */}
        <div className="border-b p-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Content<span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Paste your prompt, cursorrules, or markdown content here…"
                    rows={16}
                    className="font-mono resize-y"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Package note */}
        <div className="border-b bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Pushing a skill or bundle?</span> Use the CLI:{' '}
            <span className="font-mono">amulets push ./my-folder</span>
          </p>
        </div>

        {/* Error + Submit */}
        <div className="flex items-center justify-between gap-4 p-4">
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : <span />}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save asset'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
