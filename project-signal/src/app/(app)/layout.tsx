import { CampaignSwitcher } from '@/components/shell/campaign-switcher';
import { MobileNav } from '@/components/shell/mobile-nav';
import { NAV_ITEMS } from '@/components/shell/nav-items';
import { Sidebar } from '@/components/shell/sidebar';
import { UserMenu } from '@/components/shell/user-menu';
import { SignalMark } from '@/components/ui/icon';
import { requireUser } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';

/**
 * The application shell.
 *
 * A midnight navigation rail, a light analytical canvas, and a sticky top bar
 * that always states which campaign the screens below are scoped to. The rail
 * collapses to icons on desktop and becomes a drawer below the large
 * breakpoint; every destination stays reachable at every width.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const repo = await getRepository();
  const [campaigns, selected] = await Promise.all([repo.listCampaigns(), getSelectedCampaign()]);
  const items = NAV_ITEMS.filter((item) => can(user.role, item.permission));

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar
        items={items}
        footer={
          <p className="rounded-lg bg-white/5 px-3 py-2.5 text-[10px] leading-relaxed text-navy-400">
            Scored Intent and Granular
            <br />
            Account-Level Listbuilding
          </p>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-2.5 lg:px-6">
            <MobileNav items={items} />

            <span className="flex items-center gap-2 lg:hidden">
              <SignalMark className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-[-0.01em] text-navy-900">SIGNAL</span>
            </span>

            <div className="hidden min-w-0 items-center gap-3 lg:flex">
              <span className="eyebrow shrink-0">Campaign</span>
              <div className="w-72 max-w-full">
                <CampaignSwitcher campaigns={campaigns} selectedId={selected?.id ?? null} />
              </div>
            </div>

            <div className="ml-auto shrink-0">
              <UserMenu name={user.name} role={user.role} />
            </div>
          </div>

          {/* The campaign context moves below the bar on narrow screens, where
              there is no room for it beside the identity block. */}
          <div className="border-t border-line px-4 py-2 lg:hidden">
            <CampaignSwitcher campaigns={campaigns} selectedId={selected?.id ?? null} />
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
