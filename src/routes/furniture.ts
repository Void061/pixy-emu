import { getErrorMessage } from "../utils/errors.js";
import { Router } from "express";
import { getCatalog, getDefinition, seedCatalog } from "../actions/index.js";

const router = Router();

/** Get the full furniture catalog (public). */
router.get("/catalog", async (_req, res) => {
  try {
    const catalog = await getCatalog();
    res.json(catalog);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Get a single furniture definition. */
router.get("/catalog/:id", async (req, res) => {
  try {
    const def = await getDefinition(req.params.id);
    res.json(def);
  } catch (err: unknown) {
    res.status(404).json({ error: getErrorMessage(err) });
  }
});

/** Seed the furniture catalog (dev/admin). */
router.post("/catalog/seed", async (req, res) => {
  try {
    const { definitions } = req.body;
    if (!Array.isArray(definitions)) {
      res.status(400).json({ error: "definitions array is required" });
      return;
    }
    const count = await seedCatalog(definitions);
    res.json({ seeded: count });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;