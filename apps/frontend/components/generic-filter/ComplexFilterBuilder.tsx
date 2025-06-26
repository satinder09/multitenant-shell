'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Filter } from 'lucide-react';
import { 
  ComplexFilter, 
  FilterGroup, 
  ComplexFilterRule, 
  DynamicFieldDiscovery 
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { FilterRuleComponent } from './FilterRuleComponent';

interface ComplexFilterBuilderProps {
  moduleName: string;
  fieldDiscovery: DynamicFieldDiscovery | null;
  initialFilter?: ComplexFilter | null;
  onFilterChange: (filter: ComplexFilter | null) => void;
}

export const ComplexFilterBuilder: React.FC<ComplexFilterBuilderProps> = ({
  moduleName,
  fieldDiscovery,
  initialFilter,
  onFilterChange
}) => {
  const [filter, setFilter] = useState<ComplexFilter>(
    initialFilter || {
      rootGroup: {
        id: generateId(),
        logic: 'AND',
        rules: [],
        groups: []
      }
    }
  );

  const updateFilter = (newFilter: ComplexFilter) => {
    setFilter(newFilter);
    
    // Check if filter is empty
    const isEmpty = newFilter.rootGroup.rules.length === 0 && 
                   (!newFilter.rootGroup.groups || newFilter.rootGroup.groups.length === 0);
    
    onFilterChange(isEmpty ? null : newFilter);
  };

  const addRule = () => {
    const newRule: ComplexFilterRule = {
      id: generateId(),
      field: '',
      operator: 'equals',
      value: '',
      fieldPath: []
    };

    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        rules: [...filter.rootGroup.rules, newRule]
      }
    };

    updateFilter(updatedFilter);
  };

  const updateRule = (ruleId: string, updates: Partial<ComplexFilterRule>) => {
    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        rules: filter.rootGroup.rules.map(rule => 
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      }
    };

    updateFilter(updatedFilter);
  };

  const removeRule = (ruleId: string) => {
    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        rules: filter.rootGroup.rules.filter(rule => rule.id !== ruleId)
      }
    };

    updateFilter(updatedFilter);
  };

  const updateGroupLogic = (logic: 'AND' | 'OR') => {
    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        logic
      }
    };

    updateFilter(updatedFilter);
  };

  const addNestedGroup = () => {
    const newGroup: FilterGroup = {
      id: generateId(),
      logic: 'AND',
      rules: [],
      groups: []
    };

    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        groups: [...(filter.rootGroup.groups || []), newGroup]
      }
    };

    updateFilter(updatedFilter);
  };

  const updateNestedGroup = (groupId: string, updatedGroup: FilterGroup) => {
    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        groups: (filter.rootGroup.groups || []).map(group =>
          group.id === groupId ? updatedGroup : group
        )
      }
    };

    updateFilter(updatedFilter);
  };

  const removeNestedGroup = (groupId: string) => {
    const updatedFilter: ComplexFilter = {
      ...filter,
      rootGroup: {
        ...filter.rootGroup,
        groups: (filter.rootGroup.groups || []).filter(group => group.id !== groupId)
      }
    };

    updateFilter(updatedFilter);
  };

  if (!fieldDiscovery) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-2" />
            <p>Loading filter configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Advanced Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterGroupComponent
          group={filter.rootGroup}
          fieldDiscovery={fieldDiscovery}
          onGroupChange={updateFilter}
          onRuleUpdate={updateRule}
          onRuleRemove={removeRule}
          onGroupLogicChange={updateGroupLogic}
          onNestedGroupUpdate={updateNestedGroup}
          onNestedGroupRemove={removeNestedGroup}
          moduleName={moduleName}
          level={0}
        />

        {/* Add Rule Button */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="w-4 h-4 mr-1" />
            Add Rule
          </Button>
          <Button variant="outline" size="sm" onClick={addNestedGroup}>
            <Plus className="w-4 h-4 mr-1" />
            Add Group
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface FilterGroupComponentProps {
  group: FilterGroup;
  fieldDiscovery: DynamicFieldDiscovery;
  onGroupChange: (filter: ComplexFilter) => void;
  onRuleUpdate: (ruleId: string, updates: Partial<ComplexFilterRule>) => void;
  onRuleRemove: (ruleId: string) => void;
  onGroupLogicChange: (logic: 'AND' | 'OR') => void;
  onNestedGroupUpdate: (groupId: string, group: FilterGroup) => void;
  onNestedGroupRemove: (groupId: string) => void;
  moduleName: string;
  level: number;
}

const FilterGroupComponent: React.FC<FilterGroupComponentProps> = ({
  group,
  fieldDiscovery,
  onRuleUpdate,
  onRuleRemove,
  onGroupLogicChange,
  onNestedGroupUpdate,
  onNestedGroupRemove,
  moduleName,
  level
}) => {
  const hasContent = group.rules.length > 0 || (group.groups && group.groups.length > 0);

  if (!hasContent && level > 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-4 pl-4 border-l-2 border-dashed border-muted' : ''}`}>
      {/* Logic Selector */}
      {hasContent && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Match</span>
          <Select
            value={group.logic}
            onValueChange={(logic: 'AND' | 'OR') => onGroupLogicChange(logic)}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">all</SelectItem>
              <SelectItem value="OR">any</SelectItem>
            </SelectContent>
          </Select>
          <span className="font-medium">of the following rules:</span>
        </div>
      )}

      {/* Rules */}
      <div className="space-y-2">
        {group.rules.map((rule) => (
          <FilterRuleComponent
            key={rule.id}
            rule={rule}
            fieldDiscovery={fieldDiscovery}
            onRuleChange={(updates) => onRuleUpdate(rule.id, updates)}
            onRemove={() => onRuleRemove(rule.id)}
            moduleName={moduleName}
          />
        ))}
      </div>

      {/* Nested Groups */}
      {group.groups && group.groups.map((nestedGroup) => (
        <div key={nestedGroup.id} className="relative">
          <div className="absolute -top-2 -right-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNestedGroupRemove(nestedGroup.id)}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <FilterGroupComponent
            group={nestedGroup}
            fieldDiscovery={fieldDiscovery}
            onGroupChange={() => {}} // Handled by parent
            onRuleUpdate={(ruleId, updates) => {
              const updatedGroup: FilterGroup = {
                ...nestedGroup,
                rules: nestedGroup.rules.map(rule =>
                  rule.id === ruleId ? { ...rule, ...updates } : rule
                )
              };
              onNestedGroupUpdate(nestedGroup.id, updatedGroup);
            }}
            onRuleRemove={(ruleId) => {
              const updatedGroup: FilterGroup = {
                ...nestedGroup,
                rules: nestedGroup.rules.filter(rule => rule.id !== ruleId)
              };
              onNestedGroupUpdate(nestedGroup.id, updatedGroup);
            }}
            onGroupLogicChange={(logic) => {
              const updatedGroup: FilterGroup = {
                ...nestedGroup,
                logic
              };
              onNestedGroupUpdate(nestedGroup.id, updatedGroup);
            }}
            onNestedGroupUpdate={onNestedGroupUpdate}
            onNestedGroupRemove={onNestedGroupRemove}
            moduleName={moduleName}
            level={level + 1}
          />
        </div>
      ))}
    </div>
  );
}; 