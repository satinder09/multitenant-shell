// GENERIC MODULE REGISTRY SYSTEM
// This registry provides a completely generic system for module registration and loading
// No hardcoded module names, paths, or configurations - everything is self-registered

import { ModuleConfig } from './types';

// ZERO-CONFIGURATION APPROACH: Complete self-registration
// Modules register themselves by calling registerModule() with their imported config
// No manual registry updates needed - completely dynamic and self-contained

interface ModuleRegistryEntry {
  name: string;
  title: string;
  description: string;
}

// ZERO-CONFIG REGISTRY: Modules register themselves with imported configs
const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  // 🚀 ALL MODULES: Self-register with imported config!
  // Call registerModule({ name, title, description, config: ImportedConfig })
];

// IN-MEMORY CONFIG STORAGE
// Modules provide their config directly when they register
const CONFIG_CACHE: Map<string, ModuleConfig> = new Map();

// STORE CONFIG: Called during module registration to cache the config
export function storeModuleConfig(moduleName: string, config: ModuleConfig): void {
  CONFIG_CACHE.set(moduleName, config);
}

// GET CONFIG: Retrieves config from memory cache (no dynamic imports needed)
export async function getModuleConfig(moduleName: string): Promise<ModuleConfig | null> {
  const config = CONFIG_CACHE.get(moduleName);
  if (config) {
    return config;
  }
  
  // Note: This is expected during SSR/API calls before client-side registration
  return null;
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

// 🚀 SELF-REGISTRATION API
// Call this from your page/config to auto-register your module

interface ModuleRegistration {
  name: string;
  title: string;
  description: string;
  config: ModuleConfig; // Provide config directly - no dynamic imports needed!
}

// Legacy: No longer needed since configs are provided directly

/**
 * 🚀 Register a module with config provided directly
 * Call this from your page component with the imported config
 */
export function registerModule(registration: ModuleRegistration): void {
  const { name, title, description, config } = registration;
  
  // Register module metadata
  if (!isModuleRegistered(name)) {
    MODULE_REGISTRY.push({ name, title, description });
  }
  
  // Store the config directly in memory
  storeModuleConfig(name, config);
}

// Legacy function - no longer needed with new approach 