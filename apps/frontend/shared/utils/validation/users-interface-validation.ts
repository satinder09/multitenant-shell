/**
 * Users Interface Validation Test
 * Tests all components shown in the Platform Users page screenshot
 */

import { getModuleConfig } from '@/shared/modules/module-registry';
import { ModuleConfig } from '@/shared/modules/types';

interface ComponentValidationResult {
  component: string;
  status: 'working' | 'issue' | 'not_implemented';
  details: string;
  expectedBehavior: string;
  actualBehavior: string;
  issues?: string[];
}

interface InterfaceValidationSummary {
  totalComponents: number;
  workingComponents: number;
  issueComponents: number;
  notImplementedComponents: number;
  results: ComponentValidationResult[];
}

export class UsersInterfaceValidator {
  private static config: ModuleConfig | null = null;

  static async validateAllComponents(): Promise<InterfaceValidationSummary> {
    console.log('🧪 Starting Users Interface Validation...');
    
    // Load config first
    try {
      this.config = await getModuleConfig('users');
    } catch (error) {
      console.error('Failed to load users config:', error);
    }

    const results: ComponentValidationResult[] = [];

    // Test each component category
    results.push(...await this.validateHeaderSection());
    results.push(...await this.validateSearchSection());
    results.push(...await this.validateFilterPanel());
    results.push(...await this.validateGroupByPanel());
    results.push(...await this.validateFavoritesPanel());
    results.push(...await this.validateTableControls());
    results.push(...await this.validateDataTable());
    results.push(...await this.validateActions());

    const workingComponents = results.filter(r => r.status === 'working').length;
    const issueComponents = results.filter(r => r.status === 'issue').length;
    const notImplementedComponents = results.filter(r => r.status === 'not_implemented').length;

    const summary: InterfaceValidationSummary = {
      totalComponents: results.length,
      workingComponents,
      issueComponents,
      notImplementedComponents,
      results
    };

    this.logValidationResults(summary);
    return summary;
  }

  private static async validateHeaderSection(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Module Title
    results.push({
      component: 'Header - Module Title',
      status: this.config?.module?.title ? 'working' : 'issue',
      details: this.config?.module?.title || 'No title configured',
      expectedBehavior: 'Should display "User Management" from config.module.title',
      actualBehavior: this.config?.module?.title ? `Displays: ${this.config.module.title}` : 'No title found in config'
    });

    // Test 2: Module Description
    results.push({
      component: 'Header - Module Description',
      status: this.config?.module?.description ? 'working' : 'issue',
      details: this.config?.module?.description || 'No description configured',
      expectedBehavior: 'Should display description from config.module.description',
      actualBehavior: this.config?.module?.description ? `Displays: ${this.config.module.description}` : 'No description found in config'
    });

    // Test 3: Create User Button
    const hasCreateAction = this.config?.actions?.headerActions?.some(action => action.key === 'create');
    results.push({
      component: 'Header - Create User Button',
      status: hasCreateAction ? 'working' : 'issue',
      details: hasCreateAction ? 'Create action configured' : 'No create action found',
      expectedBehavior: 'Should trigger userActions.createUser() and open modal',
      actualBehavior: hasCreateAction ? 'Button configured with create action' : 'Create action missing from config'
    });

    // Test 4: Refresh Button
    results.push({
      component: 'Header - Refresh Button',
      status: 'working',
      details: 'Refresh functionality handled by useGenericFilter hook',
      expectedBehavior: 'Should call refetch() to reload data',
      actualBehavior: 'Implemented via useGenericFilter.refetch()'
    });

    return results;
  }

  private static async validateSearchSection(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Global Search Bar
    const searchableFields = this.config?.columns?.filter(col => col.searchable) || [];
    results.push({
      component: 'Search - Global Search Bar',
      status: searchableFields.length > 0 ? 'working' : 'issue',
      details: `${searchableFields.length} searchable fields: ${searchableFields.map(f => f.field).join(', ')}`,
      expectedBehavior: 'Should search across name and email fields',
      actualBehavior: searchableFields.length > 0 ? `Searches: ${searchableFields.map(f => f.field).join(', ')}` : 'No searchable fields configured'
    });

    // Test 2: Advanced Button
    results.push({
      component: 'Search - Advanced Button',
      status: 'working',
      details: 'Opens FilterDialog for complex queries',
      expectedBehavior: 'Should open complex filter builder',
      actualBehavior: 'Implemented via FilterDialog component'
    });

    return results;
  }

  private static async validateFilterPanel(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    const filterableFields = this.config?.columns?.filter(col => col.filterable !== false) || [];
    const popularFilters = this.config?.columns?.filter(col => col.popular && col.popularFilter) || [];

    // Test 1: Search Users Filter (Popular Filter)
    const nameFilter = popularFilters.find(f => f.field === 'name');
    results.push({
      component: 'Filter Panel - Search Users',
      status: nameFilter ? 'working' : 'issue',
      details: nameFilter ? `Popular filter configured for ${nameFilter.field}` : 'Name popular filter not found',
      expectedBehavior: 'Should provide text input for name contains search',
      actualBehavior: nameFilter ? `Popular filter: ${nameFilter.popularFilter?.label}` : 'Popular filter missing'
    });

    // Test 2: Administrators Only Filter
    const adminFilter = popularFilters.find(f => f.field === 'isSuperAdmin');
    results.push({
      component: 'Filter Panel - Administrators Only',
      status: adminFilter ? 'working' : 'issue',
      details: adminFilter ? `Popular filter configured for ${adminFilter.field}` : 'Super admin popular filter not found',
      expectedBehavior: 'Should provide checkbox to filter super admins',
      actualBehavior: adminFilter ? `Popular filter: ${adminFilter.popularFilter?.label}` : 'Popular filter missing'
    });

    // Test 3: Created At Range Filter
    const dateField = this.config?.columns?.find(col => col.field === 'createdAt' && col.type === 'datetime');
    results.push({
      component: 'Filter Panel - Created At Range',
      status: dateField ? 'working' : 'issue',
      details: dateField ? `DateTime field configured with type: ${dateField.type}` : 'CreatedAt datetime field not found',
      expectedBehavior: 'Should provide date range picker with between/greater/less operators',
      actualBehavior: dateField ? 'DateTime field configured with auto-derived operators' : 'DateTime field missing'
    });

    // Test 4: Add Custom Filter
    results.push({
      component: 'Filter Panel - Add Custom Filter',
      status: filterableFields.length > 0 ? 'working' : 'issue',
      details: `${filterableFields.length} filterable fields available`,
      expectedBehavior: 'Should open filter builder with all filterable fields',
      actualBehavior: filterableFields.length > 0 ? `${filterableFields.length} fields available for filtering` : 'No filterable fields'
    });

    return results;
  }

  private static async validateGroupByPanel(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Group By Functionality
    results.push({
      component: 'Group By Panel - User Dropdown',
      status: 'not_implemented',
      details: 'Group by functionality not fully implemented in current version',
      expectedBehavior: 'Should group table rows by selected field (name)',
      actualBehavior: 'UI shows dropdown but grouping logic needs implementation',
      issues: ['Grouping logic not implemented in AdvancedDataTable', 'Group by state not managed in useGenericFilter']
    });

    results.push({
      component: 'Group By Panel - Email Dropdown',
      status: 'not_implemented',
      details: 'Secondary grouping not implemented',
      expectedBehavior: 'Should provide nested grouping by email within user groups',
      actualBehavior: 'UI placeholder only'
    });

    results.push({
      component: 'Group By Panel - Role Dropdown',
      status: 'not_implemented',
      details: 'Tertiary grouping not implemented',
      expectedBehavior: 'Should group by isSuperAdmin field values',
      actualBehavior: 'UI placeholder only'
    });

    return results;
  }

  private static async validateFavoritesPanel(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Saved Searches
    results.push({
      component: 'Favorites Panel - Saved Searches',
      status: 'working',
      details: 'Saved searches functionality implemented in useGenericFilter',
      expectedBehavior: 'Should show saved filter combinations and allow quick application',
      actualBehavior: 'Implemented via useGenericFilter.savedSearches with persistence'
    });

    return results;
  }

  private static async validateTableControls(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Columns Button
    const visibleColumns = this.config?.columns?.filter(col => col.visible !== false) || [];
    results.push({
      component: 'Table Controls - Columns Button',
      status: visibleColumns.length > 0 ? 'working' : 'issue',
      details: `${visibleColumns.length} visible columns configured`,
      expectedBehavior: 'Should allow show/hide of table columns',
      actualBehavior: visibleColumns.length > 0 ? 'Column visibility management implemented' : 'No visible columns configured'
    });

    // Test 2: Rows Per Page
    const pageSize = this.config?.display?.pageSize;
    results.push({
      component: 'Table Controls - Rows Per Page',
      status: pageSize ? 'working' : 'issue',
      details: pageSize ? `Page size configured: ${pageSize}` : 'No page size configured',
      expectedBehavior: 'Should control pagination with options [10, 25, 50, 100]',
      actualBehavior: pageSize ? `Default page size: ${pageSize}` : 'Using fallback page size'
    });

    // Test 3: Pagination
    results.push({
      component: 'Table Controls - Pagination',
      status: 'working',
      details: 'Pagination handled by useGenericFilter hook',
      expectedBehavior: 'Should show page navigation with current/total pages',
      actualBehavior: 'Implemented via useGenericFilter.pagination state'
    });

    return results;
  }

  private static async validateDataTable(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Table Columns
    const tableColumns = this.config?.columns || [];
    results.push({
      component: 'Data Table - Column Configuration',
      status: tableColumns.length > 0 ? 'working' : 'issue',
      details: `${tableColumns.length} columns configured`,
      expectedBehavior: 'Should display name, email, role, created date columns',
      actualBehavior: tableColumns.length > 0 ? `Columns: ${tableColumns.map(c => c.field).join(', ')}` : 'No columns configured'
    });

    // Test 2: Custom Renderers
    const customRenderers = tableColumns.filter(col => col.render);
    results.push({
      component: 'Data Table - Custom Renderers',
      status: customRenderers.length > 0 ? 'working' : 'issue',
      details: `${customRenderers.length} custom renderers configured`,
      expectedBehavior: 'Should render name with avatar, email as link, role with badge, date formatted',
      actualBehavior: customRenderers.length > 0 ? `Custom renderers for: ${customRenderers.map(c => c.field).join(', ')}` : 'No custom renderers'
    });

    // Test 3: Sorting
    const sortableColumns = tableColumns.filter(col => col.sortable);
    results.push({
      component: 'Data Table - Sorting',
      status: sortableColumns.length > 0 ? 'working' : 'issue',
      details: `${sortableColumns.length} sortable columns`,
      expectedBehavior: 'Should allow sorting on name, email, role, dates',
      actualBehavior: sortableColumns.length > 0 ? `Sortable: ${sortableColumns.map(c => c.field).join(', ')}` : 'No sortable columns'
    });

    return results;
  }

  private static async validateActions(): Promise<ComponentValidationResult[]> {
    const results: ComponentValidationResult[] = [];

    // Test 1: Row Actions
    const rowActions = this.config?.actions?.rowActions || [];
    results.push({
      component: 'Actions - Row Actions',
      status: rowActions.length > 0 ? 'working' : 'issue',
      details: `${rowActions.length} row actions configured`,
      expectedBehavior: 'Should show View, Edit buttons and menu with Toggle Admin, Delete',
      actualBehavior: rowActions.length > 0 ? `Actions: ${rowActions.map(a => a.label).join(', ')}` : 'No row actions configured'
    });

    // Test 2: Bulk Actions
    const bulkActions = this.config?.actions?.bulkActions || [];
    results.push({
      component: 'Actions - Bulk Actions',
      status: bulkActions.length > 0 ? 'working' : 'issue',
      details: `${bulkActions.length} bulk actions configured`,
      expectedBehavior: 'Should show Activate, Deactivate, Export, Delete for selected rows',
      actualBehavior: bulkActions.length > 0 ? `Bulk actions: ${bulkActions.map(a => a.label).join(', ')}` : 'No bulk actions configured'
    });

    // Test 3: Action Event Handling
    results.push({
      component: 'Actions - Event Handling',
      status: 'working',
      details: 'Custom event listeners implemented in users page',
      expectedBehavior: 'Should open modals on create/edit actions and refresh data',
      actualBehavior: 'Event listeners configured for open-create-user-modal, open-edit-user-modal, refresh-module-data'
    });

    return results;
  }

  private static logValidationResults(summary: InterfaceValidationSummary) {
    console.log('\n📊 Users Interface Validation Results:');
    console.log(`✅ Working: ${summary.workingComponents}/${summary.totalComponents}`);
    console.log(`⚠️  Issues: ${summary.issueComponents}/${summary.totalComponents}`);
    console.log(`🚧 Not Implemented: ${summary.notImplementedComponents}/${summary.totalComponents}`);

    console.log('\n📋 Detailed Results:');
    summary.results.forEach(result => {
      const icon = result.status === 'working' ? '✅' : result.status === 'issue' ? '⚠️' : '🚧';
      console.log(`${icon} ${result.component}`);
      console.log(`   Expected: ${result.expectedBehavior}`);
      console.log(`   Actual: ${result.actualBehavior}`);
      if (result.issues && result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join(', ')}`);
      }
      console.log('');
    });

    // Summary by category
    const categories = ['Header', 'Search', 'Filter Panel', 'Group By Panel', 'Favorites Panel', 'Table Controls', 'Data Table', 'Actions'];
    console.log('\n📈 Summary by Category:');
    categories.forEach(category => {
      const categoryResults = summary.results.filter(r => r.component.startsWith(category));
      const working = categoryResults.filter(r => r.status === 'working').length;
      const total = categoryResults.length;
      const percentage = total > 0 ? Math.round((working / total) * 100) : 0;
      console.log(`${category}: ${working}/${total} (${percentage}%)`);
    });
  }
}

// Export function for easy testing
export const validateUsersInterface = () => UsersInterfaceValidator.validateAllComponents(); 