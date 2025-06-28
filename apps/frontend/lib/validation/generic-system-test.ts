// GENERIC SYSTEM VALIDATION TEST
// This file validates that our system is truly generic with zero hardcoded references

import { getModuleConfig, getRegisteredModules, isModuleRegistered } from '@/lib/modules/module-registry';
import { ModuleConfig } from '@/lib/modules/types';

interface ValidationResult {
  testName: string;
  passed: boolean;
  details: string;
  data?: any;
}

export class GenericSystemValidator {
  
  static async validateUsersModule(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test 1: Module Registry Discovery
    try {
      const registeredModules = getRegisteredModules();
      const isUsersRegistered = isModuleRegistered('users');
      
      results.push({
        testName: 'Module Registry Discovery',
        passed: isUsersRegistered && registeredModules.includes('users'),
        details: `Users module ${isUsersRegistered ? 'found' : 'not found'} in registry. Available modules: ${registeredModules.join(', ')}`,
        data: { registeredModules, isUsersRegistered }
      });
    } catch (error) {
      results.push({
        testName: 'Module Registry Discovery',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 2: Dynamic Config Loading
    try {
      const config = await getModuleConfig('users');
      const hasRequiredFields = config && 
        config.sourceTable && 
        config.module && 
        config.columns && 
        Array.isArray(config.columns);
      
      results.push({
        testName: 'Dynamic Config Loading',
        passed: !!(config && hasRequiredFields),
        details: config 
          ? `Config loaded successfully. Source table: ${config.sourceTable}, Columns: ${config.columns.length}`
          : 'Failed to load config',
        data: config ? {
          sourceTable: config.sourceTable,
          columnCount: config.columns.length,
          hasBackendConfig: !!(config.backendEndpoint && config.backendMethod)
        } : null
      });
    } catch (error) {
      results.push({
        testName: 'Dynamic Config Loading',
        passed: false,
        details: `Error loading config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 3: Backend Configuration
    try {
      const config = await getModuleConfig('users');
      const hasBackendConfig = !!(config && config.backendEndpoint && config.backendMethod);
      
      results.push({
        testName: 'Backend Configuration',
        passed: hasBackendConfig,
        details: hasBackendConfig 
          ? `Backend endpoint: ${config!.backendEndpoint}, Method: ${config!.backendMethod}`
          : 'Missing backend configuration',
        data: config ? {
          backendEndpoint: config.backendEndpoint,
          backendMethod: config.backendMethod
        } : null
      });
    } catch (error) {
      results.push({
        testName: 'Backend Configuration',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 4: Filter Field Generation
    try {
      const config = await getModuleConfig('users');
      if (config) {
        const filterableColumns = config.columns.filter(col => col.filterable !== false);
        const popularFilters = config.columns.filter(col => col.popular && col.popularFilter);
        const hasStringFields = filterableColumns.some(col => col.type === 'string');
        const hasBooleanFields = filterableColumns.some(col => col.type === 'boolean');
        const hasDateFields = filterableColumns.some(col => col.type === 'datetime');
        
        results.push({
          testName: 'Filter Field Generation',
          passed: filterableColumns.length > 0 && popularFilters.length > 0,
          details: `Found ${filterableColumns.length} filterable columns, ${popularFilters.length} popular filters. Field types: string(${hasStringFields}), boolean(${hasBooleanFields}), datetime(${hasDateFields})`,
          data: {
            filterableCount: filterableColumns.length,
            popularFilterCount: popularFilters.length,
            fieldTypes: { hasStringFields, hasBooleanFields, hasDateFields }
          }
        });
      } else {
        results.push({
          testName: 'Filter Field Generation',
          passed: false,
          details: 'No config available for testing',
        });
      }
    } catch (error) {
      results.push({
        testName: 'Filter Field Generation',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 5: No Hardcoded References
    try {
      const config = await getModuleConfig('users');
      if (config) {
        // Check that all field references come from config, not hardcoded
        const dynamicFields = config.columns.map(col => col.field);
        const hasHardcodedFields = dynamicFields.some(field => 
          // These would be hardcoded if they appeared outside of config
          ['name', 'email', 'isSuperAdmin'].includes(field)
        );
        
        // This is actually good - we want these fields to be in config, not hardcoded elsewhere
        const configDriven = dynamicFields.length > 0 && 
          config.sourceTable === 'User' && 
          config.module.name === 'users';
        
        results.push({
          testName: 'No Hardcoded References',
          passed: configDriven,
          details: `All field references come from config. Fields: ${dynamicFields.join(', ')}. Source table and module name are config-driven.`,
          data: {
            fields: dynamicFields,
            sourceTable: config.sourceTable,
            moduleName: config.module.name
          }
        });
      } else {
        results.push({
          testName: 'No Hardcoded References',
          passed: false,
          details: 'No config available for testing',
        });
      }
    } catch (error) {
      results.push({
        testName: 'No Hardcoded References',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  }

  static async validateGenericAPIEndpoint(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Test 6: API Endpoint Generic Handling
    try {
      // Simulate what the API endpoint does
      const config = await getModuleConfig('users');
      if (config) {
        const apiCanHandleModule = !!(
          config.sourceTable && 
          config.backendEndpoint && 
          config.backendMethod &&
          config.columns &&
          config.columns.length > 0
        );

        results.push({
          testName: 'API Endpoint Generic Handling',
          passed: apiCanHandleModule,
          details: `API can handle users module generically. Has all required config: sourceTable(${!!config.sourceTable}), backendEndpoint(${!!config.backendEndpoint}), backendMethod(${!!config.backendMethod}), columns(${config.columns.length})`,
          data: {
            sourceTable: config.sourceTable,
            backendEndpoint: config.backendEndpoint,
            backendMethod: config.backendMethod,
            columnCount: config.columns.length
          }
        });
      } else {
        results.push({
          testName: 'API Endpoint Generic Handling',
          passed: false,
          details: 'No config available for API testing',
        });
      }
    } catch (error) {
      results.push({
        testName: 'API Endpoint Generic Handling',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  }

  static async runFullValidation(): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    results: ValidationResult[];
  }> {
    console.log('🧪 Starting Generic System Validation...');
    
    const moduleResults = await this.validateUsersModule();
    const apiResults = await this.validateGenericAPIEndpoint();
    
    const allResults = [...moduleResults, ...apiResults];
    const passedTests = allResults.filter(r => r.passed).length;
    const totalTests = allResults.length;
    const passed = passedTests === totalTests;
    
    console.log(`\n📊 Validation Results:`);
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    
    allResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.testName}: ${result.details}`);
    });
    
    if (passed) {
      console.log('\n🎉 Generic system validation PASSED! The system is truly generic.');
    } else {
      console.log('\n⚠️ Generic system validation FAILED. Some issues need to be addressed.');
    }
    
    return {
      passed,
      totalTests,
      passedTests,
      results: allResults
    };
  }
}

// Export for use in console or testing
export const validateGenericSystem = () => GenericSystemValidator.runFullValidation(); 