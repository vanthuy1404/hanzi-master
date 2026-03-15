-- CreateTable
CREATE TABLE "lich_su_chat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "da_xem" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_lich_su_chat_pair_created" ON "lich_su_chat"("user_id", "friend_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_lich_su_chat_reverse_pair_created" ON "lich_su_chat"("friend_id", "user_id", "created_at");
