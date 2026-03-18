import { getErrorMessage } from "../utils/errors.js";
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { ShopService } from "../services/index.js";

const router = Router();

/** Get catalog grouped by category (public). */
router.get("/catalog", async (_req, res) => {
  try {
    const categories = await ShopService.getCatalogByCategory();
    res.json(categories);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Get user's pixies balance. */
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const pixies = await ShopService.getBalance(req.userId!);
    res.json({ pixies });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Purchase a furniture item. */
router.post("/purchase", authMiddleware, async (req, res) => {
  try {
    const { definitionId } = req.body;
    if (!definitionId) {
      res.status(400).json({ error: "definitionId is required" });
      return;
    }
    const result = await ShopService.purchaseItem(req.userId!, definitionId);
    res.json(result);
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    const status = msg === "Insufficient pixies" ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

/** Set user's pixies balance (dev/admin). */
router.post("/set-balance", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== "number" || amount < 0) {
      res.status(400).json({ error: "amount must be a non-negative number" });
      return;
    }
    const pixies = await ShopService.setBalance(req.userId!, amount);
    res.json({ pixies });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;