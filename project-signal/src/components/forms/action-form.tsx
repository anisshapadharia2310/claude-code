'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';
import type { ActionState } from '@/server/actions/types';

export type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A form bound to a server action, with inline success and error reporting.
 * Field-level errors are exposed to children through a render prop so each form
 * can place them next to the right control.
 */
export function ActionForm({
  action, children, className, id, feedbackPosition = 'top',
}: {
  action: ServerAction;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  id?: string;
  feedbackPosition?: 'top' | 'bottom' | 'none';
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  const feedback = (
    <>
      {state.error ? <Alert tone="danger" className="mb-3">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success" className="mb-3">{state.message}</Alert> : null}
    </>
  );

  return (
    <form id={id} action={formAction} className={className}>
      {feedbackPosition === 'top' ? feedback : null}
      {typeof children === 'function' ? children(state) : children}
      {feedbackPosition === 'bottom' ? <div className="mt-3">{feedback}</div> : null}
    </form>
  );
}

/** Submit button that reports pending state. */
export function SubmitButton({
  children, pendingLabel, ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? 'Working...') : children}
    </Button>
  );
}

/** Submit button that names the value it submits, for multi-outcome forms. */
export function SubmitValueButton({
  name, value, children, pendingLabel, ...props
}: ButtonProps & { name: string; value: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name={name} value={value} disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? 'Working...') : children}
    </Button>
  );
}
