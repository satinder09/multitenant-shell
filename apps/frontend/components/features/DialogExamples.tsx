import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { alert, confirm, dialog, DialogButton } from '@/shared/utils/ui/dialogUtils'
import { Save, Trash2, Download, Mail, Phone, User } from 'lucide-react'

/**
 * Comprehensive examples of the new dialog system
 */
export function DialogExamples() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  // 1. SIMPLE ALERTS
  const showSimpleAlert = () => {
    alert('This is a simple alert!')
  }

  const showCustomAlert = () => {
    alert({
      title: 'Operation Successful',
      description: 'Your changes have been saved successfully.',
      variant: 'success',
      buttons: [
        { label: 'Awesome!', variant: 'default', icon: <Save className="h-4 w-4" /> }
      ]
    })
  }

  const showMultiButtonAlert = () => {
    alert({
      title: 'File Downloaded',
      description: 'The file has been downloaded to your device.',
      variant: 'info',
      buttons: [
        { label: 'View File', variant: 'outline', onClick: () => console.log('Viewing file...') },
        { label: 'Open Folder', variant: 'default', onClick: () => console.log('Opening folder...') }
      ]
    })
  }

  // 2. CONFIRMATION DIALOGS
  const showSimpleConfirm = () => {
    confirm({
      title: 'Delete Item',
      description: 'Are you sure you want to delete this item? This action cannot be undone.',
      variant: 'critical',
      onConfirm: () => console.log('Item deleted!'),
      onCancel: () => console.log('Deletion cancelled')
    })
  }

  const showCustomConfirm = () => {
    confirm({
      title: 'Save Changes',
      description: 'You have unsaved changes. What would you like to do?',
      variant: 'warning',
      buttons: [
        { 
          label: 'Cancel', 
          variant: 'outline', 
          onClick: () => console.log('Staying on page...') 
        },
        { 
          label: "Don't Save", 
          variant: 'destructive', 
          onClick: () => console.log('Discarding changes...') 
        },
        { 
          label: 'Save & Continue', 
          variant: 'default', 
          icon: <Save className="h-4 w-4" />,
          onClick: () => console.log('Saving and continuing...') 
        }
      ]
    })
  }

  const showAsyncConfirm = async () => {
    const buttons: DialogButton[] = [
      { 
        label: 'Cancel', 
        variant: 'outline',
        autoClose: true
      },
      { 
        label: 'Send SMS', 
        variant: 'outline', 
        icon: <Phone className="h-4 w-4" />,
        onClick: () => console.log('Sending SMS...')
      },
      { 
        label: 'Send Email', 
        variant: 'default', 
        icon: <Mail className="h-4 w-4" />,
        onClick: () => console.log('Sending email...')
      }
    ]

    confirm({
      title: 'Send Notification',
      description: 'How would you like to send the notification?',
      variant: 'default',
      buttons
    })
  }

  // 3. COMPLEX DIALOGS
  const showFormDialog = () => {
    const handleSubmit = () => {
      console.log('Form submitted:', formData)
      alert({
        title: 'Form Submitted',
        description: 'Your message has been sent successfully!',
        variant: 'success'
      })
    }

    const handleReset = () => {
      setFormData({ name: '', email: '', message: '' })
    }

    dialog({
      title: 'Contact Form',
      description: 'Please fill out the form below to send us a message.',
      size: 'lg',
      variant: 'default',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter your message"
              rows={4}
            />
          </div>
        </div>
      ),
      buttons: [
        { 
          label: 'Cancel', 
          variant: 'outline',
          autoClose: true
        },
        { 
          label: 'Reset', 
          variant: 'outline', 
          onClick: handleReset,
          autoClose: false
        },
        { 
          label: 'Submit', 
          variant: 'default', 
          onClick: handleSubmit,
          disabled: !formData.name || !formData.email || !formData.message
        }
      ]
    })
  }

  const showDataDialog = () => {
    const userData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' }
    ]

    dialog({
      title: 'User Management',
      description: 'Manage system users and their permissions.',
      size: 'xl',
      variant: 'default',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 font-semibold text-sm border-b pb-2">
            <div>ID</div>
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
          </div>
          {userData.map(user => (
            <div key={user.id} className="grid grid-cols-4 gap-4 text-sm py-2 border-b">
              <div>{user.id}</div>
              <div>{user.name}</div>
              <div>{user.email}</div>
              <div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {user.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      ),
      buttons: [
        { 
          label: 'Export', 
          variant: 'outline', 
          icon: <Download className="h-4 w-4" />,
          onClick: () => alert('Export functionality would go here'),
          autoClose: false
        },
        { 
          label: 'Add User', 
          variant: 'default', 
          icon: <User className="h-4 w-4" />,
          onClick: () => alert('Add user functionality would go here'),
          autoClose: false
        },
        { 
          label: 'Close', 
          variant: 'outline',
          autoClose: true
        }
      ]
    })
  }

  const showLoadingDialog = () => {
    dialog({
      title: 'Processing',
      description: 'Please wait while we process your request...',
      size: 'md',
      variant: 'info',
      content: (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-600">Processing...</span>
        </div>
      ),
      buttons: [
        { 
          label: 'Cancel', 
          variant: 'default',
          onClick: () => console.log('Process cancelled'),
          autoClose: true
        }
      ]
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Dialog System Examples</CardTitle>
          <CardDescription>
            Comprehensive examples showing all dialog features and patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Simple Alerts */}
          <div>
            <h3 className="text-lg font-semibold mb-3">1. Simple Alerts</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={showSimpleAlert}>
                Simple Alert
              </Button>
              <Button onClick={showCustomAlert} variant="outline">
                Custom Alert
              </Button>
              <Button onClick={showMultiButtonAlert} variant="outline">
                Multi-Button Alert
              </Button>
            </div>
          </div>

          {/* Confirmations */}
          <div>
            <h3 className="text-lg font-semibold mb-3">2. Confirmation Dialogs</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={showSimpleConfirm} variant="destructive">
                Simple Confirm
              </Button>
              <Button onClick={showCustomConfirm} variant="outline">
                Custom Confirm
              </Button>
              <Button onClick={showAsyncConfirm} variant="outline">
                Multi-Option Confirm
              </Button>
            </div>
          </div>

          {/* Complex Dialogs */}
          <div>
            <h3 className="text-lg font-semibold mb-3">3. Complex Dialogs</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={showFormDialog}>
                Form Dialog
              </Button>
              <Button onClick={showDataDialog} variant="outline">
                Data Table Dialog
              </Button>
              <Button onClick={showLoadingDialog} variant="outline">
                Loading Dialog
              </Button>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Quick Usage Examples:</h4>
            <pre className="text-sm overflow-x-auto">
{`// Simple alert
alert('Hello world!')

// Custom confirm
confirm({
  title: 'Delete item',
  onConfirm: () => deleteItem(),
  buttons: [
    { label: 'Delete', variant: 'destructive', onClick: deleteItem },
    { label: 'Cancel', variant: 'outline', autoClose: true }
  ]
})

// Complex dialog
dialog({
  title: 'User Profile',
  content: <UserForm />,
  size: 'lg',
  buttons: [
    { label: 'Save', onClick: handleSave },
    { label: 'Cancel', autoClose: true }
  ]
})`}
            </pre>
          </div>

        </CardContent>
      </Card>
    </div>
  )
} 