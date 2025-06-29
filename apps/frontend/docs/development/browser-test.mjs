/**
 * Browser-side validation test for Users Interface
 * Run this in the browser console on the Platform Users page
 */

function validateUsersInterfaceInBrowser() {
  console.log('🧪 Browser-side Users Interface Validation');
  console.log('==========================================\n');
  
  const results = [];
  
  // Test 1: Header Section
  const headerTitle = document.querySelector('h1, h2, h3, h4, h5, h6');
  const createButton = document.querySelector('button[data-testid="create-user"], button:contains("Create User"), button:contains("Create")');
  
  results.push({
    component: 'Header - Title',
    status: headerTitle && headerTitle.textContent.includes('User') ? 'working' : 'issue',
    element: headerTitle,
    details: headerTitle ? `Found: "${headerTitle.textContent}"` : 'Header title not found'
  });
  
  // Test 2: Search Section
  const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="Search"]');
  const advancedButton = document.querySelector('button:contains("Advanced"), button[data-testid="advanced-filter"]');
  
  results.push({
    component: 'Search - Input',
    status: searchInput ? 'working' : 'issue',
    element: searchInput,
    details: searchInput ? `Placeholder: "${searchInput.placeholder}"` : 'Search input not found'
  });
  
  // Test 3: Filter Panel
  const filterPanel = document.querySelector('[data-testid="filter-panel"], .filter-panel, .filters');
  const filterButtons = document.querySelectorAll('button[data-testid*="filter"], .filter-button');
  
  results.push({
    component: 'Filter Panel',
    status: filterPanel || filterButtons.length > 0 ? 'working' : 'issue',
    element: filterPanel,
    details: `Found ${filterButtons.length} filter controls`
  });
  
  // Test 4: Data Table
  const dataTable = document.querySelector('table, [role="table"], .data-table');
  const tableHeaders = document.querySelectorAll('th, [role="columnheader"]');
  const tableRows = document.querySelectorAll('tr[data-testid*="row"], tbody tr, [role="row"]');
  
  results.push({
    component: 'Data Table',
    status: dataTable && tableHeaders.length > 0 ? 'working' : 'issue',
    element: dataTable,
    details: `Found table with ${tableHeaders.length} headers and ${tableRows.length} rows`
  });
  
  // Test 5: Pagination
  const pagination = document.querySelector('.pagination, [data-testid="pagination"]');
  const pageButtons = document.querySelectorAll('button[data-testid*="page"], .page-button');
  
  results.push({
    component: 'Pagination',
    status: pagination || pageButtons.length > 0 ? 'working' : 'issue',
    element: pagination,
    details: `Found ${pageButtons.length} pagination controls`
  });
  
  // Test 6: Action Buttons
  const actionButtons = document.querySelectorAll('button[data-testid*="action"], .action-button');
  const rowActions = document.querySelectorAll('[data-testid*="row-action"], .row-action');
  
  results.push({
    component: 'Actions',
    status: actionButtons.length > 0 || rowActions.length > 0 ? 'working' : 'issue',
    element: actionButtons[0],
    details: `Found ${actionButtons.length} action buttons and ${rowActions.length} row actions`
  });
  
  // Test 7: Check for React components
  const reactRoot = document.querySelector('#__next, [data-reactroot]');
  const hasReactComponents = window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  
  results.push({
    component: 'React Framework',
    status: reactRoot && hasReactComponents ? 'working' : 'issue',
    element: reactRoot,
    details: hasReactComponents ? 'React detected and components mounted' : 'React not detected'
  });
  
  // Display results
  console.log('📊 Browser Validation Results:');
  let workingCount = 0;
  
  results.forEach(result => {
    const icon = result.status === 'working' ? '✅' : '❌';
    console.log(`${icon} ${result.component}: ${result.status.toUpperCase()}`);
    console.log(`   Details: ${result.details}`);
    if (result.element) {
      console.log('   Element:', result.element);
    }
    console.log('');
    
    if (result.status === 'working') workingCount++;
  });
  
  const percentage = Math.round((workingCount / results.length) * 100);
  console.log(`🎯 Browser Validation Score: ${workingCount}/${results.length} (${percentage}%)`);
  
  if (percentage >= 80) {
    console.log('🎉 Interface is rendering correctly in the browser!');
  } else if (percentage >= 60) {
    console.log('⚠️  Interface is mostly working but has some rendering issues.');
  } else {
    console.log('🚨 Interface has significant rendering problems.');
  }
  
  // Additional checks
  console.log('\n🔍 Additional Checks:');
  
  // Check for console errors
  const hasConsoleErrors = window.console && window.console.error;
  console.log(`Console errors: ${hasConsoleErrors ? 'Available for checking' : 'Not available'}`);
  
  // Check for loading states
  const loadingElements = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner');
  console.log(`Loading indicators: ${loadingElements.length} found`);
  
  // Check for error states
  const errorElements = document.querySelectorAll('[data-testid*="error"], .error, .alert-error');
  console.log(`Error indicators: ${errorElements.length} found`);
  
  return {
    results,
    score: percentage,
    workingComponents: workingCount,
    totalComponents: results.length
  };
}

// Instructions for use
console.log('📋 To run this validation:');
console.log('1. Navigate to the Platform Users page');
console.log('2. Open browser developer tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Run: validateUsersInterfaceInBrowser()');
console.log('');

// Auto-run if we detect we're on the users page
if (typeof window !== 'undefined' && window.location.pathname.includes('/platform/users')) {
  console.log('🚀 Auto-running validation on Platform Users page...');
  setTimeout(() => validateUsersInterfaceInBrowser(), 1000);
} 