-- CreateTable
CREATE TABLE "ket_ban" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "trang_thai" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ket_ban_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ket_ban_user" ON "ket_ban"("user_id");

-- CreateIndex
CREATE INDEX "idx_ket_ban_friend" ON "ket_ban"("friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ket_ban_user_friend" ON "ket_ban"("user_id", "friend_id");
