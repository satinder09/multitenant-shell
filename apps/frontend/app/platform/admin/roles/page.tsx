'use client';

import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { RolesConfig } from './roles.config';

export default function PlatformRolesPage() {
  return (
    <ConfigDrivenModulePage 
      moduleName="roles"
      config={RolesConfig}
    />
  );
} 