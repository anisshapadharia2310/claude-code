import type {
  InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

/**
 * Form controls.
 *
 * One input height (36px), one border treatment, one focus ring. Required
 * fields are marked with a symbol and a word, never colour alone. Errors are
 * announced, not just tinted.
 */
const controlBase = [
  'w-full rounded-md border border-line-strong bg-surface text-navy-800 shadow-xs',
  'placeholder:text-navy-400',
  'transition-[border-color,box-shadow] duration-[120ms]',
  'hover:border-navy-300',
  'focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-500/15',
  'disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400 disabled:shadow-none',
  'aria-[invalid=true]:border-danger-400 aria-[invalid=true]:ring-danger-500/15',
].join(' ');

export function Label({
  className, required, children, ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('mb-1.5 flex items-center gap-1 text-xs font-medium text-navy-700', className)} {...props}>
      {children}
      {required ? (
        <span className="text-danger-600" title="Required">
          <span aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, 'h-9 px-3 text-base', className)} {...props} />;
}

/** An input with a leading icon, used for search fields. */
export function InputWithIcon({
  className, icon = 'search', ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: 'search' | 'filter' }) {
  return (
    <div className="relative">
      <Icon
        name={icon}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
      />
      <input className={cn(controlBase, 'h-9 pl-9 pr-3 text-base', className)} {...props} />
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'px-3 py-2 text-base leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(controlBase, 'h-9 appearance-none pl-3 pr-9 text-base', className)}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
      />
    </div>
  );
}

/** A native multi-select, styled to match the rest of the controls. */
export function MultiSelectList({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      multiple
      className={cn(
        controlBase,
        'px-1.5 py-1.5 text-xs [&>option]:rounded-sm [&>option]:px-1.5 [&>option]:py-1',
        '[&>option:checked]:bg-brand-600 [&>option:checked]:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded-xs border-line-strong text-brand-600 shadow-xs',
        'transition-colors hover:border-navy-400',
        'focus:ring-[3px] focus:ring-brand-500/20 focus:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/** A checkbox with its label, aligned and clickable as one target. */
export function CheckboxField({
  label, hint, className, ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 text-base text-navy-700', className)}>
      <Checkbox className="mt-0.5" {...props} />
      <span className="min-w-0">
        <span className="block leading-snug">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-navy-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs leading-relaxed text-navy-500">{children}</p>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger-700">
      <Icon name="alert" className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

/**
 * A complete field: label, control, hint and error, spaced consistently.
 * Using this instead of assembling the parts keeps every form on the same grid.
 */
export function Field({
  label, htmlFor, required, hint, error, children, className,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <Label htmlFor={htmlFor} required={required}>{label}</Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

/** A titled group of related fields. */
export function FieldGroup({
  title, description, children, className, columns = 2,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[columns];
  return (
    <fieldset className={cn('min-w-0', className)}>
      {title ? (
        <legend className="mb-1 text-sm font-semibold text-navy-800">{title}</legend>
      ) : null}
      {description ? <p className="mb-3 text-xs leading-relaxed text-navy-500">{description}</p> : null}
      <div className={cn('grid gap-4', grid)}>{children}</div>
    </fieldset>
  );
}

/** The action row at the foot of a form. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-t border-line pt-4', className)}>
      {children}
    </div>
  );
}
