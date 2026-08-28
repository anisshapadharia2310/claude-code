import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { cn } from '@/lib/utils';

/**
 * Button hierarchy.
 *
 *   primary    one per view — the action the screen exists for
 *   secondary  supporting actions on a filled surface
 *   outline    supporting actions on a card
 *   ghost      tertiary and toolbar actions
 *   danger     destructive, and visually separated from the rest
 *   success    confirming a positive outcome (approve, verified)
 *   link       inline navigation that must not look like a control
 *
 * Disabled buttons stay readable rather than fading to noise, and every button
 * has a pressed state so a click always feels acknowledged.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap',
    'rounded-md font-medium tracking-[-0.005em]',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none disabled:active:translate-y-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-white shadow-xs hover:bg-brand-700 hover:shadow-sm active:bg-brand-800',
        secondary:
          'bg-navy-100 text-navy-800 hover:bg-navy-200 active:bg-navy-300',
        outline:
          'border border-line-strong bg-surface text-navy-700 shadow-xs hover:border-navy-300 hover:bg-navy-50 hover:text-navy-900 active:bg-navy-100',
        ghost:
          'text-navy-600 hover:bg-navy-100 hover:text-navy-900 active:bg-navy-200',
        danger:
          'bg-danger-600 text-white shadow-xs hover:bg-danger-700 active:bg-danger-800',
        success:
          'bg-success-600 text-white shadow-xs hover:bg-success-700 active:bg-success-800',
        link:
          'h-auto rounded-xs p-0 text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline active:translate-y-0',
      },
      size: {
        xs: 'h-7 px-2.5 text-2xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3.5 text-base',
        lg: 'h-11 px-6 text-md',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

/** The in-button progress indicator used while a form action is pending. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('h-3.5 w-3.5 shrink-0 animate-[spin_700ms_linear_infinite]', className)}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface CommonProps extends VariantProps<typeof buttonVariants> {
  /** Icon rendered before the label. */
  icon?: IconName;
  /** Icon rendered after the label. */
  trailingIcon?: IconName;
  /** Swaps the leading icon for a spinner and blocks interaction. */
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & CommonProps;

export function Button({
  className, variant, size, block, icon, trailingIcon, loading, children, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
      {trailingIcon && !loading ? <Icon name={trailingIcon} className="h-4 w-4" /> : null}
    </button>
  );
}

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps & { href: string };

export function ButtonLink({
  className, variant, size, block, icon, trailingIcon, children, href, ...props
}: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size, block }), className)} {...props}>
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} className="h-4 w-4" /> : null}
    </Link>
  );
}

/** A horizontal group of related actions with a shared boundary. */
export function ButtonGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)} role="group">
      {children}
    </div>
  );
}
