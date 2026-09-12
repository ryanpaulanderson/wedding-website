-- CreateEnum
CREATE TYPE "EarlyDeclineEmailKind" AS ENUM ('GUEST_CONFIRMATION', 'ADMIN_NOTIFICATION');

-- CreateEnum
CREATE TYPE "EarlyDeclineEmailStatus" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED', 'PAUSED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "early_declines" (
    "id" UUID NOT NULL,
    "names" VARCHAR(1000) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(3),

    CONSTRAINT "early_declines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "early_decline_emails" (
    "id" UUID NOT NULL,
    "decline_id" UUID NOT NULL,
    "kind" "EarlyDeclineEmailKind" NOT NULL,
    "status" "EarlyDeclineEmailStatus" NOT NULL DEFAULT 'PENDING',
    "payload" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "first_attempt_at" TIMESTAMPTZ(3),
    "lease_token" UUID,
    "lease_expires_at" TIMESTAMPTZ(3),
    "provider_id" VARCHAR(36),
    "error_code" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "early_decline_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "early_decline_rate_limits" (
    "key" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "early_decline_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "early_declines_email_key" ON "early_declines"("email");

-- CreateIndex
CREATE INDEX "early_declines_created_at_idx" ON "early_declines"("created_at" DESC);

-- CreateIndex
CREATE INDEX "early_decline_emails_status_idx" ON "early_decline_emails"("status");

-- CreateIndex
CREATE UNIQUE INDEX "early_decline_emails_decline_id_kind_key" ON "early_decline_emails"("decline_id", "kind");

-- CreateIndex
CREATE INDEX "early_decline_rate_limits_expires_at_idx" ON "early_decline_rate_limits"("expires_at");

-- AddForeignKey
ALTER TABLE "early_decline_emails" ADD CONSTRAINT "early_decline_emails_decline_id_fkey" FOREIGN KEY ("decline_id") REFERENCES "early_declines"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "early_declines" ADD CONSTRAINT "early_declines_names_nonempty"
  CHECK ("names" ~ '[^[:space:]]');
ALTER TABLE "early_declines" ADD CONSTRAINT "early_declines_email_normalized"
  CHECK ("email" = lower(btrim("email")) AND "email" ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$');
