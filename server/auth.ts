import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";

function makeToken(password: string): string {
  return createHash("sha256").update("lm-op-model:" + password).digest("hex");
}

function getAuthCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie || "";
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === "lm_auth") return v.join("=");
  }
  return undefined;
}

function isAuthenticated(req: Request): boolean {
  const password = process.env.APP_PASSWORD;
  if (!password) return true; // No password configured — open access
  return getAuthCookie(req) === makeToken(password);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Always allow auth endpoints
  if (req.path.startsWith("/api/auth/")) return next();

  if (!isAuthenticated(req)) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }
  next();
}

export function registerAuthRoutes(app: import("express").Express) {
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { password } = req.body as { password?: string };
    const appPassword = process.env.APP_PASSWORD;

    if (!appPassword || password === appPassword) {
      const token = appPassword ? makeToken(appPassword) : "no-password";
      res.cookie("lm_auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      return res.json({ ok: true });
    }
    return res.status(401).json({ message: "Wrong password" });
  });

  app.get("/api/auth/check", (req: Request, res: Response) => {
    res.json({ authenticated: isAuthenticated(req) });
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie("lm_auth");
    res.json({ ok: true });
  });
}
