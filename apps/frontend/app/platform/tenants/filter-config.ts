import React from 'react';
import { registerModuleFilter } from '@/lib/filter-registry';
import { Calendar, Users, Building, Shield } from 'lucide-react';

// Register the tenants module filter configuration
registerModuleFilter({
  moduleName: 'tenants',
  sourceTable: 'tenants',
  
  // Popular filters configuration
  popularFilters: [
    // PRELOADED FILTERS - One-click application
    {
      id: 'active',
      label: 'Active',
      type: 'preloaded',
      icon: React.createElement(Users, { className: "w-4 h-4 text-green-600" }),
      field: 'isActive',
      operator: 'equals',
      preloadedValue: true
    },
    {
      id: 'inactive',
      label: 'Inactive', 
      type: 'preloaded',
      icon: React.createElement(Users, { className: "w-4 h-4 text-red-600" }),
      field: 'isActive',
      operator: 'equals',
      preloadedValue: false
    },
    {
      id: 'recent_activity',
      label: 'Recent Activity',
      type: 'preloaded',
      icon: React.createElement(Shield, { className: "w-4 h-4 text-blue-600" }),
      field: 'updatedAt',
      operator: 'greater_than',
      preloadedValue: 'last7days'
    },
    
    // USER INPUT FILTERS - Interactive selection
    {
      id: 'created_date',
      label: 'Created Date',
      type: 'user-input',
      icon: React.createElement(Calendar, { className: "w-4 h-4 text-purple-600" }),
      field: 'createdAt',
      operator: 'greater_than',
      inputConfig: {
        renderType: 'datepicker',
        placeholder: 'Select date range...',
        datePresets: [
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'thisWeek' },
          { label: 'This Month', value: 'thisMonth' },
          { label: 'This Year', value: 'thisYear' },
          { label: 'Last 7 Days', value: 'last7days' },
          { label: 'Last 30 Days', value: 'last30days' }
        ]
      }
    },
    {
      id: 'subdomain_search',
      label: 'Subdomain',
      type: 'user-input',
      icon: React.createElement(Building, { className: "w-4 h-4 text-orange-600" }),
      field: 'subdomain',
      operator: 'contains',
      inputConfig: {
        renderType: 'dropdown',
        placeholder: 'Select subdomain...',
        dataSource: {
          table: 'tenants',
          valueField: 'subdomain',
          displayField: 'subdomain'
        }
      }
    }
  ],
  
  // Optional: Field overrides
  fieldOverrides: {
    disabledFields: ['passwordHash', 'internalSystemId'] // Hide sensitive fields
  },
  
  // Configuration options
  useAutoGeneration: true,
  maxRelationshipDepth: 3
}); 