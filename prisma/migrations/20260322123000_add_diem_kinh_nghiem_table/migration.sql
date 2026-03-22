CREATE TABLE IF NOT EXISTS "diem_kinh_nghiem" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "exp" INTEGER NOT NULL,
  CONSTRAINT "diem_kinh_nghiem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_diem_kinh_nghiem_user_id"
ON "diem_kinh_nghiem"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_diem_kinh_nghiem_user_id'
  ) THEN
    ALTER TABLE "diem_kinh_nghiem"
    ADD CONSTRAINT "fk_diem_kinh_nghiem_user_id"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
