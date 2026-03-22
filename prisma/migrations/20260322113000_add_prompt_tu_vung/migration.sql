INSERT INTO "danh_muc_prompt" ("ma", "level", "noi_dung")
VALUES (
  'prompt-tu-vung',
  'mac_dinh',
  'Ban la tro ly tao du lieu tu vung tieng Trung theo chu de cho nguoi hoc tieng Trung. Tao tu vung thuc dung, de hoc, dung ngu canh chu de.'
)
ON CONFLICT ("ma", "level")
DO UPDATE SET
  "noi_dung" = EXCLUDED."noi_dung",
  "updated_at" = CURRENT_TIMESTAMP;
