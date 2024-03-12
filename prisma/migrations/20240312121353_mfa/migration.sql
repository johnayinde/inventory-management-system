-- AlterTable
ALTER TABLE "Auth" ADD COLUMN     "is_mfa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" TEXT;
