'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createAssetAction } from './actions';

const ASSET_TYPES = [
  'prompt',
  'skill',
  'cursorrules',
  'agents-md',
  'other',
] as const;

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  type: z.enum(ASSET_TYPES),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver e.g. 1.0.0'),
  message: z.string().optional(),
  content: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function NewAssetForm({ username }: { username: string }) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      type: 'prompt',
      version: '1.0.0',
      message: '',
      content: '',
    },
  });

  const nameValue = form.watch('name');
  const previewSlug = nameValue ? toSlug(nameValue) : 'my-asset';

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const slug = toSlug(values.name);
    const result = await createAssetAction({ ...values, slug });
    if (result?.error) {
      setServerError(result.error);
    }
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-0 border border-border'
      >
        {/* Name */}
        <div className='border-b border-border p-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name<span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder='my-system-prompt'
                    className='font-mono'
                  />
                </FormControl>
                <p className='text-xs text-muted-foreground'>
                  Will be published as{' '}
                  <span className='font-mono text-foreground'>
                    {username}/{previewSlug}
                  </span>
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <div className='border-b border-border p-4'>
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder='A short description of what this asset does'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Type + Version row */}
        <div className='grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border'>
          <div className='p-4'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className='w-full font-mono'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='p-4'>
            <FormField
              control={form.control}
              name='version'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='1.0.0'
                      className='font-mono'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Release notes */}
        <div className='border-b border-border p-4'>
          <FormField
            control={form.control}
            name='message'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Release notes</FormLabel>
                <FormControl>
                  <Input {...field} placeholder='Initial release' />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Content */}
        <div className='border-b border-border p-4'>
          <FormField
            control={form.control}
            name='content'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Content<span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='Paste your prompt, cursorrules, or markdown content here…'
                    rows={16}
                    className='font-mono resize-y'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Package note */}
        <div className='border-b border-border bg-muted/30 px-4 py-3'>
          <p className='text-xs text-muted-foreground'>
            <span className='font-semibold'>Pushing a skill package?</span> Use
            the CLI:{' '}
            <span className='font-mono'>amulets push ./my-skill-folder</span>
          </p>
        </div>

        {/* Error + Submit */}
        <div className='flex items-center justify-between gap-4 p-4'>
          {serverError ? (
            <p className='text-sm text-destructive'>{serverError}</p>
          ) : (
            <span />
          )}
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Publishing…' : 'Publish asset'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
