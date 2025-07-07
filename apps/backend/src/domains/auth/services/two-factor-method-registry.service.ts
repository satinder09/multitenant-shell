/**
 * 🔐 TWO-FACTOR METHOD REGISTRY SERVICE
 * 
 * Central registry for managing different 2FA method providers
 * Supports pluggable architecture for adding new methods
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TwoFactorMethodProvider,
  TwoFactorMethodRegistry,
  TwoFactorError,
  TwoFactorErrorCode,
} from '../types/two-factor-auth.types';

@Injectable()
export class TwoFactorMethodRegistryService implements TwoFactorMethodRegistry {
  private readonly logger = new Logger(TwoFactorMethodRegistryService.name);
  private readonly providers = new Map<'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN', TwoFactorMethodProvider>();

  constructor() {
    this.logger.log('Two-Factor Method Registry initialized');
  }

  /**
   * Register a 2FA method provider
   */
  registerProvider(provider: TwoFactorMethodProvider): void {
    this.providers.set(provider.methodType, provider);
    this.logger.log(`Registered 2FA provider: ${provider.methodType}`);
  }

  /**
   * Get a specific 2FA method provider
   */
  getProvider(methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN'): TwoFactorMethodProvider {
    const provider = this.providers.get(methodType);
    if (!provider) {
      throw new TwoFactorError(
        `2FA method not supported: ${methodType}`,
        TwoFactorErrorCode.METHOD_NOT_SUPPORTED,
        methodType
      );
    }
    return provider;
  }

  /**
   * Get all available 2FA methods
   */
  getAvailableMethods(): ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a method is supported
   */
  isMethodSupported(methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN'): boolean {
    return this.providers.has(methodType);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalProviders: number;
    enabledMethods: ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[];
    supportedFeatures: Record<'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN', string[]>;
  } {
    const stats = {
      totalProviders: this.providers.size,
      enabledMethods: this.getAvailableMethods(),
      supportedFeatures: {} as Record<'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN', string[]>,
    };

    for (const [methodType, provider] of this.providers) {
      stats.supportedFeatures[methodType] = provider.supportedFeatures.map(f => f.toString());
    }

    return stats;
  }

  /**
   * Validate that required methods are available
   */
  validateRequiredMethods(requiredMethods: ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[]): void {
    const missing = requiredMethods.filter(method => !this.isMethodSupported(method));
    
    if (missing.length > 0) {
      throw new TwoFactorError(
        `Required 2FA methods not available: ${missing.join(', ')}`,
        TwoFactorErrorCode.METHOD_NOT_SUPPORTED
      );
    }
  }

  /**
   * Initialize default providers
   * This will be called during module initialization
   */
  async initializeDefaultProviders(): Promise<void> {
    this.logger.log('Initializing default 2FA providers...');
    
    // Note: Actual provider instances will be injected and registered
    // This method serves as a placeholder for future automatic registration
    
    this.logger.log(`2FA Registry ready with ${this.providers.size} providers`);
  }
} 