import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/index.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
    }
  }
}

/**
 * Express middleware that verifies the JWT Bearer token.
 * Populates req.userId and req.username on success.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = AuthService.verifyToken(token);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
