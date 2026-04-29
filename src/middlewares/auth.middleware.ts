import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] as string;

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireHost(req: Request, res: Response, next: NextFunction): void {
  if (req.role === "HOST" || req.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ error: "Only hosts can perform this action" });
  }
}

export function requireGuest(req: Request, res: Response, next: NextFunction): void {
  if (req.role === "GUEST" || req.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ error: "Only guests can perform this action" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}
