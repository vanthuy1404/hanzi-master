CREATE TABLE IF NOT EXISTS "luyen_tap_dich" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER,
  "topic_ids" INTEGER[] NOT NULL,
  "so_cau" INTEGER NOT NULL,
  "noi_dung" JSONB NOT NULL,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "luyen_tap_dich_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'luyen_tap_dich_user_id_fkey'
  ) THEN
    ALTER TABLE "luyen_tap_dich"
    ADD CONSTRAINT "luyen_tap_dich_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_luyen_tap_dich_user_id"
ON "luyen_tap_dich"("user_id");
