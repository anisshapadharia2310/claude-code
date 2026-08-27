/**
 * Role-based access control.
 *
 * One table, used by both the navigation and the route guards, so a link is
 * never shown for a page the user cannot open.
 */
import type { UserRole } from '@prisma/client';

export const ALL_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'RESEARCHER', 'CALLER'];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  RESEARCHER: 'Researcher',
  CALLER: 'Caller',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Manages campaigns, scoring rules, users and compliance settings.',
  MANAGER: 'Views dashboards, approves P1 contacts and exports reports.',
  RESEARCHER: 'Imports and enriches contact data, and works the review queue.',
  CALLER: 'Works assigned contacts, uses the scripts and records outcomes.',
};

/** Capability -> roles allowed. Everything the app gates on lives here. */
export const PERMISSIONS = {
  viewDashboard: ['ADMIN', 'MANAGER', 'RESEARCHER', 'CALLER'],
  viewContacts: ['ADMIN', 'MANAGER', 'RESEARCHER', 'CALLER'],
  viewAccounts: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  viewCampaigns: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  editCampaign: ['ADMIN', 'MANAGER'],
  importContacts: ['ADMIN', 'RESEARCHER'],
  reviewContacts: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  approveP1: ['ADMIN', 'MANAGER'],
  viewOutreach: ['ADMIN', 'MANAGER', 'CALLER'],
  logOutreach: ['ADMIN', 'MANAGER', 'CALLER'],
  viewDataQuality: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  viewCompliance: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  editCompliance: ['ADMIN'],
  exportData: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  bulkUpdate: ['ADMIN', 'MANAGER', 'RESEARCHER'],
  editScoringWeights: ['ADMIN'],
  manageUsers: ['ADMIN'],
  rescore: ['ADMIN', 'MANAGER', 'RESEARCHER'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
