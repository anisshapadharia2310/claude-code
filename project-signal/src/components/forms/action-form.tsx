'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';
import type { ActionState } from '@/server/actions/types';

export type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A form bound to a server action.
 *
 * Feedback appears inline, next to the control that produced it, and is
 * announced through the Alert component's live region. Field-level errors reach
 * the right control through a render prop.
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
      {state.error ? <Alert tone="danger" className={feedbackPosition === 'top' ? 'mb-3' : ''}>{state.error}</Alert> : null}
      {state.ok && state.message ? (
        <Alert tone="success" className={feedbackPosition === 'top' ? 'mb-3' : ''}>{state.message}</Alert>
      ) : null}
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

/** Submit button that reports pending state with a spinner. */
export function SubmitButton({
  children, pendingLabel, ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </Button>
  );
}

/**
 * Submit button that names the value it submits, for forms with several
 * outcomes. Only the button that was pressed shows the pending state.
 */
export function SubmitValueButton({
  name, value, children, pendingLabel, ...props
}: ButtonProps & { name: string; value: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name={name} value={value} loading={pending} {...props}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </Button>
  );
}

/** Dims a region while its form is submitting, so stale data reads as stale. */
export function PendingOverlay({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <div className={pending ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
      {children}
    </div>
  );
}
