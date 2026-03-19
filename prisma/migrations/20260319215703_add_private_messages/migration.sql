-- CreateTable
CREATE TABLE "private_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_messages_sender_id_receiver_id_created_at_idx" ON "private_messages"("sender_id", "receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "private_messages_receiver_id_sender_id_created_at_idx" ON "private_messages"("receiver_id", "sender_id", "created_at");

-- AddForeignKey
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
