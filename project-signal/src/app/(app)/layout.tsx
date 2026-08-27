import Link from 'next/link';
import { CampaignSwitcher } from '@/components/shell/campaign-switcher';
import { MobileNav } from '@/components/shell/mobile-nav';
import { NAV_ITEMS } from '@/components/shell/nav-items';
import { Sidebar } from '@/components/shell/sidebar';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/server/actions/auth';
import { requireUser } from '@/server/auth/guards';
import { ROLE_LABELS, can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import { initials } from '@/lib/utils';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const repo = await getRepository();
  const [campaigns, selected] = await Promise.all([repo.listCampaigns(), getSelectedCampaign()]);
  const items = NAV_ITEMS.filter((item) => can(user.role, item.permission));

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 lg:flex">
        <Link href="/" className="flex items-baseline gap-2 px-5 py-5">
          <span className="text-lg font-semibold tracking-tight text-white">SIGNAL</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-brand-300">Project</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <Sidebar items={items} />
        </div>
        <div className="border-t border-navy-800 px-5 py-4">
          <p className="text-[10px] leading-relaxed text-navy-400">
            Scored Intent and Granular Account-Level Listbuilding
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur lg:px-6">
          <MobileNav items={items} />
          <span className="text-sm font-semibold text-navy-900 lg:hidden">SIGNAL</span>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-xs font-medium uppercase tracking-wide text-navy-400">Campaign</span>
            <CampaignSwitcher campaigns={campaigns} selectedId={selected?.id ?? null} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-navy-800">{user.name}</p>
              <p className="text-[11px] text-navy-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
            >
              {initials(user.name.split(' ')[0] ?? 'U', user.name.split(' ')[1] ?? user.name.slice(1, 2))}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          </div>

          <div className="flex w-full items-center gap-2 lg:hidden">
            <span className="text-xs font-medium uppercase tracking-wide text-navy-400">Campaign</span>
            <CampaignSwitcher campaigns={campaigns} selectedId={selected?.id ?? null} />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
