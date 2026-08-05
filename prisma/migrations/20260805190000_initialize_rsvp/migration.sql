-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "attendance_response" AS ENUM ('attending', 'declined');

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "first_responded_at" TIMESTAMPTZ(3),
    "last_responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "attendance" "attendance_response",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "households_last_responded_at_idx" ON "households"("last_responded_at" DESC);

-- CreateIndex
CREATE INDEX "guests_household_id_idx" ON "guests"("household_id");

-- CreateIndex
CREATE INDEX "guests_attendance_idx" ON "guests"("attendance");

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
