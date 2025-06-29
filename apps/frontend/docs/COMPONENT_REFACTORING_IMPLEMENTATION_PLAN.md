# Component Refactoring Implementation Plan - Zero-Breakage Sequence

## Current Usage Analysis (Based on Actual Codebase Scan)

### Critical Components (Used in app/layout.tsx)
- **ConditionalLayoutWrapper.tsx**: Used in `app/layout.tsx` 🚨 HIGH RISK
- **GlobalErrorBoundary.tsx**: Used in `app/layout.tsx` 🚨 HIGH RISK

### Data Table Components  
- **DataTable.tsx**: Used in `app/platform/admin/roles/page.tsx`
- **AdvancedDataTable.tsx**: Used in `shared/modules/ConfigDrivenModulePage.tsx`

### Multi-Select Components
- **MultiSelect.tsx**: ⚠️ NOT USED - Safe to remove
- **ComboBoxTags.tsx**: Used in 2 files (platform & tenant admin roles)

### Navigation Duplicates
- **UserNav (common)**: Used in Header.tsx and TopBar.tsx
- **UserNav (domain)**: More complete, not directly imported
- **ProtectedRoute (common)**: Used in `app/login/page.tsx`
- **ProtectedRoute (domain)**: More complete, not directly imported

### Filter Components
- **PopularFilterComponents.tsx**: Used in FilterDropdownMenu.tsx
- **EnhancedValueInputs.tsx**: Used in FilterDialog.tsx
- **ClickableFilterTags.tsx**: Used in ConfigDrivenModulePage.tsx

## SAFE IMPLEMENTATION SEQUENCE

### PHASE 1: Safe Removals (ZERO RISK)
**No dependencies - Can't break anything**

#### 1.1 Remove Unused MultiSelect
```bash
rm apps/frontend/components/composite/MultiSelect.tsx
```
**Files to update**: None (not imported anywhere)

#### 1.2 Check and Remove TopBar (if unused)
- Verify TopBar isn't directly imported
- Remove if confirmed unused

### PHASE 2: Duplicate Consolidation (LOW RISK)
**Simple import updates - Easy rollback**

#### 2.1 Consolidate UserNav (2 import updates)
1. Update imports in Header.tsx and TopBar.tsx:
   ```typescript
   // FROM: '@/components/common/UserNav'
   // TO:   '@/domains/auth/components/UserNav'
   ```
2. Remove: `apps/frontend/components/common/UserNav.tsx`

#### 2.2 Consolidate ProtectedRoute (1 import update)
1. Update import in `app/login/page.tsx`:
   ```typescript
   // FROM: '@/components/common/ProtectedRoute'  
   // TO:   '@/domains/auth/components/ProtectedRoute'
   ```
2. Remove: `apps/frontend/components/common/ProtectedRoute.tsx`

### PHASE 3: Component Renames (MEDIUM RISK)
**Multiple files affected - Requires testing**

#### 3.1 Rename Filter Components
1. **PopularFilterComponents → FilterPresets**
   - Rename file
   - Update import in FilterDropdownMenu.tsx

2. **EnhancedValueInputs → DynamicInputs**  
   - Rename file
   - Update import in FilterDialog.tsx

3. **ClickableFilterTags → FilterTags**
   - Rename file
   - Update import in ConfigDrivenModulePage.tsx

### PHASE 4: Critical Layout Renames (HIGH RISK)
**⚠️ AFFECTS APP ROOT - BACKUP REQUIRED**

#### 4.1 Backup Critical Files
```bash
cp apps/frontend/app/layout.tsx apps/frontend/app/layout.tsx.backup
```

#### 4.2 Rename Layout Components
1. **ConditionalLayoutWrapper → ConditionalLayout**
   - Rename file
   - Update import in app/layout.tsx

2. **GlobalErrorBoundary → ErrorBoundary**
   - Rename file  
   - Update import in app/layout.tsx

### PHASE 5: DataTable Consolidation (COMPLEX)
**Requires component analysis - Most complex change**

#### 5.1 Analyze Components First
- Compare DataTable vs AdvancedDataTable features
- Identify unique props and functionality
- Plan consolidation strategy

#### 5.2 Create Unified Component
- Merge functionality
- Maintain backward compatibility
- Update 2 import locations

## VERIFICATION CHECKLIST (After Each Phase)

### ✅ TypeScript Check
```bash
npm run type-check
```

### ✅ Build Verification
```bash
npm run build
```

### ✅ Import Scan
```bash
# Check for broken imports
grep -r "MultiSelect\|TopBar\|UserNav\|ProtectedRoute" apps/frontend/
```

### ✅ Runtime Testing
- Login functionality (ProtectedRoute)
- Admin pages (DataTable usage)
- App layout (Critical changes)

## ROLLBACK STRATEGY

### Git Rollback (Complete)
```bash
git stash
git checkout HEAD -- apps/frontend/
```

### Selective Rollback
```bash
git checkout HEAD -- apps/frontend/app/layout.tsx
```

## EXECUTION ORDER SUMMARY

1. **Phase 1** (5 min): Remove unused MultiSelect
2. **Phase 2** (15 min): Consolidate duplicates  
3. **Phase 3** (30 min): Rename filter components
4. **Phase 4** (20 min): Rename layout components ⚠️
5. **Phase 5** (2 hours): DataTable consolidation

**Total**: ~3 hours with testing

## RISK LEVELS
- **Phases 1-2**: ZERO to LOW risk
- **Phase 3**: MEDIUM risk  
- **Phase 4**: HIGH risk (app layout)
- **Phase 5**: COMPLEX (requires analysis)

Ready to proceed with Phase 1? 