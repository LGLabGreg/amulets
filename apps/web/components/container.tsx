import { cn } from '@/lib/utils'

export function Container({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto max-w-6xl px-4 py-10', className)} {...props}>
      {children}
    </div>
  )
}
