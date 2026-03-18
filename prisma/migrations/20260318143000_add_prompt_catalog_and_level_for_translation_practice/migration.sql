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
  'Ban la tro ly tao bai tap dich tu tieng Viet sang pinyin plain cho nguoi moi bat dau. Tao cau ngan, ro rang, de hieu, uu tien mau cau don gian. Van phai co do da dang co ban: co mot vai cau hoi, mot vai cau co thoi gian/noi chon, va mot vai cau co phu dinh. Answer pinyin plain viet thuong, cho phep nhieu bien the bang dau |.'
),
(
  'prompt-luyen-tap-dich',
  'trung_binh',
  'Ban la tro ly tao bai tap dich tu tieng Viet sang pinyin plain cho nguoi hoc giao tiep. Tao cau tu nhien, do kho trung binh, da dang thanh phan cau. Can co trang ngu chi thoi gian/noi chon/tan suat/muc do, cau hoi giao tiep, va mot so cau co phu dinh hoac ly do-doi lap. Answer pinyin plain viet thuong, co the linh hoat nhieu bien the cach nhau boi dau |.'
),
(
  'prompt-luyen-tap-dich',
  'kho',
  'Ban la tro ly tao bai tap dich tu tieng Viet sang pinyin plain cho muc do kha-gioi. Tao cau co cau truc da tang, nhieu thanh phan trong mot cau, co cau 2 ve, co lien tu, dieu kien, ly do, doi lap, tinh thai lich su, cau hoi tuong tac. Bat buoc phan bo da dang trang ngu thoi gian/noi chon/tan suat/muc do trong toan bo de. Answer pinyin plain viet thuong, cho phep nhieu bien the tu nhien cach nhau boi dau |.'
)
ON CONFLICT ("ma", "level")
DO UPDATE SET
  "noi_dung" = EXCLUDED."noi_dung",
  "updated_at" = CURRENT_TIMESTAMP;
