ALTER TABLE "lich_su_hoc"
ALTER COLUMN "luyen_tap_dich_id" DROP NOT NULL;

ALTER TABLE "lich_su_hoc"
ADD COLUMN IF NOT EXISTS "sap_xep_cau_id" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_lich_su_hoc_sap_xep_cau_id"
ON "lich_su_hoc"("sap_xep_cau_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_lich_su_hoc_sap_xep_cau_id'
  ) THEN
    ALTER TABLE "lich_su_hoc"
    ADD CONSTRAINT "fk_lich_su_hoc_sap_xep_cau_id"
    FOREIGN KEY ("sap_xep_cau_id") REFERENCES "sap_xep_cau"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
