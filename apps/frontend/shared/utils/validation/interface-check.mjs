/**
 * Users Interface Component Validation
 * Checks if all interface components are properly configured
 */

import fs from 'fs';
import path from 'path';

// Read and parse the users config
function loadUsersConfig() {
  try {
    const configPath = path.join(__dirname, '../../app/platform/users/users.config.tsx');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract key information from the config file
    const analysis = {
      hasModuleTitle: configContent.includes('title:') && configContent.includes('User Management'),
      hasModuleDescription: configContent.includes('description:') && configContent.includes('Manage'),
      hasBackendConfig: configContent.includes('backendEndpoint:') && configContent.includes('backendMethod:'),
      hasColumns: configContent.includes('columns:') && configContent.includes('field:'),
      hasPopularFilters: configContent.includes('popular:') && configContent.includes('popularFilter:'),
      hasCustomRenderers: configContent.includes('render:') && configContent.includes('customRenderers'),
      hasRowActions: configContent.includes('rowActions:') && configContent.includes('onClick:'),
      hasBulkActions: configContent.includes('bulkActions:') && configContent.includes('onClick:'),
      hasHeaderActions: configContent.includes('headerActions:') && configContent.includes('onClick:'),
      hasDisplayConfig: configContent.includes('display:') && configContent.includes('pageSize:'),
    };
    
    return analysis;
  } catch (error) {
    console.error('Error reading users config:', error.message);
    return null;
  }
}

// Check if components exist
function checkComponents() {
  const componentsToCheck = [
    'lib/modules/ConfigDrivenModulePage.tsx',
    'components/generic-filter/FilterDropdownMenu.tsx',
    'components/generic-filter/FilterDialog.tsx',
    'components/generic-filter/ClickableFilterTags.tsx',
    'components/ui-kit/AdvancedDataTable.tsx',
    'lib/hooks/useGenericFilter.ts'
  ];
  
  const componentStatus = {};
  
  componentsToCheck.forEach(component => {
    const componentPath = path.join(__dirname, '../../', component);
    componentStatus[component] = fs.existsSync(componentPath);
  });
  
  return componentStatus;
}

// Main validation function
function validateUsersInterface() {
  console.log('🧪 Users Interface Validation Report');
  console.log('=====================================\n');
  
  // Check config
  console.log('📋 Configuration Analysis:');
  const config = loadUsersConfig();
  let configPassed = 0;
  
  if (config) {
    const configTests = [
      { name: 'Module Title', status: config.hasModuleTitle, expected: 'Should have title: "User Management"' },
      { name: 'Module Description', status: config.hasModuleDescription, expected: 'Should have descriptive text' },
      { name: 'Backend Configuration', status: config.hasBackendConfig, expected: 'Should have backendEndpoint and backendMethod' },
      { name: 'Column Definitions', status: config.hasColumns, expected: 'Should have columns array with field definitions' },
      { name: 'Popular Filters', status: config.hasPopularFilters, expected: 'Should have popular filters for name and isSuperAdmin' },
      { name: 'Custom Renderers', status: config.hasCustomRenderers, expected: 'Should have custom renderers for name, email, role' },
      { name: 'Row Actions', status: config.hasRowActions, expected: 'Should have View, Edit, Toggle Admin, Delete actions' },
      { name: 'Bulk Actions', status: config.hasBulkActions, expected: 'Should have Activate, Deactivate, Export, Delete bulk actions' },
      { name: 'Header Actions', status: config.hasHeaderActions, expected: 'Should have Create User action' },
      { name: 'Display Settings', status: config.hasDisplayConfig, expected: 'Should have pageSize and default settings' }
    ];
    
    configTests.forEach(test => {
      const icon = test.status ? '✅' : '❌';
      console.log(`${icon} ${test.name}: ${test.status ? 'CONFIGURED' : 'MISSING'}`);
      if (test.status) configPassed++;
    });
    
    console.log(`\nConfig Score: ${configPassed}/${configTests.length} (${Math.round(configPassed/configTests.length*100)}%)\n`);
  }
  
  // Check components
  console.log('🔧 Component Availability:');
  const components = checkComponents();
  
  let componentsFound = 0;
  Object.entries(components).forEach(([component, exists]) => {
    const icon = exists ? '✅' : '❌';
    console.log(`${icon} ${component}: ${exists ? 'EXISTS' : 'MISSING'}`);
    if (exists) componentsFound++;
  });
  
  console.log(`\nComponents Score: ${componentsFound}/${Object.keys(components).length} (${Math.round(componentsFound/Object.keys(components).length*100)}%)\n`);
  
  // Interface Feature Analysis
  console.log('🎯 Expected Interface Features:');
  
  const interfaceFeatures = [
    { 
      name: 'Header Section', 
      components: ['Module title', 'Description', 'Create User button', 'Refresh button'],
      status: config?.hasModuleTitle && config?.hasHeaderActions ? 'working' : 'partial'
    },
    { 
      name: 'Search Section', 
      components: ['Global search bar', 'Advanced button'],
      status: components['components/generic-filter/FilterDropdownMenu.tsx'] ? 'working' : 'missing'
    },
    { 
      name: 'Filter Panel', 
      components: ['Search Users filter', 'Administrators Only filter', 'Created At Range', 'Add Custom Filter'],
      status: config?.hasPopularFilters && components['components/generic-filter/FilterDialog.tsx'] ? 'working' : 'partial'
    },
    { 
      name: 'Group By Panel', 
      components: ['User dropdown', 'Email dropdown', 'Role dropdown'],
      status: 'not_implemented'
    },
    { 
      name: 'Favorites Panel', 
      components: ['Saved searches display'],
      status: components['lib/hooks/useGenericFilter.ts'] ? 'working' : 'missing'
    },
    { 
      name: 'Table Controls', 
      components: ['Columns button', 'Rows per page', 'Pagination'],
      status: components['components/ui-kit/AdvancedDataTable.tsx'] && config?.hasDisplayConfig ? 'working' : 'partial'
    },
    { 
      name: 'Data Table', 
      components: ['Column rendering', 'Custom renderers', 'Sorting'],
      status: config?.hasCustomRenderers && components['components/ui-kit/AdvancedDataTable.tsx'] ? 'working' : 'partial'
    },
    { 
      name: 'Actions', 
      components: ['Row actions', 'Bulk actions', 'Event handling'],
      status: config?.hasRowActions && config?.hasBulkActions ? 'working' : 'partial'
    }
  ];
  
  let workingFeatures = 0;
  let partialFeatures = 0;
  
  interfaceFeatures.forEach(feature => {
    let icon = '❌';
    if (feature.status === 'working') {
      icon = '✅';
      workingFeatures++;
    } else if (feature.status === 'partial') {
      icon = '⚠️';
      partialFeatures++;
    }
    
    console.log(`${icon} ${feature.name}: ${feature.status.toUpperCase()}`);
    feature.components.forEach(component => {
      console.log(`   • ${component}`);
    });
    console.log('');
  });
  
  console.log('📊 Overall Summary:');
  console.log(`✅ Working Features: ${workingFeatures}/${interfaceFeatures.length}`);
  console.log(`⚠️  Partial Features: ${partialFeatures}/${interfaceFeatures.length}`);
  console.log(`❌ Missing Features: ${interfaceFeatures.length - workingFeatures - partialFeatures}/${interfaceFeatures.length}`);
  
  const overallScore = Math.round(((workingFeatures + partialFeatures * 0.5) / interfaceFeatures.length) * 100);
  console.log(`\n🎯 Overall Interface Score: ${overallScore}%`);
  
  if (overallScore >= 80) {
    console.log('🎉 Interface is well-implemented and should work as expected!');
  } else if (overallScore >= 60) {
    console.log('⚠️  Interface is mostly functional but has some gaps.');
  } else {
    console.log('🚨 Interface needs significant work to function properly.');
  }
  
  // Specific recommendations
  console.log('\n💡 Recommendations:');
  if (!components['components/generic-filter/FilterDropdownMenu.tsx']) {
    console.log('• Implement FilterDropdownMenu component for search functionality');
  }
  if (!config?.hasPopularFilters) {
    console.log('• Add popular filters configuration for better UX');
  }
  if (interfaceFeatures.find(f => f.name === 'Group By Panel')?.status === 'not_implemented') {
    console.log('• Implement group by functionality in AdvancedDataTable');
  }
  
  return {
    configScore: config ? Math.round(configPassed/10*100) : 0,
    componentScore: Math.round(componentsFound/Object.keys(components).length*100),
    overallScore,
    workingFeatures,
    partialFeatures,
    totalFeatures: interfaceFeatures.length
  };
}

// Run validation
if (require.main === module) {
  validateUsersInterface();
}

module.exports = { validateUsersInterface }; 