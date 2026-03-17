-- Add owner scope for topics
ALTER TABLE "chu_de"
ADD COLUMN IF NOT EXISTS "user_id" INTEGER;

UPDATE "chu_de"
SET "user_id" = "created_by"
WHERE "user_id" IS NULL
  AND "created_by" IS NOT NULL;

UPDATE "chu_de" cd
SET "user_id" = NULL
WHERE "user_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "users" u
    WHERE u.id = cd."user_id"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chu_de_user_id_fkey'
  ) THEN
    ALTER TABLE "chu_de"
    ADD CONSTRAINT "chu_de_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_chu_de_user_id" ON "chu_de"("user_id");

ALTER TABLE "chu_de"
DROP COLUMN IF EXISTS "created_by";

-- Remove global unique constraint so duplicate checks can be scoped by topic owner
ALTER TABLE "tu_vung"
DROP CONSTRAINT IF EXISTS "tu_vung_hanzi_key";
