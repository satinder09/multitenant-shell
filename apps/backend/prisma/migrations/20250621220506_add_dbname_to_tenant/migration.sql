/*
  Warnings:

  - A unique constraint covering the columns `[dbName]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dbName` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "dbName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_dbName_key" ON "Tenant"("dbName");
