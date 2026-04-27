import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        // Prisma 7 + driver adapter nests the field under driverAdapterError
        const adapterFields = (
          err.meta?.driverAdapterError as { cause?: { constraint?: { fields?: string[] } } } | undefined
        )?.cause?.constraint?.fields;
        const target = adapterFields?.join(", ")
          ?? (Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(", ") : String(err.meta?.target ?? "field"));
        res.status(409).json({ error: `${target} already exists` });
        return;
      }
      case "P2025":
        res.status(404).json({ error: "Record not found" });
        return;
      case "P2003":
        res.status(400).json({ error: "Related record does not exist" });
        return;
      default:
        res.status(500).json({ error: "Database error" });
        return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}
