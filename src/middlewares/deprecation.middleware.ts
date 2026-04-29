import type { Request, Response, NextFunction } from "express";

/** Attach deprecation headers to responses — use on any route you plan to sunset. */
export function deprecateV1(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", "Sat, 01 Jan 2027 00:00:00 GMT");
  res.setHeader("Link", '</api/v2>; rel="successor-version"');
  next();
}
