-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "access_mode" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN     "password" TEXT;

-- CreateTable
CREATE TABLE "room_votes" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_votes_room_id_user_id_key" ON "room_votes"("room_id", "user_id");

-- AddForeignKey
ALTER TABLE "room_votes" ADD CONSTRAINT "room_votes_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_votes" ADD CONSTRAINT "room_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
