import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { AppNav } from '@/components/app-nav';
import { logoutAction } from '@/lib/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { humanize, initials } from '@/lib/utils';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-900 text-white">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">SIGNAL</span>
            <span className="hidden text-[10px] uppercase tracking-widest text-navy-300 sm:inline">
              Scored intent &amp; account-level listbuilding
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="border-navy-600 text-navy-100">
              {humanize(user.role)}
            </Badge>
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold"
            >
              {initials(user.name)}
            </span>
            <span className="hidden text-sm sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <Button type="submit" size="sm" variant="ghost" className="text-navy-200 hover:bg-navy-800 hover:text-white">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        <AppNav role={user.role} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
