/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { type Me } from "@/types/contract";
import { type UserDataUpdate, type AuthState } from "@/auth/authTypes";
import { type UUID } from "@/core";

// Used by the app
export function selectOrganizations(
  organizationMemberships: Me["organization_memberships"]
): AuthState["organizations"] {
  if (organizationMemberships == null) {
    return [];
  }

  return organizationMemberships.map(
    ({
      organization,
      organization_name,
      control_room,
      role,
      scope,
      is_deployment_manager,
      has_compliance_auth_token,
    }) => ({
      id: organization,
      name: organization_name,
      control_room,
      role,
      scope,
      isDeploymentManager: is_deployment_manager,
      hasComplianceAuthToken: has_compliance_auth_token,
    })
  );
}

export function selectUserDataUpdate({
  email,
  organization,
  telemetry_organization: telemetryOrganization,
  organization_memberships: organizationMemberships = [],
  group_memberships = [],
  flags = [],
  partner,
  enforce_update_millis: enforceUpdateMillis,
  partner_principals: partnerPrincipals = [],
}: Me): UserDataUpdate {
  const organizations = selectOrganizations(organizationMemberships);
  const groups = group_memberships.map(({ id, name }) => ({ id, name }));

  return {
    email,
    organizationId: organization?.id,
    telemetryOrganizationId: telemetryOrganization?.id,
    flags,
    organizations,
    groups,
    partner,
    enforceUpdateMillis,
    partnerPrincipals,
  };
}

export function selectExtensionAuthState({
  id,
  email,
  scope,
  organization,
  is_onboarded: isOnboarded,
  test_account: isTestAccount,
  flags = [],
  milestones = [],
  organization_memberships: organizationMemberships = [],
  group_memberships = [],
  partner,
  enforce_update_millis: enforceUpdateMillis,
}: Me): AuthState {
  const organizations = selectOrganizations(organizationMemberships);
  const groups = group_memberships.map(({ id, name }) => ({ id, name }));

  return {
    userId: id as UUID,
    email,
    scope,
    isLoggedIn: true,
    isOnboarded,
    isTestAccount,
    extension: true,
    organization,
    organizations,
    groups,
    flags,
    milestones,
    partner,
    enforceUpdateMillis,
  };
}
