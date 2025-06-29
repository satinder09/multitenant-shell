// GENERIC MODULE REGISTRY SYSTEM
// This registry automatically discovers and loads module configurations
// without hardcoding specific module names or imports

import { ModuleConfig } from './types';

// GENERIC APPROACH: Dynamic module loading
// Instead of hardcoding imports, modules self-register by placing their config files
// in the expected location: /app/platform/[moduleName]/[moduleName].config.ts

interface ModuleRegistryEntry {
  name: string;
  title: string;
  description: string;
  configPath?: string; // Optional custom config path
}

// SIMPLIFIED REGISTRY: Only register basic metadata, configs are loaded dynamically
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
  }
  // NEW MODULES: Just add metadata here, no imports needed!
  // {
  //   name: 'permissions',
  //   title: 'Permissions', 
  //   description: 'Manage user permissions'
  // }
];

// GENERIC CONFIG LOADER: Dynamically loads module configs
export async function getModuleConfig(moduleName: string): Promise<ModuleConfig | null> {
  try {
    // GENERIC APPROACH: Load config from conventional path
    const configPath = `@/app/platform/${moduleName}/${moduleName}.config`;
    
    console.log(`🔍 Loading config for module: ${moduleName} from ${configPath}`);
    
    // Dynamic import with error handling
    const configModule = await import(configPath);
    
    // Try different export patterns
    const configExportName = `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Config`;
    const config = configModule[configExportName] || configModule.default || configModule.config;
    
    if (!config) {
      console.warn(`⚠️ No config found for module ${moduleName}. Expected export: ${configExportName}`);
      return null;
    }
    
    console.log(`✅ Successfully loaded config for module: ${moduleName}`);
    return config;
    
  } catch (error) {
    console.warn(`⚠️ Failed to load config for module ${moduleName}:`, error);
    return null;
  }
}

// UTILITY FUNCTIONS
export function getRegisteredModules(): string[] {
  return MODULE_REGISTRY.map(entry => entry.name);
}

export function isModuleRegistered(moduleName: string): boolean {
  return MODULE_REGISTRY.some(entry => entry.name === moduleName);
}

export function getModuleMetadata(moduleName: string): ModuleRegistryEntry | null {
  return MODULE_REGISTRY.find(entry => entry.name === moduleName) || null;
}

export function getAllModuleMetadata(): ModuleRegistryEntry[] {
  return [...MODULE_REGISTRY];
}

// HELPER: Add new modules programmatically (useful for plugins/extensions)
export function registerModule(entry: ModuleRegistryEntry): void {
  if (!isModuleRegistered(entry.name)) {
    MODULE_REGISTRY.push(entry);
    console.log(`📝 Registered new module: ${entry.name}`);
  } else {
    console.warn(`⚠️ Module ${entry.name} already registered`);
  }
} 