DROP TABLE IF EXISTS "lich_su_hoc";

CREATE TABLE "lich_su_hoc" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "luyen_tap_dich_id" INTEGER NOT NULL,
  "tong_so_cau" INTEGER NOT NULL,
  "so_cau_dung" INTEGER NOT NULL,
  "diem" DOUBLE PRECISION NOT NULL,
  "chi_tiet" JSONB NOT NULL,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lich_su_hoc_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lich_su_hoc"
ADD CONSTRAINT "lich_su_hoc_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "lich_su_hoc"
ADD CONSTRAINT "lich_su_hoc_luyen_tap_dich_id_fkey"
FOREIGN KEY ("luyen_tap_dich_id")
REFERENCES "luyen_tap_dich"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "idx_lich_su_hoc_user_id"
ON "lich_su_hoc"("user_id");

CREATE INDEX "idx_lich_su_hoc_luyen_tap_dich_id"
ON "lich_su_hoc"("luyen_tap_dich_id");
