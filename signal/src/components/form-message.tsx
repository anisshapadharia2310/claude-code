import type { ActionState } from '@/lib/actions/campaign-actions';
import { cn } from '@/lib/utils';

/** Consistent inline feedback for every server action form. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state.error && !state.message) return null;
  return (
    <p
      role={state.error ? 'alert' : 'status'}
      className={cn(
        'rounded border px-2 py-1.5 text-xs',
        state.error
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800',
        className,
      )}
    >
      {state.error ?? state.message}
    </p>
  );
}
