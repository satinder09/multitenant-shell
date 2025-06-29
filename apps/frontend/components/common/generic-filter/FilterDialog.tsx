'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, ChevronDown } from 'lucide-react';
import { 
  ComplexFilter, 
  ComplexFilterRule, 
  DynamicFieldDiscovery,
  FilterOperator 
} from '@/shared/types/types';
import { ModuleConfig } from '@/shared/modules/types';
import { generateId } from '@/shared/utils/utils';
import { 
  detectFieldType, 
  getOperatorsForFieldType, 
  getDefaultValueForFieldType 
} from '@/shared/utils/filter-field-types';
import { EnhancedValueInput } from './EnhancedValueInputs';
import { NestedFieldSelector } from './NestedFieldSelector';
import { createFilterLabel } from '@/shared/utils/filterUtils';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleName: string;
  fieldDiscovery: DynamicFieldDiscovery | null;
  initialFilter?: ComplexFilter | null;
  onApply: (filter: ComplexFilter | null) => void;
  config?: ModuleConfig;
}

interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  fieldPath: string[];
  fieldType: string;
  label?: string;
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  onOpenChange,
  moduleName,
  fieldDiscovery,
  initialFilter,
  onApply,
  config
}) => {
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState<string | null>(null);

  // Initialize rules from initial filter
  useEffect(() => {
    if (!open) return; // Only initialize when dialog is opened
    
    if (initialFilter?.rootGroup) {
      // Load existing filter for editing
      setLogic(initialFilter.rootGroup.logic);
      setRules(initialFilter.rootGroup.rules.map(rule => ({
        id: rule.id,
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        fieldPath: rule.fieldPath || [],
        fieldType: detectFieldType(rule.field, rule.fieldPath || []),
        label: rule.label
      })));
    } else {
      // Always start fresh with empty rule for new custom filters
      setRules([{
        id: generateId(),
        field: '',
        operator: 'equals' as FilterOperator,
        value: '',
        fieldPath: [],
        fieldType: 'string',
        label: undefined
      }]);
      setLogic('AND');
    }
  }, [open, initialFilter]); // Include initialFilter for proper dependency tracking

  const addRule = () => {
    const newRule: FilterRule = {
      id: generateId(),
      field: '',
      operator: 'equals' as FilterOperator,
      value: '',
      fieldPath: [],
      fieldType: 'string'
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  const handleFieldSelect = (ruleId: string, field: any) => {
    const fieldType = detectFieldType(field.name, field.path);
    const operators = getOperatorsForFieldType(fieldType);
    const defaultValue = getDefaultValueForFieldType(fieldType);
    
    updateRule(ruleId, {
      field: field.name,
      fieldPath: field.path,
      fieldType: fieldType,
      label: field.label,
      operator: operators[0]?.value as FilterOperator || 'equals',
      value: defaultValue
    });
  };

  const handleOperatorChange = (ruleId: string, operator: FilterOperator) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    // For date preset operator, set a default preset value
    if (operator === 'preset' && (rule.fieldType === 'date' || rule.fieldType === 'datetime')) {
      updateRule(ruleId, { 
        operator, 
        value: 'today' 
      });
    } else {
      const defaultValue = getDefaultValueForFieldType(rule.fieldType);
      updateRule(ruleId, { 
        operator, 
        value: defaultValue 
      });
    }
  };

  const getFieldOptions = (fieldPath: string[]) => {
    if (fieldPath.length === 0 || !config) return [];
    
    const fieldName = fieldPath[fieldPath.length - 1];
    
    // Find the field definition in the config
    const fieldDef = config.columns.find(col => col.field === fieldName);
    if (!fieldDef) return [];
    
    // Return static options if available
    if (fieldDef.options && fieldDef.options.length > 0) {
      return fieldDef.options;
    }
    
    // For filterSource, we'll need to load dynamically
    // For now, return empty array - this will be handled by EnhancedValueInput
    if (fieldDef.filterSource) {
      return []; // EnhancedValueInput will handle filterSource loading
    }
    
    // Fallback to hardcoded options for backward compatibility
    switch (fieldName) {
      case 'status':
        return [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'ENDED', label: 'Ended' },
          { value: 'EXPIRED', label: 'Expired' },
          { value: 'REVOKED', label: 'Revoked' }
        ];
      case 'accessType':
        return [
          { value: 'SECURE_LOGIN', label: 'Secure Login' },
          { value: 'IMPERSONATION', label: 'Impersonation' },
          { value: 'DIRECT_ACCESS', label: 'Direct Access' }
        ];
      default:
        return [];
    }
  };

  const handleApply = () => {
    const validRules = rules.filter(rule => rule.field && rule.fieldPath.length > 0);
    
    if (validRules.length === 0) {
      onApply(null);
    } else {
      const filter: ComplexFilter = {
        rootGroup: {
          id: generateId(),
          logic,
          rules: validRules.map(rule => {
            // Get the field display name from config
            const fieldConfig = config?.columns.find(col => col.field === rule.field);
            const fieldDisplayName = fieldConfig?.display || rule.field;
            
            return {
              id: rule.id,
              field: rule.field,
              operator: rule.operator,
              value: rule.value,
              fieldPath: rule.fieldPath,
              label: createFilterLabel(fieldDisplayName, rule.operator, rule.value)
            };
          }),
          groups: []
        }
      };
      onApply(filter);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleClear = () => {
    setRules([{
      id: generateId(),
      field: '',
      operator: 'equals' as FilterOperator,
      value: '',
      fieldPath: [],
      fieldType: 'string'
    }]);
    setLogic('AND');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Filter</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Logic Selector */}
          {rules.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm">Match</span>
              <Select value={logic} onValueChange={(value: 'AND' | 'OR') => setLogic(value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">all</SelectItem>
                  <SelectItem value="OR">any</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm">of the following rules:</span>
            </div>
          )}

          {/* Rules */}
          <div className="space-y-2">
            {rules.map((rule) => {
              const operatorOptions = getOperatorsForFieldType(rule.fieldType);

              return (
                <div key={rule.id} className="flex items-center gap-2 p-2 border rounded">
                  {/* Field Selector */}
                  <Popover 
                    open={fieldSelectorOpen === rule.id} 
                    onOpenChange={(open) => setFieldSelectorOpen(open ? rule.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-48 justify-between h-8"
                        onClick={() => setFieldSelectorOpen(rule.id)}
                      >
                        <span className="truncate">
                          {rule.field && rule.fieldPath.length > 0 ? 
                            (config?.columns.find(col => col.field === rule.field)?.display || rule.field) : 
                            'Select field...'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <NestedFieldSelector
                        key={`${moduleName}-${rule.id}-${fieldSelectorOpen}`} // Force fresh instance
                        moduleName={moduleName}
                        selectedPath={rule.fieldPath}
                        config={config}
                        onFieldSelect={(field) => {
                          handleFieldSelect(rule.id, field);
                          setFieldSelectorOpen(null);
                        }}
                        onClose={() => setFieldSelectorOpen(null)}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Operator Selector */}
                  <Select 
                    value={rule.operator} 
                    onValueChange={(value) => handleOperatorChange(rule.id, value as FilterOperator)}
                    disabled={!rule.field}
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Value Input */}
                  {rule.field && (
                    <div className="flex-1">
                      <EnhancedValueInput
                        fieldName={rule.field}
                        fieldPath={rule.fieldPath}
                        fieldType={rule.fieldType}
                        operator={rule.operator}
                        value={rule.value}
                        onChange={(value) => updateRule(rule.id, { value })}
                        moduleName={moduleName}
                        enumOptions={getFieldOptions(rule.fieldPath)}
                        fieldConfig={config?.columns.find(col => col.field === rule.field)}
                      />
                    </div>
                  )}

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                    className="h-8 w-8 p-0"
                    disabled={rules.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Add Rule Button */}
          <Button variant="outline" onClick={addRule} className="w-full h-8">
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button variant="outline" onClick={handleClear} disabled={rules.length <= 1} size="sm">
              Clear All
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} size="sm">
                Cancel
              </Button>
              <Button onClick={handleApply} size="sm">
                Add Filter
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 