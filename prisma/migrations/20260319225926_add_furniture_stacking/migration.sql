-- AlterTable
ALTER TABLE "furniture_definitions" ADD COLUMN     "is_stackable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stack_height" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "furniture_items" ADD COLUMN     "position_z" DOUBLE PRECISION NOT NULL DEFAULT 0;
