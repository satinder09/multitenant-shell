# Safe Component Refactoring Sequence

## Dependency Analysis Results

**CRITICAL FINDINGS** (Used in app/layout.tsx):
- `ConditionalLayoutWrapper.tsx` → HIGH RISK changes
- `GlobalErrorBoundary.tsx` → HIGH RISK changes

**SAFE REMOVALS** (Not imported):
- `MultiSelect.tsx` → Can remove safely
- `TopBar.tsx` → Likely unused

**ACTIVE COMPONENTS** (Need careful handling):
- `DataTable` → Used in platform admin roles
- `AdvancedDataTable` → Used in ConfigDrivenModulePage  
- `ComboBoxTags` → Used in 2 admin pages
- `UserNav (common)` → Used in Header/TopBar
- `ProtectedRoute (common)` → Used in login page

## ZERO-BREAKAGE SEQUENCE

### PHASE 1: SAFE REMOVALS ✅
**Risk: ZERO - No dependencies**

1. Remove unused MultiSelect.tsx
2. Verify and remove TopBar.tsx if unused

### PHASE 2: SIMPLE CONSOLIDATIONS ✅  
**Risk: LOW - Single import updates**

1. Consolidate UserNav duplicates (2 imports)
2. Consolidate ProtectedRoute duplicates (1 import)

### PHASE 3: RENAME OPERATIONS ⚠️
**Risk: MEDIUM - Multiple imports**

1. Filter component renames (3 components, 3 imports)
2. Test filter functionality

### PHASE 4: CRITICAL LAYOUT CHANGES 🚨
**Risk: HIGH - App root affected**

1. **BACKUP FIRST**: app/layout.tsx
2. Rename ConditionalLayoutWrapper
3. Rename GlobalErrorBoundary  
4. **IMMEDIATE TESTING**: App must load

### PHASE 5: COMPLEX CONSOLIDATION 🔬
**Risk: COMPLEX - Requires analysis**

1. Analyze DataTable vs AdvancedDataTable
2. Plan consolidation approach
3. Implement unified component

## EXECUTION COMMANDS

Ready to start with Phase 1 safe removals? 