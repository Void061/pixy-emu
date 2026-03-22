import "dotenv/config";
import prisma from "../config/prisma.js";

/**
 * Seed script: populates the test catalog with 3 furniture items
 * (sofa sittable, bed layable, tile walkable) each costing 1 pixie,
 * and gives all existing users 1000 pixies.
 *
 * Run with: npx tsx src/scripts/seed-shop.ts
 */
async function main() {
  // 1. Seed test furniture definitions
  const testItems = [{
      id: "tropical_chair",
      name: "Sedia Tropicale",
      category: "Tropicale",
      price: 5,
      sizeW: 1,
      sizeH: 1,
      isWalkable: false,
      isSittable: true,
      isLayable: false,
      isUsable: false,
      isStackable: false,
      stackHeight: 0,
      rotations: ["ne","se","sw","nw"],
      states: [{ id: "default", label: "Normale" }],
      interactionPoints: {
        ne: { approachTile: { x: 0, y: 1 }, seatOffset: { x: 0, y: -10 } },
        se: { approachTile: { x: -1, y: 0 }, seatOffset: { x: 0, y: -10 } },
        sw: { approachTile: { x: 0, y: -1 }, seatOffset: { x: 0, y: -10 } },
        nw: { approachTile: { x: 1, y: 0 }, seatOffset: { x: 0, y: -10 } },
      },
      zHeight: 30,
      spriteFormat: "png",
    },
  {
      id: "tropical_sofa",
      name: "Divano Tropicale",
      category: "Tropicale",
      price: 8,
      sizeW: 2,
      sizeH: 1,
      isWalkable: false,
      isSittable: true,
      isLayable: false,
      isUsable: false,
      isStackable: false,
      stackHeight: 0,
      rotations: ["ne","se","sw","nw"],
      states: [{ id: "default", label: "Normale" }],
      interactionPoints: {
        ne: { approachTile: { x: 0, y: 1 }, seatOffset: { x: 0, y: -10 } },
        se: { approachTile: { x: -1, y: 0 }, seatOffset: { x: 0, y: -10 } },
        sw: { approachTile: { x: 0, y: -1 }, seatOffset: { x: 0, y: -10 } },
        nw: { approachTile: { x: 1, y: 0 }, seatOffset: { x: 0, y: -10 } },
      },
      zHeight: 30,
      spriteFormat: "png",
    },
  {
      id: "white_tropical_sofa",
      name: "Divano Bianco Tropicale",
      category: "Tropicale",
      price: 8,
      sizeW: 2,
      sizeH: 1,
      isWalkable: false,
      isSittable: true,
      isLayable: false,
      isUsable: false,
      isStackable: false,
      stackHeight: 0,
      rotations: ["ne","se","sw","nw"],
      states: [{ id: "default", label: "Normale" }],
      interactionPoints: {
        ne: { approachTile: { x: 0, y: 1 }, seatOffset: { x: 0, y: -10 } },
        se: { approachTile: { x: -1, y: 0 }, seatOffset: { x: 0, y: -10 } },
        sw: { approachTile: { x: 0, y: -1 }, seatOffset: { x: 0, y: -10 } },
        nw: { approachTile: { x: 1, y: 0 }, seatOffset: { x: 0, y: -10 } },
      },
      zHeight: 30,
      spriteFormat: "png",
    },];

  for (const def of testItems) {
    await prisma.furnitureDefinition.upsert({
      where: { id: def.id },
      update: {
        name: def.name,
        category: def.category,
        price: def.price,
        sizeW: def.sizeW,
        sizeH: def.sizeH,
        isWalkable: def.isWalkable,
        isSittable: def.isSittable,
        isLayable: def.isLayable,
        isUsable: def.isUsable,
        isStackable: def.isStackable,
        stackHeight: def.stackHeight,
        rotations: def.rotations,
        states: def.states,
        interactionPoints: def.interactionPoints,
        zHeight: def.zHeight,
        spriteFormat: def.spriteFormat,
      },
      create: {
        id: def.id,
        name: def.name,
        category: def.category,
        price: def.price,
        sizeW: def.sizeW,
        sizeH: def.sizeH,
        isWalkable: def.isWalkable,
        isSittable: def.isSittable,
        isLayable: def.isLayable,
        isUsable: def.isUsable,
        isStackable: def.isStackable,
        stackHeight: def.stackHeight,
        rotations: def.rotations,
        states: def.states,
        interactionPoints: def.interactionPoints,
        zHeight: def.zHeight,
        spriteFormat: def.spriteFormat,
      },
    });
    console.log(`  ✓ Seeded: ${def.name} (${def.id})`);
  }

  // 2. Also update existing furniture definitions with category+price
  const existing = await prisma.furnitureDefinition.findMany({
    where: { category: "uncategorized" },
  });
  for (const def of existing) {
    await prisma.furnitureDefinition.update({
      where: { id: def.id },
      data: { category: "test", price: 1 },
    });
    console.log(`  ✓ Updated existing: ${def.name} → category=test, price=1`);
  }

  // 3. Give all users 1000 pixies
  const result = await prisma.user.updateMany({
    data: { pixies: 1000 },
  });
  console.log(`  ✓ Set 1000 pixies for ${result.count} user(s)`);

  console.log("\nSeed complete!");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
