'use client';

import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { registerModule } from '@/shared/modules/module-registry';
import { RoleModalManager } from '@/components/features/role-management/RoleModalManager';
import { RolesConfig } from './roles.config';

// 🚀 EARLY REGISTRATION: Register BEFORE component definition
registerModule({
  name: 'roles',
  title: 'Platform Roles',
  description: 'Manage platform-level roles and permissions',
  config: RolesConfig
});

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