CREATE TABLE IF NOT EXISTS "sap_xep_cau" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER,
  "so_cau" INTEGER NOT NULL,
  "topic_ids" INTEGER[] NOT NULL,
  "noi_dung" JSONB NOT NULL,
  CONSTRAINT "sap_xep_cau_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sap_xep_cau_user_id"
ON "sap_xep_cau"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_sap_xep_cau_user_id'
  ) THEN
    ALTER TABLE "sap_xep_cau"
    ADD CONSTRAINT "fk_sap_xep_cau_user_id"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "danh_muc_prompt" ("ma", "level", "noi_dung")
VALUES
(
  'prompt-sap-xep',
  'de',
  'Ban la tro ly tao bai tap sap xep cau tieng Trung cho nguoi moi bat dau. Tao cau ngan, de hieu, dung tu thong dung. Moi cau phai co linh hoat 4 den 7 cum hanzi(pinyin), khong duoc 3 cum. Tra ve dung JSON: {"items":[{"question":["cum4(pinyin)","cum1(pinyin)","cum3(pinyin)","cum2(pinyin)"],"answer":["cum1(pinyin)","cum2(pinyin)","cum3(pinyin)","cum4(pinyin)"],"nghia_vi":"..."}]}. question la ban dao thu tu, answer la thu tu dung, nghia_vi la nghia tieng Viet cua cau dung.'
),
(
  'prompt-sap-xep',
  'trung_binh',
  'Ban la tro ly tao bai tap sap xep cau tieng Trung muc do trung binh. Tao cau giao tiep tu nhien, do dai vua phai. Moi cau phai co linh hoat 4 den 7 cum hanzi(pinyin), khong duoc 3 cum. Tra ve dung JSON: {"items":[{"question":["cum4(pinyin)","cum1(pinyin)","cum3(pinyin)","cum2(pinyin)"],"answer":["cum1(pinyin)","cum2(pinyin)","cum3(pinyin)","cum4(pinyin)"],"nghia_vi":"..."}]}. question la ban dao thu tu, answer la thu tu dung, nghia_vi la nghia tieng Viet cua cau dung.'
),
(
  'prompt-sap-xep',
  'kho',
  'Ban la tro ly tao bai tap sap xep cau tieng Trung muc do kho. Tao cau dai hon, da thanh phan, tu nhien khi giao tiep. Moi cau phai co linh hoat 4 den 7 cum hanzi(pinyin), khong duoc 3 cum. Tra ve dung JSON: {"items":[{"question":["cum4(pinyin)","cum1(pinyin)","cum3(pinyin)","cum2(pinyin)"],"answer":["cum1(pinyin)","cum2(pinyin)","cum3(pinyin)","cum4(pinyin)"],"nghia_vi":"..."}]}. question la ban dao thu tu, answer la thu tu dung, nghia_vi la nghia tieng Viet cua cau dung.'
)
ON CONFLICT ("ma", "level")
DO UPDATE SET
  "noi_dung" = EXCLUDED."noi_dung",
  "updated_at" = CURRENT_TIMESTAMP;
