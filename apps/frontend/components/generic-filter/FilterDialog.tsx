'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, ChevronDown } from 'lucide-react';
import { 
  ComplexFilter, 
  ComplexFilterRule, 
  DynamicFieldDiscovery,
  FilterOperator 
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { MultiValueSelector } from './MultiValueSelector';
import { NestedFieldSelector } from './NestedFieldSelector';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleName: string;
  fieldDiscovery: DynamicFieldDiscovery | null;
  initialFilter?: ComplexFilter | null;
  onApply: (filter: ComplexFilter | null) => void;
}

interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  fieldPath: string[];
  label?: string;
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  onOpenChange,
  moduleName,
  fieldDiscovery,
  initialFilter,
  onApply
}) => {
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState<string | null>(null);

  // Initialize rules from initial filter
  useEffect(() => {
    if (initialFilter?.rootGroup) {
      setLogic(initialFilter.rootGroup.logic);
      setRules(initialFilter.rootGroup.rules.map(rule => ({
        id: rule.id,
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        fieldPath: rule.fieldPath || [],
        label: rule.label
      })));
    } else {
      // Start with one empty rule for better UX
      setRules([{
        id: generateId(),
        field: '',
        operator: 'equals' as FilterOperator,
        value: '',
        fieldPath: []
      }]);
      setLogic('AND');
    }
  }, [initialFilter, open]);

  const getFieldOptions = () => {
    if (!fieldDiscovery) {
      console.log('No fieldDiscovery available');
      return [];
    }
    const fields = fieldDiscovery.nestedFields || [];
    console.log('Available fields:', fields);
    return fields;
  };

  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'string':
        return [
          { value: 'equals', label: 'is equal' },
          { value: 'not_equals', label: 'is not equal' },
          { value: 'contains', label: 'contains' },
          { value: 'not_contains', label: 'does not contain' },
          { value: 'starts_with', label: 'starts with' },
          { value: 'ends_with', label: 'ends with' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'is equal' },
          { value: 'not_equals', label: 'is not equal' },
          { value: 'greater_than', label: 'is greater than' },
          { value: 'less_than', label: 'is less than' },
          { value: 'between', label: 'is between' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'is equal' },
          { value: 'not_equals', label: 'is not equal' }
        ];
      case 'enum':
        return [
          { value: 'equals', label: 'is equal' },
          { value: 'not_equals', label: 'is not equal' },
          { value: 'in', label: 'is in' },
          { value: 'not_in', label: 'is not in' }
        ];
      default:
        return [
          { value: 'equals', label: 'is equal' },
          { value: 'not_equals', label: 'is not equal' }
        ];
    }
  };

  const addRule = () => {
    const newRule: FilterRule = {
      id: generateId(),
      field: '',
      operator: 'equals' as FilterOperator,
      value: '',
      fieldPath: []
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

  const handleFieldChange = (ruleId: string, fieldPath: string) => {
    const field = getFieldOptions().find(f => f.path.join('.') === fieldPath);
    if (field) {
      updateRule(ruleId, {
        field: field.path[field.path.length - 1],
        fieldPath: field.path,
        label: field.label,
        operator: 'equals' as FilterOperator,
        value: ''
      });
    }
  };

  const getFieldType = (fieldPath: string[]) => {
    const field = getFieldOptions().find(f => 
      f.path.length === fieldPath.length && 
      f.path.every((p, i) => p === fieldPath[i])
    );
    return field?.type || 'string';
  };

  const getFieldTypeFromPath = (fieldPath: string[]) => {
    if (fieldPath.length === 0) return 'string';
    
    // For now, return basic type inference based on field names
    const fieldName = fieldPath[fieldPath.length - 1];
    
    if (fieldName === 'isActive' || fieldName === 'isSuperAdmin') return 'boolean';
    if (fieldName === 'createdAt' || fieldName === 'updatedAt' || fieldName === 'startedAt') return 'datetime';
    if (fieldName === 'status' || fieldName === 'accessType') return 'enum';
    
    return 'string';
  };

  const renderValueInput = (rule: FilterRule) => {
    const fieldType = getFieldTypeFromPath(rule.fieldPath);
    
    if (fieldType === 'boolean') {
      return (
        <Select value={String(rule.value)} onValueChange={(value) => updateRule(rule.id, { value: value === 'true' })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === 'enum') {
      const fieldName = rule.fieldPath[rule.fieldPath.length - 1];
      let options: Array<{ value: any; label: string }> = [];
      
      if (fieldName === 'status') {
        options = [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'ENDED', label: 'Ended' },
          { value: 'EXPIRED', label: 'Expired' },
          { value: 'REVOKED', label: 'Revoked' }
        ];
      } else if (fieldName === 'accessType') {
        options = [
          { value: 'SECURE_LOGIN', label: 'Secure Login' },
          { value: 'IMPERSONATION', label: 'Impersonation' },
          { value: 'DIRECT_ACCESS', label: 'Direct Access' }
        ];
      }
      
      if (rule.operator === 'in' || rule.operator === 'not_in') {
        return (
          <MultiValueSelector
            moduleName={moduleName}
            fieldPath={rule.fieldPath}
            fieldConfig={{ label: rule.label || rule.field, type: 'enum', operators: [], path: rule.fieldPath }}
            selectedValues={Array.isArray(rule.value) ? rule.value : []}
            onValuesChange={(values) => updateRule(rule.id, { value: values })}
          />
        );
      } else {
        return (
          <Select value={rule.value} onValueChange={(value) => updateRule(rule.id, { value })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    }

    return (
      <Input
        value={rule.value || ''}
        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
        placeholder="Enter value..."
        className="flex-1"
      />
    );
  };

  const handleApply = () => {
    if (rules.length === 0) {
      onApply(null);
    } else {
      const filter: ComplexFilter = {
        rootGroup: {
          id: generateId(),
          logic,
          rules: rules.map(rule => ({
            id: rule.id,
            field: rule.field,
            operator: rule.operator,
            value: rule.value,
            fieldPath: rule.fieldPath,
            label: rule.label
          })),
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
    setRules([]);
    setLogic('AND');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Filter</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
          <div className="space-y-3">
            {rules.map((rule) => {
              const fieldType = getFieldTypeFromPath(rule.fieldPath);
              const operatorOptions = getOperatorOptions(fieldType);

              return (
                <div key={rule.id} className="flex items-center gap-2 p-3 border rounded">
                  {/* Field Selector */}
                  <Popover 
                    open={fieldSelectorOpen === rule.id} 
                    onOpenChange={(open) => setFieldSelectorOpen(open ? rule.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-48 justify-between"
                        onClick={() => setFieldSelectorOpen(rule.id)}
                      >
                        <span className="truncate">
                          {rule.label || 'Select field...'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <NestedFieldSelector
                        moduleName={moduleName}
                        selectedPath={rule.fieldPath}
                        onFieldSelect={(field) => {
                          updateRule(rule.id, {
                            field: field.name,
                            fieldPath: field.path,
                            label: field.label,
                            operator: 'equals' as FilterOperator,
                            value: ''
                          });
                          setFieldSelectorOpen(null);
                        }}
                        onClose={() => setFieldSelectorOpen(null)}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Operator Selector */}
                  <Select 
                    value={rule.operator} 
                    onValueChange={(value) => updateRule(rule.id, { operator: value as FilterOperator, value: '' })}
                  >
                    <SelectTrigger className="w-32">
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
                  {renderValueInput(rule)}

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Add Rule Button */}
          <Button variant="outline" onClick={addRule} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClear} disabled={rules.length === 0}>
              Clear All
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleApply}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 