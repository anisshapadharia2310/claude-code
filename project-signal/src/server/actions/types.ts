export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const EMPTY_ACTION_STATE: ActionState = {};

/** Turn a Zod error into the flat field-error map the forms render. */
export function fieldErrorsFrom(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_');
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
