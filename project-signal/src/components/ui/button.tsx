import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700',
        secondary: 'bg-navy-100 text-navy-800 hover:bg-navy-200',
        outline: 'border border-navy-200 bg-white text-navy-700 hover:bg-navy-50',
        ghost: 'text-navy-600 hover:bg-navy-100 hover:text-navy-800',
        danger: 'bg-rose-600 text-white hover:bg-rose-700',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
        link: 'text-brand-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>
  & VariantProps<typeof buttonVariants>
  & { href: string };

export function ButtonLink({ className, variant, size, href, ...props }: ButtonLinkProps) {
  return <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
