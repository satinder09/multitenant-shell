#!/bin/bash

# Fix import paths throughout the domain structure

echo "Fixing import paths..."

# Update references to old service names
find src/domains -name "*.ts" -exec sed -i 's/MasterPrismaService/MasterDatabaseService/g' {} \;
find src/domains -name "*.ts" -exec sed -i 's/TenantPrismaService/TenantDatabaseService/g' {} \;

# Update auth service imports
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/auth\/auth\.service'|'../services/auth.service'|g" {} \;
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/auth\/jwt-auth\.guard'|'../guards/jwt-auth.guard'|g" {} \;

# Update database service imports
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/master-prisma\/master-prisma\.service'|'../../database/master/master-database.service'|g" {} \;
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/prisma-tenant\/tenant-prisma\.service'|'../../database/tenant/tenant-database.service'|g" {} \;

# Update DTO imports
find src/domains -name "*.ts" -exec sed -i "s|'\.\/dto\/|'../dto/|g" {} \;

# Update generated prisma imports
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/\.\.\/\.\.\/generated\/|'../../../../generated/|g" {} \;

# Update utility imports
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/\.\.\/common\/utils\/|'../../../shared/utils/|g" {} \;
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/common\/decorators\/|'../../../shared/decorators/|g" {} \;

# Update tenant context imports
find src/domains -name "*.ts" -exec sed -i "s|'\.\.\/prisma-tenant\/tenant-context'|'../../../shared/types/tenant-context'|g" {} \;

echo "Import paths fixed!" 