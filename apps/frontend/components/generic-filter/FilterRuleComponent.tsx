'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, ChevronDown } from 'lucide-react';
import { 
  ComplexFilterRule, 
  DynamicFieldDiscovery, 
  NestedFieldConfig, 
  FieldValue,
  FilterOperator 
} from '@/lib/types';
import { 
  humanizeFieldName, 
  formatFieldPath, 
  getOperatorsForFieldType, 
  getOperatorLabel 
} from '@/lib/utils';
import { NestedFieldSelector } from './NestedFieldSelector';
import { MultiValueSelector } from './MultiValueSelector';

interface FilterRuleComponentProps {
  rule: ComplexFilterRule;
  fieldDiscovery: DynamicFieldDiscovery;
  onRuleChange: (updates: Partial<ComplexFilterRule>) => void;
  onRemove: () => void;
  moduleName: string;
}

export const FilterRuleComponent: React.FC<FilterRuleComponentProps> = ({
  rule,
  fieldDiscovery,
  onRuleChange,
  onRemove,
  moduleName
}) => {
  const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<NestedFieldConfig | null>(null);
  const [availableOperators, setAvailableOperators] = useState<FilterOperator[]>([]);

  // Find the selected field configuration
  useEffect(() => {
    if (rule.fieldPath && rule.fieldPath.length > 0) {
      const field = fieldDiscovery.nestedFields.find(f => 
        f.path.join('.') === rule.fieldPath!.join('.')
      );
      setSelectedField(field || null);
      
      if (field) {
        setAvailableOperators(field.operators);
      }
    } else {
      setSelectedField(null);
      setAvailableOperators([]);
    }
  }, [rule.fieldPath, fieldDiscovery]);

  const handleFieldSelect = (fieldPath: string[]) => {
    const field = fieldDiscovery.nestedFields.find(f => 
      f.path.join('.') === fieldPath.join('.')
    );
    
    if (field) {
      onRuleChange({
        field: field.path[field.path.length - 1],
        fieldPath,
        operator: field.operators[0] || 'equals',
        value: '',
        label: field.label
      });
    }
    
    setIsFieldSelectorOpen(false);
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    onRuleChange({ operator, value: '' });
  };

  const handleValueChange = (value: any) => {
    onRuleChange({ value });
  };

  const renderValueInput = () => {
    if (!selectedField) return null;

    const { type, isMultiSelect } = selectedField;
    const isMultiOperator = ['in', 'not_in', 'is_in', 'is_not_in'].includes(rule.operator);
    const noValueOperators = ['is_set', 'is_not_set'];
    
    if (noValueOperators.includes(rule.operator)) {
      return (
        <div className="flex items-center justify-center px-3 py-2 text-sm text-muted-foreground bg-muted rounded">
          No value required
        </div>
      );
    }

    if (isMultiSelect || isMultiOperator) {
      return (
        <MultiValueSelector
          fieldPath={rule.fieldPath || []}
          moduleName={moduleName}
          selectedValues={Array.isArray(rule.value) ? rule.value : (rule.value ? [rule.value] : [])}
          onValuesChange={handleValueChange}
          fieldConfig={selectedField}
        />
      );
    }

    switch (type) {
      case 'boolean':
        return (
          <Select value={String(rule.value)} onValueChange={(value) => handleValueChange(value === 'true')}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            type={rule.operator === 'between' ? 'text' : 'date'}
            value={rule.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={rule.operator === 'between' ? 'YYYY-MM-DD to YYYY-MM-DD' : 'Select date'}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={rule.value}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Enter number"
          />
        );

      case 'enum':
      case 'relation':
        return (
          <MultiValueSelector
            fieldPath={rule.fieldPath || []}
            moduleName={moduleName}
            selectedValues={Array.isArray(rule.value) ? rule.value : (rule.value ? [rule.value] : [])}
            onValuesChange={handleValueChange}
            fieldConfig={selectedField}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={rule.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-card">
      {/* Field Selector */}
      <div className="flex-1 min-w-0">
        <Button
          variant="outline"
          onClick={() => setIsFieldSelectorOpen(true)}
          className="w-full justify-between h-9"
        >
          <span className="truncate">
            {selectedField ? formatFieldPath(selectedField.path) : 'Select field...'}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
        </Button>
        
        {isFieldSelectorOpen && (
          <div className="absolute z-50 mt-1 w-80 bg-popover border rounded-md shadow-md">
            <NestedFieldSelector
              moduleName={moduleName}
              selectedPath={rule.fieldPath || []}
              onFieldSelect={(field) => handleFieldSelect(field.path)}
              onClose={() => setIsFieldSelectorOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Operator Selector */}
      {selectedField && (
        <div className="w-40">
          <Select value={rule.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map((operator) => (
                <SelectItem key={operator} value={operator}>
                  {getOperatorLabel(operator)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Value Input */}
      {selectedField && (
        <div className="flex-1 min-w-0">
          {renderValueInput()}
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-9 w-9 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}; 