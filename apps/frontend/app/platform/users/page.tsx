'use client';

import { ConfigDrivenModulePage } from '@/lib/modules/ConfigDrivenModulePage';

export default function UsersPage() {
  return (
    <ConfigDrivenModulePage 
      moduleName="users"
      // No config needed - automatically loaded from module registry!
      // The registry will:
      // 1. Load UsersConfig from '@/app/platform/users/users.config'
      // 2. Generate table columns from config
      // 3. Create filters from column definitions
      // 4. Set up actions and behaviors
      // 5. Handle all API calls automatically
    />
  );
} 