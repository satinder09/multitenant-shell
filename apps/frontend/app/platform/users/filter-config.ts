import React from 'react';
import { registerModuleFilter } from '@/lib/filter-registry';
import { Calendar, Users, Mail, Shield } from 'lucide-react';

// Register the users module filter configuration
registerModuleFilter({
  moduleName: 'users',
  sourceTable: 'users',
  
  // Popular filters configuration
  popularFilters: [
    // PRELOADED FILTERS - One-click application
    {
      id: 'super_admins',
      label: 'Super Admins',
      type: 'preloaded',
      icon: React.createElement(Shield, { className: "w-4 h-4 text-red-600" }),
      field: 'isSuperAdmin',
      operator: 'equals',
      preloadedValue: true
    },
    {
      id: 'regular_users',
      label: 'Regular Users',
      type: 'preloaded',
      icon: React.createElement(Users, { className: "w-4 h-4 text-blue-600" }),
      field: 'isSuperAdmin',
      operator: 'equals',
      preloadedValue: false
    },
    
    // USER INPUT FILTERS - Interactive selection
    {
      id: 'registration_date',
      label: 'Registration Date',
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
          { label: 'Last 30 Days', value: 'last30days' }
        ]
      }
    },
    {
      id: 'email_domain',
      label: 'Email Domain',
      type: 'user-input',
      icon: React.createElement(Mail, { className: "w-4 h-4 text-green-600" }),
      field: 'email',
      operator: 'ends_with',
      inputConfig: {
        renderType: 'dropdown',
        placeholder: 'Select email domain...',
        dataSource: {
          table: 'users',
          valueField: 'email',
          displayField: 'email'
        }
      }
    }
  ],
  
  // Optional: Field overrides
  fieldOverrides: {
    disabledFields: ['passwordHash'] // Hide sensitive fields
  },
  
  // Configuration options
  useAutoGeneration: true,
  maxRelationshipDepth: 2
}); 