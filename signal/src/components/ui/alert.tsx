import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      default: 'border-navy-200 bg-navy-50 text-navy-900',
      warning: 'border-amber-300 bg-amber-50 text-amber-900',
      danger: 'border-red-300 bg-red-50 text-red-900',
      success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Alert({
  className,
  variant,
  title,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & { title?: string }) {
  return (
    <div role="note" className={cn(alertVariants({ variant }), className)} {...props}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
