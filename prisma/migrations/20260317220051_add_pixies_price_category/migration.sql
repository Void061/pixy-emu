-- AlterTable
ALTER TABLE "furniture_definitions" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'uncategorized',
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pixies" INTEGER NOT NULL DEFAULT 0;
