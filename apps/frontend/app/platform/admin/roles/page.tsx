'use client';

import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { RoleModalManager } from '@/components/features/role-management/RoleModalManager';
import { RolesConfig } from './roles.config';

export default function PlatformRolesPage() {
  return (
    <>
      <ConfigDrivenModulePage 
        moduleName="roles"
        config={RolesConfig}
      />
      <RoleModalManager />
    </>
  );
} 