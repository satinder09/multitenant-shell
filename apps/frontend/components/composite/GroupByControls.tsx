'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, BarChart3 } from 'lucide-react';
import { ModuleConfig } from '@/shared/modules/types';

export interface GroupByConfig {
  field: string;
  direction: 'asc' | 'desc';
  showCounts: boolean;
  collapsible: boolean;
}

interface GroupByControlsProps {
  config: ModuleConfig;
  groupBy: GroupByConfig[];
  onGroupByChange: (groupBy: GroupByConfig[]) => void;
  maxGroups?: number;
}

export const GroupByControls: React.FC<GroupByControlsProps> = ({
  config,
  groupBy,
  onGroupByChange,
  maxGroups = 3
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get groupable fields from config
  const groupableFields = config.columns.filter(col => 
    col.visible !== false && 
    (col.type === 'string' || col.type === 'enum' || col.type === 'boolean')
  );

  const addGroupBy = () => {
    if (groupBy.length < maxGroups) {
      const availableFields = groupableFields.filter(field => 
        !groupBy.some(group => group.field === field.field)
      );
      
      if (availableFields.length > 0) {
        const newGroup: GroupByConfig = {
          field: availableFields[0].field,
          direction: 'asc',
          showCounts: true,
          collapsible: true
        };
        onGroupByChange([...groupBy, newGroup]);
      }
    }
  };

  const removeGroupBy = (index: number) => {
    const newGroupBy = groupBy.filter((_, i) => i !== index);
    onGroupByChange(newGroupBy);
  };

  const updateGroupBy = (index: number, updates: Partial<GroupByConfig>) => {
    const newGroupBy = groupBy.map((group, i) => 
      i === index ? { ...group, ...updates } : group
    );
    onGroupByChange(newGroupBy);
  };

  const getFieldLabel = (fieldName: string) => {
    const field = config.columns.find(col => col.field === fieldName);
    return field?.display || fieldName;
  };

  const clearAllGroups = () => {
    onGroupByChange([]);
  };

  if (!isOpen && groupBy.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Group By
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Group By Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Group By</span>
          {groupBy.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {groupBy.length}
            </Badge>
          )}
        </div>
        
        {groupBy.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllGroups}
            className="text-xs text-gray-500 hover:text-red-500"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Group By Controls */}
      <div className="space-y-2">
        {groupBy.map((group, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 min-w-[60px]">
              Level {index + 1}:
            </span>
            
            {/* Field Selection */}
            <Select
              value={group.field}
              onValueChange={(value) => updateGroupBy(index, { field: value })}
            >
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {groupableFields.map((field) => (
                  <SelectItem 
                    key={field.field} 
                    value={field.field}
                    disabled={groupBy.some(g => g.field === field.field && g !== group)}
                  >
                    {field.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Direction Selection */}
            <Select
              value={group.direction}
              onValueChange={(value: 'asc' | 'desc') => updateGroupBy(index, { direction: value })}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">A-Z</SelectItem>
                <SelectItem value="desc">Z-A</SelectItem>
              </SelectContent>
            </Select>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeGroupBy(index)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {/* Add Group Button */}
        {groupBy.length < maxGroups && groupableFields.length > groupBy.length && (
          <Button
            variant="outline"
            size="sm"
            onClick={addGroupBy}
            className="flex items-center gap-2 h-8 text-xs"
          >
            <Plus className="w-3 h-3" />
            Add Group Level
          </Button>
        )}
      </div>

      {/* Group By Preview */}
      {groupBy.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          <span className="font-medium">Grouping by:</span>{' '}
          {groupBy.map((group, index) => (
            <span key={index}>
              {getFieldLabel(group.field)}
              {index < groupBy.length - 1 && ' → '}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}; 