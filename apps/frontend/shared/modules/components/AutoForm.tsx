// Auto-Generated Form Component
// Automatically creates forms based on field schemas
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from 'lucide-react';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { FieldSchema } from '../helpers/types';

interface AutoFormProps {
  fields: FieldSchema[];
  data?: any;
  onSubmit: (data: any) => void | Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
  entityName: string;
  open: boolean;
  isLoading?: boolean;
}

interface FormFieldProps {
  field: FieldSchema;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Individual form field component
const FormField: React.FC<FormFieldProps> = ({ field, value, onChange, error }) => {
  const getInputComponent = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value || false}
              onCheckedChange={onChange}
            />
            <Label htmlFor={field.name}>
              {field.display || field.name}
            </Label>
          </div>
        );

      case 'select':
        if (!field.options || !Array.isArray(field.options)) {
          return (
            <Input
              id={field.name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${field.display || field.name}`}
            />
          );
        }
        
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.display || field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'email':
        return (
          <Input
            id={field.name}
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.display || field.name}`}
            required={field.required}
          />
        );

      case 'number':
      case 'currency':
        return (
          <Input
            id={field.name}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${field.display || field.name}`}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return (
          <Input
            id={field.name}
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      case 'datetime':
        return (
          <Input
            id={field.name}
            type="datetime-local"
            value={value ? new Date(value).toISOString().slice(0, 16) : ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      case 'string':
      default:
        // Use textarea for fields that might contain longer text
        const isLongText = field.name.includes('description') || 
                          field.name.includes('notes') || 
                          field.name.includes('comment');
        
        if (isLongText) {
          return (
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${field.display || field.name}`}
              required={field.required}
              rows={3}
            />
          );
        }

        return (
          <Input
            id={field.name}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.display || field.name}`}
            required={field.required}
            pattern={field.validation?.pattern}
          />
        );
    }
  };

  // Don't render readonly fields in forms
  if (field.readonly || field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') {
    return null;
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name} className={field.required ? 'required' : ''}>
        {field.display || field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {getInputComponent()}
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
      {field.validation?.message && (
        <span className="text-xs text-muted-foreground">{field.validation.message}</span>
      )}
    </div>
  );
};

// Main AutoForm component
export const AutoForm: React.FC<AutoFormProps> = ({
  fields,
  data,
  onSubmit,
  onCancel,
  mode = 'create',
  entityName,
  open,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens or data changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && data) {
        setFormData({ ...data });
      } else {
        // Initialize with default values for create mode
        const initialData: any = {};
        fields.forEach(field => {
          if (field.type === 'boolean') {
            initialData[field.name] = false;
          } else if (field.name === 'isActive') {
            initialData[field.name] = true; // Default active status
          }
        });
        setFormData(initialData);
      }
      setErrors({});
    }
  }, [open, mode, data, fields]);

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.readonly || field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') {
        return;
      }

      const value = formData[field.name];
      
      // Required field validation
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field.name] = `${field.display || field.name} is required`;
        return;
      }

      // Type-specific validation
      if (value) {
        switch (field.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors[field.name] = 'Please enter a valid email address';
            }
            break;
          
          case 'number':
          case 'currency':
            if (isNaN(value)) {
              newErrors[field.name] = 'Please enter a valid number';
            } else if (field.validation?.min !== undefined && value < field.validation.min) {
              newErrors[field.name] = `Value must be at least ${field.validation.min}`;
            } else if (field.validation?.max !== undefined && value > field.validation.max) {
              newErrors[field.name] = `Value must be at most ${field.validation.max}`;
            }
            break;

          case 'string':
            if (field.validation?.pattern) {
              const regex = new RegExp(field.validation.pattern);
              if (!regex.test(value)) {
                newErrors[field.name] = field.validation.message || 'Invalid format';
              }
            }
            break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      toastNotify({
        variant: 'success',
        title: `${entityName} ${mode === 'create' ? 'created' : 'updated'}`,
        description: `${entityName} has been ${mode === 'create' ? 'created' : 'updated'} successfully.`
      });
    } catch (error: any) {
      toastNotify({
        variant: 'error',
        title: `Failed to ${mode} ${entityName.toLowerCase()}`,
        description: error?.message || 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle field value changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[fieldName]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [fieldName]: '' }));
    }
  };

  // Get form fields (exclude readonly and system fields)
  const formFields = fields.filter(field => 
    !field.readonly && 
    field.name !== 'id' && 
    field.name !== 'createdAt' && 
    field.name !== 'updatedAt'
  );

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? `Create New ${entityName}` : `Edit ${entityName}`}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? `Enter the details for the new ${entityName.toLowerCase()}.`
                : `Update the details for this ${entityName.toLowerCase()}.`
              }
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          )}

          {!isLoading && (
            <div className="grid gap-4 py-4">
              {formFields.map(field => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => handleFieldChange(field.name, value)}
                  error={errors[field.name]}
                />
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                mode === 'create' ? 'Create' : 'Update'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AutoForm; 