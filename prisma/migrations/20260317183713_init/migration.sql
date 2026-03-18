-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furniture_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size_w" INTEGER NOT NULL,
    "size_h" INTEGER NOT NULL,
    "is_walkable" BOOLEAN NOT NULL DEFAULT false,
    "is_sittable" BOOLEAN NOT NULL DEFAULT false,
    "is_layable" BOOLEAN NOT NULL DEFAULT false,
    "is_usable" BOOLEAN NOT NULL DEFAULT false,
    "rotations" TEXT[],
    "states" JSONB NOT NULL,
    "interaction_points" JSONB NOT NULL,
    "z_height" INTEGER NOT NULL DEFAULT 0,
    "sprite_format" TEXT NOT NULL DEFAULT 'png',

    CONSTRAINT "furniture_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furniture_items" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "room_id" TEXT,
    "placed_by_user_id" TEXT,
    "position_x" INTEGER,
    "position_y" INTEGER,
    "rotation" TEXT NOT NULL DEFAULT 'se',
    "current_state" TEXT NOT NULL DEFAULT 'default',
    "placed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "furniture_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "max_users" INTEGER NOT NULL DEFAULT 25,
    "width" INTEGER NOT NULL DEFAULT 6,
    "height" INTEGER NOT NULL DEFAULT 6,
    "door_tile_x" INTEGER NOT NULL DEFAULT 0,
    "door_tile_y" INTEGER NOT NULL DEFAULT 0,
    "entrance_tile_x" INTEGER NOT NULL DEFAULT 0,
    "entrance_tile_y" INTEGER NOT NULL DEFAULT 0,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rights" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_rights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "furniture_items_owner_id_idx" ON "furniture_items"("owner_id");

-- CreateIndex
CREATE INDEX "furniture_items_room_id_idx" ON "furniture_items"("room_id");

-- CreateIndex
CREATE INDEX "rooms_owner_id_idx" ON "rooms"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_rights_room_id_user_id_key" ON "room_rights"("room_id", "user_id");

-- AddForeignKey
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "furniture_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_placed_by_user_id_fkey" FOREIGN KEY ("placed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rights" ADD CONSTRAINT "room_rights_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rights" ADD CONSTRAINT "room_rights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
