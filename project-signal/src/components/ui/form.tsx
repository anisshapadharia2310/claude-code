import type {
  InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-md border border-navy-200 bg-white px-3 text-sm text-navy-800 ' +
  'placeholder:text-navy-400 focus:border-brand-500 focus:outline-none focus:ring-2 ' +
  'focus:ring-brand-500/20 disabled:bg-navy-50 disabled:text-navy-400';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-xs font-medium text-navy-600', className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'h-9', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'py-2 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'h-9 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn('h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500/30', className)}
      {...props}
    />
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-navy-500">{children}</p>;
}

export function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs font-medium text-rose-700">{children}</p>;
}
