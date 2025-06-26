import { ModuleConfig } from './types';

// Static imports - Next.js can resolve these at build time
const configImports = {
  tenants: () => import('@/app/platform/tenants/tenants.config').then(m => m.TenantsConfig),
  users: () => import('@/app/platform/users/users.config').then(m => m.UsersConfig),
  // Add new modules here with their static imports
  // permissions: () => import('@/app/platform/permissions/permissions.config').then(m => m.PermissionsConfig),
} as const;

// Module registry interface
interface ModuleRegistryEntry {
  name: string;
  title: string;
  description?: string;
}

// Centralized module registry - single place to register all modules
const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  {
    name: 'tenants',
    title: 'Tenants',
    description: 'Manage tenant organizations'
  },
  {
    name: 'users',
    title: 'Users', 
    description: 'Manage system users'
  },
  // Add new modules here - no need to modify API routes
  // {
  //   name: 'permissions',
  //   title: 'Permissions',
  //   description: 'Manage user permissions'
  // },
];

// Cache for loaded configs to avoid repeated imports
const configCache = new Map<string, ModuleConfig>();

/**
 * Get module configuration by name
 * Automatically loads and caches configs
 */
export async function getModuleConfig(moduleName: string): Promise<ModuleConfig | null> {
  // Check cache first
  if (configCache.has(moduleName)) {
    return configCache.get(moduleName) || null;
  }

  // Check if module is registered
  if (!isModuleRegistered(moduleName)) {
    console.warn(`Module "${moduleName}" not found in registry`);
    return null;
  }

  // Get the config import function
  const importFn = configImports[moduleName as keyof typeof configImports];
  if (!importFn) {
    console.error(`No import function found for module "${moduleName}"`);
    return null;
  }

  try {
    // Load the config using static import
    const config = await importFn();
    
    if (!config) {
      console.error(`Config not found for module "${moduleName}"`);
      return null;
    }

    // Validate config structure
    if (!config.module || !config.columns || !Array.isArray(config.columns)) {
      console.error(`Invalid config structure for module "${moduleName}"`);
      return null;
    }

    // Cache the config
    configCache.set(moduleName, config);
    return config;
  } catch (error) {
    console.error(`Failed to load config for module "${moduleName}":`, error);
    return null;
  }
}

/**
 * Get all registered module names
 */
export function getRegisteredModules(): string[] {
  return MODULE_REGISTRY.map(entry => entry.name);
}

/**
 * Check if a module is registered
 */
export function isModuleRegistered(moduleName: string): boolean {
  return MODULE_REGISTRY.some(entry => entry.name === moduleName);
}

/**
 * Get module metadata by name
 */
export function getModuleMetadata(moduleName: string): ModuleRegistryEntry | null {
  return MODULE_REGISTRY.find(entry => entry.name === moduleName) || null;
}

/**
 * Clear config cache (useful for development/testing)
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Get module registry for debugging
 */
export function getModuleRegistry(): ModuleRegistryEntry[] {
  return [...MODULE_REGISTRY];
}

/**
 * Register a new module dynamically (useful for plugins)
 * Note: This only registers metadata, you still need to add the import to configImports
 */
export function registerModule(entry: ModuleRegistryEntry): void {
  const existingIndex = MODULE_REGISTRY.findIndex(e => e.name === entry.name);
  if (existingIndex >= 0) {
    MODULE_REGISTRY[existingIndex] = entry;
  } else {
    MODULE_REGISTRY.push(entry);
  }
  // Clear cache for this module to force reload
  configCache.delete(entry.name);
} 