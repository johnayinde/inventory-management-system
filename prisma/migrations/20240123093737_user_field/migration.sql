/*
  Warnings:

  - You are about to drop the column `is_active` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusType" AS ENUM ('online', 'offline');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "is_active",
ADD COLUMN     "is_suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "StatusType" NOT NULL DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "Permission_userId_key" ON "Permission"("userId");
