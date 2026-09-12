ALTER TABLE "households" ADD COLUMN "invitation_token_hash" VARCHAR(64);

CREATE UNIQUE INDEX "households_invitation_token_hash_key" ON "households"("invitation_token_hash");

ALTER TABLE "households" ADD CONSTRAINT "households_invitation_token_hash_check" CHECK (
    "invitation_token_hash" IS NULL OR "invitation_token_hash" ~ '^[0-9a-f]{64}$'
);

ALTER TABLE "guests"
    ADD COLUMN "dietary_restrictions" VARCHAR(1000),
    ADD COLUMN "plus_one_allowed" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "plus_one_name" VARCHAR(200),
    ADD COLUMN "plus_one_attendance" "attendance_response",
    ADD COLUMN "plus_one_dietary_restrictions" VARCHAR(1000);

-- An invitation can grant at most one plus-one. Guest submissions cannot grant permission.
ALTER TABLE "guests" ADD CONSTRAINT "guests_plus_one_permission_check" CHECK (
    "plus_one_allowed" OR (
        "plus_one_name" IS NULL AND
        "plus_one_attendance" IS NULL AND
        "plus_one_dietary_restrictions" IS NULL
    )
);

ALTER TABLE "guests" ADD CONSTRAINT "guests_attending_plus_one_check" CHECK (
    "plus_one_attendance" IS DISTINCT FROM 'attending' OR (
        "attendance" IS NOT DISTINCT FROM 'attending' AND
        "plus_one_name" IS NOT NULL AND "plus_one_name" ~ '[^[:space:]]'
    )
);
