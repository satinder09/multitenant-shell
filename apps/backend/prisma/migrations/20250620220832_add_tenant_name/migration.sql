/*
  Warnings:

  - Added the required column `name` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "name" TEXT;
UPDATE "Tenant" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "Tenant" ALTER COLUMN "name" SET NOT NULL;
