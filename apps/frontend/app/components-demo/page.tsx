'use client' // 👈 make this a client component

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import SearchBar from '@/components/ui-kit/SearchBar'
import FormRow from '@/components/ui-kit/FormRow'
import ActionButtons from '@/components/ui-kit/ActionButtons'
import StatusBadge from '@/components/ui-kit/StatusBadge'
import DataTable from '@/components/ui-kit/DataTable'
import TabsBlock from '@/components/ui-kit/TabsBlock'
import DateRangePicker from '@/components/ui-kit/DateRangePicker'
import DialogForm from '@/components/ui-kit/DialogForm'
import { toastNotify } from '@/utils/ui/toastNotify'
import SelectInput from '@/components/ui-kit/SelectInput'
import MultiSelect from '@/components/ui-kit/MultiSelect'
import SectionHeader from '@/components/ui-kit/SectionHeader'
import AlertDialogBox from '@/components/ui-kit/AlertDialogBox'
import { alert, confirm } from '@/utils/ui/dialogUtils'
import { openSheet, closeSheet } from '@/utils/ui/sheetUtils'

import { useState } from 'react'


export default function ComponentsDemo() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [status, setStatus] = useState('draft')

  const [selected, setSelected] = useState<string[]>([])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ShadCN UI Components Demo</h1>



      {/* Dropdown */}
      <div>
        <h2 className="font-semibold mb-2">Dropdown Menu</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>New</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Checkbox (fixed alignment) */}
      <div>
        <h2 className="font-semibold mb-2">Checkboxes</h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Checkbox id="check1" />
            <Label htmlFor="check1">Option A</Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="check2" defaultChecked />
            <Label htmlFor="check2">Option B</Label>
          </div>
        </div>
      </div>

      {/* Radio Group (ShadCN style) */}
      <div>
        <h2 className="font-semibold mb-2">Radio Group</h2>
        <RadioGroup defaultValue="comfortable" className="space-y-2">
          <div className="flex items-center gap-3">
            <RadioGroupItem value="default" id="r1" />
            <Label htmlFor="r1">Default</Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="comfortable" id="r2" />
            <Label htmlFor="r2">Comfortable</Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="compact" id="r3" />
            <Label htmlFor="r3">Compact</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Table */}
      <div>
        <h2 className="font-semibold mb-2">Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2">SKU</TableHead>
              <TableHead className="px-4 py-2">Name</TableHead>
              <TableHead className="px-4 py-2">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="px-4 py-2">SKU-001</TableCell>
              <TableCell className="px-4 py-2">Sample Item</TableCell>
              <TableCell className="px-4 py-2">25</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-2">SKU-002</TableCell>
              <TableCell className="px-4 py-2">Another Item</TableCell>
              <TableCell className="px-4 py-2">10</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Input */}
      <div>
        <h2 className="font-semibold mb-2">Input & Label</h2>
        <Label htmlFor="search">Search SKU</Label>
        <Input id="search" placeholder="Enter SKU..." />
      </div>

      <div className="space-y-6  mx-auto py-10">
        {/* ✅ Search Bar */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Search Bar</h2>
          <SearchBar onSearch={(val) => alert(`Searching: ${val}`)} />
        </section>
      </div>


      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Form Row</h2>
        <form className="space-y-4">
          <FormRow id="item-code" label="Item Code" layout="vertical">
            <Input id="item-code" placeholder="SKU-001" />
          </FormRow>
          <FormRow id="quantity" label="Quantity" layout="vertical">
            <Input id="quantity" type="number" defaultValue="10" />
          </FormRow>
        </form>

      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Action Buttons</h2>
        <ActionButtons
          onCancel={() => alert('Cancelled')}
          onSubmit={() => alert('Submitted')}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Status Badge</h2>
        <div className="flex gap-4">
          <StatusBadge status="draft" />
          <StatusBadge status="approved" />
          <StatusBadge status="rejected" />
          <StatusBadge status="void" />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Data Table</h2>
        <DataTable
          rows={[
            { SKU: 'SKU-001', Name: 'Sample Item', Qty: 25 },
            { SKU: 'SKU-002', Name: 'Another Item', Qty: 10 },
          ]}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tabs</h2>
        <TabsBlock
          defaultTab="general"
          tabs={[
            {
              id: 'general',
              label: 'General',
              content: <p>This is the general tab content.</p>,
            },
            {
              id: 'details',
              label: 'Details',
              content: <p>This is the details tab content.</p>,
            },
          ]}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Date Picker</h2>
        <DateRangePicker
          date={selectedDate}
          setDate={setSelectedDate}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Dialog Form</h2>
        <DialogForm
          triggerLabel="Add Supplier"
          title="Create Supplier"
          description="Fill in the supplier details"
          onSubmit={() => alert('Submitted')}
        >
          <FormRow id="supplier-name" label="Name" layout="vertical">
            <Input id="supplier-name" placeholder="Acme Inc." />
          </FormRow>
          <FormRow id="contact" label="Phone" layout="vertical">
            <Input id="contact" placeholder="+1 123 456 7890" />
          </FormRow>
        </DialogForm>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Toast</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() =>
              toastNotify({
                variant: 'success',
                title: 'Data saved successfully',
                description: 'Your changes were applied without issues.',
              })
            }
          >
            Show Success Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toastNotify({
                variant: 'error',
                title: 'Failed to save record',
                description: 'An unexpected error occurred. Please try again.',
              })
            }
          >
            Show Error Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toastNotify({
                variant: 'info',
                title: 'System update available',
                description: 'Version 2.4.0 is ready to install.',
              })
            }
          >
            Show Info Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toastNotify({
                variant: 'warning',
                title: 'Storage limit approaching',
                description: 'You’ve used 92% of your plan’s capacity.',
              })
            }
          >
            Show Warning Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toastNotify({
                variant: 'loading',
                title: 'Sync in progress',
                description: 'Uploading inventory data. Please wait...',
                sticky: true,
              })
            }
          >
            Show Loading Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toastNotify({
                variant: 'success',
                title: 'All toasts cleared',
                description: 'Previous notifications have been dismissed.',
                dismissAll: true,
              })
            }
          >
            Clear & Toast
          </Button>
        </div>



      </section>
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold mb-2">Select Input</h2>

          <SelectInput
            id="status"
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Approved', value: 'approved' },
              { label: 'Voided', value: 'voided' },
            ]}
          />
        </div></section>




      <section className="space-y-4">
        <div>
          <h2 className="font-semibold mb-2">Multi Select</h2>



          <MultiSelect
            id="departments"
            label="Departments & Regions"
            selected={selected}
            onChange={setSelected}
            options={[
              { label: 'HR', value: 'hr', group: 'Departments' },
              { label: 'IT', value: 'it', group: 'Departments' },
              { label: 'APAC', value: 'apac', group: 'Regions' },
              { label: 'NA', value: 'na', group: 'Regions' },
              { label: 'Unassigned', value: 'none' },
            ]}
            showSelectAll
            maxSelected={3}
            maxDisplayCount={2}
            footerSlot={<span className="text-xs text-muted-foreground ml-auto">Max 3</span>}
          />



        </div>
      </section>
      <section>
        <div>
          <SectionHeader
            title="Customers"
            description="Manage your customer list and contact details"
          >
            <Button variant="default">+ Add Customer</Button>
          </SectionHeader></div>
      </section> <section>
        <div>
          <AlertDialogBox
            variant="error"
            title="Delete failed"
            description="The record could not be deleted due to a server error."
            trigger={<Button variant="destructive">Open Error Alert</Button>}
          />


        </div>
      </section>


      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Alert & Confirm Examples</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Alert - Info */}
          <Button
            variant="outline"
            onClick={() =>
              alert({
                variant: 'info',
                title: 'Heads up!',
                description: 'This is a general information message.',
              })
            }
          >
            Show Info Alert
          </Button>

          {/* Alert - Success */}
          <Button
            variant="outline"
            onClick={() =>
              alert({
                variant: 'success',
                title: 'Saved successfully!',
                description: 'Your changes have been recorded.',
              })
            }
          >
            Show Success Alert
          </Button>

          {/* Alert - Warning */}
          <Button
            variant="outline"
            onClick={() =>
              alert({
                variant: 'warning',
                title: 'Warning',
                description: 'You’re reaching your usage limit.',
              })
            }
          >
            Show Warning Alert
          </Button>

          {/* Alert - Error */}
          <Button
            variant="outline"
            onClick={() =>
              alert({
                variant: 'error',
                title: 'Something went wrong',
                description: 'We couldn’t process your request. Try again later.',
              })
            }
          >
            Show Error Alert
          </Button>

          {/* Confirm - Default */}
          <Button
            variant="outline"
            onClick={() =>
              confirm({
                title: 'Apply changes?',
                description: 'Your changes will be saved permanently.',
                variant: 'default',
                onConfirm: () => console.log('✅ Confirmed'),
                onCancel: () => console.log('❌ Cancelled'),
              })
            }
          >
            Show Default Confirm
          </Button>

          {/* Confirm - Critical */}
          <Button
            variant="outline"
            onClick={() =>
              confirm({
                title: 'Delete item?',
                description: 'This action is irreversible. Are you sure?',
                variant: 'critical',
                confirmLabel: 'Delete',
                cancelLabel: 'Cancel',
                onConfirm: () => console.log('🗑️ Deleted'),
                onCancel: () => console.log('🚫 Cancelled'),
              })
            }
          >
            Show Critical Confirm
          </Button>

        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">App Sheet</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Basic Sheet */}
          <Button
            variant="outline"
            onClick={() =>
              openSheet({
                title: 'User Info',
                description: 'This is a basic slide-in sheet.',
                content: (
                  <div className="space-y-4">
                    <p>This content is inside the sheet.</p>
                  </div>
                ),
              })
            }
          >
            Show Basic Sheet
          </Button>

          {/* Sheet with form and footer */}
          <Button
            variant="outline"
            onClick={() =>
              openSheet({
                title: 'Edit Profile',
                description: 'Make changes to your profile here.',
                content: (
                  <div className="space-y-4">
                    <FormRow id="name" label="Name" layout="vertical">
                      <Input id="name" defaultValue="Pedro Duarte" />
                    </FormRow>
                    <FormRow id="username" label="Username" layout="vertical">
                      <Input id="username" defaultValue="@peduarte" />
                    </FormRow>
                  </div>
                ),

                footer: (
                  <div className="space-y-2">
                    <Button className="w-full">Save changes</Button>
                    <Button variant="outline" className="w-full" onClick={closeSheet}>
                      Close
                    </Button>
                  </div>
                )
              })

            }
          >
            Show Sheet with Form
          </Button>

        </div>
      </section>

    </div>
  )
}
