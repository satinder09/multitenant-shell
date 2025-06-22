-- CreateTable
CREATE TABLE "TenantUserPermission" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUserPermission_pkey" PRIMARY KEY ("userId","tenantId")
);

-- AddForeignKey
ALTER TABLE "TenantUserPermission" ADD CONSTRAINT "TenantUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUserPermission" ADD CONSTRAINT "TenantUserPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
