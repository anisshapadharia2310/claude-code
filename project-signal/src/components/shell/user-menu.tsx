import type { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { logoutAction } from '@/server/actions/auth';
import { ROLE_LABELS } from '@/server/auth/rbac';
import { cn } from '@/lib/utils';

const ROLE_TONE: Record<UserRole, string> = {
  ADMIN: 'bg-brand-600',
  MANAGER: 'bg-accent-600',
  RESEARCHER: 'bg-success-600',
  CALLER: 'bg-navy-600',
};

/** Identity and sign-out, at the end of the top bar. */
export function UserMenu({
  name, role,
}: {
  name: string;
  role: UserRole;
}) {
  const parts = name.trim().split(/\s+/);
  const initials = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1]![0] : ''}`.toUpperCase();

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-semibold leading-tight text-navy-800">{name}</p>
        <p className="text-2xs leading-tight text-navy-500">{ROLE_LABELS[role]}</p>
      </div>
      <span
        aria-hidden="true"
        title={`${name} — ${ROLE_LABELS[role]}`}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white ring-2 ring-white',
          ROLE_TONE[role],
        )}
      >
        {initials}
      </span>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="icon-sm" title="Sign out" aria-label="Sign out">
          <Icon name="logout" className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
