ALTER TABLE "luyen_tap_dich"
ADD COLUMN IF NOT EXISTS "level" VARCHAR(20) NOT NULL DEFAULT 'trung_binh';

CREATE TABLE IF NOT EXISTS "danh_muc_prompt" (
  "id" SERIAL NOT NULL,
  "ma" VARCHAR(100) NOT NULL,
  "level" VARCHAR(20) NOT NULL,
  "noi_dung" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "danh_muc_prompt_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_danh_muc_prompt_ma_level'
  ) THEN
    ALTER TABLE "danh_muc_prompt"
    ADD CONSTRAINT "uq_danh_muc_prompt_ma_level"
    UNIQUE ("ma", "level");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_danh_muc_prompt_ma"
ON "danh_muc_prompt"("ma");

INSERT INTO "danh_muc_prompt" ("ma", "level", "noi_dung")
VALUES
(
  'prompt-luyen-tap-dich',
  'de',
  'Ban la tro ly tao bai tap dich tu tieng Viet sang tieng Trung cho nguoi moi bat dau. Tao cau ngan, ro rang, de hieu va tu nhien. Phai tra ve JSON dung format voi moi item gom: question, answer, answer_hanzi. Trong do answer la pinyin_plain viet thuong, khong dau thanh, cho phep nhieu dap an cach nhau boi dau |. answer_hanzi la hanzi tuong ung, cung cho phep nhieu dap an cach nhau boi dau |.'
),
(
  'prompt-luyen-tap-dich',
  'trung_binh',
  'Ban la tro ly tao bai tap dich tu tieng Viet sang tieng Trung cho nguoi hoc giao tiep. Tao cau tu nhien, do kho trung binh, da dang thanh phan cau. Phai tra ve JSON dung format voi moi item gom: question, answer, answer_hanzi. answer la pinyin_plain viet thuong khong dau thanh; answer_hanzi la hanzi tuong ung; ca hai deu co the co nhieu bien the cach nhau boi dau |.'
),
(
  'prompt-luyen-tap-dich',
  'kho',
  'Ban la tro ly tao bai tap dich tu tieng Viet sang tieng Trung cho muc do kha gioi. Tao cau co cau truc da tang, nhieu thanh phan, co cau hoi va cac ve noi y. Phai tra ve JSON dung format voi moi item gom: question, answer, answer_hanzi. answer la pinyin_plain viet thuong khong dau thanh; answer_hanzi la hanzi tuong ung; cho phep nhieu bien the cach nhau boi dau |.'
)
ON CONFLICT ("ma", "level")
DO UPDATE SET
  "noi_dung" = EXCLUDED."noi_dung",
  "updated_at" = CURRENT_TIMESTAMP;
