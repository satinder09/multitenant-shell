import { PrismaClient } from '../generated/master-prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const permissions = [
  { name: 'system:admin', description: 'System administrator with unrestricted access to all features' },
  { name: 'tenant:create', description: 'Create a new tenant' },
  { name: 'tenant:view', description: 'View tenant details' },
  { name: 'tenant:update', description: 'Edit tenant info/settings' },
  { name: 'tenant:delete', description: 'Delete a tenant' },
  { name: 'user:create', description: 'Create users' },
  { name: 'user:view', description: 'View users' },
  { name: 'user:update', description: 'Edit user info' },
  { name: 'user:delete', description: 'Delete users' },
  { name: 'impersonate:tenant_user', description: 'Impersonate a user in a tenant' },
  { name: 'billing:view', description: 'View billing info for tenants' },
  { name: 'billing:manage', description: 'Manage billing, invoices, payments' },
  { name: 'platform:settings:view', description: 'View platform-wide settings' },
  { name: 'platform:settings:update', description: 'Change platform-wide settings' },
  { name: 'logs:view', description: 'View audit and access logs' },
  { name: 'rbac:manage', description: 'Manage roles and permissions' },
];

const roles = [
  {
    name: 'Super Admin',
    description: 'Full access to all platform features and data',
    permissions: permissions.map(p => p.name),
  },
  {
    name: 'Support Staff',
    description: 'Support and impersonation, no billing or settings',
    permissions: [
      'tenant:view', 'tenant:update', 'user:view', 'impersonate:tenant_user', 'logs:view'
    ],
  },
  {
    name: 'Billing Manager',
    description: 'Manage billing and view tenants',
    permissions: [
      'tenant:view', 'billing:view', 'billing:manage'
    ],
  },
  {
    name: 'Read-Only Auditor',
    description: 'View only, no changes allowed',
    permissions: [
      'tenant:view', 'user:view', 'billing:view', 'platform:settings:view', 'logs:view'
    ],
  },
];

async function main() {
  // Check if roles or permissions already exist
  const existingRoles = await prisma.role.count();
  const existingPermissions = await prisma.permission.count();
  if (existingRoles > 0 || existingPermissions > 0) {
    console.log('Roles or permissions already exist. Skipping seeding.');
    return;
  }

  console.log('Seeding permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log('Permissions seeded.');

  console.log('Seeding roles and assigning permissions...');
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: {
        name: role.name,
        description: role.description,
      },
    });

    for (const permName of role.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: createdRole.id, permissionId: perm.id } },
          update: {},
          create: {
            roleId: createdRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }
  console.log('Roles and permissions assigned.');

  // Create or update the super admin user and assign Super Admin role
  console.log('Creating super admin user...');
  const passwordHash = await bcrypt.hash('P@ssw0rd123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@localhost.com' },
    update: {},
    create: {
      email: 'admin@localhost.com',
      passwordHash,
      name: 'Super Admin',
      isSuperAdmin: true,
    },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
      update: {},
      create: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });
  }
  console.log('Super admin user created and assigned role.');

  console.log('Seeded roles, permissions, and super admin user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 