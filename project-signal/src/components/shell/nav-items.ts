import type { Permission } from '@/server/auth/rbac';

export interface NavItem {
  href: string;
  label: string;
  permission: Permission;
  /** Simple inline path data, so the app carries no icon dependency. */
  icon: string;
  group: 'Work' | 'Data' | 'Administration';
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: 'viewDashboard', group: 'Work', icon: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z' },
  { href: '/contacts', label: 'Contacts', permission: 'viewContacts', group: 'Work', icon: 'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-6 1.3-6 4v3h8v-3a5 5 0 0 1 1.4-3.4A11 11 0 0 0 8 14Zm8 0c-3 0-8 1.5-8 4.5V21h16v-2.5C24 15.5 19 14 16 14Z' },
  { href: '/outreach', label: 'Outreach', permission: 'viewOutreach', group: 'Work', icon: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.3 1Z' },
  { href: '/review', label: 'Review queue', permission: 'reviewContacts', group: 'Work', icon: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z' },
  { href: '/accounts', label: 'Accounts', permission: 'viewAccounts', group: 'Data', icon: 'M3 21V7l6-4 6 4v3h6v11h-8v-5h-2v5Zm2-2h4v-3H5Zm0-5h4v-3H5Zm0-5h4V6H5Zm6 10h4v-3h-4Zm0-5h4v-3h-4Zm0-5h4V6h-4Zm6 10h4v-3h-4Zm0-5h4v-3h-4Z' },
  { href: '/campaigns', label: 'Campaigns', permission: 'viewCampaigns', group: 'Data', icon: 'M3 10v4h4l5 5V5L7 10Zm13.5 2A4.5 4.5 0 0 0 14 7.9v8.2a4.5 4.5 0 0 0 2.5-4.1Zm-2.5 9.7a8 8 0 0 0 0-15.4v2.1a6 6 0 0 1 0 11.2Z' },
  { href: '/import', label: 'Import', permission: 'importContacts', group: 'Data', icon: 'M12 3v10.6l3.3-3.3 1.4 1.4L12 17l-4.7-5.3 1.4-1.4L12 13.6ZM4 19h16v2H4Z' },
  { href: '/data-quality', label: 'Data quality', permission: 'viewDataQuality', group: 'Data', icon: 'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5Zm0 4a3 3 0 1 1-3 3 3 3 0 0 1 3-3Zm0 13a7.6 7.6 0 0 1-5-4.7 6.4 6.4 0 0 1 10 0A7.6 7.6 0 0 1 12 19Z' },
  { href: '/compliance', label: 'Compliance', permission: 'viewCompliance', group: 'Administration', icon: 'M12 1 3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5Zm-1 15-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10Z' },
  { href: '/admin/scoring', label: 'Scoring rules', permission: 'editScoringWeights', group: 'Administration', icon: 'M4 21V9h4v12Zm6 0V3h4v18Zm6 0v-8h4v8Z' },
  { href: '/admin/users', label: 'Users', permission: 'manageUsers', group: 'Administration', icon: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-9 2-9 5v3h18v-3c0-3-5-5-9-5Z' },
];
