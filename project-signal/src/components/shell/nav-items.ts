import type { IconName } from '@/components/ui/icon';
import type { Permission } from '@/server/auth/rbac';

export interface NavItem {
  href: string;
  label: string;
  permission: Permission;
  icon: IconName;
  group: NavGroup;
  /** Shown under the label when the sidebar is expanded. */
  hint: string;
}

export type NavGroup = 'Work' | 'Data' | 'Administration';

export const NAV_GROUPS: NavGroup[] = ['Work', 'Data', 'Administration'];

/**
 * Navigation.
 *
 * Destinations, labels and permissions are unchanged; each entry now names an
 * icon from the shared set and carries a one-line hint used as the collapsed
 * tooltip and the expanded sub-label.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: 'viewDashboard', group: 'Work', icon: 'dashboard', hint: 'Campaign performance and priority mix' },
  { href: '/contacts', label: 'Contacts', permission: 'viewContacts', group: 'Work', icon: 'contacts', hint: 'Scored list with full filtering' },
  { href: '/outreach', label: 'Outreach', permission: 'viewOutreach', group: 'Work', icon: 'outreach', hint: 'Caller queue, scripts and outcomes' },
  { href: '/review', label: 'Review queue', permission: 'reviewContacts', group: 'Work', icon: 'review', hint: 'Records needing a human decision' },
  { href: '/accounts', label: 'Accounts', permission: 'viewAccounts', group: 'Data', icon: 'accounts', hint: 'Company fit and trigger evidence' },
  { href: '/campaigns', label: 'Campaigns', permission: 'viewCampaigns', group: 'Data', icon: 'campaigns', hint: 'Targeting criteria and cost' },
  { href: '/import', label: 'Import', permission: 'importContacts', group: 'Data', icon: 'import', hint: 'Upload and qualify a target list' },
  { href: '/data-quality', label: 'Data quality', permission: 'viewDataQuality', group: 'Data', icon: 'quality', hint: 'Reachability and verification gaps' },
  { href: '/compliance', label: 'Compliance', permission: 'viewCompliance', group: 'Administration', icon: 'compliance', hint: 'Country rules and consent records' },
  { href: '/admin/scoring', label: 'Scoring rules', permission: 'editScoringWeights', group: 'Administration', icon: 'scoring', hint: 'Weights and priority thresholds' },
  { href: '/admin/users', label: 'Users', permission: 'manageUsers', group: 'Administration', icon: 'users', hint: 'Team members and roles' },
];
